import React, { useState } from 'react';
import { Card, Button, Input, Space, Alert, Typography, Divider } from 'antd';
import { useTranslation } from 'react-i18next';
import { chatService, SessionManager } from '@/services/chatService';
import { notificationService } from '@/services/notificationService';

const { Title, Text } = Typography;

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

const WebhookTest: React.FC = () => {
  const { t } = useTranslation();
  const [testMessage, setTestMessage] = useState('你好，这是一个测试消息');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const runWebhookTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      console.log('🧪 开始webhook连接测试...');
      console.log('📝 测试消息:', testMessage);

      const response = await chatService.sendMessage(
        testMessage,
        'test-user',
        'test-session'
      );

      console.log('✅ 测试成功:', response);

      setTestResult({
        success: true,
        message: 'Webhook连接测试成功！',
        details: response,
      });
    } catch (error) {
      console.error('❌ 测试失败:', error);

      setTestResult({
        success: false,
        message: 'Webhook连接测试失败',
        details: error,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const runMockTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      console.log('🧪 开始模拟测试...');

      const response = await chatService.sendMessageMock(testMessage);

      console.log('✅ 模拟测试成功:', response);

      setTestResult({
        success: true,
        message: '模拟测试成功！',
        details: response,
      });
    } catch (error) {
      console.error('❌ 模拟测试失败:', error);

      setTestResult({
        success: false,
        message: '模拟测试失败',
        details: error,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const clearResult = () => {
    setTestResult(null);
  };

  return (
    <Card
      title='Webhook连接测试工具'
      style={{ maxWidth: 600, margin: '20px auto' }}
      extra={
        <Button onClick={clearResult} size='small'>
          清空结果
        </Button>
      }
    >
      <Space direction='vertical' style={{ width: '100%' }} size='large'>
        <div>
          <Title level={4}>测试配置</Title>
          <div style={{ marginBottom: 16 }}>
            <Text strong>Webhook URL: </Text>
            <Text code>{import.meta.env.VITE_N8N_WEBHOOK_URL || '未配置'}</Text>
          </div>
          <div style={{ marginBottom: 16 }}>
            <Text strong>API Key: </Text>
            <Text code>
              {import.meta.env.VITE_N8N_API_KEY ? '已配置' : '未配置'}
            </Text>
          </div>
          <div style={{ marginBottom: 16 }}>
            <Text strong>WebSocket状态: </Text>
            <Text
              code
              style={{
                color: notificationService.isWebSocketConnected()
                  ? '#52c41a'
                  : '#ff4d4f',
              }}
            >
              {notificationService.isWebSocketConnected() ? '已连接' : '已禁用'}
            </Text>
          </div>
          <div style={{ marginBottom: 16 }}>
            <Text strong>Session ID: </Text>
            <Text code style={{ color: '#1890ff' }}>
              {SessionManager.getInstance().getSessionId()}
            </Text>
          </div>
        </div>

        <Divider />

        <div>
          <Title level={4}>测试消息</Title>
          <Input.TextArea
            value={testMessage}
            onChange={e => setTestMessage(e.target.value)}
            placeholder='输入测试消息'
            rows={3}
          />
        </div>

        <div>
          <Title level={4}>测试选项</Title>
          <Space>
            <Button
              type='primary'
              onClick={runWebhookTest}
              loading={isTesting}
              disabled={!import.meta.env.VITE_N8N_WEBHOOK_URL}
            >
              测试Webhook连接
            </Button>
            <Button onClick={runMockTest} loading={isTesting}>
              测试模拟模式
            </Button>
            <Button
              onClick={() => {
                console.log('WebSocket状态检查:');
                console.log(
                  '- 是否已连接:',
                  notificationService.isWebSocketConnected()
                );
                console.log(
                  '- 是否已启用:',
                  import.meta.env.VITE_ENABLE_WEBSOCKET
                );
                console.log('- Socket URL:', import.meta.env.VITE_SOCKET_URL);
                alert(
                  `WebSocket状态: ${notificationService.isWebSocketConnected() ? '已连接' : '已禁用'}\n请查看控制台获取详细信息`
                );
              }}
            >
              检查WebSocket状态
            </Button>
          </Space>
        </div>

        {testResult && (
          <div>
            <Title level={4}>测试结果</Title>
            <Alert
              message={testResult.message}
              type={testResult.success ? 'success' : 'error'}
              showIcon
              style={{ marginBottom: 16 }}
            />
            {testResult.details && (
              <div>
                <Text strong>详细信息:</Text>
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: '12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    maxHeight: '200px',
                    overflow: 'auto',
                  }}
                >
                  {typeof testResult.details === 'string'
                    ? testResult.details
                    : JSON.stringify(testResult.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        <Divider />

        <div>
          <Title level={4}>调试信息</Title>
          <Alert
            message='请打开浏览器开发者工具的Console查看详细调试信息'
            type='info'
            showIcon
          />
        </div>
      </Space>
    </Card>
  );
};

export default WebhookTest;
