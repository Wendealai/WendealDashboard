import React, { useState, useEffect } from 'react';
import { Modal as AntModal, Button } from 'antd';
import type { ModalProps as AntModalProps, ModalFuncProps } from 'antd';
import {
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';

export interface ModalProps extends AntModalProps {
  /** Modal type for different styles */
  type?: 'default' | 'confirm' | 'info' | 'success' | 'warning' | 'error';
  /** Auto close after specified time (in seconds) */
  autoClose?: number;
  /** Custom loading state for OK button */
  okLoading?: boolean;
  /** Custom loading state for Cancel button */
  cancelLoading?: boolean;
  /** Prevent close on outside click */
  preventOutsideClose?: boolean;
  /** Custom footer buttons */
  footerButtons?: React.ReactNode[];
}

const Modal: React.FC<ModalProps> = ({
  type = 'default',
  autoClose,
  okLoading = false,
  cancelLoading = false,
  preventOutsideClose = false,
  footerButtons,
  onOk,
  onCancel,
  children,
  ...props
}) => {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [internalOpen, setInternalOpen] = useState(props.open || false);

  useEffect(() => {
    setInternalOpen(props.open || false);
  }, [props.open]);

  useEffect(() => {
    if (autoClose && internalOpen) {
      setCountdown(autoClose);
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev && prev <= 1) {
            clearInterval(timer);
            handleCancel();
            return null;
          }
          return prev ? prev - 1 : null;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
    return undefined;
  }, [autoClose, internalOpen]);

  const handleOk = (e: React.MouseEvent<HTMLElement>) => {
    if (onOk) {
      onOk(e as React.MouseEvent<HTMLButtonElement>);
    }
  };

  const handleCancel = (e?: React.MouseEvent<HTMLElement>) => {
    if (onCancel) {
      onCancel(
        (e ||
          ({} as React.MouseEvent<HTMLElement>)) as React.MouseEvent<HTMLButtonElement>
      );
    }
  };

  // Get icon based on type
  const getTypeIcon = () => {
    switch (type) {
      case 'confirm':
      case 'warning':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />;
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'info':
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />;
      case 'error':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return null;
    }
  };

  // Custom footer
  const renderFooter = () => {
    if (footerButtons) {
      return footerButtons;
    }

    if (props.footer === null) {
      return null;
    }

    const okText = props.okText || '确定';
    const cancelText = props.cancelText || '取消';
    const showCancel = props.cancelButtonProps?.style?.display !== 'none';

    return [
      showCancel && (
        <Button
          key='cancel'
          loading={cancelLoading}
          onClick={handleCancel}
          {...props.cancelButtonProps}
        >
          {cancelText}
          {countdown && ` (${countdown}s)`}
        </Button>
      ),
      <Button
        key='ok'
        type='primary'
        loading={okLoading}
        onClick={handleOk}
        {...props.okButtonProps}
      >
        {okText}
      </Button>,
    ].filter(Boolean);
  };

  return (
    <AntModal
      {...props}
      open={internalOpen}
      onOk={handleOk}
      onCancel={handleCancel}
      footer={renderFooter()}
      maskClosable={!preventOutsideClose}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {getTypeIcon()}
        <div style={{ flex: 1 }}>{children}</div>
      </div>
    </AntModal>
  );
};

// Define Modal with static methods
interface ModalComponent extends React.FC<ModalProps> {
  confirm: (props: ModalFuncProps) => void;
  info: (props: ModalFuncProps) => void;
  success: (props: ModalFuncProps) => void;
  error: (props: ModalFuncProps) => void;
  warning: (props: ModalFuncProps) => void;
}

// Static methods for different modal types
(Modal as ModalComponent).confirm = (props: ModalFuncProps) => {
  return AntModal.confirm({
    ...props,
    icon: <ExclamationCircleOutlined />,
  });
};

(Modal as ModalComponent).info = (props: ModalFuncProps) => {
  return AntModal.info({
    ...props,
    icon: <InfoCircleOutlined />,
  });
};

(Modal as ModalComponent).success = (props: ModalFuncProps) => {
  return AntModal.success({
    ...props,
    icon: <CheckCircleOutlined />,
  });
};

(Modal as ModalComponent).error = (props: ModalFuncProps) => {
  return AntModal.error({
    ...props,
    icon: <ExclamationCircleOutlined />,
  });
};

(Modal as ModalComponent).warning = (props: ModalFuncProps) => {
  return AntModal.warning({
    ...props,
    icon: <ExclamationCircleOutlined />,
  });
};

export default Modal as ModalComponent;
