/**
 * Note Container Component
 * Handles iframe integration with Note platform
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Spin, Alert, Result, Button, Skeleton } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface NoteContainerProps {
  /** Note instance URL */
  src: string;
  /** Iframe title for accessibility */
  title: string;
  /** Additional CSS class */
  className?: string;
}

/**
 * Note Container Component
 * Provides secure iframe integration with loading states and error handling
 */
const NoteContainer: React.FC<NoteContainerProps> = ({
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
    window.dispatchEvent(new CustomEvent('note-iframe-loaded'));

    console.log('Note iframe loaded successfully');
  }, []);

  /**
   * Handle iframe load error
   */
  const handleError = useCallback(() => {
    setLoading(false);
    setShowSkeleton(false);
    setError(t('note.errors.loadFailed', 'Failed to load Note system'));

    // Dispatch error event for monitoring
    window.dispatchEvent(new CustomEvent('note-error'));

    console.error('Note iframe failed to load');
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
    window.dispatchEvent(new CustomEvent('note-retry'));

    // Force reload by updating the key
    const iframe = document.querySelector('.note-iframe') as HTMLIFrameElement;
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
    'allow-top-navigation', // Allow navigation to top-level window
  ].join(' ');

  // Dispatch load start event for performance monitoring
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('note-iframe-load-start'));
  }, []);

  return (
    <div className={`note-container ${className}`}>
      {/* Loading State */}
      {loading && (
        <div className='note-loading'>
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
                {t('note.loading', 'Loading Note system...')}
              </div>
            </>
          )}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className='note-error'>
          <Result
            status='error'
            title={t('note.errors.title', 'Note Unavailable')}
            subTitle={error}
            extra={
              <Button
                type='primary'
                icon={<ReloadOutlined />}
                onClick={handleRetry}
                disabled={retryCount >= 3}
              >
                {retryCount >= 3
                  ? t('note.errors.maxRetries', 'Max retries reached')
                  : t('note.errors.retry', 'Retry')}
              </Button>
            }
          />
        </div>
      )}

      {/* Note Iframe */}
      {!error && (
        <iframe
          key={retryCount} // Force re-render on retry
          src={src}
          title={title}
          className='note-iframe'
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

export default NoteContainer;
