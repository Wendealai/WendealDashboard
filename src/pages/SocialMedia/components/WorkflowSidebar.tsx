/**
 * Social Media Workflow Sidebar Component
 * Complete copy of Information Dashboard WorkflowSidebar
 * Only shows Rednote Content Generator workflow
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Row, Col } from 'antd';
import { useMessage } from '@/hooks';
import type { Workflow, WorkflowStatus } from '../types';
import type { ParsedSubredditData } from '@/services/redditWebhookService';
import { redditWebhookService } from '@/services/redditWebhookService';
import {
  WorkflowSettingsButton,
  WorkflowSettingsModal,
} from '@/components/workflow';
import WorkflowCard from '@/components/workflow/WorkflowCard';
import VideoGenerationWorkflowCard from './VideoGenerationWorkflowCard';

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
  const message = useMessage();

  // Local state
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
    null
  );
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [currentSettingsWorkflow, setCurrentSettingsWorkflow] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // No workflow execution states needed for hardcoded workflows

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

  // No workflows from store for Social Media - only hardcoded ones
  const hasWorkflows = false;

  /**
   * Handle workflow selection
   */
  const handleWorkflowSelect = useCallback(
    (workflow: Workflow) => {
      setSelectedWorkflow(workflow);
      onWorkflowSelect(workflow);
    },
    [onWorkflowSelect]
  );

  /**
   * Handle Reddit workflow start
   */
  const handleRedditWorkflowStart = useCallback(async () => {
    try {
      setRedditLoading(true);
      setRedditError(null);
      setRedditProgressStatus(
        t('informationDashboard.workflow.triggeringWorkflow')
      );

      const result = await redditWebhookService.triggerRedditWorkflow(
        redditWorkflowSettings.subreddits,
        progress => {
          setRedditProgressStatus(progress);
        }
      );

      if (result.success && result.data) {
        onRedditDataReceived(result.data);
        message.success(t('informationDashboard.reddit.workflowCompleted'));
      } else {
        setRedditError(
          result.error || t('informationDashboard.reddit.workflowFailed')
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : t('informationDashboard.reddit.workflowFailed');
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
  const handleOpenSettings = useCallback(
    (workflowId: string, workflowName: string) => {
      setCurrentSettingsWorkflow({ id: workflowId, name: workflowName });
      setSettingsModalVisible(true);
    },
    []
  );

  /**
   * Handle settings save
   */
  const handleSettingsSave = useCallback(
    (settings: any) => {
      if (currentSettingsWorkflow?.id === 'reddit-workflow') {
        setRedditWorkflowSettings(prev => ({ ...prev, ...settings }));
      }
      setSettingsModalVisible(false);
      message.success(t('workflow.settingsSaved'));
    },
    [currentSettingsWorkflow, message, t]
  );

  return (
    <div className='workflow-sidebar'>
      {/* Workflow cards grid */}
      <div className='workflow-sidebar-cards'>
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
                type: 'manual' as const,
                executionCount: 0,
                successRate: 0,
                author: { id: 'system', name: 'System' },
              }}
              selected={selectedWorkflow?.id === 'tk-viral-extract'}
              loading={false}
              error={null}
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
                handleOpenSettings('tk-viral-extract', 'TK Viral Extract');
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
                type: 'manual' as const,
                executionCount: 0,
                successRate: 0,
                author: { id: 'system', name: 'System' },
              }}
              selected={selectedWorkflow?.id === 'rednote-content-generator'}
              loading={false}
              error={null}
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

          {/* Rednote Img Generator workflow card */}
          <Col xs={24} sm={12} md={8} lg={6} xl={6}>
            <WorkflowCard
              workflow={{
                id: 'rednote-img-generator',
                name: 'Rednote Img Generator',
                description: '输入文案生成小红书图片HTML',
                status: 'active' as WorkflowStatus,
                nodeCount: 2,
                lastExecution: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                type: 'manual' as const,
                executionCount: 0,
                successRate: 0,
                author: { id: 'system', name: 'System' },
              }}
              selected={selectedWorkflow?.id === 'rednote-img-generator'}
              loading={false}
              error={null}
              onClick={() =>
                handleWorkflowSelect({
                  id: 'rednote-img-generator',
                  name: 'Rednote Img Generator',
                  description: '输入文案生成小红书图片HTML',
                  status: 'active' as WorkflowStatus,
                  nodeCount: 2,
                  lastExecution: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                })
              }
              onTrigger={() => {
                handleWorkflowSelect({
                  id: 'rednote-img-generator',
                  name: 'Rednote Img Generator',
                  description: '输入文案生成小红书图片HTML',
                  status: 'active' as WorkflowStatus,
                  nodeCount: 2,
                  lastExecution: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
              }}
              onSettings={() => {
                handleOpenSettings(
                  'rednote-img-generator',
                  'Rednote Img Generator'
                );
              }}
              size='small'
              showActions={false} // Hide start button
            />
          </Col>

          {/* Image Generation workflow card */}
          <Col xs={24} sm={12} md={8} lg={6} xl={6}>
            <WorkflowCard
              workflow={{
                id: 'image-generation',
                name: 'Image Generation',
                description:
                  'Generate images from text prompts or edit existing images',
                status: 'active' as WorkflowStatus,
                nodeCount: 2,
                lastExecution: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                type: 'manual' as const,
                executionCount: 0,
                successRate: 0,
                author: { id: 'system', name: 'System' },
              }}
              selected={selectedWorkflow?.id === 'image-generation'}
              loading={false}
              error={null}
              onClick={() =>
                handleWorkflowSelect({
                  id: 'image-generation',
                  name: 'Image Generation',
                  description:
                    'Generate images from text prompts or edit existing images',
                  status: 'active' as WorkflowStatus,
                  nodeCount: 2,
                  lastExecution: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                })
              }
              onTrigger={() => {
                handleWorkflowSelect({
                  id: 'image-generation',
                  name: 'Image Generation',
                  description:
                    'Generate images from text prompts or edit existing images',
                  status: 'active' as WorkflowStatus,
                  nodeCount: 2,
                  lastExecution: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
              }}
              onSettings={() => {
                handleOpenSettings('image-generation', 'Image Generation');
              }}
              size='small'
              showActions={false} // Hide start button
            />
          </Col>

          {/* International Social Media Generator workflow card */}
          <Col xs={24} sm={12} md={8} lg={6} xl={6}>
            <WorkflowCard
              workflow={{
                id: 'international-social-media-generator',
                name: 'International Social Media Generator',
                description:
                  'Generate content for Twitter, LinkedIn, Instagram, and Facebook',
                status: 'active' as WorkflowStatus,
                nodeCount: 4,
                lastExecution: new Date().toISOString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                type: 'manual' as const,
                executionCount: 0,
                successRate: 0,
                author: { id: 'system', name: 'System' },
              }}
              selected={
                selectedWorkflow?.id === 'international-social-media-generator'
              }
              loading={false}
              error={null}
              onClick={() =>
                handleWorkflowSelect({
                  id: 'international-social-media-generator',
                  name: 'International Social Media Generator',
                  description:
                    'Generate content for Twitter, LinkedIn, Instagram, and Facebook',
                  status: 'active' as WorkflowStatus,
                  nodeCount: 4,
                  lastExecution: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                })
              }
              onTrigger={() => {
                handleWorkflowSelect({
                  id: 'international-social-media-generator',
                  name: 'International Social Media Generator',
                  description:
                    'Generate content for Twitter, LinkedIn, Instagram, and Facebook',
                  status: 'active' as WorkflowStatus,
                  nodeCount: 4,
                  lastExecution: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
              }}
              onSettings={() => {
                handleOpenSettings(
                  'international-social-media-generator',
                  'International Social Media Generator'
                );
              }}
              size='small'
              showActions={false} // Hide start button
            />
          </Col>

          {/* Video Generation workflow card */}
          <Col xs={24} sm={12} md={8} lg={6} xl={6}>
            <VideoGenerationWorkflowCard
              selected={selectedWorkflow?.id === 'video-generation'}
              loading={false}
              size='small'
              onClick={() =>
                handleWorkflowSelect({
                  id: 'video-generation',
                  name: 'Video Generation',
                  description:
                    'Generate videos from text descriptions and reference images',
                  status: 'active' as WorkflowStatus,
                  nodeCount: 3,
                  lastExecution: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                })
              }
              onTrigger={() => {
                handleWorkflowSelect({
                  id: 'video-generation',
                  name: 'Video Generation',
                  description:
                    'Generate videos from text descriptions and reference images',
                  status: 'active' as WorkflowStatus,
                  nodeCount: 3,
                  lastExecution: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
              }}
              onSettings={() => {
                handleOpenSettings('video-generation', 'Video Generation');
              }}
            />
          </Col>
        </Row>

        {/* Settings modal */}
        <WorkflowSettingsModal
          visible={settingsModalVisible}
          workflowId={currentSettingsWorkflow?.id || ''}
          onClose={() => setSettingsModalVisible(false)}
          onSave={handleSettingsSave}
        />
      </div>
    </div>
  );
};

export default memo(WorkflowSidebar);
