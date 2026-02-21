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
} from 'antd';
import OriginUIAvatar from '../OriginUIAvatar';
import GradientText from '../GradientText';
import { useTranslation } from 'react-i18next';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
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
  TeamOutlined,
  CalendarOutlined,
  ReadOutlined,
  FolderOutlined,
  CheckSquareOutlined,
} from '@ant-design/icons';
import WhatsNewPanel from './WhatsNewPanel';
import {
  useAppSelector,
  useAppDispatch,
  useMessage,
  useMediaQuery,
} from '../../hooks';
import { useErrorModal } from '../../hooks/useErrorModal';
import ErrorModal from '../common/ErrorModal';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { useAuth } from '../../contexts/AuthContext';
import { navigationItems } from '../../router/routes';

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
  const menuTheme = isMobile ? 'light' : theme === 'dark' ? 'dark' : 'light';

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
      case 'CalendarOutlined':
        return <CalendarOutlined />;
      case 'ReadOutlined':
        return <ReadOutlined />;
      case 'ToolOutlined':
        return <ToolOutlined />;
      case 'TeamOutlined':
        return <TeamOutlined />;
      case 'FolderOutlined':
        return <FolderOutlined />;
      case 'CheckSquareOutlined':
        return <CheckSquareOutlined />;
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
        <GradientText
          strong
          style={{
            fontSize: sidebarCollapsed && !isMobile ? '16px' : '18px',
            margin: 0,
            display: 'block',
            textAlign: 'center',
            padding: '16px 8px',
            minHeight: '24px',
            lineHeight: '24px',
          }}
        >
          {sidebarCollapsed && !isMobile ? 'WD' : 'WendealDashboard'}
        </GradientText>
      </div>
      <Menu
        theme={menuTheme}
        mode='inline'
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => handleMenuClick(key)}
        style={{
          borderRight: 0,
          flex: 1,
          fontSize: '14px',
          ...(isMobile
            ? {
                backgroundColor: '#ffffff',
                color: '#1f2937',
              }
            : {}),
        }}
        className={`navigation-menu${isMobile ? ' mobile-navigation-menu' : ''}`}
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
          rootClassName='mobile-navigation-drawer'
          title={t('navigation.menu')}
          placement='left'
          onClose={() => setMobileDrawerVisible(false)}
          open={mobileDrawerVisible}
          styles={{ body: { padding: 0 } }}
          headerStyle={{
            backgroundColor: '#ffffff',
            color: '#1f2937',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <div style={{ backgroundColor: '#ffffff', height: '100%' }}>
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

            {/* User Profile */}
            <Dropdown
              menu={{ items: userMenuItems }}
              placement='bottomRight'
              arrow
            >
              <Space style={{ cursor: 'pointer' }}>
                <OriginUIAvatar
                  src={user?.avatar || undefined}
                  alt='Profile image'
                  fallback={
                    !user?.avatar && isAuthenticated && user?.username
                      ? user.username.charAt(0).toUpperCase()
                      : 'U'
                  }
                  size={24}
                  showChevron={true}
                  asButton={false}
                  style={{
                    backgroundColor: isAuthenticated
                      ? 'var(--color-text-secondary, #666666)'
                      : 'var(--color-border, #cccccc)',
                  }}
                />
                <Text
                  className='user-display-name'
                  style={{
                    color: 'var(--text-color)',
                    fontFamily:
                      "'Inter', 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    fontWeight: 600,
                    fontSize: '14px',
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                    background:
                      'linear-gradient(135deg, var(--text-color) 0%, rgba(255, 255, 255, 0.8) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    letterSpacing: '0.025em',
                    userSelect: 'none',
                    cursor: 'default',
                  }}
                  role='text'
                  aria-label={`User: ${isAuthenticated ? user?.firstName || user?.username || 'User' : 'Not logged in'}`}
                >
                  {isAuthenticated
                    ? user?.firstName || user?.username || t('common.user')
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
