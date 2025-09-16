/**
 * Information Dashboard main page component
 * Data display platform integrated with n8n workflow system
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Divider,
  Tag,
  Tooltip,
  Popover,
  Button,
} from 'antd';
import {
  DashboardOutlined,
  ApiOutlined,
  FilterOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
  RobotOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  RedditOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useMessage } from '@/hooks/useMessage';
import WorkflowSidebar from './components/WorkflowSidebar';
import WorkflowPanel from './components/WorkflowPanel';
import ResultPanel from './components/ResultPanel';
import SmartOpportunities from './components/SmartOpportunities';
import type {
  ParsedSubredditData,
  RedditWorkflowResponse,
} from '@/services/redditWebhookService';
import type { Workflow } from './types';
import {
  redditDataManager,
  redditWebhookService,
} from '@/services/redditWebhookService';

const { Title, Paragraph, Text } = Typography;

/**
 * Information Dashboard main page component
 * Provides unified information aggregation and display interface
 */
const InformationDashboard: React.FC = () => {
  const { t } = useTranslation();
  const message = useMessage();

  // 调试message实例
  console.log('InformationDashboard: message instance:', message);
  console.log(
    'InformationDashboard: message.success type:',
    typeof message?.success
  );
  console.log(
    'InformationDashboard: message.error type:',
    typeof message?.error
  );

  // Reddit data state - 使用全局数据管理器进行持久化
  const [redditData, setRedditData] = useState<ParsedSubredditData[]>(() => {
    console.log(
      'InformationDashboard: Initializing with persisted Reddit data'
    );
    const persistedData = redditDataManager.loadData();
    return persistedData || [];
  });

  // Currently selected workflow state
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
    null
  );

  // Reddit workflow states
  const [redditLoading, setRedditLoading] = useState(false);
  const [redditError, setRedditError] = useState<string | null>(null);
  const [redditWorkflowData, setRedditWorkflowData] =
    useState<RedditWorkflowResponse | null>(null);

  // 数据恢复和自动选择工作流逻辑
  useEffect(() => {
    console.log(
      'InformationDashboard: Component mounted, checking for persisted Reddit data'
    );

    if (redditData.length > 0) {
      console.log(
        'InformationDashboard: Found persisted Reddit data:',
        redditData.length,
        'items'
      );

      // 如果有持久化数据但没有选择工作流，自动选择Reddit工作流
      if (!selectedWorkflow) {
        console.log(
          'InformationDashboard: Auto-selecting Reddit workflow for persisted data'
        );
        setSelectedWorkflow({
          id: 'reddit-hot-posts',
          name: 'Reddit Hot Posts',
          description: 'Fetch hot posts from Reddit',
          nodeCount: 1,
          lastExecution: null,
          status: 'idle',
        });
      }
    } else {
      console.log('InformationDashboard: No persisted Reddit data found');
    }
  }, [redditData.length, selectedWorkflow]);

  /**
   * Handle Reddit data reception - 执行工作流时持久化新数据
   */
  const handleRedditDataReceived = useCallback(
    (data: ParsedSubredditData[]) => {
      console.log(
        'InformationDashboard: Received Reddit data, persisting to storage:',
        data.length,
        'items'
      );
      console.log('InformationDashboard: Reddit data details:', data);

      // 更新组件状态
      setRedditData(data);

      // 使用全局数据管理器保存数据，确保数据常驻
      const success = redditDataManager.saveData(data);
      if (success) {
        console.log('InformationDashboard: Reddit data persisted successfully');
      } else {
        console.error('InformationDashboard: Failed to persist Reddit data');
      }
    },
    []
  );

  /**
   * Handle Reddit workflow data reception
   */
  const handleRedditWorkflowDataReceived = useCallback(
    (data: RedditWorkflowResponse) => {
      console.log('InformationDashboard: Received Reddit workflow data:', data);
      setRedditWorkflowData(data);

      // 自动选择Reddit工作流来显示数据
      if (!selectedWorkflow || selectedWorkflow.id !== 'reddit-hot-posts') {
        setSelectedWorkflow({
          id: 'reddit-hot-posts',
          name: 'Reddit Hot Posts',
          description: 'Fetch hot posts from Reddit',
          nodeCount: 1,
          lastExecution: null,
          status: 'idle',
        });
      }
    },
    [selectedWorkflow]
  );

  /**
   * Handle workflow selection
   */
  const handleWorkflowSelect = useCallback((workflow: Workflow) => {
    console.log('InformationDashboard: Selected workflow:', workflow);
    setSelectedWorkflow(workflow);
  }, []);

  /**
   * Handle Reddit workflow start
   */
  const handleRedditWorkflowStart = useCallback(async () => {
    try {
      setRedditLoading(true);
      setRedditError(null);

      console.log('InformationDashboard: Starting Reddit workflow');
      const result = await redditWebhookService.triggerRedditWorkflow(
        ['technology', 'programming', 'javascript', 'reactjs'], // Default subreddits
        progress => {
          console.log('Reddit workflow progress:', progress);
        }
      );

      if (result.success && result.data) {
        console.log(
          'InformationDashboard: Reddit workflow completed successfully'
        );
        console.log(
          'InformationDashboard: About to call message.success, message object:',
          message
        );
        handleRedditDataReceived(result.data);
        message.success('Reddit workflow completed successfully!');
      } else {
        const errorMsg = result.error || 'Reddit workflow failed';
        setRedditError(errorMsg);
        console.log(
          'InformationDashboard: About to call message.error, message object:',
          message
        );
        message.error(errorMsg);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Reddit workflow failed';
      console.error('InformationDashboard: Reddit workflow error:', error);
      setRedditError(errorMessage);
      console.log(
        'InformationDashboard: About to call message.error in catch, message object:',
        message
      );
      message.error(errorMessage);
    } finally {
      setRedditLoading(false);
    }
  }, [handleRedditDataReceived]);

  return (
    <div className='information-dashboard'>
      {/* Page title */}
      <div className='page-header'>
        <Title level={2} style={{ marginBottom: 8 }}>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <DashboardOutlined style={{ marginRight: 12 }} />
            {t('informationDashboard.title')}
            <Popover
              content={
                <div style={{ maxWidth: '550px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <Text strong style={{ fontSize: '16px' }}>
                      Core Business Value
                    </Text>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <Text
                      type='secondary'
                      style={{ lineHeight: '1.6', fontSize: '14px' }}
                    >
                      Integrate multi-source data to provide intelligent
                      analysis, helping enterprises quickly discover market
                      opportunities, optimize business processes, and improve
                      decision-making efficiency.
                    </Text>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <Text strong style={{ fontSize: '14px' }}>
                      Key Features:
                    </Text>
                  </div>
                  <Space
                    direction='vertical'
                    size='small'
                    style={{ fontSize: '13px' }}
                  >
                    <div>• Real-time Business Insights</div>
                    <div>• Automated Process Optimization</div>
                    <div>• Data-Driven Decision Making</div>
                    <div>• AI-Enhanced Analytics</div>
                  </Space>
                  <div style={{ marginTop: '12px' }}>
                    <Text
                      type='secondary'
                      style={{ fontSize: '13px', lineHeight: '1.6' }}
                    >
                      Integrate multi-source data to provide intelligent
                      analysis, helping enterprises quickly discover market
                      opportunities, optimize business processes, and improve
                      decision-making efficiency.
                    </Text>
                  </div>
                </div>
              }
              trigger='hover'
              placement='bottomRight'
              mouseEnterDelay={0.5}
              overlayStyle={{ maxWidth: '600px' }}
            >
              <InfoCircleOutlined
                style={{
                  color: '#888888',
                  cursor: 'pointer',
                  marginLeft: '8px',
                  fontSize: '18px',
                }}
              />
            </Popover>
          </span>
        </Title>

        {/* Feature tags */}
        <Space wrap style={{ marginBottom: 16 }}>
          <Tag icon={<BarChartOutlined />}>Data Analysis</Tag>
          <Tag icon={<ThunderboltOutlined />}>Workflow Automation</Tag>
          <Tag icon={<RobotOutlined />}>AI Intelligence</Tag>
          <Tag icon={<FileTextOutlined />}>Document Processing</Tag>
        </Space>
      </div>

      <Divider />

      {/* Main content area - 上下布局 */}
      <Row gutter={[16, 16]}>
        {/* Workflow management panel - 作为底层，无包装框 */}
        <Col xs={24}>
          <div style={{ marginBottom: '16px' }}>
            <WorkflowSidebar
              onRedditDataReceived={handleRedditDataReceived}
              onRedditWorkflowDataReceived={handleRedditWorkflowDataReceived}
              onWorkflowSelect={handleWorkflowSelect}
            />
          </div>
        </Col>

        {/* Data display area - 占据剩余全部空间 */}
        <Col xs={24}>
          <Card
            title={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <Space>
                  <FilterOutlined />
                  {selectedWorkflow?.id === 'smart-opportunities'
                    ? 'Smart Opportunities'
                    : t('informationDashboard.title')}
                </Space>

                {/* Reddit workflow start button - 仅在未选中Smart Opportunities时显示 */}
                {selectedWorkflow?.id !== 'smart-opportunities' && (
                  <Tooltip title='Start Reddit Hot Posts Workflow'>
                    <Button
                      type='default'
                      size='small'
                      icon={<RedditOutlined />}
                      loading={redditLoading}
                      onClick={handleRedditWorkflowStart}
                      style={{
                        backgroundColor: '#f5f5f5',
                        borderColor: '#d9d9d9',
                        color: '#666',
                        marginLeft: 'auto',
                      }}
                    >
                      {!redditLoading && 'Start Reddit'}
                    </Button>
                  </Tooltip>
                )}
              </div>
            }
            className='data-display-card'
            style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}
          >
            {selectedWorkflow?.id === 'smart-opportunities' ? (
              <SmartOpportunities />
            ) : (
              <>
                <WorkflowPanel
                  onRedditDataReceived={handleRedditDataReceived}
                  onRedditWorkflowDataReceived={
                    handleRedditWorkflowDataReceived
                  }
                />
                <Divider />
                <ResultPanel
                  redditData={redditData}
                  redditWorkflowData={redditWorkflowData}
                  selectedWorkflow={selectedWorkflow}
                />
              </>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default InformationDashboard;
