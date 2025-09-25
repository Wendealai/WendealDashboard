/**
 * Workflow Sidebar Component
 * Provides workflow selection, control and status monitoring functionality
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Space, Tooltip, Empty, Spin, Row, Col } from 'antd';
import { useMessage } from '@/hooks';
import { ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchWorkflows,
  triggerWorkflow,
  selectWorkflowsList,
  selectWorkflowStats,
  selectLoading,
} from '@/store/slices/informationDashboardSlice';
import type {
  Workflow,
  WorkflowStatus,
  RedditWorkflowResponse,
} from '../types';
import type { WorkflowSettings } from '@/types/workflow';
import type { ParsedSubredditData } from '@/services/redditWebhookService';
import { redditWebhookService } from '@/services/redditWebhookService';
import { WorkflowSettingsModal } from '@/components/workflow';
import WorkflowCard from '@/components/workflow/WorkflowCard';

/**
 * Workflow Sidebar Component Props Interface
 */
interface WorkflowSidebarProps {
  className?: string;
  onWorkflowSelect?: (workflow: Workflow | null) => void;
  onWorkflowTriggered?: (workflowId: string, executionId: string) => void;
  onRedditDataReceived?: (data: ParsedSubredditData[]) => void;
  onRedditWorkflowDataReceived?: (data: RedditWorkflowResponse) => void;
}

/**
 * Get workflow status color
 */

/**
 * Workflow Sidebar Component
 */
const WorkflowSidebar: React.FC<WorkflowSidebarProps> = memo(
  ({
    className,
    onWorkflowSelect,
    onWorkflowTriggered,
    onRedditDataReceived,
    onRedditWorkflowDataReceived,
  }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const message = useMessage();
    const workflows = useAppSelector(selectWorkflowsList);
    const loading = useAppSelector(selectLoading);

    // Component state
    const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
      null
    );
    const [redditLoading, setRedditLoading] = useState(false);
    const [redditProgressStatus, setRedditProgressStatus] = useState('');
    const [redditError, setRedditError] = useState<string | null>(null);

    const [lastUpdatedTimes, setLastUpdatedTimes] = useState<
      Record<string, Date>
    >(() => {
      // Load Last Updated times from localStorage
      try {
        const savedTimes = localStorage.getItem('lastUpdatedTimes');
        if (savedTimes) {
          const parsed = JSON.parse(savedTimes);
          // Convert strings back to Date objects
          const converted: Record<string, Date> = {};
          Object.keys(parsed).forEach(key => {
            converted[key] = new Date(parsed[key]);
          });
          return converted;
        }
        return {};
      } catch (error) {
        console.error('Failed to load Last Updated times:', error);
        return {};
      }
    });
    const [settingsModalVisible, setSettingsModalVisible] = useState(false);
    const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(
      null
    );
    const [currentWorkflowSettings, setCurrentWorkflowSettings] =
      useState<WorkflowSettings | null>(null);

    /**
     * Persist Last Updated times to localStorage
     */
    useEffect(() => {
      try {
        localStorage.setItem(
          'lastUpdatedTimes',
          JSON.stringify(lastUpdatedTimes)
        );
      } catch (error) {
        console.error('Failed to save Last Updated times:', error);
      }
    }, [lastUpdatedTimes]);

    /**
     * Handle workflow selection
     */
    const handleWorkflowSelect = useCallback(
      (workflow: Workflow) => {
        setSelectedWorkflow(workflow);
        onWorkflowSelect?.(workflow);
      },
      [onWorkflowSelect]
    );

    /**
     * Handle workflow trigger
     */
    const handleTriggerWorkflow = useCallback(
      async (workflow: Workflow) => {
        try {
          const result = await dispatch(
            triggerWorkflow({
              workflowId: workflow.id,
              inputData: {},
              waitForCompletion: true,
            })
          ).unwrap();

          // Update Last Updated time
          setLastUpdatedTimes(prev => ({
            ...prev,
            [workflow.id]: new Date(),
          }));

          onWorkflowTriggered?.(workflow.id, result.executionId);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const detailedError = `工作流执行失败：\n工作流：${workflow.name}\n文件：WorkflowSidebar.tsx\n错误详情：${errorMessage}`;
          console.error('Failed to trigger workflow:', detailedError);
        }
      },
      [dispatch, onWorkflowTriggered]
    );

    // Reddit workflow settings state - 提前声明
    const [redditWorkflowSettings, setRedditWorkflowSettings] =
      useState<WorkflowSettings>({
        name: t('informationDashboard.reddit.dataCollection'),
        webhookUrl: 'https://n8n.wendealai.com/webhook/reddithot', // 使用正确的默认webhook URL
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    /**
     * Handle Reddit workflow startup - use redditWebhookService to parse data
     */
    const handleRedditWorkflowStart = useCallback(async () => {
      console.log('🚀 handleRedditWorkflowStart函数开始执行');
      console.log('📊 当前状态:', {
        redditLoading,
        redditWorkflowSettings,
        webhookUrl: redditWorkflowSettings.webhookUrl,
      });

      setRedditLoading(true);
      setRedditError(null);
      setRedditProgressStatus(
        t('informationDashboard.workflow.connectingRedditWebhook')
      );

      // 清除之前的数据，确保只保存最新的数据
      console.log('🧹 Starting new Reddit workflow, clearing previous data...');
      onRedditDataReceived?.([]);

      try {
        // 检查是否配置了webhook URL，如果没有配置则使用默认URL
        let webhookUrl = redditWorkflowSettings.webhookUrl;

        // 如果用户没有配置webhook URL或使用示例URL，则使用默认的正确URL
        if (
          !webhookUrl ||
          webhookUrl.trim() === '' ||
          webhookUrl === 'https://api.example.com/reddit-webhook'
        ) {
          webhookUrl = 'https://n8n.wendealai.com/webhook/reddithot'; // 使用用户提供的正确默认URL
          console.log('使用默认Reddit webhook URL:', webhookUrl);
        }

        // 使用redditWebhookService触发webhook，传入配置的URL或默认URL
        console.log('🌐 准备调用webhook服务:', {
          webhookUrl,
          serviceAvailable: !!redditWebhookService,
        });

        const webhookResponse = await redditWebhookService.triggerWebhook(
          (status: string) => {
            console.log('📢 Webhook进度更新:', status);
            setRedditProgressStatus(status);
          },
          webhookUrl
        );

        console.log('✅ Webhook调用完成，原始响应:', webhookResponse);

        // Use redditWebhookService to process webhook response
        const processedData =
          redditWebhookService.processWebhookResponse(webhookResponse);

        console.log('Processed data:', processedData);

        // Handle different response formats
        let subredditsData: ParsedSubredditData[] = [];

        if (processedData && typeof processedData === 'object') {
          if (
            'data' in processedData &&
            processedData.data &&
            'subreddits' in processedData.data
          ) {
            // New workflow response format
            subredditsData = processedData.data
              .subreddits as ParsedSubredditData[];
          } else if ('subreddits' in processedData) {
            // Legacy format
            subredditsData = processedData.subreddits as ParsedSubredditData[];
          } else if (
            'posts' in processedData &&
            'subreddits' in processedData
          ) {
            // Alternative format
            subredditsData = processedData.subreddits as ParsedSubredditData[];
          } else {
            console.error(
              'No subreddits data found in processedData:',
              processedData
            );
            throw new Error('无法获取subreddits数据');
          }
        } else {
          console.error('Invalid processedData format:', processedData);
          throw new Error('处理后的数据格式无效');
        }

        // Convert to format expected by WorkflowSidebar
        const parsedData: ParsedSubredditData[] = subredditsData.map(
          subreddit => ({
            name: subreddit.name,
            posts: subreddit.posts.map(post => ({
              title: post.title,
              upvotes: post.upvotes,
              comments: post.comments,
              url: post.url,
              subreddit: post.subreddit,
              rank: post.rank,
            })),
            totalPosts: subreddit.totalPosts,
          })
        );

        console.log('Converted data:', {
          subredditsCount: parsedData.length,
          totalPosts: parsedData.reduce(
            (sum, sub) => sum + sub.posts.length,
            0
          ),
        });

        setRedditProgressStatus(
          t('informationDashboard.workflow.dataFetchCompleted')
        );

        // Update Reddit workflow Last Updated time
        setLastUpdatedTimes(prev => ({
          ...prev,
          'reddit-workflow': new Date(),
        }));

        // 如果webhook响应包含新的Reddit工作流格式，传递给父组件
        if (
          webhookResponse?.json &&
          webhookResponse.json.success !== undefined &&
          webhookResponse.json.subreddits
        ) {
          console.log('传递新格式的Reddit工作流数据给父组件');
          onRedditWorkflowDataReceived?.(webhookResponse.json);
        }

        onRedditDataReceived?.(parsedData);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // 如果是WebhookError，直接使用详细的错误信息
        if (error instanceof Error && error.name === 'WebhookError') {
          console.error('Reddit工作流Webhook错误:', errorMessage);
          setRedditError(errorMessage);
        } else {
          // 其他类型的错误，提供通用的错误信息
          const detailedError = `Reddit工作流执行失败：\n\n❌ 错误详情：\n${errorMessage}\n\n📁 文件位置：WorkflowSidebar.tsx\n\n🔍 调试信息：\n• 请检查网络连接\n• 确认工作流配置是否正确\n• 验证服务是否正常运行`;
          console.error('Reddit工作流执行失败:', detailedError);
          setRedditError(detailedError);
        }
      } finally {
        setRedditLoading(false);
        setTimeout(() => {
          setRedditProgressStatus('');
        }, 2000);
      }
    }, [onRedditDataReceived, redditWorkflowSettings, t]);

    /**
     * Refresh workflow list
     */
    const handleRefresh = useCallback(() => {
      dispatch(fetchWorkflows({}));
    }, [dispatch]);

    /**
     * Open settings modal for a specific workflow
     */
    const handleOpenSettings = useCallback(
      (workflowId: string, workflowName?: string) => {
        setCurrentWorkflowId(workflowId);
        setSettingsModalVisible(true);
        // Load settings for this specific workflow
        loadWorkflowSettings(workflowId, workflowName);
      },
      []
    );

    // Load workflow settings function
    const loadWorkflowSettings = useCallback(
      async (workflowId: string, workflowName?: string) => {
        try {
          const { workflowSettingsService } = await import(
            '@/services/workflowSettingsService'
          );
          const response =
            await workflowSettingsService.getSettings(workflowId);

          let settings;
          if (response.success && response.data) {
            settings = response.data;
          } else {
            // Default settings for different workflows
            if (workflowId === 'reddit-workflow') {
              settings = {
                name:
                  workflowName ||
                  t('informationDashboard.reddit.dataCollection'),
                webhookUrl: 'https://n8n.wendealai.com/webhook/reddithot', // 使用正确的默认webhook URL
                enabled: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
            } else {
              settings = {
                name: workflowName || 'Workflow',
                webhookUrl: '',
                enabled: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };
            }
          }

          setCurrentWorkflowSettings(settings);

          // Update reddit workflow settings if it's the reddit workflow
          if (workflowId === 'reddit-workflow') {
            setRedditWorkflowSettings(settings);
          }
        } catch (error) {
          console.error('Failed to load workflow settings:', error);
        }
      },
      [t, setRedditWorkflowSettings]
    );

    // Load reddit workflow settings on component mount
    useEffect(() => {
      loadWorkflowSettings(
        'reddit-workflow',
        t('informationDashboard.reddit.dataCollection')
      );
      dispatch(fetchWorkflows({}));
    }, [loadWorkflowSettings, t, dispatch]);

    // Use useMemo to optimize computed values
    const filteredWorkflows = useMemo(() => {
      return workflows.filter(
        workflow => workflow.id !== 'invoice-ocr-workflow'
      );
    }, [workflows]);

    const hasWorkflows = useMemo(() => {
      return workflows.length > 0;
    }, [workflows.length]);

    /**
     * Close settings modal
     */
    const handleCloseSettings = useCallback(() => {
      setSettingsModalVisible(false);
    }, []);

    /**
     * Save settings
     */
    const handleSaveSettings = useCallback(
      async (settings: any) => {
        console.log('Save workflow settings:', settings);

        if (!currentWorkflowId) {
          message.error('No workflow selected');
          return;
        }

        try {
          // Save to workflowSettingsService
          const { workflowSettingsService } = await import(
            '@/services/workflowSettingsService'
          );
          const response = await workflowSettingsService.saveSettings(
            currentWorkflowId,
            settings
          );

          if (response.success && response.data) {
            // Update reddit workflow settings if it's the reddit workflow
            if (currentWorkflowId === 'reddit-workflow') {
              setRedditWorkflowSettings(response.data);
            }

            // Show save success message
            message.success(t('informationDashboard.workflow.settingsSaved'));
          } else {
            message.error(response.error || 'Failed to save settings');
          }
        } catch (error) {
          console.error('Failed to save workflow settings:', error);
          message.error('Error occurred while saving settings');
        }

        setSettingsModalVisible(false);
        setCurrentWorkflowId(null);
        setCurrentWorkflowSettings(null);
      },
      [currentWorkflowId, message, t]
    );

    return (
      <div
        className={`workflow-sidebar ${className} compact-layout`}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        {/* Workflow list */}
        <Card
          size='small'
          title={
            <Space>
              <SettingOutlined />
              <span>
                {t('informationDashboard.workflowPanel.workflowList')}
              </span>
            </Space>
          }
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
          styles={{ body: { flex: 1, padding: 0, position: 'relative' } }}
        >
          <Spin spinning={loading}>
            <Row gutter={[12, 12]} style={{ padding: '12px' }}>
              {/* Smart Opportunities workflow card */}
              <Col xs={24} sm={12} md={8} lg={6} xl={6}>
                <WorkflowCard
                  workflow={{
                    id: 'smart-opportunities',
                    name: 'Smart Opportunities',
                    description:
                      'Discover business opportunities based on industry, city, and country parameters',
                    type: 'manual' as const,
                    status: 'active' as WorkflowStatus,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    lastExecution: new Date().toISOString(),
                    executionCount: 0,
                    successRate: 0,
                    author: {
                      id: 'system',
                      name: 'System',
                    },
                  }}
                  selected={selectedWorkflow?.id === 'smart-opportunities'}
                  loading={false}
                  error={null}
                  onClick={() =>
                    handleWorkflowSelect({
                      id: 'smart-opportunities',
                      name: 'Smart Opportunities',
                      description: '基于行业、城市、国家参数智能发现商业机会',
                      type: 'manual' as const,
                      status: 'active' as WorkflowStatus,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      lastExecution: new Date().toISOString(),
                      executionCount: 0,
                      successRate: 0,
                      nodeCount: 3,
                      author: {
                        id: 'system',
                        name: 'System',
                      },
                    })
                  }
                  onTrigger={() => {
                    // Select Smart Opportunities workflow, display on the right side
                    handleWorkflowSelect({
                      id: 'smart-opportunities',
                      name: 'Smart Opportunities',
                      description: '基于行业、城市、国家参数智能发现商业机会',
                      type: 'manual' as const,
                      status: 'active' as WorkflowStatus,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      lastExecution: new Date().toISOString(),
                      executionCount: 0,
                      successRate: 0,
                      nodeCount: 3,
                      author: {
                        id: 'system',
                        name: 'System',
                      },
                    });
                  }}
                  onSettings={() => {
                    // Open settings modal for Smart Opportunities
                    handleOpenSettings(
                      'smart-opportunities',
                      'Smart Opportunities'
                    );
                  }}
                  size='small'
                  showActions={false} // Hide start button
                />
              </Col>

              {/* Reddit workflow card - Start button moved to header */}
              <Col xs={24} sm={12} md={8} lg={6} xl={6}>
                <WorkflowCard
                  workflow={{
                    id: 'reddit-workflow',
                    name: redditWorkflowSettings.name,
                    description: t('informationDashboard.reddit.getHotPosts'),
                    type: 'webhook' as const,
                    status: 'active' as WorkflowStatus,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    lastExecution: new Date().toISOString(),
                    executionCount: 0,
                    successRate: 0,
                    author: {
                      id: 'system',
                      name: 'System',
                    },
                  }}
                  selected={selectedWorkflow?.id === 'reddit-workflow'}
                  loading={redditLoading}
                  error={redditError}
                  onClick={() =>
                    handleWorkflowSelect({
                      id: 'reddit-workflow',
                      name: redditWorkflowSettings.name,
                      description: t('informationDashboard.reddit.getHotPosts'),
                      type: 'webhook' as const,
                      status: 'active' as WorkflowStatus,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      lastExecution: new Date().toISOString(),
                      executionCount: 0,
                      successRate: 0,
                      nodeCount: 3,
                      author: {
                        id: 'system',
                        name: 'System',
                      },
                    })
                  }
                  onTrigger={workflow => {
                    console.log(
                      'Reddit workflow trigger clicked for:',
                      workflow?.name
                    );
                    handleRedditWorkflowStart();
                  }}
                  onSettings={() =>
                    handleOpenSettings(
                      'reddit-workflow',
                      redditWorkflowSettings.name
                    )
                  }
                  size='small'
                  showActions={false} // Hide start button since it's now in the header
                />
              </Col>

              {/* Other workflow cards */}
              {filteredWorkflows
                .filter(w => w.name !== 'Data Sync Workflow')
                .map(workflow => (
                  <Col key={workflow.id} xs={24} sm={24} md={12} lg={8} xl={6}>
                    <WorkflowCard
                      workflow={workflow}
                      selected={selectedWorkflow?.id === workflow.id}
                      loading={false}
                      error={null}
                      lastUpdated={lastUpdatedTimes[workflow.id]}
                      onClick={() => handleWorkflowSelect(workflow)}
                      onTrigger={() => handleWorkflowSelect(workflow)}
                      onSettings={() =>
                        handleOpenSettings(workflow.id, workflow.name)
                      }
                      size='small'
                      showActions={false} // Hide start button for all workflows
                    />
                  </Col>
                ))}

              {/* If no workflows, show empty state */}
              {!hasWorkflows && (
                <Col span={24}>
                  <div style={{ padding: 16, textAlign: 'center' }}>
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={t(
                        'informationDashboard.workflowPanel.noWorkflows'
                      )}
                      style={{ margin: 0 }}
                    />
                  </div>
                </Col>
              )}
            </Row>
          </Spin>

          {/* Action buttons positioned at bottom right */}
          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              zIndex: 10,
            }}
          >
            <Space size='middle'>
              <Tooltip title={t('informationDashboard.actions.refresh')}>
                <Button
                  type='text'
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                  loading={loading}
                  size='small'
                  style={{
                    background: '#dddddd',
                    border: '1px solid #bbbbbb',
                    borderRadius: '6px',
                    color: '#666666',
                  }}
                />
              </Tooltip>
            </Space>
          </div>
        </Card>

        {/* Workflow settings modal */}
        <WorkflowSettingsModal
          visible={settingsModalVisible}
          onClose={handleCloseSettings}
          onSave={handleSaveSettings}
          initialSettings={currentWorkflowSettings || redditWorkflowSettings}
        />
      </div>
    );
  }
);

export default WorkflowSidebar;

// Display name for debugging
WorkflowSidebar.displayName = 'WorkflowSidebar';
