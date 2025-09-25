import { useState, useCallback, useEffect } from 'react';
import type { RAGMessage } from '../../../services/ragApi';
import type { ConversationItem } from '../components/ChatSidebar';

/**
 * 对话历史管理Hook
 * Hook for managing chat history and multiple conversations
 */
export const useChatHistory = () => {
  // 所有对话的存储
  const [conversations, setConversations] = useState<Map<string, RAGMessage[]>>(
    new Map()
  );
  // 对话元数据
  const [conversationItems, setConversationItems] = useState<
    ConversationItem[]
  >([]);
  // 当前活跃的会话ID
  const [currentSessionId, setCurrentSessionId] = useState<string>('');

  /**
   * 生成对话标题
   * Generate conversation title based on first message
   */
  const generateConversationTitle = (messages: RAGMessage[]): string => {
    if (messages.length === 0) return 'New Conversation';

    const firstUserMessage = messages.find(msg => msg.role === 'user');
    if (!firstUserMessage) return 'New Conversation';

    // 截取前30个字符作为标题
    if (!firstUserMessage.content) return 'New Conversation';

    const title = firstUserMessage.content.slice(0, 30);
    return title.length < firstUserMessage.content.length
      ? `${title}...`
      : title;
  };

  /**
   * 更新对话元数据
   * Update conversation metadata
   */
  const updateConversationItems = useCallback(() => {
    console.log(
      'Updating conversation items, conversations:',
      Object.fromEntries(conversations)
    );
    const items: ConversationItem[] = [];

    conversations.forEach((messages, sessionId) => {
      // 修改逻辑：即使是空对话也要显示
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        const title = generateConversationTitle(messages);

        items.push({
          id: sessionId,
          sessionId,
          title,
          lastMessage: lastMessage?.content
            ? lastMessage.content.slice(0, 50) +
              (lastMessage.content.length > 50 ? '...' : '')
            : 'No content',
          timestamp: lastMessage?.timestamp || new Date(),
          messageCount: messages.length,
        });
      } else {
        // 为空对话创建默认项
        items.push({
          id: sessionId,
          sessionId,
          title: 'New Conversation',
          lastMessage: 'No messages yet',
          timestamp: new Date(), // 使用当前时间作为创建时间
          messageCount: 0,
        });
      }
    });

    // 按时间戳降序排序
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    console.log('Generated conversation items:', items);
    setConversationItems(items);
  }, [conversations]);

  /**
   * 获取当前会话的消息
   * Get messages for current session
   */
  const getCurrentMessages = useCallback((): RAGMessage[] => {
    return conversations.get(currentSessionId) || [];
  }, [conversations, currentSessionId]);

  /**
   * 添加消息到当前会话
   * Add message to current session
   */
  const addMessage = useCallback(
    (message: RAGMessage) => {
      console.log('Adding message to session:', currentSessionId, message);
      setConversations(prev => {
        const newConversations = new Map(prev);
        const currentMessages = newConversations.get(currentSessionId) || [];
        const updatedMessages = [...currentMessages, message];
        newConversations.set(currentSessionId, updatedMessages);
        console.log(
          'Updated conversations:',
          Object.fromEntries(newConversations)
        );
        return newConversations;
      });
    },
    [currentSessionId]
  );

  /**
   * 批量添加消息到当前会话
   * Add multiple messages to current session
   */
  const addMessages = useCallback(
    (messages: RAGMessage[]) => {
      setConversations(prev => {
        const newConversations = new Map(prev);
        const currentMessages = newConversations.get(currentSessionId) || [];
        newConversations.set(currentSessionId, [
          ...currentMessages,
          ...messages,
        ]);
        return newConversations;
      });
    },
    [currentSessionId]
  );

  /**
   * 设置当前会话的所有消息
   * Set all messages for current session
   */
  const setCurrentMessages = useCallback(
    (messages: RAGMessage[]) => {
      setConversations(prev => {
        const newConversations = new Map(prev);
        newConversations.set(currentSessionId, messages);
        return newConversations;
      });
    },
    [currentSessionId]
  );

  /**
   * 创建新对话
   * Create new conversation
   */
  const createNewConversation = useCallback(() => {
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setCurrentSessionId(newSessionId);
    // 不需要立即创建空对话，等有消息时再创建
    return newSessionId;
  }, []);

  /**
   * 切换到指定对话
   * Switch to specific conversation
   */
  const switchToConversation = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, []);

  /**
   * 删除对话
   * Delete conversation
   */
  const deleteConversation = useCallback(
    (sessionId: string) => {
      setConversations(prev => {
        const newConversations = new Map(prev);
        newConversations.delete(sessionId);
        return newConversations;
      });

      // 如果删除的是当前对话，切换到最新的对话或创建新对话
      if (sessionId === currentSessionId) {
        const remainingConversations = Array.from(conversations.keys()).filter(
          id => id !== sessionId
        );
        if (remainingConversations.length > 0 && remainingConversations[0]) {
          setCurrentSessionId(remainingConversations[0]);
        } else {
          createNewConversation();
        }
      }
    },
    [currentSessionId, conversations, createNewConversation]
  );

  /**
   * 清空当前对话
   * Clear current conversation
   */
  const clearCurrentConversation = useCallback(() => {
    setConversations(prev => {
      const newConversations = new Map(prev);
      newConversations.set(currentSessionId, []);
      return newConversations;
    });
  }, [currentSessionId]);

  /**
   * 从本地存储加载对话历史
   * Load conversation history from localStorage
   */
  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem('rag-chat-history');
      console.log('Loading from storage, raw data:', stored);
      if (stored) {
        const data = JSON.parse(stored);
        console.log('Parsed storage data:', data);
        const conversationsMap = new Map();

        // 恢复消息的时间戳
        Object.entries(data.conversations || {}).forEach(
          ([sessionId, messages]) => {
            if (Array.isArray(messages)) {
              const restoredMessages = messages.map(msg => ({
                ...msg,
                timestamp: new Date(msg.timestamp),
              }));
              conversationsMap.set(sessionId, restoredMessages);
            }
          }
        );

        console.log(
          'Loaded conversations map:',
          Object.fromEntries(conversationsMap)
        );
        setConversations(conversationsMap);

        // 只有在没有当前会话ID时才设置新的
        if (data.currentSessionId && !currentSessionId) {
          console.log('Loaded current session ID:', data.currentSessionId);
          setCurrentSessionId(data.currentSessionId);
        } else if (!currentSessionId) {
          console.log('No current session ID found, creating new session');
          // 如果没有当前会话ID，创建一个新的
          const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          setCurrentSessionId(newSessionId);
        }
      } else if (!currentSessionId) {
        console.log('No stored data found, creating new session');
        // 如果没有存储数据且没有当前会话ID，创建一个新的会话ID
        const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setCurrentSessionId(newSessionId);
      }
    } catch (error) {
      console.error('Failed to load chat history from storage:', error);
      // 出错时且没有当前会话ID时才创建新的
      if (!currentSessionId) {
        const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setCurrentSessionId(newSessionId);
      }
    }
  };

  /**
   * 保存对话历史到本地存储
   * Save conversation history to localStorage
   */
  const saveToStorage = useCallback(() => {
    try {
      const data = {
        conversations: Object.fromEntries(conversations),
        currentSessionId,
      };
      console.log('Saving to storage:', data);
      localStorage.setItem('rag-chat-history', JSON.stringify(data));
      console.log('Saved successfully');
    } catch (error) {
      console.error('Failed to save chat history to storage:', error);
    }
  }, [conversations, currentSessionId]);

  // 监听对话变化，更新元数据
  useEffect(() => {
    updateConversationItems();
  }, [conversations, updateConversationItems]);

  // 监听对话变化，自动保存到本地存储（但不在初始化时保存）
  const [isInitialized, setIsInitialized] = useState(false);
  useEffect(() => {
    if (isInitialized) {
      saveToStorage();
    }
  }, [saveToStorage, isInitialized]);

  // 组件挂载时加载历史记录
  useEffect(() => {
    loadFromStorage();
    // 延迟设置初始化标志，确保数据加载完成
    setTimeout(() => setIsInitialized(true), 100);
  }, []); // 只在组件挂载时执行一次

  // 当conversations更新后，立即更新conversationItems
  useEffect(() => {
    if (conversations.size > 0) {
      updateConversationItems();
    }
  }, [conversations, updateConversationItems]);

  return {
    // 状态
    conversations: conversationItems,
    conversationItems, // 添加这个属性以保持向后兼容
    currentSessionId,
    currentMessages: getCurrentMessages(),

    // 操作方法
    addMessage,
    addMessages,
    setCurrentMessages,
    createNewConversation,
    switchToConversation,
    deleteConversation,
    clearCurrentConversation,

    // 存储操作
    loadFromStorage,
    saveToStorage,
  };
};

export default useChatHistory;
