/**
 * N8N Webhook服务
 * 处理与n8n工作流的webhook通信
 */

import type { InvoiceOCRResult } from '../pages/InformationDashboard/types/invoiceOCR';

/**
 * N8N Webhook响应接口
 */
export interface N8NWebhookResponse {
  success: boolean;
  message?: string;
  data?: any;
  executionId?: string;
  workflowId?: string;
  googleSheetsUrl?: string;
}

/**
 * N8N文件上传请求接口
 */
export interface N8NFileUploadRequest {
  files: File[];
  workflowId: string;
  batchName?: string;
  metadata?: Record<string, any>;
}

/**
 * N8N Webhook服务类
 */
export class N8NWebhookService {
  private readonly defaultTimeout = 120000; // 2分钟超时，给OCR处理更多时间

  /**
   * 上传文件到n8n webhook
   * @param webhookUrl webhook URL
   * @param request 上传请求
   * @returns Promise<N8NWebhookResponse>
   */
  async uploadFilesToWebhook(
    webhookUrl: string,
    request: N8NFileUploadRequest
  ): Promise<N8NWebhookResponse> {
    try {
      console.log('开始上传文件到n8n webhook:', {
        webhookUrl,
        fileCount: request.files.length,
        workflowId: request.workflowId,
        batchName: request.batchName,
      });

      // 验证webhook URL
      if (!this.isValidWebhookUrl(webhookUrl)) {
        throw new Error('无效的webhook URL');
      }

      // 验证文件
      this.validateFiles(request.files);

      // 创建FormData
      const formData = new FormData();

      // 添加文件
      request.files.forEach((file, index) => {
        formData.append('files', file, file.name);
        console.log(`添加文件 ${index + 1}:`, {
          name: file.name,
          size: file.size,
          type: file.type,
        });
      });

      // 添加元数据
      formData.append('workflowId', request.workflowId);
      if (request.batchName) {
        formData.append('batchName', request.batchName);
      }
      if (request.metadata) {
        formData.append('metadata', JSON.stringify(request.metadata));
      }

      // 添加时间戳和来源标识
      formData.append('timestamp', new Date().toISOString());
      formData.append('source', 'wendeal-dashboard');
      formData.append('version', '1.0');

      // 发送请求到n8n webhook
      console.log('发送请求到n8n webhook...');

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'User-Agent': 'WendealDashboard/1.0',
          'X-Requested-With': 'XMLHttpRequest',
        },
        signal: AbortSignal.timeout(this.defaultTimeout),
      });

      console.log('收到n8n响应:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      });

      // 解析响应内容
      let responseData: any;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        const textResponse = await response.text();
        console.log('收到非JSON响应:', textResponse);
        try {
          responseData = JSON.parse(textResponse);
        } catch {
          responseData = { message: textResponse };
        }
      }

      console.log('解析后的n8n响应数据:', responseData);

      // 检查响应状态 - 如果包含有效数据，即使状态码不是200也继续处理
      if (!response.ok) {
        console.warn('n8n webhook响应状态非200:', {
          status: response.status,
          statusText: response.statusText,
          hasData: !!responseData,
          dataKeys: responseData ? Object.keys(responseData) : [],
        });

        // 检查是否包含有效的处理数据
        const hasValidData =
          responseData &&
          (responseData.processingTimestamp ||
            responseData.summary ||
            responseData.financialSummary ||
            responseData.processingDetails ||
            responseData.executionId ||
            responseData.googleSheetsUrl ||
            responseData.data);

        if (!hasValidData) {
          console.error('n8n webhook响应错误且无有效数据:', {
            status: response.status,
            statusText: response.statusText,
            body: responseData,
          });
          throw new Error(
            `Webhook请求失败: ${response.status} ${response.statusText}`
          );
        } else {
          console.log('响应状态非200但包含有效数据，继续处理...');
        }
      }

      // 尝试从不同可能的字段中提取Google Sheets URL
      let googleSheetsUrl = null;
      if (responseData.googleSheetsUrl) {
        googleSheetsUrl = responseData.googleSheetsUrl;
      } else if (responseData.data?.googleSheetsUrl) {
        googleSheetsUrl = responseData.data.googleSheetsUrl;
      } else if (responseData.sheetsUrl) {
        googleSheetsUrl = responseData.sheetsUrl;
      } else if (responseData.data?.sheetsUrl) {
        googleSheetsUrl = responseData.data.sheetsUrl;
      } else if (responseData.url) {
        googleSheetsUrl = responseData.url;
      } else if (responseData.data?.url) {
        googleSheetsUrl = responseData.data.url;
      }

      console.log('提取的Google Sheets URL:', googleSheetsUrl);

      // 构造标准化响应
      const webhookResponse: N8NWebhookResponse = {
        success: true,
        message: responseData.message || 'Files uploaded successfully',
        data: responseData,
        executionId: responseData.executionId || 'execution-' + Date.now(),
        workflowId: responseData.workflowId || request.workflowId,
        googleSheetsUrl,
      };

      console.log('文件上传到n8n成功:', webhookResponse);
      return webhookResponse;
    } catch (error) {
      console.error('Failed to upload files to webhook:', error);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(
            'The operation timed out. Please check your network connection or try again later.'
          );
        }
        if (error.message.includes('Failed to fetch')) {
          throw new Error(
            'Unable to connect to webhook - please verify the URL is correct and the service is running'
          );
        }
        if (
          error.message.includes('ENOTFOUND') ||
          error.message.includes('ECONNREFUSED')
        ) {
          throw new Error(
            'Network error - unable to reach the webhook service. Please check your internet connection and webhook URL.'
          );
        }
        if (error.message.includes('413')) {
          throw new Error(
            'File too large - the uploaded files exceed the server size limit. Please try with smaller files.'
          );
        }
        if (error.message.includes('415')) {
          throw new Error(
            'Unsupported media type - please ensure you are uploading supported file formats (PDF, JPEG, PNG, TIFF, BMP).'
          );
        }
      }

      throw error;
    }
  }

  /**
   * 处理OCR结果并发送到webhook
   * @param webhookUrl webhook URL
   * @param fileIds 文件ID列表
   * @param ocrResults OCR结果
   * @returns Promise<N8NWebhookResponse>
   */
  async sendOCRResultsToWebhook(
    webhookUrl: string,
    fileIds: string[],
    ocrResults: InvoiceOCRResult[]
  ): Promise<N8NWebhookResponse> {
    try {
      console.log('发送OCR结果到n8n webhook:', {
        webhookUrl,
        fileCount: fileIds.length,
        resultCount: ocrResults.length,
      });

      if (!this.isValidWebhookUrl(webhookUrl)) {
        throw new Error('无效的webhook URL');
      }

      const payload = {
        fileIds,
        ocrResults,
        timestamp: new Date().toISOString(),
        source: 'wendeal-dashboard',
        version: '1.0',
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WendealDashboard/1.0',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.defaultTimeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OCR结果发送失败:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(
          `Failed to send OCR results: ${response.status} ${response.statusText}`
        );
      }

      const responseData = await response.json();
      console.log('OCR结果发送成功:', responseData);

      return {
        success: true,
        message: 'OCR results sent successfully',
        data: responseData,
        executionId: responseData.executionId,
        workflowId: responseData.workflowId,
      };
    } catch (error) {
      console.error('Failed to send OCR results to webhook:', error);
      throw error;
    }
  }

  /**
   * 测试webhook连接
   * @param webhookUrl webhook URL
   * @returns Promise<boolean>
   */
  async testWebhookConnection(webhookUrl: string): Promise<boolean> {
    try {
      console.log('测试webhook连接:', webhookUrl);

      if (!this.isValidWebhookUrl(webhookUrl)) {
        console.error('无效的webhook URL');
        return false;
      }

      // 在开发环境中使用相对路径，让Vite代理处理
      let requestUrl = webhookUrl;
      if (
        process.env.NODE_ENV === 'development' &&
        webhookUrl.includes('n8n.wendealai.com')
      ) {
        // 从完整URL中提取webhook路径部分
        const url = new URL(webhookUrl);
        requestUrl = url.pathname; // 例如: /webhook/sora2
        console.log('开发环境使用代理路径测试连接:', requestUrl);
      }

      const fetchOptions: RequestInit = {
        method: 'GET',
        headers: {
          'User-Agent': 'WendealDashboard/1.0',
        },
        signal: AbortSignal.timeout(5000), // 5秒超时
      };

      // 在开发环境中不需要设置mode，因为代理会处理CORS
      if (process.env.NODE_ENV !== 'development') {
        fetchOptions.mode = 'cors';
      }

      const response = await fetch(requestUrl, fetchOptions);

      console.log('Webhook连接测试结果:', {
        status: response.status,
        statusText: response.statusText,
      });

      return response.status < 500; // 接受4xx和2xx状态码
    } catch (error) {
      console.error('Webhook连接测试失败:', error);
      return false;
    }
  }

  /**
   * 验证webhook URL格式
   * @param url URL字符串
   * @returns boolean
   */
  private isValidWebhookUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * 验证上传文件
   * @param files 文件列表
   */
  private validateFiles(files: File[]): void {
    if (!files || files.length === 0) {
      throw new Error('No files provided');
    }

    const maxFileSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/tiff',
      'image/bmp',
    ];

    for (const file of files) {
      if (file.size > maxFileSize) {
        throw new Error(
          `File ${file.name} is too large. Maximum size is ${this.formatFileSize(maxFileSize)}`
        );
      }

      if (!allowedTypes.includes(file.type)) {
        throw new Error(
          `File ${file.name} has unsupported type: ${file.type}. Allowed types: ${allowedTypes.join(', ')}`
        );
      }
    }
  }

  /**
   * 格式化文件大小
   * @param bytes 字节数
   * @returns 格式化的文件大小字符串
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const n8nWebhookService = new N8NWebhookService();
export default n8nWebhookService;
