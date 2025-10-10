import React from 'react';
import { EditOutlined, SaveOutlined } from '@ant-design/icons';
import { Button } from 'antd';

interface GradientButtonProps {
  editing: boolean;
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  size?: 'small' | 'middle' | 'large';
  editText?: string;
  saveText?: string;
  type?: 'button' | 'submit' | 'reset';
}

const GradientButton: React.FC<GradientButtonProps> = ({
  editing,
  onClick,
  loading = false,
  disabled = false,
  size = 'middle',
  editText = 'Edit',
  saveText = 'Save',
  type = 'button',
}) => {
  const gradientStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #6253e1, #04befe)',
    border: 'none',
    transition: 'all 0.3s',
  };

  const hoverStyle: React.CSSProperties = {
    background: '#6253e1',
  };

  return (
    <Button
      type='primary'
      size={size}
      icon={editing ? <SaveOutlined /> : <EditOutlined />}
      onClick={onClick}
      loading={loading}
      disabled={disabled}
      htmlType={type}
      style={gradientStyle}
      onMouseEnter={e => {
        e.currentTarget.style.background = '#6253e1';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background =
          'linear-gradient(135deg, #6253e1, #04befe)';
      }}
    >
      {editing ? saveText : editText}
    </Button>
  );
};

export default GradientButton;
