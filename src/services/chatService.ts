import axios from 'axios';
import { runOptimizedApiCall } from './apiUsageOptimizer';
import { createSparkeryIdempotencyKey } from './sparkeryIdempotency';

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
   * 閻㈢喐鍨氶崬顖欑閻ㄥ墕ession ID
   * 娴兼ê鍘涚痪褝绱癈loudflare WARP ID > IP+UserAgent Hash > localStorage缂傛挸鐡?> 闂呭繑婧€閻㈢喐鍨?
   */
  getSessionId(): string {
    // 婵″倹鐏夊鑼病閺堝』essionId閿涘瞼娲块幒銉ㄧ箲閸?
    if (this.sessionId) {
      return this.sessionId;
    }

    // 1. 鐏忔繆鐦禒宸恛calStorage閼惧嘲褰囩紓鎾崇摠閻ㄥ墕essionId
    const cachedSessionId = localStorage.getItem('chat_session_id');
    if (cachedSessionId) {
      this.sessionId = cachedSessionId;
      return this.sessionId;
    }

    // 2. 鐏忔繆鐦懢宄板絿Cloudflare WARP ID閿涘牊娓剁粙鍐茬暰閿?
    const warpTagId = this.getWarpTagId();
    if (warpTagId) {
      this.sessionId = `warp_${warpTagId}`;
      this.saveSessionId();
      return this.sessionId;
    }

    // 3. 娴ｈ法鏁P閸︽澘娼冮崪瀛秙er Agent閻㈢喐鍨歨ash
    const clientHash = this.generateClientHash();
    if (clientHash) {
      this.sessionId = `client_${clientHash}`;
      this.saveSessionId();
      return this.sessionId;
    }

    // 4. 閸忔粌绨抽弬瑙勵攳閿涙氨鏁撻幋鎰版閺堢皧essionId
    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.saveSessionId();
    return this.sessionId;
  }

  /**
   * 閼惧嘲褰嘋loudflare WARP Tag ID
   */
  private getWarpTagId(): string | null {
    try {
      // 鐏忔繆鐦禒宸噊cument.cookie閼惧嘲褰?
      const cookies = document.cookie.split(';');
      for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'cf-warp-tag-id' && value) {
          return value;
        }
      }

      // 鐏忔繆鐦禒宸媏aders閼惧嘲褰囬敍鍫濐洤閺嬫粌婀€广垺鍩涚粩顖氬讲娴犮儴顔栭梻顕嗙礆
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
   * 閻㈢喐鍨氱€广垺鍩涚粩鐥焌sh閿涘牆鐔€娴滃丢P閸滃ser Agent閿?
   */
  private generateClientHash(): string | null {
    try {
      // 閼惧嘲褰囩€广垺鍩涚粩顖欎繆閹?
      const userAgent = navigator.userAgent;
      const language = navigator.language;
      const platform = navigator.platform;
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // 鐏忔繆鐦懢宄板絿IP閸︽澘娼冮敍鍫モ偓姘崇箖缁楊兛绗侀弬瑙勬箛閸斺槄绱?
      // 濞夈劍鍓伴敍姘崇箹閸︺劍鐓囨禍娑氬箚婢у啩绗呴崣顖濆厴娑撳秴浼愭担?
      const clientInfo = `${userAgent}|${language}|${platform}|${timezone}`;

      // 閻㈢喐鍨歨ash
      let hash = 0;
      for (let i = 0; i < clientInfo.length; i++) {
        const char = clientInfo.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // 鏉烆剚宕叉稉?2娴ｅ秵鏆ｉ弫?
      }

      return Math.abs(hash).toString(36);
    } catch (error) {
      console.warn('Failed to generate client hash:', error);
      return null;
    }
  }

  /**
   * 娣囨繂鐡╯essionId閸掔櫦ocalStorage
   */
  private saveSessionId(): void {
    if (this.sessionId) {
      localStorage.setItem('chat_session_id', this.sessionId);
    }
  }

  /**
   * 濞撳懘娅巗essionId
   */
  clearSessionId(): void {
    this.sessionId = null;
    localStorage.removeItem('chat_session_id');
  }

  /**
   * 閸掗攱鏌妔essionId閿涘牏鏁ゆ禍搴ㄦ付鐟曚焦鏌婃导姘崇樈閺冭绱?
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
   * 閺呴缚鍏橀弽鐓庣础閸栨牗鏋冮張顒婄礉婢跺嫮鎮婇幑銏ｎ攽缁楋负鈧礁鍨悰銊┿€嶇粵澶嬬壐瀵?
   */
  private formatText(text: string): string {
    if (!text) return text;

    let formattedText = text;

    // 婢跺嫮鎮婇弫鏉跨摟閸掓銆冩い鐧哥礄1. **閺嶅洭顣?* - 閸愬懎顔愰敍?
    formattedText = formattedText.replace(
      /(\d+\.\s*\*\*.*?\*\*)\s*-\s*(.*?)(?=\d+\.|$)/g,
      '$1\n   - $2'
    );

    // 婢跺嫮鎮婇弲顕€鈧艾鍨悰銊┿€嶉敍?*閺嶅洭顣?* - 閸愬懎顔愰敍?
    formattedText = formattedText.replace(
      /(\*\*.*?\*\*)\s*-\s*(.*?)(?=\*\*|$)/g,
      '$1\n   - $2'
    );

    // 婢跺嫮鎮婃潻鐐电敾閻ㄥ嫭鏆熺€涙鍨悰銊┿€?
    formattedText = formattedText.replace(/(\d+\.\s*)/g, '\n$1');

    // 婢跺嫮鎮婃径姘嚋鏉╃偟鐢婚惃鍕床鐞涘瞼顑?
    formattedText = formattedText.replace(/\n{3,}/g, '\n\n');

    // 绾喕绻氬鈧径鏉戞嫲缂佹挸鐔張澶愨偓鍌氱秼閻ㄥ嫭鐗稿?
    formattedText = formattedText.trim();

    return formattedText;
  }

  async sendMessage(
    message: string,
    userId?: string,
    sessionId?: string
  ): Promise<string> {
    try {
      // 閼惧嘲褰囬幋鏍晸閹存仩essionId
      const finalSessionId =
        sessionId || SessionManager.getInstance().getSessionId();

      // 鐠囷妇绮忛惃鍕殶鐠囨洑淇婇幁?
      console.log('棣冩畬 Chat Service Debug Info:');
      console.log('棣冩憫 Message:', message);
      console.log('棣冩噥 User ID:', userId);
      console.log('棣冩晢 Session ID:', finalSessionId);
      console.log('棣冨 Webhook URL:', this.n8nWebhookUrl);
      console.log('棣冩斀 API Key exists:', !!this.n8nApiKey);
      console.log('棣冩斀 API Key length:', this.n8nApiKey.length);

      const requestData: ChatRequest = {
        messages: [
          {
            role: 'user',
            text: message,
            timestamp: new Date(),
          },
        ],
        ...(userId && { userId }),
        sessionId: finalSessionId, // 閹粯妲搁崠鍛儓sessionId
      };

      console.log('棣冩憹 Request Data:', JSON.stringify(requestData, null, 2));

      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.n8nApiKey}`,
        'X-User-ID': userId || 'anonymous',
      };

      console.log('棣冩惖 Request Headers:', headers);

      const requestFingerprint = createSparkeryIdempotencyKey('chat.message', {
        message,
        userId: userId || 'anonymous',
        sessionId: finalSessionId,
      });

      const response = await runOptimizedApiCall({
        call: () =>
          axios.post(this.n8nWebhookUrl, requestData, {
            headers,
            timeout: 30000,
          }),
        cacheKey: `chat-response:${requestFingerprint}`,
        cacheTtlMs: 15000,
        rateLimitKey: `chat-session:${finalSessionId}`,
        minIntervalMs: 300,
      });

      console.log('鉁?Response Status:', response.status);
      console.log(
        '棣冩憹 Response Data:',
        JSON.stringify(response.data, null, 2)
      );

      // 婢跺嫮鎮妌8n閻ㄥ嫬鎼锋惔?
      console.log(
        '棣冩憹 Raw Response Data:',
        JSON.stringify(response.data, null, 2)
      );

      // 婢跺嫮鎮婇弫鎵矋閸濆秴绨查弽鐓庣础
      if (Array.isArray(response.data)) {
        console.log('棣冩憫 Processing array response');
        if (response.data.length > 0) {
          const firstItem = response.data[0];

          // 娴兼ê鍘涙担璺ㄦ暏response鐎涙顔岄敍鍫㈠嚱閺傚洦婀伴敍?
          if (firstItem.response) {
            console.log(
              '棣冩憫 Using first item response:',
              firstItem.response
            );
            return this.formatText(firstItem.response);
          }

          // 閸忚埖顐兼担璺ㄦ暏text鐎涙顔?
          if (firstItem.text) {
            console.log('棣冩憫 Using first item text:', firstItem.text);
            return this.formatText(firstItem.text);
          }

          // 婢跺嫮鎮奵ontent鐎涙顔岄敍鍫熺壐瀵繐瀵查弬鍥ㄦ拱閿?
          if (firstItem.content && Array.isArray(firstItem.content)) {
            console.log('棣冩憫 Processing content array');
            let formattedText = '';
            for (const contentItem of firstItem.content) {
              if (contentItem.type === 'text' && contentItem.text) {
                formattedText += contentItem.text;
              }
            }
            if (formattedText.trim()) {
              console.log('棣冩憫 Using formatted content:', formattedText);
              return this.formatText(formattedText);
            }
          }

          // 閸忔粌绨抽敍姘洤閺嬫竾irstItem閺堫剝闊╅弰顖氱摟缁楋缚瑕?
          if (typeof firstItem === 'string') {
            console.log('棣冩憫 Using first item as string:', firstItem);
            return this.formatText(firstItem);
          }

          // 婵″倹鐏塮irstItem閺堝〉essage鐎涙顔?
          if (firstItem.message) {
            console.log('棣冩憫 Using first item message:', firstItem.message);
            return this.formatText(firstItem.message);
          }
        }
        console.warn('閳跨媴绗?Array response is empty or invalid');
        return 'Sorry, I cannot understand your request. Please try again later.';
      }

      // 婢跺嫮鎮婄€电钖勯崫宥呯安閺嶇厧绱?
      if (response.data && response.data.text) {
        console.log('棣冩憫 Using response.data.text');
        return this.formatText(response.data.text);
      } else if (response.data && response.data.message) {
        console.log('棣冩憫 Using response.data.message');
        return this.formatText(response.data.message);
      } else if (response.data && typeof response.data === 'string') {
        console.log('棣冩憫 Using response.data as string');
        return this.formatText(response.data);
      } else {
        console.warn('閳跨媴绗?Unexpected response format:', response.data);
        return 'Sorry, I cannot understand your request. Please try again later.';
      }
    } catch (error) {
      console.error('閴?Chat service error:', error);

      if (axios.isAxiosError(error)) {
        console.error('棣冩敵 Axios Error Details:');
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
        console.error('棣冩敵 Non-Axios Error:', error);
        return 'Unknown error, please try again later.';
      }
    }
  }

  // 濡剝瀚欓懕濠傘亯閸旂喕鍏橀敍鍫濈秼n8n閺堝秴濮熸稉宥呭讲閻劍妞傛担璺ㄦ暏閿?
  async sendMessageMock(): Promise<string> {
    // 濡剝瀚欑純鎴犵捕瀵ゆ儼绻?
    await new Promise(resolve =>
      setTimeout(resolve, 1000 + Math.random() * 2000)
    );

    const responses = [
      'I understand your question. Let me provide a suggestion.',
      'Great question. Here is a practical answer you can try.',
      'Please share more context so I can give a more accurate response.',
      'Thanks for your message. I can help you with this.',
      'Your request is noted. I will provide a solution shortly.',
      'Based on your scenario, here is the recommended approach.',
      'This looks like a technical issue. Let me break it down clearly.',
      'I have routed this to the relevant flow and will keep you updated.',
    ];

    return (
      responses[Math.floor(Math.random() * responses.length)] ||
      '閹存垶顒滈崷銊︹偓婵娾偓鍐╁亶閻ㄥ嫰妫舵０?..'
    );
  }

  // 閼惧嘲褰囬懕濠傘亯閸樺棗褰堕敍鍫濐洤閺嬫粓娓剁憰浣烘畱鐠囨繐绱?
  async getChatHistory(): Promise<ChatMessage[]> {
    // 鏉╂瑩鍣烽崣顖欎簰鐎圭偟骞囨禒搴㈡殶閹诡喖绨遍幋鏍处鐎涙ü鑵戦懢宄板絿閼卞﹤銇夐崢鍡楀蕉
    // 閻╊喖澧犳潻鏂挎礀缁岀儤鏆熺紒?
    return [];
  }

  // 娣囨繂鐡ㄩ懕濠傘亯閸樺棗褰堕敍鍫濐洤閺嬫粓娓剁憰浣烘畱鐠囨繐绱?
  async saveChatHistory(
    sessionId: string,
    messages: ChatMessage[]
  ): Promise<void> {
    // 鏉╂瑩鍣烽崣顖欎簰鐎圭偟骞囨穱婵嗙摠閼卞﹤銇夐崢鍡楀蕉閸掔増鏆熼幑顔肩氨閹存牜绱︾€?
    console.log('Saving chat history:', { sessionId, messages });
  }
}

export const chatService = new ChatService();

// Export SessionManager for external use
export { SessionManager };
