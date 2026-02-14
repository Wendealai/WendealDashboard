/**
 * CRM Container Component
 * Handles iframe integration with Twenty CRM platform
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Spin, Alert, Result, Button, Skeleton, Space, Tooltip } from 'antd';
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

  /**
   * Handle iframe load success
   */
  const handleLoad = useCallback(() => {
    setLoading(false);
    setShowSkeleton(false);
    setError(null);

    // Dispatch performance event
    window.dispatchEvent(new CustomEvent('crm-iframe-loaded'));

    console.log('CRM iframe loaded successfully');

    // 监听 iframe 内的消息（用于调试登录问题）
    const handleMessage = (event: MessageEvent) => {
      // 只接受来自 CRM 域的消息
      if (event.origin.includes('wendealai.com.au')) {
        console.log('CRM message received:', event.data);
      }
    };
    window.addEventListener('message', handleMessage);

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  /**
   * Handle iframe load error
   */
  const handleError = useCallback(() => {
    setLoading(false);
    setShowSkeleton(false);
    setError(t('crm.errors.loadFailed', 'Failed to load CRM system'));
    setShowOpenExternalHint(true);

    // Dispatch error event for monitoring
    window.dispatchEvent(new CustomEvent('crm-error'));

    console.error(
      'CRM iframe failed to load - This may be due to X-Frame-Options blocking iframe embedding'
    );
  }, [t]);

  /**
   * 在新窗口打开 CRM
   */
  const handleOpenExternal = useCallback(() => {
    window.open(src, '_blank', 'noopener,noreferrer');
  }, [src]);

  /**
   * Retry loading the iframe
   */
  const handleRetry = useCallback(() => {
    setLoading(true);
    setShowSkeleton(true);
    setError(null);
    setRetryCount(prev => prev + 1);

    // Dispatch retry event for monitoring
    window.dispatchEvent(new CustomEvent('crm-retry'));

    // Force reload by updating the key
    const iframe = document.querySelector('.crm-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = src;
    }
  }, [src]);

  // Security sandbox attributes for iframe
  // Twenty CRM 需要这些权限才能正常登录和运行
  const sandboxAttributes = [
    'allow-same-origin', // Allow same-origin requests (必需：访问 cookies 和 localStorage)
    'allow-scripts', // Allow JavaScript execution (必需：运行 Twenty CRM)
    'allow-forms', // Allow form submission (必需：登录表单)
    'allow-popups', // Allow popup windows (可能需要：OAuth 登录、文件预览等)
    'allow-popups-to-escape-sandbox', // Allow popups to escape sandbox (OAuth 认证窗口)
    'allow-modals', // Allow modals (必需：登录对话框、确认框等)
    'allow-storage-access-by-user-activation', // Allow storage access (必需：保持登录状态)
    'allow-downloads', // Allow downloads (可能需要：导出文件)
    'allow-top-navigation', // Allow top navigation (登录重定向可能需要)
    'allow-presentation', // Allow presentation mode
  ].join(' ');

  // Dispatch load start event for performance monitoring
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('crm-iframe-load-start'));
  }, []);

  return (
    <div className={`crm-container ${className}`}>
      {/* 顶部提示栏：如果登录有问题，建议在新窗口打开 */}
      {!loading && !error && (
        <Alert
          message={
            <Space>
              <InfoCircleOutlined />
              <span>
                如果登录遇到问题，请点击右侧按钮在新窗口打开 Twenty CRM
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
              在新窗口打开
            </Button>
          }
          style={{ marginBottom: '8px' }}
        />
      )}

      {/* Loading State */}
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

      {/* Error State */}
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
                    如果 iframe 无法加载，这可能是因为 Twenty CRM
                    的安全设置阻止了嵌入。
                    <br />
                    您可以点击下方按钮在新窗口中打开 CRM。
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
                  在新窗口打开 CRM
                </Button>
              ),
            ]}
          />
        </div>
      )}

      {/* CRM Iframe */}
      {!error && (
        <iframe
          key={retryCount} // Force re-render on retry
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
          // @ts-expect-error credentialless is a valid HTML attribute but not yet in React types
          credentialless='false'
        />
      )}

      {/* Development mode indicator removed as requested */}
    </div>
  );
};

export default CRMContainer;
