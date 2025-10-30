// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Content Generation - AI 输出解析器（异步处理版本）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 步骤 1: 获取 taskId 和 createdAt（从前面的节点）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let taskId = null;
let createdAt = null;

// 方法1: 从 Update row(s)1 节点获取（推荐）
try {
  const updateNode = $('Update row(s)1').first().json;
  taskId = updateNode.taskId;
  createdAt = updateNode.createdAt;
  console.log('✅ 从 Update row(s)1 获取到 taskId:', taskId);
} catch (e) {
  console.log('⚠️ 无法从 Update row(s)1 获取数据');
}

// 方法2: 从 Get row(s)1 节点获取（备用）
if (!taskId) {
  try {
    const getNode = $('Get row(s)1').first().json;
    taskId = getNode.taskId;
    createdAt = getNode.createdAt;
    console.log('✅ 从 Get row(s)1 获取到 taskId:', taskId);
  } catch (e) {
    console.log('⚠️ 无法从 Get row(s)1 获取数据');
  }
}

// 方法3: 从触发器获取（备用）
if (!taskId) {
  try {
    const triggerNode = $('When Executed by Another Workflow').first().json;
    taskId = triggerNode.taskId;
    console.log('✅ 从触发器获取到 taskId:', taskId);
  } catch (e) {
    console.log('⚠️ 无法从触发器获取数据');
  }
}

// 如果还是获取不到，抛出错误
if (!taskId) {
  throw new Error('❌ 无法获取 taskId！请检查前面的节点是否正确执行。');
}

// 如果没有 createdAt，使用当前时间
if (!createdAt) {
  createdAt = new Date().toISOString();
}

console.log('Task ID:', taskId);
console.log('Created At:', createdAt);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 步骤 2: 获取 AI Agent 输出
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 在 "Run Once for Each Item" 模式下，直接访问当前 item
const inputData = $input.item.json;

// 提取 output 字段
let rawOutput;
if (Array.isArray(inputData)) {
  rawOutput = inputData[0]?.output || inputData[0];
} else {
  rawOutput = inputData.output || inputData;
}

console.log('Raw output type:', typeof rawOutput);
console.log('Raw output length:', typeof rawOutput === 'string' ? rawOutput.length : 'N/A');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 步骤 3: 智能 JSON 提取函数
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function extractJSON(text) {
  if (!text || typeof text !== 'string') {
    return null;
  }

  // 移除可能的非法字符（如换行符和其他控制字符）
  text = text.replace(/[\u0000-\u001F\u007F]/g, '');
  
  // 方法1: 提取 ```json 和 ``` 之间的内容
  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }

  // 方法2: 提取第一个 { 到最后一个 } 的内容
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1).trim();
  }

  // 方法3: 如果本身就是对象，直接返回
  if (typeof text === 'object') {
    return text;
  }

  return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 步骤 4: 提取并解析 JSON
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let cleanedJson = extractJSON(rawOutput);

if (!cleanedJson) {
  console.error('❌ 无法找到有效的JSON内容');
  
  // 返回包含错误信息和原始内容的结果
  const result = {
    parseError: true,
    errorMessage: '无法找到有效的JSON内容',
    rawOutput: String(rawOutput).substring(0, 1000),
    fullReport: String(rawOutput)
  };
  
  return {
    json: {
      taskId: taskId,
      status: 'completed',
      result: result,
      completedAt: new Date().toISOString(),
      duration: Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
    }
  };
}

// 解析 JSON
let parsedData;
try {
  parsedData = typeof cleanedJson === 'string' 
    ? JSON.parse(cleanedJson) 
    : cleanedJson;
  console.log('✅ JSON 解析成功');
} catch (error) {
  console.error('❌ JSON解析失败:', error.message);
  
  // 返回包含错误信息的结果
  const result = {
    parseError: true,
    errorMessage: 'JSON解析失败: ' + error.message,
    rawOutput: String(cleanedJson).substring(0, 1000),
    fullReport: String(rawOutput)
  };
  
  return {
    json: {
      taskId: taskId,
      status: 'completed',
      result: result,
      completedAt: new Date().toISOString(),
      duration: Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000)
    }
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 步骤 5: 提取核心数据
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const reviewedContent = parsedData.审核优化后文案 || {};
const imageCards = parsedData.图片卡片文案 || [];
const auditReport = parsedData.审核报告 || {};

console.log('提取的标题:', reviewedContent.title);
console.log('图片卡片数量:', imageCards.length);
console.log('审核状态:', auditReport.整体评估);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 步骤 6: 生成设计师格式
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const designerFormat = imageCards.length > 0 
  ? imageCards.map(card => 
      `【${card.位置 || '未知'}】\n${card.文案 || ''}\n设计：${card.设计建议 || '无'}\n尺寸：${card.位置 === '封面' ? '1080x1350' : '1080x1080'}`
    ).join('\n\n---\n\n')
  : '无图片卡片数据';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 步骤 7: 辅助函数 - 提取分类
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function extractCategory(tags) {
  const categoryMap = {
    '养生': ['养生', '健康', '保健'],
    '科技': ['AI', '科技', '数字'],
    '家庭': ['父母', '陪伴', '家庭'],
    '教育': ['教学', '科普', '知识']
  };
  
  for (const [category, keywords] of Object.entries(categoryMap)) {
    if (tags.some(tag => keywords.some(kw => tag.includes(kw)))) {
      return category;
    }
  }
  
  return '健康养生';
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 步骤 8: 构建完整的 result 对象
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const result = {
  // === 核心发布内容 ===
  发布内容: {
    标题: reviewedContent.title || '',
    正文: reviewedContent.content || '',
    标签数组: reviewedContent.tags || [],
    完整发布文本: `${reviewedContent.title || ''}\n\n${reviewedContent.content || ''}\n\n${(reviewedContent.tags || []).join(' ')}`
  },

  // === Google Sheets 专用格式 ===
  Google表格数据: {
    标题: reviewedContent.title || '',
    正文: (reviewedContent.content || '').substring(0, 50000),
    标签: (reviewedContent.tags || []).join(', '),
    图片提示词: reviewedContent.imagePrompt || '',
    视频提示词: reviewedContent.videoPrompt || '',
    图片卡片设计: designerFormat,
    字数: (reviewedContent.content || '').replace(/[\s\n]/g, '').length,
    段落数: (reviewedContent.content || '').split(/\n\n+/).filter(p => p.trim()).length,
    卡片数量: imageCards.length,
    创建时间: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }),
    审核状态: '已通过',
    风险等级: auditReport.整体评估 || '未评估',
    状态: '待发布',
    分类: extractCategory(reviewedContent.tags || [])
  },

  // === 统计信息 ===
  统计数据: {
    标题字数: (reviewedContent.title || '').length,
    正文字数: (reviewedContent.content || '').replace(/[\s\n]/g, '').length,
    图片卡片数量: imageCards.length
  },

  // === 审核状态 ===
  审核状态: {
    违规词修改记录: auditReport.违规词修改 || [],
    风险评估: auditReport.整体评估 || '未评估',
    是否通过审核: (auditReport.整体评估 || '').includes('低风险')
  },

  // === 图片卡片数据 ===
  图片卡片文案: imageCards,

  // === 完整的原始数据（用于前端显示和调试）===
  fullReport: rawOutput,
  
  // === 简化字段（用于前端快速访问）===
  title: reviewedContent.title || '',
  content: reviewedContent.content || '',
  tags: reviewedContent.tags || [],
  imagePrompt: reviewedContent.imagePrompt || '',
  videoPrompt: reviewedContent.videoPrompt || ''
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 步骤 9: 计算处理时长
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const startTime = new Date(createdAt).getTime();
const duration = Math.floor((Date.now() - startTime) / 1000);

console.log('✅ Processing complete');
console.log('Duration:', duration, 'seconds');
console.log('Title:', result.title);
console.log('Content length:', result.content.length);
console.log('Tags count:', result.tags.length);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 步骤 10: 返回数据（Run Once for Each Item 模式 - 返回单个对象）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

return {
  json: {
    taskId: taskId,
    status: 'completed',
    result: result,
    completedAt: new Date().toISOString(),
    duration: duration,
    // 额外添加：方便 Update 节点直接访问
    title: result.title,
    tags: result.tags.join(', '),
    contentPreview: result.content.substring(0, 200)
  }
};

