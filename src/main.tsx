import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './locales';
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

type InvoiceOcrRuntimeConfig = {
  webhookUrl?: string;
  workflowId?: string;
  resultPollingIntervalMs?: number;
  resultPollingTimeoutMs?: number;
  telemetryEndpoint?: string;
  debug?: boolean;
};

type BuildMeta = {
  version: string;
  commit: string;
  buildTime: string;
};

type AppRuntimeConfig = {
  supabase?: SupabaseRuntimeConfig;
  googleMaps?: GoogleMapsRuntimeConfig;
  googleCalendar?: GoogleCalendarRuntimeConfig;
  invoiceOCR?: InvoiceOcrRuntimeConfig;
  appVersion?: string;
  appCommit?: string;
  appBuildTime?: string;
};

const runtime = globalThis as typeof globalThis & {
  __WENDEAL_RUNTIME_CONFIG__?: AppRuntimeConfig;
  __WENDEAL_SUPABASE_CONFIG__?: SupabaseRuntimeConfig;
  __WENDEAL_GOOGLE_MAPS_CONFIG__?: GoogleMapsRuntimeConfig;
  __WENDEAL_GOOGLE_CALENDAR_CONFIG__?: GoogleCalendarRuntimeConfig;
  __WENDEAL_INVOICE_OCR_CONFIG__?: InvoiceOcrRuntimeConfig;
  __WENDEAL_APP_VERSION__?: string;
};

const pickNonEmpty = (
  ...values: Array<string | undefined>
): string | undefined => {
  for (const value of values) {
    if (typeof value !== 'string') {
      continue;
    }
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  return undefined;
};

const runtimeConfig = runtime.__WENDEAL_RUNTIME_CONFIG__ ?? {};
const buildMeta = __WENDEAL_BUILD_META__ as BuildMeta;
const resolvedAppVersion =
  runtimeConfig.appVersion?.trim() ||
  buildMeta.version ||
  import.meta.env.VITE_APP_VERSION ||
  'unknown';
const resolvedAppCommit =
  runtimeConfig.appCommit?.trim() ||
  buildMeta.commit ||
  import.meta.env.VITE_APP_COMMIT ||
  resolvedAppVersion;
const resolvedBuildTime =
  runtimeConfig.appBuildTime?.trim() ||
  buildMeta.buildTime ||
  import.meta.env.VITE_APP_BUILD_TIME ||
  'unknown';

runtime.__WENDEAL_APP_VERSION__ = resolvedAppVersion;
runtime.__WENDEAL_RUNTIME_CONFIG__ = {
  ...runtimeConfig,
  appVersion: resolvedAppVersion,
  appCommit: resolvedAppCommit,
  appBuildTime: resolvedBuildTime,
};

const resolvedSupabaseUrl = pickNonEmpty(
  runtimeConfig.supabase?.url,
  import.meta.env.VITE_SUPABASE_URL
);
const resolvedSupabaseAnonKey = pickNonEmpty(
  runtimeConfig.supabase?.anonKey,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
runtime.__WENDEAL_SUPABASE_CONFIG__ = {
  ...(resolvedSupabaseUrl ? { url: resolvedSupabaseUrl } : {}),
  ...(resolvedSupabaseAnonKey ? { anonKey: resolvedSupabaseAnonKey } : {}),
};

const resolvedGoogleMapsApiKey = pickNonEmpty(
  runtimeConfig.googleMaps?.apiKey,
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY
);
runtime.__WENDEAL_GOOGLE_MAPS_CONFIG__ = {
  ...(resolvedGoogleMapsApiKey ? { apiKey: resolvedGoogleMapsApiKey } : {}),
};

const resolvedGoogleCalendarClientId = pickNonEmpty(
  runtimeConfig.googleCalendar?.clientId,
  import.meta.env.VITE_GOOGLE_CALENDAR_CLIENT_ID
);
const resolvedGoogleCalendarId = pickNonEmpty(
  runtimeConfig.googleCalendar?.calendarId,
  import.meta.env.VITE_GOOGLE_CALENDAR_ID
);
runtime.__WENDEAL_GOOGLE_CALENDAR_CONFIG__ = {
  ...(resolvedGoogleCalendarClientId
    ? { clientId: resolvedGoogleCalendarClientId }
    : {}),
  ...(resolvedGoogleCalendarId ? { calendarId: resolvedGoogleCalendarId } : {}),
};

const invoiceOcrPollingIntervalEnv = import.meta.env
  .VITE_INVOICE_OCR_POLL_INTERVAL_MS
  ? Number(import.meta.env.VITE_INVOICE_OCR_POLL_INTERVAL_MS)
  : undefined;
const invoiceOcrPollingTimeoutEnv = import.meta.env
  .VITE_INVOICE_OCR_POLL_TIMEOUT_MS
  ? Number(import.meta.env.VITE_INVOICE_OCR_POLL_TIMEOUT_MS)
  : undefined;

const resolvedInvoiceOcrWebhookUrl =
  runtimeConfig.invoiceOCR?.webhookUrl ??
  import.meta.env.VITE_INVOICE_OCR_WEBHOOK_URL;
const resolvedInvoiceOcrWorkflowId =
  runtimeConfig.invoiceOCR?.workflowId ??
  import.meta.env.VITE_INVOICE_OCR_WORKFLOW_ID;
const resolvedInvoiceOcrTelemetryEndpoint =
  runtimeConfig.invoiceOCR?.telemetryEndpoint ??
  import.meta.env.VITE_INVOICE_OCR_TELEMETRY_ENDPOINT;
const resolvedInvoiceOcrDebug =
  runtimeConfig.invoiceOCR?.debug ??
  (import.meta.env.VITE_INVOICE_OCR_DEBUG
    ? import.meta.env.VITE_INVOICE_OCR_DEBUG === 'true'
    : undefined);
const resolvedInvoiceOcrPollingInterval =
  runtimeConfig.invoiceOCR?.resultPollingIntervalMs ??
  invoiceOcrPollingIntervalEnv;
const resolvedInvoiceOcrPollingTimeout =
  runtimeConfig.invoiceOCR?.resultPollingTimeoutMs ??
  invoiceOcrPollingTimeoutEnv;

runtime.__WENDEAL_INVOICE_OCR_CONFIG__ = {
  ...(resolvedInvoiceOcrWebhookUrl
    ? { webhookUrl: resolvedInvoiceOcrWebhookUrl }
    : {}),
  ...(resolvedInvoiceOcrWorkflowId
    ? { workflowId: resolvedInvoiceOcrWorkflowId }
    : {}),
  ...(typeof resolvedInvoiceOcrPollingInterval === 'number' &&
  Number.isFinite(resolvedInvoiceOcrPollingInterval)
    ? {
        resultPollingIntervalMs: resolvedInvoiceOcrPollingInterval,
      }
    : {}),
  ...(typeof resolvedInvoiceOcrPollingTimeout === 'number' &&
  Number.isFinite(resolvedInvoiceOcrPollingTimeout)
    ? {
        resultPollingTimeoutMs: resolvedInvoiceOcrPollingTimeout,
      }
    : {}),
  ...(resolvedInvoiceOcrTelemetryEndpoint
    ? { telemetryEndpoint: resolvedInvoiceOcrTelemetryEndpoint }
    : {}),
  ...(typeof resolvedInvoiceOcrDebug === 'boolean'
    ? { debug: resolvedInvoiceOcrDebug }
    : {}),
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

  navigator.serviceWorker.addEventListener(
    'controllerchange',
    syncDispatchConfig
  );

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(serviceWorkerUrl, { updateViaCache: 'none' })
      .then(registration => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) {
            return;
          }

          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && registration.waiting) {
              registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });

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
