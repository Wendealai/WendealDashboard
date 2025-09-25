/**
 * Invoice OCR Workflow Card Component
 *
 * A specialized workflow card component for Invoice OCR functionality.
 * Extends the base WorkflowCard component with Invoice OCR specific features,
 * icons, and interactions.
 *
 * This component provides a visual representation of the Invoice OCR workflow
 * in the dashboard, allowing users to quickly access and trigger invoice
 * processing operations.
 *
 * Features:
 * - Invoice-specific icons and branding
 * - OCR processing status indicators
 * - Quick access to upload and settings
 * - Integration with workflow management system
 * - Responsive design for different screen sizes
 *
 * @component
 * @example
 * ```tsx
 * <InvoiceOCRCard
 *   selected={true}
 *   loading={false}
 *   onClick={() => navigateToOCR()}
 *   onTrigger={() => startOCRWorkflow()}
 *   onSettings={() => openSettings()}
 * />
 * ```
 *
 * @see {@link WorkflowCard} - Base workflow card component
 * @see {@link InvoiceOCRPage} - Main OCR page component
 * @see {@link InvoiceOCRWorkflow} - OCR workflow data structure
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Tag,
  Space,
  Button,
  Typography,
  Tooltip,
  Progress,
  Alert,
} from 'antd';
import {
  FileTextOutlined,
  ScanOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

/**
 * Invoice OCR Card Component Props
 */
interface InvoiceOCRCardProps {
  /** Whether the card is selected */
  selected?: boolean;
  /** Whether the card is loading */
  loading?: boolean;
  /** Error message */
  error?: string | null;
  /** Progress status */
  progressStatus?: string;
  /** Last updated time */
  lastUpdated?: Date;
  /** Card click callback */
  onClick?: () => void;
  /** Trigger workflow callback */
  onTrigger?: () => void;
  /** Settings callback */
  onSettings?: () => void;
  /** Card size */
  size?: 'small' | 'default' | 'large';
  /** Whether to show action buttons */
  showActions?: boolean;
  /** Custom CSS class name */
  className?: string;
  /** Number of processed invoices */
  processedCount?: number;
  /** Success rate percentage */
  successRate?: number;
}

/**
 * Invoice OCR Workflow Card Component
 */
const InvoiceOCRCard: React.FC<InvoiceOCRCardProps> = ({
  selected = false,
  loading = false,
  error,
  progressStatus,
  lastUpdated,
  onClick,
  onTrigger,
  onSettings,
  size = 'default',
  showActions = true,
  className = '',
  processedCount = 0,
  successRate = 95.5,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  /**
   * Handle card click
   */
  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else {
      // Default navigation to information dashboard page
      navigate('/information-dashboard');
    }
  };

  /**
   * Handle trigger button click
   */
  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTrigger) {
      onTrigger();
    } else {
      // Default navigation to information dashboard page
      navigate('/information-dashboard');
    }
  };

  /**
   * Handle settings button click
   */
  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSettings?.();
  };

  return (
    <Card
      className={`invoice-ocr-card ${className} ${selected ? 'selected' : ''}`}
      size={size}
      hoverable
      onClick={handleCardClick}
      style={{
        cursor: 'pointer',
        border: selected ? '2px solid #1890ff' : '1px solid #d9d9d9',
        boxShadow: selected
          ? '0 4px 12px rgba(24, 144, 255, 0.15)'
          : '0 2px 8px rgba(0, 0, 0, 0.06)',
        transition: 'all 0.3s ease',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      styles={{
        body: {
          padding: size === 'small' ? 8 : 12,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      {/* Card Header */}
      <div style={{ marginBottom: size === 'small' ? 8 : 12 }}>
        <Space
          align='start'
          style={{ width: '100%', justifyContent: 'space-between' }}
        >
          <Space>
            <FileTextOutlined style={{ color: '#52c41a', fontSize: 16 }} />
            <div>
              <Title
                level={size === 'small' ? 5 : 4}
                style={{ margin: 0, fontSize: size === 'small' ? 12 : 14 }}
              >
                {t('navigation.invoiceOCR')}
              </Title>
              <Tag
                color='success'
                size={size === 'small' ? 'small' : 'default'}
                style={{ marginTop: size === 'small' ? 2 : 4 }}
              >
                {t('common.ready')}
              </Tag>
            </div>
          </Space>
          {onSettings && (
            <Tooltip title={t('common.settings')}>
              <Button
                type='text'
                icon={<SettingOutlined />}
                size={size === 'small' ? 'small' : 'middle'}
                onClick={handleSettingsClick}
                style={{ color: '#1890ff' }}
              />
            </Tooltip>
          )}
        </Space>
      </div>

      {/* Card Content */}
      <div style={{ flex: 1, marginBottom: size === 'small' ? 8 : 12 }}>
        <Space
          direction='vertical'
          size={size === 'small' ? 4 : 6}
          style={{ width: '100%' }}
        >
          {/* Description */}
          <Text
            type='secondary'
            style={{
              fontSize: size === 'small' ? 11 : 12,
              display: '-webkit-box',
              WebkitLineClamp: size === 'small' ? 1 : 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {t('invoiceOCR.subtitle')}
          </Text>

          {/* Statistics */}
          <Space size={size === 'small' ? 8 : 12} wrap>
            <Space size={4}>
              <ScanOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
              <Text
                type='secondary'
                style={{ fontSize: size === 'small' ? 10 : 11 }}
              >
                {processedCount} {t('informationDashboard.documentsProcessed')}
              </Text>
            </Space>
            <Space size={4}>
              <ClockCircleOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
              <Text
                type='secondary'
                style={{ fontSize: size === 'small' ? 10 : 11 }}
              >
                {successRate}% {t('informationDashboard.successRate')}
              </Text>
            </Space>
          </Space>

          {/* Last Updated Time */}
          {lastUpdated && (
            <Text type='secondary' style={{ fontSize: 11 }}>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {t('common.lastUpdated')}: {lastUpdated.toLocaleString('zh-CN')}
            </Text>
          )}

          {/* Error Message */}
          {error && (
            <Alert
              message={error}
              type='error'
              size='small'
              showIcon
              style={{ fontSize: 11 }}
            />
          )}

          {/* Progress Status */}
          {progressStatus && (
            <div>
              <Text type='secondary' style={{ fontSize: 11 }}>
                {progressStatus}
              </Text>
              <Progress
                percent={loading ? undefined : 100}
                status={loading ? 'active' : 'success'}
                size='small'
                showInfo={false}
                style={{ marginTop: 4 }}
              />
            </div>
          )}
        </Space>
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div style={{ marginTop: 'auto' }}>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button
              type='primary'
              size={size === 'small' ? 'small' : 'middle'}
              icon={loading ? <LoadingOutlined /> : <ScanOutlined />}
              loading={loading}
              onClick={handleTriggerClick}
            >
              {loading
                ? size === 'small'
                  ? t('common.processing')
                  : t('common.processing')
                : size === 'small'
                  ? t('common.start')
                  : t('common.start')}
            </Button>
          </Space>
        </div>
      )}
    </Card>
  );
};

export default InvoiceOCRCard;
