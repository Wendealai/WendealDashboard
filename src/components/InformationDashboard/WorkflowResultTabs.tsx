import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useMessage } from '@/hooks/useMessage';
import { Card, Empty, Spin } from 'antd';
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { TabsDataDisplay, type TabDataItem } from './TabsDataDisplay';
import type {
  Workflow,
  WorkflowExecution,
} from '../../pages/InformationDashboard/types';
import type { ParsedSubredditData } from '@/services/redditWebhookService';

/**
 * WorkflowResultTabs component props interface
 */
export interface WorkflowResultTabsProps {
  /** Workflow execution list */
  workflowExecutions: WorkflowExecution[];
  /** Current Reddit data (backward compatibility) */
  redditData?: ParsedSubredditData[];
  /** Multi-workflow Reddit data */
  workflowRedditData?: Record<
    string,
    {
      data: ParsedSubredditData[];
      timestamp: string;
      workflowId: string;
    }
  >;
  /** Function to get workflow Reddit data */
  getWorkflowRedditData?: (workflowId: string) => ParsedSubredditData[];
  /** Loading state */
  loading?: boolean;
  /** Function to render Reddit data */
  renderRedditData?: () => React.ReactNode;
  /** Function to render workflow execution */
  renderWorkflowExecution?: () => React.ReactNode;

  /** Component style class name */
  className?: string;
}

/**
 * Workflow result tabs component
 * Allows users to view multiple workflow execution results simultaneously
 */
const WorkflowResultTabs: React.FC<WorkflowResultTabsProps> = ({
  workflowExecutions,
  redditData,
  workflowRedditData = {},
  getWorkflowRedditData,
  loading = false,
  renderRedditData,
  renderWorkflowExecution,
}) => {
  const { t } = useTranslation();
  const message = useMessage();
  const [activeTab, setActiveTab] = useState<string>('reddit-data');

  /**
   * Create tab data items
   */
  const createTabItems = (): TabDataItem[] => {
    const tabs: TabDataItem[] = [
      {
        key: 'reddit-data',
        label: t('informationDashboard.tabs.redditData'),
        content: renderRedditData ? (
          renderRedditData()
        ) : (
          <Empty description={t('informationDashboard.tabs.noRedditData')} />
        ),
        closable: false,
      },
      {
        key: 'workflow-details',
        label: t('informationDashboard.tabs.workflowDetails'),
        content: renderWorkflowExecution ? (
          renderWorkflowExecution()
        ) : (
          <Empty
            description={t('informationDashboard.tabs.noWorkflowDetails')}
          />
        ),
        closable: false,
      },
    ];

    return tabs;
  };

  /**
   * Handle tab change
   */
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);

  // If loading, show loading state
  if (loading) {
    return (
      <div
        className={className}
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spin size='large' />
      </div>
    );
  }

  // Create tab data
  const tabItems = createTabItems();

  return (
    <TabsDataDisplay
      className={className}
      tabs={tabItems}
      activeKey={activeTab}
      onChange={handleTabChange}
      compact={true}
    />
  );
};

export { WorkflowResultTabs as default };
export { WorkflowResultTabs };
