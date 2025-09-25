/**
 * Workflow management panel component
 * Provides workflow display, management and operation functionality
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Tooltip,
  Row,
  Col,
  List,
  Typography,
  Alert,
  Progress,
  Empty,
} from 'antd';
import { useMessage } from '@/hooks';
import { useErrorModal } from '@/hooks/useErrorModal';
import ErrorModal from '@/components/common/ErrorModal';
import {
  PlayCircleOutlined,
  ReloadOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  RedditOutlined,
  ExportOutlined,
  CommentOutlined,
  LikeOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchWorkflows,
  triggerWorkflow,
  fetchWorkflowExecutions,
  selectWorkflowStats,
} from '@/store/slices/informationDashboardSlice';
import { workflowService } from '@/services/workflowService';
import type {
  Workflow,
  WorkflowTriggerRequest,
  WorkflowStatus,
} from '../types';
import type {
  ParsedSubredditData,
  RedditWorkflowResponse,
} from '@/services/redditWebhookService';
import WorkflowGrid from '@/components/workflow/WorkflowGrid';

const { Text } = Typography;

/**
 * 工作流面板组件属性
 */
interface WorkflowPanelProps {
  className?: string;
  onWorkflowSelect?: (workflow: Workflow) => void;
  onWorkflowTriggered?: (workflowId: string, executionId: string) => void;
  onRedditDataReceived?: (data: ParsedSubredditData[]) => void;
  onRedditWorkflowDataReceived?: (data: RedditWorkflowResponse) => void;
}

/**
 * 工作流状态颜色映射
 */
const getWorkflowStatusColor = (status: WorkflowStatus): string => {
  switch (status) {
    case 'active':
      return 'success';
    case 'inactive':
      return 'default';
    case 'error':
      return 'error';
    default:
      return 'default';
  }
};

/**
 * 工作流管理面板组件
 */
const WorkflowPanel: React.FC<WorkflowPanelProps> = memo(
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
    const { isVisible, errorInfo, showError, hideError } = useErrorModal();
    const { workflows: workflowsState } = useAppSelector(
      state => state.informationDashboard
    );
    const workflows = workflowsState.list;
    const loading = workflowsState.loading;
    const workflowStats = useAppSelector(selectWorkflowStats);

    // Component state
    const [triggerModalVisible, setTriggerModalVisible] = useState(false);
    const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
      null
    );
    const [triggerForm] = Form.useForm();

    // Reddit workflow state
    const [redditLoading, setRedditLoading] = useState(false);
    const [redditError, setRedditError] = useState<string | null>(null);
    const [redditProgressStatus, setRedditProgressStatus] =
      useState<string>('');
    const [redditData, setRedditData] = useState<ParsedSubredditData[]>([]);
    const [redditWorkflowData, setRedditWorkflowData] =
      useState<RedditWorkflowResponse | null>(null);

    /**
     * Initialize data loading
     */
    useEffect(() => {
      dispatch(fetchWorkflows({}));
      dispatch(fetchWorkflowExecutions());
    }, [dispatch]);

    /**
     * Handle workflow trigger
     */
    const handleTriggerWorkflow = useCallback(
      async (workflow: Workflow) => {
        setSelectedWorkflow(workflow);
        setTriggerModalVisible(true);
        triggerForm.resetFields();
      },
      [triggerForm]
    );

    /**
     * Confirm workflow trigger
     */
    const handleConfirmTrigger = useCallback(async () => {
      if (!selectedWorkflow) return;

      try {
        const values = await triggerForm.validateFields();
        const triggerData: WorkflowTriggerRequest = {
          workflowId: selectedWorkflow.id,
          data: values.data ? JSON.parse(values.data) : undefined,
          waitTill: values.waitTill || false,
        };

        const result = await dispatch(triggerWorkflow(triggerData)).unwrap();

        message.success(t('informationDashboard.messages.workflowTriggered'));
        setTriggerModalVisible(false);

        // Refresh execution list
        dispatch(fetchWorkflowExecutions());

        // Notify parent component
        if (onWorkflowTriggered) {
          onWorkflowTriggered(selectedWorkflow.id, result.executionId);
        }
      } catch (error) {
        showError({
          title: t('informationDashboard.messages.operationFailed'),
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }, [selectedWorkflow, triggerForm, dispatch, t, onWorkflowTriggered]);

    /**
     * Refresh data
     */
    const handleRefresh = useCallback(() => {
      dispatch(fetchWorkflows({}));
      dispatch(fetchWorkflowExecutions());
    }, [dispatch]);

    /**
     * Handle Reddit workflow start
     */
    const handleRedditWorkflowStart = useCallback(async () => {
      setRedditLoading(true);
      setRedditError(null);
      setRedditProgressStatus('准备启动Reddit工作流...');

      try {
        const response = await workflowService.triggerRedditWebhook(
          (status: string) => {
            setRedditProgressStatus(status);
          }
        );

        if (response.success && response.data) {
          // Handle new Reddit workflow response format
          const workflowResponse: RedditWorkflowResponse = {
            ...response.data,
            success: true,
            headerInfo: {
              title: 'Reddit Hot Content',
              subtitle: 'Latest trending posts',
              timeRange: '24h',
              timestamp: new Date().toISOString(),
              totalPosts:
                response.data.subreddits?.reduce(
                  (sum: number, sub: any) => sum + (sub.posts?.length || 0),
                  0
                ) || 0,
            },
            summary: {
              totalSubreddits: response.data.subreddits?.length || 0,
              totalPosts:
                response.data.subreddits?.reduce(
                  (sum: number, sub: any) => sum + (sub.posts?.length || 0),
                  0
                ) || 0,
              totalScore:
                response.data.subreddits?.reduce(
                  (sum: number, sub: any) => sum + (sub.stats?.totalScore || 0),
                  0
                ) || 0,
              totalComments:
                response.data.subreddits?.reduce(
                  (sum: number, sub: any) =>
                    sum + (sub.stats?.totalComments || 0),
                  0
                ) || 0,
              topSubreddit: response.data.subreddits?.[0]?.name || null,
              categories:
                response.data.subreddits
                  ?.map((sub: any) => sub.category)
                  .filter(Boolean) || [],
              averagePostsPerSub: response.data.subreddits?.length
                ? response.data.subreddits.reduce(
                    (sum: number, sub: any) => sum + (sub.posts?.length || 0),
                    0
                  ) / response.data.subreddits.length
                : 0,
              dataFreshness: 'fresh',
            },
          };
          setRedditWorkflowData(workflowResponse);
          setRedditProgressStatus('Reddit数据获取完成！');
          message.success('Reddit数据获取成功！');

          // Notify parent component with new data format
          if (onRedditWorkflowDataReceived) {
            onRedditWorkflowDataReceived(workflowResponse);
          }

          // Also provide backward compatibility with old format
          const subredditsData =
            workflowResponse.subreddits?.map((sub: any) => ({
              name: sub.name,
              posts: sub.posts.map((post: any) => ({
                title: post.title,
                author: post.author,
                score: post.score,
                comments: post.comments,
                url: post.url,
                subreddit: sub.name,
                rank: post.rank,
                upvotes: post.score, // Map score to upvotes for compatibility
              })),
              totalPosts: sub.stats?.totalPosts || 0,
            })) || [];

          setRedditData(subredditsData as any);
          if (onRedditDataReceived) {
            onRedditDataReceived(subredditsData as any);
          }

          // Notify that workflow has been triggered
          if (onWorkflowTriggered) {
            onWorkflowTriggered(
              'reddit-workflow',
              'reddit-execution-' + Date.now()
            );
          }
        } else {
          throw new Error(response.error || 'Reddit数据获取失败');
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Reddit数据获取失败';
        setRedditError(errorMessage);
        setRedditProgressStatus('');
        showError({
          title: 'Reddit数据获取失败',
          message: errorMessage,
        });
      } finally {
        setRedditLoading(false);
        // Clear progress status (delay 3 seconds)
        setTimeout(() => {
          setRedditProgressStatus('');
        }, 3000);
      }
    }, [onRedditDataReceived, onWorkflowTriggered]);

    /**
     * Workflow table column definition
     */
    // Workflow list now uses WorkflowGrid component, no longer needs Table columns definition

    return (
      <div className={className}>
        {/* Removed Reddit data display and workflow list cards */}

        {/* Trigger workflow modal */}
        <Modal
          title={
            t('informationDashboard.workflowPanel.triggerWorkflow') +
            ': ' +
            (selectedWorkflow?.name || '')
          }
          open={triggerModalVisible}
          onOk={handleConfirmTrigger}
          onCancel={() => setTriggerModalVisible(false)}
          okText={t('informationDashboard.actions.trigger')}
          cancelText={t('common.cancel')}
          width={600}
        >
          {selectedWorkflow && (
            <Form form={triggerForm} layout='vertical'>
              <div
                style={{
                  marginBottom: 16,
                  padding: 12,
                  background: '#f5f5f5',
                  borderRadius: 4,
                }}
              >
                <p>
                  <strong>
                    {t('informationDashboard.workflowPanel.workflowName')}:
                  </strong>{' '}
                  {selectedWorkflow.name}
                </p>
                <p>
                  <strong>
                    {t(
                      'informationDashboard.workflowPanel.workflowDescription'
                    )}
                    :
                  </strong>{' '}
                  {selectedWorkflow.description || t('common.noDescription')}
                </p>
                <p>
                  <strong>
                    {t('informationDashboard.workflowPanel.workflowStatus')}:
                  </strong>
                  <Tag
                    color={getWorkflowStatusColor(selectedWorkflow.status)}
                    style={{ marginLeft: 8 }}
                  >
                    {selectedWorkflow.status === 'active'
                      ? t('informationDashboard.workflowPanel.status.active')
                      : selectedWorkflow.status === 'inactive'
                        ? t(
                            'informationDashboard.workflowPanel.status.inactive'
                          )
                        : t('informationDashboard.workflowPanel.status.error')}
                  </Tag>
                </p>
              </div>

              <Form.Item
                label={t('informationDashboard.workflowPanel.inputData')}
                name='data'
                help={t('informationDashboard.workflowPanel.inputDataHelp')}
              >
                <Input.TextArea
                  rows={4}
                  placeholder='{"name": "test", "value": 123}'
                />
              </Form.Item>

              <Form.Item
                label={t(
                  'informationDashboard.workflowPanel.waitForCompletion'
                )}
                name='waitTill'
                help={t(
                  'informationDashboard.workflowPanel.waitForCompletionHelp'
                )}
              >
                <Input.Group compact>
                  <Input
                    style={{ width: '50%' }}
                    placeholder={t(
                      'informationDashboard.workflowPanel.asyncExecution'
                    )}
                    disabled
                  />
                </Input.Group>
              </Form.Item>
            </Form>
          )}
        </Modal>
        <ErrorModal
          visible={isVisible}
          message={errorInfo?.message || 'An error occurred'}
          details={errorInfo?.details}
          onClose={hideError}
        />
      </div>
    );
  }
);

// Set component display name
WorkflowPanel.displayName = 'WorkflowPanel';

export default WorkflowPanel;
