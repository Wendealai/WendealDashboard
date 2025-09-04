/**
 * RAG API服务 - 处理与企业知识库的对话集成
 * RAG API Service - Handles conversation integration with enterprise knowledge base
 */

export interface RAGMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

export interface RAGResponse {
  success: boolean;
  message?: string;
  data?: {
    response: string;
    sources?: string[];
    confidence?: number;
  };
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
      // 使用n8n webhook URL
      // Use n8n webhook URL
      const webhookUrl = 'https://n8n.wendealai.com/webhook/wendealRAG';

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionId: sessionId || `session_${Date.now()}`,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

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

      return {
        success: true,
        data: {
          response: responseText,
          sources: responseData.sources || [],
          confidence: responseData.confidence || 0.8,
        },
      };
    } catch (error) {
      console.error('RAG API Error:', error);
      // 开发环境下提供fallback响应
      // Provide fallback response in development
      if (import.meta.env.DEV) {
        return this.getMockResponse(message);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : '发送消息失败',
      };
    }
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
