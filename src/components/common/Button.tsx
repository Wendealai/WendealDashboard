import React from 'react';
import { Button as AntButton } from 'antd';
import type { ButtonProps as AntButtonProps } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

export interface ButtonProps extends AntButtonProps {
  /** Custom loading text */
  loadingText?: string;
  /** Confirm before action */
  confirm?: boolean;
  /** Confirm message */
  confirmMessage?: string;
  /** Custom loading icon */
  loadingIcon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  loading,
  loadingText,
  confirm = false,
  confirmMessage = '确定要执行此操作吗？',
  loadingIcon,
  onClick,
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    if (confirm && !loading) {
      const confirmed = window.confirm(confirmMessage);
      if (!confirmed) {
        return;
      }
    }

    if (onClick) {
      onClick(e);
    }
  };

  const customLoadingIcon = loadingIcon || <LoadingOutlined spin />;

  return (
    <AntButton
      {...props}
      loading={
        loading
          ? {
              icon: customLoadingIcon,
            }
          : false
      }
      onClick={handleClick}
    >
      {loading && loadingText ? loadingText : children}
    </AntButton>
  );
};

export { Button as default };
export { Button };
