/**
 * CRM Error Boundary Component
 * Provides error handling and graceful degradation for CRM module
 */

import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Result, Button, Space, Typography, Alert } from 'antd';
import { ReloadOutlined, BugOutlined, HomeOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const { Text, Paragraph } = Typography;

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId: string;
}

/**
 * CRM Error Boundary Component
 * Catches JavaScript errors in the CRM component tree and displays a fallback UI
 */
class CRMErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Generate unique error ID for tracking
    const errorId = `crm-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      hasError: true,
      error,
      errorId,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('CRM Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId: this.state.errorId,
    });

    // In production, you might want to send this to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to error reporting service
      // errorReportingService.captureException(error, {
      //   extra: { componentStack: errorInfo.componentStack, errorId: this.state.errorId }
      // });
    }

    this.setState({
      errorInfo,
    });
  }

  override componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  handleRetry = () => {
    // Clear any existing timeout
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }

    // Reset error state after a brief delay to allow for re-rendering
    this.retryTimeoutId = window.setTimeout(() => {
      this.setState({
        hasError: false,
        errorId: '',
      });
    }, 100);
  };

  handleGoHome = () => {
    // Navigate to dashboard/home
    window.location.href = '/';
  };

  override render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <CRMErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          onRetry={this.handleRetry}
          onGoHome={this.handleGoHome}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Error Fallback UI Component
 */
interface ErrorFallbackProps {
  error?: Error | undefined;
  errorInfo?: ErrorInfo | undefined;
  errorId: string;
  onRetry: () => void;
  onGoHome: () => void;
}

const CRMErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  errorInfo,
  errorId,
  onRetry,
  onGoHome,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--card-color)',
        borderRadius: '8px',
      }}
    >
      <Result
        status='error'
        icon={<BugOutlined style={{ color: 'var(--color-error)' }} />}
        title={
          <Text strong style={{ fontSize: '18px', color: 'var(--text-color)' }}>
            {t('crm.errors.boundary.title', 'CRM System Error')}
          </Text>
        }
        subTitle={
          <Paragraph
            style={{
              color: 'var(--text-color-secondary)',
              margin: '8px 0 16px',
            }}
          >
            {t(
              'crm.errors.boundary.message',
              'Something went wrong while loading the CRM system. This error has been logged for investigation.'
            )}
          </Paragraph>
        }
        extra={
          <Space direction='vertical' style={{ width: '100%' }}>
            <Space>
              <Button
                type='primary'
                icon={<ReloadOutlined />}
                onClick={onRetry}
                size='large'
              >
                {t('crm.errors.retry', 'Try Again')}
              </Button>
              <Button icon={<HomeOutlined />} onClick={onGoHome} size='large'>
                {t('common.goHome', 'Go to Dashboard')}
              </Button>
            </Space>

            {/* Development error details */}
            {process.env.NODE_ENV === 'development' && error && (
              <Alert
                message={t('crm.errors.details', 'Error Details (Development)')}
                description={
                  <div style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                    <div>
                      <strong>Error ID:</strong> {errorId}
                    </div>
                    <div>
                      <strong>Message:</strong> {error.message}
                    </div>
                    {error.stack && (
                      <details style={{ marginTop: '8px' }}>
                        <summary
                          style={{ cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          Stack Trace
                        </summary>
                        <pre
                          style={{
                            marginTop: '8px',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            maxHeight: '200px',
                            overflow: 'auto',
                            background: 'var(--color-bg-container)',
                            padding: '8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                          }}
                        >
                          {error.stack}
                        </pre>
                      </details>
                    )}
                    {errorInfo?.componentStack && (
                      <details style={{ marginTop: '8px' }}>
                        <summary
                          style={{ cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          Component Stack
                        </summary>
                        <pre
                          style={{
                            marginTop: '8px',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            maxHeight: '150px',
                            overflow: 'auto',
                            background: 'var(--color-bg-container)',
                            padding: '8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                          }}
                        >
                          {errorInfo.componentStack}
                        </pre>
                      </details>
                    )}
                  </div>
                }
                type='warning'
                showIcon
                style={{ marginTop: '16px' }}
              />
            )}
          </Space>
        }
      />
    </div>
  );
};

export default CRMErrorBoundary;
