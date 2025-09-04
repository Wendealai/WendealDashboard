/**
 * Social Media Dashboard Page
 * 社交媒体仪表板页面 - 与Information Dashboard结构保持一致
 */

import React, { useState, useEffect } from 'react';
import { Layout, Typography, Card, Row, Col, Spin, Alert } from 'antd';
import { useTranslation } from 'react-i18next';
import WorkflowSidebar from '../InformationDashboard/components/WorkflowSidebar';
import WorkflowPanel from '../InformationDashboard/components/WorkflowPanel';
import ResultPanel from '../InformationDashboard/components/ResultPanel';
import RedNoteContentGenerator from './components/RedNoteContentGenerator';
import type { WorkflowInfo, RedNoteContentResponse } from './types';

const { Content } = Layout;
const { Title } = Typography;

/**
 * 社交媒体仪表板组件
 * 提供与Information Dashboard相同的结构：左侧工作流选择，右侧结果展示
 */
const SocialMedia: React.FC = () => {
  const { t } = useTranslation();
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowInfo | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redditData, setRedditData] = useState<any[]>([]);
  const [redNoteResponses, setRedNoteResponses] = useState<
    RedNoteContentResponse[]
  >([]);

  /**
   * 处理工作流选择
   */
  const handleWorkflowSelect = (workflow: WorkflowInfo) => {
    setSelectedWorkflow(workflow);
    setError(null);
  };

  /**
   * 处理Reddit数据接收
   */
  const handleRedditDataReceived = (data: any[]) => {
    setRedditData(data);
  };

  /**
   * 处理小红书文案生成结果
   */
  const handleRedNoteContentGenerated = (response: RedNoteContentResponse) => {
    setRedNoteResponses(prev => [response, ...prev]);
  };

  /**
   * 渲染主要内容区域
   */
  const renderMainContent = () => {
    if (loading) {
      return (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size='large' />
        </div>
      );
    }

    if (error) {
      return (
        <Alert
          message={t('common.error')}
          description={error}
          type='error'
          showIcon
          style={{ margin: '20px' }}
        />
      );
    }

    if (!selectedWorkflow) {
      return (
        <div style={{ textAlign: 'center', padding: '50px', color: '#999' }}>
          {t('workflow.selectWorkflowPrompt')}
        </div>
      );
    }

    // 根据工作流ID渲染不同的面板
    if (selectedWorkflow.id === 'rednote-content-generator') {
      return (
        <RedNoteContentGenerator
          onContentGenerated={handleRedNoteContentGenerated}
          className='rednote-generator-panel'
        />
      );
    }

    // 根据工作流类型渲染不同的面板
    if (selectedWorkflow.type === 'webhook') {
      return (
        <ResultPanel
          workflowId={selectedWorkflow.id}
          data={redditData}
          onDataReceived={handleRedditDataReceived}
        />
      );
    }

    return (
      <WorkflowPanel
        workflow={selectedWorkflow}
        onDataReceived={handleRedditDataReceived}
      />
    );
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content style={{ padding: '24px' }}>
        {/* 页面标题 */}
        <div style={{ marginBottom: '24px' }}>
          <Title level={2} style={{ margin: 0 }}>
            {t('navigation.socialMedia')}
          </Title>
        </div>

        <Row gutter={[24, 24]} style={{ height: 'calc(100vh - 140px)' }}>
          {/* 左侧工作流管理面板 */}
          <Col xs={24} lg={8}>
            <Card
              title={t('workflow.management')}
              style={{ height: '100%' }}
              bodyStyle={{
                padding: 0,
                height: 'calc(100% - 57px)',
                overflow: 'auto',
              }}
            >
              <WorkflowSidebar
                onWorkflowSelect={handleWorkflowSelect}
                selectedWorkflow={selectedWorkflow}
              />
            </Card>
          </Col>

          {/* 右侧数据展示区域 */}
          <Col xs={24} lg={16}>
            <Card
              title={
                selectedWorkflow
                  ? `${t('workflow.results')} - ${selectedWorkflow.name}`
                  : t('workflow.results')
              }
              style={{ height: '100%' }}
              bodyStyle={{
                padding: '16px',
                height: 'calc(100% - 57px)',
                overflow: 'auto',
              }}
            >
              {renderMainContent()}
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default SocialMedia;
