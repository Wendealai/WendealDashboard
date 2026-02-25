/**
 * Tools Workflow Sidebar Component
 * Copy of Information Dashboard WorkflowSidebar for Tools page
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Button, Space, Tooltip, Empty, Spin, Row, Col } from 'antd';
import { useMessage } from '@/hooks';
import { ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchWorkflows,
  selectWorkflowsList,
  selectLoading,
} from '@/store/slices/informationDashboardSlice';
import type { WorkflowInfo } from '@/pages/InformationDashboard/types';
import type { WorkflowSettings } from '@/types/workflow';
import { WorkflowSettingsModal } from '@/components/workflow';
import WorkflowCard from '@/components/workflow/WorkflowCard';

interface WorkflowSidebarProps {
  className?: string;
  onWorkflowSelect?: (workflow: WorkflowInfo | null) => void;
  onWorkflowTriggered?: (workflowId: string, executionId: string) => void;
}

interface BuiltinWorkflowConfig {
  id: string;
  name: string;
  description: string;
  type: WorkflowInfo['type'];
}

const buildWorkflowFromConfig = (
  config: BuiltinWorkflowConfig
): WorkflowInfo => ({
  id: config.id,
  name: config.name,
  description: config.description,
  status: 'active',
  type: config.type,
  executionCount: 0,
  successRate: 0,
  author: { id: 'system', name: 'System' },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const WorkflowSidebar: React.FC<WorkflowSidebarProps> = memo(
  ({ className, onWorkflowSelect }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const message = useMessage();
    const workflows = useAppSelector(selectWorkflowsList);
    const loading = useAppSelector(selectLoading);

    const [selectedWorkflow, setSelectedWorkflow] =
      useState<WorkflowInfo | null>(null);
    const [lastUpdatedTimes, setLastUpdatedTimes] = useState<
      Record<string, Date>
    >(() => {
      try {
        const savedTimes = localStorage.getItem('lastUpdatedTimes');
        if (!savedTimes) {
          return {};
        }
        const parsed = JSON.parse(savedTimes);
        const converted: Record<string, Date> = {};
        Object.keys(parsed).forEach(key => {
          converted[key] = new Date(parsed[key]);
        });
        return converted;
      } catch (error) {
        console.error('Failed to load Last Updated times:', error);
        return {};
      }
    });
    const [settingsModalVisible, setSettingsModalVisible] = useState(false);
    const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(
      null
    );
    const [currentWorkflowSettings, setCurrentWorkflowSettings] = useState<
      Partial<WorkflowSettings> | undefined
    >(undefined);

    useEffect(() => {
      dispatch(fetchWorkflows({}));
    }, [dispatch]);

    useEffect(() => {
      try {
        localStorage.setItem(
          'lastUpdatedTimes',
          JSON.stringify(lastUpdatedTimes)
        );
      } catch (error) {
        console.error('Failed to save Last Updated times:', error);
      }
    }, [lastUpdatedTimes]);

    const handleWorkflowSelect = useCallback(
      (workflow: WorkflowInfo) => {
        setSelectedWorkflow(workflow);
        onWorkflowSelect?.(workflow);
      },
      [onWorkflowSelect]
    );

    const handleRefresh = useCallback(() => {
      dispatch(fetchWorkflows({}));
    }, [dispatch]);

    const loadWorkflowSettings = useCallback(
      async (workflowId: string, workflowName?: string) => {
        try {
          const { workflowSettingsService } = await import(
            '@/services/workflowSettingsService'
          );
          const response =
            await workflowSettingsService.getSettings(workflowId);

          if (response.success && response.data) {
            setCurrentWorkflowSettings(response.data);
            return;
          }

          setCurrentWorkflowSettings({
            name: workflowName || 'Workflow',
            enabled: true,
          });
        } catch (error) {
          console.error('Failed to load workflow settings:', error);
        }
      },
      []
    );

    const handleOpenSettings = useCallback(
      (workflowId: string, workflowName?: string) => {
        setCurrentWorkflowId(workflowId);
        setSettingsModalVisible(true);
        void loadWorkflowSettings(workflowId, workflowName);
      },
      [loadWorkflowSettings]
    );

    const handleCloseSettings = useCallback(() => {
      setSettingsModalVisible(false);
    }, []);

    const handleSaveSettings = useCallback(
      async (settings: WorkflowSettings) => {
        if (!currentWorkflowId) {
          message.error('No workflow selected');
          return;
        }

        try {
          const { workflowSettingsService } = await import(
            '@/services/workflowSettingsService'
          );
          const response = await workflowSettingsService.saveSettings(
            currentWorkflowId,
            settings
          );

          if (response.success && response.data) {
            message.success(t('informationDashboard.workflow.settingsSaved'));
          } else {
            message.error(response.error || 'Failed to save settings');
          }
        } catch (error) {
          console.error('Failed to save workflow settings:', error);
          message.error('Error occurred while saving settings');
        }

        setSettingsModalVisible(false);
        setCurrentWorkflowId(null);
        setCurrentWorkflowSettings(undefined);
      },
      [currentWorkflowId, message, t]
    );

    const builtinWorkflows = useMemo<WorkflowInfo[]>(() => {
      const configs: BuiltinWorkflowConfig[] = [
        {
          id: 'invoice-ocr-workflow',
          name: t('invoiceOCR.title'),
          description: t('invoiceOCR.subtitle'),
          type: 'invoice-ocr',
        },
        {
          id: 'universal-ocr-workflow',
          name: 'Universal OCR',
          description:
            'OCR processing for all document formats including PDF, images, and scanned documents',
          type: 'invoice-ocr',
        },
        {
          id: 'tax-invoice-receipt-workflow',
          name: 'Tax Invoice/Receipt',
          description: 'Generate and manage tax invoices and receipts',
          type: 'invoice-ocr',
        },
        {
          id: 'invoice-ingestion-assistant-workflow',
          name: 'Invoice Ingestion Assistant',
          description:
            'Capture receipts, OCR extract, review, and one-click sync to Xero',
          type: 'invoice-ocr',
        },
        {
          id: 'tools-workflow',
          name: t('tools.workflow.title'),
          description: t('tools.workflow.subtitle'),
          type: 'tools-workflow',
        },
        {
          id: 'invoice-shelf-workflow',
          name: 'InvoiceShelf',
          description: 'Invoice management and processing system',
          type: 'invoice-shelf',
        },
      ];
      return configs.map(buildWorkflowFromConfig);
    }, [t]);

    const filteredWorkflows = useMemo(() => {
      return workflows
        .filter(workflow => workflow.id !== 'invoice-ocr-workflow')
        .filter(workflow => workflow.name !== 'Data Sync Workflow');
    }, [workflows]);

    const hasWorkflows = workflows.length > 0;

    return (
      <div
        className={`workflow-sidebar ${className} compact-layout`}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        <Card
          size='small'
          title={
            <Space>
              <SettingOutlined />
              <span style={{ fontSize: '16px' }}>
                {t('informationDashboard.workflowPanel.workflowList')}
              </span>
            </Space>
          }
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
          styles={{ body: { flex: 1, padding: 0, position: 'relative' } }}
        >
          <Spin spinning={loading}>
            <Row gutter={[12, 12]} style={{ padding: '12px' }}>
              {builtinWorkflows.map(workflow => (
                <Col key={workflow.id} xs={24} sm={24} md={12} lg={8} xl={6}>
                  <WorkflowCard
                    workflow={workflow}
                    selected={selectedWorkflow?.id === workflow.id}
                    loading={false}
                    error={null}
                    onClick={() => handleWorkflowSelect(workflow)}
                    onTrigger={() => handleWorkflowSelect(workflow)}
                    onSettings={() =>
                      handleOpenSettings(workflow.id, workflow.name)
                    }
                    size='small'
                    showActions={false}
                  />
                </Col>
              ))}

              {filteredWorkflows.map(workflow => (
                <Col key={workflow.id} xs={24} sm={24} md={12} lg={8} xl={6}>
                  <WorkflowCard
                    workflow={workflow}
                    selected={selectedWorkflow?.id === workflow.id}
                    loading={false}
                    error={null}
                    lastUpdated={lastUpdatedTimes[workflow.id]}
                    onClick={() => handleWorkflowSelect(workflow)}
                    onTrigger={() => handleWorkflowSelect(workflow)}
                    onSettings={() =>
                      handleOpenSettings(workflow.id, workflow.name)
                    }
                    size='small'
                    showActions={false}
                  />
                </Col>
              ))}

              {!hasWorkflows && (
                <Col span={24}>
                  <div style={{ padding: 16, textAlign: 'center' }}>
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={t(
                        'informationDashboard.workflowPanel.noWorkflows'
                      )}
                      style={{ margin: 0 }}
                    />
                  </div>
                </Col>
              )}
            </Row>
          </Spin>

          <div
            style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              zIndex: 10,
            }}
          >
            <Space size='middle'>
              <Tooltip title={t('informationDashboard.actions.refresh')}>
                <Button
                  type='text'
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                  loading={loading}
                  size='small'
                  style={{
                    background: '#dddddd',
                    border: '1px solid #bbbbbb',
                    borderRadius: '6px',
                    color: '#666666',
                  }}
                />
              </Tooltip>
            </Space>
          </div>
        </Card>

        <WorkflowSettingsModal
          visible={settingsModalVisible}
          onClose={handleCloseSettings}
          onSave={handleSaveSettings}
          initialSettings={currentWorkflowSettings ?? {}}
          workflowId={currentWorkflowId}
        />
      </div>
    );
  }
);

export default WorkflowSidebar;
WorkflowSidebar.displayName = 'WorkflowSidebar';
