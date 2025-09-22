import React, { useRef, useEffect } from 'react';
import { DeepChat } from 'deep-chat-react';

interface ChatWidgetProps {
  className?: string;
  style?: React.CSSProperties;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ className, style }) => {
  const chatRef = useRef<any>(null);

  // n8n webhook配置
  const n8nConfig = {
    url:
      process.env.REACT_APP_N8N_WEBHOOK_URL ||
      'https://your-n8n-instance.com/webhook/chat',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.REACT_APP_N8N_API_KEY || ''}`,
    },
  };

  const chatConfig = {
    connect: {
      url: n8nConfig.url,
      method: 'POST',
      headers: n8nConfig.headers,
    },
    style: {
      width: '100%',
      height: '500px',
      borderRadius: '12px',
      border: '1px solid #e1e5e9',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    },
    introMessage: {
      text: '你好！我是你的AI助手，有什么可以帮助你的吗？',
    },
    placeholder: '输入你的问题...',
  };

  useEffect(() => {
    // 组件挂载时的初始化逻辑
    console.log('Chat widget initialized');
  }, []);

  return (
    <div className={`chat-widget ${className || ''}`} style={style}>
      <DeepChat ref={chatRef} {...chatConfig} />
    </div>
  );
};

export default ChatWidget;
