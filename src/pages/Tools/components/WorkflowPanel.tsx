/**
 * Tools Workflow management panel component
 * Copy of Information Dashboard WorkflowPanel for Tools page
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
 * Tools 工作流面板组件属性
 */
interface WorkflowPanelProps {
  className?: string;
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
 * Tools 工作流管理面板组件
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
    const {
      workflows: workflowsState,
      loading,
      workflowStats,
    } = useAppSelector(state => state.informationDashboard);
    const workflows = workflowsState.list;

    // Component state
    const [triggerModalVisible, setTriggerModalVisible] = useState(false);
    const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
      null
    );
    const [triggerForm] = Form.useForm();

    // 确保Form组件已连接
    useEffect(() => {
      if (triggerForm) {
        console.log('WorkflowPanel: Trigger form instance connected');
      }
    }, [triggerForm]);

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
      dispatch(fetchWorkflows());
      dispatch(fetchWorkflowExecutions({ limit: 10 }));
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
        dispatch(fetchWorkflowExecutions({ limit: 10 }));

        // Notify parent component
        if (onWorkflowTriggered) {
          onWorkflowTriggered(selectedWorkflow.id, result.executionId);
        }
      } catch (error) {
        showError(
          t('informationDashboard.messages.operationFailed'),
          error instanceof Error ? error.message : String(error)
        );
      }
    }, [selectedWorkflow, triggerForm, dispatch, t, onWorkflowTriggered]);

    /**
     * Refresh data
     */
    const handleRefresh = useCallback(() => {
      dispatch(fetchWorkflows());
      dispatch(fetchWorkflowExecutions({ limit: 10 }));
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
          const workflowResponse = response.data;
          setRedditWorkflowData(workflowResponse);
          setRedditProgressStatus('Reddit数据获取完成！');
          message.success('Reddit数据获取成功！');

          // Notify parent component with new data format
          if (onRedditWorkflowDataReceived) {
            onRedditWorkflowDataReceived(workflowResponse);
          }

          // Also provide backward compatibility with old format
          const subredditsData =
            workflowResponse.subreddits
              ?.map(sub => {
                // 验证subreddit数据
                if (!sub || !sub.name) {
                  console.warn('WorkflowPanel: Invalid subreddit data:', sub);
                  return null;
                }

                const subredditName = sub.displayName || sub.name;
                console.log(
                  'WorkflowPanel: Processing subreddit:',
                  subredditName
                );

                const posts =
                  sub.posts
                    ?.map(post => {
                      // 验证post数据
                      if (!post || !post.title) {
                        console.warn('WorkflowPanel: Invalid post data:', post);
                        return null;
                      }

                      return {
                        title: post.title,
                        author: post.author || 'Unknown',
                        score: post.score || 0,
                        comments: post.comments || 0,
                        url: post.url || post.redditUrl || '',
                        subreddit: subredditName,
                        rank: post.rank || 0,
                      };
                    })
                    .filter(Boolean) || []; // 过滤掉null值

                return {
                  name: subredditName,
                  posts: posts,
                  totalPosts: sub.stats?.totalPosts || posts.length,
                };
              })
              .filter(Boolean) || []; // 过滤掉null值

          console.log(
            'WorkflowPanel: Processed subredditsData:',
            subredditsData
          );
          setRedditData(subredditsData);
          if (onRedditDataReceived) {
            console.log(
              'WorkflowPanel: Calling onRedditDataReceived with data:',
              subredditsData
            );
            onRedditDataReceived(subredditsData);
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
        showError('Reddit数据获取失败', errorMessage);
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
                    {t('informationDashboard.workflowPanel.nodeCount')}:
                  </strong>{' '}
                  {selectedWorkflow.nodeCount}
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
          isVisible={isVisible}
          errorInfo={errorInfo}
          onClose={hideError}
        />
      </div>
    );
  }
);

// Set component display name
WorkflowPanel.displayName = 'WorkflowPanel';

export default WorkflowPanel;
