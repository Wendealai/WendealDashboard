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
import type { WorkflowInfo } from './types';
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

  // 监听message实例的变化
  useEffect(() => {
    console.log('InformationDashboard: Message instance changed:', {
      hasMessage: !!message,
      hasSuccess: typeof message?.success === 'function',
      hasError: typeof message?.error === 'function',
    });

    // 测试message实例是否工作
    if (message && typeof message.success === 'function') {
      console.log(
        'InformationDashboard: Message instance is working, testing...'
      );
      // 延迟测试以确保DOM已渲染
      setTimeout(() => {
        try {
          message.success('Message API test successful!');
          console.log('InformationDashboard: Message API test passed');
        } catch (error) {
          console.error(
            'InformationDashboard: Message API test failed:',
            error
          );
        }
      }, 1000);
    }
  }, [message]);

  // Reddit data state - 使用全局数据管理器进行持久化
  const [redditData, setRedditData] = useState<ParsedSubredditData[]>(() => {
    console.log(
      'InformationDashboard: Initializing with persisted Reddit data'
    );

    // 尝试加载持久化数据
    const persistedData = redditDataManager.loadData();
    console.log('InformationDashboard: Loaded persisted data:', {
      hasData: !!persistedData,
      dataLength: persistedData?.length || 0,
      dataSample: persistedData?.slice(0, 2).map(item => ({
        name: item.name,
        postsCount: item.posts?.length || 0,
      })),
      dataMetadata: redditDataManager.getDataMetadata(),
      dataTimestamp: redditDataManager.getDataTimestamp(),
    });

    return persistedData || [];
  });

  // Currently selected workflow state
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowInfo | null>(
    null
  );

  // Reddit workflow states
  const [redditLoading, setRedditLoading] = useState(false);
  const [redditError, setRedditError] = useState<string | null>(null);
  const [redditWorkflowData, setRedditWorkflowData] =
    useState<RedditWorkflowResponse | null>(null);

  /**
   * 尝试从其他存储位置恢复数据
   */
  const attemptDataRecovery = useCallback((): ParsedSubredditData[] | null => {
    try {
      console.log('InformationDashboard: Attempting data recovery...');

      // 尝试从sessionStorage恢复
      const sessionData = sessionStorage.getItem('wendeal_reddit_backup');
      if (sessionData) {
        try {
          const parsed = JSON.parse(sessionData);
          if (Array.isArray(parsed) && parsed.length > 0) {
            console.log(
              'InformationDashboard: Recovered data from sessionStorage'
            );
            return parsed;
          }
        } catch (error) {
          console.warn(
            'InformationDashboard: Failed to parse sessionStorage data:',
            error
          );
        }
      }

      // 尝试从其他可能的localStorage键恢复
      const possibleKeys = [
        'reddit_data',
        'reddit_posts',
        'wendeal_reddit_cache',
        'reddit_workflow_data',
      ];

      for (const key of possibleKeys) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log(
                `InformationDashboard: Recovered data from localStorage key: ${key}`
              );
              return parsed;
            }
          }
        } catch (error) {
          console.warn(
            `InformationDashboard: Failed to recover from key ${key}:`,
            error
          );
        }
      }

      console.log('InformationDashboard: No recoverable data found');
      return null;
    } catch (error) {
      console.error('InformationDashboard: Data recovery failed:', error);
      return null;
    }
  }, []);

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

      // 检查数据是否过期 - 延长过期时间到7天
      const isExpired = redditDataManager.isDataExpired(168); // 7天过期
      if (isExpired) {
        console.log(
          'InformationDashboard: Persisted data is expired, clearing...'
        );
        redditDataManager.clearData();
        setRedditData([]);
        return;
      }

      // 检查数据完整性
      const currentDataStats = redditDataManager.getDataStats();
      if (currentDataStats.totalPosts === 0) {
        console.log(
          'InformationDashboard: Persisted data is empty, clearing...'
        );
        redditDataManager.clearData();
        setRedditData([]);
        return;
      }

      // 获取数据统计信息
      const dataStats = redditDataManager.getDataStats();
      console.log('InformationDashboard: Data stats:', dataStats);

      // 如果有持久化数据但没有选择工作流，自动选择Reddit工作流
      if (!selectedWorkflow) {
        console.log(
          'InformationDashboard: Auto-selecting Reddit workflow for persisted data'
        );
        setSelectedWorkflow({
          id: 'reddit-hot-posts',
          name: 'Reddit Hot Posts',
          description: 'Fetch hot posts from Reddit',
          type: 'webhook',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          executionCount: 0,
          successRate: 100,
          author: {
            id: 'system',
            name: 'System',
          },
        });
      }
    } else {
      console.log('InformationDashboard: No persisted Reddit data found');

      // 尝试数据恢复 - 检查是否有其他存储位置的数据
      try {
        const recoveredData = attemptDataRecovery();
        if (recoveredData && recoveredData.length > 0) {
          console.log('InformationDashboard: Data recovery successful:', {
            recoveredCount: recoveredData.length,
            dataSample: recoveredData.slice(0, 2).map(item => ({
              name: item.name,
              postsCount: item.posts?.length || 0,
            })),
          });

          setRedditData(recoveredData);
          redditDataManager.saveData(recoveredData);

          // 通知用户数据已恢复
          if (message && typeof message.info === 'function') {
            message.info('Reddit数据已从缓存中恢复');
          }
        }
      } catch (error) {
        console.warn('InformationDashboard: Data recovery failed:', error);
      }
    }
  }, [redditData.length, selectedWorkflow]);

  /**
   * Handle Reddit data reception - 执行工作流时持久化新数据
   */
  const handleRedditDataReceived = useCallback(
    (data: ParsedSubredditData[]) => {
      console.log('📥 InformationDashboard: 接收到Reddit数据:', {
        dataLength: data?.length || 0,
        dataType: typeof data,
        isArray: Array.isArray(data),
        dataSample: data?.slice(0, 2).map(item => ({
          name: item.name,
          postsCount: item.posts?.length || 0,
          postsSample: item.posts?.slice(0, 2).map(p => ({
            title: p.title,
            subreddit: p.subreddit,
          })),
        })),
      });

      // 验证数据完整性
      if (!data || !Array.isArray(data)) {
        console.error('❌ InformationDashboard: 接收到无效数据:', data);
        return;
      }

      // 验证每个subreddit数据
      const validData = data.filter(item => {
        const isValid =
          item && item.name && item.posts && Array.isArray(item.posts);
        if (!isValid) {
          console.warn('❌ 跳过无效的subreddit数据:', item);
        }
        return isValid;
      });

      console.log('✅ InformationDashboard: 有效数据:', {
        originalCount: data.length,
        validCount: validData.length,
        validDataSample: validData.slice(0, 2).map(item => ({
          name: item.name,
          postsCount: item.posts.length,
        })),
      });

      // 更新组件状态
      setRedditData(validData);

      // 使用全局数据管理器保存数据，确保数据常驻
      const success = redditDataManager.saveData(validData);
      if (success) {
        console.log('💾 InformationDashboard: Reddit数据持久化成功');

        // 同时备份到sessionStorage作为额外保障
        try {
          sessionStorage.setItem(
            'wendeal_reddit_backup',
            JSON.stringify(validData)
          );
          console.log(
            '💾 InformationDashboard: Reddit数据备份到sessionStorage成功'
          );
        } catch (error) {
          console.warn(
            'InformationDashboard: Failed to backup to sessionStorage:',
            error
          );
        }
      } else {
        console.error('❌ InformationDashboard: Reddit数据持久化失败');
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
          type: 'webhook',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          executionCount: 0,
          successRate: 100,
          author: {
            id: 'system',
            name: 'System',
          },
        } as WorkflowInfo);
      }
    },
    [selectedWorkflow]
  );

  /**
   * Handle workflow selection
   */
  const handleWorkflowSelect = useCallback((workflow: WorkflowInfo) => {
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
        <Title
          level={2}
          style={{ marginBottom: 8, color: 'var(--text-color)' }}
        >
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <DashboardOutlined
              style={{ marginRight: 12, color: 'var(--text-color)' }}
            />
            {t('informationDashboard.title')}
            <Popover
              content={
                <div style={{ maxWidth: '550px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <Text
                      strong
                      style={{ fontSize: '16px', color: 'var(--text-color)' }}
                    >
                      Core Business Value
                    </Text>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <Text
                      type='secondary'
                      style={{
                        lineHeight: '1.6',
                        fontSize: '14px',
                        color: 'var(--text-color)',
                      }}
                    >
                      Integrate multi-source data to provide intelligent
                      analysis, helping enterprises quickly discover market
                      opportunities, optimize business processes, and improve
                      decision-making efficiency.
                    </Text>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <Text
                      strong
                      style={{ fontSize: '14px', color: 'var(--text-color)' }}
                    >
                      Key Features:
                    </Text>
                  </div>
                  <Space
                    direction='vertical'
                    size='small'
                    style={{ fontSize: '13px', color: 'var(--text-color)' }}
                  >
                    <div>• Real-time Business Insights</div>
                    <div>• Automated Process Optimization</div>
                    <div>• Data-Driven Decision Making</div>
                    <div>• AI-Enhanced Analytics</div>
                  </Space>
                  <div style={{ marginTop: '12px' }}>
                    <Text
                      type='secondary'
                      style={{
                        fontSize: '13px',
                        lineHeight: '1.6',
                        color: 'var(--text-color)',
                      }}
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
                  color: 'var(--text-color)',
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

                {/* Test buttons */}
                <Space>
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
                          backgroundColor: 'var(--color-bg-container, #f5f5f5)',
                          borderColor: 'var(--color-border, #d9d9d9)',
                          color: 'var(--color-text-secondary, #666)',
                          marginLeft: 'auto',
                        }}
                      >
                        {!redditLoading && 'Start Reddit'}
                      </Button>
                    </Tooltip>
                  )}
                </Space>
              </div>
            }
            className='data-display-card'
            style={{
              height: 'calc(100vh - 200px)',
              minHeight: '600px',
              display: 'flex',
              flexDirection: 'column',
            }}
            styles={{
              body: {
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                padding: '16px',
                overflow: 'hidden',
              },
            }}
          >
            {selectedWorkflow?.id === 'smart-opportunities' ? (
              <SmartOpportunities />
            ) : (
              <div
                style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
              >
                <WorkflowPanel
                  onRedditDataReceived={handleRedditDataReceived}
                  onRedditWorkflowDataReceived={
                    handleRedditWorkflowDataReceived
                  }
                />
                <Divider />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <ResultPanel
                    redditData={redditData}
                    redditWorkflowData={redditWorkflowData}
                    selectedWorkflow={selectedWorkflow}
                  />
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default InformationDashboard;
