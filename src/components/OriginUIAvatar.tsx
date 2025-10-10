import React from 'react';
import { Button, Avatar } from 'antd';
import { DownOutlined } from '@ant-design/icons';

interface OriginUIAvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  onClick?: () => void;
  size?: number;
  showChevron?: boolean;
  asButton?: boolean;
  style?: React.CSSProperties;
}

const OriginUIAvatar: React.FC<OriginUIAvatarProps> = ({
  src,
  alt = 'Profile image',
  fallback = 'KK',
  onClick,
  size = 32,
  showChevron = true,
  asButton = true,
  style,
}) => {
  const avatarElement = (
    <Avatar
      src={src}
      alt={alt}
      size={size}
      style={{
        marginRight: showChevron ? 4 : 0,
        ...style,
      }}
    >
      {fallback}
    </Avatar>
  );

  if (!asButton) {
    return (
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {avatarElement}
        {showChevron && (
          <DownOutlined
            style={{
              fontSize: 16,
              opacity: 0.6,
            }}
            aria-hidden='true'
          />
        )}
      </div>
    );
  }

  return (
    <Button
      type='text'
      className='h-auto p-0 hover:bg-transparent'
      onClick={onClick}
      style={{
        height: 'auto',
        padding: 0,
        border: 'none',
        background: 'transparent',
      }}
    >
      {avatarElement}
      {showChevron && (
        <DownOutlined
          style={{
            fontSize: 16,
            opacity: 0.6,
          }}
          aria-hidden='true'
        />
      )}
    </Button>
  );
};

export default OriginUIAvatar;
