import React from 'react';
import { Layout } from 'antd';
import RAGToolbar from './components/RAGToolbar';
import RAGChat from './components/RAGChat';
import ChatSidebar from './components/ChatSidebar';
import { useChatHistory } from './hooks/useChatHistory';
import './styles.css';

const { Content } = Layout;

/**
 * RAG System主页面组件
 * 提供企业知识库对话功能，包含文件上传和知识库管理
 */
const RAGSystem: React.FC = () => {
  // 使用聊天历史钩子
  const {
    conversationItems,
    currentSessionId,
    createNewConversation,
    switchToConversation,
    deleteConversation,
  } = useChatHistory();

  return (
    <Layout className='rag-system-layout'>
      <Content className='rag-system-content'>
        <div className='rag-system-container'>
          {/* 工具栏区域 */}
          <div className='rag-toolbar-section'>
            <RAGToolbar />
          </div>

          {/* 主要内容区域 - 包含侧边栏和对话区域 */}
          <div className='rag-main-section'>
            {/* 对话历史侧边栏 */}
            <ChatSidebar
              conversations={conversationItems}
              currentSessionId={currentSessionId}
              onSelectConversation={switchToConversation}
              onDeleteConversation={deleteConversation}
              onNewConversation={createNewConversation}
            />

            {/* 对话区域 */}
            <div className='rag-chat-section'>
              <RAGChat />
            </div>
          </div>
        </div>
      </Content>
    </Layout>
  );
};

export default RAGSystem;
