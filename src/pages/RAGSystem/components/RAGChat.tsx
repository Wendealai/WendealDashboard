import React, { useState, useRef, useEffect } from 'react';
import { Input, Button, Card, Typography, Space, Spin } from 'antd';
import { SendOutlined, ClearOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useMessage } from '@/hooks/useMessage';
import ReactMarkdown from 'react-markdown';
import { ragApiService } from '../../../services/ragApi';
import type { RAGMessage } from '../../../services/ragApi';
import useChatHistory from '../hooks/useChatHistory';
import './RAGChat.css';

const { TextArea } = Input;
const { Text } = Typography;

// 使用RAG API中定义的Message接口
// Use Message interface defined in RAG API

/**
 * RAG对话组件
 * 提供与企业知识库的对话功能
 */
const RAGChat: React.FC = () => {
  const { t } = useTranslation();
  const message = useMessage();
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    currentMessages,
    currentSessionId,
    addMessage,
    clearCurrentConversation,
  } = useChatHistory();

  /**
   * 自动滚动到消息底部
   * Auto scroll to bottom of messages
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  /**
   * 处理清空当前对话
   * Handle clearing current conversation
   */
  const handleClearChat = () => {
    clearCurrentConversation();
    message.success(t('ragSystem.chat.clear'));
  };

  /**
   * 处理发送消息的逻辑
   * Handle message sending logic
   */
  const handleSendMessage = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage: RAGMessage = {
      id: Date.now().toString(),
      content: inputValue.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    // 添加用户消息到当前对话
    // Add user message to current conversation
    addMessage(userMessage);
    setInputValue('');
    setLoading(true);

    try {
      // 调用RAG API服务发送消息
      // Call RAG API service to send message
      const response = await ragApiService.sendMessage(
        inputValue.trim(),
        currentSessionId
      );

      // 创建助手回复消息
      // Create assistant reply message
      const assistantMessage: RAGMessage = {
        id: (Date.now() + 1).toString(),
        content: response.data?.response || response.message || '无响应内容',
        role: 'assistant',
        timestamp: new Date(),
        ...(response.data?.sources && { sources: response.data.sources }),
        ...(response.data?.confidence && {
          confidence: response.data.confidence,
        }),
      };

      // 添加助手消息到当前对话
      // Add assistant message to current conversation
      addMessage(assistantMessage);
    } catch (error) {
      console.error('Error sending message:', error);

      // 创建错误消息
      // Create error message
      const errorMessage: RAGMessage = {
        id: (Date.now() + 1).toString(),
        content: t('ragSystem.chat.error'),
        role: 'assistant',
        timestamp: new Date(),
      };

      addMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理键盘事件
   * Handle keyboard events
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (e.shiftKey) {
        // Shift+Enter: 换行，不阻止默认行为
        // Shift+Enter: New line, don't prevent default behavior
        return;
      } else {
        // Enter: 发送消息
        // Enter: Send message
        e.preventDefault();
        handleSendMessage();
      }
    }
  };

  /**
   * 渲染消息气泡
   * Render message bubble
   */
  const renderMessage = (message: RAGMessage) => {
    const isUser = message.role === 'user';

    return (
      <div
        key={message.id}
        className={`message-wrapper ${isUser ? 'user-message' : 'assistant-message'}`}
      >
        <div
          className={`message-bubble ${isUser ? 'user-bubble' : 'assistant-bubble'}`}
        >
          {message.role === 'assistant' ? (
            <ReactMarkdown>{message.content}</ReactMarkdown>
          ) : (
            <div style={{ color: '#000000' }}>{message.content}</div>
          )}
          <div
            style={{
              fontSize: '12px',
              opacity: 0.7,
              marginTop: '4px',
              textAlign: isUser ? 'right' : 'left',
            }}
          >
            {message.timestamp.toLocaleTimeString()}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className='rag-chat-container'>
      {/* 对话区域 */}
      <div
        className='chat-main'
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        {/* 对话头部 */}
        <div className='chat-header'>
          <div>
            <Typography.Title level={5} style={{ margin: 0 }}>
              {t('ragSystem.chat.assistant')}
            </Typography.Title>
            <Typography.Text type='secondary' style={{ fontSize: '12px' }}>
              {t('ragSystem.chat.currentSession')}
            </Typography.Text>
          </div>
          <Space>
            <Button
              type='text'
              icon={<ClearOutlined />}
              onClick={handleClearChat}
              disabled={currentMessages.length === 0}
            >
              {t('ragSystem.chat.clear')}
            </Button>
          </Space>
        </div>

        {/* 对话消息区域 */}
        <div className='chat-messages'>
          {currentMessages.length === 0 ? (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                flexDirection: 'column',
                padding: '40px 20px',
                textAlign: 'center',
              }}
            >
              <Typography.Title level={4} type='secondary'>
                {t('ragSystem.chat.welcome')}
              </Typography.Title>
            </div>
          ) : (
            <div className='messages-list'>
              {currentMessages.map(renderMessage)}
            </div>
          )}

          {loading && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-start',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  maxWidth: '70%',
                  padding: '12px 16px',
                  borderRadius: '18px',
                  backgroundColor: 'var(--color-bg-container)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Spin size='small' />
                <Typography.Text type='secondary'>
                  {t('ragSystem.chat.thinking')}
                </Typography.Text>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div
          className='chat-input'
          style={{
            padding: '4px 8px' /* 再次减少输入区域padding */,
            borderTop: '1px solid var(--border-color, #f0f0f0)',
            backgroundColor: 'var(--card-color)',
          }}
        >
          <Space.Compact style={{ width: '100%' }}>
            <TextArea
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('ragSystem.chat.placeholder')}
              autoSize={{ minRows: 1, maxRows: 4 }}
              disabled={loading}
              style={{ fontSize: '14px' }}
            />
            <Button
              type='default'
              icon={<SendOutlined />}
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || loading}
              style={{
                height: 'auto',
                backgroundColor:
                  !inputValue.trim() || loading
                    ? 'var(--card-color)'
                    : 'var(--color-white)',
                borderColor:
                  !inputValue.trim() || loading
                    ? 'var(--border-color)'
                    : 'var(--border-color)',
                color:
                  !inputValue.trim() || loading
                    ? 'var(--text-color)'
                    : 'var(--text-color)',
              }}
              size='large'
            >
              {t('ragSystem.chat.send')}
            </Button>
          </Space.Compact>
        </div>
      </div>
    </div>
  );
};

export default RAGChat;
