import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Space,
  Progress,
  Table,
  Tag,
  Button,
  Select,
  Alert,
  Tabs,
  DatePicker,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { ExportButton } from '@/components/Layout';
import type { ExportColumn } from '@/utils/export';
import { Line, Pie, Area, DualAxes } from '@ant-design/charts';
import ReactECharts from 'echarts-for-react';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  UserOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  EyeOutlined,
  ReloadOutlined,
  BarChartOutlined,
  LineChartOutlined,
  PieChartOutlined,
  AreaChartOutlined,
  DatabaseOutlined,
  HddOutlined,
  WifiOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useAppDispatch, useAppSelector, useMessage } from '@/hooks';
import { useAuth } from '@/contexts';
import {
  loadDashboardStats,
  loadRecentActivities,
  loadSystemStatus,
  refreshAllDashboardData,
  setDateRange,
  clearErrors,
} from '@/store/slices/dashboardSlice';
import type { ActivityItem } from '@/services/dashboardService';

import './styles.css';

const { Title } = Typography;
const { Option } = Select;

const { RangePicker } = DatePicker;

// 模拟图表数据
const generateLineData = (t: any) => {
  const data: Array<{ date: string; value: number; category: string }> = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0] || '',
      value: Math.floor(Math.random() * 1000) + 500,
      category: t('dashboard.chartData.userVisits'),
    });
  }
  return data;
};

const generateColumnData = (t: any) => {
  const months = [
    t('dashboard.chartData.months.jan'),
    t('dashboard.chartData.months.feb'),
    t('dashboard.chartData.months.mar'),
    t('dashboard.chartData.months.apr'),
    t('dashboard.chartData.months.may'),
    t('dashboard.chartData.months.jun'),
  ];
  return months.map(month => ({
    month,
    sales: Math.floor(Math.random() * 50000) + 20000,
    profit: Math.floor(Math.random() * 20000) + 8000,
  }));
};

const generatePieData = (t: any) => {
  return [
    { type: t('dashboard.chartData.desktop'), value: 45 },
    { type: t('dashboard.chartData.mobile'), value: 35 },
    { type: t('dashboard.chartData.tablet'), value: 20 },
  ];
};

const generateAreaData = (t: any) => {
  const data: Array<{ date: string; value: number; category: string }> = [];
  const categories = [
    t('dashboard.chartData.newUsers'),
    t('dashboard.chartData.activeUsers'),
    t('dashboard.chartData.paidUsers'),
  ];
  const today = new Date();

  categories.forEach(category => {
    for (let i = 14; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      data.push({
        date: date.toISOString().split('T')[0] || '',
        value: Math.floor(Math.random() * 500) + 100,
        category,
      });
    }
  });
  return data;
};

const generateHeatmapData = (t: any) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = [
    t('dashboard.chartData.weekdays.monday'),
    t('dashboard.chartData.weekdays.tuesday'),
    t('dashboard.chartData.weekdays.wednesday'),
    t('dashboard.chartData.weekdays.thursday'),
    t('dashboard.chartData.weekdays.friday'),
    t('dashboard.chartData.weekdays.saturday'),
    t('dashboard.chartData.weekdays.sunday'),
  ];
  const data: Array<[number, number, number]> = [];

  days.forEach((_, dayIndex) => {
    hours.forEach(hour => {
      data.push([hour, dayIndex, Math.floor(Math.random() * 100)]);
    });
  });

  return {
    tooltip: {
      position: 'top',
    },
    grid: {
      height: '50%',
      top: '10%',
    },
    xAxis: {
      type: 'category',
      data: hours,
      splitArea: {
        show: true,
      },
    },
    yAxis: {
      type: 'category',
      data: days,
      splitArea: {
        show: true,
      },
    },
    visualMap: {
      min: 0,
      max: 100,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: '15%',
    },
    series: [
      {
        name: t('dashboard.charts.visits'),
        type: 'heatmap',
        data: data,
        label: {
          show: false,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)',
          },
        },
      },
    ],
  };
};

interface StatCardProps {
  title: string;
  value: number;
  prefix?: React.ReactNode;
  suffix?: string;
  precision?: number;
  valueStyle?: React.CSSProperties;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

// 移除本地接口定义，使用从服务导入的类型

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  prefix,
  suffix,
  precision = 0,
  valueStyle,
  trend,
}) => {
  const { t } = useTranslation();

  return (
    <Card className='stat-card'>
      <Statistic
        title={title}
        value={value}
        precision={precision}
        {...(valueStyle && { valueStyle })}
        prefix={prefix}
        suffix={suffix}
      />
      {trend && (
        <div className='trend-indicator'>
          <Space>
            {trend.isPositive ? (
              <ArrowUpOutlined style={{ color: '#3f8600' }} />
            ) : (
              <ArrowDownOutlined style={{ color: '#cf1322' }} />
            )}
            <span
              style={{
                color: trend.isPositive ? '#3f8600' : '#cf1322',
                fontSize: '14px',
              }}
            >
              {Math.abs(trend.value)}%
            </span>
            <span style={{ color: '#8c8c8c', fontSize: '12px' }}>
              {t('dashboard.stats.vsLastMonth')}
            </span>
          </Space>
        </div>
      )}
    </Card>
  );
};

const DashboardPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const message = useMessage();
  const { stats, activities, systemStatus, loading, error, dateRange } =
    useAppSelector(state => state.dashboard);

  // 图表数据状态
  const [chartData, setChartData] = useState({
    lineData: generateLineData(t),
    columnData: generateColumnData(t),
    pieData: generatePieData(t),
    areaData: generateAreaData(t),
    heatmapData: generateHeatmapData(t),
  });

  const [activeChartTab, setActiveChartTab] = useState('trend');

  // 检查用户权限
  const canViewAdvancedStats = user?.role === 'admin';
  const canRefreshData =
    user?.role === 'admin' || user?.permissions?.includes('dashboard:refresh');

  // 初始化数据加载
  useEffect(() => {
    dispatch(loadDashboardStats(dateRange));
    dispatch(loadRecentActivities());
    dispatch(loadSystemStatus());
  }, [dispatch, dateRange]);

  // 处理日期范围变化
  const handleDateRangeChange = (value: string) => {
    dispatch(setDateRange(value));
    dispatch(loadDashboardStats(value));
  };

  // 刷新所有数据
  const handleRefresh = async () => {
    try {
      await dispatch(refreshAllDashboardData(dateRange)).unwrap();
      message.success(t('dashboard.messages.refreshSuccess'));
    } catch (error) {
      message.error(t('dashboard.messages.refreshFailed'));
    }
  };

  // 清除错误
  useEffect(() => {
    if (
      error.stats ||
      error.activities ||
      error.systemStatus ||
      error.refresh
    ) {
      const errorMessages = [
        error.stats,
        error.activities,
        error.systemStatus,
        error.refresh,
      ].filter(Boolean);

      if (errorMessages.length > 0) {
        message.error(errorMessages[0]);
        dispatch(clearErrors());
      }
    }
  }, [error, dispatch]);

  // 统计数据配置
  const statsConfig = stats
    ? [
        {
          title: t('dashboard.stats.totalUsers'),
          value: stats.totalUsers,
          prefix: <UserOutlined />,
          valueStyle: { color: '#10b981' },
          trend: stats.usersTrend,
        },
        {
          title: t('dashboard.stats.totalOrders'),
          value: stats.totalOrders,
          prefix: <ShoppingCartOutlined />,
          valueStyle: { color: '#3b82f6' },
          trend: stats.ordersTrend,
        },
        {
          title: t('dashboard.stats.totalRevenue'),
          value: stats.totalRevenue,
          prefix: <DollarOutlined />,
          suffix: '元',
          precision: 2,
          valueStyle: { color: '#8b5cf6' },
          trend: stats.revenueTrend,
        },
        {
          title: t('dashboard.stats.pageViews'),
          value: stats.pageViews,
          prefix: <EyeOutlined />,
          valueStyle: { color: '#f59e0b' },
          trend: stats.pageViewsTrend,
        },
      ]
    : [];

  // 使用Redux状态中的活动数据

  const activityColumns: ColumnsType<ActivityItem> = [
    {
      title: t('dashboard.recentActivities.columns.user'),
      dataIndex: 'user',
      key: 'user',
      width: 100,
    },
    {
      title: t('dashboard.recentActivities.columns.action'),
      dataIndex: 'action',
      key: 'action',
      width: 120,
    },
    {
      title: t('dashboard.recentActivities.columns.target'),
      dataIndex: 'target',
      key: 'target',
      width: 150,
    },
    {
      title: t('dashboard.recentActivities.columns.time'),
      dataIndex: 'time',
      key: 'time',
      width: 100,
    },
    {
      title: t('dashboard.recentActivities.columns.status'),
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: string) => {
        const colorMap = {
          success: 'green',
          warning: 'orange',
          error: 'red',
        };
        const textMap = {
          success: t('dashboard.recentActivities.status.success'),
          warning: t('dashboard.recentActivities.status.warning'),
          error: t('dashboard.recentActivities.status.error'),
        };
        return (
          <Tag color={colorMap[status as keyof typeof colorMap]}>
            {textMap[status as keyof typeof textMap]}
          </Tag>
        );
      },
    },
  ];

  // 导出列配置
  const exportColumns: ExportColumn[] = [
    {
      key: 'user',
      title: t('dashboard.export.columns.user'),
    },
    {
      key: 'action',
      title: t('dashboard.export.columns.action'),
    },
    {
      key: 'target',
      title: t('dashboard.export.columns.target'),
    },
    {
      key: 'time',
      title: t('dashboard.export.columns.time'),
    },
    {
      key: 'status',
      title: t('dashboard.export.columns.status'),
      render: (value: string) => {
        const textMap = {
          success: t('dashboard.status.success'),
          warning: t('dashboard.status.warning'),
          error: t('dashboard.status.error'),
        };
        return textMap[value as keyof typeof textMap] || value;
      },
    },
  ];

  return (
    <div className='dashboard-page'>
      <div className='dashboard-header'>
        <div className='header-content'>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              {t('dashboard.title')}
            </Title>
            {user && (
              <div style={{ marginTop: '8px', color: '#666' }}>
                {t('dashboard.welcome', {
                  username: user.username,
                  role: user.role,
                })}
              </div>
            )}
          </div>
          <Space>
            <Select
              value={dateRange}
              onChange={handleDateRangeChange}
              style={{ width: 120 }}
            >
              <Option value='1d'>{t('dashboard.dateRange.today')}</Option>
              <Option value='7d'>{t('dashboard.dateRange.week')}</Option>
              <Option value='30d'>{t('dashboard.dateRange.month')}</Option>
              <Option value='90d'>{t('dashboard.dateRange.quarter')}</Option>
            </Select>
            {canRefreshData && (
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loading.refresh}
              >
                {t('dashboard.buttons.refresh')}
              </Button>
            )}
          </Space>
        </div>
      </div>

      {!isAuthenticated && (
        <Alert
          message={t('dashboard.alerts.notLoggedIn.title')}
          description={t('dashboard.alerts.notLoggedIn.description')}
          type='warning'
          showIcon
          style={{ marginBottom: '24px' }}
        />
      )}

      {/* 统计卡片 */}
      <Row gutter={[24, 24]} className='stats-section'>
        {statsConfig.map((stat, index) => {
          // 高级统计数据仅对管理员可见
          if (
            !canViewAdvancedStats &&
            (stat.title === t('dashboard.stats.totalRevenue') ||
              stat.title === t('dashboard.stats.totalOrders'))
          ) {
            return null;
          }
          return (
            <Col xs={24} sm={12} lg={6} key={index}>
              <StatCard {...stat} />
            </Col>
          );
        })}
      </Row>

      {/* 图表和活动区域 */}
      <Row gutter={[24, 24]} className='charts-section'>
        <Col xs={24} lg={16}>
          <Card
            title={t('dashboard.charts.title')}
            className='chart-card'
            extra={
              <Space>
                <RangePicker size='small' />
                <Button
                  size='small'
                  icon={<ReloadOutlined />}
                  onClick={() =>
                    setChartData({
                      lineData: generateLineData(t),
                      columnData: generateColumnData(t),
                      pieData: generatePieData(t),
                      areaData: generateAreaData(t),
                      heatmapData: generateHeatmapData(t),
                    })
                  }
                >
                  {t('dashboard.buttons.refresh')}
                </Button>
              </Space>
            }
          >
            <Tabs
              activeKey={activeChartTab}
              onChange={setActiveChartTab}
              type='card'
              size='small'
              items={[
                {
                  key: 'trend',
                  label: (
                    <span>
                      <LineChartOutlined />
                      {t('dashboard.charts.trend')}
                    </span>
                  ),
                  children: (
                    <Line
                      data={chartData.lineData}
                      xField='date'
                      yField='value'
                      seriesField='category'
                      smooth
                      height={300}
                      point={{
                        size: 3,
                        shape: 'circle',
                      }}
                      tooltip={{
                        formatter: (datum: any) => {
                          return {
                            name: datum.category,
                            value: `${datum.value} ${t('dashboard.charts.visits')}`,
                          };
                        },
                      }}
                    />
                  ),
                },
                {
                  key: 'sales',
                  label: (
                    <span>
                      <BarChartOutlined />
                      {t('dashboard.charts.sales')}
                    </span>
                  ),
                  children: (
                    <DualAxes
                      data={[chartData.columnData, chartData.columnData]}
                      xField='month'
                      yField={['sales', 'profit']}
                      height={300}
                      geometryOptions={[
                        {
                          geometry: 'column',
                          color: '#5B8FF9',
                          columnWidthRatio: 0.4,
                        },
                        {
                          geometry: 'line',
                          color: '#5AD8A6',
                          lineStyle: {
                            lineWidth: 2,
                          },
                        },
                      ]}
                    />
                  ),
                },
                {
                  key: 'device',
                  label: (
                    <span>
                      <PieChartOutlined />
                      {t('dashboard.charts.device')}
                    </span>
                  ),
                  children: (
                    <Pie
                      data={chartData.pieData}
                      angleField='value'
                      colorField='type'
                      radius={0.8}
                      height={300}
                      label={{
                        type: 'outer',
                        content: '{name} {percentage}',
                      }}
                      interactions={[
                        {
                          type: 'element-active',
                        },
                      ]}
                    />
                  ),
                },
                {
                  key: 'user',
                  label: (
                    <span>
                      <AreaChartOutlined />
                      {t('dashboard.charts.user')}
                    </span>
                  ),
                  children: (
                    <Area
                      data={chartData.areaData}
                      xField='date'
                      yField='value'
                      seriesField='category'
                      height={300}
                    />
                  ),
                },
                {
                  key: 'heatmap',
                  label: t('dashboard.charts.heatmap'),
                  children: (
                    <ReactECharts
                      option={chartData.heatmapData}
                      style={{ height: '300px' }}
                      notMerge={true}
                      lazyUpdate={true}
                    />
                  ),
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={t('dashboard.systemStatus.title')}
            className='system-status-card'
            extra={
              canViewAdvancedStats && (
                <Button
                  size='small'
                  type='text'
                  icon={<ReloadOutlined />}
                  onClick={() => dispatch(loadSystemStatus())}
                  loading={loading.systemStatus}
                />
              )
            }
          >
            {canViewAdvancedStats ? (
              <Space
                direction='vertical'
                style={{ width: '100%' }}
                size='large'
              >
                <div className='status-item'>
                  <div className='status-label'>
                    <span>
                      <BarChartOutlined
                        style={{ marginRight: 8, color: '#1890ff' }}
                      />
                      {t('dashboard.systemStatus.cpu')}
                    </span>
                    <span className='status-value'>
                      {systemStatus?.cpuUsage || 0}%
                    </span>
                  </div>
                  <Progress
                    percent={systemStatus?.cpuUsage || 0}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%':
                        (systemStatus?.cpuUsage || 0) > 80
                          ? '#ff4d4f'
                          : '#87d068',
                    }}
                    showInfo={false}
                    size='small'
                    status={loading.systemStatus ? 'active' : 'normal'}
                  />
                </div>
                <div className='status-item'>
                  <div className='status-label'>
                    <span>
                      <DatabaseOutlined
                        style={{ marginRight: 8, color: '#52c41a' }}
                      />
                      {t('dashboard.systemStatus.memory')}
                    </span>
                    <span className='status-value'>
                      {systemStatus?.memoryUsage || 0}%
                    </span>
                  </div>
                  <Progress
                    percent={systemStatus?.memoryUsage || 0}
                    strokeColor={{
                      '0%': '#52c41a',
                      '100%':
                        (systemStatus?.memoryUsage || 0) > 80
                          ? '#ff4d4f'
                          : '#87d068',
                    }}
                    showInfo={false}
                    size='small'
                    status={loading.systemStatus ? 'active' : 'normal'}
                  />
                </div>
                <div className='status-item'>
                  <div className='status-label'>
                    <span>
                      <HddOutlined
                        style={{ marginRight: 8, color: '#fa8c16' }}
                      />
                      {t('dashboard.systemStatus.disk')}
                    </span>
                    <span className='status-value'>
                      {systemStatus?.diskUsage || 0}%
                    </span>
                  </div>
                  <Progress
                    percent={systemStatus?.diskUsage || 0}
                    strokeColor={{
                      '0%': '#fa8c16',
                      '100%':
                        (systemStatus?.diskUsage || 0) > 80
                          ? '#ff4d4f'
                          : '#87d068',
                    }}
                    showInfo={false}
                    size='small'
                    status={loading.systemStatus ? 'active' : 'normal'}
                  />
                </div>
                <div className='status-item'>
                  <div className='status-label'>
                    <span>
                      <WifiOutlined
                        style={{ marginRight: 8, color: '#722ed1' }}
                      />
                      {t('dashboard.systemStatus.network')}
                    </span>
                    <span className='status-value'>
                      {systemStatus?.networkLatency || 0}ms
                    </span>
                  </div>
                  <Progress
                    percent={Math.min(
                      (systemStatus?.networkLatency || 0) / 10,
                      100
                    )}
                    strokeColor={{
                      '0%': '#722ed1',
                      '100%':
                        (systemStatus?.networkLatency || 0) > 100
                          ? '#ff4d4f'
                          : '#87d068',
                    }}
                    showInfo={false}
                    size='small'
                  />
                </div>

                <div
                  className='system-overview'
                  style={{
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: '1px solid #f0f0f0',
                  }}
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Statistic
                        title={t('dashboard.systemStatus.onlineUsers')}
                        value={156}
                        prefix={<UserOutlined />}
                        valueStyle={{ color: '#3f8600', fontSize: '16px' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title={t('dashboard.systemStatus.systemLoad')}
                        value={2.3}
                        precision={1}
                        prefix={<ThunderboltOutlined />}
                        valueStyle={{ color: '#cf1322', fontSize: '16px' }}
                      />
                    </Col>
                  </Row>
                </div>
              </Space>
            ) : (
              <Alert
                message={t('dashboard.alerts.insufficientPermissions.title')}
                description={t(
                  'dashboard.alerts.insufficientPermissions.description'
                )}
                type='info'
                showIcon
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 聊天和活动区域 */}
      <Row gutter={[24, 24]} className='bottom-section'>
        <Col xs={24} lg={16}>
          <Card
            title={t('dashboard.recentActivities.title')}
            className='activity-card'
            extra={
              <ExportButton
                data={activities || []}
                columns={exportColumns}
                filename={`dashboard-activities-${new Date().toISOString().split('T')[0]}`}
                title={t('dashboard.recentActivities.exportTitle')}
                size='small'
                disabled={!activities || activities.length === 0}
                onExportStart={() =>
                  message.loading(t('dashboard.messages.exporting'), 0)
                }
                onExportComplete={() => {
                  message.destroy();
                  message.success(t('dashboard.messages.exportSuccess'));
                }}
                onExportError={error => {
                  message.destroy();
                  console.error('Export error:', error);
                  message.error(t('dashboard.messages.exportFailed'));
                }}
              />
            }
          >
            <Table
              columns={activityColumns}
              dataSource={activities}
              pagination={false}
              size='small'
              loading={loading.activities}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardPage;
