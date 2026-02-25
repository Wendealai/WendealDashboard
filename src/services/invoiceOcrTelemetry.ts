import { getInvoiceOcrConfig } from '@/config/invoiceOcrConfig';

export type InvoiceOcrTelemetryEventName =
  | 'invoice_ocr_upload_started'
  | 'invoice_ocr_upload_completed'
  | 'invoice_ocr_upload_failed'
  | 'invoice_ocr_empty_response'
  | 'invoice_ocr_polling_started'
  | 'invoice_ocr_polling_timeout'
  | 'invoice_ocr_polling_completed'
  | 'invoice_ocr_polling_failed'
  | 'invoice_ocr_webhook_health_checked'
  | 'invoice_ocr_result_sync_health_checked'
  | 'invoice_ocr_supabase_health_checked';

export interface InvoiceOcrTelemetryEvent {
  event: InvoiceOcrTelemetryEventName;
  timestamp: string;
  payload: Record<string, unknown>;
}

type InvoiceOcrTelemetryRuntime = typeof globalThis & {
  __WENDEAL_INVOICE_OCR_TELEMETRY_BUFFER__?: InvoiceOcrTelemetryEvent[];
};

const MAX_BUFFER_SIZE = 200;

const buildEvent = (
  event: InvoiceOcrTelemetryEventName,
  payload: Record<string, unknown>
): InvoiceOcrTelemetryEvent => ({
  event,
  timestamp: new Date().toISOString(),
  payload,
});

const pushToRuntimeBuffer = (entry: InvoiceOcrTelemetryEvent): void => {
  const runtime = globalThis as InvoiceOcrTelemetryRuntime;
  if (!Array.isArray(runtime.__WENDEAL_INVOICE_OCR_TELEMETRY_BUFFER__)) {
    runtime.__WENDEAL_INVOICE_OCR_TELEMETRY_BUFFER__ = [];
  }

  runtime.__WENDEAL_INVOICE_OCR_TELEMETRY_BUFFER__.push(entry);

  if (
    runtime.__WENDEAL_INVOICE_OCR_TELEMETRY_BUFFER__.length > MAX_BUFFER_SIZE
  ) {
    runtime.__WENDEAL_INVOICE_OCR_TELEMETRY_BUFFER__.splice(
      0,
      runtime.__WENDEAL_INVOICE_OCR_TELEMETRY_BUFFER__.length - MAX_BUFFER_SIZE
    );
  }
};

const sendToTelemetryEndpoint = (
  endpoint: string,
  entry: InvoiceOcrTelemetryEvent
): void => {
  const body = JSON.stringify(entry);

  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    try {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(endpoint, blob);
      return;
    } catch {
      // Fall through to fetch
    }
  }

  void fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
    keepalive: true,
  }).catch(() => {
    // Best effort only: telemetry should never affect main flow.
  });
};

export const trackInvoiceOcrEvent = (
  event: InvoiceOcrTelemetryEventName,
  payload: Record<string, unknown> = {}
): void => {
  const config = getInvoiceOcrConfig();
  const entry = buildEvent(event, payload);

  pushToRuntimeBuffer(entry);

  if (config.debug) {
    console.info('[invoice-ocr-telemetry]', entry);
  }

  if (config.telemetryEndpoint) {
    sendToTelemetryEndpoint(config.telemetryEndpoint, entry);
  }
};
