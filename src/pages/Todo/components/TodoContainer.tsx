/**
 * Todo Container Component
 * Handles todo.wendealai.com iframe integration
 */

import React, { useState, useCallback } from 'react';
import { Spin, Result, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface TodoContainerProps {
  /** Todo URL */
  url: string;
  /** Additional CSS class */
  className?: string;
}

/**
 * Todo Container Component
 * Provides simple todo iframe integration with loading states and error handling
 */
const TodoContainer: React.FC<TodoContainerProps> = ({
  url,
  className = '',
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  /**
   * Handle iframe load success
   */
  const handleLoad = useCallback(() => {
    setLoading(false);
    setError(null);
    console.log('Todo iframe loaded successfully');
  }, []);

  /**
   * Handle iframe load error
   */
  const handleError = useCallback(() => {
    setLoading(false);
    setError(t('todo.errors.loadFailed', 'Failed to load Todo system'));
    console.error('Todo iframe failed to load');
  }, [t]);

  /**
   * Retry loading the iframe
   */
  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    setRetryCount(prev => prev + 1);
  }, []);

  return (
    <div className={`todo-container ${className}`}>
      {/* Loading State */}
      {loading && !error && (
        <div className='todo-loading'>
          <Spin size='large' />
          <div
            style={{
              marginTop: '16px',
              color: 'var(--text-color-secondary)',
            }}
          >
            {t('todo.loading', 'Loading Todo system...')}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className='todo-error'>
          <Result
            status='error'
            title={t('todo.errors.title', 'Todo Unavailable')}
            subTitle={error}
            extra={
              <Button
                type='primary'
                icon={<ReloadOutlined />}
                onClick={handleRetry}
                disabled={retryCount >= 3}
              >
                {retryCount >= 3
                  ? t('todo.errors.maxRetries', 'Max retries reached')
                  : t('todo.errors.retry', 'Retry')}
              </Button>
            }
          />
        </div>
      )}

      {/* Todo Iframe */}
      <div className='todo-responsive'>
        <iframe
          key={retryCount} // Force re-render on retry
          src={url}
          style={{
            width: '100%',
            minWidth: '320px',
            height: '100vh',
            border: '0',
            display: loading && !error ? 'none' : 'block',
          }}
          frameBorder='0'
          onLoad={handleLoad}
          onError={handleError}
          title={t('todo.iframeTitle', 'Todo System')}
          referrerPolicy='no-referrer'
          allow='fullscreen'
          sandbox='allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-top-navigation'
        />
      </div>
    </div>
  );
};

export default TodoContainer;
