import { delay } from '@/utils';

// 统计数据接口
export interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  pageViews: number;
  usersTrend: { value: number; isPositive: boolean };
  ordersTrend: { value: number; isPositive: boolean };
  revenueTrend: { value: number; isPositive: boolean };
  pageViewsTrend: { value: number; isPositive: boolean };
}

// 活动数据接口
export interface ActivityItem {
  key: string;
  user: string;
  action: string;
  target: string;
  time: string;
  status: 'success' | 'warning' | 'error';
}

// 系统状态接口
export interface SystemStatus {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
}

// 模拟API延迟
const simulateApiDelay = () => delay(800 + Math.random() * 1200);

// 获取仪表板统计数据
export const fetchDashboardStats = async (
  dateRange: string
): Promise<DashboardStats> => {
  await simulateApiDelay();

  // 根据日期范围模拟不同的数据
  const baseMultiplier =
    {
      '1d': 0.1,
      '7d': 0.7,
      '30d': 1,
      '90d': 2.5,
    }[dateRange] || 1;

  return {
    totalUsers: Math.floor(12580 * baseMultiplier),
    totalOrders: Math.floor(3456 * baseMultiplier),
    totalRevenue: Math.floor(125680 * baseMultiplier),
    pageViews: Math.floor(89234 * baseMultiplier),
    usersTrend: {
      value: 12.5 + (Math.random() - 0.5) * 10,
      isPositive: Math.random() > 0.3,
    },
    ordersTrend: {
      value: 8.2 + (Math.random() - 0.5) * 8,
      isPositive: Math.random() > 0.4,
    },
    revenueTrend: {
      value: 3.1 + (Math.random() - 0.5) * 6,
      isPositive: Math.random() > 0.5,
    },
    pageViewsTrend: {
      value: 15.7 + (Math.random() - 0.5) * 12,
      isPositive: Math.random() > 0.2,
    },
  };
};

// 获取最近活动数据
export const fetchRecentActivities = async (): Promise<ActivityItem[]> => {
  await simulateApiDelay();

  const users = [
    '张三',
    '李四',
    '王五',
    '赵六',
    '钱七',
    '孙八',
    '周九',
    '吴十',
  ];
  const actions = [
    '创建订单',
    '更新用户信息',
    '删除产品',
    '登录系统',
    '导出报表',
    '修改设置',
    '上传文件',
    '发送消息',
  ];
  const targets = [
    'ORD-2024-001',
    'USER-12345',
    'PROD-789',
    '系统登录',
    '销售报表',
    '用户设置',
    'FILE-456',
    'MSG-789',
  ];
  const statuses: ('success' | 'warning' | 'error')[] = [
    'success',
    'success',
    'success',
    'warning',
    'error',
  ];

  const activities: ActivityItem[] = [];

  for (let i = 0; i < 8; i++) {
    const randomUser = users[Math.floor(Math.random() * users.length)]!;
    const randomAction = actions[Math.floor(Math.random() * actions.length)]!;
    const randomTarget = targets[Math.floor(Math.random() * targets.length)]!;
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)]!;
    const timeAgo = Math.floor(Math.random() * 60) + 1;

    activities.push({
      key: `activity-${i + 1}`,
      user: randomUser,
      action: randomAction,
      target: randomTarget,
      time: `${timeAgo}分钟前`,
      status: randomStatus,
    });
  }

  return activities;
};

// 获取系统状态
export const fetchSystemStatus = async (): Promise<SystemStatus> => {
  await simulateApiDelay();

  return {
    cpuUsage: Math.floor(Math.random() * 80) + 10,
    memoryUsage: Math.floor(Math.random() * 70) + 20,
    diskUsage: Math.floor(Math.random() * 60) + 15,
    networkLatency: Math.floor(Math.random() * 50) + 5,
  };
};

// 刷新所有仪表板数据
export const refreshDashboardData = async (dateRange: string) => {
  const [stats, activities, systemStatus] = await Promise.all([
    fetchDashboardStats(dateRange),
    fetchRecentActivities(),
    fetchSystemStatus(),
  ]);

  return {
    stats,
    activities,
    systemStatus,
  };
};
