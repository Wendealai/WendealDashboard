/**
 * Webhook连接诊断组件
 * 帮助用户诊断和解决Reddit工作流网络问题
 */

import React, { useState } from 'react';
import { Button, Card, Alert, Spin, Progress, Typography, Space, Tag } from 'antd';
import { redditWebhookService } from '@/services/redditWebhookService';
import { CheckCircleOutlined, CloseCircleOutlined, LoadingOutlined, BugOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface DiagnosticResult {
  step: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message: string;
  details?: string;
}

export const WebhookDiagnostic: React.FC = () => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const addResult = (result: DiagnosticResult) => {
    setResults(prev => [...prev, result]);
  };

  const updateResult = (index: number, updates: Partial<DiagnosticResult>) => {
    setResults(prev => prev.map((result, i) =>
      i === index ? { ...result, ...updates } : result
    ));
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    setProgress(0);

    const diagnosticSteps = [
      {
        step: '检查网络连接',
        test: async () => {
          // 测试基本网络连接
          try {
            const response = await fetch('https://httpbin.org/status/200', {
              method: 'GET',
              signal: AbortSignal.timeout(5000),
            });
            return response.ok;
          } catch {
            return false;
          }
        },
      },
      {
        step: '验证webhook URL格式',
        test: async () => {
          const isValid = redditWebhookService.validateWebhookUrl(
            redditWebhookService.getWebhookUrl()
          );
          return isValid.valid;
        },
      },
      {
        step: '测试n8n服务器连通性',
        test: async () => {
          // 测试n8n服务器基础连通性
          try {
            const response = await fetch('https://n8n.wendealai.com', {
              method: 'HEAD',
              signal: AbortSignal.timeout(10000),
            });
            return response.status < 500;
          } catch {
            return false;
          }
        },
      },
      {
        step: '测试webhook端点响应',
        test: async () => {
          const result = await redditWebhookService.testWebhookConnection();
          return result.success;
        },
      },
    ];

    for (let i = 0; i < diagnosticSteps.length; i++) {
      const step = diagnosticSteps[i];

      // 添加步骤并标记为运行中
      addResult({
        step: step.step,
        status: 'running',
        message: '正在测试...',
      });

      try {
        const success = await step.test();

        updateResult(i, {
          status: success ? 'success' : 'error',
          message: success ? '测试通过' : '测试失败',
          details: success ? undefined : '请检查网络配置或服务器状态',
        });
      } catch (error) {
        updateResult(i, {
          status: 'error',
          message: '测试异常',
          details: error instanceof Error ? error.message : '未知错误',
        });
      }

      setProgress(((i + 1) / diagnosticSteps.length) * 100);
      await new Promise(resolve => setTimeout(resolve, 500)); // 短暂延迟以显示进度
    }

    setIsRunning(false);
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
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

  const getStatusColor = (status: DiagnosticResult['status']) => {
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

  const getWebhookUrl = () => redditWebhookService.getWebhookUrl();

  return (
    <Card
      title={
        <Space>
          <BugOutlined />
          <span>Webhook连接诊断</span>
        </Space>
      }
      style={{ maxWidth: 800, margin: '0 auto' }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 当前配置信息 */}
        <Card size="small" title="当前配置">
          <Space direction="vertical">
            <Text strong>Webhook URL:</Text>
            <Text code>{getWebhookUrl()}</Text>
            <Text strong>环境:</Text>
            <Text>
              {typeof window !== 'undefined' && window.location.hostname === 'localhost'
                ? '开发环境 (使用代理)'
                : '生产环境 (直接连接)'}
            </Text>
          </Space>
        </Card>

        {/* 诊断按钮 */}
        <Button
          type="primary"
          onClick={runDiagnostics}
          loading={isRunning}
          size="large"
          block
        >
          {isRunning ? '正在诊断...' : '开始诊断'}
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

        {/* 诊断结果 */}
        {results.length > 0 && (
          <Card size="small" title="诊断结果">
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
                    <Space direction="vertical" size={0}>
                      <Text strong>{result.step}</Text>
                      <Tag color={getStatusColor(result.status)}>
                        {result.message}
                      </Tag>
                      {result.details && (
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {result.details}
                        </Text>
                      )}
                    </Space>
                  </Space>
                </Card>
              ))}
            </Space>
          </Card>
        )}

        {/* 解决建议 */}
        {results.some(r => r.status === 'error') && (
          <Alert
            message="发现问题"
            description={
              <Space direction="vertical">
                <Paragraph>
                  诊断发现了一些问题。根据测试结果，这里是一些解决建议：
                </Paragraph>
                <ul>
                  {results.find(r => r.step === '检查网络连接' && r.status === 'error') && (
                    <li>网络连接问题：请检查您的互联网连接</li>
                  )}
                  {results.find(r => r.step === '验证webhook URL格式' && r.status === 'error') && (
                    <li>URL格式问题：请检查webhook URL的格式是否正确</li>
                  )}
                  {results.find(r => r.step === '测试n8n服务器连通性' && r.status === 'error') && (
                    <li>n8n服务器问题：服务器可能不可用，请联系管理员</li>
                  )}
                  {results.find(r => r.step === '测试webhook端点响应' && r.status === 'error') && (
                    <li>Webhook端点问题：请检查n8n工作流配置或CORS设置</li>
                  )}
                </ul>
              </Space>
            }
            type="warning"
            showIcon
          />
        )}

        {/* 成功信息 */}
        {results.length > 0 && results.every(r => r.status === 'success') && (
          <Alert
            message="诊断完成"
            description="所有测试都通过了！您的Reddit工作流应该可以正常运行。"
            type="success"
            showIcon
          />
        )}
      </Space>
    </Card>
  );
};

