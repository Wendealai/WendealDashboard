/**
 * Video Description Input Component
 * A specialized text input component for video generation descriptions with validation and character limits
 */

import React, { memo } from 'react';
import { Form, Input } from 'antd';
import { VideoCameraOutlined } from '@ant-design/icons';

const { TextArea } = Input;

/**
 * Video Description Input Props Interface
 */
interface VideoDescriptionInputProps {
  /** Form item name for the input */
  name?: string | (string | number)[];
  /** Input label */
  label?: string;
  /** Input placeholder text */
  placeholder?: string;
  /** Help text below the input */
  help?: string;
  /** Whether the input is required */
  required?: boolean;
  /** Minimum character count */
  minLength?: number;
  /** Maximum character count */
  maxLength?: number;
  /** Number of rows for the textarea */
  rows?: number;
  /** Whether to show character count */
  showCount?: boolean;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Custom CSS class name */
  className?: string;
  /** Auto-resize behavior */
  autoSize?: boolean | { minRows?: number; maxRows?: number };
}

/**
 * Video Description Input Component
 */
const VideoDescriptionInput: React.FC<VideoDescriptionInputProps> = memo(
  ({
    name = 'description',
    label = '视频描述',
    placeholder = '详细描述您想要生成的视频内容、风格和场景...',
    help = '描述应包含视频主题、视觉风格、动作和氛围等信息',
    required = true,
    minLength = 10,
    maxLength = 1000,
    rows = 6,
    showCount = true,
    disabled = false,
    className = '',
    autoSize = { minRows: 4, maxRows: 12 },
  }) => {
    /**
     * Validation rules for the input
     */
    const rules = [
      {
        required,
        message: '请输入视频描述',
      },
      {
        min: minLength,
        message: `描述至少需要 ${minLength} 个字符`,
      },
      {
        max: maxLength,
        message: `描述不能超过 ${maxLength} 个字符`,
      },
      {
        pattern: /\S/,
        message: '描述不能为空白字符',
      },
    ];

    return (
      <Form.Item
        label={
          <span>
            <VideoCameraOutlined
              style={{ marginRight: '8px', color: '#1890ff' }}
            />
            {label}
          </span>
        }
        name={name}
        rules={rules}
        help={help}
        className={`video-description-input ${className}`}
      >
        <TextArea
          rows={rows}
          placeholder={placeholder}
          maxLength={maxLength}
          showCount={showCount}
          disabled={disabled}
          autoSize={autoSize}
          style={{
            minHeight: '120px',
            resize: 'vertical',
          }}
          onKeyDown={e => {
            // Allow common keyboard shortcuts
            if (e.ctrlKey || e.metaKey) {
              return;
            }
          }}
        />
      </Form.Item>
    );
  }
);

VideoDescriptionInput.displayName = 'VideoDescriptionInput';

export default VideoDescriptionInput;
