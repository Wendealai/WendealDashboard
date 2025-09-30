/**
 * 图像生成服务
 * 处理与n8n工作流的图像生成和编辑通信
 */

import type { N8NWebhookResponse } from './n8nWebhookService';
import type {
  ImageGenerationRequest,
  ImageGenerationResponse,
  ImageGenerationSettings,
  ImageGenerationMode,
} from '@/pages/SocialMedia/types';

/**
 * 图像生成请求接口
 */
export interface ImageGenerationRequestData {
  prompt: string;
  mode: ImageGenerationMode;
  imageFile?: File;
  webhookUrl: string;
  settings?: Partial<ImageGenerationSettings>;
}

/**
 * 图像生成服务类
 */
export class ImageGenerationService {
  private readonly defaultTimeout = 60000; // 60秒超时，给图像生成更多时间
  private readonly defaultSettings: ImageGenerationSettings = {
    webhookUrl: '',
    maxImageSize: 10 * 1024 * 1024, // 10MB
    supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
    timeout: this.defaultTimeout,
  };

  /**
   * 从文本生成图像
   * @param prompt 文本提示词
   * @param webhookUrl webhook URL
   * @param settings 图像生成设置
   * @returns Promise<ImageGenerationResponse>
   */
  async generateImageFromText(
    prompt: string,
    webhookUrl: string,
    settings?: Partial<ImageGenerationSettings>
  ): Promise<ImageGenerationResponse> {
    try {
      console.log('开始文本到图像生成:', {
        prompt: prompt.substring(0, 100) + '...',
      });

      if (!this.isValidPrompt(prompt)) {
        throw new Error(
          'Prompt cannot be empty and should be 1-1000 characters long'
        );
      }

      if (!this.isValidWebhookUrl(webhookUrl)) {
        throw new Error('无效的webhook URL');
      }

      const requestData = {
        prompt,
        mode: 'text-to-image' as ImageGenerationMode,
        timestamp: new Date().toISOString(),
        source: 'wendeal-dashboard',
        version: '1.0',
      };

      console.log('发送文本到图像生成请求...');

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WendealDashboard/1.0',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(requestData),
        signal: AbortSignal.timeout(this.defaultTimeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('文本到图像生成失败:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(
          `图像生成失败: ${response.status} ${response.statusText}`
        );
      }

      // 检查响应内容类型
      const contentType = response.headers.get('content-type');
      console.log('响应内容类型:', contentType);

      let responseData: any;
      let imageUrl = '';

      // 如果是二进制响应（图像文件）
      if (contentType && contentType.startsWith('image/')) {
        console.log('检测到二进制图像响应');
        const imageBlob = await response.blob();
        imageUrl = URL.createObjectURL(imageBlob);
        console.log('创建了blob URL:', imageUrl);

        // 构造响应对象
        responseData = {
          imageUrl: imageUrl,
          success: true,
        };
      }
      // 如果是JSON响应
      else {
        responseData = await response.json();
        console.log('文本到图像生成成功:', responseData);
      }

      // 如果还没有设置imageUrl，继续处理响应数据
      if (!imageUrl) {
        // 首先尝试获取直接的URL
        if (responseData.imageUrl) {
          imageUrl = responseData.imageUrl;
        } else if (responseData.data?.imageUrl) {
          imageUrl = responseData.data.imageUrl;
        }
        // 检查是否返回了文件数据
        else if (
          responseData.data &&
          (responseData.data.data || responseData.data.fileName)
        ) {
          // 处理n8n文件数据
          const fileData = responseData.data.data || responseData.data;
          const fileName =
            responseData.data.fileName || `generated-image-${Date.now()}.png`;
          const mimeType = responseData.data.mimeType || 'image/png';

          if (fileData) {
            // 如果是base64字符串，转换为blob URL
            if (typeof fileData === 'string' && fileData.includes('base64,')) {
              const base64Parts = fileData.split(',');
              if (base64Parts.length === 2 && base64Parts[1]) {
                const base64Data = base64Parts[1];
                try {
                  const binaryData = atob(base64Data);
                  const bytes = new Uint8Array(binaryData.length);
                  for (let i = 0; i < binaryData.length; i++) {
                    bytes[i] = binaryData.charCodeAt(i);
                  }
                  const blob = new Blob([bytes], { type: mimeType });
                  imageUrl = URL.createObjectURL(blob);
                } catch (error) {
                  console.error('Base64解码失败:', error);
                }
              }
            }
            // 如果是二进制数据
            else if (
              fileData instanceof ArrayBuffer ||
              fileData instanceof Uint8Array
            ) {
              const blob = new Blob([fileData], { type: mimeType });
              imageUrl = URL.createObjectURL(blob);
            }
          }
        }
        // 处理n8n返回的元数据数组
        else if (Array.isArray(responseData) && responseData.length > 0) {
          const firstItem = responseData[0];
          if (firstItem && firstItem.mimeType && firstItem.fileName) {
            // 这是一个n8n文件元数据响应
            // 由于没有实际文件数据，我们创建一个占位符URL
            // 实际应该通过其他方式获取文件数据，比如文件下载URL
            console.warn('n8n返回了文件元数据但没有实际文件数据:', firstItem);

            // 创建一个占位符blob来表示图像已生成但数据不可用
            const placeholderText = `Image generated successfully\nFile: ${firstItem.fileName}\nType: ${firstItem.mimeType}\nSize: ${firstItem.fileSize}`;
            const blob = new Blob([placeholderText], { type: 'text/plain' });
            imageUrl = URL.createObjectURL(blob);

            // 或者我们可以抛出一个更具体的错误
            throw new Error(
              `Image generated but file data not available. File metadata: ${JSON.stringify(firstItem)}`
            );
          }
        }
      }

      // 构造标准化响应
      const imageResponse: ImageGenerationResponse = {
        id: responseData.id || 'img-' + Date.now(),
        requestId: responseData.requestId || '',
        imageUrl: imageUrl,
        prompt: prompt,
        processingTime: responseData.processingTime,
        createdAt: new Date().toISOString(),
        errorMessage: responseData.errorMessage,
      };

      if (!imageResponse.imageUrl) {
        // 检查是否返回了文件元数据但没有实际数据
        if (responseData && (responseData.fileName || responseData.mimeType)) {
          throw new Error(
            `Image generated successfully but binary data not returned. Please modify your n8n workflow to return the actual image binary data, not just metadata. File info: ${JSON.stringify(responseData)}`
          );
        }
        throw new Error(
          'Response does not contain generated image data. Please check your n8n workflow configuration.'
        );
      }

      return imageResponse;
    } catch (error) {
      console.error('文本到图像生成服务错误:', error);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Image generation timeout, please try again later');
        }
        if (error.message.includes('Failed to fetch')) {
          throw new Error(
            'Unable to connect to image generation service, please check network connection'
          );
        }
      }

      throw error;
    }
  }

  /**
   * 使用提示词编辑图像
   * @param imageFile 要编辑的图像文件
   * @param prompt 编辑提示词
   * @param webhookUrl webhook URL
   * @param settings 图像生成设置
   * @returns Promise<ImageGenerationResponse>
   */
  async editImageWithPrompt(
    imageFile: File,
    prompt: string,
    webhookUrl: string,
    settings?: Partial<ImageGenerationSettings>
  ): Promise<ImageGenerationResponse> {
    try {
      console.log('开始图像编辑:', {
        fileName: imageFile.name,
        fileSize: imageFile.size,
        prompt: prompt.substring(0, 100) + '...',
      });

      // 验证输入
      this.validateImageFile(imageFile);
      if (!this.isValidPrompt(prompt)) {
        throw new Error(
          'Edit prompt cannot be empty and should be 1-500 characters long'
        );
      }
      if (!this.isValidWebhookUrl(webhookUrl)) {
        throw new Error('Invalid webhook URL');
      }

      // 创建FormData
      const formData = new FormData();
      formData.append('image', imageFile, imageFile.name);
      formData.append('prompt', prompt);
      formData.append('mode', 'image-edit');
      formData.append('timestamp', new Date().toISOString());
      formData.append('source', 'wendeal-dashboard');
      formData.append('version', '1.0');

      console.log('发送图像编辑请求，包含prompt:', prompt);
      console.log('FormData内容:', {
        image: imageFile.name,
        prompt: prompt,
        mode: 'image-edit',
      });

      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'User-Agent': 'WendealDashboard/1.0',
          'X-Requested-With': 'XMLHttpRequest',
        },
        signal: AbortSignal.timeout(this.defaultTimeout),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('图像编辑失败:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
        });
        throw new Error(
          `图像编辑失败: ${response.status} ${response.statusText}`
        );
      }

      // 检查响应内容类型
      const contentType = response.headers.get('content-type');
      console.log('响应内容类型:', contentType);

      let responseData: any;
      let imageUrl = '';

      // 如果是二进制响应（图像文件）
      if (contentType && contentType.startsWith('image/')) {
        console.log('检测到二进制图像响应');
        const imageBlob = await response.blob();
        imageUrl = URL.createObjectURL(imageBlob);
        console.log('创建了blob URL:', imageUrl);

        // 构造响应对象
        responseData = {
          imageUrl: imageUrl,
          success: true,
        };
      }
      // 如果是JSON响应
      else {
        responseData = await response.json();
        console.log('图像编辑成功:', responseData);
      }

      // 如果还没有设置imageUrl，继续处理响应数据
      if (!imageUrl) {
        // 首先尝试获取直接的URL
        if (responseData.imageUrl) {
          imageUrl = responseData.imageUrl;
        } else if (responseData.data?.imageUrl) {
          imageUrl = responseData.data.imageUrl;
        }
        // 检查是否返回了文件数据
        else if (
          responseData.data &&
          (responseData.data.data || responseData.data.fileName)
        ) {
          // 处理n8n文件数据
          const fileData = responseData.data.data || responseData.data;
          const fileName =
            responseData.data.fileName || `edited-image-${Date.now()}.png`;
          const mimeType = responseData.data.mimeType || 'image/png';

          if (fileData) {
            // 如果是base64字符串，转换为blob URL
            if (typeof fileData === 'string' && fileData.includes('base64,')) {
              const base64Parts = fileData.split(',');
              if (base64Parts.length === 2 && base64Parts[1]) {
                const base64Data = base64Parts[1];
                try {
                  const binaryData = atob(base64Data);
                  const bytes = new Uint8Array(binaryData.length);
                  for (let i = 0; i < binaryData.length; i++) {
                    bytes[i] = binaryData.charCodeAt(i);
                  }
                  const blob = new Blob([bytes], { type: mimeType });
                  imageUrl = URL.createObjectURL(blob);
                } catch (error) {
                  console.error('Base64解码失败:', error);
                }
              }
            }
            // 如果是二进制数据
            else if (
              fileData instanceof ArrayBuffer ||
              fileData instanceof Uint8Array
            ) {
              const blob = new Blob([fileData], { type: mimeType });
              imageUrl = URL.createObjectURL(blob);
            }
          }
        }
        // 处理n8n返回的元数据数组
        else if (Array.isArray(responseData) && responseData.length > 0) {
          const firstItem = responseData[0];
          if (firstItem && firstItem.mimeType && firstItem.fileName) {
            // 这是一个n8n文件元数据响应
            // 由于没有实际文件数据，我们创建一个占位符URL
            // 实际应该通过其他方式获取文件数据，比如文件下载URL
            console.warn('n8n返回了文件元数据但没有实际文件数据:', firstItem);

            // 创建一个占位符blob来表示图像已生成但数据不可用
            const placeholderText = `Image edited successfully\nFile: ${firstItem.fileName}\nType: ${firstItem.mimeType}\nSize: ${firstItem.fileSize}`;
            const blob = new Blob([placeholderText], { type: 'text/plain' });
            imageUrl = URL.createObjectURL(blob);

            // 或者我们可以抛出一个更具体的错误
            throw new Error(
              `Image edited but file data not available. File metadata: ${JSON.stringify(firstItem)}`
            );
          }
        }
      }

      // 构造标准化响应
      const imageResponse: ImageGenerationResponse = {
        id: responseData.id || 'edit-' + Date.now(),
        requestId: responseData.requestId || '',
        imageUrl: imageUrl,
        prompt: prompt,
        processingTime: responseData.processingTime,
        createdAt: new Date().toISOString(),
        errorMessage: responseData.errorMessage,
      };

      if (!imageResponse.imageUrl) {
        throw new Error('Response does not contain edited image data');
      }

      return imageResponse;
    } catch (error) {
      console.error('图像编辑服务错误:', error);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Image editing timeout, please try again later');
        }
        if (error.message.includes('Failed to fetch')) {
          throw new Error(
            'Unable to connect to image editing service, please check network connection'
          );
        }
      }

      throw error;
    }
  }

  /**
   * 验证提示词
   * @param prompt 提示词
   * @returns boolean
   */
  private isValidPrompt(prompt: string): boolean {
    return Boolean(
      prompt && prompt.trim().length > 0 && prompt.trim().length <= 1000
    );
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
   * 验证图像文件
   * @param file 图像文件
   */
  private validateImageFile(file: File): void {
    if (!file) {
      throw new Error('Please select an image file to edit');
    }

    const maxFileSize = this.defaultSettings.maxImageSize;
    if (file.size > maxFileSize) {
      throw new Error(
        `Image file too large, maximum supported ${this.formatFileSize(maxFileSize)}, current file size ${this.formatFileSize(file.size)}`
      );
    }

    const allowedTypes = this.defaultSettings.supportedFormats;
    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        `Unsupported image format: ${file.type}. Supported formats: ${allowedTypes.join(', ')}`
      );
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
   * 测试webhook连接
   * @param webhookUrl webhook URL
   * @returns Promise<boolean>
   */
  async testWebhookConnection(webhookUrl: string): Promise<boolean> {
    try {
      console.log('测试图像生成webhook连接:', webhookUrl);

      if (!this.isValidWebhookUrl(webhookUrl)) {
        console.error('无效的webhook URL');
        return false;
      }

      const response = await fetch(
        webhookUrl.replace(/\/webhook.*$/, '/health'),
        {
          method: 'GET',
          headers: {
            'User-Agent': 'WendealDashboard/1.0',
          },
          signal: AbortSignal.timeout(5000), // 5秒超时
        }
      );

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
}

export const imageGenerationService = new ImageGenerationService();
export default imageGenerationService;
