/**
 * CRM Container Component
 * Handles iframe integration with Twenty CRM platform
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Spin, Alert, Result, Button, Skeleton, Space } from 'antd';
import {
  ReloadOutlined,
  ExportOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

interface CRMContainerProps {
  /** CRM instance URL */
  src: string;
  /** Iframe title for accessibility */
  title: string;
  /** Additional CSS class */
  className?: string;
}

/**
 * CRM Container Component
 * Provides secure iframe integration with loading states and error handling
 */
const CRMContainer: React.FC<CRMContainerProps> = ({
  src,
  title,
  className = '',
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showOpenExternalHint, setShowOpenExternalHint] = useState(false);

  const crmOrigin = useMemo(() => {
    try {
      return new URL(src, window.location.origin).origin;
    } catch {
      return '';
    }
  }, [src]);

  /**
   * Handle iframe load success
   */
  const handleLoad = useCallback(() => {
    setLoading(false);
    setShowSkeleton(false);
    setError(null);

    window.dispatchEvent(new CustomEvent('crm-iframe-loaded'));
    console.log('CRM iframe loaded successfully');
  }, []);

  /**
   * Handle iframe load error
   */
  const handleError = useCallback(() => {
    setLoading(false);
    setShowSkeleton(false);
    setError(t('crm.errors.loadFailed', 'Failed to load CRM system'));
    setShowOpenExternalHint(true);

    window.dispatchEvent(new CustomEvent('crm-error'));

    console.error(
      'CRM iframe failed to load - This may be due to X-Frame-Options/CSP or third-party cookie restrictions'
    );
  }, [t]);

  /**
   * Open CRM in a new tab
   */
  const handleOpenExternal = useCallback(() => {
    try {
      const externalUrl = new URL(src, window.location.origin).toString();
      window.open(externalUrl, '_blank', 'noopener,noreferrer');
    } catch {
      window.open(src, '_blank', 'noopener,noreferrer');
    }
  }, [src]);

  /**
   * Retry loading the iframe
   */
  const handleRetry = useCallback(() => {
    setLoading(true);
    setShowSkeleton(true);
    setError(null);
    setRetryCount(prev => prev + 1);

    window.dispatchEvent(new CustomEvent('crm-retry'));

    const iframe = document.querySelector('.crm-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = src;
    }
  }, [src]);

  // Security sandbox attributes for iframe
  const sandboxAttributes = [
    'allow-same-origin',
    'allow-scripts',
    'allow-forms',
    'allow-popups',
    'allow-popups-to-escape-sandbox',
    'allow-modals',
    'allow-storage-access-by-user-activation',
    'allow-downloads',
    'allow-top-navigation',
    'allow-top-navigation-by-user-activation',
    'allow-presentation',
  ].join(' ');

  // Dispatch load start event for performance monitoring
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('crm-iframe-load-start'));
  }, []);

  // Optional cross-window debug logging for same CRM origin messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!crmOrigin || event.origin !== crmOrigin) return;
      console.log('CRM message received:', event.data);
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [crmOrigin]);

  return (
    <div className={`crm-container ${className}`}>
      {!loading && !error && (
        <Alert
          message={
            <Space>
              <InfoCircleOutlined />
              <span>
                {t(
                  'crm.loginHint',
                  'If login is blocked in iframe, open Twenty CRM in a new tab.'
                )}
              </span>
            </Space>
          }
          type='info'
          showIcon={false}
          closable
          action={
            <Button
              size='small'
              type='link'
              icon={<ExportOutlined />}
              onClick={handleOpenExternal}
            >
              {t('crm.openExternal', 'Open in new tab')}
            </Button>
          }
          style={{ marginBottom: '8px' }}
        />
      )}

      {loading && (
        <div className='crm-loading'>
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
                {t('crm.loading', 'Loading CRM system...')}
              </div>
            </>
          )}
        </div>
      )}

      {error && !loading && (
        <div className='crm-error'>
          <Result
            status='error'
            title={t('crm.errors.title', 'CRM Unavailable')}
            subTitle={
              <div>
                <p>{error}</p>
                {showOpenExternalHint && (
                  <p style={{ marginTop: '8px', color: '#666' }}>
                    {t(
                      'crm.errors.iframeBlockedHint',
                      'Embedding may be blocked by security settings or third-party cookie policies. Please open CRM in a new tab.'
                    )}
                  </p>
                )}
              </div>
            }
            extra={[
              <Button
                key='retry'
                type='primary'
                icon={<ReloadOutlined />}
                onClick={handleRetry}
                disabled={retryCount >= 3}
              >
                {retryCount >= 3
                  ? t('crm.errors.maxRetries', 'Max retries reached')
                  : t('crm.errors.retry', 'Retry')}
              </Button>,
              showOpenExternalHint && (
                <Button
                  key='external'
                  type='default'
                  onClick={handleOpenExternal}
                  style={{ marginLeft: '8px' }}
                >
                  {t('crm.openExternal', 'Open in new tab')}
                </Button>
              ),
            ]}
          />
        </div>
      )}

      {!error && (
        <iframe
          key={retryCount}
          src={src}
          title={title}
          className='crm-iframe'
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
          allow='clipboard-read; clipboard-write; storage-access'
        />
      )}
    </div>
  );
};

export default CRMContainer;
