import React, { useState } from 'react';
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
  message,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom';
import NotificationCenter from '../Notification/NotificationCenter';
import NotificationButton from '../Notification/NotificationButton';
import { useNotifications } from '../../hooks/useNotifications';
import ThemeToggle from '../common/ThemeToggle';
import LanguageSwitcher from '../common/LanguageSwitcher';
import { WorkflowSettingsButton, WorkflowSettingsModal } from '../workflow';
import './index.css';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  HomeOutlined,
  DashboardOutlined,
  ProfileOutlined,
  LoginOutlined,
} from '@ant-design/icons';
import WhatsNewPanel from './WhatsNewPanel';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
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

  const { sidebarCollapsed } = useAppSelector(state => state.ui);

  const isMobile = useMediaQuery('(max-width: 768px)');
  const [mobileDrawerVisible, setMobileDrawerVisible] = useState(false);
  const [notificationVisible, setNotificationVisible] = useState(false);
  const [workflowSettingsVisible, setWorkflowSettingsVisible] = useState(false);

  // 通知相关状态和方法
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
  } = useNotifications();

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
      message.error(t('auth.logoutError'));
    }
  };

  // User dropdown menu - 根据认证状态显示不同选项
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
      case 'DashboardOutlined':
        return <DashboardOutlined />;
      case 'UserOutlined':
        return <UserOutlined />;
      case 'SettingOutlined':
        return <SettingOutlined />;
      default:
        return null;
    }
  };

  const menuItems = navigationItems.map(item => ({
    key: item.key,
    icon: getIcon(item.icon),
    label: item.label ? t(item.label) : item.key,
  }));

  // 添加首页图标到路由配置中
  if (menuItems.length > 0 && menuItems[0]?.key === '/') {
    menuItems[0].icon = <HomeOutlined />;
  }

  // Sidebar content
  const sidebarContent = (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className='layout-logo'>
        <Text strong style={{ color: 'white', fontSize: '18px' }}>
          {sidebarCollapsed && !isMobile ? 'WD' : 'WendealDashboard'}
        </Text>
      </div>
      <Menu
        theme='dark'
        mode='inline'
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => handleMenuClick(key)}
        style={{ borderRight: 0, flex: 1 }}
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
          headerStyle={{ backgroundColor: '#001529', color: 'white' }}
        >
          <div style={{ backgroundColor: '#001529', height: '100%' }}>
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
            boxShadow: '0 1px 4px rgba(0,21,41,.08)',
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

            {/* Workflow Settings */}
            <WorkflowSettingsButton
              onSettingsClick={() => setWorkflowSettingsVisible(true)}
            />

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
                  src={user?.avatar}
                  style={{
                    backgroundColor: isAuthenticated ? '#1890ff' : '#d9d9d9',
                  }}
                >
                  {!user?.avatar && isAuthenticated && user?.username
                    ? user.username.charAt(0).toUpperCase()
                    : undefined}
                </Avatar>
                <Text>
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
                        user.role === 'admin' ? '#f50' : '#52c41a',
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

      {/* Workflow Settings Modal */}
      <WorkflowSettingsModal
        visible={workflowSettingsVisible}
        onClose={() => setWorkflowSettingsVisible(false)}
      />
    </AntLayout>
  );
};

export { MainLayout };
export default MainLayout;
