/**
 * Social Media Workflow Panel Component
 * Complete copy of Information Dashboard WorkflowPanel
 */

import React from 'react';
import { Card, Typography, Space, Empty, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { ApiOutlined, LoadingOutlined } from '@ant-design/icons';
import type { Workflow } from '../types';

const { Title, Text, Paragraph } = Typography;

/**
 * Workflow panel props
 */
interface WorkflowPanelProps {
  /** Current workflow */
  workflow?: Workflow;
  /** Loading state */
  loading?: boolean;
  /** Callback when data is received */
  onDataReceived?: (data: any[]) => void;
}

/**
 * Workflow Panel Component
 * Displays workflow details and controls
 */
const WorkflowPanel: React.FC<WorkflowPanelProps> = ({
  workflow,
  loading = false,
  onDataReceived,
}) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="workflow-panel-loading">
        <Spin size="large" />
        <div className="workflow-panel-loading-text">
          <Text>{t('common.loading')}</Text>
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Space direction="vertical">
            <Text>{t('workflow.noWorkflowSelected')}</Text>
            <Text type="secondary">
              {t('workflow.selectWorkflowToContinue')}
            </Text>
          </Space>
        }
      />
    );
  }

  return (
    <div className="workflow-panel">
      {/* Workflow header */}
      <div className="workflow-panel-header">
        <Space align="center" style={{ marginBottom: 16 }}>
          <ApiOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          <Title level={3} style={{ margin: 0 }}>
            {workflow.name}
          </Title>
        </Space>

        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          {workflow.description}
        </Paragraph>

        {/* Workflow stats */}
        <Space size="large">
          <Space>
            <Text strong>{t('workflow.status')}:</Text>
            <Text>{workflow.status}</Text>
          </Space>
          <Space>
            <Text strong>{t('workflow.nodes')}:</Text>
            <Text>{workflow.nodeCount}</Text>
          </Space>
          {workflow.lastExecution && (
            <Space>
              <Text strong>{t('workflow.lastExecution')}:</Text>
              <Text>
                {new Date(workflow.lastExecution).toLocaleString('zh-CN', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </Text>
            </Space>
          )}
        </Space>
      </div>

      {/* Workflow content area */}
      <Card
        title={t('workflow.executionDetails')}
        size="small"
        style={{ minHeight: 200 }}
      >
        <Empty
          description={
            <Space direction="vertical">
              <Text>{t('workflow.noExecutionData')}</Text>
              <Text type="secondary">
                {t('workflow.triggerToSeeResults')}
              </Text>
            </Space>
          }
        />
      </Card>
    </div>
  );
};

export default WorkflowPanel;
