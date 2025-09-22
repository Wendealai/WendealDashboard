import React, { useState, useRef, useEffect } from 'react';
import {
  MessageOutlined,
  CloseOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { Button, Input, Card, Avatar, Spin, Badge } from 'antd';
import { useTranslation } from 'react-i18next';
import { chatService, SessionManager } from '@/services/chatService';
import './GlobalChat.css';

interface Message {
  id: string;
  text: string;
  role: 'user' | 'ai';
  timestamp: Date;
}

const GlobalChat: React.FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: t(
        'dashboard.chat.welcome',
        'Hello! I am your AI assistant, how can I help you today?'
      ),
      role: 'ai',
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue.trim(),
      role: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // 获取sessionId用于跟踪对话
      const sessionId = SessionManager.getInstance().getSessionId();

      const response = await chatService.sendMessage(
        userMessage.text,
        'user', // userId
        sessionId // sessionId
      );

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        role: 'ai',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: t(
          'dashboard.chat.messages.error',
          'Sorry, an error occurred while processing your request. Please try again later.'
        ),
        role: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  const clearMessages = () => {
    setMessages([
      {
        id: Date.now().toString(),
        text: t(
          'dashboard.chat.welcome',
          'Hello! I am your AI assistant, how can I help you today?'
        ),
        role: 'ai',
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <>
      {/* 聊天按钮 */}
      <div className={`global-chat-button ${isOpen ? 'hidden' : ''}`}>
        <Badge count={unreadCount} size='small'>
          <Button
            type='primary'
            shape='circle'
            size='large'
            icon={<MessageOutlined />}
            onClick={toggleChat}
            className='chat-toggle-button'
          />
        </Badge>
      </div>

      {/* 聊天窗口 */}
      {isOpen && (
        <div className='global-chat-container'>
          <Card
            className='global-chat-card'
            title={
              <div className='chat-header'>
                <span>{t('dashboard.chat.title', 'Wendeal Assistant')}</span>
                <div className='chat-actions'>
                  <Button
                    type='text'
                    size='small'
                    icon={<CloseOutlined />}
                    onClick={toggleChat}
                  />
                </div>
              </div>
            }
            styles={{
              body: {
                padding: 0,
                height: '400px',
                display: 'flex',
                flexDirection: 'column',
              },
            }}
            size='small'
          >
            {/* 消息区域 */}
            <div className='chat-messages'>
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`chat-message ${message.role}`}
                >
                  <div className='message-avatar'>
                    <Avatar
                      size='small'
                      style={{
                        backgroundColor:
                          message.role === 'ai' ? '#1890ff' : '#52c41a',
                      }}
                    >
                      {message.role === 'ai' ? '🤖' : '👤'}
                    </Avatar>
                  </div>
                  <div className='message-content'>
                    <div className='message-text'>{message.text}</div>
                    <div className='message-time'>
                      {message.timestamp.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className='chat-message ai'>
                  <div className='message-avatar'>
                    <Avatar size='small' style={{ backgroundColor: '#1890ff' }}>
                      🤖
                    </Avatar>
                  </div>
                  <div className='message-content'>
                    <Spin size='small' />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 */}
            <div className='chat-input-area'>
              <div className='chat-input-container'>
                <Input.TextArea
                  ref={inputRef}
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t(
                    'dashboard.chat.placeholder',
                    'Type your message...'
                  )}
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  disabled={isLoading}
                />
                <Button
                  type='primary'
                  icon={<SendOutlined />}
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  loading={isLoading}
                />
              </div>
              <div className='chat-footer'>
                <Button
                  type='text'
                  size='small'
                  onClick={clearMessages}
                  disabled={messages.length <= 1}
                >
                  {t('dashboard.chat.clear', 'Clear Chat')}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
};

export default GlobalChat;
