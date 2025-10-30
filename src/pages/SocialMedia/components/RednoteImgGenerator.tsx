/**
 * Rednote Image Generator Component
 * 小红书图片生成器组件
 */

import React, { useState, useCallback } from 'react';
import {
  Card,
  Input,
  Button,
  Space,
  Typography,
  Alert,
  Spin,
  Row,
  Col,
  Divider,
  Progress,
  message as antdMessage,
} from 'antd';
import {
  EditOutlined,
  SendOutlined,
  ReloadOutlined,
  EyeOutlined,
  FileImageOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import type { RednoteImgRequest, RednoteImgResponse } from '../types';
import './RednoteImgGenerator.css';

const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

/**
 * Rednote Image Generator Component Props Interface
 */
interface RednoteImgGeneratorProps {
  onContentGenerated?: (response: RednoteImgResponse) => void;
  className?: string;
}

/**
 * Rednote Image Generator Component
 * 提供输入文案，通过webhook发送到n8n生成图片HTML
 */
const RednoteImgGenerator: React.FC<RednoteImgGeneratorProps> = ({
  onContentGenerated,
  className,
}) => {
  // 状态管理
  const [inputContent, setInputContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>('');
  const [generatedHtml, setGeneratedHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  /**
   * 重置表单
   */
  const handleReset = useCallback(() => {
    setInputContent('');
    setGeneratedHtml('');
    setError(null);
    setProgress(0);
    setProgressText('');
  }, []);

  /**
   * 发送请求到n8n webhook
   */
  const handleGenerate = useCallback(async () => {
    if (!inputContent.trim()) {
      antdMessage.warning('Please enter content');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(0);
    setProgressText('Preparing to generate...');

    try {
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 500);

      // 准备请求数据
      const request: RednoteImgRequest = {
        content: inputContent.trim(),
        timestamp: new Date().toISOString(),
      };

      setProgressText('Sending request to n8n...');

      // 发送到n8n webhook
      const webhookUrl = 'https://n8n.wendealai.com/webhook/rednoteimg';

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WendealDashboard/1.0',
        },
        body: JSON.stringify(request),
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(
          `Request failed: ${response.status} ${response.statusText}`
        );
      }

      setProgressText('Processing response...');

      const data = await response.json();

      console.log('n8n response data:', data);
      console.log('Is array?', Array.isArray(data));

      setProgress(100);
      setProgressText('Generation complete!');

      // 处理n8n返回的数组格式: [{ "output": "```html\n...```" }]
      let htmlContent = '';

      if (Array.isArray(data) && data.length > 0) {
        console.log('Processing array format, first item:', data[0]);
        // 从数组第一个元素的output字段获取HTML
        const output = data[0]?.output;
        if (output) {
          console.log('Found output field, length:', output.length);
          // 去掉 ```html 和 ``` 标记
          htmlContent = output
            .replace(/^```html\n?/i, '') // 去掉开头的 ```html
            .replace(/\n?```$/i, '') // 去掉结尾的 ```
            .trim();
          console.log('Extracted HTML, length:', htmlContent.length);
        }
      } else if (data.html) {
        console.log('Processing direct html field format');
        // 兼容直接返回html字段的格式
        htmlContent = data.html;
      } else if (data.output) {
        console.log('Processing direct output field format');
        // 兼容直接返回output字段的格式
        htmlContent = data.output
          .replace(/^```html\n?/i, '')
          .replace(/\n?```$/i, '')
          .trim();
      }

      // 检查是否成功提取HTML
      if (htmlContent) {
        console.log('Successfully extracted HTML content');
        setGeneratedHtml(htmlContent);
        antdMessage.success('HTML generated successfully!');

        // 调用回调
        if (onContentGenerated) {
          onContentGenerated({
            success: true,
            html: htmlContent,
            timestamp: data.timestamp || new Date().toISOString(),
          });
        }
      } else {
        console.error('Failed to extract HTML content from response');
        throw new Error('HTML content not found in response');
      }
    } catch (err: any) {
      console.error('Generation failed:', err);
      setError(err.message || 'Generation failed, please try again');
      antdMessage.error(err.message || 'Generation failed, please try again');
      setProgress(0);
      setProgressText('');
    } finally {
      setLoading(false);
    }
  }, [inputContent, onContentGenerated]);

  /**
   * Open HTML in new window
   */
  const handleOpenInNewWindow = useCallback(() => {
    if (!generatedHtml) {
      antdMessage.warning('No content to display');
      return;
    }

    // 创建Blob URL
    const blob = new Blob([generatedHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // 在新窗口打开
    const newWindow = window.open(url, '_blank');

    if (!newWindow) {
      antdMessage.error(
        'Unable to open new window, please check browser popup settings'
      );
    } else {
      antdMessage.success('Opened in new window');

      // 清理URL（延迟清理，确保窗口已加载）
      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 1000);
    }
  }, [generatedHtml]);

  /**
   * Copy HTML to clipboard
   */
  const handleCopyHtml = useCallback(() => {
    if (!generatedHtml) {
      antdMessage.warning('No content to copy');
      return;
    }

    navigator.clipboard
      .writeText(generatedHtml)
      .then(() => {
        antdMessage.success('HTML code copied to clipboard');
      })
      .catch(err => {
        console.error('Copy failed:', err);
        antdMessage.error('Copy failed, please copy manually');
      });
  }, [generatedHtml]);

  return (
    <div className={`rednote-img-generator ${className || ''}`}>
      {/* Error Alert */}
      {error && (
        <Alert
          message='Generation Failed'
          description={error}
          type='error'
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Input Area */}
      <Card
        title={
          <Space>
            <EditOutlined />
            <span>Input Content</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              type='primary'
              icon={<SendOutlined />}
              onClick={handleGenerate}
              loading={loading}
              disabled={!inputContent.trim() || loading}
            >
              {loading ? 'Generating' : 'Generate'}
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              disabled={loading}
            >
              Reset
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <div>
          <Text strong style={{ marginBottom: 8, display: 'block' }}>
            Content <Text type='danger'>*</Text>
          </Text>
          <TextArea
            value={inputContent}
            onChange={e => setInputContent(e.target.value)}
            placeholder='Enter your Rednote content...'
            rows={12}
            maxLength={2000}
            showCount
            disabled={loading}
            style={{ width: '100%' }}
          />
        </div>

        {/* Progress Display */}
        {loading && (
          <div className='progress-wrapper'>
            <Progress percent={progress} status='active' />
            <Text type='secondary' className='progress-text'>
              {progressText}
            </Text>
          </div>
        )}
      </Card>

      {/* Output Area - Full Width */}
      <Card
        title={
          <Space>
            <EyeOutlined />
            <span>Generated Result</span>
          </Space>
        }
        extra={
          generatedHtml && (
            <Space>
              <Button
                type='primary'
                icon={<ExportOutlined />}
                onClick={handleOpenInNewWindow}
                disabled={!generatedHtml}
              >
                Open in New Window
              </Button>
              <Button
                icon={<EditOutlined />}
                onClick={handleCopyHtml}
                disabled={!generatedHtml}
              >
                Copy HTML
              </Button>
            </Space>
          )
        }
      >
        {!generatedHtml && !loading && (
          <div className='empty-state'>
            <FileImageOutlined className='empty-icon' />
            <div>Enter content and click generate button</div>
          </div>
        )}

        {loading && (
          <div className='loading-state'>
            <Spin size='large' />
            <div className='loading-text'>
              <Text type='secondary'>{progressText}</Text>
            </div>
          </div>
        )}

        {generatedHtml && !loading && (
          <div>
            {/* HTML Preview - Using iframe for isolation */}
            <div className='html-preview'>
              <iframe
                srcDoc={generatedHtml}
                className='html-preview-iframe'
                title='HTML Preview'
                sandbox='allow-same-origin'
              />
            </div>

            <Divider />

            {/* HTML Code Display */}
            <div>
              <Text strong className='html-code-label'>
                HTML Code
              </Text>
              <TextArea
                value={generatedHtml}
                readOnly
                rows={8}
                className='html-code-textarea'
              />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default RednoteImgGenerator;
