/**
 * Workflow management panel component
 * Provides workflow display, management and operation functionality
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Form, Input, Tag } from 'antd';
import { useMessage } from '@/hooks';
import { useErrorModal } from '@/hooks/useErrorModal';
import ErrorModal from '@/components/common/ErrorModal';
import { useAppDispatch } from '@/store/hooks';
import {
  fetchWorkflows,
  triggerWorkflow,
  fetchWorkflowExecutions,
} from '@/store/slices/informationDashboardSlice';
import type {
  Workflow,
  WorkflowTriggerRequest,
  WorkflowStatus,
} from '../types';
import type {
  ParsedSubredditData,
  RedditWorkflowResponse,
} from '@/services/redditWebhookService';

/**
 * 工作流面板组件属性
 */
interface WorkflowPanelProps {
  className?: string;
  onWorkflowSelect?: (workflow: Workflow) => void;
  onWorkflowTriggered?: (workflowId: string, executionId: string) => void;
}

/**
 * 工作流状态颜色映射
 */
const getWorkflowStatusColor = (status: WorkflowStatus): string => {
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
 * 工作流管理面板组件
 */
const WorkflowPanel: React.FC<WorkflowPanelProps> = memo(
  ({ className, onWorkflowTriggered }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const message = useMessage();
    const { isVisible, errorInfo, showError, hideError } = useErrorModal();

    // Component state
    const [triggerModalVisible, setTriggerModalVisible] = useState(false);
    const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
      null
    );
    const [triggerForm] = Form.useForm();

    /**
     * Initialize data loading
     */
    useEffect(() => {
      dispatch(fetchWorkflows({}));
      dispatch(fetchWorkflowExecutions());
    }, [dispatch]);

    /**
     * Confirm workflow trigger
     */
    const handleConfirmTrigger = useCallback(async () => {
      if (!selectedWorkflow) return;

      try {
        const values = await triggerForm.validateFields();
        const triggerData: WorkflowTriggerRequest = {
          workflowId: selectedWorkflow.id,
          data: values.data ? JSON.parse(values.data) : undefined,
          waitTill: values.waitTill || false,
        };

        const result = await dispatch(triggerWorkflow(triggerData)).unwrap();

        message.success(t('informationDashboard.messages.workflowTriggered'));
        setTriggerModalVisible(false);

        // Refresh execution list
        dispatch(fetchWorkflowExecutions());

        // Notify parent component
        if (onWorkflowTriggered) {
          onWorkflowTriggered(selectedWorkflow.id, result.executionId);
        }
      } catch (error) {
        showError({
          title: t('informationDashboard.messages.operationFailed'),
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }, [selectedWorkflow, triggerForm, dispatch, t, onWorkflowTriggered]);

    /**
     * Workflow table column definition
     */
    // Workflow list now uses WorkflowGrid component, no longer needs Table columns definition

    return (
      <div className={className}>
        {/* Removed Reddit data display and workflow list cards */}

        {/* Trigger workflow modal */}
        <Modal
          title={
            t('informationDashboard.workflowPanel.triggerWorkflow') +
            ': ' +
            (selectedWorkflow?.name || '')
          }
          open={triggerModalVisible}
          onOk={handleConfirmTrigger}
          onCancel={() => setTriggerModalVisible(false)}
          okText={t('informationDashboard.actions.trigger')}
          cancelText={t('common.cancel')}
          width={600}
        >
          {selectedWorkflow && (
            <Form form={triggerForm} layout='vertical'>
              <div
                style={{
                  marginBottom: 16,
                  padding: 12,
                  background: '#f5f5f5',
                  borderRadius: 4,
                }}
              >
                <p>
                  <strong>
                    {t('informationDashboard.workflowPanel.workflowName')}:
                  </strong>{' '}
                  {selectedWorkflow.name}
                </p>
                <p>
                  <strong>
                    {t(
                      'informationDashboard.workflowPanel.workflowDescription'
                    )}
                    :
                  </strong>{' '}
                  {selectedWorkflow.description || t('common.noDescription')}
                </p>
                <p>
                  <strong>
                    {t('informationDashboard.workflowPanel.workflowStatus')}:
                  </strong>
                  <Tag
                    color={getWorkflowStatusColor(selectedWorkflow.status)}
                    style={{ marginLeft: 8 }}
                  >
                    {selectedWorkflow.status === 'active'
                      ? t('informationDashboard.workflowPanel.status.active')
                      : selectedWorkflow.status === 'inactive'
                        ? t(
                            'informationDashboard.workflowPanel.status.inactive'
                          )
                        : t('informationDashboard.workflowPanel.status.error')}
                  </Tag>
                </p>
              </div>

              <Form.Item
                label={t('informationDashboard.workflowPanel.inputData')}
                name='data'
                help={t('informationDashboard.workflowPanel.inputDataHelp')}
              >
                <Input.TextArea
                  rows={4}
                  placeholder='{"name": "test", "value": 123}'
                />
              </Form.Item>

              <Form.Item
                label={t(
                  'informationDashboard.workflowPanel.waitForCompletion'
                )}
                name='waitTill'
                help={t(
                  'informationDashboard.workflowPanel.waitForCompletionHelp'
                )}
              >
                <Input.Group compact>
                  <Input
                    style={{ width: '50%' }}
                    placeholder={t(
                      'informationDashboard.workflowPanel.asyncExecution'
                    )}
                    disabled
                  />
                </Input.Group>
              </Form.Item>
            </Form>
          )}
        </Modal>
        <ErrorModal
          visible={isVisible}
          message={errorInfo?.message || 'An error occurred'}
          details={errorInfo?.details}
          onClose={hideError}
        />
      </div>
    );
  }
);

// Set component display name
WorkflowPanel.displayName = 'WorkflowPanel';

export default WorkflowPanel;
