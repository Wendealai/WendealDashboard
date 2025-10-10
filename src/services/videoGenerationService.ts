/**
 * Video Generation Service
 * 视频生成服务 - 处理视频生成相关的API调用和webhook响应
 */

import type {
  VideoGenerationRequest,
  VideoGenerationResponse,
  VideoGenerationSettings,
} from '@/pages/SocialMedia/types';

/**
 * Video Generation Service类
 */
export class VideoGenerationService {
  private readonly defaultTimeout = 1200000; // 20分钟超时

  /**
   * 生成视频 - 发送请求到webhook并等待响应
   * @param request 视频生成请求
   * @returns Promise<VideoGenerationResponse>
   */
  async generateVideo(
    request: VideoGenerationRequest
  ): Promise<VideoGenerationResponse> {
    try {
      // 验证输入
      this.validateRequest(request);

      // 创建FormData
      const formData = new FormData();
      formData.append('description', request.description);

      // 添加图片
      request.images.forEach((file, index) => {
        formData.append('images', file, file.name);
      });

      // 发送请求到webhook并等待响应
      const response = await this.sendWebhookRequest(
        request.webhookUrl,
        formData
      );

      console.log('✅ 视频生成流程完成:', response);
      return response;
    } catch (error) {
      console.error('❌ 视频生成流程失败:', error);

      // 返回详细的错误响应
      const errorResponse: VideoGenerationResponse = {
        id: `error-${Date.now()}`,
        requestId: request.id,
        videoUrl: '',
        description: request.description,
        createdAt: new Date().toISOString(),
        errorMessage:
          error instanceof Error ? error.message : '视频生成流程失败',
      };

      return errorResponse;
    }
  }

  /**
   * 验证视频生成请求
   * @param request 请求对象
   */
  private validateRequest(request: VideoGenerationRequest): void {
    if (!request.description || request.description.trim().length === 0) {
      throw new Error('视频描述不能为空');
    }

    if (request.description.length > 1000) {
      throw new Error('视频描述不能超过1000个字符');
    }

    if (!request.images || request.images.length === 0) {
      throw new Error('至少需要上传一张图片');
    }

    if (request.images.length > 10) {
      throw new Error('最多只能上传10张图片');
    }

    // 验证图片格式和大小
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    for (const image of request.images) {
      if (!allowedTypes.includes(image.type)) {
        throw new Error(
          `不支持的图片格式: ${image.type}。支持的格式: ${allowedTypes.join(', ')}`
        );
      }

      if (image.size > maxSize) {
        throw new Error(`图片大小不能超过 ${this.formatFileSize(maxSize)}`);
      }
    }

    if (!request.webhookUrl || request.webhookUrl.trim() === '') {
      throw new Error('Webhook URL不能为空');
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

  /**
   * 发送webhook请求
   * @param url webhook URL
   * @param formData 表单数据
   * @returns Promise<VideoGenerationResponse>
   */
  private async sendWebhookRequest(
    url: string,
    formData: FormData
  ): Promise<VideoGenerationResponse> {
    // 在开发环境中使用代理路径
    let requestUrl = url;
    if (
      process.env.NODE_ENV === 'development' &&
      url.includes('n8n.wendealai.com')
    ) {
      const urlObj = new URL(url);
      requestUrl = urlObj.pathname;
    }

    const headers: Record<string, string> = {
      'User-Agent': 'WendealDashboard/1.0',
    };

    const fetchOptions: RequestInit = {
      method: 'POST',
      body: formData,
      headers,
      signal: AbortSignal.timeout(this.defaultTimeout),
    };

    // 在开发环境中不需要设置mode，因为代理会处理CORS
    if (process.env.NODE_ENV !== 'development') {
      fetchOptions.mode = 'cors';
    }

    try {
      const response = await fetch(requestUrl, fetchOptions);

      if (!response.ok) {
        let errorDetails = '';
        try {
          const errorText = await response.text();
          errorDetails = errorText;
        } catch {
          errorDetails = '';
        }

        if (response.status === 500) {
          throw new Error(
            `Webhook服务器内部错误 (500)。请检查n8n工作流配置。原始错误：${errorDetails}`
          );
        } else if (response.status === 404) {
          // 尝试解析n8n的404错误消息
          try {
            const errorData = JSON.parse(errorDetails);
            if (
              errorData.message &&
              errorData.message.includes('not registered for POST requests')
            ) {
              throw new Error(
                `Webhook未配置为接受POST请求。请在n8n中检查webhook设置，确保HTTP方法设置为POST。`
              );
            }
          } catch {
            // 如果不是JSON格式，使用通用错误消息
          }
          throw new Error(
            `Webhook未找到 (404)。请检查n8n中的webhook路径是否正确配置为: ${requestUrl}`
          );
        } else {
          throw new Error(
            `Webhook请求失败: ${response.status} ${response.statusText}。${errorDetails}`
          );
        }
      }

      // 解析响应为JSON
      const responseData = await response.json();

      // 构造响应对象
      const videoResponse: VideoGenerationResponse = {
        id: responseData.id || `video-${Date.now()}`,
        requestId: responseData.requestId || `req-${Date.now()}`,
        videoUrl: responseData.videoUrl || '',
        description: responseData.description || '',
        processingTime: responseData.processingTime || 0,
        createdAt: responseData.createdAt || new Date().toISOString(),
        metadata: responseData.metadata,
        errorMessage: responseData.error || responseData.errorMessage,
      };

      // 如果有错误，设置错误信息
      if (responseData.error || responseData.errorMessage) {
        videoResponse.errorMessage =
          responseData.error || responseData.errorMessage;
      }

      return videoResponse;
    } catch (error) {
      console.error('❌ Webhook请求失败:', error);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`请求超时 (${this.defaultTimeout / 1000}秒)`);
        }
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          if (process.env.NODE_ENV === 'development') {
            throw new Error(
              `无法连接到webhook服务器。请检查Vite代理配置是否正确。请求URL: ${requestUrl}`
            );
          } else {
            throw new Error(`无法连接到webhook服务器: ${url}`);
          }
        }
      }

      throw error;
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
   * 获取默认设置
   * @returns 默认视频生成设置
   */
  getDefaultSettings(): VideoGenerationSettings {
    return {
      webhookUrl: '',
      defaultDescription: '',
      maxImages: 5,
      maxImageSize: 10 * 1024 * 1024, // 10MB
      supportedImageFormats: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ],
      timeout: this.defaultTimeout,
      maxVideoDuration: 60, // 60秒
    };
  }
}

export const videoGenerationService = new VideoGenerationService();
export default videoGenerationService;
