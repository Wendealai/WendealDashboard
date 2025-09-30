/**
 * 图片编辑标签页组件
 *
 * 实现图像编辑功能的具体实现，包含图片上传、编辑指令输入、结果显示。
 * 处理图像上传和编辑功能，提供直观的图片预览和编辑体验。
 *
 * 功能特性：
 * - 图像文件上传和预览
 * - 编辑指令输入表单
 * - 编辑结果对比显示
 * - 文件验证和错误处理
 * - 响应式设计和用户反馈
 *
 * @component
 * @example
 * ```tsx
 * <ImageEditTab
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
  Card,
  Divider,
  Image,
  Modal,
  message,
} from 'antd';
import {
  UploadOutlined,
  EditOutlined,
  LoadingOutlined,
  EyeOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { imageGenerationService } from '@/services/imageGenerationService';
import type { ImageGenerationResponse } from '../types';

const { Text, Title } = Typography;
const { TextArea } = Input;

/**
 * 图片编辑标签页组件属性接口
 */
interface ImageEditTabProps {
  /** Webhook URL */
  webhookUrl: string;
  /** 图像生成回调 */
  onImageGenerated?: (response: ImageGenerationResponse) => void;
}

/**
 * 图片编辑标签页组件
 */
const ImageEditTab: React.FC<ImageEditTabProps> = memo(
  ({ webhookUrl, onImageGenerated }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [editedImage, setEditedImage] =
      useState<ImageGenerationResponse | null>(null);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    /**
     * 处理图片上传
     */
    const handleImageUpload = useCallback((file: File) => {
      const reader = new FileReader();
      reader.onload = e => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      return false; // 阻止自动上传
    }, []);

    /**
     * 处理表单提交
     */
    const handleSubmit = useCallback(async () => {
      if (!webhookUrl) {
        message.error('请先配置 webhook URL');
        return;
      }

      if (!uploadedImage) {
        message.error('请先上传要编辑的图像');
        return;
      }

      try {
        const values = await form.validateFields();
        const prompt = values.prompt?.trim();

        if (!prompt) {
          message.error('请输入编辑指令');
          return;
        }

        // 将 base64 转换为 File 对象
        const response = await fetch(uploadedImage);
        const blob = await response.blob();
        const file = new File([blob], 'uploaded-image.png', {
          type: 'image/png',
        });

        setLoading(true);
        setError(null);
        message.loading('正在编辑图像...', 0);

        const editResponse = await imageGenerationService.editImageWithPrompt(
          file,
          prompt,
          webhookUrl
        );

        setEditedImage(editResponse);
        setRetryCount(0); // 重置重试计数
        message.destroy();
        message.success('图像编辑成功！');

        if (onImageGenerated) {
          onImageGenerated(editResponse);
        }
      } catch (error) {
        message.destroy();
        console.error('图像编辑失败:', error);

        const errorMessage =
          error instanceof Error ? error.message : '图像编辑失败';
        setError(errorMessage);
        message.error(errorMessage);
      } finally {
        setLoading(false);
      }
    }, [webhookUrl, uploadedImage, form, onImageGenerated]);

    /**
     * 处理下载图像
     */
    const handleDownload = useCallback(async () => {
      if (!editedImage?.imageUrl) return;

      try {
        const response = await fetch(editedImage.imageUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `edited-image-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        message.success('图像下载成功！');
      } catch (error) {
        console.error('下载失败:', error);
        message.error('下载失败');
      }
    }, [editedImage]);

    /**
     * 处理重试
     */
    const handleRetry = useCallback(() => {
      setRetryCount(prev => prev + 1);
      // 重新执行提交，使用当前的状态
      const currentForm = form;
      const currentImage = uploadedImage;
      if (currentForm && currentImage) {
        handleSubmit();
      }
    }, [form, uploadedImage]);

    return (
      <div className='image-edit-tab'>
        <Space direction='vertical' style={{ width: '100%' }} size='large'>
          {/* 图片上传区域 */}
          <Card title='上传图片' size='small'>
            <Form.Item>
              <Button
                icon={<UploadOutlined />}
                disabled={loading}
                style={{
                  width: '200px',
                  height: '120px',
                  position: 'relative',
                }}
              >
                <input
                  type='file'
                  accept='image/*'
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      handleImageUpload(file);
                    }
                  }}
                  style={{
                    position: 'absolute',
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    cursor: 'pointer',
                  }}
                  disabled={loading}
                  title='选择要编辑的图像文件'
                  aria-label='选择要编辑的图像文件'
                />
                {uploadedImage ? '重新上传' : '点击上传图片'}
              </Button>
            </Form.Item>

            {uploadedImage && (
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <Image
                  src={uploadedImage}
                  alt='Uploaded image'
                  style={{ maxWidth: '200px', maxHeight: '120px' }}
                />
              </div>
            )}
          </Card>

          {/* 编辑指令输入 */}
          <Form
            form={form}
            layout='vertical'
            disabled={loading || !uploadedImage}
          >
            <Form.Item
              label='编辑指令'
              name='prompt'
              rules={[
                { required: true, message: '请输入编辑指令' },
                { min: 1, max: 500, message: '指令长度应在1-500字符之间' },
              ]}
              help='描述您想要对图像进行的修改，例如：改变颜色、添加元素、改变风格等'
            >
              <TextArea
                rows={4}
                placeholder='例如：将图像转换为水彩画风格，添加一些花朵在背景中...'
                maxLength={500}
                showCount
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button
                  type='primary'
                  icon={loading ? <LoadingOutlined /> : <EditOutlined />}
                  onClick={handleSubmit}
                  loading={loading}
                  disabled={!uploadedImage || !webhookUrl}
                >
                  {loading ? '编辑中...' : '开始编辑'}
                </Button>

                {editedImage && (
                  <Button icon={<DownloadOutlined />} onClick={handleDownload}>
                    下载编辑结果
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
                <strong>编辑失败：</strong>
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

          {/* 编辑结果显示 */}
          {editedImage && (
            <>
              <Divider />
              <div className='edit-result'>
                <Title level={4}>编辑结果</Title>
                <Space direction='vertical' style={{ width: '100%' }}>
                  <div className='image-comparison'>
                    <div className='image-item'>
                      <Text strong>原图</Text>
                      <Image
                        src={uploadedImage || ''}
                        alt='Original image'
                        style={{ maxWidth: '200px', maxHeight: '150px' }}
                      />
                    </div>
                    <div className='image-item'>
                      <Text strong>编辑结果</Text>
                      <Image
                        src={editedImage.imageUrl}
                        alt='Edited image'
                        style={{ maxWidth: '200px', maxHeight: '150px' }}
                      />
                    </div>
                  </div>

                  <div className='image-info'>
                    <Text type='secondary'>编辑指令: {editedImage.prompt}</Text>
                    <br />
                    <Text type='secondary'>
                      编辑时间:{' '}
                      {new Date(editedImage.createdAt).toLocaleString()}
                    </Text>
                    {editedImage.processingTime && (
                      <>
                        <br />
                        <Text type='secondary'>
                          处理时间: {editedImage.processingTime}ms
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
        </Space>

        <Modal
          visible={previewVisible}
          title='编辑结果预览'
          footer={null}
          onCancel={() => setPreviewVisible(false)}
          width={1000}
        >
          {editedImage && (
            <div style={{ textAlign: 'center' }}>
              <Space size='large'>
                <div>
                  <Text strong>原图</Text>
                  <br />
                  <Image
                    src={uploadedImage || ''}
                    alt='Original image'
                    style={{ maxWidth: '400px', maxHeight: '300px' }}
                  />
                </div>
                <div>
                  <Text strong>编辑结果</Text>
                  <br />
                  <Image
                    src={editedImage.imageUrl}
                    alt='Edited image'
                    style={{ maxWidth: '400px', maxHeight: '300px' }}
                  />
                </div>
              </Space>
            </div>
          )}
        </Modal>
      </div>
    );
  }
);

ImageEditTab.displayName = 'ImageEditTab';

export default ImageEditTab;
