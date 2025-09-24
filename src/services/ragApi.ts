/**
 * RAG API服务 - 处理与企业知识库的对话集成
 * RAG API Service - Handles conversation integration with enterprise knowledge base
 */

export interface RAGMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  sources?: string[];
  confidence?: number;
}

export interface RAGResponse {
  success: boolean;
  message?: string;
  data:
    | {
        response: string;
        sources?: string[];
        confidence?: number;
      }
    | undefined;
  error?: string;
}

export interface FileUploadResponse {
  success: boolean;
  message?: string;
  fileId?: string;
  fileName?: string;
  error?: string;
}

/**
 * RAG API服务类
 * RAG API Service Class
 */
class RAGApiService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    // 从环境变量获取API配置
    // Get API configuration from environment variables
    this.baseUrl =
      import.meta.env.VITE_RAG_API_URL || 'http://localhost:8000/api';
    this.apiKey = import.meta.env.VITE_RAG_API_KEY || '';
  }

  /**
   * 发送消息到RAG系统
   * Send message to RAG system
   * @param message 用户消息内容
   * @param sessionId 会话ID，用于跟踪对话上下文
   */
  async sendMessage(message: string, sessionId?: string): Promise<RAGResponse> {
    try {
      console.log('🚀 RAG API: Sending message to webhook...');
      console.log('📝 Message:', message);
      console.log('🔗 Session ID:', sessionId);

      // 使用n8n webhook URL (注意大小写)
      // Use n8n webhook URL (note capitalization)
      const webhookUrl = 'https://n8n.wendealai.com/webhook/wendealRag';

      console.log('🌐 Webhook URL:', webhookUrl);

      // 尝试使用代理服务避免CORS问题 (备用方案)
      // Try using proxy service to avoid CORS issues (backup solution)
      // const proxyUrl = 'https://api.allorigins.win/get?url=' + encodeURIComponent(webhookUrl);

      // 使用POST请求发送JSON数据到n8n webhook
      // Use POST request to send JSON data to n8n webhook
      console.log('🌐 Using POST request to n8n webhook...');

      const requestData = {
        message: message,
        sessionId: sessionId || `session_${Date.now()}`,
        timestamp: new Date().toISOString(),
      };

      console.log('📤 Request data:', requestData);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(requestData),
        mode: 'cors',
      });

      console.log('📡 Response status:', response.status);
      console.log(
        '📡 Response headers:',
        Object.fromEntries(response.headers.entries())
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('📥 Response data:', responseData);

      return this.processResponseData(responseData);

      // 由于CORS问题，直接使用模拟响应
      // Due to CORS issues, use mock response directly
      console.warn(
        '🚫 CORS issue detected - n8n server needs CORS configuration'
      );
      console.warn('📋 To fix this permanently, configure n8n server with:');
      console.warn('   - Access-Control-Allow-Origin: *');
      console.warn('   - Access-Control-Allow-Methods: GET, POST, OPTIONS');
      console.warn(
        '   - Access-Control-Allow-Headers: Content-Type, X-Requested-With'
      );

      return this.getMockResponse(message);
    } catch (error) {
      console.error('RAG API Error:', error);

      // 检查是否是CORS错误或其他网络错误
      // Check if it's a CORS error or other network error
      if (
        error instanceof TypeError &&
        error.message.includes('NetworkError')
      ) {
        console.warn('CORS error detected, providing fallback response');
        return {
          success: false,
          data: undefined,
          error:
            'CORS错误：无法访问RAG服务。请联系管理员配置服务器CORS设置，或使用开发环境模拟响应。',
        };
      }

      // 检查是否是其他网络相关错误
      // Check if it's other network-related errors
      if (error instanceof Error) {
        if (
          error.message.includes('Failed to fetch') ||
          error.message.includes('Network request failed')
        ) {
          console.warn('Network error detected:', error.message);
          return {
            success: false,
            data: undefined,
            error:
              '网络连接错误：无法连接到RAG服务。请检查网络连接或联系管理员。',
          };
        }
      }

      // 开发环境下提供fallback响应
      // Provide fallback response in development
      if (import.meta.env.DEV) {
        return this.getMockResponse(message);
      }

      return {
        success: false,
        data: undefined,
        error: error instanceof Error ? error.message : '发送消息失败',
      };
    }
  }

  /**
   * 处理响应数据
   * Process response data
   */
  private processResponseData(data: any): RAGResponse {
    // 处理数组格式的响应（n8n webhook可能返回数组）
    // Handle array format response (n8n webhook might return array)
    let responseData = data;
    if (Array.isArray(data) && data.length > 0) {
      responseData = data[0];
    }

    // 提取响应内容，支持多种格式
    // Extract response content, support multiple formats
    let responseText = '';
    if (responseData.output) {
      responseText = responseData.output;
    } else if (responseData.response) {
      responseText = responseData.response;
    } else if (responseData.message) {
      responseText = responseData.message;
    } else if (typeof responseData === 'string') {
      responseText = responseData;
    } else {
      responseText = '收到回复';
    }

    // 确保data属性始终存在且完整
    // Ensure data property is always present and complete
    const responseDataObj = {
      response: responseText,
      sources: responseData.sources || [],
      confidence: responseData.confidence || 0.8,
    };

    return {
      success: true,
      data: responseDataObj,
    } as RAGResponse;
  }

  /**
   * 上传文件到RAG系统
   * Upload file to RAG system
   */
  async uploadFile(file: File): Promise<FileUploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('extract_text', 'true');
      formData.append('add_to_knowledge_base', 'true');

      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        message: '文件上传成功',
        fileId: data.file_id,
        fileName: data.file_name,
      };
    } catch (error) {
      console.error('File Upload Error:', error);

      // 模拟成功响应用于开发测试
      // Simulate success response for development testing
      if (import.meta.env.DEV) {
        return {
          success: true,
          message: '文件上传成功（模拟）',
          fileId: `mock_${Date.now()}`,
          fileName: file.name,
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : '文件上传失败',
      };
    }
  }

  /**
   * 获取知识库文件列表
   * Get knowledge base file list
   */
  async getKnowledgeBaseFiles(): Promise<{
    success: boolean;
    files?: Array<{
      id: string;
      name: string;
      size: number;
      uploadDate: string;
      type: string;
    }>;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/knowledge-base/files`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      return {
        success: true,
        files: data.files || [],
      };
    } catch (error) {
      console.error('Knowledge Base Files Error:', error);

      // 模拟文件列表用于开发测试
      // Simulate file list for development testing
      if (import.meta.env.DEV) {
        return {
          success: true,
          files: [
            {
              id: '1',
              name: '企业政策手册.pdf',
              size: 2048576,
              uploadDate: '2024-01-15',
              type: 'pdf',
            },
            {
              id: '2',
              name: '技术文档.docx',
              size: 1024000,
              uploadDate: '2024-01-14',
              type: 'docx',
            },
            {
              id: '3',
              name: '产品说明.md',
              size: 512000,
              uploadDate: '2024-01-13',
              type: 'md',
            },
          ],
        };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : '获取文件列表失败',
      };
    }
  }

  /**
   * 模拟RAG响应（开发环境使用）
   * Mock RAG response (for development environment)
   */
  private getMockResponse(message: string): RAGResponse {
    const responses = [
      {
        response: `根据企业知识库，我找到了与"${message}"相关的信息。这是一个模拟回复，用于演示RAG系统的功能。`,
        sources: ['企业政策手册.pdf', '技术文档.docx'],
        confidence: 0.85,
      },
      {
        response: `关于您询问的"${message}"，我在知识库中发现了相关内容。以下是基于文档的回答...`,
        sources: ['产品说明.md', '用户指南.txt'],
        confidence: 0.92,
      },
      {
        response: `感谢您的问题。基于企业知识库的分析，"${message}"的相关信息如下...`,
        sources: ['FAQ文档.pdf'],
        confidence: 0.78,
      },
    ];

    const randomResponse =
      responses[Math.floor(Math.random() * responses.length)];

    return {
      success: true,
      data: randomResponse,
    };
  }

  /**
   * 测试webhook连接
   * Test webhook connection
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    error?: string;
  }> {
    try {
      console.log('🔍 Testing RAG webhook connection...');
      const webhookUrl = 'https://n8n.wendealai.com/webhook/wendealRag';

      // 尝试POST请求测试连接
      // Try POST request to test connection
      const testData = {
        test: 'connection',
        timestamp: Date.now(),
        message: 'Connection test',
      };
      console.log('🧪 Test data:', testData);

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(testData),
      });

      console.log('📡 Response status:', response.status);
      console.log('📡 Response type:', response.type);
      console.log(
        '📡 Response headers:',
        Object.fromEntries(response.headers.entries())
      );

      if (response.status === 404) {
        return {
          success: false,
          message: 'Webhook未找到 (404)',
          error:
            'n8n中没有名为"wendealRag"的webhook，或者webhook未激活。请检查n8n中的webhook配置。',
        };
      }

      if (response.status === 500) {
        return {
          success: false,
          message: 'Webhook服务器错误 (500)',
          error: 'n8n服务器返回500错误。请检查n8n实例是否正常运行。',
        };
      }

      if (response.status === 0 || response.type === 'opaque') {
        return {
          success: false,
          message: '网络连接失败',
          error: '无法连接到n8n服务器。请检查网络连接和n8n实例状态。',
        };
      }

      const data = await response.text();
      console.log('📄 Response data:', data);

      return {
        success: true,
        message: `Webhook连接测试成功 (状态: ${response.status})`,
      };
    } catch (error) {
      console.error('❌ Webhook connection test failed:', error);
      return {
        success: false,
        message: 'Webhook连接测试失败',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 删除知识库文件
   * Delete knowledge base file
   */
  async deleteFile(
    fileId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/knowledge-base/files/${fileId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Delete File Error:', error);

      // 模拟成功响应用于开发测试
      // Simulate success response for development testing
      if (import.meta.env.DEV) {
        return { success: true };
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : '删除文件失败',
      };
    }
  }
}

// 导出单例实例
// Export singleton instance
export const ragApiService = new RAGApiService();
export default ragApiService;

// 开发环境下在全局对象上暴露测试函数
// Expose test function on global object in development
if (import.meta.env.DEV) {
  (window as any).testRAGConnection = async () => {
    console.log('🧪 Starting RAG connection test...');
    const result = await ragApiService.testConnection();
    console.log('📊 Test result:', result);
    return result;
  };

  console.log(
    '🔧 RAG Debug: Use testRAGConnection() in console to test webhook'
  );
}
