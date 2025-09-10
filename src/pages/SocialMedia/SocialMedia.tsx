/**
 * Social Media Dashboard Page
 * 社交媒体仪表板页面 - 完整复制Information Dashboard结构
 */

import React, { useState, useCallback } from 'react';
import { Card, Row, Col, Typography, Space, Divider } from 'antd';
import {
  DashboardOutlined,
  ApiOutlined,
  FilterOutlined,
  SelectOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import WorkflowSidebar from './components/WorkflowSidebar';
import WorkflowPanel from './components/WorkflowPanel';
import ResultPanel from './components/ResultPanel';
import RedNoteContentGenerator from './components/RedNoteContentGenerator';
import TKViralExtract from './components/TKViralExtract';
import type { ParsedSubredditData, RedditWorkflowResponse } from '@/services/redditWebhookService';
import type { Workflow, ViralContentRecord } from './types';
import './components/styles.css';

const { Title, Paragraph, Text } = Typography;

/**
 * Social Media Dashboard main page component
 * Provides unified social media information aggregation and display interface
 * Complete copy of Information Dashboard structure
 */
const SocialMedia: React.FC = () => {
  const { t } = useTranslation();

  const [redditData, setRedditData] = useState<ParsedSubredditData[]>([]);
  const [redditWorkflowData, setRedditWorkflowData] = useState<RedditWorkflowResponse | null>(null);
  const [viralContentData, setViralContentData] = useState<ViralContentRecord[]>([]);

  // Currently selected workflow state
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
    null
  );



  /**
   * Handle Reddit data reception
   */
  const handleRedditDataReceived = useCallback((data: ParsedSubredditData[]) => {
    console.log('SocialMedia: Received Reddit data:', data.length, 'items');
    setRedditData(data);
  }, []);

  /**
   * Handle Reddit workflow data reception
   */
  const handleRedditWorkflowDataReceived = useCallback(
    (data: RedditWorkflowResponse) => {
      console.log('SocialMedia: Received Reddit workflow data:', data);
      setRedditWorkflowData(data);
    },
    []
  );

  /**
   * Handle TK Viral Extract data reception
   */
  const handleViralContentDataReceived = useCallback(
    (data: ViralContentRecord[]) => {
      console.log('SocialMedia: Received viral content data:', data.length, 'items');
      setViralContentData(data);
    },
    []
  );

  /**
   * Handle workflow selection
   */
  const handleWorkflowSelect = useCallback((workflow: Workflow) => {
    console.log('SocialMedia: Selected workflow:', workflow);
    setSelectedWorkflow(workflow);
  }, []);

  return (
    <div className='social-media-dashboard'>
      {/* Page title */}
      <div className='page-header'>
        <Title level={2}>
          <DashboardOutlined /> {t('navigation.socialMedia')}
        </Title>
        <Paragraph>{t('socialMedia.subtitle', 'Social Media Content Management and Analysis Platform')}</Paragraph>
      </div>

      <Divider />

      {/* Main content area - 上下布局 */}
      <Row gutter={[16, 16]}>
        {/* Workflow management panel - 减少高度，只占一行 */}
        <Col xs={24}>
          <Card
            title={
              <Space>
                <ApiOutlined />
                {t('socialMedia.workflowManagement', 'Workflow List')}
              </Space>
            }
            className='workflow-panel-card'
            style={{ marginBottom: 0 }}
          >
            <WorkflowSidebar
              onRedditDataReceived={handleRedditDataReceived}
              onWorkflowSelect={handleWorkflowSelect}
            />
          </Card>
        </Col>

        {/* Data display area - 占据剩余全部空间 */}
        <Col xs={24}>
          <Card
            title={
              <Space>
                <FilterOutlined />
                {selectedWorkflow?.id === 'rednote-content-generator'
                  ? 'Rednote Content Generator'
                  : t('socialMedia.title', 'Social Media Dashboard')}
              </Space>
            }
            className='data-display-card'
            style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}
          >
            {selectedWorkflow?.id === 'tk-viral-extract' ? (
              <TKViralExtract
                onParametersChange={(params) => console.log('TK Viral Extract parameters:', params)}
                onDataLoaded={handleViralContentDataReceived}
                onError={(error) => console.error('TK Viral Extract error:', error)}
              />
            ) : selectedWorkflow?.id === 'rednote-content-generator' ? (
              <RedNoteContentGenerator />
            ) : selectedWorkflow ? (
              <>
                <WorkflowPanel
                  workflow={selectedWorkflow}
                  loading={false}
                  onDataReceived={handleRedditDataReceived}
                />
                <Divider />
                <ResultPanel
                  redditData={redditData}
                  loading={false}
                />
              </>
            ) : (
              <div className="workflow-selection-prompt">
                <Space direction="vertical" align="center" size={16}>
                  <SelectOutlined style={{ fontSize: '48px', color: '#d9d9d9' }} />
                  <Typography.Text type="secondary" style={{ fontSize: '16px', textAlign: 'center' }}>
                    Please select a workflow to execute
                  </Typography.Text>
                </Space>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default SocialMedia;
