/**
 * 结果展示面板组件
 * 显示工作流执行结果、Reddit数据和信息统计
 */

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  List,
  Space,
  Typography,
  Badge,
  Alert,
  Empty,
  Spin,
  Button,
  Tooltip,
  Avatar,
  Progress,
  Tag,
  Row,
  Col,
  Statistic,
  Divider,
} from 'antd';
import {
  RedditOutlined,
  LinkOutlined,
  MessageOutlined,
  LikeOutlined,
  UserOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  TrophyOutlined,
  FireOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useAppSelector } from '@/store/hooks';
import { selectLoading } from '@/store/slices/informationDashboardSlice';
import type { Workflow, InformationItem } from '../types';
import type {
  ParsedSubredditData,
  RedditWorkflowResponse,
  RedditWorkflowPost,
  RedditWorkflowSubreddit
} from '@/services/redditWebhookService';

const { Text, Title } = Typography;

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
  redditData?: ParsedSubredditData[];
  redditWorkflowData?: RedditWorkflowResponse;
  loading?: boolean;
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
const ResultPanel: React.FC<ResultPanelProps> = memo(
  ({ className, selectedWorkflow, redditData, redditWorkflowData, loading = false }) => {
    const { t } = useTranslation();
    const storeLoading = useAppSelector(selectLoading);

    // 使用useMemo优化数据处理
    const groupedRedditData = useMemo(() => {
      if (!redditData || redditData.length === 0) {
        return {};
      }

      return redditData.reduce(
        (acc, subredditData) => {
          const subreddit = subredditData.subreddit;
          acc[subreddit] = subredditData.posts;
          return acc;
        },
        {} as Record<string, any[]>
      );
    }, [redditData]);

    const hasRedditData = useMemo(() => {
      return redditData && redditData.length > 0;
    }, [redditData]);

    // 组件状态已移至WorkflowResultTabs组件中管理

    /**
     * 处理外部链接点击
     */
    const handleLinkClick = useCallback((url: string) => {
      window.open(url, '_blank');
    }, []);

    /**
     * 处理鼠标悬停效果
     */
    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.currentTarget.style.textDecoration = 'underline';
      },
      []
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.currentTarget.style.textDecoration = 'none';
      },
      []
    );

    /**
     * 渲染Reddit数据展示（新格式）
     */
    const renderRedditWorkflowData = useCallback(() => {
      if (!redditWorkflowData) {
        return null;
      }

      if (!redditWorkflowData.success) {
        return (
          <Alert
            message="获取Reddit数据失败"
            description={redditWorkflowData.error || "未知错误"}
            type="error"
            showIcon
          />
        );
      }

      const { headerInfo, summary, subreddits } = redditWorkflowData;

      return (
        <Space direction='vertical' style={{ width: '100%' }} size={16}>
          {/* 标题信息 */}
          <Card size='small'>
            <Space direction='vertical' size={8}>
              <Title level={4} style={{ margin: 0, color: '#ff4500' }}>
                {headerInfo.title}
              </Title>
              <Text type='secondary'>{headerInfo.subtitle}</Text>
              <Space size={16}>
                <Tag>Time Range: {headerInfo.timeRange}</Tag>
                <Tag>Total Posts: {headerInfo.totalPosts}</Tag>
              </Space>
            </Space>
          </Card>

          {/* 汇总统计 */}
          <Card size='small' title='数据汇总'>
            <Row gutter={[16, 8]}>
              <Col xs={12} sm={6}>
                <Statistic
                  title="活跃社区"
                  value={summary.totalSubreddits}
                  suffix="个"
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="总帖子数"
                  value={summary.totalPosts}
                  suffix="篇"
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="总分数"
                  value={summary.totalScore}
                  suffix="分"
                />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic
                  title="总评论数"
                  value={summary.totalComments}
                  suffix="条"
                />
              </Col>
            </Row>
            <Divider />
            <Space size={8} wrap>
              <Text>热门社区:</Text>
              {summary.categories.map(category => (
                <Tag key={category}>{category}</Tag>
              ))}
            </Space>
          </Card>

          {/* 社区列表 */}
          <Space direction='vertical' style={{ width: '100%' }} size={8}>
            {subreddits.map((subreddit, index) => {
              const rowIndex = Math.floor(index / 2);
              const isFirstInRow = index % 2 === 0;

              if (isFirstInRow) {
                const nextSubreddit = subreddits[index + 1];
                const rowItems = nextSubreddit ? [subreddit, nextSubreddit] : [subreddit];

                return (
                  <Row
                    key={`row-${rowIndex}`}
                    gutter={[8, 8]}
                    style={{ width: '100%' }}
                  >
                    {rowItems.map((sub) => (
                      <Col
                        key={sub.name}
                        xs={24}
                        sm={24}
                        md={12}
                        lg={12}
                        xl={12}
                        style={{ display: 'flex' }}
                      >
                        {renderSubredditCard(sub)}
                      </Col>
                    ))}
                  </Row>
                );
              }

              return null; // Skip odd-indexed items as they're handled in pairs
            })}
          </Space>
        </Space>
      );
    }, [redditWorkflowData]);

    /**
     * 渲染单个社区卡片
     */
    const renderSubredditCard = useCallback((subreddit: RedditWorkflowSubreddit) => {
      return (
        <Card
          size='small'
          title={
            <Space>
              <span style={{ fontSize: '18px' }}>{subreddit.icon}</span>
              <Text strong>{subreddit.displayName}</Text>
              <Badge count={subreddit.stats.totalPosts} showZero />
              <Tag size='small'>{subreddit.category}</Tag>
            </Space>
          }
          className='compact-spacing'
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            minHeight: '250px',
          }}
          styles={{
            body: {
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: '8px',
            },
          }}
        >
          {/* 社区统计 */}
          <div style={{ marginBottom: '8px' }}>
            <Space size={8} wrap>
              <Text type='secondary' style={{ fontSize: '12px' }}>
                平均分数: {subreddit.stats.averageScore}
              </Text>
              <Text type='secondary' style={{ fontSize: '12px' }}>
                总评论: {subreddit.stats.totalComments}
              </Text>
            </Space>
          </div>

          {/* 帖子列表 */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <List
              size='small'
              dataSource={subreddit.posts}
              style={{ height: '100%' }}
              renderItem={(post: RedditWorkflowPost) => {
                const hotLevel = getHotLevel(post.score);
                return (
                  <List.Item
                    className='compact-spacing'
                    style={{ padding: '4px 0' }}
                    actions={[
                      <Tooltip title='查看原帖' key='link'>
                        <Button
                          type='text'
                          icon={<LinkOutlined />}
                          onClick={() => handleLinkClick(post.redditUrl || post.url || '')}
                          size='small'
                          style={{ padding: '2px 4px' }}
                        />
                      </Tooltip>,
                    ]}
                  >
                    <List.Item.Meta
                      title={
                        <div style={{ marginBottom: '2px' }}>
                          <a
                            href={post.redditUrl || post.url || '#'}
                            target='_blank'
                            rel='noopener noreferrer'
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: '#1890ff',
                              textDecoration: 'none',
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                          >
                            {post.title}
                          </a>
                        </div>
                      }
                      description={
                        <Space size={6} style={{ fontSize: '11px' }}>
                          <Space size={2}>
                            <UserOutlined
                              style={{
                                color: '#8c8c8c',
                                fontSize: '11px',
                              }}
                            />
                            <Text
                              type='secondary'
                              style={{ fontSize: '11px' }}
                            >
                              {post.author}
                            </Text>
                          </Space>
                          <Space size={2}>
                            <LikeOutlined
                              style={{
                                color: '#8c8c8c',
                                fontSize: '11px',
                              }}
                            />
                            <Text
                              type='secondary'
                              style={{ fontSize: '11px' }}
                            >
                              {post.scoreFormatted}
                            </Text>
                          </Space>
                          <Space size={2}>
                            <MessageOutlined
                              style={{
                                color: '#8c8c8c',
                                fontSize: '11px',
                              }}
                            />
                            <Text
                              type='secondary'
                              style={{ fontSize: '11px' }}
                            >
                              {post.commentsFormatted}
                            </Text>
                          </Space>
                        </Space>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </div>
        </Card>
      );
    }, [handleLinkClick, handleMouseEnter, handleMouseLeave]);

    /**
     * 渲染Reddit数据展示（旧格式）
     */
    const renderRedditData = useCallback(() => {
      if (!hasRedditData) {
        return (
          <div
            className="reddit-empty-container"
            style={{
              height: '120px',
              maxHeight: '120px',
              minHeight: '120px',
              overflow: 'visible',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 0',
              boxSizing: 'border-box'
            }}
          >
            <Empty
              image={
                <RedditOutlined style={{ fontSize: 32, color: '#666666' }} />
              }
              description={
                <Space direction='vertical' size={2}>
                  <Text style={{ fontSize: '13px', margin: 0 }}>No Reddit data available</Text>
                  <Text type='secondary' style={{ fontSize: '12px', margin: 0 }}>Please start the Reddit workflow on the left to fetch data</Text>
                </Space>
              }
            />
          </div>
        );
      }

      // 使用预计算的分组数据
      const groupedData = groupedRedditData;

      const subredditEntries = Object.entries(groupedData);
      const rows = [];
      for (let i = 0; i < subredditEntries.length; i += 2) {
        const rowItems = subredditEntries.slice(i, i + 2);
        rows.push(rowItems);
      }

      return (
        <Space direction='vertical' style={{ width: '100%' }} size={8}>
          {rows.map((row, rowIndex) => (
            <Row
              key={`row-${rowIndex}`}
              gutter={[8, 8]}
              style={{ width: '100%' }}
            >
              {row.map(([subreddit, posts]) => (
                <Col
                  key={subreddit}
                  xs={24}
                  sm={24}
                  md={12}
                  lg={12}
                  xl={12}
                  style={{ display: 'flex' }}
                >
                  <Card
                    size='small'
                    title={
                      <Space>
                        <Avatar
                          style={{ backgroundColor: '#666666' }}
                          icon={<RedditOutlined />}
                          size='small'
                        />
                        <Text strong>r/{subreddit}</Text>
                        <Badge count={posts.length} showZero color='#666666' />
                      </Space>
                    }
                    className='compact-spacing'
                    style={{
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      maxHeight: '400px',
                    }}
                    styles={{
                      body: {
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '8px',
                        maxHeight: '320px',
                        overflow: 'auto',
                      },
                    }}
                  >
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <List
                        size='small'
                        dataSource={posts.slice(0, 5)} // 限制最多显示5条帖子
                        style={{ height: '100%' }}
                        renderItem={post => {
                          const hotLevel = getHotLevel(post.score || 0);
                          return (
                            <List.Item
                              className='compact-spacing'
                              style={{ padding: '4px 0' }}
                              actions={[
                                <Tooltip title='查看原帖' key='link'>
                                  <Button
                                    type='text'
                                    icon={<LinkOutlined />}
                                    onClick={() => handleLinkClick(post.url)}
                                    size='small'
                                    style={{ padding: '2px 4px' }}
                                  />
                                </Tooltip>,
                              ]}
                            >
                              <List.Item.Meta
                                title={
                                  <div style={{ marginBottom: '2px' }}>
                                    <a
                                      href={post.url}
                                      target='_blank'
                                      rel='noopener noreferrer'
                                      style={{
                                        fontSize: 13,
                                        fontWeight: 500,
                                        color: '#666666',
                                        textDecoration: 'none',
                                        display: 'block',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}
                                      onMouseEnter={handleMouseEnter}
                                      onMouseLeave={handleMouseLeave}
                                    >
                                      {post.title}
                                    </a>
                                    {post.category && (
                                      <Tag
                                        size='small'
                                        style={{
                                          marginTop: '2px',
                                          backgroundColor: '#f0f0f0',
                                          color: '#666666',
                                          borderColor: '#cccccc'
                                        }}
                                      >
                                        {post.category}
                                      </Tag>
                                    )}
                                  </div>
                                }
                                description={
                                  <Space size={6} style={{ fontSize: '11px' }}>
                                    <Space size={2}>
                                      <UserOutlined
                                        style={{
                                          color: '#8c8c8c',
                                          fontSize: '11px',
                                        }}
                                      />
                                      <Text
                                        type='secondary'
                                        style={{ fontSize: '11px' }}
                                      >
                                        {post.author}
                                      </Text>
                                    </Space>
                                    <Space size={2}>
                                      <ClockCircleOutlined
                                        style={{
                                          color: '#8c8c8c',
                                          fontSize: '11px',
                                        }}
                                      />
                                      <Text
                                        type='secondary'
                                        style={{ fontSize: '11px' }}
                                      >
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
                      {posts.length > 5 && (
                        <div style={{ textAlign: 'center', marginTop: '8px', padding: '4px 0' }}>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            {`And ${posts.length - 5} more...`}
                          </Text>
                        </div>
                      )}
                    </div>
                  </Card>
                </Col>
              ))}
            </Row>
          ))}
        </Space>
      );
    }, [
      hasRedditData,
      groupedRedditData,
      handleLinkClick,
      handleMouseEnter,
      handleMouseLeave,
    ]);

    /**
     * 渲染工作流执行结果
     */

    return (
      <div
        className={`${className} compact-layout`}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        {/* 内容区域 - 直接显示，无额外包装 */}
        <div
          style={{
            flex: 1,
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* 优先使用新的 Reddit 工作流数据格式 */}
          {redditWorkflowData ? renderRedditWorkflowData() : renderRedditData()}
        </div>
      </div>
    );
  }
);

export default ResultPanel;

// 显示名称用于调试
ResultPanel.displayName = 'ResultPanel';
