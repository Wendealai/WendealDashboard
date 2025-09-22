/**
 * Notification Components Index
 * Export all notification-related components
 */

export { default as NotificationItem } from './NotificationItem';
export { default as NotificationInbox } from './NotificationInbox';
export { default as NotificationSettingsPanel } from './NotificationSettings';
export { default as ToastManager, toast } from './ToastManager';

// Re-export types for convenience
export type {
  Notification,
  NotificationSettings,
  NotificationCreateInput,
  NotificationObserver,
  NotificationFilter,
  NotificationListResponse,
} from '@/types/notification';

export {
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  NotificationCategory,
} from '@/types/notification';
