/**
 * Video Generation Button Component
 * A specialized button component for triggering video generation with loading states and validation
 */

import React, { memo } from 'react';
import { Button } from 'antd';
import { VideoCameraOutlined, LoadingOutlined } from '@ant-design/icons';

/**
 * Video Generation Button Props Interface
 */
interface VideoGenerationButtonProps {
  /** Whether generation is in progress */
  loading?: boolean;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Button size */
  size?: 'small' | 'middle' | 'large';
  /** Button text when not loading */
  children?: React.ReactNode;
  /** Loading text */
  loadingText?: string;
  /** Click callback */
  onClick?: () => void;
  /** Custom CSS class name */
  className?: string;
  /** Button type */
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  /** Whether to show danger style */
  danger?: boolean;
  /** Button shape */
  shape?: 'default' | 'circle' | 'round';
  /** Whether button is block width */
  block?: boolean;
}

/**
 * Video Generation Button Component
 */
const VideoGenerationButton: React.FC<VideoGenerationButtonProps> = memo(
  ({
    loading = false,
    disabled = false,
    size = 'large',
    children = '生成视频',
    loadingText = '生成中...',
    onClick,
    className = '',
    type = 'primary',
    danger = false,
    shape,
    block = false,
  }) => {
    /**
     * Handle button click
     */
    const handleClick = () => {
      if (!loading && !disabled && onClick) {
        onClick();
      }
    };

    /**
     * Get button icon based on loading state
     */
    const getButtonIcon = () => {
      if (loading) {
        return <LoadingOutlined spin />;
      }
      return <VideoCameraOutlined />;
    };

    /**
     * Get button text based on loading state
     */
    const getButtonText = () => {
      return loading ? loadingText : children;
    };

    return (
      <Button
        type={type}
        size={size}
        icon={getButtonIcon()}
        loading={loading}
        disabled={disabled || loading}
        danger={danger}
        {...(shape && { shape })}
        block={block}
        onClick={handleClick}
        className={`video-generation-button ${className}`}
        style={{
          minWidth:
            size === 'large' ? '140px' : size === 'middle' ? '120px' : '100px',
          fontWeight: 500,
          transition: 'all 0.3s ease',
        }}
      >
        {getButtonText()}
      </Button>
    );
  }
);

VideoGenerationButton.displayName = 'VideoGenerationButton';

export default VideoGenerationButton;
