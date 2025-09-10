import ApiService from './api';
import type { PaginatedResponse } from '@/pages/InformationDashboard/types';

// 通知类型
export type NotificationType =
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'system';

// 通知优先级
export type NotificationPriority = 'low' | 'medium' | 'high' | 'urgent';

// 通知状态
export type NotificationStatus = 'unread' | 'read' | 'archived';

// 通知接口
export interface Notification {
  id: string;
  title: string;
  content: string;
  type: NotificationType;
  priority: NotificationPriority;
  status: NotificationStatus;
  userId: string;
  createdAt: string;
  readAt?: string;
  archivedAt?: string;
  metadata?: {
    actionUrl?: string;
    actionText?: string;
    relatedId?: string;
    relatedType?: string;
    [key: string]: any;
  };
}

// 创建通知请求接口
export interface CreateNotificationRequest {
  title: string;
  content: string;
  type: NotificationType;
  priority: NotificationPriority;
  userId?: string; // 如果不提供，则发送给当前用户
  metadata?: Notification['metadata'];
}

// 批量操作请求接口
export interface BatchOperationRequest {
  notificationIds: string[];
  action: 'read' | 'unread' | 'archive' | 'delete';
}

// 通知设置接口
export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  categories: {
    system: boolean;
    security: boolean;
    updates: boolean;
    marketing: boolean;
    reminders: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string; // HH:mm format
  };
}

// 通知统计接口
export interface NotificationStats {
  total: number;
  unread: number;
  read: number;
  archived: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
}

// 通知服务类
export class NotificationService {
  // 获取通知列表
  static async getNotifications(
    page: number = 1,
    pageSize: number = 20,
    filters?: {
      status?: NotificationStatus;
      type?: NotificationType;
      priority?: NotificationPriority;
      startDate?: string;
      endDate?: string;
      search?: string;
    }
  ): Promise<PaginatedResponse<Notification>> {
    const params = {
      page,
      pageSize,
      ...filters,
    };
    return await ApiService.get<PaginatedResponse<Notification>>(
      '/notifications',
      params
    );
  }

  // 获取单个通知
  static async getNotification(id: string): Promise<Notification> {
    return await ApiService.get<Notification>(`/notifications/${id}`);
  }

  // 创建通知
  static async createNotification(
    data: CreateNotificationRequest
  ): Promise<Notification> {
    return await ApiService.post<Notification>('/notifications', data);
  }

  // 标记通知为已读
  static async markAsRead(id: string): Promise<void> {
    await ApiService.patch(`/notifications/${id}/read`);
  }

  // 标记通知为未读
  static async markAsUnread(id: string): Promise<void> {
    await ApiService.patch(`/notifications/${id}/unread`);
  }

  // 归档通知
  static async archiveNotification(id: string): Promise<void> {
    await ApiService.patch(`/notifications/${id}/archive`);
  }

  // 删除通知
  static async deleteNotification(id: string): Promise<void> {
    await ApiService.delete(`/notifications/${id}`);
  }

  // 批量操作
  static async batchOperation(data: BatchOperationRequest): Promise<void> {
    await ApiService.post('/notifications/batch', data);
  }

  // 标记所有通知为已读
  static async markAllAsRead(): Promise<void> {
    await ApiService.post('/notifications/mark-all-read');
  }

  // 清空所有通知
  static async clearAll(): Promise<void> {
    await ApiService.delete('/notifications/clear-all');
  }

  // 获取未读通知数量
  static async getUnreadCount(): Promise<number> {
    const response = await ApiService.get<{ count: number }>(
      '/notifications/unread-count'
    );
    return response.count;
  }

  // 获取通知统计
  static async getStats(): Promise<NotificationStats> {
    return await ApiService.get<NotificationStats>('/notifications/stats');
  }

  // 获取通知设置
  static async getSettings(): Promise<NotificationSettings> {
    return await ApiService.get<NotificationSettings>(
      '/notifications/settings'
    );
  }

  // 更新通知设置
  static async updateSettings(
    settings: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    return await ApiService.put<NotificationSettings>(
      '/notifications/settings',
      settings
    );
  }

  // 测试通知
  static async testNotification(type: NotificationType): Promise<void> {
    await ApiService.post('/notifications/test', { type });
  }

  // 订阅实时通知（WebSocket）
  static subscribeToRealTime(
    callback: (notification: Notification) => void
  ): () => void {
    // 这里应该实现WebSocket连接
    // 为了简化，我们使用EventSource或者轮询
    const eventSource = new EventSource('/api/notifications/stream');

    eventSource.onmessage = event => {
      try {
        const notification = JSON.parse(event.data);
        callback(notification);
      } catch (error) {
        console.error('Failed to parse notification:', error);
      }
    };

    eventSource.onerror = error => {
      console.error('Notification stream error:', error);
    };

    // 返回取消订阅函数
    return () => {
      eventSource.close();
    };
  }

  // 请求通知权限（浏览器推送）
  static async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission;
    }

    return Notification.permission;
  }

  // 显示浏览器通知
  static async showBrowserNotification(
    title: string,
    options?: NotificationOptions
  ): Promise<void> {
    const permission = await this.requestPermission();

    if (permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });
    }
  }

  // 注册Service Worker推送
  static async registerPushNotifications(): Promise<void> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      throw new Error('Push notifications are not supported');
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.VITE_VAPID_PUBLIC_KEY,
      });

      // 发送订阅信息到服务器
      await ApiService.post('/notifications/push-subscription', {
        subscription: subscription.toJSON(),
      });
    } catch (error) {
      console.error('Failed to register push notifications:', error);
      throw error;
    }
  }

  // 取消推送订阅
  static async unregisterPushNotifications(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await subscription.unsubscribe();
          await ApiService.delete('/notifications/push-subscription');
        }
      }
    } catch (error) {
      console.error('Failed to unregister push notifications:', error);
    }
  }
}

export default NotificationService;
