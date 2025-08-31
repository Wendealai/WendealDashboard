import React, { useState } from 'react';
import {
  Card,
  Button,
  Alert,
  Typography,
  List,
  message,
  Empty,
  Space,
  Progress,
  Row,
  Col,
  Tag,
  Divider,
} from 'antd';
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
 * Reddit数据展示面板组件
 * 简洁的启动按钮和内容展示
 */
const WorkflowControlPanel: React.FC = () => {
  // 本地状态管理
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redditData, setRedditData] = useState<ParsedSubredditData[]>([]);
  const [progressStatus, setProgressStatus] = useState<string>('');

  /**
   * 获取Reddit数据
   */
  const handleStart = async () => {
    setLoading(true);
    setError(null);
    setProgressStatus('准备启动工作流...');

    try {
      // 使用新的进度回调机制
      const response = await workflowService.triggerRedditWebhook(
        (status: string) => {
          setProgressStatus(status);
        }
      );

      console.log('WorkflowControlPanel收到响应:', {
        success: response.success,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : [],
        postsCount: response.data?.posts?.length || 0,
        error: response.error,
        fullResponse: response,
      });

      if (response.success && response.data) {
        console.log('设置Reddit数据:', {
          postsArray: response.data.posts,
          postsLength: response.data.posts?.length || 0,
          subredditsArray: response.data.subreddits,
          subredditsLength: response.data.subreddits?.length || 0,
          firstPost: response.data.posts?.[0],
          firstSubreddit: response.data.subreddits?.[0],
        });

        // 使用subreddits数据而不是posts数组，因为UI期望的是按subreddit分组的数据
        const subredditsData = response.data.subreddits || [];
        setRedditData(subredditsData);
        setProgressStatus('数据获取完成！');
        message.success('数据获取成功！');

        console.log('Reddit数据已设置，当前状态:', {
          redditDataLength: subredditsData.length,
          totalPosts: subredditsData.reduce(
            (sum, sub) => sum + (sub.posts?.length || 0),
            0
          ),
        });
      } else {
        console.error('响应失败或无数据:', { response });
        throw new Error(response.error || '获取失败');
      }
    } catch (error) {
      console.error('WorkflowControlPanel错误详情:', {
        error,
        errorMessage: error instanceof Error ? error.message : '获取失败',
        errorStack: error instanceof Error ? error.stack : undefined,
      });

      const errorMessage = error instanceof Error ? error.message : '获取失败';
      setError(errorMessage);
      setProgressStatus('');
      message.error(errorMessage);
    } finally {
      setLoading(false);
      // 清除进度状态（延迟3秒）
      setTimeout(() => {
        setProgressStatus('');
      }, 3000);
    }
  };

  return (
    <div className='reddit-panel'>
      {/* 启动按钮 */}
      <div style={{ marginBottom: 16, textAlign: 'center' }}>
        <Button
          type='primary'
          size='large'
          icon={loading ? <LoadingOutlined /> : <ThunderboltOutlined />}
          onClick={handleStart}
          loading={loading}
          disabled={loading}
        >
          {loading ? '工作流执行中...' : '启动获取数据'}
        </Button>
      </div>

      {/* 进度显示 */}
      {(loading || progressStatus) && (
        <div style={{ marginBottom: 16 }}>
          <Card size='small'>
            <Space direction='vertical' style={{ width: '100%' }}>
              <Text type='secondary'>{progressStatus || '正在处理...'}</Text>
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

      {/* 内容展示框 */}
      <Card title='Reddit 热门内容' style={{ minHeight: 400 }}>
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
                    <Tag color='blue'>{subreddit.posts?.length || 0} 帖子</Tag>
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
                              title='查看原帖'
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
                  <Text type='secondary'>暂无数据</Text>
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    点击上方"启动获取数据"按钮获取 Reddit 热门内容
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
