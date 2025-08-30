import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Result, Button } from 'antd';
import { ReloadOutlined, HomeOutlined } from '@ant-design/icons';
import { withTranslation } from 'react-i18next';
import type { WithTranslation } from 'react-i18next';
import i18n from '../../locales';

interface Props extends WithTranslation {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error | undefined;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  // 安全的翻译函数
  private safeT = (key: string, fallback?: string): string => {
    try {
      if (this.props.t) {
        return this.props.t(key);
      }
      if (i18n.t) {
        return i18n.t(key);
      }
      return fallback || key;
    } catch (e) {
      console.warn(
        'Translation not available in ErrorBoundary, using fallback'
      );
      return fallback || key;
    }
  };

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console or error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  override render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '400px',
            padding: '20px',
          }}
        >
          <Result
            status='error'
            title={this.safeT('errorBoundary.title', '出现错误')}
            subTitle={this.safeT(
              'errorBoundary.subtitle',
              '抱歉，发生了意外错误'
            )}
            extra={[
              <Button
                key='retry'
                type='primary'
                icon={<ReloadOutlined />}
                onClick={this.handleRetry}
              >
                {this.safeT('errorBoundary.buttons.retry', '重试')}
              </Button>,
              <Button
                key='reload'
                icon={<ReloadOutlined />}
                onClick={this.handleReload}
              >
                {this.safeT('errorBoundary.buttons.reload', '重新加载')}
              </Button>,
              <Button
                key='home'
                icon={<HomeOutlined />}
                onClick={this.handleGoHome}
              >
                {this.safeT('errorBoundary.buttons.goHome', '返回首页')}
              </Button>,
            ]}
          >
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{ marginTop: '16px', textAlign: 'left' }}>
                <summary>
                  {this.safeT('errorBoundary.errorDetails', '错误详情')}
                </summary>
                <pre
                  style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}
                >
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </Result>
        </div>
      );
    }

    return this.props.children;
  }
}

export default withTranslation()(ErrorBoundary);
