/**
 * Order Vision Recognition Service
 * 订单截图多模态识别服务
 *
 * 两级降级策略：
 *   1. Doubao (豆包 / Volcengine ARK) — 首选，尝试多个模型名变体
 *   2. Google Gemini — 兜底，尝试多个模型 + 多个 Key
 *
 * 注意：DeepSeek 标准 API 不支持 vision (image_url)，已移除。
 */

/** 识别出的单个商品条目 */
export interface RecognizedItem {
  /** 商品名称（中文原文 + 英文翻译） */
  productName: string;
  /** 单价（人民币 CNY） */
  unitPrice: number;
  /** 数量 */
  quantity: number;
}

/** 传入的图片数据 */
export interface ImageData {
  /** base64 编码的图片数据（不含 data:image/xxx;base64, 前缀） */
  base64: string;
  /** MIME 类型，如 image/png, image/jpeg */
  mimeType: string;
}

// ==================== Provider 配置 ====================
// API Keys 从环境变量加载，不硬编码在代码中

/**
 * Doubao (Volcengine ARK) 配置
 * 注意：ARK API 通常需要先在控制台创建「推理接入点」获得 endpoint ID (ep-xxx)，
 * 然后用 endpoint ID 作为 model 参数。这里尝试多个模型名变体。
 */
const DOUBAO_CONFIG = {
  apiKey: import.meta.env.VITE_DOUBAO_API_KEY || '',
  baseUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
  /** 支持视觉的豆包模型（doubao-seed 支持多模态） */
  model: 'doubao-seed-1-8-251228',
  label: 'Doubao',
};

/**
 * Gemini 配置
 * 尝试多个模型（不同模型有独立的限额池）+ 多个 Key
 * Keys 从 VITE_GEMINI_API_KEYS 环境变量加载（逗号分隔）
 */
const GEMINI_CONFIG = {
  apiKeys: (import.meta.env.VITE_GEMINI_API_KEYS || '')
    .split(',')
    .map((k: string) => k.trim())
    .filter(Boolean),
  /** 按优先顺序尝试的模型（不同模型有不同限额池） */
  modelVariants: [
    'gemini-2.0-flash-lite', // 轻量版，可能有独立额度
    'gemini-1.5-flash', // 旧版，不同限额池
    'gemini-1.5-pro', // Pro 版本
    'gemini-2.0-flash', // 原始版本（最后再试）
  ],
  baseUrlTemplate:
    'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent',
  label: 'Gemini',
};

// ==================== 共享 Prompt ====================

const EXTRACTION_PROMPT = `You are an expert at reading Chinese e-commerce order screenshots (Taobao, Pinduoduo, 1688, JD, Superbuy, etc.).

Analyze ALL the provided order screenshot images carefully. For EACH product/item visible in the screenshots, extract:
1. **productName**: The Chinese product name followed by an English translation in parentheses. Example: "不锈钢保温杯 (Stainless Steel Thermos Cup)"
2. **unitPrice**: The unit price in CNY (Chinese Yuan) as a number. If you see ¥ or 元, extract just the number.
3. **quantity**: The quantity ordered as a number. Look for "x1", "×2", "数量:3" etc.

IMPORTANT RULES:
- Return ONLY a valid JSON array, no markdown code fences, no explanation text.
- Each element must have exactly these 3 fields: "productName", "unitPrice", "quantity"
- If you cannot determine a price, use 0
- If you cannot determine a quantity, use 1
- Combine information from multiple images if they show the same order
- Extract ALL items, even if there are many

Example output format:
[{"productName":"不锈钢保温杯 (Stainless Steel Thermos Cup)","unitPrice":29.9,"quantity":2},{"productName":"手机壳 (Phone Case)","unitPrice":12.5,"quantity":1}]`;

// ==================== 工具函数 ====================

/**
 * 从 base64 data URL 中提取纯 base64 数据和 MIME 类型
 */
export function parseDataUrl(dataUrl: string): ImageData {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (match && match[1] && match[2]) {
    return { mimeType: match[1], base64: match[2] };
  }
  return { mimeType: 'image/jpeg', base64: dataUrl };
}

/**
 * 从 LLM 响应文本中提取 JSON 数组（容错：纯 JSON / markdown fence / 混杂文本）
 */
function parseJsonResponse(text: string): RecognizedItem[] {
  // 尝试 1：直接 JSON.parse
  try {
    const parsed = JSON.parse(text.trim());
    if (Array.isArray(parsed)) return validateItems(parsed);
  } catch {
    /* continue */
  }

  // 尝试 2：从 markdown code fence 中提取
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim());
      if (Array.isArray(parsed)) return validateItems(parsed);
    } catch {
      /* continue */
    }
  }

  // 尝试 3：正则匹配最外层 JSON 数组
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) return validateItems(parsed);
    } catch {
      /* continue */
    }
  }

  throw new Error(
    `Failed to parse LLM response as JSON array. Raw: ${text.substring(0, 500)}`
  );
}

/**
 * 校验并规范化识别结果
 */
function validateItems(items: unknown[]): RecognizedItem[] {
  return items
    .filter(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === 'object'
    )
    .map(item => ({
      productName: String(
        item.productName || item.name || '未知商品 (Unknown Product)'
      ),
      unitPrice: Number(item.unitPrice || item.price || 0),
      quantity: Math.max(1, Math.round(Number(item.quantity || item.qty || 1))),
    }))
    .filter(item => item.productName.trim() !== '');
}

// ==================== Provider 调用函数 ====================

/**
 * 调用 Doubao (Volcengine ARK) Vision API
 * 使用 doubao-seed 模型（支持多模态图文理解）
 */
async function callDoubao(images: ImageData[]): Promise<RecognizedItem[]> {
  // 构建 content：图片在前，文本在后（与官方文档一致）
  const contentParts: Array<Record<string, unknown>> = [];
  for (const img of images) {
    contentParts.push({
      type: 'image_url',
      image_url: { url: `data:${img.mimeType};base64,${img.base64}` },
    });
  }
  contentParts.push({ type: 'text', text: EXTRACTION_PROMPT });

  const body = {
    model: DOUBAO_CONFIG.model,
    max_completion_tokens: 4096,
    messages: [{ role: 'user', content: contentParts }],
  };

  console.log(
    `[OrderVision] Doubao: calling model "${DOUBAO_CONFIG.model}" with ${images.length} images...`
  );

  const response = await fetch(DOUBAO_CONFIG.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${DOUBAO_CONFIG.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(
      `Doubao API error (${response.status}): ${errorText.substring(0, 300)}`
    );
  }

  const result = await response.json();

  // doubao-seed 可能返回 reasoning_content + content，取 content 部分
  const msg = result?.choices?.[0]?.message;
  const textContent = msg?.content || '';
  if (!textContent) throw new Error('Doubao returned empty content');

  return parseJsonResponse(textContent);
}

/**
 * 调用 Gemini Vision API
 * 尝试多个模型 × 多个 Key 的组合
 */
async function callGeminiAll(images: ImageData[]): Promise<RecognizedItem[]> {
  // 构建 parts：文本 prompt + 图片（Gemini inlineData 格式）
  const parts: Array<Record<string, unknown>> = [{ text: EXTRACTION_PROMPT }];
  for (const img of images) {
    parts.push({
      inlineData: { mimeType: img.mimeType, data: img.base64 },
    });
  }

  const body = {
    contents: [{ parts }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
  };
  const bodyStr = JSON.stringify(body);

  let lastError: Error | null = null;

  // 先按模型循环，再按 Key 循环（不同模型有不同限额池）
  for (const model of GEMINI_CONFIG.modelVariants) {
    for (let ki = 0; ki < GEMINI_CONFIG.apiKeys.length; ki++) {
      const apiKey = GEMINI_CONFIG.apiKeys[ki];
      const label = `${model} Key-${ki + 1}`;

      try {
        const url =
          GEMINI_CONFIG.baseUrlTemplate.replace('{MODEL}', model) +
          `?key=${apiKey}`;
        console.log(`[OrderVision] Gemini: trying ${label}...`);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: bodyStr,
        });

        if (response.status === 429) {
          // 限额错误，换下一个 key/model
          throw new Error('Rate limited (429)');
        }

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(
            `HTTP ${response.status}: ${errorText.substring(0, 200)}`
          );
        }

        const result = await response.json();
        const textContent =
          result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!textContent) throw new Error('Empty response');

        return parseJsonResponse(textContent);
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(
          `[OrderVision] Gemini ${label} failed: ${lastError.message}`
        );
      }
    }
  }

  throw new Error(
    `All Gemini model/key combinations failed. Last: ${lastError?.message}`
  );
}

// ==================== 主入口：两级降级 ====================

/**
 * 识别订单截图中的商品信息
 * 降级顺序：Doubao（多模型变体） → Gemini（多模型 × 多 Key）
 *
 * @param images 图片数据数组
 * @returns 识别出的商品条目数组
 * @throws 所有 provider 均失败时抛出错误
 */
export async function recognizeOrderItems(
  images: ImageData[]
): Promise<RecognizedItem[]> {
  if (images.length === 0) {
    throw new Error('No images provided for recognition');
  }

  const errors: string[] = [];

  // ---- 第 1 级：Doubao（尝试多个模型变体） ----
  try {
    console.log('[OrderVision] === Trying Doubao (primary) ===');
    const items = await callDoubao(images);
    console.log(
      `[OrderVision] Doubao succeeded! Recognized ${items.length} items.`
    );
    return items;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Doubao: ${msg}`);
    console.warn(
      `[OrderVision] Doubao all variants failed. Falling back to Gemini...`
    );
  }

  // ---- 第 2 级：Gemini（多模型 × 多 Key） ----
  try {
    console.log('[OrderVision] === Trying Gemini (fallback) ===');
    const items = await callGeminiAll(images);
    console.log(
      `[OrderVision] Gemini succeeded! Recognized ${items.length} items.`
    );
    return items;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Gemini: ${msg}`);
    console.warn(`[OrderVision] Gemini all combinations failed.`);
  }

  // 所有 provider 均失败
  const errorSummary = errors.join('\n');
  throw new Error(
    `所有识别服务均失败，请稍后重试。\n\n` +
      `如使用 Doubao，请确认已在火山引擎控制台创建视觉模型的推理接入点，并将 endpoint ID (ep-xxx) 配置到代码中。\n\n` +
      `详细错误:\n${errorSummary}`
  );
}

/** 默认导出服务对象 */
const geminiVisionService = {
  recognizeOrderItems,
  parseDataUrl,
};

export default geminiVisionService;
