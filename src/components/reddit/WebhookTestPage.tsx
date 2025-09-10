/**
 * Webhook测试页面
 * 用于诊断和测试Reddit webhook连接问题
 */

import React, { useState } from 'react';
import { Card, Button, Alert, Typography, Space, Spin, Progress, Divider } from 'antd';
import { redditWebhookService } from '@/services/redditWebhookService';
import { BugOutlined, CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface TestResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  details?: any;
}

export const WebhookTestPage: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const addResult = (result: TestResult) => {
    setResults(prev => [...prev, result]);
  };

  const updateResult = (index: number, updates: Partial<TestResult>) => {
    setResults(prev => prev.map((result, i) =>
      i === index ? { ...result, ...updates } : result
    ));
  };

  const runFullTest = async () => {
    setIsRunning(true);
    setResults([]);
    setProgress(0);

    const tests = [
      {
        name: '环境检测',
        test: async () => {
          const isDevelopment =
            (typeof window !== 'undefined' &&
             (window.location.hostname === 'localhost' ||
              window.location.hostname === '127.0.0.1' ||
              window.location.hostname.includes('.local'))) ||
            (typeof window !== 'undefined' &&
             (window.location.port === '5173' || window.location.port === '3000')) ||
            (typeof process !== 'undefined' && process.env.NODE_ENV === 'development');

          return {
            isDevelopment,
            hostname: typeof window !== 'undefined' ? window.location.hostname : 'N/A',
            port: typeof window !== 'undefined' ? window.location.port : 'N/A',
            nodeEnv: typeof process !== 'undefined' ? process.env.NODE_ENV : 'N/A',
            webhookUrl: redditWebhookService.getWebhookUrl(),
          };
        },
      },
      {
        name: 'URL格式验证',
        test: async () => {
          const url = redditWebhookService.getWebhookUrl();
          const validation = redditWebhookService.validateWebhookUrl(url);
          return { url, validation };
        },
      },
      {
        name: '网络连接测试',
        test: async () => {
          try {
            const response = await fetch('https://httpbin.org/status/200', {
              method: 'GET',
              signal: AbortSignal.timeout(5000),
            });
            return { success: response.ok, status: response.status };
          } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        },
      },
      {
        name: 'n8n服务器连通性',
        test: async () => {
          try {
            const response = await fetch('https://n8n.wendealai.com', {
              method: 'HEAD',
              signal: AbortSignal.timeout(10000),
            });
            return { success: response.status < 500, status: response.status };
          } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        },
      },
      {
        name: 'Webhook端点测试',
        test: async () => {
          try {
            const result = await redditWebhookService.testWebhookConnection();
            return result;
          } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        },
      },
      {
        name: '完整工作流测试',
        test: async () => {
          try {
            const result = await redditWebhookService.triggerWebhook(
              (status: string) => console.log('Progress:', status)
            );

            if (result && typeof result === 'object') {
              // 检查是否有数据
              const hasData = result.success !== undefined ||
                            (result.json && result.json.telegramMessage) ||
                            (result.subreddits && result.subreddits.length > 0);

              return {
                success: hasData,
                dataKeys: result ? Object.keys(result) : [],
                hasTelegramMessage: !!(result.json && result.json.telegramMessage),
                subredditsCount: result.subreddits ? result.subreddits.length : 0,
                response: result,
              };
            }

            return { success: false, error: 'Invalid response format' };
          } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
          }
        },
      },
    ];

    for (let i = 0; i < tests.length; i++) {
      const test = tests[i];

      // 添加测试并标记为运行中
      addResult({
        name: test.name,
        status: 'running',
        message: '正在测试...',
      });

      try {
        const result = await test.test();

        updateResult(i, {
          status: result.success !== false ? 'success' : 'error',
          message: result.success !== false ? '测试通过' : '测试失败',
          details: result,
        });
      } catch (error) {
        updateResult(i, {
          status: 'error',
          message: '测试异常',
          details: { error: error instanceof Error ? error.message : 'Unknown error' },
        });
      }

      setProgress(((i + 1) / tests.length) * 100);
      await new Promise(resolve => setTimeout(resolve, 500)); // 短暂延迟以显示进度
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <LoadingOutlined />;
      case 'running':
        return <LoadingOutlined spin />;
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'running':
        return 'processing';
      default:
        return 'default';
    }
  };

  const renderTestDetails = (details: any) => {
    if (!details) return null;

    return (
      <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
        <pre style={{
          background: '#f5f5f5',
          padding: '8px',
          borderRadius: '4px',
          maxHeight: '200px',
          overflow: 'auto',
          fontSize: '11px',
        }}>
          {JSON.stringify(details, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }}>
      <Card
        title={
          <Space>
            <BugOutlined />
            <span>Webhook连接诊断测试</span>
          </Space>
        }
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* 测试说明 */}
          <Alert
            message="测试说明"
            description={
              <div>
                <Paragraph>
                  这个测试页面将帮助您诊断Reddit webhook连接的各种问题，包括：
                </Paragraph>
                <ul>
                  <li>环境检测 - 检查当前运行环境</li>
                  <li>URL格式验证 - 验证webhook URL格式</li>
                  <li>网络连接测试 - 测试基本网络连通性</li>
                  <li>n8n服务器连通性 - 测试n8n服务器是否可访问</li>
                  <li>Webhook端点测试 - 测试具体的webhook端点</li>
                  <li>完整工作流测试 - 测试完整的Reddit数据获取流程</li>
                </ul>
              </div>
            }
            type="info"
            showIcon
          />

          {/* 开始测试按钮 */}
          <Button
            type="primary"
            onClick={runFullTest}
            loading={isRunning}
            size="large"
            block
          >
            {isRunning ? '正在运行测试...' : '开始完整诊断测试'}
          </Button>

          {/* 进度条 */}
          {isRunning && (
            <Progress
              percent={progress}
              status="active"
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068',
              }}
            />
          )}

          {/* 测试结果 */}
          {results.length > 0 && (
            <Card size="small" title="测试结果">
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {results.map((result, index) => (
                  <Card
                    key={index}
                    size="small"
                    style={{
                      borderLeft: `4px solid ${
                        result.status === 'success' ? '#52c41a' :
                        result.status === 'error' ? '#ff4d4f' : '#1890ff'
                      }`
                    }}
                  >
                    <Space align="start">
                      {getStatusIcon(result.status)}
                      <Space direction="vertical" size={0} style={{ flex: 1 }}>
                        <Text strong>{result.name}</Text>
                        <Text type={result.status === 'error' ? 'danger' : 'secondary'}>
                          {result.message}
                        </Text>
                        {renderTestDetails(result.details)}
                      </Space>
                    </Space>
                  </Card>
                ))}
              </Space>
            </Card>
          )}

          {/* 问题解决建议 */}
          {results.some(r => r.status === 'error') && (
            <Alert
              message="发现问题 - 解决建议"
              description={
                <Space direction="vertical">
                  <Paragraph>
                    根据测试结果，这里是一些常见的解决建议：
                  </Paragraph>
                  <ul>
                    {results.find(r => r.name === '环境检测' && r.details?.isDevelopment === false) && (
                      <li><strong>生产环境问题：</strong> 确保webhook URL配置正确，并且服务器可以访问</li>
                    )}
                    {results.find(r => r.name === '网络连接测试' && !r.details?.success) && (
                      <li><strong>网络连接问题：</strong> 检查您的互联网连接，可能存在DNS或网络配置问题</li>
                    )}
                    {results.find(r => r.name === 'n8n服务器连通性' && !r.details?.success) && (
                      <li><strong>n8n服务器问题：</strong> n8n服务器可能不可用，请联系管理员检查服务器状态</li>
                    )}
                    {results.find(r => r.name === 'Webhook端点测试' && !r.details?.success) && (
                      <li><strong>Webhook端点问题：</strong> 请检查n8n工作流配置，确保webhook路径正确</li>
                    )}
                    {results.find(r => r.name === '完整工作流测试' && !r.details?.success) && (
                      <li><strong>工作流执行问题：</strong> 工作流可能配置有误或执行失败，请检查n8n工作流日志</li>
                    )}
                  </ul>
                </Space>
              }
              type="warning"
              showIcon
            />
          )}

          {/* 成功提示 */}
          {results.length > 0 && results.every(r => r.status === 'success') && (
            <Alert
              message="所有测试通过！"
              description="您的Reddit webhook连接工作正常。如果仍然遇到问题，请检查浏览器控制台的详细日志。"
              type="success"
              showIcon
            />
          )}
        </Space>
      </Card>
    </div>
  );
};

