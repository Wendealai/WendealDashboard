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

import type {
  NotificationItem,
  NotificationCenterProps,
} from '../../types/notification';

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  visible,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onClearAll,
}) => {
  const [activeTab, setActiveTab] = useState('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

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
      low: <Tag color='default'>低</Tag>,
      medium: <Tag color='orange'>中</Tag>,
      high: <Tag color='red'>高</Tag>,
    };
    return tagMap[priority];
  };

  // 处理通知点击
  const handleNotificationClick = (notification: NotificationItem) => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    if (notification.actionUrl) {
      window.open(notification.actionUrl, '_blank');
    }
  };

  // 批量操作菜单
  const batchActionMenu = (
    <Menu>
      <Menu.Item key='markAllRead' onClick={onMarkAllAsRead}>
        <CheckOutlined /> 全部标记为已读
      </Menu.Item>
      <Menu.Item key='clearAll' onClick={onClearAll} danger>
        <DeleteOutlined /> 清空所有通知
      </Menu.Item>
    </Menu>
  );

  // 单个通知操作菜单
  const getNotificationMenu = (notification: NotificationItem) => (
    <Menu>
      {!notification.read && (
        <Menu.Item key='markRead' onClick={() => onMarkAsRead(notification.id)}>
          <EyeOutlined /> 标记为已读
        </Menu.Item>
      )}
      <Menu.Item key='delete' onClick={() => onDelete(notification.id)} danger>
        <DeleteOutlined /> 删除
      </Menu.Item>
    </Menu>
  );

  return (
    <Drawer
      title={
        <div className='notification-header'>
          <Space>
            <BellOutlined />
            <span>通知中心</span>
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
            { key: 'all', label: `全部 (${notifications.length})` },
            { key: 'unread', label: `未读 (${unreadCount})` },
            { key: 'system', label: '系统' },
            { key: 'security', label: '安全' },
            { key: 'update', label: '更新' },
            { key: 'message', label: '消息' },
          ]}
        />

        <div className='notification-list'>
          {filteredNotifications.length === 0 ? (
            <Empty
              description='暂无通知'
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
