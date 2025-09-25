/**
 * Tools Result Panel Component
 * Simplified version for Tools page
 */

import React, { useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  List,
  Space,
  Typography,
  Badge,
  Empty,
  Button,
  Tooltip,
  Avatar,
} from 'antd';
import {
  RedditOutlined,
  LinkOutlined,
  UserOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import type { ParsedSubredditData } from '@/services/redditWebhookService';

const { Text } = Typography;

/**
 * Tools Result Panel Props Interface
 */
interface ResultPanelProps {
  redditData?: ParsedSubredditData[];
  loading?: boolean;
}

/**
 * Tools Result Panel Component
 */
const ResultPanel: React.FC<ResultPanelProps> = memo(
  ({ redditData, loading = false }) => {
    const { t } = useTranslation();

    // 调试日志
    console.log('ResultPanel: Received redditData:', redditData);

    // 使用useMemo优化数据处理
    const groupedRedditData = useMemo(() => {
      if (!redditData || redditData.length === 0) {
        console.log('ResultPanel: No redditData available');
        return {};
      }

      console.log(
        'ResultPanel: Processing redditData with',
        redditData.length,
        'items'
      );

      return redditData.reduce(
        (acc, subredditData, index) => {
          // 验证数据结构
          if (!subredditData || typeof subredditData !== 'object') {
            console.warn(
              'ResultPanel: Invalid subredditData at index',
              index,
              subredditData
            );
            return acc;
          }

          const subreddit = subredditData.name || 'unknown';
          console.log(
            'ResultPanel: Processing subreddit:',
            subreddit,
            'with',
            subredditData.posts?.length || 0,
            'posts'
          );

          if (!subreddit || subreddit === 'undefined') {
            console.warn(
              'ResultPanel: Subreddit name is undefined or invalid:',
              subredditData
            );
            return acc;
          }

          acc[subreddit] = subredditData.posts || [];
          return acc;
        },
        {} as Record<string, any[]>
      );
    }, [redditData]);

    const hasRedditData = useMemo(() => {
      return redditData && redditData.length > 0;
    }, [redditData]);

    /**
     * 处理外部链接点击
     */
    const handleLinkClick = (url: string) => {
      window.open(url, '_blank');
    };

    /**
     * 处理鼠标悬停效果
     */
    const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.currentTarget.style.textDecoration = 'underline';
    };

    const handleMouseLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.currentTarget.style.textDecoration = 'none';
    };

    /**
     * 渲染Reddit数据展示
     */
    const renderRedditData = () => {
      console.log(
        'ResultPanel: renderRedditData called, hasRedditData:',
        hasRedditData
      );

      if (!hasRedditData) {
        console.log(
          'ResultPanel: No Reddit data available, showing empty state'
        );
        return (
          <div
            className='reddit-empty-container'
            style={{
              height: '120px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '8px 0',
            }}
          >
            <Empty
              image={
                <RedditOutlined style={{ fontSize: 32, color: '#666666' }} />
              }
              description={
                <Space direction='vertical' size={2}>
                  <Text style={{ fontSize: '13px', margin: 0 }}>
                    No Reddit data available
                  </Text>
                  <Text
                    type='secondary'
                    style={{ fontSize: '12px', margin: 0 }}
                  >
                    Please start the Reddit workflow to fetch data
                  </Text>
                </Space>
              }
            />
          </div>
        );
      }

      console.log(
        'ResultPanel: Rendering Reddit data, groupedData keys:',
        Object.keys(groupedRedditData)
      );

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
            <div
              key={`row-${rowIndex}`}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                width: '100%',
              }}
            >
              {row.map(([subreddit, posts]) => (
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
                      <Text strong>r/{subreddit}</Text>
                      <Badge count={posts.length} showZero color='#666666' />
                    </Space>
                  }
                  style={{
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
                      renderItem={post => (
                        <List.Item
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
                      )}
                    />
                    {posts.length > 5 && (
                      <div
                        style={{
                          textAlign: 'center',
                          marginTop: '8px',
                          padding: '4px 0',
                        }}
                      >
                        <Text type='secondary' style={{ fontSize: '12px' }}>
                          {`And ${posts.length - 5} more...`}
                        </Text>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ))}
        </Space>
      );
    };

    return (
      <div
        className='compact-layout'
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        {/* 内容区域 */}
        <div
          style={{
            flex: 1,
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {renderRedditData()}
        </div>
      </div>
    );
  }
);

export default ResultPanel;

// 显示名称用于调试
ResultPanel.displayName = 'ResultPanel';
