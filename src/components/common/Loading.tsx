import React from 'react';
import { Spin } from 'antd';
import type { SpinProps } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

export interface LoadingProps extends SpinProps {
  /** Loading text */
  text?: string;
  /** Full screen loading */
  fullScreen?: boolean;
  /** Custom loading icon */
  icon?: React.ReactElement;
}

const Loading: React.FC<LoadingProps> = ({
  text = '加载中...',
  fullScreen = false,
  icon,
  size = 'default',
  ...props
}) => {
  const loadingIcon = (
    icon && React.isValidElement(icon) ? (
      icon
    ) : (
      <LoadingOutlined style={{ fontSize: 24 }} spin />
    )
  ) as React.ReactElement<HTMLElement>;

  if (fullScreen) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          zIndex: 9999,
        }}
      >
        <Spin indicator={loadingIcon} size={size} tip={text} {...props} />
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <Spin indicator={loadingIcon} size={size} tip={text} {...props} />
    </div>
  );
};

export { Loading as default };
export { Loading };
