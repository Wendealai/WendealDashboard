/**
 * Tools Workflow Sidebar Component
 * Copy of Information Dashboard WorkflowSidebar for Tools page
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  Button,
  Space,
  Tooltip,
  Typography,
  Empty,
  Spin,
  Row,
  Col,
} from 'antd';
import { useMessage } from '@/hooks';
import { ReloadOutlined, SettingOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchWorkflows,
  triggerWorkflow,
  selectWorkflowsList,
  selectLoading,
} from '@/store/slices/informationDashboardSlice';
import type { Workflow } from '../types';
import { WorkflowSettingsModal } from '@/components/workflow';
import WorkflowCard from '@/components/workflow/WorkflowCard';

/**
 * Tools Workflow Sidebar Component Props Interface
 */
interface WorkflowSidebarProps {
  className?: string;
  onWorkflowSelect?: (workflow: Workflow | null) => void;
  onWorkflowTriggered?: (workflowId: string, executionId: string) => void;
}

/**
 * Get workflow status color
 */

/**
 * Tools Workflow Sidebar Component
 */
const WorkflowSidebar: React.FC<WorkflowSidebarProps> = memo(
  ({ className, onWorkflowSelect, onWorkflowTriggered }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const message = useMessage();
    const workflows = useAppSelector(selectWorkflowsList);
    const loading = useAppSelector(selectLoading);

    // Component state
    const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
      null
    );

    const [lastUpdatedTimes, setLastUpdatedTimes] = useState<
      Record<string, Date>
    >(() => {
      // Load Last Updated times from localStorage
      try {
        const savedTimes = localStorage.getItem('lastUpdatedTimes');
        if (savedTimes) {
          const parsed = JSON.parse(savedTimes);
          // Convert strings back to Date objects
          const converted: Record<string, Date> = {};
          Object.keys(parsed).forEach(key => {
            converted[key] = new Date(parsed[key]);
          });
          return converted;
        }
        return {};
      } catch (error) {
        console.error('Failed to load Last Updated times:', error);
        return {};
      }
    });
    const [settingsModalVisible, setSettingsModalVisible] = useState(false);
    const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(
      null
    );
    const [currentWorkflowSettings, setCurrentWorkflowSettings] =
      useState<any>(null);

    /**
     * Initialize and load workflow list
     */
    useEffect(() => {
      dispatch(fetchWorkflows({}));
    }, [dispatch]);

    /**
     * Persist Last Updated times to localStorage
     */
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

    /**
     * Handle workflow selection
     */
    const handleWorkflowSelect = useCallback(
      (workflow: Workflow) => {
        setSelectedWorkflow(workflow);
        onWorkflowSelect?.(workflow);
      },
      [onWorkflowSelect]
    );

    /**
     * Handle workflow trigger
     */
    const handleTriggerWorkflow = useCallback(
      async (workflow: Workflow) => {
        try {
          const result = await dispatch(
            triggerWorkflow({
              workflowId: workflow.id,
            })
          ).unwrap();

          // Update Last Updated time
          setLastUpdatedTimes(prev => ({
            ...prev,
            [workflow.id]: new Date(),
          }));

          onWorkflowTriggered?.(workflow.id, result.executionId);
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const detailedError = `工作流执行失败：\n工作流：${workflow.name}\n文件：WorkflowSidebar.tsx\n错误详情：${errorMessage}`;
          console.error('Failed to trigger workflow:', detailedError);
        }
      },
      [dispatch, onWorkflowTriggered]
    );

    /**
     * Refresh workflow list
     */
    const handleRefresh = useCallback(() => {
      dispatch(fetchWorkflows({}));
    }, [dispatch]);

    /**
     * Open settings modal for a specific workflow
     */
    const handleOpenSettings = useCallback(
      (workflowId: string, workflowName?: string) => {
        setCurrentWorkflowId(workflowId);
        setSettingsModalVisible(true);
        // Load settings for this specific workflow
        loadWorkflowSettings(workflowId, workflowName);
      },
      []
    );

    // Load workflow settings function
    const loadWorkflowSettings = useCallback(
      async (workflowId: string, workflowName?: string) => {
        try {
          const { workflowSettingsService } = await import(
            '@/services/workflowSettingsService'
          );
          const response =
            await workflowSettingsService.getSettings(workflowId);

          let settings;
          if (response.success && response.data) {
            settings = response.data;
          } else {
            // Default settings for different workflows
            settings = {
              name: workflowName || 'Workflow',
              enabled: true,
            };
          }

          setCurrentWorkflowSettings(settings);
        } catch (error) {
          console.error('Failed to load workflow settings:', error);
        }
      },
      [t]
    );

    // Use useMemo to optimize computed values
    const filteredWorkflows = useMemo(() => {
      return workflows.filter(
        workflow => workflow.id !== 'invoice-ocr-workflow'
      );
    }, [workflows]);

    const hasWorkflows = useMemo(() => {
      return workflows.length > 0;
    }, [workflows.length]);

    /**
     * Close settings modal
     */
    const handleCloseSettings = useCallback(() => {
      setSettingsModalVisible(false);
    }, []);

    /**
     * Save settings
     */
    const handleSaveSettings = useCallback(
      async (settings: any) => {
        console.log('Save workflow settings:', settings);

        if (!currentWorkflowId) {
          message.error('No workflow selected');
          return;
        }

        try {
          // Save to workflowSettingsService
          const { workflowSettingsService } = await import(
            '@/services/workflowSettingsService'
          );
          const response = await workflowSettingsService.saveSettings(
            currentWorkflowId,
            settings
          );

          if (response.success && response.data) {
            // Show save success message
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
        setCurrentWorkflowSettings(null);
      },
      [currentWorkflowId, message, t]
    );

    return (
      <div
        className={`workflow-sidebar ${className} compact-layout`}
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        {/* Workflow list */}
        <Card
          size='small'
          title={
            <Space>
              <SettingOutlined />
              <span>
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
              {/* Invoice OCR workflow card */}
              <Col xs={24} sm={24} md={12} lg={8} xl={6}>
                <WorkflowCard
                  workflow={{
                    id: 'invoice-ocr-workflow',
                    name: t('invoiceOCR.title'),
                    description: t('invoiceOCR.subtitle'),
                    status: 'active' as const,
                    type: 'data-processing' as any,
                    executionCount: 0,
                    successRate: 0,
                    author: { id: 'system', name: 'System' },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }}
                  selected={selectedWorkflow?.id === 'invoice-ocr-workflow'}
                  loading={false}
                  error={null}
                  onClick={() =>
                    handleWorkflowSelect({
                      id: 'invoice-ocr-workflow',
                      name: t('invoiceOCR.title'),
                      description: t('invoiceOCR.subtitle'),
                      status: 'active' as const,
                      type: 'data-processing' as any,
                      executionCount: 0,
                      successRate: 0,
                      author: { id: 'system', name: 'System' },
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  onTrigger={() => {
                    // Select Invoice OCR workflow, display on the right side
                    handleWorkflowSelect({
                      id: 'invoice-ocr-workflow',
                      name: t('invoiceOCR.title'),
                      description: t('invoiceOCR.subtitle'),
                      status: 'active' as const,
                      type: 'data-processing' as any,
                      executionCount: 0,
                      successRate: 0,
                      author: { id: 'system', name: 'System' },
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    });
                  }}
                  onSettings={() => {
                    // Open settings modal
                    handleOpenSettings(
                      'invoice-ocr-workflow',
                      t('invoiceOCR.title')
                    );
                  }}
                  size='small'
                  showActions={false} // Hide start button
                />
              </Col>

              {/* Universal OCR workflow card */}
              <Col xs={24} sm={24} md={12} lg={8} xl={6}>
                <WorkflowCard
                  workflow={{
                    id: 'universal-ocr-workflow',
                    name: 'Universal OCR',
                    description:
                      'OCR processing for all document formats including PDF, images, and scanned documents',
                    status: 'active' as const,
                    type: 'data-processing' as any,
                    executionCount: 0,
                    successRate: 0,
                    author: { id: 'system', name: 'System' },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }}
                  selected={selectedWorkflow?.id === 'universal-ocr-workflow'}
                  loading={false}
                  error={null}
                  onClick={() =>
                    handleWorkflowSelect({
                      id: 'universal-ocr-workflow',
                      name: 'Universal OCR',
                      description:
                        'OCR processing for all document formats including PDF, images, and scanned documents',
                      status: 'active' as const,
                      type: 'data-processing' as any,
                      executionCount: 0,
                      successRate: 0,
                      author: { id: 'system', name: 'System' },
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  onTrigger={() => {
                    // Select Universal OCR workflow, display on the right side
                    handleWorkflowSelect({
                      id: 'universal-ocr-workflow',
                      name: 'Universal OCR',
                      description:
                        'OCR processing for all document formats including PDF, images, and scanned documents',
                      status: 'active' as const,
                      type: 'data-processing' as any,
                      executionCount: 0,
                      successRate: 0,
                      author: { id: 'system', name: 'System' },
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    });
                  }}
                  onSettings={() => {
                    // Open settings modal
                    handleOpenSettings(
                      'universal-ocr-workflow',
                      'Universal OCR'
                    );
                  }}
                  size='small'
                  showActions={false} // Hide start button
                />
              </Col>

              {/* Tax Invoice/Receipt workflow card */}
              <Col xs={24} sm={24} md={12} lg={8} xl={6}>
                <WorkflowCard
                  workflow={{
                    id: 'tax-invoice-receipt-workflow',
                    name: 'Tax Invoice/Receipt',
                    description:
                      'Generate and manage tax invoices and receipts',
                    status: 'active' as const,
                    type: 'data-processing' as any,
                    executionCount: 0,
                    successRate: 0,
                    author: { id: 'system', name: 'System' },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }}
                  selected={
                    selectedWorkflow?.id === 'tax-invoice-receipt-workflow'
                  }
                  loading={false}
                  error={null}
                  onClick={() =>
                    handleWorkflowSelect({
                      id: 'tax-invoice-receipt-workflow',
                      name: 'Tax Invoice/Receipt',
                      description:
                        'Generate and manage tax invoices and receipts',
                      status: 'active' as const,
                      type: 'data-processing' as any,
                      executionCount: 0,
                      successRate: 0,
                      author: { id: 'system', name: 'System' },
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    })
                  }
                  onTrigger={() => {
                    // Select Tax Invoice/Receipt workflow, display on the right side
                    handleWorkflowSelect({
                      id: 'tax-invoice-receipt-workflow',
                      name: 'Tax Invoice/Receipt',
                      description:
                        'Generate and manage tax invoices and receipts',
                      status: 'active' as const,
                      type: 'data-processing' as any,
                      executionCount: 0,
                      successRate: 0,
                      author: { id: 'system', name: 'System' },
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    });
                  }}
                  onSettings={() => {
                    // Open settings modal
                    handleOpenSettings(
                      'tax-invoice-receipt-workflow',
                      'Tax Invoice/Receipt'
                    );
                  }}
                  size='small'
                  showActions={false} // Hide start button
                />
              </Col>

              {/* Other workflow cards */}
              {filteredWorkflows
                .filter(w => w.name !== 'Data Sync Workflow')
                .map(workflow => (
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
                      showActions={false} // Hide start button for all workflows
                    />
                  </Col>
                ))}

              {/* If no workflows, show empty state */}
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

          {/* Action buttons positioned at bottom right */}
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

        {/* Workflow settings modal */}
        <WorkflowSettingsModal
          visible={settingsModalVisible}
          onClose={handleCloseSettings}
          onSave={handleSaveSettings}
          initialSettings={currentWorkflowSettings}
          workflowId={currentWorkflowId}
        />
      </div>
    );
  }
);

export default WorkflowSidebar;

// Display name for debugging
WorkflowSidebar.displayName = 'WorkflowSidebar';
