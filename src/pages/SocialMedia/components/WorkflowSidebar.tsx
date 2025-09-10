/**
 * Social Media Workflow Sidebar Component
 * Complete copy of Information Dashboard WorkflowSidebar
 * Only shows Rednote Content Generator workflow
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  List,
  Button,
  Space,
  Tag,
  Tooltip,
  Typography,
  Divider,
  Alert,
  Progress,
  Empty,
  Spin,
  Row,
  Col,
} from 'antd';
import { useMessage } from '@/hooks';
import {
  PlayCircleOutlined,
  ReloadOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ThunderboltOutlined,
  RedditOutlined,
  LoadingOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchWorkflows,
  triggerWorkflow,
  selectWorkflowsList,
  selectWorkflowStats,
  selectLoading,
} from '@/store/slices/informationDashboardSlice';
import { workflowService } from '@/services/workflowService';
import type { Workflow, WorkflowStatus } from '../types';
import type { ParsedSubredditData } from '@/services/redditWebhookService';
import { redditWebhookService } from '@/services/redditWebhookService';
import {
  WorkflowSettingsButton,
  WorkflowSettingsModal,
} from '@/components/workflow';
import WorkflowCard from '@/components/workflow/WorkflowCard';

const { Text, Paragraph } = Typography;

/**
 * Workflow sidebar interface
 */
interface WorkflowSidebarProps {
  /** Callback when Reddit data is received */
  onRedditDataReceived: (data: ParsedSubredditData[]) => void;
  /** Callback when workflow is selected */
  onWorkflowSelect: (workflow: Workflow) => void;
}

/**
 * Social Media Workflow Sidebar Component
 * Manages workflow selection, control and status monitoring
 * Only displays Rednote Content Generator workflow
 */
const WorkflowSidebar: React.FC<WorkflowSidebarProps> = ({
  onRedditDataReceived,
  onWorkflowSelect,
}) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const message = useMessage();

  // Redux state
  const workflows = useAppSelector(selectWorkflowsList);
  const workflowStats = useAppSelector(selectWorkflowStats);
  const loading = useAppSelector(selectLoading);

  // Local state
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [currentSettingsWorkflow, setCurrentSettingsWorkflow] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Workflow execution states
  const [workflowLoadingStates, setWorkflowLoadingStates] = useState<Record<string, boolean>>({});
  const [workflowErrors, setWorkflowErrors] = useState<Record<string, string | null>>({});
  const [workflowProgressStates, setWorkflowProgressStates] = useState<Record<string, string>>({});
  const [lastUpdatedTimes, setLastUpdatedTimes] = useState<Record<string, string>>({});

  // Reddit specific states
  const [redditLoading, setRedditLoading] = useState(false);
  const [redditError, setRedditError] = useState<string | null>(null);
  const [redditProgressStatus, setRedditProgressStatus] = useState<string>('');

  // Settings
  const [redditWorkflowSettings, setRedditWorkflowSettings] = useState({
    name: 'Reddit hot posts',
    description: t('informationDashboard.reddit.getHotPosts'),
    subreddits: ['technology', 'programming', 'javascript', 'reactjs'],
  });

  // Filter workflows - only show Rednote Content Generator for Social Media
  const filteredWorkflows = useMemo(() => {
    return workflows.filter(w => false); // No workflows from store for Social Media
  }, [workflows]);

  const hasWorkflows = filteredWorkflows.length > 0;

  /**
   * Handle workflow selection
   */
  const handleWorkflowSelect = useCallback((workflow: Workflow) => {
    setSelectedWorkflow(workflow);
    onWorkflowSelect(workflow);
  }, [onWorkflowSelect]);

  /**
   * Handle workflow trigger
   */
  const handleWorkflowTrigger = useCallback(async (workflow: Workflow) => {
    try {
      setWorkflowLoadingStates(prev => ({ ...prev, [workflow.id]: true }));
      setWorkflowErrors(prev => ({ ...prev, [workflow.id]: null }));

      // 对于TK Viral Extract工作流，直接选择工作流而不是触发workflow
      if (workflow.id === 'tk-viral-extract') {
        handleWorkflowSelect({
          id: 'tk-viral-extract',
          name: 'TK Viral Extract',
          description: '从 TikTok 获取病毒内容并进行分析',
          status: 'active' as WorkflowStatus,
          nodeCount: 3,
          lastExecution: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        message.success('工作流已选择');
      } else {
        // 对于其他工作流，使用正常的workflow触发流程
        const result = await dispatch(triggerWorkflow({
          workflowId: workflow.id,
          inputData: {},
        })).unwrap();

        message.success(t('workflow.triggeredSuccessfully'));
      }

      setLastUpdatedTimes(prev => ({
        ...prev,
        [workflow.id]: new Date().toISOString()
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('workflow.triggerFailed');
      setWorkflowErrors(prev => ({ ...prev, [workflow.id]: errorMessage }));
      message.error(errorMessage);
    } finally {
      setWorkflowLoadingStates(prev => ({ ...prev, [workflow.id]: false }));
    }
  }, [dispatch, message, t, handleWorkflowSelect]);

  /**
   * Handle Reddit workflow start
   */
  const handleRedditWorkflowStart = useCallback(async () => {
    try {
      setRedditLoading(true);
      setRedditError(null);
      setRedditProgressStatus(t('informationDashboard.workflow.triggeringWorkflow'));

      const result = await redditWebhookService.triggerRedditWorkflow(
        redditWorkflowSettings.subreddits,
        (progress) => {
          setRedditProgressStatus(progress);
        }
      );

      if (result.success && result.data) {
        onRedditDataReceived(result.data);
        message.success(t('informationDashboard.reddit.workflowCompleted'));
      } else {
        setRedditError(result.error || t('informationDashboard.reddit.workflowFailed'));
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('informationDashboard.reddit.workflowFailed');
      setRedditError(errorMessage);
      message.error(errorMessage);
    } finally {
      setRedditLoading(false);
      setRedditProgressStatus('');
    }
  }, [redditWorkflowSettings.subreddits, onRedditDataReceived, message, t]);

  /**
   * Handle settings modal open
   */
  const handleOpenSettings = useCallback((workflowId: string, workflowName: string) => {
    setCurrentSettingsWorkflow({ id: workflowId, name: workflowName });
    setSettingsModalVisible(true);
  }, []);

  /**
   * Handle settings save
   */
  const handleSettingsSave = useCallback((settings: any) => {
    if (currentSettingsWorkflow?.id === 'reddit-workflow') {
      setRedditWorkflowSettings(prev => ({ ...prev, ...settings }));
    }
    setSettingsModalVisible(false);
    message.success(t('workflow.settingsSaved'));
  }, [currentSettingsWorkflow, message, t]);


  /**
   * Initialize component
   */
  useEffect(() => {
    dispatch(fetchWorkflows({}));
  }, [dispatch]);

  return (
    <div className='workflow-sidebar'>

      {/* Workflow cards grid */}
      <div className="workflow-sidebar-cards">
        <Row gutter={[12, 12]} style={{ padding: '12px' }}>
          {/* TK Viral Extract workflow card */}
          <Col xs={24} sm={12} md={8} lg={6} xl={6}>
            <WorkflowCard
              workflow={{
                id: 'tk-viral-extract',
                name: 'TK Viral Extract',
                description: '从 TikTok 获取病毒内容并进行分析',
                status: 'active' as WorkflowStatus,
                nodeCount: 3,
                lastExecution: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }}
              selected={selectedWorkflow?.id === 'tk-viral-extract'}
              loading={false}
              error={null}
              progressStatus=''
              onClick={() =>
                handleWorkflowSelect({
                  id: 'tk-viral-extract',
                  name: 'TK Viral Extract',
                  description: '从 TikTok 获取病毒内容并进行分析',
                  status: 'active' as WorkflowStatus,
                  nodeCount: 3,
                  lastExecution: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                })
              }
              onTrigger={() => {
                handleWorkflowSelect({
                  id: 'tk-viral-extract',
                  name: 'TK Viral Extract',
                  description: '从 TikTok 获取病毒内容并进行分析',
                  status: 'active' as WorkflowStatus,
                  nodeCount: 3,
                  lastExecution: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
              }}
              onSettings={() => {
                handleOpenSettings(
                  'tk-viral-extract',
                  'TK Viral Extract'
                );
              }}
              size='small'
              showActions={false} // Hide start button
            />
          </Col>

          {/* Rednote Content Generator workflow card */}
          <Col xs={24} sm={12} md={8} lg={6} xl={6}>
            <WorkflowCard
              workflow={{
                id: 'rednote-content-generator',
                name: 'Rednote Content Generator',
                description: 'Generate engaging content for Rednote platform',
                status: 'active' as WorkflowStatus,
                nodeCount: 2,
                lastExecution: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }}
              selected={selectedWorkflow?.id === 'rednote-content-generator'}
              loading={false}
              error={null}
              progressStatus=''
              onClick={() =>
                handleWorkflowSelect({
                  id: 'rednote-content-generator',
                  name: 'Rednote Content Generator',
                  description: 'Generate engaging content for Rednote platform',
                  status: 'active' as WorkflowStatus,
                  nodeCount: 2,
                  lastExecution: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                })
              }
              onTrigger={() => {
                handleWorkflowSelect({
                  id: 'rednote-content-generator',
                  name: 'Rednote Content Generator',
                  description: 'Generate engaging content for Rednote platform',
                  status: 'active' as WorkflowStatus,
                  nodeCount: 2,
                  lastExecution: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
              }}
              onSettings={() => {
                handleOpenSettings(
                  'rednote-content-generator',
                  'Rednote Content Generator'
                );
              }}
              size='small'
              showActions={false} // Hide start button
            />
          </Col>
        </Row>

        {/* Settings modal */}
        <WorkflowSettingsModal
          visible={settingsModalVisible}
          workflowId={currentSettingsWorkflow?.id || ''}
          workflowName={currentSettingsWorkflow?.name || ''}
          onCancel={() => setSettingsModalVisible(false)}
          onSave={handleSettingsSave}
        />
      </div>
    </div>
  );
};

export default memo(WorkflowSidebar);
