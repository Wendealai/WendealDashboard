/**
 * Video Generation Workflow Card Component
 *
 * A specialized workflow card component for Video Generation functionality.
 * Extends the base WorkflowCard component with Video Generation specific features,
 * icons, and interactions.
 *
 * This component provides a visual representation of the Video Generation workflow
 * in the Social Media dashboard, allowing users to quickly access and trigger
 * video generation operations.
 *
 * Features:
 * - Video generation specific icons and branding
 * - Text-to-video and image-to-video mode indicators
 * - Quick access to generation settings
 * - Integration with workflow management system
 * - Responsive design for different screen sizes
 *
 * @component
 * @example
 * ```tsx
 * <VideoGenerationWorkflowCard
 *   selected={true}
 *   loading={false}
 *   onClick={() => navigateToVideoGeneration()}
 *   onTrigger={() => startVideoGenerationWorkflow()}
 *   onSettings={() => openSettings()}
 * />
 * ```
 *
 * @see {@link WorkflowCard} - Base workflow card component
 * @see {@link VideoGenerationPanel} - Main video generation page component
 * @see {@link VideoGenerationWorkflow} - Video generation workflow data structure
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Space } from 'antd';
import { VideoCameraOutlined, SettingOutlined } from '@ant-design/icons';
import WorkflowCard from '@/components/workflow/WorkflowCard';
import type { WorkflowStatus } from '../types';
import type { WorkflowInfo } from '@/pages/InformationDashboard/types';

/**
 * Video Generation Card Component Props
 */
interface VideoGenerationWorkflowCardProps {
  /** Whether the card is selected */
  selected?: boolean;
  /** Whether the card is loading */
  loading?: boolean;
  /** Error message */
  error?: string | null;
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
}

/**
 * Video Generation Workflow Card Component
 */
const VideoGenerationWorkflowCard: React.FC<
  VideoGenerationWorkflowCardProps
> = ({
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
   * Create workflow info for the base WorkflowCard
   */
  const workflowInfo: WorkflowInfo = {
    id: 'video-generation-workflow',
    name: 'Video Generation',
    description:
      'Generate videos from text descriptions and reference images using AI',
    status: 'active' as WorkflowStatus,
    type: 'manual',
    executionCount: 0,
    successRate: 0,
    author: { id: 'system', name: 'System' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastExecutedAt: new Date().toISOString(),
    nodeCount: 3,
  };

  /**
   * Handle card click
   */
  const handleCardClick = () => {
    onClick?.();
  };

  /**
   * Handle trigger button click
   */
  const handleTriggerClick = () => {
    onTrigger?.();
  };

  /**
   * Handle settings button click
   */
  const handleSettingsClick = () => {
    onSettings?.();
  };

  /**
   * Custom icon for video generation workflow
   */
  const getVideoGenerationIcon = () => {
    return (
      <div style={{ position: 'relative' }}>
        <VideoCameraOutlined style={{ color: '#1890ff', fontSize: 16 }} />
        <div
          style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#52c41a',
            border: '1px solid white',
          }}
        />
      </div>
    );
  };

  /**
   * Custom workflow icon override
   */
  const customWorkflowIcon = getVideoGenerationIcon();

  return (
    <div style={{ position: 'relative' }}>
      <WorkflowCard
        workflow={workflowInfo}
        selected={selected}
        loading={loading}
        error={error || null}
        lastUpdated={lastUpdated}
        onClick={handleCardClick}
        onTrigger={handleTriggerClick}
        onSettings={onSettings ? handleSettingsClick : undefined}
        size={size}
        showActions={false}
        className={`video-generation-workflow-card ${className}`}
      />
    </div>
  );
};

export default VideoGenerationWorkflowCard;
