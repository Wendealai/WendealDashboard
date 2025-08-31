import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, Empty, Spin, message } from 'antd';
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
 * WorkflowResultTabs组件属性接口
 */
export interface WorkflowResultTabsProps {
  /** 工作流执行列表 */
  workflowExecutions: WorkflowExecution[];
  /** 当前Reddit数据（向后兼容） */
  redditData?: ParsedSubredditData[];
  /** 多工作流Reddit数据 */
  workflowRedditData?: Record<
    string,
    {
      data: ParsedSubredditData[];
      timestamp: string;
      workflowId: string;
    }
  >;
  /** 获取工作流Reddit数据的函数 */
  getWorkflowRedditData?: (workflowId: string) => ParsedSubredditData[];
  /** 加载状态 */
  loading?: boolean;
  /** 渲染Reddit数据的函数 */
  renderRedditData?: () => React.ReactNode;
  /** 渲染工作流执行的函数 */
  renderWorkflowExecution?: () => React.ReactNode;
  /** 渲染信息统计的函数 */
  renderInformationStats?: () => React.ReactNode;
  /** 组件样式类名 */
  className?: string;
}

/**
 * 工作流结果标签页组件
 * 允许用户同时查看多个工作流的执行结果
 */
const WorkflowResultTabs: React.FC<WorkflowResultTabsProps> = ({
  workflowExecutions,
  redditData,
  workflowRedditData = {},
  getWorkflowRedditData,
  loading = false,
  renderRedditData,
  renderWorkflowExecution,
  renderInformationStats,
  className = '',
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>('reddit-data');

  /**
   * 创建标签页数据项
   */
  const createTabItems = (): TabDataItem[] => {
    const tabs: TabDataItem[] = [
      {
        key: 'reddit-data',
        label: 'Reddit 数据',
        content: renderRedditData ? (
          renderRedditData()
        ) : (
          <Empty description='暂无Reddit数据' />
        ),
        closable: false,
      },
      {
        key: 'workflow-details',
        label: '工作流详情',
        content: renderWorkflowExecution ? (
          renderWorkflowExecution()
        ) : (
          <Empty description='暂无工作流详情' />
        ),
        closable: false,
      },
      {
        key: 'information-stats',
        label: '信息统计',
        content: renderInformationStats ? (
          renderInformationStats()
        ) : (
          <Empty description='暂无统计信息' />
        ),
        closable: false,
      },
    ];

    return tabs;
  };

  /**
   * 处理标签页切换
   */
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
  }, []);

  // 如果正在加载，显示加载状态
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

  // 创建标签页数据
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
