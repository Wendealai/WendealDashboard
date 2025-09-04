import { useState, useEffect, useCallback } from 'react';
import type { NotificationItem } from '../types/notification';

/**
 * useNotifications hook 的选项接口
 */
export interface UseNotificationsOptions {
  /** 消息API，用于显示通知消息 */
  messageApi?: {
    success: (content: any) => void;
    error: (content: any) => void;
    warning: (content: any) => void;
    info: (content: any) => void;
  };
}

// 模拟通知数据
const mockNotifications: NotificationItem[] = [
  {
    id: '1',
    type: 'info',
    title: '系统维护通知',
    content:
      '系统将于今晚 23:00-01:00 进行例行维护，期间可能影响部分功能使用。',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    read: false,
    category: 'system',
    priority: 'medium',
    actionText: '查看详情',
    actionUrl: '/maintenance',
  },
  {
    id: '2',
    type: 'success',
    title: '数据备份完成',
    content: '您的数据已成功备份到云端，备份文件大小：2.3GB。',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    read: false,
    category: 'system',
    priority: 'low',
  },
  {
    id: '3',
    type: 'warning',
    title: '安全提醒',
    content: '检测到您的账户在异地登录，如非本人操作请及时修改密码。',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    read: false,
    category: 'security',
    priority: 'high',
    actionText: '立即处理',
    actionUrl: '/security',
  },
  {
    id: '4',
    type: 'info',
    title: '版本更新',
    content: '新版本 v2.1.0 已发布，包含多项功能优化和安全修复。',
    timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    read: true,
    category: 'update',
    priority: 'medium',
    actionText: '立即更新',
    actionUrl: '/update',
  },
  {
    id: '5',
    type: 'error',
    title: '支付失败',
    content: '您的订单支付失败，请检查支付方式或联系客服处理。',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    read: true,
    category: 'message',
    priority: 'high',
    actionText: '重新支付',
    actionUrl: '/payment',
  },
  {
    id: '6',
    type: 'success',
    title: '任务完成',
    content: '您提交的数据分析任务已完成，可以查看分析结果。',
    timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    read: true,
    category: 'message',
    priority: 'low',
    actionText: '查看结果',
    actionUrl: '/results',
  },
];

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const { messageApi } = options;
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 初始化通知数据
  useEffect(() => {
    setLoading(true);
    // 模拟 API 调用
    setTimeout(() => {
      setNotifications(mockNotifications);
      setLoading(false);
    }, 500);
  }, []);

  // 标记单个通知为已读
  const markAsRead = useCallback(
    (id: string) => {
      setNotifications(prev =>
        prev.map(notification =>
          notification.id === id
            ? { ...notification, read: true }
            : notification
        )
      );
      messageApi?.success('已标记为已读');
    },
    [messageApi]
  );

  // 标记所有通知为已读
  const markAllAsRead = useCallback(() => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
    messageApi?.success('所有通知已标记为已读');
  }, [messageApi]);

  // 删除单个通知
  const deleteNotification = useCallback(
    (id: string) => {
      setNotifications(prev =>
        prev.filter(notification => notification.id !== id)
      );
      messageApi?.success('通知已删除');
    },
    [messageApi]
  );

  // 清空所有通知
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    messageApi?.success('所有通知已清空');
  }, [messageApi]);

  // 添加新通知
  const addNotification = useCallback(
    (notification: Omit<NotificationItem, 'id' | 'timestamp'>) => {
      const newNotification: NotificationItem = {
        ...notification,
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
      };
      setNotifications(prev => [newNotification, ...prev]);

      // 显示系统通知
      const notificationConfig = {
        message: notification.title,
        description: notification.content,
        duration: 4.5,
      };

      switch (notification.type) {
        case 'success':
          messageApi?.success(notificationConfig);
          break;
        case 'warning':
          messageApi?.warning(notificationConfig);
          break;
        case 'error':
          messageApi?.error(notificationConfig);
          break;
        default:
          messageApi?.info(notificationConfig);
      }
    },
    [messageApi]
  );

  // 获取未读通知数量
  const unreadCount = notifications.filter(n => !n.read).length;

  // 获取按类别分组的通知
  const getNotificationsByCategory = useCallback(
    (category: string) => {
      return notifications.filter(n => n.category === category);
    },
    [notifications]
  );

  // 获取按优先级分组的通知
  const getNotificationsByPriority = useCallback(
    (priority: string) => {
      return notifications.filter(n => n.priority === priority);
    },
    [notifications]
  );

  // 模拟接收新通知
  const simulateNewNotification = useCallback(() => {
    const types: NotificationItem['type'][] = [
      'info',
      'success',
      'warning',
      'error',
    ];
    const categories: NotificationItem['category'][] = [
      'system',
      'security',
      'update',
      'message',
    ];
    const priorities: NotificationItem['priority'][] = [
      'low',
      'medium',
      'high',
    ];

    const randomType = types[Math.floor(Math.random() * types.length)];
    const randomCategory =
      categories[Math.floor(Math.random() * categories.length)];
    const randomPriority =
      priorities[Math.floor(Math.random() * priorities.length)];

    const sampleNotifications = {
      info: { title: '系统信息', content: '这是一条测试信息通知' },
      success: { title: '操作成功', content: '您的操作已成功完成' },
      warning: { title: '注意事项', content: '请注意检查相关设置' },
      error: { title: '错误提醒', content: '操作过程中发生了错误' },
    };

    addNotification({
      type: randomType,
      title: sampleNotifications[randomType].title,
      content: sampleNotifications[randomType].content,
      read: false,
      category: randomCategory,
      priority: randomPriority,
    });
  }, [addNotification]);

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    addNotification,
    getNotificationsByCategory,
    getNotificationsByPriority,
    simulateNewNotification,
  };
};
