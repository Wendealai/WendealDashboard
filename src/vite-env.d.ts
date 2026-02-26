/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string;
  readonly VITE_APP_COMMIT?: string;
  readonly VITE_APP_BUILD_TIME?: string;
  readonly VITE_INVOICE_OCR_WEBHOOK_URL?: string;
  readonly VITE_INVOICE_OCR_WORKFLOW_ID?: string;
  readonly VITE_INVOICE_OCR_POLL_INTERVAL_MS?: string;
  readonly VITE_INVOICE_OCR_POLL_TIMEOUT_MS?: string;
  readonly VITE_INVOICE_OCR_TELEMETRY_ENDPOINT?: string;
  readonly VITE_INVOICE_OCR_DEBUG?: string;
}

declare const __WENDEAL_BUILD_META__: {
  version: string;
  commit: string;
  buildTime: string;
};
