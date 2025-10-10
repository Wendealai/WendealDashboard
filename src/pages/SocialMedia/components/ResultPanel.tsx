/**
 * Social Media Result Panel Component
 * Complete copy of Information Dashboard ResultPanel
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Typography,
  Space,
  Avatar,
  Badge,
  Tag,
  Empty,
  Spin,
  Button,
  Tooltip,
} from 'antd';
import { useTranslation } from 'react-i18next';
import {
  RedditOutlined,
  LikeOutlined,
  MessageOutlined,
  ShareAltOutlined,
  ClockCircleOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useTheme } from '@/contexts/ThemeContext';
import type { ParsedSubredditData } from '@/services/redditWebhookService';

const { Title, Text, Paragraph } = Typography;

/**
 * Result panel props
 */
interface ResultPanelProps {
  /** Reddit data to display */
  redditData: ParsedSubredditData[];
  /** Loading state */
  loading?: boolean;
}

/**
 * Result Panel Component
 * Displays Reddit posts and other workflow results
 */
const ResultPanel: React.FC<ResultPanelProps> = ({
  redditData,
  loading = false,
}) => {
  const { t } = useTranslation();
  const { state } = useTheme();
  const isDarkTheme = state.currentTheme.isDark;
  const [processedData, setProcessedData] = useState<any[]>([]);

  /**
   * Process Reddit data for display
   */
  useEffect(() => {
    console.log(
      'ResultPanel: Received redditData:',
      redditData?.length || 0,
      'items'
    );
    // Flatten subreddit data into individual posts
    const flattenedPosts: any[] = [];
    if (redditData) {
      redditData.forEach(subreddit => {
        if (subreddit.posts && Array.isArray(subreddit.posts)) {
          subreddit.posts.forEach(post => {
            flattenedPosts.push({
              ...post,
              subredditName: subreddit.name, // Add subreddit name for grouping
            });
          });
        }
      });
    }
    setProcessedData(flattenedPosts);
    console.log(
      'ResultPanel: Set processedData to:',
      flattenedPosts.length,
      'posts'
    );
  }, [redditData]);

  // 确保在组件挂载时也设置一次数据
  useEffect(() => {
    console.log('ResultPanel: Component mounted, setting initial data');
    setProcessedData(redditData || []);
  }, []); // 只在挂载时执行一次

  // 强制设置暗色主题文字颜色 - 使用MutationObserver监听DOM变化
  useEffect(() => {
    if (isDarkTheme) {
      const applyStyles = () => {
        // 强制设置所有Typography文字的颜色
        const allElements = document.querySelectorAll('#reddit-result-panel *');
        allElements.forEach(element => {
          const htmlElement = element as HTMLElement;
          const computedStyle = window.getComputedStyle(htmlElement);
          const currentColor = computedStyle.color;

          // 如果颜色不是白色，强制设置为白色
          if (
            currentColor !== 'rgb(255, 255, 255)' &&
            currentColor !== '#ffffff' &&
            currentColor !== 'white'
          ) {
            htmlElement.style.setProperty('color', '#ffffff', 'important');
            htmlElement.style.setProperty('font-weight', 'bold', 'important');
          }
        });

        // 特别处理span元素（我们替换的Typography组件）
        const spanElements = document.querySelectorAll(
          '#reddit-result-panel span'
        );
        spanElements.forEach(element => {
          (element as HTMLElement).style.setProperty(
            'color',
            '#ffffff',
            'important'
          );
          (element as HTMLElement).style.setProperty(
            'font-weight',
            'bold',
            'important'
          );
        });
      };

      // 立即应用样式
      applyStyles();

      // 使用MutationObserver监听DOM变化
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' || mutation.type === 'attributes') {
            applyStyles();
          }
        });
      });

      // 观察结果面板
      const resultPanel = document.getElementById('reddit-result-panel');
      if (resultPanel) {
        observer.observe(resultPanel, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ['style', 'class'],
        });
      }

      // 定期检查和应用样式（作为后备方案）
      const interval = setInterval(applyStyles, 1000);

      return () => {
        observer.disconnect();
        clearInterval(interval);
      };
    }
    return undefined;
  }, [isDarkTheme, processedData]);

  /**
   * Get hot level color based on score
   */
  const getHotLevelColor = (score: number): string => {
    if (score >= 1000) return '#666666'; // Dark gray for very hot
    if (score >= 500) return '#888888'; // Medium gray for hot
    if (score >= 100) return '#aaaaaa'; // Light gray for warm
    return '#cccccc'; // Very light gray for normal
  };

  /**
   * Get hot level text
   */
  const getHotLevel = (score: number): string => {
    if (score >= 1000) return t('informationDashboard.reddit.veryHot');
    if (score >= 500) return t('informationDashboard.reddit.hot');
    if (score >= 100) return t('informationDashboard.reddit.warm');
    return t('informationDashboard.reddit.normal');
  };

  /**
   * Render individual Reddit post
   */
  const renderRedditPost = (post: any, index: number) => (
    <List.Item
      key={`${post.subreddit}-${index}`}
      style={{ padding: '12px 0' }}
      actions={[
        <Space key='stats'>
          <Tooltip title={t('informationDashboard.reddit.upvotes')}>
            <Space size={4}>
              <LikeOutlined style={{ color: '#52c41a' }} />
              <Text
                style={{
                  color: isDarkTheme ? '#ffffff !important' : undefined,
                  fontWeight: isDarkTheme ? 'bold !important' : undefined,
                }}
              >
                {post.upvotes?.toLocaleString() ||
                  post.score?.toLocaleString() ||
                  0}
              </Text>
            </Space>
          </Tooltip>
          <Tooltip title={t('informationDashboard.reddit.comments')}>
            <Space size={4}>
              <MessageOutlined style={{ color: '#1890ff' }} />
              <Text
                style={{
                  color: isDarkTheme ? '#ffffff !important' : undefined,
                  fontWeight: isDarkTheme ? 'bold !important' : undefined,
                }}
              >
                {post.comments?.toLocaleString() ||
                  post.numComments?.toLocaleString() ||
                  0}
              </Text>
            </Space>
          </Tooltip>
          <Tooltip title={t('informationDashboard.reddit.hotLevel')}>
            <Tag
              color={getHotLevelColor(post.upvotes || post.score || 0)}
              style={{
                color: isDarkTheme ? '#ffffff !important' : undefined,
                fontWeight: isDarkTheme ? 'bold !important' : undefined,
              }}
            >
              {getHotLevel(post.upvotes || post.score || 0)}
            </Tag>
          </Tooltip>
        </Space>,
      ]}
    >
      <List.Item.Meta
        avatar={
          <Avatar
            style={{ backgroundColor: '#666666' }}
            icon={<RedditOutlined />}
            size='small'
          />
        }
        title={
          <Space direction='vertical' size={2} style={{ width: '100%' }}>
            <Space align='center' wrap>
              <span
                style={{
                  fontSize: 14,
                  color: isDarkTheme ? '#ffffff' : undefined,
                  fontWeight: isDarkTheme ? 'bold' : undefined,
                  textShadow: isDarkTheme
                    ? '0 1px 2px rgba(0, 0, 0, 0.5)'
                    : undefined,
                  display: 'inline-block',
                }}
                className={isDarkTheme ? 'dark-theme-text' : ''}
              >
                {post.title}
              </span>
              <Tag
                style={{
                  color: isDarkTheme ? '#ffffff !important' : undefined,
                  fontWeight: isDarkTheme ? 'bold !important' : undefined,
                  backgroundColor: isDarkTheme
                    ? 'rgba(255, 255, 255, 0.1) !important'
                    : undefined,
                  borderColor: isDarkTheme
                    ? 'rgba(255, 255, 255, 0.3) !important'
                    : undefined,
                }}
              >
                r/{post.subreddit}
              </Tag>
            </Space>
            <Space size={8}>
              <Text
                type='secondary'
                style={{
                  fontSize: 12,
                  color: isDarkTheme ? '#e6f7ff !important' : undefined,
                  fontWeight: isDarkTheme ? 'bold !important' : undefined,
                }}
              >
                <ClockCircleOutlined style={{ marginRight: 4 }} />
                {t('common.unknownTime')}
              </Text>
              {post.author && (
                <Text
                  type='secondary'
                  style={{
                    fontSize: 12,
                    color: isDarkTheme ? '#e6f7ff !important' : undefined,
                    fontWeight: isDarkTheme ? 'bold !important' : undefined,
                  }}
                >
                  <GlobalOutlined style={{ marginRight: 4 }} />
                  u/{post.author}
                </Text>
              )}
            </Space>
          </Space>
        }
        description={
          post.content || post.selftext ? (
            <Paragraph
              ellipsis={{ rows: 2, expandable: true, symbol: t('common.more') }}
              style={{
                margin: 0,
                fontSize: 13,
                color: isDarkTheme ? '#ffffff !important' : undefined,
                fontWeight: isDarkTheme ? 'bold !important' : undefined,
              }}
            >
              {post.content || post.selftext}
            </Paragraph>
          ) : post.url && !post.url.includes('reddit.com') ? (
            <Space>
              <Text
                type='secondary'
                style={{
                  fontSize: 12,
                  color: isDarkTheme ? '#e6f7ff !important' : undefined,
                  fontWeight: isDarkTheme ? 'bold !important' : undefined,
                }}
              >
                {t('informationDashboard.reddit.externalLink')}:
              </Text>
              <Button
                type='link'
                size='small'
                href={post.url}
                target='_blank'
                style={{
                  padding: 0,
                  fontSize: 12,
                  color: isDarkTheme ? '#ffffff !important' : undefined,
                  fontWeight: isDarkTheme ? 'bold !important' : undefined,
                }}
              >
                {post.url}
              </Button>
            </Space>
          ) : null
        }
      />
    </List.Item>
  );

  if (loading) {
    return (
      <div className='result-panel-loading'>
        <Spin size='large' />
        <div className='result-panel-loading-text'>
          <Text
            style={{
              color: isDarkTheme ? '#ffffff !important' : undefined,
              fontWeight: isDarkTheme ? 'bold !important' : undefined,
            }}
          >
            {t('informationDashboard.reddit.loadingPosts')}
          </Text>
        </div>
      </div>
    );
  }

  // 如果没有数据且没有加载状态，显示空状态
  if (!processedData || processedData.length === 0) {
    // 检查是否有持久化数据正在恢复
    const hasPersistedData = localStorage.getItem('wendeal_reddit_data');
    console.log(
      'ResultPanel: No data to display, hasPersistedData:',
      !!hasPersistedData
    );

    if (hasPersistedData) {
      // 如果有持久化数据但processedData为空，显示加载状态
      return (
        <div className='result-panel-loading'>
          <Spin size='large' />
          <div className='result-panel-loading-text'>
            <Text>{t('informationDashboard.reddit.loadingPosts')}</Text>
          </div>
        </div>
      );
    }

    // 真正没有数据时显示空状态
    return (
      <div
        className='reddit-empty-container'
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
          boxSizing: 'border-box',
        }}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction='vertical' size={2}>
              <Text
                style={{
                  fontSize: '13px',
                  margin: 0,
                  color: isDarkTheme ? '#ffffff !important' : undefined,
                  fontWeight: isDarkTheme ? 'bold !important' : undefined,
                }}
              >
                {t('informationDashboard.reddit.noPostsFound')}
              </Text>
              <Text
                type='secondary'
                style={{
                  fontSize: '12px',
                  margin: 0,
                  color: isDarkTheme ? '#e6f7ff !important' : undefined,
                  fontWeight: isDarkTheme ? 'bold !important' : undefined,
                }}
              >
                {t('informationDashboard.reddit.tryDifferentSubreddits')}
              </Text>
            </Space>
          }
        />
      </div>
    );
  }

  // Group posts by subreddit
  const groupedData = processedData.reduce(
    (acc, post) => {
      const subredditName = post.subreddit || post.subredditName || 'unknown';
      if (!acc[subredditName]) {
        acc[subredditName] = [];
      }
      acc[subredditName].push(post);
      return acc;
    },
    {} as Record<string, any[]>
  );

  return (
    <div id='reddit-result-panel' className='result-panel'>
      <Space direction='vertical' style={{ width: '100%' }} size={16}>
        {/* Reddit posts by subreddit */}
        {Object.entries(groupedData).map(([subreddit, posts]) => {
          const postsArray = posts as any[];
          return (
            <Card
              key={subreddit}
              size='small'
              title={
                <Space>
                  <Avatar
                    style={{ backgroundColor: '#666666' }}
                    icon={<RedditOutlined />}
                    size='small'
                  />
                  <Text
                    strong
                    style={{
                      color: isDarkTheme ? '#ffffff !important' : undefined,
                      fontWeight: isDarkTheme ? 'bold !important' : undefined,
                    }}
                  >
                    r/{subreddit}
                  </Text>
                  <Badge
                    count={
                      <span
                        style={{
                          color: isDarkTheme ? '#ffffff !important' : undefined,
                          fontWeight: isDarkTheme
                            ? 'bold !important'
                            : undefined,
                        }}
                      >
                        {postsArray.length}
                      </span>
                    }
                    showZero
                    color='#666666'
                  />
                </Space>
              }
              className='compact-spacing'
              style={{ maxHeight: '400px' }}
              styles={{
                body: { maxHeight: '320px', overflow: 'auto' },
              }}
            >
              <List
                size='small'
                dataSource={postsArray.slice(0, 5)} // 限制最多显示5条帖子
                renderItem={renderRedditPost}
                locale={{
                  emptyText: (
                    <Text
                      style={{
                        color: isDarkTheme ? '#ffffff !important' : undefined,
                        fontWeight: isDarkTheme ? 'bold !important' : undefined,
                      }}
                    >
                      {t('informationDashboard.reddit.noPostsInSubreddit')}
                    </Text>
                  ),
                }}
              />
              {postsArray.length > 5 && (
                <div
                  style={{
                    textAlign: 'center',
                    marginTop: '8px',
                    padding: '4px 0',
                  }}
                >
                  <Text
                    type='secondary'
                    style={{
                      fontSize: '12px',
                      color: isDarkTheme ? '#e6f7ff !important' : undefined,
                      fontWeight: isDarkTheme ? 'bold !important' : undefined,
                    }}
                  >
                    {t('informationDashboard.reddit.andMore', {
                      count: postsArray.length - 5,
                    })}
                  </Text>
                </div>
              )}
            </Card>
          );
        })}

        {/* Summary stats */}
        {processedData.length > 0 && (
          <Card size='small'>
            <Space wrap>
              <Text
                strong
                style={{
                  color: isDarkTheme ? '#ffffff !important' : undefined,
                  fontWeight: isDarkTheme ? 'bold !important' : undefined,
                }}
              >
                {t('informationDashboard.reddit.summary')}:
              </Text>
              <Text
                style={{
                  color: isDarkTheme ? '#e6f7ff !important' : undefined,
                  fontWeight: isDarkTheme ? 'bold !important' : undefined,
                }}
              >
                {t('informationDashboard.reddit.totalPosts')}:{' '}
                {processedData.length}
              </Text>
              <Text
                style={{
                  color: isDarkTheme ? '#e6f7ff !important' : undefined,
                  fontWeight: isDarkTheme ? 'bold !important' : undefined,
                }}
              >
                {t('informationDashboard.reddit.totalSubreddits')}:{' '}
                {Object.keys(groupedData).length}
              </Text>
              <Text
                style={{
                  color: isDarkTheme ? '#e6f7ff !important' : undefined,
                  fontWeight: isDarkTheme ? 'bold !important' : undefined,
                }}
              >
                {t('informationDashboard.reddit.averageScore')}:{' '}
                {Math.round(
                  processedData.reduce(
                    (sum, post) => sum + (post.upvotes || post.score || 0),
                    0
                  ) / processedData.length
                )}
              </Text>
            </Space>
          </Card>
        )}
      </Space>
    </div>
  );
};

export default ResultPanel;
