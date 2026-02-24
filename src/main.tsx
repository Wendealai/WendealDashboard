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

type AppRuntimeConfig = {
  supabase?: SupabaseRuntimeConfig;
  googleMaps?: GoogleMapsRuntimeConfig;
  googleCalendar?: GoogleCalendarRuntimeConfig;
};

const runtime = globalThis as typeof globalThis & {
  __WENDEAL_RUNTIME_CONFIG__?: AppRuntimeConfig;
  __WENDEAL_SUPABASE_CONFIG__?: SupabaseRuntimeConfig;
  __WENDEAL_GOOGLE_MAPS_CONFIG__?: GoogleMapsRuntimeConfig;
  __WENDEAL_GOOGLE_CALENDAR_CONFIG__?: GoogleCalendarRuntimeConfig;
};

const runtimeConfig = runtime.__WENDEAL_RUNTIME_CONFIG__ ?? {};

runtime.__WENDEAL_SUPABASE_CONFIG__ = {
  url: runtimeConfig.supabase?.url ?? import.meta.env.VITE_SUPABASE_URL,
  anonKey:
    runtimeConfig.supabase?.anonKey ?? import.meta.env.VITE_SUPABASE_ANON_KEY,
};

runtime.__WENDEAL_GOOGLE_MAPS_CONFIG__ = {
  apiKey:
    runtimeConfig.googleMaps?.apiKey ??
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
};

runtime.__WENDEAL_GOOGLE_CALENDAR_CONFIG__ = {
  clientId:
    runtimeConfig.googleCalendar?.clientId ??
    import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID,
  calendarId:
    runtimeConfig.googleCalendar?.calendarId ??
    import.meta.env.VITE_GOOGLE_CALENDAR_ID,
};

// 在开发环境中启动MSW (暂时禁用以解决CORS问题)
if (import.meta.env.DEV) {
  // import('./mocks').then(({ worker }) => {
  //   worker.start({
  //     onUnhandledRequest: (request) => {
  //       // 明确放过Notion API和外部API请求
  //       if (request.url.hostname === 'api.notion.com' ||
  //           request.url.hostname === 'n8n.wendealai.com' ||
  //           request.url.hostname !== 'localhost') {
  //         return;
  //       }
  //       // 对于其他未处理的请求，记录警�?  //       console.warn('MSW: Unhandled request:', request.method, request.url);
  //     },
  //     serviceWorker: {
  //       url: '/mockServiceWorker.js',
  //     },
  //     quiet: false, // 显示启动信息
  //   });
  // });
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Keep app usable even if service worker registration fails.
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
