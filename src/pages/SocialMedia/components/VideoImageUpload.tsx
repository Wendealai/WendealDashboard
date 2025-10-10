/**
 * Video Image Upload Component
 * A specialized file upload component for video generation reference images with drag-and-drop, validation, and preview functionality
 */

import React, { memo, useCallback } from 'react';
import { Form, Upload, Button, Image, Space, Typography, message } from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  FileImageOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';

const { Text } = Typography;

/**
 * Video Image Upload Props Interface
 */
interface VideoImageUploadProps {
  /** Form item name for the upload */
  name?: string;
  /** Input label */
  label?: string;
  /** Help text below the upload area */
  help?: string;
  /** Whether the upload is required */
  required?: boolean;
  /** Maximum number of files allowed */
  maxFiles?: number;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Accepted file types */
  accept?: string;
  /** Whether multiple files are allowed */
  multiple?: boolean;
  /** Whether the upload is disabled */
  disabled?: boolean;
  /** Custom CSS class name */
  className?: string;
  /** Current uploaded files */
  value?: File[];
  /** Callback when files change */
  onChange?: (files: File[]) => void;
  /** Callback when a file is removed */
  onRemove?: (file: File, index: number) => void;
}

/**
 * Video Image Upload Component
 */
const VideoImageUpload: React.FC<VideoImageUploadProps> = memo(
  ({
    name,
    label = '参考图片',
    help = '上传图片来指导视频生成，支持拖拽和点击上传',
    required = false,
    maxFiles = 5,
    maxSize = 10 * 1024 * 1024, // 10MB
    accept = 'image/*',
    multiple = true,
    disabled = false,
    className = '',
    value = [],
    onChange,
    onRemove,
  }) => {
    /**
     * Handle file upload before processing
     */
    const handleBeforeUpload = useCallback(
      (file: File) => {
        // Check file count
        if (value.length >= maxFiles) {
          message.error(`最多只能上传 ${maxFiles} 张图片`);
          return false;
        }

        // Check file size
        if (file.size > maxSize) {
          message.error(
            `图片大小不能超过 ${Math.round(maxSize / (1024 * 1024))}MB`
          );
          return false;
        }

        // Check file type
        const allowedTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
        ];
        if (
          !allowedTypes.some(type =>
            file.type.startsWith(type.replace('*', ''))
          )
        ) {
          message.error(
            `不支持的文件格式，请上传 ${allowedTypes.join('、')} 格式的图片`
          );
          return false;
        }

        // Add file to the list
        const newFiles = [...value, file];
        onChange?.(newFiles);

        return false; // Prevent automatic upload
      },
      [value, maxFiles, maxSize, onChange]
    );

    /**
     * Handle file removal
     */
    const handleRemove = useCallback(
      (index: number) => {
        const fileToRemove = value[index];
        if (fileToRemove) {
          const newFiles = value.filter((_, i) => i !== index);
          onChange?.(newFiles);
          onRemove?.(fileToRemove, index);
        }
      },
      [value, onChange, onRemove]
    );

    /**
     * Create upload props for Ant Design Upload component
     */
    const uploadProps = {
      accept,
      multiple,
      disabled: disabled || value.length >= maxFiles,
      beforeUpload: handleBeforeUpload,
      showUploadList: false, // We'll handle the list ourselves
      className: 'video-image-upload',
    };

    /**
     * Render uploaded images preview
     */
    const renderImagePreviews = () => {
      if (value.length === 0) return null;

      return (
        <div className='uploaded-images-preview' style={{ marginTop: '16px' }}>
          <Text strong style={{ marginBottom: '8px', display: 'block' }}>
            已上传的图片 ({value.length}/{maxFiles})
          </Text>
          <div
            className='image-grid'
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '12px',
            }}
          >
            {value.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className='image-preview-item'
                style={{
                  position: 'relative',
                  border: '1px solid #d9d9d9',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  background: '#fafafa',
                }}
              >
                <Image
                  src={URL.createObjectURL(file)}
                  alt={`Preview ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100px',
                    objectFit: 'cover',
                  }}
                  placeholder={
                    <div
                      style={{
                        width: '100%',
                        height: '100px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#f5f5f5',
                      }}
                    >
                      <FileImageOutlined
                        style={{ fontSize: '24px', color: '#bfbfbf' }}
                      />
                    </div>
                  }
                />
                <div
                  className='image-overlay'
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.3s',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.opacity = '1';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.opacity = '0';
                  }}
                  onClick={() => handleRemove(index)}
                >
                  <DeleteOutlined
                    style={{
                      color: 'white',
                      fontSize: '18px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      borderRadius: '50%',
                      padding: '8px',
                    }}
                  />
                </div>
                <div
                  className='image-info'
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '4px 8px',
                    fontSize: '12px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {file.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    };

    /**
     * Render upload area
     */
    const renderUploadArea = () => {
      const isMaxReached = value.length >= maxFiles;

      return (
        <div
          className='upload-area'
          style={{
            border: '2px dashed #d9d9d9',
            borderRadius: '8px',
            padding: '24px',
            textAlign: 'center',
            background: disabled
              ? '#f5f5f5'
              : isMaxReached
                ? '#fafafa'
                : '#fafafa',
            cursor: disabled || isMaxReached ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s',
          }}
        >
          <Upload {...uploadProps}>
            <Space direction='vertical' size='small'>
              <UploadOutlined
                style={{
                  fontSize: '32px',
                  color: disabled || isMaxReached ? '#bfbfbf' : '#1890ff',
                }}
              />
              <div>
                <Text
                  strong
                  style={{
                    color: disabled || isMaxReached ? '#bfbfbf' : '#1890ff',
                  }}
                >
                  {isMaxReached ? '已达到最大图片数量' : '点击或拖拽上传图片'}
                </Text>
              </div>
              <Text type='secondary' style={{ fontSize: '12px' }}>
                支持 JPG、PNG、GIF、WebP 格式，最大{' '}
                {Math.round(maxSize / (1024 * 1024))}MB
              </Text>
              <Text type='secondary' style={{ fontSize: '12px' }}>
                已上传 {value.length}/{maxFiles} 张图片
              </Text>
            </Space>
          </Upload>
        </div>
      );
    };

    return (
      <Form.Item
        label={
          <span>
            <FileImageOutlined
              style={{ marginRight: '8px', color: '#52c41a' }}
            />
            {label}
          </span>
        }
        {...(name && { name })}
        help={help}
        required={required}
        className={`video-image-upload ${className}`}
        {...(required && {
          rules: [
            {
              validator: (_, value) => {
                if (!value || value.length === 0) {
                  return Promise.reject(new Error('请至少上传一张图片'));
                }
                return Promise.resolve();
              },
            },
          ],
        })}
      >
        <div className='video-image-upload-container'>
          {renderUploadArea()}
          {renderImagePreviews()}
        </div>
      </Form.Item>
    );
  }
);

VideoImageUpload.displayName = 'VideoImageUpload';

export default VideoImageUpload;
