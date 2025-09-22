import React from 'react';
import {
  List,
  Card,
  Button,
  Typography,
  Space,
  Tooltip,
  Popconfirm,
} from 'antd';
import { DeleteOutlined, MessageOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

/**
 * 对话历史项接口
 * Interface for conversation history item
 */
export interface ConversationItem {
  id: string;
  sessionId: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
}

/**
 * 对话侧边栏组件属性
 * Props for ChatSidebar component
 */
interface ChatSidebarProps {
  conversations: ConversationItem[];
  currentSessionId: string;
  onSelectConversation: (sessionId: string) => void;
  onDeleteConversation: (sessionId: string) => void;
  onNewConversation: () => void;
}

/**
 * 对话侧边栏组件
 * 显示历史对话列表，支持切换和删除对话
 * Chat sidebar component for displaying conversation history
 */
const ChatSidebar: React.FC<ChatSidebarProps> = ({
  conversations = [],
  currentSessionId,
  onSelectConversation,
  onDeleteConversation,
  onNewConversation,
}) => {
  const { t } = useTranslation();

  // 调试日志：检查ChatSidebar接收到的数据
  console.log('ChatSidebar received conversations:', conversations);
  console.log('ChatSidebar conversations length:', conversations.length);
  console.log('ChatSidebar currentSessionId:', currentSessionId);

  /**
   * 渲染对话卡片
   * Render conversation card
   */
  const renderConversationCard = (conversation: ConversationItem) => {
    const isActive = conversation.sessionId === currentSessionId;

    return (
      <Card
        key={conversation.sessionId}
        size='small'
        className={`conversation-card ${isActive ? 'active' : ''}`}
        style={{
          marginBottom: 8,
          cursor: 'pointer',
          border: isActive
            ? '2px solid var(--color-primary)'
            : '1px solid var(--border-color)',
          backgroundColor: isActive
            ? 'var(--color-success-bg, #f6ffed)'
            : 'var(--card-color)',
          transition: 'all 0.3s ease',
        }}
        onClick={() => onSelectConversation(conversation.sessionId)}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          {/* 消息图标 */}
          <MessageOutlined
            style={{
              color: isActive
                ? 'var(--color-primary)'
                : 'var(--text-color-secondary)',
              fontSize: '16px',
              marginTop: '2px',
              flexShrink: 0,
            }}
          />

          {/* 主要内容区域 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* 标题行 - 包含标题和删除按钮 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '4px',
              }}
            >
              <Tooltip title={conversation.title}>
                <Text
                  strong={isActive}
                  style={{
                    fontSize: '14px',
                    color: isActive ? '#1890ff' : '#000000',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flex: 1,
                    marginRight: '8px',
                  }}
                >
                  {conversation.title}
                </Text>
              </Tooltip>

              {/* 删除按钮 */}
              <Popconfirm
                title={t('ragSystem.sidebar.deleteConfirm')}
                description={t('ragSystem.sidebar.deleteDescription')}
                onConfirm={e => {
                  e?.stopPropagation();
                  onDeleteConversation(conversation.sessionId);
                }}
                okText={t('common.yes')}
                cancelText={t('common.no')}
              >
                <Button
                  type='text'
                  size='small'
                  icon={<DeleteOutlined />}
                  onClick={e => e.stopPropagation()}
                  style={{
                    color: 'var(--color-error)',
                    padding: '2px 4px',
                    height: 'auto',
                    minWidth: 'auto',
                    flexShrink: 0,
                  }}
                />
              </Popconfirm>
            </div>

            {/* 最后消息内容 */}
            <Tooltip title={conversation.lastMessage}>
              <Text
                type='secondary'
                style={{
                  fontSize: '12px',
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginBottom: '4px',
                  color: '#666666',
                }}
              >
                {conversation.lastMessage}
              </Text>
            </Tooltip>

            {/* 底部信息行 */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Text
                type='secondary'
                style={{ fontSize: '11px', color: '#999999' }}
              >
                {conversation.timestamp.toLocaleDateString()}
              </Text>
              <Text
                type='secondary'
                style={{ fontSize: '11px', color: '#999999' }}
              >
                {conversation.messageCount} {t('common.messages')}
              </Text>
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className='chat-sidebar'>
      {/* 侧边栏头部 */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid var(--border-color)',
          backgroundColor: 'var(--card-color)',
        }}
      >
        <Space direction='vertical' style={{ width: '100%' }}>
          <Text strong style={{ fontSize: '16px', color: '#ffffff' }}>
            {t('ragSystem.sidebar.title')}
          </Text>
          <Button
            type='primary'
            block
            onClick={onNewConversation}
            style={{ marginTop: 8 }}
          >
            {t('ragSystem.sidebar.newConversation')}
          </Button>
        </Space>
      </div>

      {/* 对话列表 */}
      <div
        style={{
          flex: 1,
          padding: '16px',
          overflowY: 'auto',
        }}
      >
        {conversations.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: 'var(--text-color-secondary)',
            }}
          >
            <MessageOutlined
              style={{ fontSize: '32px', marginBottom: '16px' }}
            />
            <div style={{ color: '#666666' }}>
              {t('ragSystem.sidebar.noConversations')}
            </div>
          </div>
        ) : (
          <List
            dataSource={conversations}
            renderItem={renderConversationCard}
            style={{ backgroundColor: 'transparent' }}
          />
        )}
      </div>
    </div>
  );
};

export default ChatSidebar;
