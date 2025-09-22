import React, { useState, useEffect } from 'react';
import {
  Drawer,
  List,
  Avatar,
  Badge,
  Button,
  Space,
  Typography,
  Divider,
  Empty,
  Tabs,
  Tag,
  Tooltip,
  Dropdown,
  Menu,
  message,
} from 'antd';
import {
  BellOutlined,
  DeleteOutlined,
  EyeOutlined,
  MoreOutlined,
  CheckOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/zh-cn';
import './NotificationCenter.scss';

dayjs.extend(relativeTime);
dayjs.locale('zh-cn');

const { Title, Text } = Typography;

import { notificationService } from '@/services/notificationService';
import type {
  Notification,
  NotificationStatus,
  NotificationCategory,
} from '@/types/notification';
import { useTranslation } from 'react-i18next';

// Legacy NotificationItem interface for backward compatibility
interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  category: string;
  read: boolean;
  timestamp: Date;
  actionUrl?: string;
  actionText?: string;
}

interface NotificationCenterProps {
  visible: boolean;
  onClose: () => void;
  notifications?: NotificationItem[];
  onMarkAsRead?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDelete?: (id: string) => void;
  onClearAll?: () => void;
}

// Adapter function to convert new Notification to legacy NotificationItem
const adaptNotificationToLegacy = (
  notification: Notification
): NotificationItem => {
  return {
    id: notification.id,
    type: notification.type === 'system' ? 'info' : notification.type,
    title: notification.title,
    content: notification.content,
    priority:
      notification.priority === 'urgent'
        ? 'high'
        : notification.priority === 'normal'
          ? 'medium'
          : 'low',
    category: notification.category,
    read: notification.status === 'read',
    timestamp: notification.createdAt,
    actionUrl: notification.actions[0]?.url || '',
    actionText: notification.actions[0]?.label || '',
  };
};

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  visible,
  onClose,
  notifications: propNotifications = [],
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [notifications, setNotifications] =
    useState<NotificationItem[]>(propNotifications);
  const [loading, setLoading] = useState(false);

  // 从notificationService加载通知
  useEffect(() => {
    if (visible) {
      loadNotifications();
    }
  }, [visible]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // 如果有传入的notifications，使用它们
      if (propNotifications.length > 0) {
        setNotifications(propNotifications);
        return;
      }

      // 否则从notificationService获取
      const response = await notificationService.getNotifications();
      const adaptedNotifications = response.notifications.map(
        adaptNotificationToLegacy
      );
      setNotifications(adaptedNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
      message.error(t('notification.messages.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  // 根据类型过滤通知
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !notification.read;
    return notification.category === activeTab;
  });

  // 未读通知数量
  const unreadCount = notifications.filter(n => !n.read).length;

  // 获取通知图标
  const getNotificationIcon = (type: NotificationItem['type']) => {
    const iconMap = {
      info: <InfoCircleOutlined style={{ color: '#1890ff' }} />,
      success: <CheckOutlined style={{ color: '#52c41a' }} />,
      warning: <WarningOutlined style={{ color: '#faad14' }} />,
      error: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
    };
    return iconMap[type];
  };

  // 获取优先级标签
  const getPriorityTag = (priority: NotificationItem['priority']) => {
    const tagMap = {
      low: <Tag color='default'>{t('notification.priority.low')}</Tag>,
      medium: <Tag color='orange'>{t('notification.priority.medium')}</Tag>,
      high: <Tag color='red'>{t('notification.priority.high')}</Tag>,
    };
    return tagMap[priority];
  };

  // 处理通知点击
  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }
    if (notification.actionUrl) {
      window.open(notification.actionUrl, '_blank');
    }
  };

  // 标记为已读
  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      // 更新本地状态
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
      // 调用外部回调
      onMarkAsRead?.(notificationId);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      message.error(t('notification.messages.markAsReadFailed'));
    }
  };

  // 全部标记为已读
  const handleMarkAllAsRead = async () => {
    try {
      // 获取所有未读通知并逐个标记为已读
      const unreadNotifications = notifications.filter(n => !n.read);
      for (const notification of unreadNotifications) {
        await notificationService.markAsRead(notification.id);
      }
      // 更新本地状态
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      // 调用外部回调
      onMarkAllAsRead?.();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      message.error(t('notification.messages.markAllAsReadFailed'));
    }
  };

  // 删除通知
  const handleDelete = async (notificationId: string) => {
    try {
      await notificationService.deleteNotification(notificationId);
      // 更新本地状态
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      // 调用外部回调
      onDelete?.(notificationId);
    } catch (error) {
      console.error('Failed to delete notification:', error);
      message.error(t('notification.messages.deleteFailed'));
    }
  };

  // 清空所有通知
  const handleClearAll = async () => {
    try {
      // 获取所有通知并逐个删除
      for (const notification of notifications) {
        await notificationService.deleteNotification(notification.id);
      }
      // 更新本地状态
      setNotifications([]);
      // 调用外部回调
      onClearAll?.();
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
      message.error(t('notification.messages.clearAllFailed'));
    }
  };

  // 批量操作菜单
  const batchActionMenu = (
    <Menu>
      <Menu.Item key='markAllRead' onClick={onMarkAllAsRead || (() => {})}>
        <CheckOutlined /> {t('notification.markAllAsRead')}
      </Menu.Item>
      <Menu.Item key='clearAll' onClick={onClearAll || (() => {})} danger>
        <DeleteOutlined /> {t('notification.clear')}
      </Menu.Item>
    </Menu>
  );

  // 单个通知操作菜单
  const getNotificationMenu = (notification: NotificationItem) => (
    <Menu>
      {!notification.read && (
        <Menu.Item
          key='markRead'
          onClick={() => onMarkAsRead?.(notification.id)}
        >
          <EyeOutlined /> {t('notification.markAsRead')}
        </Menu.Item>
      )}
      <Menu.Item
        key='delete'
        onClick={() => onDelete?.(notification.id)}
        danger
      >
        <DeleteOutlined /> {t('notification.delete')}
      </Menu.Item>
    </Menu>
  );

  return (
    <Drawer
      title={
        <div className='notification-header'>
          <Space>
            <BellOutlined />
            <span>{t('notification.title')}</span>
            {unreadCount > 0 && <Badge count={unreadCount} size='small' />}
          </Space>
          <Dropdown overlay={batchActionMenu} trigger={['click']}>
            <Button type='text' icon={<MoreOutlined />} />
          </Dropdown>
        </div>
      }
      placement='right'
      width={400}
      open={visible}
      onClose={onClose}
      className='notification-center'
    >
      <div className='notification-content'>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size='small'
          items={[
            {
              key: 'all',
              label: `${t('notification.tabs.all')} (${notifications.length})`,
            },
            {
              key: 'unread',
              label: `${t('notification.tabs.unread')} (${unreadCount})`,
            },
            { key: 'system', label: t('notification.tabs.system') },
            { key: 'security', label: t('notification.tabs.security') },
            { key: 'update', label: t('notification.tabs.update') },
            { key: 'message', label: t('notification.tabs.message') },
          ]}
        />

        <div className='notification-list'>
          {filteredNotifications.length === 0 ? (
            <Empty
              description={t('notification.empty')}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <List
              dataSource={filteredNotifications}
              renderItem={notification => (
                <List.Item
                  className={`notification-item ${
                    notification.read ? 'read' : 'unread'
                  }`}
                  actions={[
                    <Dropdown
                      overlay={getNotificationMenu(notification)}
                      trigger={['click']}
                    >
                      <Button
                        type='text'
                        icon={<MoreOutlined />}
                        size='small'
                      />
                    </Dropdown>,
                  ]}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <List.Item.Meta
                    avatar={
                      <div className='notification-avatar'>
                        {getNotificationIcon(notification.type)}
                        {!notification.read && (
                          <div className='unread-indicator' />
                        )}
                      </div>
                    }
                    title={
                      <div className='notification-title'>
                        <span>{notification.title}</span>
                        {getPriorityTag(notification.priority)}
                      </div>
                    }
                    description={
                      <div className='notification-description'>
                        <Text type='secondary' className='notification-content'>
                          {notification.content}
                        </Text>
                        <div className='notification-meta'>
                          <Text type='secondary' className='notification-time'>
                            {dayjs(notification.timestamp).fromNow()}
                          </Text>
                          {notification.actionText && (
                            <Button
                              type='link'
                              size='small'
                              className='notification-action'
                            >
                              {notification.actionText}
                            </Button>
                          )}
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </div>
      </div>
    </Drawer>
  );
};

export { NotificationCenter as default };
export { NotificationCenter };
