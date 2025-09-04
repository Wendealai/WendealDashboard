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
import type { ParsedSubredditData } from '@/services/redditWebhookService';

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
  ({ className, selectedWorkflow, redditData, loading = false }) => {
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
     * 渲染Reddit数据展示
     */
    const renderRedditData = useCallback(() => {
      if (!hasRedditData) {
        return (
          <Empty
            image={
              <RedditOutlined style={{ fontSize: 48, color: '#ff4500' }} />
            }
            description={
              <Space direction='vertical'>
                <Text>暂无Reddit数据</Text>
                <Text type='secondary'>请在左侧启动Reddit工作流获取数据</Text>
              </Space>
            }
          />
        );
      }

      // 使用预计算的分组数据
      const groupedData = groupedRedditData;

      return (
        <Space direction='vertical' style={{ width: '100%' }} size={8}>
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
                            onClick={() => handleLinkClick(post.url)}
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
                              onMouseEnter={handleMouseEnter}
                              onMouseLeave={handleMouseLeave}
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
                              <ClockCircleOutlined
                                style={{ color: '#8c8c8c' }}
                              />
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
        {/* 右侧展示区域容器 - 固定高度，独立滚动 */}
        <Card
          style={{
            height: 'calc(100vh - 180px)', // 固定高度，适应屏幕大小
            display: 'flex',
            flexDirection: 'column',
            margin: 0,
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            overflow: 'hidden',
          }}
          styles={{
            body: {
              padding: 0,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            },
          }}
        >
          {/* 内容区域 - 独立滚动条 */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: '16px',
            }}
          >
            {/* 使用新的工作流结果标签页组件 */}
            {renderRedditData()}
          </div>
        </Card>
      </div>
    );
  }
);

export default ResultPanel;

// 显示名称用于调试
ResultPanel.displayName = 'ResultPanel';
