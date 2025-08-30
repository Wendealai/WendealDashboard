/**
 * 工作流侧边栏组件
 * 提供工作流选择、控制和状态监控功能
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  List,
  Button,
  Space,
  Tag,
  Tooltip,
  Typography,
  Divider,
  Badge,
  Alert,
  Progress,
  Empty,
  Spin,
} from 'antd';
import {
  PlayCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  RedditOutlined,
  LoadingOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchWorkflows,
  triggerWorkflow,
  selectWorkflowsList,
  selectWorkflowStats,
  selectLoading,
} from '@/store/slices/informationDashboardSlice';
import { workflowService } from '@/services/workflowService';
import type { Workflow, WorkflowStatus } from '../types';
import type { ParsedSubredditData } from '@/services/redditWebhookService';
import { redditWebhookService } from '@/services/redditWebhookService';

const { Text, Title } = Typography;

/**
 * 工作流侧边栏组件属性接口
 */
interface WorkflowSidebarProps {
  className?: string;
  onWorkflowSelect?: (workflow: Workflow | null) => void;
  onWorkflowTriggered?: (workflowId: string, executionId: string) => void;
  onRedditDataReceived?: (data: ParsedSubredditData[]) => void;
}

/**
 * 获取工作流状态颜色
 */
const getWorkflowStatusColor = (status: WorkflowStatus): string => {
  switch (status) {
    case 'active':
      return '#52c41a';
    case 'inactive':
      return '#d9d9d9';
    case 'error':
      return '#ff4d4f';
    default:
      return '#d9d9d9';
  }
};

/**
 * 工作流侧边栏组件
 */
const WorkflowSidebar: React.FC<WorkflowSidebarProps> = ({
  className,
  onWorkflowSelect,
  onWorkflowTriggered,
  onRedditDataReceived,
}) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const workflows = useAppSelector(selectWorkflowsList);
  const workflowStats = useAppSelector(selectWorkflowStats);
  const loading = useAppSelector(selectLoading);

  // 组件状态
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
    null
  );
  const [redditLoading, setRedditLoading] = useState(false);
  const [redditProgressStatus, setRedditProgressStatus] = useState('');
  const [redditError, setRedditError] = useState<string | null>(null);
  const [lastUpdatedTimes, setLastUpdatedTimes] = useState<
    Record<string, Date>
  >(() => {
    // 从localStorage加载Last Updated时间
    try {
      const savedTimes = localStorage.getItem('lastUpdatedTimes');
      if (savedTimes) {
        const parsed = JSON.parse(savedTimes);
        // 将字符串转换回Date对象
        const converted: Record<string, Date> = {};
        Object.keys(parsed).forEach(key => {
          converted[key] = new Date(parsed[key]);
        });
        return converted;
      }
      return {};
    } catch (error) {
      console.error('加载Last Updated时间失败:', error);
      return {};
    }
  });

  /**
   * 初始化加载工作流列表
   */
  useEffect(() => {
    dispatch(fetchWorkflows());
  }, [dispatch]);

  /**
   * 持久化Last Updated时间到localStorage
   */
  useEffect(() => {
    try {
      localStorage.setItem(
        'lastUpdatedTimes',
        JSON.stringify(lastUpdatedTimes)
      );
    } catch (error) {
      console.error('保存Last Updated时间失败:', error);
    }
  }, [lastUpdatedTimes]);

  /**
   * 处理工作流选择
   */
  const handleWorkflowSelect = (workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    onWorkflowSelect?.(workflow);
  };

  /**
   * 处理工作流触发
   */
  const handleTriggerWorkflow = async (workflow: Workflow) => {
    try {
      const result = await dispatch(
        triggerWorkflow({
          workflowId: workflow.id,
          data: {},
          waitTill: 'EXECUTED',
        })
      ).unwrap();

      // 更新Last Updated时间
      setLastUpdatedTimes(prev => ({
        ...prev,
        [workflow.id]: new Date(),
      }));

      onWorkflowTriggered?.(workflow.id, result.executionId);
    } catch (error) {
      console.error('工作流触发失败:', error);
    }
  };

  /**
   * 处理Reddit工作流启动 - 使用redditWebhookService解析数据
   */
  const handleRedditWorkflowStart = async () => {
    setRedditLoading(true);
    setRedditError(null);
    setRedditProgressStatus('正在连接Reddit Webhook...');

    try {
      // 调用真实的Reddit webhook
      const response = await fetch(
        'https://n8n.wendealai.com/webhook/reddithot'
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setRedditProgressStatus('正在解析数据...');
      const data = await response.json();

      console.log('Webhook原始响应:', data);

      // 使用redditWebhookService处理webhook响应
      const processedData = redditWebhookService.processWebhookResponse(data);

      console.log('处理后的数据:', {
        postsCount: processedData.posts?.length || 0,
        subredditsCount: processedData.subreddits?.length || 0,
      });

      // 转换为WorkflowSidebar期望的格式
      const parsedData: ParsedSubredditData[] = processedData.subreddits.map(
        subreddit => ({
          subreddit: subreddit.name,
          category: '热门',
          posts: subreddit.posts.map(post => ({
            title: post.title,
            score: post.upvotes,
            comments: post.comments,
            url: post.url,
            author: 'u/reddit_user',
            created: new Date().toLocaleString('zh-CN'),
          })),
        })
      );

      console.log('转换后的数据:', {
        subredditsCount: parsedData.length,
        totalPosts: parsedData.reduce((sum, sub) => sum + sub.posts.length, 0),
      });

      setRedditProgressStatus('数据获取完成!');

      // 更新Reddit工作流的Last Updated时间
      setLastUpdatedTimes(prev => ({
        ...prev,
        'reddit-workflow': new Date(),
      }));

      onRedditDataReceived?.(parsedData);
    } catch (error) {
      console.error('Reddit工作流执行失败:', error);
      setRedditError('Reddit数据获取失败，请检查网络连接或稍后重试');
    } finally {
      setRedditLoading(false);
      setTimeout(() => {
        setRedditProgressStatus('');
      }, 2000);
    }
  };

  /**
   * 刷新工作流列表
   */
  const handleRefresh = () => {
    dispatch(fetchWorkflows());
  };

  return (
    <div
      className={`${className} compact-layout`}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      {/* 工作流统计 */}
      <Card
        size='small'
        className='compact-spacing'
        style={{ marginBottom: 8 }}
      >
        <Space direction='vertical' style={{ width: '100%' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text strong>
              {t('informationDashboard.statistics.totalWorkflows')}
            </Text>
            <Badge
              count={(workflowStats?.totalWorkflows || 0) + 1}
              showZero
              color='#1890ff'
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text strong>
              {t('informationDashboard.statistics.activeWorkflows')}
            </Text>
            <Badge
              count={(workflowStats?.activeWorkflows || 0) + 1}
              showZero
              color='#52c41a'
            />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Text strong>
              {t('informationDashboard.statistics.todayExecutions')}
            </Text>
            <Badge
              count={workflowStats?.todayExecutions || 0}
              showZero
              color='#722ed1'
            />
          </div>
        </Space>
      </Card>

      {/* 工作流列表 */}
      <Card
        size='small'
        title={
          <Space>
            <SettingOutlined />
            <span>{t('informationDashboard.workflowPanel.workflowList')}</span>
          </Space>
        }
        extra={
          <Tooltip title={t('informationDashboard.actions.refresh')}>
            <Button
              type='text'
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              loading={loading}
              size='small'
            />
          </Tooltip>
        }
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        bodyStyle={{ flex: 1, padding: 0 }}
      >
        <Spin spinning={loading}>
          {/* Reddit工作流 */}
          <List.Item
            style={{
              padding: '4px 8px',
              cursor: 'pointer',
              backgroundColor:
                selectedWorkflow?.id === 'reddit-workflow'
                  ? '#e6f7ff'
                  : 'transparent',
              borderLeft:
                selectedWorkflow?.id === 'reddit-workflow'
                  ? '3px solid #1890ff'
                  : '3px solid transparent',
            }}
            onClick={() =>
              handleWorkflowSelect({
                id: 'reddit-workflow',
                name: 'Reddit 热门帖子',
                description: '获取Reddit热门帖子数据',
                status: 'active' as WorkflowStatus,
                nodeCount: 3,
                lastExecution: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              })
            }
          >
            <List.Item.Meta
              title={
                <Space>
                  <RedditOutlined style={{ color: '#ff4500' }} />
                  <Text strong style={{ fontSize: 14 }}>
                    Reddit 热门帖子
                  </Text>
                  <Tag color='#52c41a' size='small'>
                    active
                  </Tag>
                </Space>
              }
              description={
                <Space direction='vertical' size={4} style={{ width: '100%' }}>
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    获取Reddit热门帖子数据
                  </Text>
                  <Space size={8}>
                    <Text type='secondary' style={{ fontSize: 11 }}>
                      <SettingOutlined style={{ marginRight: 2 }} />3 节点
                    </Text>
                    <Text type='secondary' style={{ fontSize: 11 }}>
                      <ClockCircleOutlined style={{ marginRight: 2 }} />
                      {new Date().toLocaleDateString()}
                    </Text>
                  </Space>
                  {redditError && (
                    <Alert
                      message={redditError}
                      type='error'
                      size='small'
                      closable
                      style={{ marginTop: 4, fontSize: 10 }}
                      onClose={() => setRedditError(null)}
                    />
                  )}
                  {redditProgressStatus && (
                    <div style={{ marginTop: 4 }}>
                      <Text type='secondary' style={{ fontSize: 10 }}>
                        {redditProgressStatus}
                      </Text>
                      <Progress
                        percent={redditLoading ? undefined : 100}
                        status={redditLoading ? 'active' : 'success'}
                        size='small'
                        showInfo={false}
                        style={{ marginTop: 2 }}
                      />
                    </div>
                  )}
                  <Space
                    direction='vertical'
                    size={2}
                    style={{ width: '100%' }}
                  >
                    {lastUpdatedTimes['reddit-workflow'] && (
                      <Text type='secondary' style={{ fontSize: 11 }}>
                        <ClockCircleOutlined style={{ marginRight: 2 }} />
                        Last Updated:{' '}
                        {lastUpdatedTimes['reddit-workflow'].toLocaleString(
                          'zh-CN'
                        )}
                      </Text>
                    )}
                    <Button
                      type='primary'
                      size='small'
                      icon={
                        redditLoading ? (
                          <LoadingOutlined />
                        ) : (
                          <ThunderboltOutlined />
                        )
                      }
                      loading={redditLoading}
                      onClick={e => {
                        e.stopPropagation();
                        handleRedditWorkflowStart();
                      }}
                      style={{ marginTop: 4 }}
                    >
                      {redditLoading ? '获取中...' : '启动 Reddit 工作流'}
                    </Button>
                  </Space>
                </Space>
              }
            />
          </List.Item>

          {/* 其他工作流 */}
          {workflows && workflows.length > 0 ? (
            <List
              dataSource={workflows.filter(w => w.name !== '数据同步工作流')}
              renderItem={workflow => (
                <List.Item
                  style={{
                    padding: '4px 8px',
                    cursor: 'pointer',
                    backgroundColor:
                      selectedWorkflow?.id === workflow.id
                        ? '#e6f7ff'
                        : 'transparent',
                    borderLeft:
                      selectedWorkflow?.id === workflow.id
                        ? '3px solid #1890ff'
                        : '3px solid transparent',
                  }}
                  onClick={() => handleWorkflowSelect(workflow)}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <Text strong style={{ fontSize: 14 }}>
                          {workflow.name}
                        </Text>
                        <Tag
                          color={getWorkflowStatusColor(workflow.status)}
                          size='small'
                        >
                          {workflow.status === 'active'
                            ? t(
                                'informationDashboard.workflowPanel.status.active'
                              )
                            : workflow.status === 'inactive'
                              ? t(
                                  'informationDashboard.workflowPanel.status.inactive'
                                )
                              : t(
                                  'informationDashboard.workflowPanel.status.error'
                                )}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space
                        direction='vertical'
                        size={4}
                        style={{ width: '100%' }}
                      >
                        <Text type='secondary' style={{ fontSize: 12 }}>
                          {workflow.description || t('common.noDescription')}
                        </Text>
                        <Space size={8}>
                          <Text type='secondary' style={{ fontSize: 11 }}>
                            <SettingOutlined style={{ marginRight: 2 }} />
                            {workflow.nodeCount || 0} 节点
                          </Text>
                          <Text type='secondary' style={{ fontSize: 11 }}>
                            <ClockCircleOutlined style={{ marginRight: 2 }} />
                            {workflow.lastExecution
                              ? new Date(
                                  workflow.lastExecution
                                ).toLocaleDateString()
                              : t(
                                  'informationDashboard.workflowPanel.neverExecuted'
                                )}
                          </Text>
                        </Space>
                        {lastUpdatedTimes[workflow.id] && (
                          <Text type='secondary' style={{ fontSize: 11 }}>
                            <ClockCircleOutlined style={{ marginRight: 2 }} />
                            Last Updated:{' '}
                            {lastUpdatedTimes[workflow.id].toLocaleString(
                              'zh-CN'
                            )}
                          </Text>
                        )}
                        <Button
                          type='primary'
                          size='small'
                          icon={<PlayCircleOutlined />}
                          onClick={e => {
                            e.stopPropagation();
                            handleTriggerWorkflow(workflow);
                          }}
                          disabled={workflow.status !== 'active'}
                          style={{ marginTop: 4 }}
                        >
                          {t('informationDashboard.actions.trigger')}
                        </Button>
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <div style={{ padding: 16 }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={t(
                  'informationDashboard.workflowPanel.noWorkflows'
                )}
                style={{ margin: 0 }}
              />
            </div>
          )}
        </Spin>
      </Card>
    </div>
  );
};

export default WorkflowSidebar;
