/**
 * Notification Service
 * Core service for managing notifications with realistic logic
 */

import { io, Socket } from 'socket.io-client';
import type {
  Notification,
  NotificationObserver,
  NotificationSettings,
  NotificationCreateInput,
  NotificationFilter,
  NotificationListResponse,
  WebSocketMessage,
  NotificationAnalytics,
} from '@/types/notification';
import {
  NotificationError,
  NotificationType,
  NotificationStatus,
  NotificationCategory,
} from '@/types/notification';
import { notificationStorage } from './notificationStorage';

export class NotificationService {
  private socket: Socket | null = null;
  private observers: NotificationObserver[] = [];
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  // Configuration
  private config = {
    apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001',
    socketUrl: import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001',
    appId: import.meta.env.VITE_NOVU_APP_ID || '',
    subscriberId: '',
    enableWebSocket: import.meta.env.VITE_ENABLE_WEBSOCKET !== 'false',
    enableOfflineSupport: true,
    maxCacheSize: 1000,
    cacheTTL: 300000, // 5 minutes
  };

  constructor() {
    this.initializeService();
  }

  /**
   * Initialize the notification service
   */
  private async initializeService(): Promise<void> {
    try {
      // Initialize WebSocket connection
      if (this.config.enableWebSocket) {
        this.initializeWebSocket();
      }

      // Initialize offline support
      if (this.config.enableOfflineSupport) {
        this.initializeOfflineSupport();
      }

      console.log('Notification service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      throw new NotificationError(
        'SERVICE_INIT_FAILED',
        'Failed to initialize notification service'
      );
    }
  }

  /**
   * Initialize WebSocket connection
   */
  private initializeWebSocket(): void {
    if (!this.config.socketUrl) {
      console.warn(
        'Socket URL not configured, skipping WebSocket initialization'
      );
      return;
    }

    if (!this.config.enableWebSocket) {
      console.warn('WebSocket is disabled, skipping WebSocket initialization');
      return;
    }

    try {
      this.socket = io(this.config.socketUrl, {
        transports: ['websocket', 'polling'],
        timeout: 20000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        addTrailingSlash: false, // 避免路径问题
        tryAllTransports: true, // 尝试所有传输方式
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // Subscribe to user notifications
        if (this.config.subscriberId) {
          this.socket?.emit('subscribe', {
            userId: this.config.subscriberId,
            categories: Object.values(NotificationCategory),
          });
        }
      });

      this.socket.on('disconnect', reason => {
        console.log('WebSocket disconnected:', reason);
        this.isConnected = false;
      });

      this.socket.on('connect_error', error => {
        console.error('WebSocket connection error:', error);
        console.error('Connection error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack,
        });
        this.handleReconnection();
      });

      // 添加更详细的错误处理
      this.socket.on('connect_timeout', () => {
        console.error('WebSocket connection timeout');
      });

      this.socket.on('error', error => {
        console.error('WebSocket general error:', error);
      });

      // 监听重连事件
      this.socket.io.on('reconnect', attemptNumber => {
        console.log(`WebSocket reconnected after ${attemptNumber} attempts`);
        this.isConnected = true;
        this.reconnectAttempts = 0;
      });

      this.socket.io.on('reconnect_attempt', attemptNumber => {
        console.log(`WebSocket reconnection attempt ${attemptNumber}`);
      });

      this.socket.io.on('reconnect_error', error => {
        console.error('WebSocket reconnection error:', error);
      });

      this.socket.io.on('reconnect_failed', () => {
        console.error('WebSocket reconnection failed after max attempts');
      });

      // Handle real-time notification events
      this.socket.on('notification:new', (data: WebSocketMessage) => {
        if (data.type === 'notification:new') {
          this.handleNewNotification(data.data);
        }
      });

      this.socket.on('notification:read', (data: WebSocketMessage) => {
        if (data.type === 'notification:read') {
          this.notifyObservers('onNotificationRead', data.data.notificationId);
        }
      });

      this.socket.on('notification:archived', (data: WebSocketMessage) => {
        if (data.type === 'notification:archived') {
          this.notifyObservers(
            'onNotificationArchived',
            data.data.notificationId
          );
        }
      });
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error);
    }
  }

  /**
   * Handle WebSocket reconnection
   */
  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay =
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      setTimeout(() => {
        console.log(
          `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
        );
        this.initializeWebSocket();
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  /**
   * Initialize offline support
   */
  private initializeOfflineSupport(): void {
    // Listen for online/offline events
    window.addEventListener('online', () => {
      console.log('Network connection restored');
      this.syncOfflineData();
    });

    window.addEventListener('offline', () => {
      console.log('Network connection lost');
    });
  }

  /**
   * Set subscriber ID for the current user
   */
  setSubscriberId(subscriberId: string): void {
    this.config.subscriberId = subscriberId;

    // Subscribe to WebSocket events
    if (this.socket && this.isConnected) {
      this.socket.emit('subscribe', {
        userId: subscriberId,
        categories: Object.values(NotificationCategory),
      });
    }
  }

  /**
   * Get subscriber ID
   */
  getSubscriberId(): string {
    return this.config.subscriberId;
  }

  /**
   * Disable WebSocket connection
   */
  disableWebSocket(): void {
    this.config.enableWebSocket = false;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
    console.log('WebSocket connection disabled');
  }

  /**
   * Enable WebSocket connection
   */
  enableWebSocket(): void {
    this.config.enableWebSocket = true;
    this.initializeWebSocket();
    console.log('WebSocket connection enabled');
  }

  /**
   * Check if WebSocket is connected
   */
  isWebSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  /**
   * Create a new notification
   */
  async createNotification(
    input: NotificationCreateInput
  ): Promise<Notification> {
    try {
      // Generate realistic notification ID
      const notificationId = this.generateNotificationId();

      const notification: Notification = {
        id: notificationId,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...input,
        userId: this.config.subscriberId,
      };

      // Add realistic metadata based on type
      notification.metadata = {
        ...notification.metadata,
        ...this.generateRealisticMetadata(notification),
      };

      // Add realistic actions based on type
      notification.actions = this.generateRealisticActions(notification);

      // Store notification locally
      await this.storeNotification(notification);

      // Send to server if online
      if (navigator.onLine) {
        await this.sendToServer(notification);
      }

      // Notify observers
      this.notifyObservers('onNotification', notification);

      return notification;
    } catch (error) {
      console.error('Failed to create notification:', error);
      throw new NotificationError(
        'CREATE_FAILED',
        'Failed to create notification'
      );
    }
  }

  /**
   * Get notifications with filtering and pagination
   */
  async getNotifications(
    filter?: NotificationFilter,
    page: number = 1,
    limit: number = 20
  ): Promise<NotificationListResponse> {
    try {
      // Get from local storage first
      const localNotifications = await this.getStoredNotifications(filter);

      // Apply pagination
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const notifications = localNotifications.slice(startIndex, endIndex);

      // Get unread count
      const unreadCount = localNotifications.filter(
        n => n.status === NotificationStatus.UNREAD
      ).length;

      const result: NotificationListResponse = {
        notifications,
        total: localNotifications.length,
        unreadCount,
        hasMore: endIndex < localNotifications.length,
      };

      if (endIndex < localNotifications.length) {
        result.nextCursor = endIndex.toString();
      }

      return result;
    } catch (error) {
      console.error('Failed to get notifications:', error);
      throw new NotificationError(
        'FETCH_FAILED',
        'Failed to fetch notifications'
      );
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const notification = await this.getStoredNotification(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }

      notification.status = NotificationStatus.READ;
      notification.readAt = new Date();
      notification.updatedAt = new Date();

      await this.updateStoredNotification(notification);

      // Notify observers
      this.notifyObservers('onNotificationRead', notificationId);

      // Send to server if online
      if (navigator.onLine) {
        await this.sendToServer(notification);
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      throw new NotificationError(
        'MARK_READ_FAILED',
        'Failed to mark notification as read'
      );
    }
  }

  /**
   * Archive notification
   */
  async archiveNotification(notificationId: string): Promise<void> {
    try {
      const notification = await this.getStoredNotification(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }

      notification.status = NotificationStatus.ARCHIVED;
      notification.archivedAt = new Date();
      notification.updatedAt = new Date();

      await this.updateStoredNotification(notification);

      // Notify observers
      this.notifyObservers('onNotificationArchived', notificationId);

      // Send to server if online
      if (navigator.onLine) {
        await this.sendToServer(notification);
      }
    } catch (error) {
      console.error('Failed to archive notification:', error);
      throw new NotificationError(
        'ARCHIVE_FAILED',
        'Failed to archive notification'
      );
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      await this.removeStoredNotification(notificationId);

      // Notify observers
      this.notifyObservers('onNotificationDeleted', notificationId);

      // Send to server if online
      if (navigator.onLine) {
        await this.sendToServer(
          { id: notificationId } as Partial<Notification>,
          'DELETE'
        );
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw new NotificationError(
        'DELETE_FAILED',
        'Failed to delete notification'
      );
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    try {
      const notifications = await this.getStoredNotifications();

      // Delete all notifications
      await Promise.all(
        notifications.map(n => this.removeStoredNotification(n.id))
      );

      // Notify observers about bulk deletion
      this.notifyObservers('onBulkOperation', {
        operation: 'clear_all',
        count: notifications.length,
      });

      // Send to server if online
      if (navigator.onLine) {
        await this.sendToServer(
          { id: 'bulk_clear' } as Partial<Notification>,
          'DELETE'
        );
      }
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
      throw new NotificationError(
        'CLEAR_ALL_FAILED',
        'Failed to clear all notifications'
      );
    }
  }

  /**
   * Get notification settings
   */
  async getSettings(): Promise<NotificationSettings> {
    try {
      const settings = await this.getStoredSettings();
      return settings || this.getDefaultSettings();
    } catch (error) {
      console.error('Failed to get notification settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * Update notification settings
   */
  async updateSettings(
    settings: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    try {
      const currentSettings = await this.getSettings();
      const updatedSettings = { ...currentSettings, ...settings };

      await this.storeSettings(updatedSettings);
      return updatedSettings;
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      throw new NotificationError(
        'SETTINGS_UPDATE_FAILED',
        'Failed to update notification settings'
      );
    }
  }

  /**
   * Get analytics data
   */
  async getAnalytics(): Promise<NotificationAnalytics> {
    try {
      const notifications = await this.getStoredNotifications();
      return this.calculateAnalytics(notifications);
    } catch (error) {
      console.error('Failed to get analytics:', error);
      throw new NotificationError(
        'ANALYTICS_FAILED',
        'Failed to get analytics data'
      );
    }
  }

  /**
   * Subscribe to notification events
   */
  subscribe(observer: NotificationObserver): void {
    this.observers.push(observer);
  }

  /**
   * Unsubscribe from notification events
   */
  unsubscribe(observer: NotificationObserver): void {
    this.observers = this.observers.filter(obs => obs !== observer);
  }

  // Private helper methods

  private generateNotificationId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRealisticMetadata(
    notification: Notification
  ): Record<string, any> {
    const metadata: Record<string, any> = {};

    switch (notification.type) {
      case NotificationType.SUCCESS:
        metadata.icon = '✅';
        metadata.color = '#10b981';
        break;
      case NotificationType.ERROR:
        metadata.icon = '❌';
        metadata.color = '#ef4444';
        break;
      case NotificationType.WARNING:
        metadata.icon = '⚠️';
        metadata.color = '#f59e0b';
        break;
      case NotificationType.INFO:
        metadata.icon = 'ℹ️';
        metadata.color = '#3b82f6';
        break;
      case NotificationType.SYSTEM:
        metadata.icon = '🔧';
        metadata.color = '#8b5cf6';
        break;
    }

    // Add realistic timestamps
    metadata.timestamp = notification.createdAt.toISOString();
    metadata.source = 'system';

    return metadata;
  }

  private generateRealisticActions(notification: Notification): any[] {
    const actions = [];

    switch (notification.category) {
      case NotificationCategory.WORKFLOW:
        actions.push({
          id: 'view_workflow',
          label: 'View Workflow',
          type: 'primary',
          action: 'navigate',
          url: '/workflows',
        });
        break;
      case NotificationCategory.REPORTS:
        actions.push({
          id: 'view_report',
          label: 'View Report',
          type: 'primary',
          action: 'navigate',
          url: '/reports',
        });
        break;
      case NotificationCategory.ALERTS:
        actions.push({
          id: 'acknowledge',
          label: 'Acknowledge',
          type: 'primary',
          action: 'acknowledge',
        });
        break;
    }

    // Add common actions
    if (notification.status === NotificationStatus.UNREAD) {
      actions.push({
        id: 'mark_read',
        label: 'Mark as Read',
        type: 'secondary',
        action: 'mark_read',
      });
    }

    actions.push({
      id: 'archive',
      label: 'Archive',
      type: 'secondary',
      action: 'archive',
    });

    return actions;
  }

  private notifyObservers(method: keyof NotificationObserver, data: any): void {
    this.observers.forEach(observer => {
      try {
        if (
          method === 'onBulkOperation' &&
          typeof data === 'object' &&
          data.operation &&
          data.count !== undefined
        ) {
          // Handle onBulkOperation which expects two separate parameters
          (observer[method] as any)(data.operation, data.count);
        } else {
          (observer[method] as any)(data);
        }
      } catch (error) {
        console.error('Observer notification failed:', error);
      }
    });
  }

  private handleNewNotification(notification: Notification): void {
    this.notifyObservers('onNotification', notification);
  }

  private getDefaultSettings(): NotificationSettings {
    return {
      userId: this.config.subscriberId,
      globalEnabled: true,
      channels: {
        inApp: true,
        email: false,
        sms: false,
        push: true,
      },
      categories: {
        [NotificationCategory.GENERAL]: true,
        [NotificationCategory.SECURITY]: true,
        [NotificationCategory.SYSTEM]: true,
        [NotificationCategory.WORKFLOW]: true,
        [NotificationCategory.ANALYTICS]: true,
        [NotificationCategory.SOCIAL]: false,
        [NotificationCategory.REPORTS]: true,
        [NotificationCategory.ALERTS]: true,
      },
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '08:00',
        timezone: 'UTC',
      },
      digest: {
        enabled: true,
        frequency: 'daily',
        time: '09:00',
      },
      soundEnabled: true,
      desktopNotifications: true,
    };
  }

  private calculateAnalytics(
    notifications: Notification[]
  ): NotificationAnalytics {
    const totalSent = notifications.length;
    const totalRead = notifications.filter(
      n => n.status === NotificationStatus.READ
    ).length;
    const totalArchived = notifications.filter(
      n => n.status === NotificationStatus.ARCHIVED
    ).length;
    const totalDeleted = notifications.filter(
      n => n.status === NotificationStatus.DELETED
    ).length;

    const readRate = totalSent > 0 ? (totalRead / totalSent) * 100 : 0;
    const archiveRate = totalSent > 0 ? (totalArchived / totalSent) * 100 : 0;

    // Calculate category stats
    const categoryStats = Object.values(NotificationCategory).reduce(
      (acc, category) => {
        const categoryNotifications = notifications.filter(
          n => n.category === category
        );
        acc[category] = {
          sent: categoryNotifications.length,
          read: categoryNotifications.filter(
            n => n.status === NotificationStatus.READ
          ).length,
          archived: categoryNotifications.filter(
            n => n.status === NotificationStatus.ARCHIVED
          ).length,
        };
        return acc;
      },
      {} as any
    );

    // Calculate time stats
    const readTimes = notifications
      .filter(n => n.readAt)
      .map(n => n.readAt!.getTime() - n.createdAt.getTime());
    const averageReadTime =
      readTimes.length > 0
        ? readTimes.reduce((sum, time) => sum + time, 0) /
          readTimes.length /
          (1000 * 60)
        : 0;

    // Calculate peak hours
    const hourCounts = notifications.reduce(
      (acc, n) => {
        const hour = n.createdAt.getHours();
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>
    );
    const peakHours = Object.entries(hourCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    return {
      totalSent,
      totalRead,
      totalArchived,
      totalDeleted,
      readRate,
      archiveRate,
      categoryStats,
      timeStats: {
        averageReadTime,
        peakHours,
      },
      userEngagement: {
        dailyActiveUsers: 1, // Simplified for demo
        weeklyActiveUsers: 1,
        monthlyActiveUsers: 1,
      },
    };
  }

  // Storage methods using IndexedDB
  private async storeNotification(notification: Notification): Promise<void> {
    try {
      await notificationStorage.storeNotification(notification);
    } catch (error) {
      console.error('Failed to store notification:', error);
      throw error;
    }
  }

  private async getStoredNotifications(
    filter?: NotificationFilter
  ): Promise<Notification[]> {
    try {
      if (!this.config.subscriberId) {
        return [];
      }

      const notifications = await notificationStorage.getNotifications(
        this.config.subscriberId
      );

      // Apply additional filtering if needed
      if (filter) {
        return this.applyNotificationFilter(notifications, filter);
      }

      return notifications;
    } catch (error) {
      console.error('Failed to get stored notifications:', error);
      return [];
    }
  }

  private async getStoredNotification(
    id: string
  ): Promise<Notification | null> {
    try {
      return await notificationStorage.getNotification(id);
    } catch (error) {
      console.error('Failed to get stored notification:', error);
      return null;
    }
  }

  private async updateStoredNotification(
    notification: Notification
  ): Promise<void> {
    try {
      await notificationStorage.updateNotification(notification);
    } catch (error) {
      console.error('Failed to update stored notification:', error);
      throw error;
    }
  }

  private async removeStoredNotification(id: string): Promise<void> {
    try {
      await notificationStorage.deleteNotification(id);
    } catch (error) {
      console.error('Failed to remove stored notification:', error);
      throw error;
    }
  }

  private async getStoredSettings(): Promise<NotificationSettings | null> {
    try {
      if (!this.config.subscriberId) {
        return null;
      }
      return await notificationStorage.getSettings(this.config.subscriberId);
    } catch (error) {
      console.error('Failed to get stored settings:', error);
      return null;
    }
  }

  private async storeSettings(settings: NotificationSettings): Promise<void> {
    try {
      await notificationStorage.storeSettings(settings);
    } catch (error) {
      console.error('Failed to store settings:', error);
      throw error;
    }
  }

  private applyNotificationFilter(
    notifications: Notification[],
    filter: NotificationFilter
  ): Notification[] {
    return notifications.filter(notification => {
      if (filter.status && !filter.status.includes(notification.status)) {
        return false;
      }
      if (filter.category && !filter.category.includes(notification.category)) {
        return false;
      }
      if (filter.priority && !filter.priority.includes(notification.priority)) {
        return false;
      }
      if (filter.type && !filter.type.includes(notification.type)) {
        return false;
      }
      if (
        filter.unreadOnly &&
        notification.status !== NotificationStatus.UNREAD
      ) {
        return false;
      }
      if (filter.search) {
        const searchTerm = filter.search.toLowerCase();
        const searchableText =
          `${notification.title} ${notification.content}`.toLowerCase();
        if (!searchableText.includes(searchTerm)) {
          return false;
        }
      }
      return true;
    });
  }

  private async sendToServer(
    notification: Notification | Partial<Notification>,
    method: string = 'POST'
  ): Promise<void> {
    // Implementation will be added with API calls
    console.log('Sending to server:', notification, method);
  }

  private async syncOfflineData(): Promise<void> {
    // Implementation will be added for offline sync
    console.log('Syncing offline data');
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
