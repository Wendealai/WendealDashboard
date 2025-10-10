/**
 * Video Result Display Component
 * A component for displaying generated videos with playback and download functionality
 */

import React, { memo } from 'react';
import { Card, Button, Typography, Space, message } from 'antd';
import { DownloadOutlined, PlayCircleOutlined } from '@ant-design/icons';
import type { VideoGenerationResponse } from '../types';

const { Text, Title } = Typography;

/**
 * Video Result Display Props Interface
 */
interface VideoResultDisplayProps {
  /** Video generation response data */
  video: VideoGenerationResponse;
  /** Whether the component is loading */
  loading?: boolean;
  /** Custom title */
  title?: string;
  /** Custom CSS class name */
  className?: string;
  /** Download callback */
  onDownload?: (video: VideoGenerationResponse) => void;
  /** Video click callback */
  onVideoClick?: (video: VideoGenerationResponse) => void;
}

/**
 * Video Result Display Component
 */
const VideoResultDisplay: React.FC<VideoResultDisplayProps> = memo(
  ({
    video,
    loading = false,
    title = '生成的视频',
    className = '',
    onDownload,
    onVideoClick,
  }) => {
    /**
     * Handle download button click
     */
    const handleDownload = async () => {
      if (onDownload) {
        onDownload(video);
      } else {
        // Default download implementation
        try {
          const response = await fetch(video.videoUrl);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `generated-video-${Date.now()}.mp4`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          message.success('视频下载成功！');
        } catch (error) {
          console.error('Download failed:', error);
          message.error('下载失败');
        }
      }
    };

    /**
     * Handle video click
     */
    const handleVideoClick = () => {
      if (onVideoClick) {
        onVideoClick(video);
      }
    };

    /**
     * Format file size
     */
    const formatFileSize = (bytes: number): string => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
      <Card
        title={
          <Space>
            <PlayCircleOutlined style={{ color: '#1890ff' }} />
            {title}
          </Space>
        }
        loading={loading}
        className={`video-result-display ${className}`}
        extra={
          <Button
            type='primary'
            icon={<DownloadOutlined />}
            onClick={handleDownload}
            size='small'
          >
            下载
          </Button>
        }
      >
        <div className='video-content'>
          {/* Video Player */}
          <div
            className='video-player-container'
            style={{ marginBottom: '16px' }}
          >
            <video
              src={video.videoUrl}
              controls
              style={{
                width: '100%',
                maxWidth: '500px',
                height: 'auto',
                borderRadius: '8px',
                border: '1px solid #d9d9d9',
              }}
              onClick={handleVideoClick}
              poster='/video-placeholder.png' // Optional placeholder
            >
              您的浏览器不支持视频播放。
            </video>
          </div>

          {/* Video Information */}
          <div className='video-info'>
            <Space direction='vertical' size='small' style={{ width: '100%' }}>
              {video.description && (
                <div>
                  <Text strong>描述:</Text>
                  <br />
                  <Text>{video.description}</Text>
                </div>
              )}

              <div>
                <Text strong>生成时间:</Text>
                <br />
                <Text>{new Date(video.createdAt).toLocaleString()}</Text>
              </div>

              {video.processingTime && (
                <div>
                  <Text strong>处理时间:</Text>
                  <br />
                  <Text>{video.processingTime}ms</Text>
                </div>
              )}

              {video.metadata && (
                <div>
                  <Text strong>视频信息:</Text>
                  <br />
                  <Text>
                    时长: {video.metadata.duration}s | 格式:{' '}
                    {video.metadata.format} | 大小:{' '}
                    {formatFileSize(Number(video.metadata.size))}
                  </Text>
                </div>
              )}

              {video.errorMessage && (
                <div>
                  <Text strong style={{ color: '#ff4d4f' }}>
                    错误信息:
                  </Text>
                  <br />
                  <Text type='danger'>{video.errorMessage}</Text>
                </div>
              )}
            </Space>
          </div>
        </div>
      </Card>
    );
  }
);

VideoResultDisplay.displayName = 'VideoResultDisplay';

export default VideoResultDisplay;
