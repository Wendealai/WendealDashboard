/**
 * Social Media Dashboard Page
 * 社交媒体仪表板页面 - 完整复制Information Dashboard结构
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Card, Row, Col, Typography, Space, Divider, Breadcrumb } from 'antd';
import {
  DashboardOutlined,
  ApiOutlined,
  FilterOutlined,
  SelectOutlined,
  HomeOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import WorkflowSidebar from './components/WorkflowSidebar';
import WorkflowPanel from './components/WorkflowPanel';
import ResultPanel from './components/ResultPanel';
import RedNoteContentGenerator from './components/RedNoteContentGenerator';
import InternationalSocialMediaGenerator from './components/InternationalSocialMediaGenerator';
import TKViralExtract from './components/TKViralExtract';
import ImageGenerationPanel from './components/ImageGenerationPanel';
import VideoGenerationPanel from './components/VideoGenerationPanel';
import type { ParsedSubredditData } from '@/services/redditWebhookService';
import { redditDataManager } from '@/services/redditWebhookService';
import type { Workflow } from './types';
import './components/styles.css';

const { Title, Paragraph } = Typography;

/**
 * Social Media Dashboard main page component
 * Provides unified social media information aggregation and display interface
 * Complete copy of Information Dashboard structure
 */
const SocialMedia: React.FC = () => {
  const { t } = useTranslation();

  const [redditData, setRedditData] = useState<ParsedSubredditData[]>([]);

  // Currently selected workflow state
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
    null
  );

  // 在组件挂载时从localStorage恢复Reddit数据
  useEffect(() => {
    console.log(
      'SocialMedia: Component mounted, checking for persisted Reddit data'
    );

    // 检查是否有持久化的数据
    if (redditDataManager.hasData()) {
      console.log('SocialMedia: Found persisted Reddit data, loading...');
      const persistedData = redditDataManager.loadData();

      if (persistedData && persistedData.length > 0) {
        console.log(
          'SocialMedia: Successfully loaded persisted data:',
          persistedData.length,
          'subreddits'
        );
        setRedditData(persistedData);

        // 获取数据统计信息
        const stats = redditDataManager.getDataStats();
        console.log('SocialMedia: Persisted data stats:', stats);
      } else {
        console.log('SocialMedia: Persisted data is empty or invalid');
      }
    } else {
      console.log('SocialMedia: No persisted Reddit data found');
    }
  }, []); // 只在组件挂载时执行一次

  /**
   * Handle Reddit data reception
   */
  const handleRedditDataReceived = useCallback(
    (data: ParsedSubredditData[]) => {
      console.log('SocialMedia: Received Reddit data:', data.length, 'items');
      setRedditData(data);

      // 保存新数据到localStorage
      if (data && data.length > 0) {
        console.log('SocialMedia: Saving new Reddit data to localStorage');
        const saveSuccess = redditDataManager.saveData(data);

        if (saveSuccess) {
          console.log(
            'SocialMedia: Successfully saved Reddit data to localStorage'
          );

          // 获取并显示数据统计信息
          const stats = redditDataManager.getDataStats();
          console.log('SocialMedia: New data stats:', stats);
        } else {
          console.error(
            'SocialMedia: Failed to save Reddit data to localStorage'
          );
        }
      }
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
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        style={{ marginBottom: '16px' }}
        items={[
          {
            href: '/',
            title: <HomeOutlined />,
          },
          {
            href: '/social-media',
            title: (
              <>
                <TeamOutlined />
                <span>Social Media</span>
              </>
            ),
          },
          {
            title: selectedWorkflow?.name || 'Dashboard',
          },
        ]}
      />

      {/* Page title */}
      <div className='page-header'>
        <Title level={2} style={{ fontSize: '22px' }}>
          <DashboardOutlined /> {t('navigation.socialMedia')}
        </Title>
        <Paragraph style={{ fontSize: '16px' }}>
          {t(
            'socialMedia.subtitle',
            'Social Media Content Management and Analysis Platform'
          )}
        </Paragraph>
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
                <span style={{ fontSize: '16px' }}>
                  {t('socialMedia.workflowManagement', 'Workflow List')}
                </span>
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
                <span style={{ fontSize: '16px' }}>
                  {selectedWorkflow?.id === 'rednote-content-generator'
                    ? 'Rednote Content Generator'
                    : selectedWorkflow?.id ===
                        'international-social-media-generator'
                      ? 'International Social Media Generator'
                      : selectedWorkflow?.id === 'video-generation'
                        ? 'Video Generation'
                        : t('socialMedia.title', 'Social Media Dashboard')}
                </span>
              </Space>
            }
            className='data-display-card'
            style={{ minHeight: '600px' }}
          >
            {selectedWorkflow?.id === 'tk-viral-extract' ? (
              <TKViralExtract />
            ) : selectedWorkflow?.id === 'rednote-content-generator' ? (
              <RedNoteContentGenerator />
            ) : selectedWorkflow?.id ===
              'international-social-media-generator' ? (
              <InternationalSocialMediaGenerator />
            ) : selectedWorkflow?.id === 'image-generation' ? (
              <ImageGenerationPanel
                workflow={selectedWorkflow as any}
                loading={false}
              />
            ) : selectedWorkflow?.id === 'video-generation' ? (
              <VideoGenerationPanel
                workflow={selectedWorkflow as any}
                loading={false}
              />
            ) : selectedWorkflow ? (
              <>
                <WorkflowPanel workflow={selectedWorkflow} loading={false} />
                <Divider />
                <ResultPanel redditData={redditData} loading={false} />
              </>
            ) : (
              <div className='workflow-selection-prompt'>
                <Space direction='vertical' align='center' size={16}>
                  <SelectOutlined
                    style={{ fontSize: '48px', color: '#d9d9d9' }}
                  />
                  <Typography.Text
                    type='secondary'
                    style={{ fontSize: '14px', textAlign: 'center' }}
                  >
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
