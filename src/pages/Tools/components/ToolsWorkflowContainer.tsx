/**
 * Tools Workflow Container Component
 * Handles iframe integration with external business tools
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Spin, Alert, Result, Button, Skeleton } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import './ToolsWorkflowContainer.css';

interface ToolsWorkflowContainerProps {
  /** Tools instance URL */
  src: string;
  /** Iframe title for accessibility */
  title: string;
  /** Additional CSS class */
  className?: string;
}

/**
 * Tools Workflow Container Component
 * Provides secure iframe integration with loading states and error handling
 */
const ToolsWorkflowContainer: React.FC<ToolsWorkflowContainerProps> = ({
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
    window.dispatchEvent(new CustomEvent('tools-workflow-iframe-loaded'));

    console.log('Tools workflow iframe loaded successfully');
  }, []);

  /**
   * Handle iframe load error
   */
  const handleError = useCallback(() => {
    setLoading(false);
    setShowSkeleton(false);
    setError(
      t('tools.workflow.errors.loadFailed', 'Failed to load business tools')
    );

    // Dispatch error event for monitoring
    window.dispatchEvent(new CustomEvent('tools-workflow-error'));

    console.error('Tools workflow iframe failed to load');
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
    window.dispatchEvent(new CustomEvent('tools-workflow-retry'));

    // Force reload by updating the key
    const iframe = document.querySelector(
      '.tools-workflow-iframe'
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
    'allow-top-navigation', // Allow navigation to top-level window
  ].join(' ');

  // Dispatch load start event for performance monitoring
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('tools-workflow-iframe-load-start'));
  }, []);

  return (
    <div className={`tools-workflow-container ${className}`}>
      {/* Loading State */}
      {loading && (
        <div className='tools-workflow-loading'>
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
                {t('tools.workflow.loading', 'Loading business tools...')}
              </div>
            </>
          )}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className='tools-workflow-error'>
          <Result
            status='error'
            title={t(
              'tools.workflow.errors.title',
              'Business Tools Unavailable'
            )}
            subTitle={error}
            extra={
              <Button
                type='primary'
                icon={<ReloadOutlined />}
                onClick={handleRetry}
                disabled={retryCount >= 3}
              >
                {retryCount >= 3
                  ? t('tools.workflow.errors.maxRetries', 'Max retries reached')
                  : t('tools.workflow.errors.retry', 'Retry')}
              </Button>
            }
          />
        </div>
      )}

      {/* Tools Workflow Iframe */}
      {!error && (
        <div className='tools-workflow-responsive'>
          <iframe
            key={retryCount} // Force re-render on retry
            src={src}
            title={title}
            className='tools-workflow-iframe'
            onLoad={handleLoad}
            onError={handleError}
            sandbox={sandboxAttributes}
            referrerPolicy='strict-origin-when-cross-origin'
            style={{
              border: '0',
              display: loading ? 'none' : 'block',
            }}
            allow='clipboard-read; clipboard-write'
          />
        </div>
      )}

      {/* Development mode indicator removed as requested */}
    </div>
  );
};

export default ToolsWorkflowContainer;
