import { lazy } from 'react';
import type { RouteConfig } from './types';

// Lazy load layout component
const MainLayout = lazy(() => import('@/components/Layout/MainLayout'));

// Lazy load components for better performance
const DashboardPage = lazy(() => import('@/pages/Dashboard'));

// Lazy load authentication components (currently not used in routes)

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

// Social Media
const SocialMedia = lazy(() => import('@/pages/SocialMedia/SocialMedia'));

// RAG System
const RAGSystem = lazy(() => import('@/pages/RAGSystem/index'));

// R&D Report
const RNDReport = lazy(() => import('@/pages/RNDReport/RNDReport'));

// Cleaning Inspection (public form page)
const CleaningInspectionPage = lazy(() => import('@/pages/CleaningInspection'));

// Sparkery
const SparkeryPage = lazy(() => import('@/pages/Sparkery/index'));

// Bond Clean Quote Form (standalone public page)
const BondCleanQuoteForm = lazy(
  () => import('@/pages/Sparkery/BondCleanQuoteForm')
);

// Bond Clean Quote Form Chinese Version
const BondCleanQuoteFormCN = lazy(
  () => import('@/pages/Sparkery/BondCleanQuoteFormCN')
);

// Tools Workflow Container
const ToolsWorkflowContainer = lazy(
  () => import('@/pages/Tools/components/ToolsWorkflowContainer')
);

// Notification Demo
const NotificationDemo = lazy(
  () => import('@/pages/NotificationDemo/NotificationDemo')
);

// CRM
const CRMPage = lazy(() => import('@/pages/CRM'));

// Docmost
const DocmostPage = lazy(() => import('@/pages/Docmost'));

// Note
const NotePage = lazy(() => import('@/pages/Note'));

// Calendar
const CalendarPage = lazy(() => import('@/pages/Calendar'));

// Todo
const TodoPage = lazy(() => import('@/pages/Todo'));

// Files
const FilesPage = lazy(() => import('@/pages/Files'));

// Tools
const Tools = lazy(() => import('@/pages/Tools/Tools'));

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
  // Bond Clean Quote Form - standalone public page
  {
    path: '/bond-clean-quote',
    element: BondCleanQuoteForm,
    meta: {
      title: 'Bond Cleaning Quote Request',
      requiresAuth: false,
      hideInMenu: true,
    },
  },
  // Bond Clean Quote Form Chinese Version
  {
    path: '/bond-clean-quote-cn',
    element: BondCleanQuoteFormCN,
    meta: {
      title: '退租清洁报价申请表',
      requiresAuth: false,
      hideInMenu: true,
    },
  },
  // Cleaning Inspection Wizard - standalone public page (no layout)
  {
    path: '/cleaning-inspection',
    element: CleaningInspectionPage,
    meta: {
      title: 'Cleaning Inspection',
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
        element: DashboardPage,
        index: true,
        meta: {
          title: 'navigation.dashboard',
          requiresAuth: true,
          icon: 'DashboardOutlined',
        },
      },
      {
        path: 'information-dashboard',
        element: InformationDashboard,
        meta: {
          title: 'navigation.informationDashboard',
          requiresAuth: true,
          roles: ['admin', 'user'],
          icon: 'BarChartOutlined',
        },
      },
      {
        path: 'social-media',
        element: SocialMedia,
        meta: {
          title: 'navigation.socialMedia',
          requiresAuth: true,
          roles: ['admin', 'user'],
          icon: 'GlobalOutlined',
        },
      },
      {
        path: 'rag-system',
        element: RAGSystem,
        meta: {
          title: 'navigation.ragSystem',
          requiresAuth: true,
          roles: ['admin', 'user'],
          icon: 'RobotOutlined',
        },
      },
      {
        path: 'rnd-report',
        element: RNDReport,
        meta: {
          title: 'navigation.rndReport',
          requiresAuth: true,
          roles: ['admin', 'user'],
          icon: 'FileTextOutlined',
        },
      },
      {
        path: 'tools',
        element: Tools,
        meta: {
          title: 'navigation.tools',
          requiresAuth: true,
          roles: ['admin', 'user'],
          icon: 'ToolOutlined',
        },
      },
      {
        path: 'sparkery',
        element: SparkeryPage,
        meta: {
          title: 'Sparkery',
          requiresAuth: true,
          roles: ['admin', 'user'],
          icon: 'SafetyCertificateOutlined',
        },
      },
      {
        path: 'tools-workflow',
        element: ToolsWorkflowContainer,
        meta: {
          title: 'tools.workflow.title',
          requiresAuth: true,
          roles: ['admin', 'user'],
          icon: 'GlobalOutlined',
          hideInMenu: true,
        },
      },
      {
        path: 'crm',
        element: CRMPage,
        meta: {
          title: 'navigation.crm',
          requiresAuth: true,
          roles: ['admin', 'user'],
          icon: 'TeamOutlined',
        },
      },
      {
        path: 'docmost',
        element: DocmostPage,
        meta: {
          title: 'navigation.docmost',
          requiresAuth: true,
          roles: ['admin', 'user'],
          icon: 'FileTextOutlined',
        },
      },
      {
        path: 'note',
        element: NotePage,
        meta: {
          title: 'Note',
          requiresAuth: true,
          roles: ['admin', 'user'],
          icon: 'ReadOutlined',
        },
      },
      {
        path: 'calendar',
        element: CalendarPage,
        meta: {
          title: 'Calendar',
          requiresAuth: true,
          roles: ['admin', 'user'],
          icon: 'CalendarOutlined',
        },
      },
      {
        path: 'todo',
        element: TodoPage,
        meta: {
          title: 'Todo',
          requiresAuth: true,
          roles: ['admin', 'user'],
          icon: 'CheckSquareOutlined',
        },
      },
      {
        path: 'files',
        element: FilesPage,
        meta: {
          title: 'Files',
          requiresAuth: true,
          roles: ['admin', 'user'],
          icon: 'FolderOutlined',
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
        path: 'notification-demo',
        element: NotificationDemo,
        meta: {
          title: 'navigation.notificationDemo',
          requiresAuth: true,
          roles: ['admin', 'user'],
          icon: 'BellOutlined',
          hideInMenu: true,
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
