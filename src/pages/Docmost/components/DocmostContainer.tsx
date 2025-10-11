/**
 * Docmost Container Component
 * Handles iframe integration with Docmost documentation platform
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Spin, Alert, Result, Button, Skeleton } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface DocmostContainerProps {
  /** Docmost instance URL */
  src: string;
  /** Iframe title for accessibility */
  title: string;
  /** Additional CSS class */
  className?: string;
}

/**
 * Docmost Container Component
 * Provides secure iframe integration with loading states and error handling
 */
const DocmostContainer: React.FC<DocmostContainerProps> = ({
  src,
  title,
  className = '',
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(true);

  /**
   * Handle iframe load success
   */
  const handleLoad = useCallback(() => {
    setLoading(false);
    setShowSkeleton(false);
    setError(null);

    // Dispatch performance event
    window.dispatchEvent(new CustomEvent('docmost-iframe-loaded'));

    console.log('Docmost iframe loaded successfully');
  }, []);

  /**
   * Handle iframe load error
   */
  const handleError = useCallback(() => {
    setLoading(false);
    setShowSkeleton(false);
    setError(t('docmost.errors.loadFailed', 'Failed to load Docmost system'));

    // Dispatch error event for monitoring
    window.dispatchEvent(new CustomEvent('docmost-error'));

    console.error('Docmost iframe failed to load');
  }, [t]);

  /**
   * Retry loading the iframe
   */
  const handleRetry = useCallback(() => {
    setLoading(true);
    setShowSkeleton(true);
    setError(null);
    setRetryCount(prev => prev + 1);

    // Dispatch retry event for monitoring
    window.dispatchEvent(new CustomEvent('docmost-retry'));

    // Force reload by updating the key
    const iframe = document.querySelector(
      '.docmost-iframe'
    ) as HTMLIFrameElement;
    if (iframe) {
      iframe.src = src;
    }
  }, [src]);

  // Security sandbox attributes for iframe
  const sandboxAttributes = [
    'allow-same-origin', // Allow same-origin requests
    'allow-scripts', // Allow JavaScript execution
    'allow-forms', // Allow form submission
    'allow-popups', // Allow popup windows
    'allow-popups-to-escape-sandbox', // Allow popups to escape sandbox for auth flows
    'allow-top-navigation', // Allow top-level navigation (needed for post-login redirects)
    'allow-storage-access-by-user-activation', // Allow Storage Access API on user interaction
    'allow-top-navigation-by-user-activation', // Only allow top navigation via user action
  ].join(' ');

  // Dispatch load start event for performance monitoring
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('docmost-iframe-load-start'));
  }, []);

  return (
    <div className={`docmost-container ${className}`}>
      {/* Loading State */}
      {loading && (
        <div className='docmost-loading'>
          {showSkeleton ? (
            <div style={{ width: '100%', padding: '20px' }}>
              <Skeleton active paragraph={{ rows: 4 }} />
              <Skeleton.Button
                active
                size='large'
                style={{ width: '200px', marginTop: '16px' }}
              />
            </div>
          ) : (
            <>
              <Spin size='large' />
              <div
                style={{
                  marginTop: '16px',
                  color: 'var(--text-color-secondary)',
                }}
              >
                {t('docmost.loading', 'Loading Docmost system...')}
              </div>
            </>
          )}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className='docmost-error'>
          <Result
            status='error'
            title={t('docmost.errors.title', 'Docmost Unavailable')}
            subTitle={error}
            extra={
              <Button
                type='primary'
                icon={<ReloadOutlined />}
                onClick={handleRetry}
                disabled={retryCount >= 3}
              >
                {retryCount >= 3
                  ? t('docmost.errors.maxRetries', 'Max retries reached')
                  : t('docmost.errors.retry', 'Retry')}
              </Button>
            }
          />
        </div>
      )}

      {/* Docmost Iframe */}
      {!error && (
        <iframe
          key={retryCount} // Force re-render on retry
          src={src}
          title={title}
          className='docmost-iframe'
          onLoad={handleLoad}
          onError={handleError}
          sandbox={sandboxAttributes}
          referrerPolicy='strict-origin-when-cross-origin'
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: loading ? 'none' : 'block',
          }}
          allow='clipboard-read; clipboard-write'
        />
      )}

      {/* Development mode indicator removed as requested */}
    </div>
  );
};

export default DocmostContainer;
