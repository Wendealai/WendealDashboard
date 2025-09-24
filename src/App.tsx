import React, { useEffect, useState } from 'react';
import { Provider } from 'react-redux';
import {
  ConfigProvider,
  App as AntApp,
  theme,
  Spin,
  App as AppContext,
} from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { store } from '@/store';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import AppRouter from '@/router';
import i18n from '@/locales'; // 初始化国际化
import { setGlobalMessageInstance } from '@/hooks/useMessage';
import '@/styles/global.css';
import '@/styles/theme.css';
import '@/styles/compact.css';
import GlobalChat from '@/components/GlobalChat';

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    },
  },
});

// App content component that uses theme context
const AppContent: React.FC = () => {
  const { state } = useTheme();
  const { currentTheme } = state;
  const [i18nReady, setI18nReady] = useState(i18n.isInitialized);
  const { i18n: i18nInstance } = useTranslation();
  const { message } = AppContext.useApp();

  // 设置全局message实例
  useEffect(() => {
    if (message) {
      console.log('App: Setting global message instance:', {
        hasMessage: !!message,
        hasSuccess: typeof message?.success === 'function',
        hasError: typeof message?.error === 'function',
        messageType: typeof message,
      });
      setGlobalMessageInstance(message);
    }
  }, [message]);

  useEffect(() => {
    if (i18n.isInitialized) {
      setI18nReady(true);
    } else {
      const handleI18nInit = () => setI18nReady(true);
      i18n.on('initialized', handleI18nInit);
      return () => i18n.off('initialized', handleI18nInit);
    }
  }, []);

  // 如果i18n还未初始化，显示加载状态
  if (!i18nReady) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
          backgroundColor: currentTheme.backgroundColor,
        }}
      >
        <Spin size='large' />
      </div>
    );
  }

  // 根据当前语言获取Ant Design语言包
  const getAntdLocale = () => {
    switch (i18nInstance.language) {
      case 'en-US':
        return enUS;
      case 'zh-CN':
        return zhCN;
      default:
        return zhCN;
    }
  };

  // 构建Ant Design主题配置
  const antdTheme = {
    token: {
      colorPrimary: currentTheme.primaryColor,
      colorBgBase: currentTheme.backgroundColor,
      colorTextBase: currentTheme.textColor,
      colorBorder: currentTheme.borderColor,
      borderRadius: currentTheme.borderRadius,
      // fontSize: currentTheme.fontSize, // 移除对象类型，使用默认值
    },
    algorithm: currentTheme.isDark
      ? theme.darkAlgorithm
      : theme.defaultAlgorithm,
    components: {
      Layout: {
        bodyBg: currentTheme.backgroundColor,
        headerBg: currentTheme.headerColor,
        siderBg: currentTheme.sidebarColor,
      },
      Card: {
        colorBgContainer: currentTheme.cardColor,
      },
    },
  };

  return (
    <ConfigProvider
      theme={antdTheme}
      locale={getAntdLocale()}
      componentSize='middle'
    >
      <AntApp>
        <div data-theme={currentTheme.isDark ? 'dark' : 'light'}>
          <AuthProvider>
            <AppRouter />
            <GlobalChat />
          </AuthProvider>
        </div>
      </AntApp>
    </ConfigProvider>
  );
};

// Main App component
const App: React.FC = () => {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  );
};

export default App;
