// 通知相关类型定义
export interface NotificationItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  content: string;
  timestamp: string;
  read: boolean;
  category: 'system' | 'security' | 'update' | 'message';
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
  actionText?: string;
}

export interface NotificationCenterProps {
  visible: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}
