import React, { Suspense } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  useRouteError,
} from 'react-router-dom';
import { Spin } from 'antd';
import { useTranslation } from 'react-i18next';
import { routes } from './routes';
import RouteGuard from './RouteGuard';
import type { RouteConfig } from './types';

// Loading component for Suspense
const PageLoading: React.FC = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
    }}
  >
    <Spin size='large' />
  </div>
);

// Error boundary component
const ErrorBoundary: React.FC = () => {
  const error = useRouteError();
  console.error('Router Error:', error);

  // 安全地获取错误信息
  const getErrorMessage = (err: unknown): string => {
    if (err instanceof Error) {
      return err.message;
    }
    if (typeof err === 'string') {
      return err;
    }
    if (err && typeof err === 'object' && 'message' in err) {
      return String((err as any).message);
    }
    return 'Unknown error occurred';
  };

  // 安全地获取翻译函数
  const safeT = (key: string, fallback: string): string => {
    try {
      const { t } = useTranslation();
      return t ? t(key) : fallback;
    } catch (e) {
      console.warn(
        'Translation context not available in ErrorBoundary, using fallback text'
      );
      return fallback;
    }
  };

  const title = safeT('routerError.title', '导航错误');
  const subtitle = safeT('routerError.subtitle', '抱歉，发生了意外错误。');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        textAlign: 'center',
      }}
    >
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <p style={{ color: '#666' }}>{getErrorMessage(error)}</p>
    </div>
  );
};

// Convert route config to React Router format
const createRouteElement = (route: RouteConfig): any => {
  const Component = route.element;
  const element = (
    <RouteGuard
      requiresAuth={route.meta?.requiresAuth ?? false}
      allowedRoles={(route.meta?.roles ?? []) as any[]}
    >
      <Suspense fallback={<PageLoading />}>
        <Component />
      </Suspense>
    </RouteGuard>
  );

  return {
    path: route.path,
    element,
    index: route.index,
    errorElement: <ErrorBoundary />,
    children: route.children?.map(createRouteElement),
  };
};

// Create router instance
const router = createBrowserRouter(routes.map(createRouteElement), {
  future: {
    v7_normalizeFormMethod: true,
  },
});

// Main Router component
const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
export { router };
