type SparkeryTelemetryEventName =
  | 'quote.print.started'
  | 'quote.print.succeeded'
  | 'quote.print.failed'
  | 'quote.custom_report.print.started'
  | 'quote.custom_report.print.succeeded'
  | 'quote.custom_report.print.failed'
  | 'dispatch.offline.enqueue'
  | 'dispatch.offline.flush.completed'
  | 'dispatch.job.create.succeeded'
  | 'dispatch.job.create.failed'
  | 'dispatch.job.update.succeeded'
  | 'dispatch.job.update.failed';

interface SparkeryTelemetryEvent {
  id: string;
  name: SparkeryTelemetryEventName;
  timestamp: string;
  success?: boolean;
  durationMs?: number;
  data?: Record<string, unknown>;
}

const SPARKERY_TELEMETRY_STORAGE_KEY = 'sparkery_telemetry_events_v1';
const SPARKERY_TELEMETRY_LIMIT = 300;

const isBrowser = (): boolean =>
  typeof window !== 'undefined' && typeof localStorage !== 'undefined';

const createEventId = (): string =>
  `sparkery-telemetry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const isDevRuntime = (): boolean => {
  return (
    typeof process !== 'undefined' && process.env.NODE_ENV !== 'production'
  );
};

const loadTelemetryEvents = (): SparkeryTelemetryEvent[] => {
  if (!isBrowser()) {
    return [];
  }

  try {
    const raw = localStorage.getItem(SPARKERY_TELEMETRY_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(item => item && typeof item === 'object');
  } catch {
    return [];
  }
};

const saveTelemetryEvents = (events: SparkeryTelemetryEvent[]): void => {
  if (!isBrowser()) {
    return;
  }

  const trimmedEvents =
    events.length > SPARKERY_TELEMETRY_LIMIT
      ? events.slice(events.length - SPARKERY_TELEMETRY_LIMIT)
      : events;
  localStorage.setItem(
    SPARKERY_TELEMETRY_STORAGE_KEY,
    JSON.stringify(trimmedEvents)
  );
};

export const trackSparkeryEvent = (
  name: SparkeryTelemetryEventName,
  payload: {
    success?: boolean;
    durationMs?: number;
    data?: Record<string, unknown>;
  } = {}
): void => {
  const event: SparkeryTelemetryEvent = {
    id: createEventId(),
    name,
    timestamp: new Date().toISOString(),
    ...(typeof payload.success === 'boolean'
      ? { success: payload.success }
      : {}),
    ...(typeof payload.durationMs === 'number'
      ? { durationMs: payload.durationMs }
      : {}),
    ...(payload.data ? { data: payload.data } : {}),
  };

  const currentEvents = loadTelemetryEvents();
  currentEvents.push(event);
  saveTelemetryEvents(currentEvents);

  if (isDevRuntime() && typeof window !== 'undefined') {
    (
      window as Window & {
        __SPARKERY_TELEMETRY_LAST__?: SparkeryTelemetryEvent;
      }
    ).__SPARKERY_TELEMETRY_LAST__ = event;
  }
};

export const getSparkeryTelemetryEvents = (): SparkeryTelemetryEvent[] =>
  loadTelemetryEvents();

export const clearSparkeryTelemetryEvents = (): void => {
  if (!isBrowser()) {
    return;
  }
  localStorage.removeItem(SPARKERY_TELEMETRY_STORAGE_KEY);
};
