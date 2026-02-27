import { useMemo } from 'react';
import { Provider } from 'react-redux';
import { ConfigProvider, App as AntApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BrowserRouter } from 'react-router-dom';
import { store } from '@/store';
import AppRouter from '@/router';
import i18n from '@/locales';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
  },
});

const resolveRouterBasename = (): string | undefined => {
  const basePath = (import.meta.env.VITE_SPARKERY_BASE_PATH || '/').trim();
  if (!basePath || basePath === '/') {
    return undefined;
  }
  return basePath.replace(/\/+$/, '');
};

const AppContent = () => {
  const { i18n: i18nInstance } = useTranslation();

  const locale = useMemo(() => {
    return i18nInstance.language === 'en-US' ? enUS : zhCN;
  }, [i18nInstance.language]);

  return (
    <ConfigProvider locale={locale} componentSize='middle'>
      <AppRouter />
    </ConfigProvider>
  );
};

const App = () => {
  void i18n;
  const basename = resolveRouterBasename();

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <AntApp>
          <BrowserRouter {...(basename ? { basename } : {})}>
            <AppContent />
          </BrowserRouter>
        </AntApp>
      </QueryClientProvider>
    </Provider>
  );
};

export default App;
