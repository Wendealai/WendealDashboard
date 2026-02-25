export type InvoiceOcrErrorContext =
  | 'webhook'
  | 'result_sync'
  | 'supabase'
  | 'upload'
  | 'unknown';

export interface InvoiceOcrErrorInfo {
  code: string;
  title: string;
  message: string;
  suggestion: string;
}

const contains = (source: string, keywords: string[]): boolean =>
  keywords.some(keyword => source.includes(keyword));

const buildErrorInfo = (
  code: string,
  title: string,
  message: string,
  suggestion: string
): InvoiceOcrErrorInfo => ({
  code,
  title,
  message,
  suggestion,
});

export const normalizeInvoiceOcrError = (
  error: unknown,
  context: InvoiceOcrErrorContext = 'unknown'
): InvoiceOcrErrorInfo => {
  const rawMessage =
    error instanceof Error && error.message
      ? error.message
      : typeof error === 'string'
        ? error
        : 'unknown_error';
  const normalized = rawMessage.toLowerCase();

  if (contains(normalized, ['abort', 'timeout'])) {
    return buildErrorInfo(
      'OCR_TIMEOUT',
      '请求超时',
      'OCR 请求超过等待时间。',
      '缩小批次或稍后重试；如果持续超时，请检查 webhook 处理链路。'
    );
  }

  if (
    contains(normalized, [
      'failed to fetch',
      'network',
      'econnrefused',
      'enotfound',
      'dns',
    ])
  ) {
    return buildErrorInfo(
      'OCR_NETWORK',
      '网络连接失败',
      '无法连接到 OCR 相关服务。',
      '检查本机网络、目标 URL 和服务状态后重试。'
    );
  }

  if (contains(normalized, ['401', '403', 'unauthorized', 'forbidden'])) {
    return buildErrorInfo(
      'OCR_AUTH',
      '认证或权限失败',
      '服务拒绝了当前请求。',
      '检查 API key、凭证和服务权限策略。'
    );
  }

  if (contains(normalized, ['413', 'too large'])) {
    return buildErrorInfo(
      'OCR_FILE_TOO_LARGE',
      '文件过大',
      '上传文件超出服务允许大小。',
      '压缩文件或拆分批次后重试。'
    );
  }

  if (contains(normalized, ['415', 'unsupported media'])) {
    return buildErrorInfo(
      'OCR_UNSUPPORTED_TYPE',
      '文件格式不支持',
      '上传文件格式与服务要求不匹配。',
      '使用 PDF/JPEG/PNG/TIFF/BMP/DOCX/XLSX 后重试。'
    );
  }

  if (context === 'supabase') {
    return buildErrorInfo(
      'OCR_SUPABASE',
      'Supabase 异常',
      rawMessage,
      '检查 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 和网络连通性。'
    );
  }

  if (context === 'result_sync') {
    return buildErrorInfo(
      'OCR_RESULT_SYNC',
      '结果同步异常',
      rawMessage,
      '检查 API 服务和数据库落库链路是否正常。'
    );
  }

  if (context === 'webhook') {
    return buildErrorInfo(
      'OCR_WEBHOOK',
      'Webhook 异常',
      rawMessage,
      '检查 webhook URL、n8n 工作流执行日志和节点配置。'
    );
  }

  if (context === 'upload') {
    return buildErrorInfo(
      'OCR_UPLOAD',
      '上传识别失败',
      rawMessage,
      '检查文件质量与格式，必要时减少批量文件数量后重试。'
    );
  }

  return buildErrorInfo(
    'OCR_UNKNOWN',
    '未知错误',
    rawMessage,
    '导出诊断信息并结合执行日志进行排查。'
  );
};
