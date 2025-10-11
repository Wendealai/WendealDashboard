/**
 * Calendar Error Boundary Component
 * Provides error handling for the Calendar module
 */

import React, { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { Result, Button, Typography } from 'antd';
import { ReloadOutlined, HomeOutlined } from '@ant-design/icons';

const { Paragraph, Text } = Typography;

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error | undefined;
  errorInfo?: ErrorInfo | undefined;
}

/**
 * Calendar Error Boundary
 * Catches JavaScript errors anywhere in the Calendar module tree
 */
class CalendarErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details for debugging
    console.error('Calendar module error:', error);
    console.error('Error info:', errorInfo);

    // Dispatch error event for monitoring
    window.dispatchEvent(
      new CustomEvent('calendar-error-boundary', {
        detail: { error, errorInfo },
      })
    );

    this.setState({
      error,
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  override render() {
    if (this.state.hasError) {
      // Render error UI
      return (
        <div
          style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <Result
            status='error'
            title='Calendar模块出现错误'
            subTitle='抱歉，Calendar模块遇到了一个意外错误。请尝试刷新页面或返回首页。'
            extra={[
              <Button
                key='retry'
                type='primary'
                icon={<ReloadOutlined />}
                onClick={this.handleRetry}
              >
                重试
              </Button>,
              <Button
                key='home'
                icon={<HomeOutlined />}
                onClick={this.handleGoHome}
              >
                返回首页
              </Button>,
            ]}
          >
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div style={{ textAlign: 'left', marginTop: '20px' }}>
                <Paragraph strong>开发模式错误详情：</Paragraph>
                <Text code style={{ whiteSpace: 'pre-wrap' }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </Text>
              </div>
            )}
          </Result>
        </div>
      );
    }

    return this.props.children;
  }
}

export default CalendarErrorBoundary;
