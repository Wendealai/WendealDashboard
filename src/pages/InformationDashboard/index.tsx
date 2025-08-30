/**
 * 信息展示模块主页面
 * 集成工作流管理面板和信息数据展示网格
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Layout,
  Row,
  Col,
  Card,
  Button,
  Space,
  Statistic,
  Alert,
  Typography,
  Divider,
  Badge,
  Spin,
} from 'antd';
import {
  DashboardOutlined,
  SettingOutlined,
  DatabaseOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchDashboardData,
  fetchWorkflows,
  fetchInformationList,
  triggerWorkflow,
  selectDashboardData,
  selectWorkflowsList,
  selectInformationList,
  selectInformationStats,
  selectWorkflowStats,
  selectLoading,
} from '@/store/slices/informationDashboardSlice';
import WorkflowSidebar from './components/WorkflowSidebar';
import ResultPanel from './components/ResultPanel';
import type { InformationItem, Workflow, WorkflowExecution } from './types';
import type { ParsedSubredditData } from '@/services/redditWebhookService';

const { Content } = Layout;
const { Title, Text } = Typography;

/**
 * 信息展示模块主页面组件
 */
const InformationDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const dashboardData = useAppSelector(selectDashboardData);
  const informationStats = useAppSelector(selectInformationStats);
  const workflowStats = useAppSelector(selectWorkflowStats);
  const loading = useAppSelector(selectLoading);

  // 组件状态
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
    null
  );
  const [workflowExecution, setWorkflowExecution] =
    useState<WorkflowExecution | null>(null);
  const [workflowExecutions, setWorkflowExecutions] = useState<
    WorkflowExecution[]
  >([]);
  // 多工作流Reddit数据管理
  const [workflowRedditData, setWorkflowRedditData] = useState<
    Record<
      string,
      {
        data: ParsedSubredditData[];
        timestamp: string;
        workflowId: string;
      }
    >
  >(() => {
    // 从localStorage加载多工作流Reddit数据
    try {
      const savedData = localStorage.getItem('workflowRedditData');
      return savedData ? JSON.parse(savedData) : {};
    } catch (error) {
      console.error('加载工作流Reddit数据失败:', error);
      return {};
    }
  });

  // 当前显示的Reddit数据（向后兼容）
  const [redditData, setRedditData] = useState<ParsedSubredditData[]>(() => {
    // 从localStorage加载Reddit数据（向后兼容）
    try {
      const savedData = localStorage.getItem('redditData');
      return savedData ? JSON.parse(savedData) : [];
    } catch (error) {
      console.error('加载Reddit数据失败:', error);
      return [];
    }
  });

  /**
   * 初始化数据加载
   */
  useEffect(() => {
    dispatch(fetchDashboardData());
  }, [dispatch]);

  /**
   * 持久化Reddit数据到localStorage
   */
  useEffect(() => {
    try {
      localStorage.setItem('redditData', JSON.stringify(redditData));
    } catch (error) {
      console.error('保存Reddit数据失败:', error);
    }
  }, [redditData]);

  /**
   * 持久化多工作流Reddit数据到localStorage
   */
  useEffect(() => {
    try {
      localStorage.setItem(
        'workflowRedditData',
        JSON.stringify(workflowRedditData)
      );
    } catch (error) {
      console.error('保存工作流Reddit数据失败:', error);
    }
  }, [workflowRedditData]);

  /**
   * 处理工作流选择
   */
  const handleWorkflowSelect = useCallback((workflow: Workflow | null) => {
    setSelectedWorkflow(workflow);
  }, []);

  /**
   * 处理工作流触发成功
   */
  const handleWorkflowTriggered = useCallback(
    (workflowId: string, executionId: string) => {
      console.log(t('informationDashboard.messages.workflowTriggered'), {
        workflowId,
        executionId,
      });
      // 创建工作流执行记录
      const newExecution: WorkflowExecution = {
        executionId,
        workflowId,
        status: 'completed',
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
      };

      setWorkflowExecution(newExecution);
      // 添加到工作流执行列表中
      setWorkflowExecutions(prev => {
        // 检查是否已存在相同的执行记录，避免重复
        const exists = prev.some(exec => exec.executionId === executionId);
        if (exists) {
          return prev;
        }
        return [...prev, newExecution];
      });
    },
    [t]
  );

  /**
   * 处理信息项选择
   */
  const handleInformationItemSelect = (item: InformationItem) => {
    console.log(t('informationDashboard.informationGrid.viewDetails'), item);
    // 可以在这里添加详情展示或其他逻辑
  };

  /**
   * 处理信息项更新
   */
  const handleInformationItemUpdate = (item: InformationItem) => {
    console.log(t('informationDashboard.messages.dataRefreshed'), item);
    // 刷新相关数据
    dispatch(fetchDashboardData());
  };

  /**
   * 处理Reddit数据接收
   * @param data Reddit数据
   * @param workflowId 工作流ID（可选，用于多工作流数据管理）
   */
  const handleRedditDataReceived = (
    data: ParsedSubredditData[],
    workflowId?: string
  ) => {
    // 更新当前显示的Reddit数据
    setRedditData(data);

    // 如果提供了工作流ID，则存储到对应的工作流数据中
    if (workflowId) {
      setWorkflowRedditData(prev => ({
        ...prev,
        [workflowId]: {
          data,
          timestamp: new Date().toISOString(),
          workflowId,
        },
      }));
    }

    console.log(
      'Reddit数据已接收:',
      data,
      workflowId ? `工作流ID: ${workflowId}` : ''
    );
  };

  /**
   * 根据工作流ID获取Reddit数据
   * @param workflowId 工作流ID
   * @returns 对应工作流的Reddit数据
   */
  const getWorkflowRedditData = (workflowId: string): ParsedSubredditData[] => {
    return workflowRedditData[workflowId]?.data || [];
  };

  /**
   * 获取所有工作流的Reddit数据（用于传递给WorkflowResultTabs）
   */
  const getAllWorkflowRedditData = () => {
    return workflowRedditData;
  };

  /**
   * 渲染概览页面
   */
  const renderOverview = () => (
    <div>
      {/* 系统状态提示 */}
      <Alert
        message={t('informationDashboard.title')}
        description={t('informationDashboard.subtitle')}
        type='info'
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 24 }}
      />

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('informationDashboard.informationGrid.totalItems')}
              value={informationStats?.total || 0}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('informationDashboard.statistics.activeWorkflows')}
              value={workflowStats?.activeWorkflows || 0}
              prefix={<SettingOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('informationDashboard.statistics.totalExecutions')}
              value={workflowStats?.todayExecutions || 0}
              prefix={<SyncOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title={t('informationDashboard.workflowPanel.successRate')}
              value={workflowStats?.successRate || 0}
              precision={1}
              suffix='%'
              valueStyle={{
                color:
                  workflowStats?.successRate && workflowStats.successRate > 80
                    ? '#3f8600'
                    : '#cf1322',
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* 分类统计 */}
      {informationStats?.byCategory && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={12}>
            <Card
              title={t('informationDashboard.informationGrid.category')}
              size='small'
            >
              <Row gutter={8}>
                {Object.entries(informationStats.byCategory).map(
                  ([category, count]) => (
                    <Col span={12} key={category} style={{ marginBottom: 8 }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Text>{category}</Text>
                        <Badge count={count} showZero color='#108ee9' />
                      </div>
                    </Col>
                  )
                )}
              </Row>
            </Card>
          </Col>
          <Col span={12}>
            <Card
              title={t('informationDashboard.informationGrid.priority')}
              size='small'
            >
              <Row gutter={8}>
                {informationStats.byPriority &&
                  Object.entries(informationStats.byPriority).map(
                    ([priority, count]) => (
                      <Col span={12} key={priority} style={{ marginBottom: 8 }}>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <Text>
                            {priority === 'urgent'
                              ? t('common.priority.urgent')
                              : priority === 'high'
                                ? t('common.priority.high')
                                : priority === 'medium'
                                  ? t('common.priority.medium')
                                  : t('common.priority.low')}
                          </Text>
                          <Badge
                            count={count}
                            showZero
                            color={
                              priority === 'urgent'
                                ? '#f5222d'
                                : priority === 'high'
                                  ? '#fa8c16'
                                  : priority === 'medium'
                                    ? '#1890ff'
                                    : '#52c41a'
                            }
                          />
                        </div>
                      </Col>
                    )
                  )}
              </Row>
            </Card>
          </Col>
        </Row>
      )}

      {/* 最近趋势 */}
      {informationStats?.trendData && informationStats.trendData.length > 0 && (
        <Card
          title={t('informationDashboard.statistics.trends')}
          style={{ marginBottom: 24 }}
        >
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <Text type='secondary'>{t('common.comingSoon')}</Text>
            <br />
            <Text type='secondary'>
              {t('informationDashboard.statistics.dataCollected', {
                days: informationStats.trendData.length,
              })}
            </Text>
          </div>
        </Card>
      )}
    </div>
  );

  return (
    <Layout
      className='compact-layout'
      style={{ minHeight: '100vh', background: '#f0f2f5' }}
    >
      <Content style={{ padding: '12px' }}>
        {/* 页面头部 */}
        <div style={{ marginBottom: 12 }}>
          <Row justify='space-between' align='middle'>
            <Col>
              <Space align='center'>
                <DashboardOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                <Title
                  level={3}
                  className='compact-title'
                  style={{ margin: 0 }}
                >
                  {t('informationDashboard.title')}
                </Title>
              </Space>
            </Col>
          </Row>
        </div>

        {/* 主要内容区域 - 左右分栏布局 */}
        <Spin spinning={loading}>
          <Row gutter={8} style={{ height: 'calc(100vh - 160px)' }}>
            {/* 左侧工作流侧边栏 */}
            <Col span={8}>
              <WorkflowSidebar
                onWorkflowSelect={handleWorkflowSelect}
                onWorkflowTriggered={handleWorkflowTriggered}
                onRedditDataReceived={handleRedditDataReceived}
                style={{ height: '100%' }}
              />
            </Col>

            {/* 右侧结果展示面板 */}
            <Col span={16}>
              <ResultPanel
                selectedWorkflow={selectedWorkflow}
                workflowExecution={workflowExecution}
                workflowExecutions={workflowExecutions}
                redditData={redditData}
                workflowRedditData={workflowRedditData}
                getWorkflowRedditData={getWorkflowRedditData}
                loading={loading}
                style={{ height: '100%' }}
              />
            </Col>
          </Row>
        </Spin>

        {/* 页面底部信息 */}
        <Divider />
        <div style={{ textAlign: 'center', color: '#999' }}>
          <Text type='secondary'>
            {t('informationDashboard.title')} v1.0.0 |{' '}
            {t('informationDashboard.subtitle')}
          </Text>
        </div>
      </Content>
    </Layout>
  );
};

export default InformationDashboard;
