import React from 'react';
import { Modal, Button, Typography, Space } from 'antd';
import { ExclamationCircleOutlined, CopyOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

const { Text, Paragraph } = Typography;

export interface ErrorModalProps {
  /** 是否显示模态框 */
  visible: boolean;
  /** 错误标题 */
  title?: string;
  /** 错误消息 */
  message: string;
  /** 错误详情（可选） */
  details?: string;
  /** 故障排除步骤（可选） */
  troubleshooting?: string[];
  /** 关闭回调 */
  onClose: () => void;
  /** 是否显示复制按钮 */
  showCopy?: boolean;
  /** 自定义操作按钮 */
  actions?: React.ReactNode[];
}

/**
 * 持久化错误模态框组件
 * 用于显示需要用户确认的错误信息，替代自动消失的message.error
 */
export const ErrorModal: React.FC<ErrorModalProps> = ({
  visible,
  title,
  message,
  details,
  troubleshooting,
  onClose,
  showCopy = true,
  actions,
}) => {
  const { t } = useTranslation();

  /**
   * 复制错误信息到剪贴板
   */
  const handleCopy = async () => {
    try {
      let errorText = `${title || t('error.title', '错误')}\n${message}`;

      if (details) {
        errorText += `\n\n详情:\n${details}`;
      }

      if (troubleshooting && troubleshooting.length > 0) {
        errorText += `\n\n故障排除步骤:\n${troubleshooting.join('\n')}`;
      }

      await navigator.clipboard.writeText(errorText);
      // 这里可以添加一个简短的成功提示
    } catch (err) {
      console.error('Failed to copy error message:', err);
    }
  };

  const defaultActions = [
    showCopy && (
      <Button
        key='copy'
        icon={<CopyOutlined />}
        onClick={handleCopy}
        type='default'
      >
        {t('common.copy', '复制')}
      </Button>
    ),
    <Button key='close' type='primary' onClick={onClose}>
      {t('common.close', '关闭')}
    </Button>,
  ].filter(Boolean);

  return (
    <Modal
      open={visible}
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
          {title || t('error.title', '错误')}
        </Space>
      }
      onCancel={onClose}
      footer={actions || defaultActions}
      width={520}
      centered
      maskClosable={false}
      keyboard={false}
      destroyOnHidden
    >
      <div style={{ marginTop: 16 }}>
        <Paragraph>
          <Text>{message}</Text>
        </Paragraph>

        {details && (
          <div style={{ marginTop: 16 }}>
            <Text strong>{t('error.details', '错误详情')}:</Text>
            <div
              style={{
                marginTop: 8,
                padding: 12,
                backgroundColor: '#f5f5f5',
                borderRadius: 6,
                border: '1px solid #d9d9d9',
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              <Text code style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                {details}
              </Text>
            </div>
          </div>
        )}

        {troubleshooting && troubleshooting.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Text strong>{t('error.troubleshooting', '故障排除步骤')}:</Text>
            <div
              style={{
                marginTop: 8,
                padding: 12,
                backgroundColor: '#f0f9ff',
                borderRadius: 6,
                border: '1px solid #91d5ff',
              }}
            >
              {troubleshooting.map((step, index) => (
                <div
                  key={index}
                  style={{
                    marginBottom: index < troubleshooting.length - 1 ? 8 : 0,
                  }}
                >
                  <Text style={{ fontSize: '14px', lineHeight: '1.5' }}>
                    {step}
                  </Text>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ErrorModal;
