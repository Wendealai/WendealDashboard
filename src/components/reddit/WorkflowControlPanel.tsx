import React, { useState } from 'react';
import {
  Card,
  Button,
  Alert,
  Typography,
  List,
  Empty,
  Space,
  Progress,
  Row,
  Col,
  Tag,
  Divider,
} from 'antd';
import { useMessage } from '@/hooks';
import {
  ThunderboltOutlined,
  ExportOutlined,
  CommentOutlined,
  LikeOutlined,
  LoadingOutlined,
  RedditOutlined,
} from '@ant-design/icons';
import { workflowService } from '../../services/workflowService';
import type { ParsedSubredditData } from '../../services/redditWebhookService';

const { Text } = Typography;

/**
 * Reddit data display panel component
 * Simple start button and content display
 */
const WorkflowControlPanel: React.FC = () => {
  // Local state management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redditData, setRedditData] = useState<ParsedSubredditData[]>([]);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const message = useMessage();

  /**
   * Get Reddit data
   */
  const handleStart = async () => {
    setLoading(true);
    setError(null);
    setProgressStatus('Preparing to start workflow...');

    try {
      // Use new progress callback mechanism
      const response = await workflowService.triggerRedditWebhook(
        (status: string) => {
          setProgressStatus(status);
        }
      );

      console.log('WorkflowControlPanel received response:', {
        success: response.success,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        postsCount: response.data?.posts?.length || 0,
        error: response.error,
        fullResponse: response,
      });

      if (response.success && response.data) {
        console.log('Setting Reddit data:', {
          postsArray: response.data.posts,
          postsLength: response.data.posts?.length || 0,
          subredditsArray: response.data.subreddits,
          subredditsLength: response.data.subreddits?.length || 0,
          firstPost: response.data.posts?.[0],
          firstSubreddit: response.data.subreddits?.[0],
        });

        // Use subreddits data instead of posts array, as UI expects data grouped by subreddit
        const subredditsData = response.data.subreddits || [];
        setRedditData(subredditsData);
        setProgressStatus('Data retrieval completed!');
        message.success('Data retrieved successfully!');

        console.log('Reddit data has been set, current state:', {
          redditDataLength: subredditsData.length,
          totalPosts: subredditsData.reduce(
            (sum, sub) => sum + (sub.posts?.length || 0),
            0
          ),
        });
      } else {
        console.error('Response failed or no data:', { response });
        throw new Error(response.error || 'Retrieval failed');
      }
    } catch (error) {
      console.error('WorkflowControlPanel error details:', {
        error,
        errorMessage:
          error instanceof Error ? error.message : 'Retrieval failed',
        errorStack: error instanceof Error ? error.stack : undefined,
      });

      const errorMessage =
        error instanceof Error ? error.message : 'Retrieval failed';
      setError(errorMessage);
      setProgressStatus('');
      message.error(errorMessage);
    } finally {
      setLoading(false);
      // Clear progress status (3 second delay)
      setTimeout(() => {
        setProgressStatus('');
      }, 3000);
    }
  };

  return (
    <div className='reddit-panel'>
      {/* Start button */}
      <div style={{ marginBottom: 16, textAlign: 'center' }}>
        <Button
          type='primary'
          size='large'
          icon={loading ? <LoadingOutlined /> : <ThunderboltOutlined />}
          onClick={handleStart}
          loading={loading}
          disabled={loading}
        >
          {loading ? 'Workflow executing...' : 'Start Data Retrieval'}
        </Button>
      </div>

      {/* Progress display */}
      {(loading || progressStatus) && (
        <div style={{ marginBottom: 16 }}>
          <Card size='small'>
            <Space direction='vertical' style={{ width: '100%' }}>
              <Text type='secondary'>{progressStatus || 'Processing...'}</Text>
              {loading && (
                <Progress
                  percent={100}
                  status='active'
                  showInfo={false}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
              )}
            </Space>
          </Card>
        </div>
      )}

      {/* Content display box */}
      <Card title='Reddit Hot Content' style={{ minHeight: 400 }}>
        {error && (
          <Alert
            message={error}
            type='error'
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {redditData.length > 0 ? (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {redditData.slice(0, 5).map((subreddit, index) => (
              <Card
                size='small'
                title={
                  <Space>
                    <RedditOutlined style={{ color: '#ff4500' }} />
                    <Text strong>r/{subreddit.name}</Text>
                    <Tag color='blue'>{subreddit.posts?.length || 0} posts</Tag>
                  </Space>
                }
                style={{
                  width: '100%',
                  borderRadius: 8,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
                headStyle={{
                  background:
                    'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                  borderRadius: '8px 8px 0 0',
                }}
              >
                <List
                  itemLayout='vertical'
                  size='small'
                  dataSource={subreddit.posts}
                  renderItem={(post, postIndex) => (
                    <List.Item
                      key={postIndex}
                      style={{
                        padding: '12px 0',
                        borderBottom:
                          postIndex === subreddit.posts.length - 1
                            ? 'none'
                            : '1px solid #f0f0f0',
                      }}
                      actions={[
                        <Space key='stats' size='large'>
                          <Space size='small'>
                            <LikeOutlined style={{ color: '#ff4500' }} />
                            <Text type='secondary'>{post.upvotes}</Text>
                          </Space>
                          <Space size='small'>
                            <CommentOutlined style={{ color: '#1890ff' }} />
                            <Text type='secondary'>{post.comments}</Text>
                          </Space>
                        </Space>,
                      ]}
                    >
                      <List.Item.Meta
                        title={
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                            }}
                          >
                            <a
                              href={post.url}
                              target='_blank'
                              rel='noopener noreferrer'
                              style={{
                                color: '#1890ff',
                                textDecoration: 'none',
                                fontSize: '14px',
                                fontWeight: 500,
                                lineHeight: '1.4',
                                flex: 1,
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.textDecoration =
                                  'underline';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.textDecoration = 'none';
                              }}
                            >
                              {post.title}
                            </a>
                            <a
                              href={post.url}
                              target='_blank'
                              rel='noopener noreferrer'
                              style={{
                                color: '#ff4500',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                              }}
                              title='View original post'
                            >
                              <ExportOutlined />
                            </a>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            ))}
          </div>
        ) : (
          !loading && (
            <Empty
              description={
                <Space direction='vertical' size='small'>
                  <Text type='secondary'>No data available</Text>
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    Click the "Start Data Retrieval" button above to get Reddit
                    hot content
                  </Text>
                </Space>
              }
              style={{ padding: '40px 0' }}
            />
          )
        )}
      </Card>
    </div>
  );
};

export { WorkflowControlPanel as default };
export { WorkflowControlPanel };
