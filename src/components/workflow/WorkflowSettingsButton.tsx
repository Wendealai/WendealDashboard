import React from 'react';
import { SettingOutlined } from '@ant-design/icons';
import Button from '../common/Button';
import type { ButtonProps } from '../common/Button';

/**
 * Workflow settings button component props interface
 */
export interface WorkflowSettingsButtonProps
  extends Omit<ButtonProps, 'icon' | 'children'> {
  /** Button text, defaults to "Workflow Settings" */
  text?: string;
  /** Whether to show icon, defaults to true */
  showIcon?: boolean;
  /** Custom icon */
  customIcon?: React.ReactNode;
  /** Button size, defaults to middle */
  size?: 'small' | 'middle' | 'large';
  /** Button type, defaults to default */
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  /** Whether disabled, defaults to false */
  disabled?: boolean;
  /** Click callback function */
  onSettingsClick?: () => void;
}

/**
 * Workflow settings button component
 * Provides entry point for opening workflow settings modal
 *
 * @param props - Component props
 * @returns React component
 */
const WorkflowSettingsButton: React.FC<WorkflowSettingsButtonProps> = ({
  text = 'Workflow Settings',
  showIcon = true,
  customIcon,
  size = 'middle',
  type = 'default',
  disabled = false,
  onSettingsClick,
  onClick,
  className = '',
  style,
  ...restProps
}) => {
  /**
   * Handle button click event
   * @param e - Mouse event
   */
  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    // First call the passed onClick handler
    if (onClick) {
      onClick(e);
    }

    // Then call the settings-specific handler
    if (onSettingsClick) {
      onSettingsClick();
    }
  };

  // Determine the icon to display
  const iconToShow = showIcon ? customIcon || <SettingOutlined /> : undefined;

  // Combine CSS class names
  const combinedClassName = ['workflow-settings-button', className]
    .filter(Boolean)
    .join(' ');

  return (
    <Button
      {...restProps}
      type={type}
      size={size}
      disabled={disabled}
      icon={iconToShow}
      onClick={handleClick}
      className={combinedClassName}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        ...style,
      }}
      title={
        disabled
          ? 'Workflow settings currently unavailable'
          : 'Open workflow settings'
      }
      aria-label={`${text} - ${disabled ? 'Unavailable' : 'Click to open settings'}`}
    >
      {text}
    </Button>
  );
};

// Default export
export default WorkflowSettingsButton;

// Named export
export { WorkflowSettingsButton };
