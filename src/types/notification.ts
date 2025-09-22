/**
 * Notification System Types
 * Comprehensive type definitions for the notification center
 */

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  content: string;
  priority: NotificationPriority;
  status: NotificationStatus;
  category: NotificationCategory;
  metadata: NotificationMetadata;
  actions: NotificationAction[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  readAt?: Date;
  archivedAt?: Date;
  userId: string;
  source: NotificationSource;
}

export const NotificationType = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  SYSTEM: 'system',
} as const;

export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType];

export const NotificationPriority = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type NotificationPriority =
  (typeof NotificationPriority)[keyof typeof NotificationPriority];

export const NotificationStatus = {
  UNREAD: 'unread',
  READ: 'read',
  ARCHIVED: 'archived',
  DELETED: 'deleted',
} as const;

export type NotificationStatus =
  (typeof NotificationStatus)[keyof typeof NotificationStatus];

export const NotificationCategory = {
  GENERAL: 'general',
  SECURITY: 'security',
  SYSTEM: 'system',
  WORKFLOW: 'workflow',
  ANALYTICS: 'analytics',
  SOCIAL: 'social',
  REPORTS: 'reports',
  ALERTS: 'alerts',
} as const;

export type NotificationCategory =
  (typeof NotificationCategory)[keyof typeof NotificationCategory];

export interface NotificationMetadata {
  icon?: string;
  color?: string;
  imageUrl?: string;
  linkUrl?: string;
  data?: Record<string, any>;
  tags?: string[];
  sourceId?: string;
  correlationId?: string;
}

export interface NotificationAction {
  id: string;
  label: string;
  type: 'primary' | 'secondary' | 'danger';
  action: string;
  url?: string;
  requiresConfirmation?: boolean;
}

export interface NotificationSource {
  type: 'system' | 'user' | 'workflow' | 'integration' | 'manual';
  id: string;
  name: string;
  metadata?: Record<string, any>;
}

export interface NotificationSettings {
  userId: string;
  globalEnabled: boolean;
  channels: {
    inApp: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  categories: {
    [key in NotificationCategory]: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string; // HH:MM format
    timezone: string;
  };
  digest: {
    enabled: boolean;
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string; // HH:MM format
  };
  soundEnabled: boolean;
  desktopNotifications: boolean;
}

export interface NotificationAnalytics {
  totalSent: number;
  totalRead: number;
  totalArchived: number;
  totalDeleted: number;
  readRate: number;
  archiveRate: number;
  categoryStats: {
    [key in NotificationCategory]: {
      sent: number;
      read: number;
      archived: number;
    };
  };
  timeStats: {
    averageReadTime: number; // minutes
    peakHours: number[];
  };
  userEngagement: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
  };
}

export interface NotificationFilter {
  status?: NotificationStatus[];
  category?: NotificationCategory[];
  priority?: NotificationPriority[];
  type?: NotificationType[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
  unreadOnly?: boolean;
  archived?: boolean;
}

export interface NotificationListResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface NotificationObserver {
  onNotification(notification: Notification): void;
  onNotificationRead(notificationId: string): void;
  onNotificationArchived(notificationId: string): void;
  onNotificationDeleted(notificationId: string): void;
  onBulkOperation(operation: string, count: number): void;
}

export interface WebSocketMessage {
  type:
    | 'notification:new'
    | 'notification:read'
    | 'notification:archived'
    | 'notification:deleted'
    | 'bulk:operation';
  data: any;
  timestamp: Date;
  userId: string;
}

export interface NotificationTemplate {
  id: string;
  name: string;
  description: string;
  type: NotificationType;
  category: NotificationCategory;
  priority: NotificationPriority;
  titleTemplate: string;
  contentTemplate: string;
  actions: NotificationAction[];
  metadata: NotificationMetadata;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class NotificationError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, any> | undefined;
  public readonly timestamp: Date;
  public readonly userId?: string | undefined;
  public readonly notificationId?: string | undefined;

  constructor(
    code: string,
    message: string,
    details?: Record<string, any>,
    userId?: string,
    notificationId?: string
  ) {
    super(message);
    this.name = 'NotificationError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
    this.userId = userId;
    this.notificationId = notificationId;
  }
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: NotificationError;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Event types for real-time updates
export interface NotificationEvent {
  id: string;
  type: 'created' | 'updated' | 'deleted' | 'read' | 'archived';
  notificationId: string;
  userId: string;
  data: Partial<Notification>;
  timestamp: Date;
}

// Storage types for IndexedDB
export interface NotificationStorage {
  id: string;
  userId: string;
  notifications: Notification[];
  settings: NotificationSettings;
  lastSync: Date;
  version: number;
}

// Export utility types
export type NotificationCreateInput = Omit<
  Notification,
  'id' | 'createdAt' | 'updatedAt'
>;
export type NotificationUpdateInput = Partial<
  Omit<Notification, 'id' | 'createdAt'>
>;
export type NotificationSettingsUpdateInput = Partial<NotificationSettings>;
