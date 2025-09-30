/**
 * Image Generation Workflow Card Component
 *
 * A specialized workflow card component for Image Generation functionality.
 * Extends the base WorkflowCard component with Image Generation specific features,
 * icons, and interactions.
 *
 * This component provides a visual representation of the Image Generation workflow
 * in the Social Media dashboard, allowing users to quickly access and trigger
 * image generation operations.
 *
 * Features:
 * - Image generation specific icons and branding
 * - Text-to-image and image-edit mode indicators
 * - Quick access to generation settings
 * - Integration with workflow management system
 * - Responsive design for different screen sizes
 *
 * @component
 * @example
 * ```tsx
 * <ImageGenerationWorkflowCard
 *   selected={true}
 *   loading={false}
 *   onClick={() => navigateToImageGeneration()}
 *   onTrigger={() => startImageGenerationWorkflow()}
 *   onSettings={() => openSettings()}
 * />
 * ```
 *
 * @see {@link WorkflowCard} - Base workflow card component
 * @see {@link ImageGenerationPanel} - Main image generation page component
 * @see {@link ImageGenerationWorkflow} - Image generation workflow data structure
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Space, Button, Tooltip } from 'antd';
import {
  PictureOutlined,
  SettingOutlined,
  CameraOutlined,
  EditOutlined,
} from '@ant-design/icons';
import WorkflowCard from '@/components/workflow/WorkflowCard';
import type { WorkflowStatus } from '../types';
import type { WorkflowInfo } from '@/pages/InformationDashboard/types';

/**
 * Image Generation Card Component Props
 */
interface ImageGenerationWorkflowCardProps {
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
 * Image Generation Workflow Card Component
 */
const ImageGenerationWorkflowCard: React.FC<
  ImageGenerationWorkflowCardProps
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
    id: 'image-generation-workflow',
    name: 'Image Generation',
    description:
      'Generate images from text prompts or edit existing images using AI',
    status: 'active' as WorkflowStatus,
    type: 'manual',
    executionCount: 0,
    successRate: 0,
    author: { id: 'system', name: 'System' },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastExecutedAt: new Date().toISOString(),
    nodeCount: 2,
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
   * Custom icon for image generation workflow
   */
  const getImageGenerationIcon = () => {
    return (
      <div style={{ position: 'relative' }}>
        <PictureOutlined style={{ color: '#722ed1', fontSize: 16 }} />
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
  const customWorkflowIcon = getImageGenerationIcon();

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
        showActions={showActions}
        className={`image-generation-workflow-card ${className}`}
      />

      {/* Additional overlay for image generation specific features */}
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          display: 'flex',
          gap: 4,
          zIndex: 10,
        }}
      >
        <Tooltip title='Text to Image'>
          <Button
            type='text'
            size='small'
            icon={<CameraOutlined style={{ color: '#1890ff' }} />}
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid #d9d9d9',
              width: 24,
              height: 24,
              padding: 0,
            }}
          />
        </Tooltip>
        <Tooltip title='Image Edit'>
          <Button
            type='text'
            size='small'
            icon={<EditOutlined style={{ color: '#52c41a' }} />}
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              border: '1px solid #d9d9d9',
              width: 24,
              height: 24,
              padding: 0,
            }}
          />
        </Tooltip>
      </div>
    </div>
  );
};

export default ImageGenerationWorkflowCard;
