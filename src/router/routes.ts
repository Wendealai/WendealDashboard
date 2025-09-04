import { lazy } from 'react';
import type { RouteConfig } from './types';

// Lazy load layout component
const MainLayout = lazy(() => import('@/components/Layout/MainLayout'));

// Lazy load components for better performance
const HomePage = lazy(() => import('@/pages/Home'));
const DashboardPage = lazy(() => import('@/pages/Dashboard'));

// Lazy load authentication components
const LoginForm = lazy(() => import('@/components/auth/LoginForm'));
const RegisterForm = lazy(() => import('@/components/auth/RegisterForm'));
const UserProfile = lazy(() => import('@/components/auth/UserProfile'));
const AdminPage = lazy(() => import('@/pages/Admin'));

// Authentication pages using components
const LoginPage = lazy(() => import('@/pages/Auth/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/Auth/RegisterPage'));
const ProfilePage = lazy(() => import('@/pages/Profile'));

// Settings and other pages
const SettingsPage = lazy(() => import('@/pages/Settings'));
const NotFoundPage = lazy(() => import('@/pages/NotFound'));

// Information Dashboard
const InformationDashboard = lazy(
  () => import('@/pages/InformationDashboard/InformationDashboard')
);

export const routes: RouteConfig[] = [
  // Routes without layout (login, register)
  {
    path: '/login',
    element: LoginPage,
    meta: {
      title: 'navigation.login',
      requiresAuth: false,
      hideInMenu: true,
    },
  },
  {
    path: '/register',
    element: RegisterPage,
    meta: {
      title: 'navigation.register',
      requiresAuth: false,
      hideInMenu: true,
    },
  },
  // Main layout route with nested routes
  {
    path: '/',
    element: MainLayout,
    children: [
      {
        path: '',
        element: HomePage,
        index: true,
        meta: {
          title: 'navigation.home',
          requiresAuth: false,
        },
      },
      {
        path: 'dashboard',
        element: DashboardPage,
        meta: {
          title: 'navigation.dashboard',
          requiresAuth: true,
          roles: ['admin', 'user'],
          icon: 'DashboardOutlined',
        },
      },
      {
        path: 'profile',
        element: ProfilePage,
        meta: {
          title: 'navigation.profile',
          requiresAuth: true,
          roles: ['admin', 'user'],
          icon: 'UserOutlined',
        },
      },
      {
        path: 'settings',
        element: SettingsPage,
        meta: {
          title: 'navigation.settings',
          requiresAuth: true,
          roles: ['admin', 'user'],
          icon: 'SettingOutlined',
        },
      },
      {
        path: 'admin',
        element: AdminPage,
        meta: {
          title: 'navigation.admin',
          requiresAuth: true,
          roles: ['ADMIN'],
          icon: 'SettingOutlined',
        },
      },
      {
        path: 'information-dashboard',
        element: InformationDashboard,
        meta: {
          title: 'navigation.informationDashboard',
          requiresAuth: true,
          roles: ['admin', 'user'],
          icon: 'DashboardOutlined',
        },
      },
    ],
  },
  {
    path: '*',
    element: NotFoundPage,
    meta: {
      title: 'Not Found',
      hideInMenu: true,
    },
  },
];

// Generate navigation items from nested routes
const getNavigationItems = (routes: RouteConfig[], basePath = ''): any[] => {
  const items: any[] = [];

  routes.forEach(route => {
    if (route.children) {
      // Process nested routes
      items.push(
        ...getNavigationItems(
          route.children,
          route.path === '/' ? '' : route.path
        )
      );
    } else if (!route.meta?.hideInMenu) {
      // Add route to navigation
      const fullPath = basePath ? `${basePath}/${route.path}` : route.path;
      items.push({
        key: fullPath === '/' ? '/' : fullPath.replace('//', '/'),
        label: route.meta?.title || route.path,
        path: fullPath === '/' ? '/' : fullPath.replace('//', '/'),
        icon: route.meta?.icon,
        requiresAuth: route.meta?.requiresAuth,
        roles: route.meta?.roles,
      });
    }
  });

  return items;
};

export const navigationItems = getNavigationItems(routes);
