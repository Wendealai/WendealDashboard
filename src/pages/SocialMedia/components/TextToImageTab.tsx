/**
 * 文生图标签页组件
 *
 * 实现文本到图像生成功能的具体实现，包含提示词输入、生成按钮、结果显示。
 * 处理纯文本到图像的转换功能，提供直观的输入体验和及时的用户反馈。
 *
 * 功能特性：
 * - 文本提示词输入表单
 * - 图像生成按钮和加载状态
 * - 生成结果预览和下载
 * - 错误处理和用户反馈
 * - 响应式设计和无障碍支持
 *
 * @component
 * @example
 * ```tsx
 * <TextToImageTab
 *   webhookUrl="https://api.example.com/webhook"
 *   onImageGenerated={(response) => console.log(response)}
 * />
 * ```
 *
 * @see {@link ImageGenerationPanel} - 父级面板组件
 * @see {@link imageGenerationService} - 图像生成服务
 * @see {@link ImageGenerationResponse} - 响应数据结构
 */

import React, { useState, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Form,
  Input,
  Button,
  Space,
  Typography,
  Divider,
  Image,
  Modal,
  Spin,
  message,
} from 'antd';
import {
  PictureOutlined,
  LoadingOutlined,
  EyeOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { imageGenerationService } from '@/services/imageGenerationService';
import type { ImageGenerationResponse } from '../types';

const { Text, Title } = Typography;
const { TextArea } = Input;

/**
 * 文生图标签页组件属性接口
 */
interface TextToImageTabProps {
  /** Webhook URL */
  webhookUrl: string;
  /** 图像生成回调 */
  onImageGenerated?: (response: ImageGenerationResponse) => void;
}

/**
 * 文生图标签页组件
 */
const TextToImageTab: React.FC<TextToImageTabProps> = memo(
  ({ webhookUrl, onImageGenerated }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [generatedImage, setGeneratedImage] =
      useState<ImageGenerationResponse | null>(null);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    /**
     * 处理表单提交
     */
    const handleSubmit = useCallback(async () => {
      if (!webhookUrl) {
        message.error('请先配置 webhook URL');
        return;
      }

      try {
        const values = await form.validateFields();
        const prompt = values.prompt?.trim();

        if (!prompt) {
          message.error('请输入图像描述');
          return;
        }

        setLoading(true);
        setError(null);
        message.loading('正在生成图像...', 0);

        const response = await imageGenerationService.generateImageFromText(
          prompt,
          webhookUrl
        );

        setGeneratedImage(response);
        setRetryCount(0); // 重置重试计数
        message.destroy();
        message.success('图像生成成功！');

        if (onImageGenerated) {
          onImageGenerated(response);
        }
      } catch (error) {
        message.destroy();
        console.error('图像生成失败:', error);

        const errorMessage =
          error instanceof Error ? error.message : '图像生成失败';
        setError(errorMessage);
        message.error(errorMessage);
      } finally {
        setLoading(false);
      }
    }, [webhookUrl, form, onImageGenerated]);

    /**
     * 处理下载图像
     */
    const handleDownload = useCallback(async () => {
      if (!generatedImage?.imageUrl) return;

      try {
        const response = await fetch(generatedImage.imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `generated-image-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        message.success('图像下载成功！');
      } catch (error) {
        console.error('下载失败:', error);
        message.error('下载失败');
      }
    }, [generatedImage]);

    /**
     * 处理重试
     */
    const handleRetry = useCallback(() => {
      setRetryCount(prev => prev + 1);
      handleSubmit();
    }, [handleSubmit]);

    return (
      <div className='text-to-image-tab'>
        <Form form={form} layout='vertical' disabled={loading}>
          <Form.Item
            label={<span style={{ fontSize: '14px' }}>图像描述</span>}
            name='prompt'
            rules={[
              { required: true, message: '请输入图像描述' },
              { min: 1, max: 1000, message: '描述长度应在1-1000字符之间' },
            ]}
            help='详细描述您想要生成的图像，包括主体、风格、颜色、构图等元素'
          >
            <TextArea
              rows={4}
              placeholder='例如：一只可爱的猫咪在花园里玩耍，背景是夕阳，风格是卡通插画...'
              maxLength={1000}
              showCount
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type='primary'
                icon={loading ? <LoadingOutlined /> : <PictureOutlined />}
                onClick={handleSubmit}
                loading={loading}
                disabled={!webhookUrl}
              >
                {loading ? '生成中...' : '生成图像'}
              </Button>

              {generatedImage && (
                <Button icon={<DownloadOutlined />} onClick={handleDownload}>
                  下载图像
                </Button>
              )}

              {error && !loading && (
                <Button
                  type='default'
                  danger
                  onClick={handleRetry}
                  disabled={retryCount >= 3}
                >
                  重试 ({retryCount}/3)
                </Button>
              )}
            </Space>
          </Form.Item>

          {error && !loading && (
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                background: '#fff2f0',
                border: '1px solid #ffccc7',
                borderRadius: '4px',
                color: '#cf1322',
              }}
            >
              <strong>生成失败：</strong>
              {error}
              {retryCount < 3 && (
                <div style={{ marginTop: '8px' }}>
                  <Button
                    size='small'
                    type='primary'
                    danger
                    onClick={handleRetry}
                  >
                    点击重试
                  </Button>
                </div>
              )}
            </div>
          )}
        </Form>

        {generatedImage && (
          <>
            <Divider />
            <div className='generation-result'>
              <Title level={4} style={{ fontSize: '16px' }}>
                生成结果
              </Title>
              <Space direction='vertical' style={{ width: '100%' }}>
                <div className='image-preview'>
                  <Image
                    src={generatedImage.imageUrl}
                    alt='Generated image'
                    style={{ maxWidth: '100%', maxHeight: '400px' }}
                    placeholder={
                      <div
                        style={{
                          width: '200px',
                          height: '200px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: '#f5f5f5',
                        }}
                      >
                        <Spin />
                      </div>
                    }
                  />
                </div>

                <div className='image-info'>
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    提示词: {generatedImage.prompt}
                  </Text>
                  <br />
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    生成时间:{' '}
                    {new Date(generatedImage.createdAt).toLocaleString()}
                  </Text>
                  {generatedImage.processingTime && (
                    <>
                      <br />
                      <Text type='secondary' style={{ fontSize: '12px' }}>
                        处理时间: {generatedImage.processingTime}ms
                      </Text>
                    </>
                  )}
                </div>

                <Button
                  type='default'
                  icon={<EyeOutlined />}
                  onClick={() => setPreviewVisible(true)}
                >
                  预览大图
                </Button>
              </Space>
            </div>
          </>
        )}

        <Modal
          visible={previewVisible}
          title='图像预览'
          footer={null}
          onCancel={() => setPreviewVisible(false)}
          width={800}
        >
          {generatedImage && (
            <div style={{ textAlign: 'center' }}>
              <Image
                src={generatedImage.imageUrl}
                alt='Generated image preview'
                style={{ maxWidth: '100%', maxHeight: '70vh' }}
              />
            </div>
          )}
        </Modal>
      </div>
    );
  }
);

TextToImageTab.displayName = 'TextToImageTab';

export default TextToImageTab;
