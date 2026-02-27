import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './locales';
import './styles/app.css';
import 'antd/dist/reset.css';
import { syncDispatchConfigToServiceWorker } from '@/pages/Sparkery/dispatch/offlineBackgroundSync';

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

type SparkeryRuntimeConfig = {
  supabase?: SupabaseRuntimeConfig;
  googleMaps?: GoogleMapsRuntimeConfig;
  googleCalendar?: GoogleCalendarRuntimeConfig;
  appVersion?: string;
  appCommit?: string;
  appBuildTime?: string;
};

type BuildMeta = {
  version: string;
  commit: string;
  buildTime: string;
};

const runtime = globalThis as typeof globalThis & {
  __SPARKERY_RUNTIME_CONFIG__?: SparkeryRuntimeConfig;
  __WENDEAL_RUNTIME_CONFIG__?: SparkeryRuntimeConfig;
  __WENDEAL_SUPABASE_CONFIG__?: SupabaseRuntimeConfig;
  __WENDEAL_GOOGLE_MAPS_CONFIG__?: GoogleMapsRuntimeConfig;
  __WENDEAL_GOOGLE_CALENDAR_CONFIG__?: GoogleCalendarRuntimeConfig;
  __WENDEAL_APP_VERSION__?: string;
};

const pickNonEmpty = (...values: Array<string | undefined>): string | undefined => {
  for (const value of values) {
    if (!value) {
      continue;
    }
    const normalized = value.trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }
  return undefined;
};

const externalRuntime = runtime.__SPARKERY_RUNTIME_CONFIG__ || runtime.__WENDEAL_RUNTIME_CONFIG__ || {};
const buildMeta = __WENDEAL_BUILD_META__ as BuildMeta;

const resolvedAppVersion =
  pickNonEmpty(
    externalRuntime.appVersion,
    import.meta.env.VITE_APP_VERSION,
    buildMeta.version
  ) || 'unknown';
const resolvedAppCommit =
  pickNonEmpty(
    externalRuntime.appCommit,
    import.meta.env.VITE_APP_COMMIT,
    buildMeta.commit
  ) || resolvedAppVersion;
const resolvedAppBuildTime =
  pickNonEmpty(
    externalRuntime.appBuildTime,
    import.meta.env.VITE_APP_BUILD_TIME,
    buildMeta.buildTime
  ) || new Date().toISOString();
const resolvedSupabaseUrl = pickNonEmpty(
  externalRuntime.supabase?.url,
  import.meta.env.VITE_SUPABASE_URL
);
const resolvedSupabaseAnonKey = pickNonEmpty(
  externalRuntime.supabase?.anonKey,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
const resolvedGoogleMapsApiKey = pickNonEmpty(
  externalRuntime.googleMaps?.apiKey,
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY
);
const resolvedGoogleCalendarClientId = pickNonEmpty(
  externalRuntime.googleCalendar?.clientId,
  import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID
);
const resolvedGoogleCalendarId = pickNonEmpty(
  externalRuntime.googleCalendar?.calendarId,
  import.meta.env.VITE_GOOGLE_CALENDAR_ID
);

runtime.__WENDEAL_APP_VERSION__ = resolvedAppVersion;
runtime.__WENDEAL_RUNTIME_CONFIG__ = {
  ...externalRuntime,
  appVersion: resolvedAppVersion,
  appCommit: resolvedAppCommit,
  appBuildTime: resolvedAppBuildTime,
};

runtime.__WENDEAL_SUPABASE_CONFIG__ = {
  ...(resolvedSupabaseUrl ? { url: resolvedSupabaseUrl } : {}),
  ...(resolvedSupabaseAnonKey ? { anonKey: resolvedSupabaseAnonKey } : {}),
};

runtime.__WENDEAL_GOOGLE_MAPS_CONFIG__ = {
  ...(resolvedGoogleMapsApiKey ? { apiKey: resolvedGoogleMapsApiKey } : {}),
};

runtime.__WENDEAL_GOOGLE_CALENDAR_CONFIG__ = {
  ...(resolvedGoogleCalendarClientId
    ? { clientId: resolvedGoogleCalendarClientId }
    : {}),
  ...(resolvedGoogleCalendarId ? { calendarId: resolvedGoogleCalendarId } : {}),
};

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const serviceWorkerVersion = `${resolvedAppVersion}-${resolvedAppCommit}`;
  const serviceWorkerUrl = `/sw.js?v=${encodeURIComponent(serviceWorkerVersion)}`;

  const syncDispatchConfig = () => {
    syncDispatchConfigToServiceWorker({
      ...(runtime.__WENDEAL_SUPABASE_CONFIG__?.url
        ? { supabaseUrl: runtime.__WENDEAL_SUPABASE_CONFIG__.url }
        : {}),
      ...(runtime.__WENDEAL_SUPABASE_CONFIG__?.anonKey
        ? { supabaseAnonKey: runtime.__WENDEAL_SUPABASE_CONFIG__.anonKey }
        : {}),
    });
  };

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(serviceWorkerUrl, { updateViaCache: 'none' })
      .then(() => {
        syncDispatchConfig();
      })
      .catch(() => {
        // Keep app usable even if service worker registration fails.
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
