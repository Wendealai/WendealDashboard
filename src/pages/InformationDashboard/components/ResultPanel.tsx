/**
 * 结果展示面板组件
 * 显示工作流执行结果、Reddit数据和信息统计
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  List,
  Space,
  Tag,
  Typography,
  Divider,
  Badge,
  Alert,
  Empty,
  Spin,
  Row,
  Col,
  Statistic,
  Button,
  Tooltip,
  Avatar,
  Timeline,
  Progress,
} from 'antd';
import {
  RedditOutlined,
  LinkOutlined,
  MessageOutlined,
  LikeOutlined,
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  TrophyOutlined,
  FireOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useAppSelector } from '@/store/hooks';
import {
  selectInformationList,
  selectInformationStats,
  selectLoading,
} from '@/store/slices/informationDashboardSlice';
import type { Workflow, WorkflowExecution, InformationItem } from '../types';
import type { ParsedSubredditData } from '@/services/redditWebhookService';
import WorkflowResultTabs from '../../../components/InformationDashboard/WorkflowResultTabs';

const { Text, Title, Paragraph } = Typography;

// 添加紧凑样式
const compactStyles = `
  .compact-spacing .ant-list-item {
    padding: 8px 0 !important;
  }
  .compact-spacing .ant-card-body {
    padding: 12px !important;
  }
  .compact-spacing .ant-list-item-meta-title {
    margin-bottom: 4px !important;
  }
  .compact-spacing .ant-list-item-meta-description {
    margin-bottom: 0 !important;
  }
`;

// 注入样式
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = compactStyles;
  document.head.appendChild(styleElement);
}

/**
 * 结果展示面板组件属性接口
 */
interface ResultPanelProps {
  className?: string;
  selectedWorkflow?: Workflow | null;
  workflowExecution?: WorkflowExecution | null;
  redditData?: ParsedSubredditData[];
  loading?: boolean;
  workflowExecutions?: WorkflowExecution[];
  workflowRedditData?: Record<
    string,
    {
      data: ParsedSubredditData[];
      timestamp: string;
      workflowId: string;
    }
  >;
  getWorkflowRedditData?: (workflowId: string) => ParsedSubredditData[];
}

/**
 * 格式化时间戳
 */
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp * 1000);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * 格式化分数显示
 */
const formatScore = (score: number): string => {
  if (score >= 1000) {
    return `${(score / 1000).toFixed(1)}k`;
  }
  return score.toString();
};

/**
 * 获取热度等级
 */
const getHotLevel = (
  score: number
): { level: string; color: string; icon: React.ReactNode } => {
  if (score >= 1000) {
    return { level: '热门', color: '#ff4d4f', icon: <FireOutlined /> };
  } else if (score >= 500) {
    return { level: '受欢迎', color: '#fa8c16', icon: <TrophyOutlined /> };
  } else if (score >= 100) {
    return { level: '一般', color: '#1890ff', icon: <EyeOutlined /> };
  }
  return { level: '冷门', color: '#d9d9d9', icon: <EyeOutlined /> };
};

/**
 * 结果展示面板组件
 */
const ResultPanel: React.FC<ResultPanelProps> = ({
  className,
  selectedWorkflow,
  workflowExecution,
  redditData,
  loading = false,
  workflowExecutions = [],
  workflowRedditData = {},
  getWorkflowRedditData,
}) => {
  const { t } = useTranslation();
  const informationItems = useAppSelector(selectInformationList);
  const informationStats = useAppSelector(selectInformationStats);
  const storeLoading = useAppSelector(selectLoading);

  // 组件状态已移至WorkflowResultTabs组件中管理

  /**
   * 渲染Reddit数据展示
   */
  const renderRedditData = () => {
    if (!redditData || redditData.length === 0) {
      return (
        <Empty
          image={<RedditOutlined style={{ fontSize: 48, color: '#ff4500' }} />}
          description={
            <Space direction='vertical'>
              <Text>暂无Reddit数据</Text>
              <Text type='secondary'>请在左侧启动Reddit工作流获取数据</Text>
            </Space>
          }
        />
      );
    }

    // redditData已经是按子版块分组的数据
    const groupedData = redditData.reduce(
      (acc, subredditData) => {
        const subreddit = subredditData.subreddit;
        acc[subreddit] = subredditData.posts;
        return acc;
      },
      {} as Record<string, any[]>
    );

    const subredditCount = redditData.length;
    const totalPosts = redditData.reduce(
      (total, subredditData) => total + subredditData.posts.length,
      0
    );
    const totalScore = redditData.reduce(
      (total, subredditData) =>
        total +
        subredditData.posts.reduce(
          (subTotal, post) => subTotal + (post.score || 0),
          0
        ),
      0
    );

    return (
      <Space direction='vertical' style={{ width: '100%' }} size={8}>
        {/* Reddit数据统计 */}
        <Row gutter={8}>
          <Col span={8}>
            <Statistic
              title='子版块数量'
              value={subredditCount}
              prefix={<RedditOutlined />}
              valueStyle={{ color: '#ff4500' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title='总帖子数'
              value={totalPosts}
              prefix={<MessageOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title='总热度'
              value={totalScore}
              prefix={<LikeOutlined />}
              valueStyle={{ color: '#52c41a' }}
              formatter={value => formatScore(Number(value))}
            />
          </Col>
        </Row>

        <Divider />

        {/* Reddit帖子列表 - 按子版块分组 */}
        {Object.entries(groupedData).map(([subreddit, posts]) => (
          <Card
            key={subreddit}
            size='small'
            title={
              <Space>
                <Avatar
                  style={{ backgroundColor: '#ff4500' }}
                  icon={<RedditOutlined />}
                  size='small'
                />
                <Text strong>r/{subreddit}</Text>
                <Badge count={posts.length} showZero color='#ff4500' />
              </Space>
            }
            className='compact-spacing'
          >
            <List
              size='small'
              dataSource={posts}
              renderItem={post => {
                const hotLevel = getHotLevel(post.score || 0);
                return (
                  <List.Item
                    className='compact-spacing'
                    actions={[
                      <Tooltip title='查看原帖'>
                        <Button
                          type='text'
                          icon={<LinkOutlined />}
                          onClick={() => window.open(post.url, '_blank')}
                          size='small'
                        />
                      </Tooltip>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <Space>
                          <a
                            href={post.url}
                            target='_blank'
                            rel='noopener noreferrer'
                            style={{
                              fontSize: 14,
                              fontWeight: 500,
                              color: '#1890ff',
                              textDecoration: 'none',
                            }}
                            onMouseEnter={e =>
                              (e.target.style.textDecoration = 'underline')
                            }
                            onMouseLeave={e =>
                              (e.target.style.textDecoration = 'none')
                            }
                          >
                            {post.title}
                          </a>
                          {post.category && (
                            <Tag color='blue' size='small'>
                              {post.category}
                            </Tag>
                          )}
                        </Space>
                      }
                      description={
                        <Space size={8}>
                          <Space size={4}>
                            <UserOutlined style={{ color: '#8c8c8c' }} />
                            <Text type='secondary' style={{ fontSize: 11 }}>
                              {post.author}
                            </Text>
                          </Space>
                          <Space size={4}>
                            <ClockCircleOutlined style={{ color: '#8c8c8c' }} />
                            <Text type='secondary' style={{ fontSize: 11 }}>
                              {post.created}
                            </Text>
                          </Space>
                        </Space>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </Card>
        ))}
      </Space>
    );
  };

  /**
   * 渲染工作流执行结果
   */
  const renderWorkflowExecution = () => {
    if (!selectedWorkflow) {
      return (
        <Empty
          description={
            <Space direction='vertical'>
              <Text>未选择工作流</Text>
              <Text type='secondary'>请在左侧选择一个工作流查看详情</Text>
            </Space>
          }
        />
      );
    }

    return (
      <Space direction='vertical' style={{ width: '100%' }} size={16}>
        {/* 工作流信息 */}
        <Card size='small' title='工作流信息'>
          <Space direction='vertical' style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text strong>名称:</Text>
              <Text>{selectedWorkflow.name}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text strong>状态:</Text>
              <Tag
                color={
                  selectedWorkflow.status === 'active' ? 'green' : 'default'
                }
              >
                {selectedWorkflow.status === 'active' ? '活跃' : '非活跃'}
              </Tag>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text strong>节点数:</Text>
              <Text>{selectedWorkflow.nodeCount || 0}</Text>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text strong>最后执行:</Text>
              <Text>
                {selectedWorkflow.lastExecution
                  ? new Date(selectedWorkflow.lastExecution).toLocaleString()
                  : '从未执行'}
              </Text>
            </div>
            {selectedWorkflow.description && (
              <div>
                <Text strong>描述:</Text>
                <Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                  {selectedWorkflow.description}
                </Paragraph>
              </div>
            )}
          </Space>
        </Card>

        {/* 执行历史 */}
        <Card size='small' title='执行历史'>
          {workflowExecution ? (
            <Timeline
              items={[
                {
                  dot: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
                  children: (
                    <Space direction='vertical' size={4}>
                      <Text strong>执行完成</Text>
                      <Text type='secondary' style={{ fontSize: 12 }}>
                        执行ID: {workflowExecution.executionId}
                      </Text>
                      <Text type='secondary' style={{ fontSize: 12 }}>
                        {new Date(workflowExecution.startTime).toLocaleString()}
                      </Text>
                    </Space>
                  ),
                },
              ]}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description='暂无执行记录'
              style={{ margin: 0 }}
            />
          )}
        </Card>
      </Space>
    );
  };

  /**
   * 渲染信息统计
   */
  const renderInformationStats = () => {
    return (
      <Space direction='vertical' style={{ width: '100%' }} size={16}>
        {/* 信息统计 */}
        <Row gutter={16}>
          <Col span={12}>
            <Statistic
              title='总信息数'
              value={informationStats?.totalItems || 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title='今日新增'
              value={informationStats?.todayItems || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
        </Row>

        <Divider />

        {/* 最新信息列表 */}
        <Card size='small' title='最新信息'>
          <Spin spinning={storeLoading}>
            {informationItems && informationItems.length > 0 ? (
              <List
                dataSource={informationItems.slice(0, 10)}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <Text strong style={{ fontSize: 14 }}>
                          {item.title}
                        </Text>
                      }
                      description={
                        <Space direction='vertical' size={4}>
                          <Text type='secondary' style={{ fontSize: 12 }}>
                            {item.description}
                          </Text>
                          <Space size={8}>
                            <Tag color='blue' size='small'>
                              {item.category}
                            </Tag>
                            <Tag
                              color={
                                item.priority === 'high'
                                  ? 'red'
                                  : item.priority === 'medium'
                                    ? 'orange'
                                    : 'default'
                              }
                              size='small'
                            >
                              {item.priority === 'high'
                                ? '高'
                                : item.priority === 'medium'
                                  ? '中'
                                  : '低'}
                            </Tag>
                            <Text type='secondary' style={{ fontSize: 11 }}>
                              {new Date(item.createdAt).toLocaleDateString()}
                            </Text>
                          </Space>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description='暂无信息数据'
                style={{ margin: 0 }}
              />
            )}
          </Spin>
        </Card>
      </Space>
    );
  };

  return (
    <div
      className={`${className} compact-layout`}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      {/* 使用新的工作流结果标签页组件 */}
      <WorkflowResultTabs
        workflowExecutions={workflowExecutions}
        redditData={redditData}
        workflowRedditData={workflowRedditData}
        getWorkflowRedditData={getWorkflowRedditData}
        loading={loading}
        renderRedditData={renderRedditData}
        renderWorkflowExecution={renderWorkflowExecution}
        renderInformationStats={renderInformationStats}
      />
    </div>
  );
};

export default ResultPanel;
