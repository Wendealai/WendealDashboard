/**
 * Social Media Result Panel Component
 * Complete copy of Information Dashboard ResultPanel
 */

import React, { useEffect, useMemo, useState } from 'react';
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
  ClockCircleOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import type { ParsedSubredditData } from '@/services/redditWebhookService';

const { Text, Paragraph } = Typography;

interface ResultPanelProps {
  redditData: ParsedSubredditData[];
  loading?: boolean;
}

type HotLevelTagColor = 'success' | 'processing' | 'warning' | 'default';

const ResultPanel: React.FC<ResultPanelProps> = ({
  redditData,
  loading = false,
}) => {
  const { t } = useTranslation();
  const [processedData, setProcessedData] = useState<any[]>([]);

  useEffect(() => {
    const flattenedPosts: any[] = [];
    if (redditData) {
      redditData.forEach(subreddit => {
        if (!subreddit.posts || !Array.isArray(subreddit.posts)) {
          return;
        }
        subreddit.posts.forEach(post => {
          flattenedPosts.push({
            ...post,
            subredditName: subreddit.name,
          });
        });
      });
    }
    setProcessedData(flattenedPosts);
  }, [redditData]);

  const getHotLevelColor = (score: number): HotLevelTagColor => {
    if (score >= 1000) return 'success';
    if (score >= 500) return 'processing';
    if (score >= 100) return 'warning';
    return 'default';
  };

  const getHotLevel = (score: number): string => {
    if (score >= 1000) return t('informationDashboard.reddit.veryHot');
    if (score >= 500) return t('informationDashboard.reddit.hot');
    if (score >= 100) return t('informationDashboard.reddit.warm');
    return t('informationDashboard.reddit.normal');
  };

  const groupedData = useMemo(
    () =>
      processedData.reduce(
        (acc, post) => {
          const subredditName =
            post.subreddit || post.subredditName || 'unknown';
          if (!acc[subredditName]) {
            acc[subredditName] = [];
          }
          acc[subredditName].push(post);
          return acc;
        },
        {} as Record<string, any[]>
      ),
    [processedData]
  );

  const renderRedditPost = (post: any, index: number) => (
    <List.Item
      key={`${post.subreddit}-${index}`}
      style={{ padding: '12px 0' }}
      actions={[
        <Space key='stats'>
          <Tooltip title={t('informationDashboard.reddit.upvotes')}>
            <Space size={4}>
              <LikeOutlined style={{ color: 'var(--color-success)' }} />
              <Text>
                {post.upvotes?.toLocaleString() ||
                  post.score?.toLocaleString() ||
                  0}
              </Text>
            </Space>
          </Tooltip>
          <Tooltip title={t('informationDashboard.reddit.comments')}>
            <Space size={4}>
              <MessageOutlined style={{ color: 'var(--color-primary)' }} />
              <Text>
                {post.comments?.toLocaleString() ||
                  post.numComments?.toLocaleString() ||
                  0}
              </Text>
            </Space>
          </Tooltip>
          <Tooltip title={t('informationDashboard.reddit.hotLevel')}>
            <Tag color={getHotLevelColor(post.upvotes || post.score || 0)}>
              {getHotLevel(post.upvotes || post.score || 0)}
            </Tag>
          </Tooltip>
        </Space>,
      ]}
    >
      <List.Item.Meta
        avatar={
          <Avatar
            style={{ backgroundColor: 'var(--color-text-secondary)' }}
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
                  color: 'var(--color-text)',
                  display: 'inline-block',
                }}
              >
                {post.title}
              </span>
              <Tag
                style={{
                  color: 'var(--color-text)',
                  backgroundColor: 'var(--color-bg-muted)',
                  borderColor: 'var(--color-border)',
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
                  color: 'var(--color-text-secondary)',
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
                    color: 'var(--color-text-secondary)',
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
                color: 'var(--color-text-secondary)',
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
                  color: 'var(--color-text-secondary)',
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
          <Text>{t('informationDashboard.reddit.loadingPosts')}</Text>
        </div>
      </div>
    );
  }

  if (!processedData || processedData.length === 0) {
    const hasPersistedData = localStorage.getItem('wendeal_reddit_data');
    if (hasPersistedData) {
      return (
        <div className='result-panel-loading'>
          <Spin size='large' />
          <div className='result-panel-loading-text'>
            <Text>{t('informationDashboard.reddit.loadingPosts')}</Text>
          </div>
        </div>
      );
    }

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
              <Text style={{ fontSize: '13px', margin: 0 }}>
                {t('informationDashboard.reddit.noPostsFound')}
              </Text>
              <Text
                type='secondary'
                style={{
                  fontSize: '12px',
                  margin: 0,
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

  return (
    <div id='reddit-result-panel' className='result-panel'>
      <Space direction='vertical' style={{ width: '100%' }} size={16}>
        {Object.entries(groupedData).map(([subreddit, posts]) => {
          const postsArray = posts as any[];
          return (
            <Card
              key={subreddit}
              size='small'
              title={
                <Space>
                  <Avatar
                    style={{ backgroundColor: 'var(--color-text-secondary)' }}
                    icon={<RedditOutlined />}
                    size='small'
                  />
                  <Text strong>r/{subreddit}</Text>
                  <Badge
                    count={<span>{postsArray.length}</span>}
                    showZero
                    color='var(--color-text-secondary)'
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
                dataSource={postsArray.slice(0, 5)}
                renderItem={renderRedditPost}
                locale={{
                  emptyText: (
                    <Text>
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
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    {t('informationDashboard.reddit.andMore', {
                      count: postsArray.length - 5,
                    })}
                  </Text>
                </div>
              )}
            </Card>
          );
        })}

        {processedData.length > 0 && (
          <Card size='small'>
            <Space wrap>
              <Text strong>{t('informationDashboard.reddit.summary')}:</Text>
              <Text>
                {t('informationDashboard.reddit.totalPosts')}:{' '}
                {processedData.length}
              </Text>
              <Text>
                {t('informationDashboard.reddit.totalSubreddits')}:{' '}
                {Object.keys(groupedData).length}
              </Text>
              <Text>
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
