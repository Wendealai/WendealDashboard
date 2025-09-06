/**
 * Workflow Card Component
 * Provides adaptive workflow display cards
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
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
  PlayCircleOutlined,
  SettingOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  RedditOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
  GoogleOutlined,
  CloudDownloadOutlined,
} from '@ant-design/icons';
import type {
  Workflow,
  WorkflowStatus,
} from '@/pages/InformationDashboard/types';

const { Text, Title } = Typography;

/**
 * Workflow Card Component Props
 */
interface WorkflowCardProps {
  /** Workflow data */
  workflow: Workflow;
  /** Whether selected */
  selected?: boolean;
  /** Whether loading */
  loading?: boolean;
  /** Error message */
  error?: string | null;
  /** Progress status */
  progressStatus?: string;
  /** Last updated time */
  lastUpdated?: Date;
  /** Card click callback */
  onClick?: (workflow: Workflow) => void;
  /** Trigger workflow callback */
  onTrigger?: (workflow: Workflow) => void;
  /** Settings callback */
  onSettings?: (workflow: Workflow) => void;

  /** Card size */
  size?: 'small' | 'default' | 'large';
  /** Whether to show action buttons */
  showActions?: boolean;
  /** Additional CSS class */
  className?: string;
}

/**
 * Get workflow status color
 */
const getWorkflowStatusColor = (status: WorkflowStatus): string => {
  switch (status) {
    case 'active':
      return '#52c41a';
    case 'inactive':
      return '#d9d9d9';
    case 'error':
      return '#ff4d4f';
    default:
      return '#d9d9d9';
  }
};

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
const getWorkflowIcon = (workflow: Workflow) => {
  if (
    workflow.id === 'reddit-workflow' ||
    workflow.name.toLowerCase().includes('reddit')
  ) {
    return <RedditOutlined style={{ color: '#ff4500' }} />;
  }
  return <SettingOutlined style={{ color: '#1890ff' }} />;
};

/**
 * Workflow Card Component
 */
const WorkflowCard: React.FC<WorkflowCardProps> = ({
  workflow,
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
}) => {
  const { t } = useTranslation();

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

  return (
    <Card
      className={`workflow-card ${className} ${selected ? 'selected' : ''}`}
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
        minHeight: '120px', // 压缩高度
        maxHeight: '140px', // 限制最大高度
      }}
      styles={{
        body: {
          padding: size === 'small' ? 6 : 8, // 减少内边距
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative', // 为绝对定位做准备
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
            {getWorkflowIcon(workflow)}
            <div>
              <Title
                level={size === 'small' ? 5 : 4}
                style={{ margin: 0, fontSize: size === 'small' ? 12 : 14 }}
              >
                {workflow.id === 'reddit-workflow'
                  ? 'Reddit hot posts'
                  : workflow.name}
              </Title>
              <Tag
                color={getWorkflowStatusTagColor(workflow.status)}
                size={size === 'small' ? 'small' : 'default'}
                style={{ marginTop: size === 'small' ? 2 : 4 }}
              >
                {getStatusText(workflow.status)}
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
            {workflow.description || t('common.noDescription')}
          </Text>

          {/* Workflow Information */}
          <Space
            size={size === 'small' ? 8 : 12}
            wrap
            style={{ alignItems: 'center', width: '100%' }}
          >
            <Space size={4}>
              <SettingOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
              <Text
                type='secondary'
                style={{ fontSize: size === 'small' ? 10 : 11 }}
              >
                {workflow.nodeCount || 0} {t('common.nodes', 'nodes')}
              </Text>
            </Space>
            <Space size={4}>
              <ClockCircleOutlined style={{ fontSize: 12, color: '#8c8c8c' }} />
              <Text
                type='secondary'
                style={{ fontSize: size === 'small' ? 10 : 11 }}
              >
                {workflow.lastExecution
                  ? new Date(workflow.lastExecution).toLocaleString('zh-CN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })
                  : t('informationDashboard.workflowPanel.neverExecuted')}
              </Text>
            </Space>
          </Space>

          {/* 按钮右下角定位 */}
          {showActions && (
            <div
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {/* Invoice OCR特殊按钮 */}
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
                        background: '#52c41a',
                        borderColor: '#52c41a',
                        color: 'white',
                        padding: '0 6px',
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
                        background: '#1890ff',
                        borderColor: '#1890ff',
                        color: 'white',
                        padding: '0 6px',
                      }}
                    />
                  </Tooltip>
                </>
              )}

              {/* 启动按钮 */}
              <Button
                type='primary'
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
                  minWidth: loading ? '32px' : 'auto',
                  padding: loading ? '0 8px' : '0 12px',
                }}
              >
                {loading ? null : t('common.start')}
              </Button>
            </div>
          )}

          {/* Last Updated Time */}
          {lastUpdated && (
            <Text type='secondary' style={{ fontSize: 11 }}>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              Last Updated: {lastUpdated.toLocaleString('zh-CN')}
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
        </Space>
      </div>
    </Card>
  );
};

export default WorkflowCard;
