import ApiService from './api';
import type { PaginatedResponse } from '@/pages/InformationDashboard/types';

// 统计数据接口
export interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  userGrowth: number;
  orderGrowth: number;
  revenueGrowth: number;
  productGrowth: number;
}

// 图表数据点接口
export interface ChartDataPoint {
  date: string;
  value: number;
  category?: string;
}

// 销售趋势数据接口
export interface SalesTrendData {
  daily: ChartDataPoint[];
  weekly: ChartDataPoint[];
  monthly: ChartDataPoint[];
}

// 用户活动数据接口
export interface UserActivityData {
  activeUsers: ChartDataPoint[];
  newUsers: ChartDataPoint[];
  returningUsers: ChartDataPoint[];
}

// 产品销售排行接口
export interface ProductSalesRanking {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  growth: number;
  category: string;
}

// 地区销售数据接口
export interface RegionalSalesData {
  region: string;
  sales: number;
  revenue: number;
  growth: number;
  coordinates?: [number, number];
}

// 实时数据接口
export interface RealTimeData {
  onlineUsers: number;
  todayOrders: number;
  todayRevenue: number;
  serverStatus: 'healthy' | 'warning' | 'error';
  lastUpdated: string;
}

// 活动日志接口
export interface ActivityLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  description: string;
  timestamp: string;
  ip?: string;
  userAgent?: string;
  status: 'success' | 'warning' | 'error';
}

// 系统性能数据接口
export interface SystemPerformance {
  cpu: number;
  memory: number;
  disk: number;
  network: {
    upload: number;
    download: number;
  };
  timestamp: string;
}

// 仪表板服务类
export class DashboardService {
  // 获取仪表板统计数据
  static async getStats(): Promise<DashboardStats> {
    return await ApiService.get<DashboardStats>('/dashboard/stats');
  }

  // 获取销售趋势数据
  static async getSalesTrend(
    period: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<ChartDataPoint[]> {
    return await ApiService.get<ChartDataPoint[]>(
      `/dashboard/sales-trend?period=${period}`
    );
  }

  // 获取用户活动数据
  static async getUserActivity(
    period: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<UserActivityData> {
    return await ApiService.get<UserActivityData>(
      `/dashboard/user-activity?period=${period}`
    );
  }

  // 获取产品销售排行
  static async getProductRanking(
    limit: number = 10
  ): Promise<ProductSalesRanking[]> {
    return await ApiService.get<ProductSalesRanking[]>(
      `/dashboard/product-ranking?limit=${limit}`
    );
  }

  // 获取地区销售数据
  static async getRegionalSales(): Promise<RegionalSalesData[]> {
    return await ApiService.get<RegionalSalesData[]>(
      '/dashboard/regional-sales'
    );
  }

  // 获取实时数据
  static async getRealTimeData(): Promise<RealTimeData> {
    return await ApiService.get<RealTimeData>('/dashboard/realtime');
  }

  // 获取活动日志
  static async getActivityLogs(
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      userId?: string;
      action?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    }
  ): Promise<PaginatedResponse<ActivityLog>> {
    const params = {
      page,
      pageSize,
      ...filters,
    };
    return await ApiService.get<PaginatedResponse<ActivityLog>>(
      '/dashboard/activity-logs',
      params
    );
  }

  // 获取系统性能数据
  static async getSystemPerformance(
    period: 'hour' | 'day' | 'week' = 'hour'
  ): Promise<SystemPerformance[]> {
    return await ApiService.get<SystemPerformance[]>(
      `/dashboard/system-performance?period=${period}`
    );
  }

  // 导出数据
  static async exportData(
    type: 'stats' | 'sales' | 'users' | 'products',
    format: 'excel' | 'pdf' | 'csv',
    filters?: any
  ): Promise<Blob> {
    const params = {
      type,
      format,
      ...filters,
    };

    const response = await ApiService.get('/dashboard/export', params);
    return new Blob([response as BlobPart], {
      type:
        format === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : format === 'pdf'
            ? 'application/pdf'
            : 'text/csv',
    });
  }

  // 获取数据概览
  static async getDataOverview(): Promise<{
    totalRecords: number;
    lastUpdated: string;
    dataQuality: number;
    syncStatus: 'synced' | 'syncing' | 'error';
  }> {
    return await ApiService.get('/dashboard/data-overview');
  }

  // 刷新缓存
  static async refreshCache(): Promise<void> {
    await ApiService.post('/dashboard/refresh-cache');
  }

  // 获取自定义报表
  static async getCustomReport(reportId: string, params?: any): Promise<any> {
    return await ApiService.get(`/dashboard/reports/${reportId}`, params);
  }

  // 保存自定义报表配置
  static async saveReportConfig(config: {
    name: string;
    description?: string;
    chartType: string;
    dataSource: string;
    filters: any;
    layout: any;
  }): Promise<{ id: string }> {
    return await ApiService.post('/dashboard/reports', config);
  }

  // 获取报表列表
  static async getReports(): Promise<
    Array<{
      id: string;
      name: string;
      description?: string;
      createdAt: string;
      updatedAt: string;
    }>
  > {
    return await ApiService.get('/dashboard/reports');
  }

  // 删除报表
  static async deleteReport(reportId: string): Promise<void> {
    await ApiService.delete(`/dashboard/reports/${reportId}`);
  }
}

export default DashboardService;
