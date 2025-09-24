import axios from 'axios';

export interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  timestamp?: Date;
}

export interface ChatRequest {
  messages: ChatMessage[];
  userId?: string;
  sessionId?: string;
}

export interface ChatResponse {
  text: string;
  role: 'ai';
  timestamp: Date;
}

class SessionManager {
  private static instance: SessionManager;
  private sessionId: string | null = null;

  private constructor() {}

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * 生成唯一的session ID
   * 优先级：Cloudflare WARP ID > IP+UserAgent Hash > localStorage缓存 > 随机生成
   */
  getSessionId(): string {
    // 如果已经有sessionId，直接返回
    if (this.sessionId) {
      return this.sessionId;
    }

    // 1. 尝试从localStorage获取缓存的sessionId
    const cachedSessionId = localStorage.getItem('chat_session_id');
    if (cachedSessionId) {
      this.sessionId = cachedSessionId;
      return this.sessionId;
    }

    // 2. 尝试获取Cloudflare WARP ID（最稳定）
    const warpTagId = this.getWarpTagId();
    if (warpTagId) {
      this.sessionId = `warp_${warpTagId}`;
      this.saveSessionId();
      return this.sessionId;
    }

    // 3. 使用IP地址和User Agent生成hash
    const clientHash = this.generateClientHash();
    if (clientHash) {
      this.sessionId = `client_${clientHash}`;
      this.saveSessionId();
      return this.sessionId;
    }

    // 4. 兜底方案：生成随机sessionId
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.saveSessionId();
    return this.sessionId;
  }

  /**
   * 获取Cloudflare WARP Tag ID
   */
  private getWarpTagId(): string | null {
    try {
      // 尝试从document.cookie获取
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'cf-warp-tag-id' && value) {
          return value;
        }
      }

      // 尝试从headers获取（如果在客户端可以访问）
      if (typeof window !== 'undefined') {
        const match = document.cookie.match(/cf-warp-tag-id=([^;]+)/);
        return match ? match[1] || null : null;
      }
    } catch (error) {
      console.warn('Failed to get WARP tag ID:', error);
    }
    return null;
  }

  /**
   * 生成客户端hash（基于IP和User Agent）
   */
  private generateClientHash(): string | null {
    try {
      // 获取客户端信息
      const userAgent = navigator.userAgent;
      const language = navigator.language;
      const platform = navigator.platform;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // 尝试获取IP地址（通过第三方服务）
      // 注意：这在某些环境下可能不工作
      const clientInfo = `${userAgent}|${language}|${platform}|${timezone}`;

      // 生成hash
      let hash = 0;
      for (let i = 0; i < clientInfo.length; i++) {
        const char = clientInfo.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // 转换为32位整数
      }

      return Math.abs(hash).toString(36);
    } catch (error) {
      console.warn('Failed to generate client hash:', error);
      return null;
    }
  }

  /**
   * 保存sessionId到localStorage
   */
  private saveSessionId(): void {
    if (this.sessionId) {
      localStorage.setItem('chat_session_id', this.sessionId);
    }
  }

  /**
   * 清除sessionId
   */
  clearSessionId(): void {
    this.sessionId = null;
    localStorage.removeItem('chat_session_id');
  }

  /**
   * 刷新sessionId（用于需要新会话时）
   */
  refreshSessionId(): string {
    this.clearSessionId();
    return this.getSessionId();
  }
}

class ChatService {
  private n8nWebhookUrl: string;
  private n8nApiKey: string;

  constructor() {
    this.n8nWebhookUrl =
      import.meta.env.VITE_N8N_WEBHOOK_URL ||
      'https://n8n.wendealai.com/webhook/wendealdashboardaichat';
    this.n8nApiKey = import.meta.env.VITE_N8N_API_KEY || '';
  }

  /**
   * 智能格式化文本，处理换行符、列表项等格式
   */
  private formatText(text: string): string {
    if (!text) return text;

    let formattedText = text;

    // 处理数字列表项（1. **标题** - 内容）
    formattedText = formattedText.replace(
      /(\d+\.\s*\*\*.*?\*\*)\s*-\s*(.*?)(?=\d+\.|$)/g,
      '$1\n   - $2'
    );

    // 处理普通列表项（**标题** - 内容）
    formattedText = formattedText.replace(
      /(\*\*.*?\*\*)\s*-\s*(.*?)(?=\*\*|$)/g,
      '$1\n   - $2'
    );

    // 处理连续的数字列表项
    formattedText = formattedText.replace(/(\d+\.\s*)/g, '\n$1');

    // 处理多个连续的换行符
    formattedText = formattedText.replace(/\n{3,}/g, '\n\n');

    // 确保开头和结尾有适当的格式
    formattedText = formattedText.trim();

    return formattedText;
  }

  async sendMessage(
    message: string,
    userId?: string,
    sessionId?: string
  ): Promise<string> {
    try {
      // 获取或生成sessionId
      const finalSessionId =
        sessionId || SessionManager.getInstance().getSessionId();

      // 详细的调试信息
      console.log('🚀 Chat Service Debug Info:');
      console.log('📝 Message:', message);
      console.log('👤 User ID:', userId);
      console.log('🔗 Session ID:', finalSessionId);
      console.log('🌐 Webhook URL:', this.n8nWebhookUrl);
      console.log('🔑 API Key exists:', !!this.n8nApiKey);
      console.log('🔑 API Key length:', this.n8nApiKey.length);

      const requestData: ChatRequest = {
        messages: [
          {
            role: 'user',
            text: message,
            timestamp: new Date(),
          },
        ],
        ...(userId && { userId }),
        sessionId: finalSessionId, // 总是包含sessionId
      };

      console.log('📦 Request Data:', JSON.stringify(requestData, null, 2));

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.n8nApiKey}`,
        'X-User-ID': userId || 'anonymous',
      };

      console.log('📋 Request Headers:', headers);

      const response = await axios.post(this.n8nWebhookUrl, requestData, {
        headers,
        timeout: 30000, // 30秒超时
      });

      console.log('✅ Response Status:', response.status);
      console.log('📦 Response Data:', JSON.stringify(response.data, null, 2));

      // 处理n8n的响应
      console.log(
        '📦 Raw Response Data:',
        JSON.stringify(response.data, null, 2)
      );

      // 处理数组响应格式
      if (Array.isArray(response.data)) {
        console.log('📝 Processing array response');
        if (response.data.length > 0) {
          const firstItem = response.data[0];

          // 优先使用response字段（纯文本）
          if (firstItem.response) {
            console.log('📝 Using first item response:', firstItem.response);
            return this.formatText(firstItem.response);
          }

          // 其次使用text字段
          if (firstItem.text) {
            console.log('📝 Using first item text:', firstItem.text);
            return this.formatText(firstItem.text);
          }

          // 处理content字段（格式化文本）
          if (firstItem.content && Array.isArray(firstItem.content)) {
            console.log('📝 Processing content array');
            let formattedText = '';
            for (const contentItem of firstItem.content) {
              if (contentItem.type === 'text' && contentItem.text) {
                formattedText += contentItem.text;
              }
            }
            if (formattedText.trim()) {
              console.log('📝 Using formatted content:', formattedText);
              return this.formatText(formattedText);
            }
          }

          // 兜底：如果firstItem本身是字符串
          if (typeof firstItem === 'string') {
            console.log('📝 Using first item as string:', firstItem);
            return this.formatText(firstItem);
          }

          // 如果firstItem有message字段
          if (firstItem.message) {
            console.log('📝 Using first item message:', firstItem.message);
            return this.formatText(firstItem.message);
          }
        }
        console.warn('⚠️ Array response is empty or invalid');
        return 'Sorry, I cannot understand your request. Please try again later.';
      }

      // 处理对象响应格式
      if (response.data && response.data.text) {
        console.log('📝 Using response.data.text');
        return this.formatText(response.data.text);
      } else if (response.data && response.data.message) {
        console.log('📝 Using response.data.message');
        return this.formatText(response.data.message);
      } else if (response.data && typeof response.data === 'string') {
        console.log('📝 Using response.data as string');
        return this.formatText(response.data);
      } else {
        console.warn('⚠️ Unexpected response format:', response.data);
        return 'Sorry, I cannot understand your request. Please try again later.';
      }
    } catch (error) {
      console.error('❌ Chat service error:', error);

      if (axios.isAxiosError(error)) {
        console.error('🔍 Axios Error Details:');
        console.error('  - Code:', error.code);
        console.error('  - Status:', error.response?.status);
        console.error('  - Status Text:', error.response?.statusText);
        console.error('  - Response Data:', error.response?.data);
        console.error('  - Request URL:', error.config?.url);
        console.error('  - Request Headers:', error.config?.headers);

        if (error.code === 'ECONNABORTED') {
          return 'Request timeout, please try again later.';
        } else if (error.response?.status === 401) {
          return 'Authentication failed, please check API key configuration.';
        } else if (error.response?.status === 404) {
          return 'Chat service not found, please check webhook URL configuration.';
        } else if ((error.response?.status || 0) >= 500) {
          return 'Server error, please try again later.';
        } else {
          return 'Network connection error, please check your network connection.';
        }
      } else {
        console.error('🔍 Non-Axios Error:', error);
        return 'Unknown error, please try again later.';
      }
    }
  }

  // 模拟聊天功能（当n8n服务不可用时使用）
  async sendMessageMock(): Promise<string> {
    // 模拟网络延迟
    await new Promise(resolve =>
      setTimeout(resolve, 1000 + Math.random() * 2000)
    );

    const responses = [
      '我理解您的问题。让我为您提供一些建议。',
      '这是一个很好的问题！根据我的经验...',
      '我需要更多信息来更好地帮助您。您能提供更多细节吗？',
      '感谢您的询问。这是一个常见的问题，我来为您解答。',
      '我已经记录了您的问题，会尽快为您处理。',
      '根据您描述的情况，我建议您尝试以下解决方案...',
      '这是一个技术性问题，我来为您详细解释。',
      '我已经将您的问题转发给相关团队，他们会尽快回复您。',
    ];

    return (
      responses[Math.floor(Math.random() * responses.length)] ||
      '我正在思考您的问题...'
    );
  }

  // 获取聊天历史（如果需要的话）
  async getChatHistory(): Promise<ChatMessage[]> {
    // 这里可以实现从数据库或缓存中获取聊天历史
    // 目前返回空数组
    return [];
  }

  // 保存聊天历史（如果需要的话）
  async saveChatHistory(
    sessionId: string,
    messages: ChatMessage[]
  ): Promise<void> {
    // 这里可以实现保存聊天历史到数据库或缓存
    console.log('Saving chat history:', { sessionId, messages });
  }
}

export const chatService = new ChatService();

// Export SessionManager for external use
export { SessionManager };
