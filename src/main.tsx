import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './locales';

type SupabaseRuntimeConfig = {
  url?: string;
  anonKey?: string;
};

type GoogleMapsRuntimeConfig = {
  apiKey?: string;
};

type GoogleCalendarRuntimeConfig = {
  clientId?: string;
  calendarId?: string;
};

const runtime = globalThis as typeof globalThis & {
  __WENDEAL_SUPABASE_CONFIG__?: SupabaseRuntimeConfig;
  __WENDEAL_GOOGLE_MAPS_CONFIG__?: GoogleMapsRuntimeConfig;
  __WENDEAL_GOOGLE_CALENDAR_CONFIG__?: GoogleCalendarRuntimeConfig;
};

runtime.__WENDEAL_SUPABASE_CONFIG__ = {
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
};

runtime.__WENDEAL_GOOGLE_MAPS_CONFIG__ = {
  apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
};

runtime.__WENDEAL_GOOGLE_CALENDAR_CONFIG__ = {
  clientId: import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID,
  calendarId: import.meta.env.VITE_GOOGLE_CALENDAR_ID,
};

// 在开发环境中启动MSW (暂时禁用以解决CORS问题)
if (import.meta.env.DEV) {
  console.log('MSW已临时禁用以解决webhook CORS问题');
  // import('./mocks').then(({ worker }) => {
  //   worker.start({
  //     onUnhandledRequest: (request) => {
  //       // 明确放过Notion API和外部API请求
  //       if (request.url.hostname === 'api.notion.com' ||
  //           request.url.hostname === 'n8n.wendealai.com' ||
  //           request.url.hostname !== 'localhost') {
  //         return;
  //       }
  //       // 对于其他未处理的请求，记录警告
  //       console.warn('MSW: Unhandled request:', request.method, request.url);
  //     },
  //     serviceWorker: {
  //       url: '/mockServiceWorker.js',
  //     },
  //     quiet: false, // 显示启动信息
  //   });
  // });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
