/**
 * Workflow Card Component
 * Provides adaptive workflow display cards
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Tag,
  Space,
  Button,
  Typography,
  Tooltip,
  Alert,
  Popover,
} from 'antd';
import {
  PlayCircleOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  RedditOutlined,
  GoogleOutlined,
  CloudDownloadOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import type {
  WorkflowInfo,
  WorkflowStatus,
} from '@/pages/InformationDashboard/types';

const { Text, Title } = Typography;

/**
 * Workflow Card Component Props
 */
interface WorkflowCardProps {
  /** Workflow data */
  workflow: WorkflowInfo;
  /** Whether selected */
  selected?: boolean;
  /** Whether loading */
  loading?: boolean;
  /** Error message */
  error?: string | null;
  /** Last updated time */
  lastUpdated?: Date | undefined;
  /** Card click callback */
  onClick?: ((workflow: WorkflowInfo) => void) | undefined;
  /** Trigger workflow callback */
  onTrigger?: ((workflow: WorkflowInfo) => void) | undefined;
  /** Settings callback */
  onSettings?: ((workflow: WorkflowInfo) => void) | undefined;

  /** Card size */
  size?: 'small' | 'default' | 'large';
  /** Whether to show action buttons */
  showActions?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Get workflow status tag color
 */
const getWorkflowStatusTagColor = (status: WorkflowStatus): string => {
  switch (status) {
    case 'active':
      return 'success';
    case 'inactive':
      return 'default';
    case 'error':
      return 'error';
    default:
      return 'default';
  }
};

/**
 * Get workflow icon
 */
const getWorkflowIcon = (workflow: WorkflowInfo) => {
  if (
    workflow.id === 'reddit-workflow' ||
    workflow.name.toLowerCase().includes('reddit')
  ) {
    return <RedditOutlined style={{ color: '#888888' }} />;
  }
  return <SettingOutlined style={{ color: '#888888' }} />;
};

/**
 * Workflow Card Component
 */
const WorkflowCard: React.FC<WorkflowCardProps> = ({
  workflow,
  selected = false,
  loading = false,
  error,
  lastUpdated,
  onClick,
  onTrigger,
  onSettings,

  size = 'default',
  showActions = true,
  className = '',
}) => {
  const { t } = useTranslation();

  /**
   * Responsive size state
   */
  const [responsiveSize, setResponsiveSize] = useState(() => {
    if (typeof window !== 'undefined') {
      const width = window.innerWidth;
      if (width <= 576) return 'small';
      if (width <= 768) return 'default';
      return size;
    }
    return size;
  });

  const [isHovered, setIsHovered] = useState(false);

  /**
   * Handle window resize
   */
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        const width = window.innerWidth;
        let newSize: 'small' | 'default' | 'large';
        if (width <= 576) {
          newSize = 'small';
        } else if (width <= 768) {
          newSize = 'default';
        } else {
          newSize = size;
        }
        setResponsiveSize(newSize);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [size]);

  /**
   * Handle card click
   */
  const handleCardClick = () => {
    onClick?.(workflow);
  };

  /**
   * Handle trigger button click
   */
  const handleTriggerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTrigger?.(workflow);
  };

  /**
   * Handle settings button click
   */
  const handleSettingsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSettings?.(workflow);
  };

  /**
   * Get status text
   */
  const getStatusText = (status: WorkflowStatus) => {
    switch (status) {
      case 'active':
        return t('informationDashboard.workflowPanel.status.active');
      case 'inactive':
        return t('informationDashboard.workflowPanel.status.inactive');
      case 'error':
        return t('informationDashboard.workflowPanel.status.error');
      default:
        return status;
    }
  };

  const workflowPopoverContent = (
    <div style={{ maxWidth: 300 }}>
      <div style={{ marginBottom: 8 }}>
        <Text strong>{workflow.name}</Text>
      </div>
      <div style={{ marginBottom: 8 }}>
        <Text type='secondary'>
          {workflow.description || t('common.noDescription')}
        </Text>
      </div>
      <Space direction='vertical' size='small'>
        <div>
          <Text type='secondary' style={{ fontSize: 12 }}>
            <SettingOutlined style={{ marginRight: 4 }} />
            {workflow.executionCount || 0}{' '}
            {t('common.executions', 'executions')}
          </Text>
        </div>
        <div>
          <Text type='secondary' style={{ fontSize: 12 }}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {workflow.lastExecutedAt
              ? new Date(workflow.lastExecutedAt).toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : t('informationDashboard.workflowPanel.neverExecuted')}
          </Text>
        </div>
      </Space>
    </div>
  );

  return (
    <Popover
      content={workflowPopoverContent}
      trigger='hover'
      placement='top'
      mouseEnterDelay={1}
      overlayStyle={{ maxWidth: 320 }}
    >
      <Card
        className={`workflow-card ${className} ${selected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
        size={responsiveSize === 'large' ? 'default' : responsiveSize}
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          cursor: 'pointer',
          border: selected ? '2px solid #1890ff' : '1px solid #d9d9d9',
          boxShadow: selected
            ? '0 4px 12px rgba(24, 144, 255, 0.15)'
            : isHovered
              ? '0 8px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08)'
              : '0 2px 8px rgba(0, 0, 0, 0.06)',
          transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          height: 'auto',
          display: 'flex',
          flexDirection: 'column',
          minHeight: responsiveSize === 'small' ? '80px' : '70px',
          minWidth:
            workflow.id === 'invoice-ocr-workflow'
              ? responsiveSize === 'small'
                ? '280px'
                : '320px'
              : workflow.id === 'rednote-content-generator'
                ? responsiveSize === 'small'
                  ? '240px'
                  : '280px'
                : responsiveSize === 'small'
                  ? '220px'
                  : '260px',
          position: 'relative',
        }}
        styles={{
          body: {
            padding: responsiveSize === 'small' ? 10 : size === 'small' ? 6 : 8,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            height: 'auto',
            minHeight: responsiveSize === 'small' ? '80px' : '60px',
          },
        }}
      >
        {/* Card Header */}
        <div
          className={
            responsiveSize === 'small'
              ? 'card-header-margin-small'
              : 'card-header-margin'
          }
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: responsiveSize === 'small' ? '6px' : '8px',
            }}
          >
            <div
              style={{
                flex: 1,
                minWidth: 0,
                overflow: 'hidden',
              }}
            >
              <Space
                align='start'
                size={responsiveSize === 'small' ? 'small' : 'middle'}
              >
                {getWorkflowIcon(workflow)}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Title
                    level={responsiveSize === 'small' ? 5 : 4}
                    style={{
                      margin: 0,
                      fontSize: responsiveSize === 'small' ? 14 : 14,
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {workflow.id === 'reddit-workflow'
                      ? 'Reddit hot posts'
                      : workflow.name}
                  </Title>
                  <div
                    style={{ marginTop: responsiveSize === 'small' ? 1 : 2 }}
                  >
                    <Tag color={getWorkflowStatusTagColor(workflow.status)}>
                      {getStatusText(workflow.status)}
                    </Tag>
                  </div>
                </div>
              </Space>
            </div>

            {/* Action buttons in header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: responsiveSize === 'small' ? '4px' : '8px',
                flexShrink: 0,
                flexWrap: 'nowrap',
              }}
            >
              {workflow.id === 'invoice-ocr-workflow' && (
                <>
                  <Tooltip title='Open Google Sheets'>
                    <Button
                      size='small'
                      icon={<GoogleOutlined />}
                      onClick={e => {
                        e.stopPropagation();
                        window.open(
                          'https://docs.google.com/spreadsheets/d/1K8VGSofJUBK7yCTqtaPNQvSZ1HeGDNZOvO2UQ6SRJzg/edit?usp=sharing',
                          '_blank'
                        );
                      }}
                      style={{
                        background: '#cccccc',
                        borderColor: '#cccccc',
                        color: '#333333',
                        padding: responsiveSize === 'small' ? '0 4px' : '0 6px',
                        fontSize: responsiveSize === 'small' ? '12px' : '14px',
                        minWidth: responsiveSize === 'small' ? '24px' : 'auto',
                      }}
                    />
                  </Tooltip>
                  <Tooltip title='Open Google Drive'>
                    <Button
                      size='small'
                      icon={<CloudDownloadOutlined />}
                      onClick={e => {
                        e.stopPropagation();
                        window.open(
                          'https://drive.google.com/drive/folders/1bF1UhR6cWhaTe_JulYMlQdW_dxVVCzVp?usp=sharing',
                          '_blank'
                        );
                      }}
                      style={{
                        background: '#bbbbbb',
                        borderColor: '#bbbbbb',
                        color: '#333333',
                        padding: responsiveSize === 'small' ? '0 4px' : '0 6px',
                        fontSize: responsiveSize === 'small' ? '12px' : '14px',
                        minWidth: responsiveSize === 'small' ? '24px' : 'auto',
                      }}
                    />
                  </Tooltip>
                </>
              )}

              {/* Show start button only if showActions is not false */}
              {showActions !== false && (
                <Button
                  type='default'
                  size='small'
                  icon={
                    workflow.id === 'reddit-workflow' ? (
                      <ThunderboltOutlined />
                    ) : (
                      <PlayCircleOutlined />
                    )
                  }
                  loading={loading}
                  onClick={handleTriggerClick}
                  disabled={workflow.status !== 'active'}
                  style={{
                    minWidth: loading
                      ? responsiveSize === 'small'
                        ? '28px'
                        : '32px'
                      : 'auto',
                    padding: loading
                      ? responsiveSize === 'small'
                        ? '0 6px'
                        : '0 8px'
                      : responsiveSize === 'small'
                        ? '0 8px'
                        : '0 12px',
                    background: '#aaaaaa',
                    borderColor: '#aaaaaa',
                    color: '#333333',
                    fontSize: responsiveSize === 'small' ? '12px' : '14px',
                  }}
                >
                  {loading ? null : t('common.start')}
                </Button>
              )}

              <Button
                type='text'
                icon={<InfoCircleOutlined />}
                size={responsiveSize === 'small' ? 'small' : 'middle'}
                onClick={() => setIsHovered(true)}
                style={{ color: '#888888' }}
              />
              {onSettings && (
                <Tooltip title={t('common.settings')}>
                  <Button
                    type='text'
                    icon={<SettingOutlined />}
                    size={responsiveSize === 'small' ? 'small' : 'middle'}
                    onClick={handleSettingsClick}
                    style={{ color: '#888888' }}
                  />
                </Tooltip>
              )}
            </div>
          </div>
        </div>

        {/* Card Content - Simplified */}
        <div style={{ flex: 1, minHeight: '20px' }}></div>

        {/* Last Updated Time */}
        {lastUpdated && (
          <Text type='secondary' style={{ fontSize: 11, marginTop: '2px' }}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            Last Updated: {lastUpdated.toLocaleString('zh-CN')}
          </Text>
        )}

        {/* Error Message */}
        {error && (
          <Alert
            message={error}
            type='error'
            showIcon
            style={{ fontSize: 11 }}
          />
        )}
      </Card>
    </Popover>
  );
};

export default WorkflowCard;
