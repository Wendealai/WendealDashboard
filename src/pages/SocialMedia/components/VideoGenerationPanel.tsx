/**
 * Video Generation Panel Component
 * Provides video generation user interface for creating videos from text descriptions and reference images
 */

import React, { useState, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  Typography,
  Divider,
  Upload,
  Image,
  App,
  Tooltip,
  Alert,
  Flex,
  Spin,
} from 'antd';
import {
  VideoCameraOutlined,
  UploadOutlined,
  LoadingOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { videoGenerationService } from '@/services/videoGenerationService';
import type {
  VideoGenerationRequest,
  VideoGenerationResponse,
  VideoGenerationWorkflow,
  VideoGenerationSettings,
} from '../types';

const { Text, Title } = Typography;
const { TextArea } = Input;

/**
 * Video Generation Panel Props Interface
 */
interface VideoGenerationPanelProps {
  workflow: VideoGenerationWorkflow | any; // Allow basic workflow type
  loading?: boolean;
  onVideoGenerated?: (response: VideoGenerationResponse) => void;
}

/**
 * Video Player Component
 */
interface VideoPlayerProps {
  src: string;
  title?: string;
  onDownload?: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = memo(
  ({ src, title, onDownload }) => {
    return (
      <div className='video-player'>
        <div className='video-header'>
          <Text strong>{title || 'Generated Video'}</Text>
          {onDownload && (
            <Button
              type='text'
              size='small'
              icon={<DownloadOutlined />}
              onClick={onDownload}
              style={{ marginLeft: '8px' }}
            >
              Download
            </Button>
          )}
        </div>
        <video
          src={src}
          controls
          style={{
            maxWidth: '100%',
            maxHeight: '400px',
            borderRadius: '8px',
            marginTop: '8px',
          }}
          poster='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDgwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik0zMDAgMTgwSDUwMFYyNzBIMzAwVjE4MFoiIGZpbGw9IiNEMUQ1REIiLz4KPHBhdGggZD0iTTM0MCAyMTBIMzYwVjI0MEgzNDBWMjEwWiIgZmlsbD0iI0Y1RjVGNSIvPgo8cGF0aCBkPSJNMzgwIDIxMEg0MDBWMjQwSDM4MFYyMTBaIiBmaWxsPSIjRjVGNUY1Ii8+CjxwYXRoIGQ9Ik00MjAgMjEwSDQ0MFYyNDBINDIwVjIxMFoiIGZpbGw9IiNGNUY1RjUiLz4KPHBhdGggZD0iTTQ2MCAyMTBINDgwVjI0MEg0NjBWMjEwWiIgZmlsbD0iI0Y1RjVGNSIvPgo8L3N2Zz4K' // Inline SVG placeholder
        >
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';

/**
 * Video Generation Panel Main Component
 */
const VideoGenerationPanel: React.FC<VideoGenerationPanelProps> = memo(
  ({ workflow, loading = false, onVideoGenerated }) => {
    const { t } = useTranslation();
    const { message } = App.useApp();
    const [form] = Form.useForm();
    const [generating, setGenerating] = useState(false);
    const [generatedVideo, setGeneratedVideo] =
      useState<VideoGenerationResponse | null>(null);
    const [uploadedImages, setUploadedImages] = useState<File[]>([]);

    // Provide default settings
    const defaultSettings: VideoGenerationSettings = {
      webhookUrl: 'https://n8n.wendealai.com/webhook/sora2',
      defaultDescription: '',
      maxImages: 5,
      maxImageSize: 10 * 1024 * 1024, // 10MB
      supportedImageFormats: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ],
      timeout: 1200000, // 20 minutes
      maxVideoDuration: 60, // 60 seconds
    };

    // Use workflow settings or default settings
    const settings = workflow.settings || defaultSettings;

    /**
     * Handle image upload
     */
    const handleImageUpload = useCallback(
      (file: File) => {
        const currentImages = uploadedImages;

        // Check file count limit
        if (currentImages.length >= settings.maxImages) {
          message.error(`Maximum ${settings.maxImages} images allowed`);
          return false;
        }

        // Check file size
        if (file.size > settings.maxImageSize) {
          message.error(
            `Image size cannot exceed ${settings.maxImageSize / (1024 * 1024)}MB`
          );
          return false;
        }

        // Check file type
        if (!settings.supportedImageFormats.includes(file.type)) {
          message.error(`Unsupported file format: ${file.type}`);
          return false;
        }

        setUploadedImages(prev => [...prev, file]);
        return false; // Prevent automatic upload
      },
      [uploadedImages, settings, message]
    );

    /**
     * Remove uploaded image
     */
    const handleRemoveImage = useCallback((index: number) => {
      setUploadedImages(prev => prev.filter((_, i) => i !== index));
    }, []);

    /**
     * Handle form submission
     */
    const handleSubmit = useCallback(async () => {
      if (!settings.webhookUrl) {
        message.error('请先配置 webhook URL');
        return;
      }

      try {
        const values = await form.validateFields();
        const description = values.description?.trim();

        if (!description) {
          message.error('Please enter a video description');
          return;
        }

        if (uploadedImages.length === 0) {
          message.error('Please upload at least one reference image');
          return;
        }

        setGenerating(true);
        message.loading('Generating video...', 0);

        const request: VideoGenerationRequest = {
          id: `video-gen-${Date.now()}`,
          description,
          images: uploadedImages,
          videoCount: values.videoCount || 1,
          webhookUrl: settings.webhookUrl,
          createdAt: new Date().toISOString(),
          status: 'processing',
        };

        const response = await videoGenerationService.generateVideo(request);

        setGeneratedVideo(response);
        message.destroy();

        if (response.errorMessage) {
          message.error(`视频生成失败: ${response.errorMessage}`);
        } else if (response.videoUrl) {
          message.success('✅ 视频生成成功！');
        } else {
          message.warning('视频生成完成，但未收到视频URL');
        }

        if (onVideoGenerated) {
          onVideoGenerated(response);
        }
      } catch (error) {
        message.destroy();
        console.error('Video generation failed:', error);

        const errorMessage =
          error instanceof Error ? error.message : 'Video generation failed';
        message.error(errorMessage);
      } finally {
        setGenerating(false);
      }
    }, [settings, uploadedImages, form, onVideoGenerated, message]);

    /**
     * Handle form finish (properly connected to Form)
     */
    const handleFormFinish = useCallback(
      async (values: any) => {
        const description = values.description?.trim();

        if (!description) {
          message.error('Please enter a video description');
          return;
        }

        if (uploadedImages.length === 0) {
          message.error('Please upload at least one reference image');
          return;
        }

        await handleSubmit();
      },
      [uploadedImages, handleSubmit, message]
    );

    /**
     * Handle video download
     */
    const handleDownload = useCallback(async () => {
      if (!generatedVideo?.videoUrl) return;

      try {
        const response = await fetch(generatedVideo.videoUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `generated-video-${Date.now()}.mp4`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        message.success('Video downloaded successfully!');
      } catch (error) {
        console.error('Download failed:', error);
        message.error('Download failed');
      }
    }, [generatedVideo, message]);

    return (
      <div className='video-generation-panel'>
        <Card
          title={
            <Space>
              <VideoCameraOutlined />
              {workflow.name || 'Video Generation'}
            </Space>
          }
          loading={loading}
        >
          <Form
            form={form}
            layout='vertical'
            disabled={generating}
            preserve={false}
            onFinish={handleFormFinish}
          >
            {/* Video Description Input */}
            <Form.Item
              label={
                <Space>
                  <span style={{ color: 'var(--color-text, #262626)' }}>
                    Video Description
                  </span>
                  <Tooltip title='Describe in detail the video content, style, and scene you want to generate'>
                    <InfoCircleOutlined
                      style={{
                        color: 'var(--color-text-secondary, #6c757d)',
                        fontSize: '14px',
                      }}
                    />
                  </Tooltip>
                </Space>
              }
              name='description'
              rules={[
                { required: true, message: 'Please enter a video description' },
                {
                  min: 10,
                  max: 1000,
                  message: 'Description should be 10-1000 characters long',
                },
              ]}
            >
              <TextArea
                rows={8}
                placeholder='For example: A cute cat playing in a garden, sunset background, cartoon illustration style, add some flowers and butterflies...'
                maxLength={1000}
                showCount
                style={{ minHeight: '160px', height: 'auto' }}
              />
            </Form.Item>

            {/* Video Count Input */}
            <Form.Item
              label={
                <Space>
                  <span style={{ color: 'var(--color-text, #262626)' }}>
                    Number of Videos
                  </span>
                  <Tooltip title='Specify how many videos you want to generate (1-10)'>
                    <InfoCircleOutlined
                      style={{
                        color: 'var(--color-text-secondary, #6c757d)',
                        fontSize: '14px',
                      }}
                    />
                  </Tooltip>
                </Space>
              }
              name='videoCount'
              rules={[
                {
                  required: true,
                  message: 'Please enter the number of videos to generate',
                },
                {
                  type: 'number',
                  min: 1,
                  max: 10,
                  message: 'Number of videos should be between 1 and 10',
                },
              ]}
              initialValue={1}
            >
              <Input
                type='number'
                min={1}
                max={10}
                placeholder='1'
                style={{ width: '100px' }}
              />
            </Form.Item>

            {/* Image Upload Section */}
            <Form.Item
              label={
                <Space>
                  <span style={{ color: 'var(--color-text, #262626)' }}>
                    Reference Images ({uploadedImages.length}/
                    {settings.maxImages})
                  </span>
                  <Tooltip
                    title={`Upload reference images to guide video generation. Supported formats: ${settings.supportedImageFormats.join(', ')}, max ${settings.maxImageSize / (1024 * 1024)}MB each`}
                  >
                    <InfoCircleOutlined
                      style={{
                        color: 'var(--color-text-secondary, #6c757d)',
                        fontSize: '14px',
                      }}
                    />
                  </Tooltip>
                </Space>
              }
            >
              <div className='image-upload-section'>
                <Upload
                  accept={settings.supportedImageFormats.join(',')}
                  beforeUpload={handleImageUpload}
                  showUploadList={false}
                  disabled={
                    generating || uploadedImages.length >= settings.maxImages
                  }
                  multiple
                >
                  <Button
                    icon={<UploadOutlined />}
                    disabled={
                      generating || uploadedImages.length >= settings.maxImages
                    }
                    style={{ width: '200px', height: '120px' }}
                  >
                    {uploadedImages.length >= settings.maxImages
                      ? 'Maximum reached'
                      : 'Click to upload images'}
                  </Button>
                </Upload>

                {/* Uploaded Images Preview */}
                {uploadedImages.length > 0 && (
                  <div
                    className='uploaded-images'
                    style={{ marginTop: '16px' }}
                  >
                    <Text
                      strong
                      style={{ marginBottom: '8px', display: 'block' }}
                    >
                      Uploaded Images ({uploadedImages.length})
                    </Text>
                    <div
                      style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}
                    >
                      {uploadedImages.map((file, index) => (
                        <div key={index} className='image-preview-item'>
                          <Image
                            src={URL.createObjectURL(file)}
                            alt={`Uploaded ${index + 1}`}
                            style={{
                              width: '80px',
                              height: '80px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                            }}
                          />
                          <Button
                            type='text'
                            size='small'
                            danger
                            onClick={() => handleRemoveImage(index)}
                            style={{
                              position: 'absolute',
                              top: '-8px',
                              right: '-8px',
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                            }}
                          >
                            ×
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Form.Item>

            {/* Generate Button */}
            <Form.Item>
              <Space>
                <Button
                  type='primary'
                  icon={
                    generating ? <LoadingOutlined /> : <VideoCameraOutlined />
                  }
                  onClick={handleSubmit}
                  loading={generating}
                  disabled={!settings.webhookUrl || uploadedImages.length === 0}
                  size='large'
                >
                  {generating ? 'Generating...' : 'Generate Video'}
                </Button>

                {generatedVideo && (
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={handleDownload}
                    size='large'
                  >
                    Download Video
                  </Button>
                )}
              </Space>
            </Form.Item>
          </Form>

          {/* Loading State with Spin Component */}
          {generating && (
            <>
              <Divider />
              <div className='generation-loading'>
                <Flex gap='middle' vertical>
                  <Spin tip='正在生成视频，请稍候...' size='large'>
                    <Alert
                      message='视频生成中'
                      description='我们正在根据您的描述和参考图像生成视频，这可能需要几分钟时间。请耐心等待，不要关闭此页面。'
                      type='info'
                      showIcon
                    />
                  </Spin>
                </Flex>
              </div>
            </>
          )}

          {/* Generation Result */}
          {generatedVideo && (
            <>
              <Divider />
              <div className='generation-result'>
                <Title level={4}>Generation Result</Title>
                <Space direction='vertical' style={{ width: '100%' }}>
                  <VideoPlayer
                    src={generatedVideo.videoUrl}
                    title='Generated Video'
                    onDownload={handleDownload}
                  />

                  <div className='video-info'>
                    <Text type='secondary'>
                      Description: {generatedVideo.description}
                    </Text>
                    <br />
                    <Text type='secondary'>
                      Generated at:{' '}
                      {new Date(generatedVideo.createdAt).toLocaleString()}
                    </Text>
                    {generatedVideo.processingTime && (
                      <>
                        <br />
                        <Text type='secondary'>
                          Processing time: {generatedVideo.processingTime}ms
                        </Text>
                      </>
                    )}
                    {generatedVideo.metadata && (
                      <>
                        <br />
                        <Text type='secondary'>
                          Duration: {generatedVideo.metadata.duration}s |
                          Format: {generatedVideo.metadata.format} | Size:{' '}
                          {typeof generatedVideo.metadata.size === 'string'
                            ? generatedVideo.metadata.size
                            : `${generatedVideo.metadata.size} bytes`}
                          {generatedVideo.metadata.model && (
                            <> | Model: {generatedVideo.metadata.model}</>
                          )}
                        </Text>
                      </>
                    )}
                  </div>
                </Space>
              </div>
            </>
          )}

          {/* Configuration Information */}
          <div
            className='theme-card'
            style={{
              marginTop: '24px',
              padding: '16px',
            }}
          >
            <Space direction='vertical' size='small' style={{ width: '100%' }}>
              <div
                style={{
                  color: 'var(--color-text, #262626)',
                  fontSize: '12px',
                  fontWeight: '500',
                }}
              >
                <strong style={{ color: 'var(--color-primary, #1890ff)' }}>
                  Webhook URL:
                </strong>{' '}
                {settings.webhookUrl || 'Not configured'}
              </div>
              <div
                style={{
                  color: 'var(--color-text, #262626)',
                  fontSize: '12px',
                  fontWeight: '500',
                }}
              >
                <strong style={{ color: 'var(--color-primary, #1890ff)' }}>
                  Max images:
                </strong>{' '}
                {settings.maxImages}
              </div>
              <div
                style={{
                  color: 'var(--color-text, #262626)',
                  fontSize: '12px',
                  fontWeight: '500',
                }}
              >
                <strong style={{ color: 'var(--color-primary, #1890ff)' }}>
                  Max image size:
                </strong>{' '}
                {settings.maxImageSize / (1024 * 1024)}MB
              </div>
              <div
                style={{
                  color: 'var(--color-text, #262626)',
                  fontSize: '12px',
                  fontWeight: '500',
                }}
              >
                <strong style={{ color: 'var(--color-primary, #1890ff)' }}>
                  Supported formats:
                </strong>{' '}
                {settings.supportedImageFormats.join(', ')}
              </div>
            </Space>
          </div>
        </Card>
      </div>
    );
  }
);

VideoGenerationPanel.displayName = 'VideoGenerationPanel';

export default VideoGenerationPanel;
