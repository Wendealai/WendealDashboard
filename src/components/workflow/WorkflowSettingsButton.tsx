import React from 'react';
import { SettingOutlined } from '@ant-design/icons';
import Button from '../common/Button';
import type { ButtonProps } from '../common/Button';

/**
 * 工作流设置按钮组件属性接口
 */
export interface WorkflowSettingsButtonProps
  extends Omit<ButtonProps, 'icon' | 'children'> {
  /** 按钮文本，默认为"工作流设置" */
  text?: string;
  /** 是否显示图标，默认为true */
  showIcon?: boolean;
  /** 自定义图标 */
  customIcon?: React.ReactNode;
  /** 按钮尺寸，默认为middle */
  size?: 'small' | 'middle' | 'large';
  /** 按钮类型，默认为default */
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text';
  /** 是否禁用，默认为false */
  disabled?: boolean;
  /** 点击回调函数 */
  onSettingsClick?: () => void;
}

/**
 * 工作流设置按钮组件
 * 提供打开工作流设置模态框的入口点
 *
 * @param props - 组件属性
 * @returns React组件
 */
const WorkflowSettingsButton: React.FC<WorkflowSettingsButtonProps> = ({
  text = '工作流设置',
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
   * 处理按钮点击事件
   * @param e - 鼠标事件
   */
  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    // 先调用传入的onClick处理器
    if (onClick) {
      onClick(e);
    }

    // 然后调用设置特定的处理器
    if (onSettingsClick) {
      onSettingsClick();
    }
  };

  // 确定要显示的图标
  const iconToShow = showIcon ? customIcon || <SettingOutlined /> : undefined;

  // 组合CSS类名
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
      title={disabled ? '工作流设置当前不可用' : '打开工作流设置'}
      aria-label={`${text} - ${disabled ? '不可用' : '点击打开设置'}`}
    >
      {text}
    </Button>
  );
};

// 默认导出
export default WorkflowSettingsButton;

// 命名导出
export { WorkflowSettingsButton };
