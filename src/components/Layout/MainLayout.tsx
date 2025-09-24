import React, { useState, useEffect } from 'react';
import {
  Layout as AntLayout,
  Menu,
  Button,
  Avatar,
  Dropdown,
  Space,
  Typography,
  Badge,
  Drawer,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';
import NotificationCenter from '../Notification/NotificationCenter';
import NotificationButton from '../Notification/NotificationButton';
import { notificationService } from '@/services/notificationService';

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
import ThemeToggle from '../common/ThemeToggle';
import LanguageSwitcher from '../common/LanguageSwitcher';

import './index.css';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  HomeOutlined,
  DashboardOutlined,
  ProfileOutlined,
  LoginOutlined,
  BarChartOutlined,
  GlobalOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  FileTextOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import WhatsNewPanel from './WhatsNewPanel';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch, useMessage } from '../../hooks';
import { useErrorModal } from '../../hooks/useErrorModal';
import ErrorModal from '../common/ErrorModal';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { useAuth } from '../../contexts/AuthContext';
import { navigationItems } from '../../router/routes';
import { useMediaQuery } from '../../hooks';

const { Header, Sider, Content } = AntLayout;
const { Text } = Typography;

const MainLayout: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user, logout, isAuthenticated } = useAuth();
  const message = useMessage();
  const { isVisible, errorInfo, showError, hideError } = useErrorModal();

  const { sidebarCollapsed, theme } = useAppSelector(state => state.ui);

  const isMobile = useMediaQuery('(max-width: 768px)');
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);
  const [notificationVisible, setNotificationVisible] = useState(false);

  // Notification related state and methods
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Load notifications from service
  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      const response = await notificationService.getNotifications();
      const adaptedNotifications = response.notifications.map(notification => ({
        id: notification.id,
        type: notification.type === 'system' ? 'info' : notification.type,
        title: notification.title,
        content: notification.content,
        priority: (notification.priority === 'urgent'
          ? 'high'
          : notification.priority === 'normal'
            ? 'medium'
            : 'low') as 'low' | 'medium' | 'high',
        category: notification.category,
        read: notification.status === 'read',
        timestamp: notification.createdAt,
        actionUrl: notification.actions[0]?.url || '',
        actionText: notification.actions[0]?.label || '',
      }));
      setNotifications(adaptedNotifications);
      setUnreadCount(response.unreadCount);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  // Notification actions
  const markAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
      message.success('已标记为已读');
    } catch (error) {
      console.error('Failed to mark as read:', error);
      message.error('标记已读失败');
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      for (const notification of unreadNotifications) {
        await notificationService.markAsRead(notification.id);
      }
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      message.success('所有通知已标记为已读');
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      message.error('全部标记已读失败');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      message.success('通知已删除');
    } catch (error) {
      console.error('Failed to delete notification:', error);
      message.error('删除通知失败');
    }
  };

  const clearAllNotifications = async () => {
    try {
      for (const notification of notifications) {
        await notificationService.deleteNotification(notification.id);
      }
      setNotifications([]);
      setUnreadCount(0);
      message.success('所有通知已清空');
    } catch (error) {
      console.error('Failed to clear all notifications:', error);
      message.error('清空通知失败');
    }
  };

  // Handle sidebar toggle
  const handleSidebarToggle = () => {
    if (isMobile) {
      setMobileDrawerVisible(!mobileDrawerVisible);
    } else {
      dispatch(toggleSidebar());
    }
  };

  // Handle menu item click
  const handleMenuClick = (key: string) => {
    const item = navigationItems.find(item => item.key === key);
    if (item) {
      navigate(item.path);
      if (isMobile) {
        setMobileDrawerVisible(false);
      }
    }
  };

  // Handle user logout
  const handleLogout = async () => {
    try {
      await logout();
      message.success(t('auth.logoutSuccess'));
      navigate('/login');
    } catch (error) {
      showError({
        title: t('auth.logoutError'),
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // User dropdown menu - display different options based on authentication status
  const userMenuItems = isAuthenticated
    ? [
        {
          key: 'profile',
          icon: <ProfileOutlined />,
          label: t('navigation.profile'),
          onClick: () => navigate('/profile'),
        },
        {
          key: 'settings',
          icon: <SettingOutlined />,
          label: t('navigation.settings'),
          onClick: () => navigate('/settings'),
        },
        {
          type: 'divider' as const,
        },
        {
          key: 'logout',
          icon: <LogoutOutlined />,
          label: t('navigation.logout'),
          onClick: handleLogout,
        },
      ]
    : [
        {
          key: 'login',
          icon: <LoginOutlined />,
          label: t('navigation.login'),
          onClick: () => navigate('/login'),
        },
        {
          key: 'register',
          icon: <UserOutlined />,
          label: t('navigation.register'),
          onClick: () => navigate('/register'),
        },
      ];

  // Generate menu items from navigation config
  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case 'HomeOutlined':
        return <HomeOutlined />;
      case 'BarChartOutlined':
        return <BarChartOutlined />;
      case 'GlobalOutlined':
        return <GlobalOutlined />;
      case 'RobotOutlined':
        return <RobotOutlined />;
      case 'DashboardOutlined':
        return <DashboardOutlined />;
      case 'UserOutlined':
        return <UserOutlined />;
      case 'SettingOutlined':
        return <SettingOutlined />;
      case 'SafetyCertificateOutlined':
        return <SafetyCertificateOutlined />;
      case 'FileTextOutlined':
        return <FileTextOutlined />;
      case 'ToolOutlined':
        return <ToolOutlined />;
      default:
        return null;
    }
  };

  const menuItems = navigationItems.map(item => ({
    key: item.key,
    icon: getIcon(item.icon),
    label: item.label ? t(item.label) : item.key,
  }));

  // Add home icon to route configuration
  if (menuItems.length > 0 && menuItems[0]?.key === '/') {
    menuItems[0].icon = <HomeOutlined />;
  }

  // Sidebar content
  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className='layout-logo'>
        <Text strong style={{ color: 'var(--text-color)', fontSize: '18px' }}>
          {sidebarCollapsed && !isMobile ? 'WD' : 'WendealDashboard'}
        </Text>
      </div>
      <Menu
        theme={theme === 'dark' ? 'dark' : 'light'}
        mode='inline'
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => handleMenuClick(key)}
        style={{
          borderRight: 0,
          flex: 1,
          fontSize: '14px',
        }}
        className='navigation-menu'
      />
      <WhatsNewPanel collapsed={sidebarCollapsed} />
    </div>
  );

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={sidebarCollapsed}
          width={250}
          collapsedWidth={80}
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            background: 'var(--sidebar-color)',
          }}
        >
          {sidebarContent}
        </Sider>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          title={t('navigation.menu')}
          placement='left'
          onClose={() => setMobileDrawerVisible(false)}
          open={mobileDrawerVisible}
          styles={{ body: { padding: 0 } }}
          headerStyle={{
            backgroundColor: 'var(--sidebar-color)',
            color: 'var(--text-color)',
          }}
        >
          <div
            style={{ backgroundColor: 'var(--sidebar-color)', height: '100%' }}
          >
            {sidebarContent}
          </div>
        </Drawer>
      )}

      <AntLayout
        style={{
          marginLeft: isMobile ? 0 : sidebarCollapsed ? 80 : 250,
          transition: 'margin-left 0.2s',
        }}
      >
        {/* Header */}
        <Header
          style={{
            padding: '0 24px',
            background: 'var(--header-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: 'none',
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              type='text'
              icon={
                sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />
              }
              onClick={handleSidebarToggle}
              style={{
                fontSize: '16px',
                width: 64,
                height: 64,
              }}
            />
          </div>

          <Space size='middle'>
            {/* Language Switch */}
            <LanguageSwitcher />

            {/* Theme Toggle */}
            <ThemeToggle size='small' />

            {/* Notifications */}
            <NotificationButton
              count={unreadCount}
              onClick={() => setNotificationVisible(true)}
            />

            {/* User Profile */}
            <Dropdown
              menu={{ items: userMenuItems }}
              placement='bottomRight'
              arrow
            >
              <Space style={{ cursor: 'pointer' }}>
                <Avatar
                  size='small'
                  icon={<UserOutlined />}
                  src={user?.avatar || null}
                  style={{
                    backgroundColor: isAuthenticated
                      ? 'var(--color-text-secondary, #666666)'
                      : 'var(--color-border, #cccccc)',
                  }}
                >
                  {!user?.avatar && isAuthenticated && user?.username
                    ? user.username.charAt(0).toUpperCase()
                    : undefined}
                </Avatar>
                <Text style={{ color: 'var(--text-color)', fontWeight: 500 }}>
                  {isAuthenticated
                    ? user?.displayName || user?.username || t('common.user')
                    : t('common.notLoggedIn')}
                </Text>
                {isAuthenticated && user?.role && (
                  <Badge
                    count={
                      user.role === 'admin'
                        ? t('common.admin')
                        : t('common.user')
                    }
                    style={{
                      backgroundColor:
                        user.role === 'admin'
                          ? 'var(--color-text-secondary, #666666)'
                          : 'var(--color-border, #999999)',
                      color: 'var(--color-white, #ffffff)',
                      fontSize: '10px',
                      height: '16px',
                      lineHeight: '16px',
                      borderRadius: '8px',
                    }}
                  />
                )}
              </Space>
            </Dropdown>
          </Space>
        </Header>

        {/* Content */}
        <Content
          style={{
            margin: '24px',
            padding: '24px',
            background: 'var(--card-color)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            minHeight: 'calc(100vh - 112px)',
          }}
        >
          <Outlet />
        </Content>
      </AntLayout>

      {/* Notification Center */}
      <NotificationCenter
        visible={notificationVisible}
        onClose={() => setNotificationVisible(false)}
        notifications={notifications}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDelete={deleteNotification}
        onClearAll={clearAllNotifications}
      />

      <ErrorModal
        visible={isVisible}
        title={errorInfo?.title || '错误'}
        message={errorInfo?.message || ''}
        {...(errorInfo?.details && { details: errorInfo.details })}
        onClose={hideError}
      />
    </AntLayout>
  );
};

export default MainLayout;
