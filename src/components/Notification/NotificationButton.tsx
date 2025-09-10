import React from 'react';
import { Badge, Button, Tooltip } from 'antd';
import { BellOutlined } from '@ant-design/icons';
import './NotificationButton.scss';

export interface NotificationButtonProps {
  count: number;
  onClick: () => void;
  className?: string;
}

const NotificationButton: React.FC<NotificationButtonProps> = ({
  count,
  onClick,
  className = '',
}) => {
  return (
    <Tooltip title='通知中心' placement='bottom'>
      <Badge
        count={count}
        size='small'
        offset={[-2, 2]}
        className={`notification-button ${className}`}
      >
        <Button
          type='text'
          icon={<BellOutlined />}
          onClick={onClick}
          className='notification-btn'
        />
      </Badge>
    </Tooltip>
  );
};

export { NotificationButton as default };
export { NotificationButton };
