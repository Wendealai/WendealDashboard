import React, { useState, useCallback, useRef } from 'react';
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
  Modal,
  Tooltip,
} from 'antd';
import { useMessage } from '@/hooks';
import {
  ThunderboltOutlined,
  ExportOutlined,
  CommentOutlined,
  LikeOutlined,
  LoadingOutlined,
  RedditOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { workflowService } from '../../services/workflowService';
import type { ParsedSubredditData } from '../../services/redditWebhookService';

const { Text } = Typography;

/**
 * Reddit data display panel component with enhanced error handling and retry mechanism
 */
const WorkflowControlPanel: React.FC = () => {
  // Local state management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<{
    type: 'network' | 'timeout' | 'server' | 'unknown';
    code?: string;
    stack?: string;
  } | null>(null);
  const [redditData, setRedditData] = useState<ParsedSubredditData[]>([]);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [showRetryModal, setShowRetryModal] = useState(false);
  const [lastAttemptTime, setLastAttemptTime] = useState<number | null>(null);

  const message = useMessage();
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_RETRY_ATTEMPTS = 3;
  const RETRY_DELAY = 2000; // 2 seconds
  const COOLDOWN_PERIOD = 30000; // 30 seconds

  /**
   * Classify error type for better error handling
   */
  const classifyError = useCallback(
    (error: any): { type: string; code?: string; stack?: string } => {
      if (!error) {
        return { type: 'unknown' };
      }

      const errorMessage = error.message || error.toString();

      if (errorMessage.includes('Network') || errorMessage.includes('fetch')) {
        return { type: 'network', code: 'NETWORK_ERROR' };
      }

      if (
        errorMessage.includes('timeout') ||
        errorMessage.includes('Timeout')
      ) {
        return { type: 'timeout', code: 'TIMEOUT_ERROR' };
      }

      if (error.status >= 500) {
        return { type: 'server', code: `HTTP_${error.status}` };
      }

      return {
        type: 'unknown',
        code: 'UNKNOWN_ERROR',
        stack: error.stack,
      };
    },
    []
  );

  /**
   * Check if retry is allowed based on cooldown period
   */
  const canRetry = useCallback((): boolean => {
    if (!lastAttemptTime) return true;
    const timeSinceLastAttempt = Date.now() - lastAttemptTime;
    return timeSinceLastAttempt >= COOLDOWN_PERIOD;
  }, [lastAttemptTime, COOLDOWN_PERIOD]);

  /**
   * Execute Reddit data retrieval with enhanced error handling
   */
  const executeRetrieval = useCallback(async (): Promise<void> => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setProgressStatus('Preparing to start workflow...');

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
        timestamp: response.timestamp,
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
        setRetryCount(0); // Reset retry count on success
        message.success(
          `Data retrieved successfully! Found ${subredditsData.length} subreddits.`
        );

        console.log('Reddit data has been set, current state:', {
          redditDataLength: subredditsData.length,
          totalPosts: subredditsData.reduce(
            (sum, sub) => sum + (sub.posts?.length || 0),
            0
          ),
        });
      } else {
        console.error('Response failed or no data:', { response });
        throw new Error(
          response.error || 'Retrieval failed - no data returned'
        );
      }
    } catch (error: any) {
      console.error('WorkflowControlPanel error details:', {
        error,
        errorMessage:
          error instanceof Error ? error.message : 'Retrieval failed',
        errorStack: error instanceof Error ? error.stack : undefined,
        retryCount,
        isAborted: error.name === 'AbortError',
      });

      // Don't treat aborted requests as errors
      if (error.name === 'AbortError') {
        return;
      }

      const errorDetails = classifyError(error) as {
        type: 'network' | 'timeout' | 'server' | 'unknown';
        code?: string;
        stack?: string;
      };
      const errorMessage =
        error instanceof Error ? error.message : 'Retrieval failed';

      setError(errorMessage);
      setErrorDetails(errorDetails);
      setProgressStatus('');

      // Show retry modal for certain error types
      if (errorDetails.type === 'network' || errorDetails.type === 'timeout') {
        if (retryCount < MAX_RETRY_ATTEMPTS && canRetry()) {
          setShowRetryModal(true);
        }
      }

      message.error(
        `${errorMessage}${retryCount < MAX_RETRY_ATTEMPTS ? ' (Will retry automatically)' : ''}`
      );
    }
  }, [retryCount, canRetry, classifyError, message]);

  /**
   * Get Reddit data with retry mechanism
   */
  const handleStart = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    setError(null);
    setErrorDetails(null);
    setLastAttemptTime(Date.now());

    try {
      await executeRetrieval();
    } finally {
      setLoading(false);
      // Clear progress status after delay
      setTimeout(() => {
        if (!loading) {
          setProgressStatus('');
        }
      }, 3000);
    }
  }, [loading, executeRetrieval]);

  /**
   * Handle manual retry
   */
  const handleRetry = useCallback(async () => {
    setShowRetryModal(false);
    setRetryCount(prev => prev + 1);
    setError(null);
    setErrorDetails(null);

    // Add delay before retry
    setTimeout(() => {
      handleStart();
    }, RETRY_DELAY);
  }, [handleStart, RETRY_DELAY]);

  /**
   * Cancel current operation
   */
  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setLoading(false);
    setProgressStatus('');
    setShowRetryModal(false);
    message.info('Operation cancelled');
  }, [message]);

  /**
   * Auto-retry mechanism
   */
  React.useEffect(() => {
    if (
      error &&
      errorDetails &&
      retryCount < MAX_RETRY_ATTEMPTS &&
      canRetry()
    ) {
      const shouldAutoRetry =
        errorDetails.type === 'network' || errorDetails.type === 'timeout';

      if (shouldAutoRetry) {
        retryTimeoutRef.current = setTimeout(
          () => {
            setRetryCount(prev => prev + 1);
            handleStart();
          },
          RETRY_DELAY * (retryCount + 1)
        ); // Exponential backoff
      }
    }

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [error, errorDetails, retryCount, canRetry, handleStart, RETRY_DELAY]);

  /**
   * Cleanup on unmount
   */
  React.useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className='reddit-panel'>
      {/* Start button with retry info */}
      <div style={{ marginBottom: 16, textAlign: 'center' }}>
        <Space direction='vertical' size='small'>
          <Space>
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

            {loading && (
              <Button
                danger
                icon={<ExclamationCircleOutlined />}
                onClick={handleCancel}
                size='large'
              >
                Cancel
              </Button>
            )}
          </Space>

          {retryCount > 0 && (
            <Text type='secondary' style={{ fontSize: '12px' }}>
              Retry attempt {retryCount} of {MAX_RETRY_ATTEMPTS}
            </Text>
          )}

          {errorDetails && (
            <Alert
              message={`Error Type: ${errorDetails.type.toUpperCase()}`}
              description={errorDetails.code}
              type='warning'
              showIcon
              style={{ textAlign: 'left', maxWidth: 400 }}
            />
          )}
        </Space>
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

      {/* Enhanced error display */}
      {error && !loading && (
        <div style={{ marginBottom: 16 }}>
          <Alert
            message={
              <Space>
                <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                <span>{error}</span>
              </Space>
            }
            description={
              errorDetails ? (
                <div>
                  <Text strong>Error Details:</Text>
                  <br />
                  <Text code>Type: {errorDetails.type}</Text>
                  {errorDetails.code && (
                    <>
                      <br />
                      <Text code>Code: {errorDetails.code}</Text>
                    </>
                  )}
                  <br />
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    Attempted {retryCount + 1} time(s)
                    {lastAttemptTime && (
                      <>
                        {' '}
                        • Last attempt:{' '}
                        {new Date(lastAttemptTime).toLocaleTimeString()}
                      </>
                    )}
                  </Text>
                </div>
              ) : null
            }
            type='error'
            showIcon={false}
            action={
              retryCount < MAX_RETRY_ATTEMPTS && canRetry() ? (
                <Button
                  size='small'
                  icon={<ReloadOutlined />}
                  onClick={handleRetry}
                  type='primary'
                  danger
                >
                  Retry
                </Button>
              ) : null
            }
            style={{ textAlign: 'left' }}
          />
        </div>
      )}

      {/* Content display box */}
      <Card
        title={
          <Space>
            <RedditOutlined style={{ color: '#ff4500' }} />
            <span>Reddit Hot Content</span>
            {redditData.length > 0 && (
              <Tag color='blue'>
                {redditData.reduce(
                  (sum, sub) => sum + (sub.posts?.length || 0),
                  0
                )}{' '}
                posts
              </Tag>
            )}
          </Space>
        }
        style={{ minHeight: 400 }}
      >
        {redditData.length > 0 ? (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {redditData.slice(0, 5).map(subreddit => (
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

      {/* Retry Modal */}
      <Modal
        title={
          <Space>
            <WarningOutlined style={{ color: '#faad14' }} />
            <span>Connection Error</span>
          </Space>
        }
        open={showRetryModal}
        onCancel={() => setShowRetryModal(false)}
        footer={[
          <Button key='cancel' onClick={() => setShowRetryModal(false)}>
            Cancel
          </Button>,
          <Button
            key='retry'
            type='primary'
            icon={<ReloadOutlined />}
            onClick={handleRetry}
            loading={loading}
          >
            Retry Now
          </Button>,
        ]}
        centered
      >
        <div style={{ padding: '16px 0' }}>
          <Text>
            The connection failed due to a {errorDetails?.type} error. This
            might be due to:
          </Text>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li>Network connectivity issues</li>
            <li>Server temporarily unavailable</li>
            <li>Request timeout</li>
          </ul>
          <div style={{ marginTop: 16 }}>
            <Text strong>
              Attempt {retryCount + 1} of {MAX_RETRY_ATTEMPTS}
            </Text>
            {retryCount >= MAX_RETRY_ATTEMPTS - 1 && (
              <div style={{ marginTop: 8 }}>
                <Text type='warning'>
                  This is the final retry attempt. If it fails, please check
                  your network connection and try again later.
                </Text>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export { WorkflowControlPanel as default };
export { WorkflowControlPanel };
