/**
 * Image Generation Panel Component
 * Provides complete image generation user interface, including text-to-image and image editing modes
 */

import React, { useState, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Tabs,
  Form,
  Input,
  Button,
  Upload,
  Image,
  Space,
  Typography,
  Divider,
  message,
  Spin,
} from 'antd';
import {
  PictureOutlined,
  EditOutlined,
  UploadOutlined,
  LoadingOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { imageGenerationService } from '@/services/imageGenerationService';
import type {
  ImageGenerationMode,
  ImageGenerationResponse,
  ImageGenerationWorkflow,
  ImageGenerationSettings,
} from '../types';

const { Text, Title } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;

/**
 * Image Generation Panel Props Interface
 */
interface ImageGenerationPanelProps {
  workflow: ImageGenerationWorkflow | any; // Allow basic workflow type
  loading?: boolean;
  onImageGenerated?: (response: ImageGenerationResponse) => void;
}

/**
 * Text to Image Tab Props Interface
 */
interface TextToImageTabProps {
  webhookUrl: string;
  onImageGenerated?: ((response: ImageGenerationResponse) => void) | undefined;
}

/**
 * Image Edit Tab Props Interface
 */
interface ImageEditTabProps {
  webhookUrl: string;
  onImageGenerated?: ((response: ImageGenerationResponse) => void) | undefined;
}

/**
 * Text to Image Tab Component
 */
const TextToImageTab: React.FC<TextToImageTabProps> = memo(
  ({ webhookUrl, onImageGenerated }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [generatedImage, setGeneratedImage] =
      useState<ImageGenerationResponse | null>(null);

    /**
     * Handle form submission
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
          message.error('Please enter image description');
          return;
        }

        setLoading(true);
        message.loading('Generating image...', 0);

        const response = await imageGenerationService.generateImageFromText(
          prompt,
          webhookUrl
        );

        setGeneratedImage(response);
        message.destroy();
        message.success('Image generated successfully!');

        if (onImageGenerated) {
          onImageGenerated(response);
        }
      } catch (error) {
        message.destroy();
        console.error('Image generation failed:', error);

        const errorMessage =
          error instanceof Error ? error.message : 'Image generation failed';
        message.error(errorMessage);
      } finally {
        setLoading(false);
      }
    }, [webhookUrl, form, onImageGenerated]);

    /**
     * Handle image download
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
        message.success('Image downloaded successfully!');
      } catch (error) {
        console.error('Download failed:', error);
        message.error('Download failed');
      }
    }, [generatedImage]);

    return (
      <div className='text-to-image-tab'>
        <Form form={form} layout='vertical' disabled={loading}>
          <Form.Item
            label='Image Description'
            name='prompt'
            rules={[
              { required: true, message: 'Please enter image description' },
              {
                min: 1,
                max: 1000,
                message: 'Description should be 1-1000 characters long',
              },
            ]}
            help='Describe the image you want to generate'
          >
            <TextArea
              rows={6}
              placeholder='Example: A cute cat playing in a garden, sunset background, cartoon illustration style...'
              maxLength={1000}
              showCount
              style={{ minHeight: '120px', height: 'auto' }}
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
                {loading ? 'Generating...' : 'Generate Image'}
              </Button>

              {generatedImage && (
                <Button icon={<DownloadOutlined />} onClick={handleDownload}>
                  Download Image
                </Button>
              )}
            </Space>
          </Form.Item>
        </Form>

        {generatedImage && (
          <>
            <Divider />
            <div className='generation-result'>
              <Title level={4}>Generation Result</Title>
              <Space direction='vertical' style={{ width: '100%' }}>
                <div className='image-preview'>
                  <div className='image-header'>
                    <Text strong>Generated Image</Text>
                    <Button
                      type='text'
                      size='small'
                      icon={<DownloadOutlined />}
                      onClick={handleDownload}
                      style={{ marginLeft: '8px' }}
                    />
                  </div>
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
                  <Text type='secondary'>Prompt: {generatedImage.prompt}</Text>
                  <br />
                  <Text type='secondary'>
                    Generated at:{' '}
                    {new Date(generatedImage.createdAt).toLocaleString()}
                  </Text>
                  {generatedImage.processingTime && (
                    <>
                      <br />
                      <Text type='secondary'>
                        Processing time: {generatedImage.processingTime}ms
                      </Text>
                    </>
                  )}
                </div>
              </Space>
            </div>
          </>
        )}
      </div>
    );
  }
);

TextToImageTab.displayName = 'TextToImageTab';

/**
 * Image Edit Tab Component
 */
const ImageEditTab: React.FC<ImageEditTabProps> = memo(
  ({ webhookUrl, onImageGenerated }) => {
    const { t } = useTranslation();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [editedImage, setEditedImage] =
      useState<ImageGenerationResponse | null>(null);

    /**
     * Handle image upload
     */
    const handleImageUpload = useCallback((file: File) => {
      const reader = new FileReader();
      reader.onload = e => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      return false; // Prevent automatic upload
    }, []);

    /**
     * Handle form submission
     */
    const handleSubmit = useCallback(async () => {
      if (!webhookUrl) {
        message.error('Please configure webhook URL first');
        return;
      }

      if (!uploadedImage) {
        message.error('Please upload an image to edit first');
        return;
      }

      try {
        const values = await form.validateFields();
        const prompt = values.prompt?.trim();

        if (!prompt) {
          message.error('Please enter edit instructions');
          return;
        }

        // Convert base64 to File object
        const response = await fetch(uploadedImage);
        const blob = await response.blob();
        const file = new File([blob], 'uploaded-image.png', {
          type: 'image/png',
        });

        setLoading(true);
        message.loading('Editing image...', 0);

        const editResponse = await imageGenerationService.editImageWithPrompt(
          file,
          prompt,
          webhookUrl
        );

        setEditedImage(editResponse);
        message.destroy();
        message.success('Image edited successfully!');

        if (onImageGenerated) {
          onImageGenerated(editResponse);
        }
      } catch (error) {
        message.destroy();
        console.error('Image editing failed:', error);

        const errorMessage =
          error instanceof Error ? error.message : 'Image editing failed';
        message.error(errorMessage);
      } finally {
        setLoading(false);
      }
    }, [webhookUrl, uploadedImage, form, onImageGenerated]);

    /**
     * Handle image download
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
        message.success('Image downloaded successfully!');
      } catch (error) {
        console.error('Download failed:', error);
        message.error('Download failed');
      }
    }, [editedImage]);

    return (
      <div className='image-edit-tab'>
        <Space direction='vertical' style={{ width: '100%' }} size='large'>
          {/* Image upload area */}
          <Card title='Upload Image' size='small'>
            <Upload
              accept='image/*'
              beforeUpload={handleImageUpload}
              showUploadList={false}
              disabled={loading}
            >
              <Button
                icon={<UploadOutlined />}
                disabled={loading}
                style={{ width: '200px', height: '120px' }}
              >
                {uploadedImage ? 'Re-upload' : 'Click to upload image'}
              </Button>
            </Upload>

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

          {/* Edit instructions input */}
          <Form
            form={form}
            layout='vertical'
            disabled={loading || !uploadedImage}
          >
            <Form.Item
              label='Edit Instructions'
              name='prompt'
              rules={[
                { required: true, message: 'Please enter edit instructions' },
                {
                  min: 1,
                  max: 500,
                  message: 'Instructions should be 1-500 characters long',
                },
              ]}
              help='Describe the modifications you want to make to the image'
            >
              <TextArea
                rows={6}
                placeholder='Example: Convert the image to watercolor style, add some flowers in the background...'
                maxLength={500}
                showCount
                style={{ minHeight: '120px', height: 'auto' }}
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
                  {loading ? 'Editing...' : 'Start Editing'}
                </Button>

                {editedImage && (
                  <Button icon={<DownloadOutlined />} onClick={handleDownload}>
                    Download Edited Image
                  </Button>
                )}
              </Space>
            </Form.Item>
          </Form>

          {/* Edit result display */}
          {editedImage && (
            <>
              <Divider />
              <div className='edit-result'>
                <Title level={4}>Edit Result</Title>
                <div className='image-comparison-container'>
                  <div className='image-comparison'>
                    <div className='image-item'>
                      <div className='image-header'>
                        <Text strong>Original</Text>
                        <Button
                          type='text'
                          size='small'
                          icon={<DownloadOutlined />}
                          onClick={() => {
                            if (uploadedImage) {
                              const a = document.createElement('a');
                              a.href = uploadedImage;
                              a.download = 'original-image.png';
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              message.success('Original image downloaded!');
                            }
                          }}
                          style={{ marginLeft: '8px' }}
                        />
                      </div>
                      <Image
                        src={uploadedImage || ''}
                        alt='Original image'
                        style={{ maxWidth: '200px', maxHeight: '150px' }}
                      />
                    </div>
                    <div className='image-item'>
                      <div className='image-header'>
                        <Text strong>Edited Result</Text>
                        <Button
                          type='text'
                          size='small'
                          icon={<DownloadOutlined />}
                          onClick={handleDownload}
                          style={{ marginLeft: '8px' }}
                        />
                      </div>
                      <Image
                        src={editedImage.imageUrl}
                        alt='Edited image'
                        style={{ maxWidth: '200px', maxHeight: '150px' }}
                      />
                    </div>
                  </div>

                  <div className='image-info'>
                    <Text type='secondary'>
                      Edit Instructions: {editedImage.prompt}
                    </Text>
                    <br />
                    <Text type='secondary'>
                      Edited at:{' '}
                      {new Date(editedImage.createdAt).toLocaleString()}
                    </Text>
                    {editedImage.processingTime && (
                      <>
                        <br />
                        <Text type='secondary'>
                          Processing time: {editedImage.processingTime}ms
                        </Text>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </Space>
      </div>
    );
  }
);

ImageEditTab.displayName = 'ImageEditTab';

/**
 * Image Generation Panel Main Component
 */
const ImageGenerationPanel: React.FC<ImageGenerationPanelProps> = memo(
  ({ workflow, loading = false, onImageGenerated }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] =
      useState<ImageGenerationMode>('text-to-image');

    // Provide default settings
    const defaultSettings: ImageGenerationSettings = {
      webhookUrl: 'https://n8n.wendealai.com/webhook/nanobanana',
      defaultPrompt: '',
      maxImageSize: 10 * 1024 * 1024,
      supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
      timeout: 60000,
    };

    // Use workflow settings or default settings
    const settings = workflow.settings || defaultSettings;

    /**
     * Handle mode switching
     */
    const handleTabChange = useCallback((key: string) => {
      setActiveTab(key as ImageGenerationMode);
    }, []);

    return (
      <div className='image-generation-panel'>
        <Card
          title={
            <Space>
              <PictureOutlined />
              {workflow.name}
            </Space>
          }
          loading={loading}
        >
          <Tabs
            activeKey={activeTab}
            onChange={handleTabChange}
            type='card'
            size='small'
          >
            <TabPane
              tab={
                <span>
                  <PictureOutlined />
                  Text to Image
                </span>
              }
              key='text-to-image'
            >
              <TextToImageTab
                webhookUrl={settings.webhookUrl}
                onImageGenerated={onImageGenerated}
              />
            </TabPane>

            <TabPane
              tab={
                <span>
                  <EditOutlined />
                  Image Edit
                </span>
              }
              key='image-edit'
            >
              <ImageEditTab
                webhookUrl={settings.webhookUrl}
                onImageGenerated={onImageGenerated}
              />
            </TabPane>
          </Tabs>

          {/* Configuration information */}
          <div
            style={{
              marginTop: '24px',
              padding: '16px',
              background: '#f5f5f5',
              borderRadius: '4px',
            }}
          >
            <Text type='secondary'>
              <strong>Webhook URL:</strong>{' '}
              {settings.webhookUrl || 'Not configured'}
            </Text>
            <br />
            <Text type='secondary'>
              <strong>Max file size:</strong>{' '}
              {settings.maxImageSize / (1024 * 1024)}MB
            </Text>
            <br />
            <Text type='secondary'>
              <strong>Supported formats:</strong>{' '}
              {settings.supportedFormats.join(', ')}
            </Text>
          </div>
        </Card>
      </div>
    );
  }
);

ImageGenerationPanel.displayName = 'ImageGenerationPanel';

export default ImageGenerationPanel;
