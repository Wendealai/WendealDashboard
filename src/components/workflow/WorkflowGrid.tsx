/**
 * Workflow Grid Component
 * Provides adaptive workflow card grid layout
 */

import React from 'react';
import { Row, Col, Empty, Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import WorkflowCard from './WorkflowCard';
import type { WorkflowInfo } from '@/pages/InformationDashboard/types';

/**
 * Workflow Grid Component Props
 */
interface WorkflowGridProps {
  /** Workflow list */
  workflows: WorkflowInfo[];
  /** Selected workflow */
  selectedWorkflow?: WorkflowInfo | null;
  /** Whether loading */
  loading?: boolean;
  /** Workflow loading states mapping */
  workflowLoadingStates?: Record<string, boolean>;
  /** Workflow error states mapping */
  workflowErrors?: Record<string, string | null>;
  /** Workflow progress states mapping */
  workflowProgressStates?: Record<string, string>;
  /** Workflow last updated times mapping */
  lastUpdatedTimes?: Record<string, Date>;
  /** Workflow click callback */
  onWorkflowSelect?: (workflow: WorkflowInfo) => void;
  /** Trigger workflow callback */
  onWorkflowTrigger?: (workflow: WorkflowInfo) => void;
  /** Workflow settings callback */
  onWorkflowSettings?: (workflow: WorkflowInfo) => void;
  /** Grid gutter */
  gutter?: [number, number];
  /** Card size */
  cardSize?: 'small' | 'default' | 'large';
  /** Minimum column width */
  minColWidth?: number;
  /** Custom CSS class name */
  className?: string;
  /** Empty state description */
  emptyDescription?: string;
}

/**
 * Get responsive column configuration
 */
const getResponsiveColProps = (minColWidth: number = 300) => {
  return {
    xs: 24, // Mobile: 1 column
    sm: minColWidth <= 250 ? 12 : 24, // Small tablet: 2 or 1 columns
    md: minColWidth <= 200 ? 8 : minColWidth <= 300 ? 12 : 24, // Tablet: 3, 2 or 1 columns
    lg:
      minColWidth <= 180
        ? 6
        : minColWidth <= 240
          ? 8
          : minColWidth <= 360
            ? 12
            : 24, // Desktop: 4, 3, 2 or 1 columns
    xl:
      minColWidth <= 150
        ? 4
        : minColWidth <= 200
          ? 6
          : minColWidth <= 300
            ? 8
            : minColWidth <= 400
              ? 12
              : 24, // Large desktop: 6, 4, 3, 2 or 1 columns
    xxl:
      minColWidth <= 120
        ? 3
        : minColWidth <= 160
          ? 4
          : minColWidth <= 240
            ? 6
            : minColWidth <= 320
              ? 8
              : minColWidth <= 480
                ? 12
                : 24, // Extra large desktop: 8, 6, 4, 3, 2 or 1 columns
  };
};

/**
 * Workflow Grid Component
 */
const WorkflowGrid: React.FC<WorkflowGridProps> = ({
  workflows,
  selectedWorkflow,
  loading = false,
  workflowLoadingStates = {},
  workflowErrors = {},
  workflowProgressStates = {},
  lastUpdatedTimes = {},
  onWorkflowSelect,
  onWorkflowTrigger,
  onWorkflowSettings,
  gutter = [16, 16],
  cardSize = 'default',
  minColWidth = 300,
  className = '',
  emptyDescription,
}) => {
  const { t } = useTranslation();

  // Get responsive column configuration
  const colProps = getResponsiveColProps(minColWidth);

  // Show loading state if loading and no data
  if (loading && (!workflows || workflows.length === 0)) {
    return (
      <div
        className={`workflow-grid ${className}`}
        style={{ textAlign: 'center', padding: 48 }}
      >
        <Spin size='large' tip={t('common.loading')} />
      </div>
    );
  }

  // Show empty state if no workflows
  if (!workflows || workflows.length === 0) {
    return (
      <div
        className={`workflow-grid ${className}`}
        style={{ textAlign: 'center', padding: 48 }}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            emptyDescription ||
            t('informationDashboard.workflowPanel.noWorkflows')
          }
        />
      </div>
    );
  }

  return (
    <div className={`workflow-grid ${className}`}>
      <Row gutter={gutter}>
        {workflows.map(workflow => (
          <Col key={workflow.id} {...colProps}>
            <WorkflowCard
              workflow={workflow}
              selected={selectedWorkflow?.id === workflow.id}
              loading={workflowLoadingStates[workflow.id] || false}
              error={workflowErrors[workflow.id] ?? null}
              lastUpdated={lastUpdatedTimes[workflow.id] || undefined}
              onClick={onWorkflowSelect}
              onTrigger={onWorkflowTrigger}
              onSettings={onWorkflowSettings}
              size={cardSize}
              showActions={true}
            />
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default WorkflowGrid;
