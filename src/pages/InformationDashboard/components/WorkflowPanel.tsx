/**
 * 工作流管理面板组件
 * 提供工作流列表展示、触发执行和状态监控功能
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Button,
  Table,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  message,
  Tooltip,
  Row,
  Col,
  Statistic,
  List,
  Typography,
  Alert,
  Progress,
  Empty,
} from 'antd';
import {
  PlayCircleOutlined,
  ReloadOutlined,
  EyeOutlined,
  SettingOutlined,
  CheckCircleOutlined,
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
import type { ParsedSubredditData } from '@/services/redditWebhookService';

const { Text } = Typography;

/**
 * 工作流面板组件属性
 */
interface WorkflowPanelProps {
  className?: string;
  onWorkflowTriggered?: (workflowId: string, executionId: string) => void;
  onRedditDataReceived?: (data: ParsedSubredditData[]) => void;
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
const WorkflowPanel: React.FC<WorkflowPanelProps> = ({
  className,
  onWorkflowTriggered,
  onRedditDataReceived,
}) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const { workflows, loading, workflowStats } = useAppSelector(
    state => state.informationDashboard
  );

  // 组件状态
  const [triggerModalVisible, setTriggerModalVisible] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
    null
  );
  const [triggerForm] = Form.useForm();

  // Reddit工作流状态
  const [redditLoading, setRedditLoading] = useState(false);
  const [redditError, setRedditError] = useState<string | null>(null);
  const [redditProgressStatus, setRedditProgressStatus] = useState<string>('');
  const [redditData, setRedditData] = useState<ParsedSubredditData[]>([]);

  /**
   * 初始化数据加载
   */
  useEffect(() => {
    dispatch(fetchWorkflows());
    dispatch(fetchWorkflowExecutions({ limit: 10 }));
  }, [dispatch]);

  /**
   * 处理工作流触发
   */
  const handleTriggerWorkflow = async (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    setTriggerModalVisible(true);
    triggerForm.resetFields();
  };

  /**
   * 确认触发工作流
   */
  const handleConfirmTrigger = async () => {
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

      // 刷新执行列表
      dispatch(fetchWorkflowExecutions({ limit: 10 }));

      // 通知父组件
      if (onWorkflowTriggered) {
        onWorkflowTriggered(selectedWorkflow.id, result.executionId);
      }
    } catch (error) {
      message.error(t('informationDashboard.messages.operationFailed'));
    }
  };

  /**
   * 刷新数据
   */
  const handleRefresh = () => {
    dispatch(fetchWorkflows());
    dispatch(fetchWorkflowExecutions({ limit: 10 }));
  };

  /**
   * 处理Reddit工作流启动
   */
  const handleRedditWorkflowStart = async () => {
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
        const subredditsData = response.data.subreddits || [];
        setRedditData(subredditsData);
        setRedditProgressStatus('Reddit数据获取完成！');
        message.success('Reddit数据获取成功！');

        // 通知父组件数据已更新
        if (onRedditDataReceived) {
          onRedditDataReceived(subredditsData);
        }

        // 通知工作流已触发
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
      message.error(errorMessage);
    } finally {
      setRedditLoading(false);
      // 清除进度状态（延迟3秒）
      setTimeout(() => {
        setRedditProgressStatus('');
      }, 3000);
    }
  };

  /**
   * 工作流表格列定义
   */
  const workflowColumns = [
    {
      title: t('informationDashboard.workflowPanel.workflowName'),
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Workflow) => (
        <Space>
          <span style={{ fontWeight: 500 }}>{text}</span>
          {record.description && (
            <Tooltip title={record.description}>
              <span style={{ color: '#1890ff', cursor: 'help' }}>ⓘ</span>
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: t('informationDashboard.workflowPanel.workflowStatus'),
      dataIndex: 'status',
      key: 'status',
      render: (status: WorkflowStatus) => (
        <Tag color={getWorkflowStatusColor(status)}>
          {status === 'active'
            ? t('informationDashboard.workflowPanel.status.active')
            : status === 'inactive'
              ? t('informationDashboard.workflowPanel.status.inactive')
              : t('informationDashboard.workflowPanel.status.error')}
        </Tag>
      ),
    },
    {
      title: t('informationDashboard.workflowPanel.nodeCount'),
      dataIndex: 'nodeCount',
      key: 'nodeCount',
      render: (count: number) => <span>{count || 0}</span>,
    },
    {
      title: t('informationDashboard.workflowPanel.lastExecution'),
      dataIndex: 'lastExecution',
      key: 'lastExecution',
      render: (lastExecution: string | null) =>
        lastExecution
          ? new Date(lastExecution).toLocaleString()
          : t('informationDashboard.workflowPanel.neverExecuted'),
    },
    {
      title: t('common.actions'),
      key: 'actions',
      render: (_, record: Workflow) => (
        <Space>
          <Tooltip
            title={t('informationDashboard.workflowPanel.triggerWorkflow')}
          >
            <Button
              type='primary'
              icon={<PlayCircleOutlined />}
              size='small'
              onClick={() => handleTriggerWorkflow(record)}
              disabled={record.status !== 'active'}
            >
              {t('informationDashboard.actions.trigger')}
            </Button>
          </Tooltip>
          <Tooltip title={t('informationDashboard.actions.viewDetails')}>
            <Button
              icon={<EyeOutlined />}
              size='small'
              onClick={() => {
                message.info(t('common.comingSoon'));
              }}
            >
              {t('informationDashboard.actions.details')}
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div className={className}>
      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('informationDashboard.statistics.totalWorkflows')}
              value={workflowStats?.totalWorkflows || 0}
              prefix={<SettingOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('informationDashboard.statistics.activeWorkflows')}
              value={workflowStats?.activeWorkflows || 0}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('informationDashboard.statistics.todayExecutions')}
              value={workflowStats?.todayExecutions || 0}
              prefix={<PlayCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('informationDashboard.workflowPanel.successRate')}
              value={workflowStats?.successRate || 0}
              precision={1}
              suffix='%'
              valueStyle={{
                color:
                  workflowStats?.successRate && workflowStats.successRate > 80
                    ? '#3f8600'
                    : '#cf1322',
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Reddit工作流卡片 */}
      <Card
        title={
          <Space>
            <RedditOutlined style={{ color: '#ff4500' }} />
            <span>Reddit 工作流</span>
          </Space>
        }
        extra={
          <Button
            type='primary'
            icon={redditLoading ? <LoadingOutlined /> : <ThunderboltOutlined />}
            onClick={handleRedditWorkflowStart}
            loading={redditLoading}
            disabled={redditLoading}
          >
            {redditLoading ? '获取中...' : '启动 Reddit 工作流'}
          </Button>
        }
        style={{ marginBottom: 16 }}
      >
        {redditError && (
          <Alert
            message='错误'
            description={redditError}
            type='error'
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {redditLoading && redditProgressStatus && (
          <div style={{ marginBottom: 16 }}>
            <Text type='secondary'>{redditProgressStatus}</Text>
            <Progress percent={50} status='active' style={{ marginTop: 8 }} />
          </div>
        )}

        {redditData && redditData.length > 0 ? (
          <List
            dataSource={redditData}
            renderItem={subreddit => (
              <List.Item>
                <Card
                  size='small'
                  title={
                    <Space>
                      <RedditOutlined style={{ color: '#ff4500' }} />
                      <Text strong>r/{subreddit.subreddit}</Text>
                      <Text type='secondary'>
                        ({subreddit.posts.length} 帖子)
                      </Text>
                    </Space>
                  }
                  style={{ width: '100%' }}
                >
                  <List
                    dataSource={subreddit.posts.slice(0, 5)} // 只显示前5个帖子
                    renderItem={post => (
                      <List.Item>
                        <List.Item.Meta
                          title={
                            <a
                              href={post.url}
                              target='_blank'
                              rel='noopener noreferrer'
                              style={{ color: '#1890ff' }}
                            >
                              <ExportOutlined style={{ marginRight: 4 }} />
                              {post.title}
                            </a>
                          }
                          description={
                            <Space>
                              <span>
                                <LikeOutlined style={{ marginRight: 4 }} />
                                {post.score} 点赞
                              </span>
                              <span>
                                <CommentOutlined style={{ marginRight: 4 }} />
                                {post.num_comments} 评论
                              </span>
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                  {subreddit.posts.length > 5 && (
                    <div style={{ textAlign: 'center', marginTop: 8 }}>
                      <Text type='secondary'>
                        还有 {subreddit.posts.length - 5} 个帖子...
                      </Text>
                    </div>
                  )}
                </Card>
              </List.Item>
            )}
          />
        ) : (
          !redditLoading && (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description='暂无 Reddit 数据，点击上方按钮启动工作流获取数据'
            />
          )
        )}
      </Card>

      {/* 工作流列表 */}
      <Card
        title={t('informationDashboard.workflowPanel.workflowList')}
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
          >
            {t('informationDashboard.actions.refresh')}
          </Button>
        }
      >
        <Table
          columns={workflowColumns}
          dataSource={workflows}
          rowKey='id'
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: total =>
              t('informationDashboard.workflowPanel.totalWorkflows', {
                count: total,
              }),
          }}
        />
      </Card>

      {/* 触发工作流模态框 */}
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
                  {t('informationDashboard.workflowPanel.workflowDescription')}:
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
                      ? t('informationDashboard.workflowPanel.status.inactive')
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
              label={t('informationDashboard.workflowPanel.waitForCompletion')}
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
    </div>
  );
};

export default WorkflowPanel;
