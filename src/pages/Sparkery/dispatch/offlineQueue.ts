import type { DispatchEmployeeLocation, DispatchJobStatus } from './types';
import {
  getSparkeryTelemetryActorRole,
  getSparkeryTelemetrySessionId,
  getSparkeryTelemetryUserId,
  trackSparkeryEvent,
} from '@/services/sparkeryTelemetry';

const OFFLINE_QUEUE_STORAGE_KEY = 'sparkery_dispatch_mobile_offline_queue_v1';
const OFFLINE_DEAD_LETTER_STORAGE_KEY =
  'sparkery_dispatch_mobile_offline_dead_letter_v1';
const DEFAULT_MAX_RETRIES = 5;
const DEFAULT_BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 60000;
const MAX_DEAD_LETTER_ITEMS = 200;
type DispatchOfflineFlushErrorCode =
  | 'DISPATCH_OFFLINE_FLUSH_NETWORK_UNAVAILABLE'
  | 'DISPATCH_OFFLINE_FLUSH_NETWORK_INTERRUPTED'
  | 'DISPATCH_OFFLINE_FLUSH_PARTIAL_FAILURE';

interface BaseOfflineAction {
  id: string;
  idempotencyKey: string;
  traceId?: string;
  type: 'update_job_status' | 'report_location';
  createdAt: string;
  attempts: number;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  lastError?: string;
}

export interface UpdateJobStatusOfflineAction extends BaseOfflineAction {
  type: 'update_job_status';
  payload: {
    jobId: string;
    status: DispatchJobStatus;
  };
}

export interface ReportLocationOfflineAction extends BaseOfflineAction {
  type: 'report_location';
  payload: {
    employeeId: string;
    location: Omit<DispatchEmployeeLocation, 'updatedAt'> & {
      updatedAt?: string;
    };
  };
}

export type DispatchOfflineQueueAction =
  | UpdateJobStatusOfflineAction
  | ReportLocationOfflineAction;

export type DispatchOfflineDeadLetterAction = DispatchOfflineQueueAction & {
  droppedAt: string;
  dropReason: string;
};

export interface DispatchOfflineQueueHandlers {
  updateJobStatus: (payload: {
    jobId: string;
    status: DispatchJobStatus;
  }) => Promise<void>;
  reportEmployeeLocation: (payload: {
    employeeId: string;
    location: Omit<DispatchEmployeeLocation, 'updatedAt'> & {
      updatedAt?: string;
    };
  }) => Promise<void>;
}

interface FlushOptions {
  maxRetries?: number;
  stopOnNetworkError?: boolean;
  userId?: string;
  actorRole?: string;
  sessionId?: string;
}

interface EnqueueOptions {
  userId?: string;
  actorRole?: string;
  sessionId?: string;
}

export interface FlushQueueResult {
  processed: number;
  synced: number;
  failed: number;
  remaining: number;
  deadLettered: number;
  networkFailed: boolean;
}

type EnqueuePayload =
  | {
      type: 'update_job_status';
      payload: {
        jobId: string;
        status: DispatchJobStatus;
      };
    }
  | {
      type: 'report_location';
      payload: {
        employeeId: string;
        location: Omit<DispatchEmployeeLocation, 'updatedAt'> & {
          updatedAt?: string;
        };
      };
    };

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return String(error || 'Unknown error');
};

const generateQueueId = (): string => {
  const time = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `dispatch-offline-${time}-${random}`;
};

const createDispatchOfflineTraceId = (operation: string): string =>
  `dispatch.offline.${operation}.${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;

const normalizeTelemetryValue = (value?: string): string | undefined =>
  typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;

const resolveDispatchOfflineTelemetryContext = (options?: {
  userId?: string;
  actorRole?: string;
  sessionId?: string;
}): {
  userId?: string;
  actorRole?: string;
  sessionId?: string;
} => {
  const userId =
    normalizeTelemetryValue(options?.userId) || getSparkeryTelemetryUserId();
  const actorRole =
    normalizeTelemetryValue(options?.actorRole) ||
    getSparkeryTelemetryActorRole();
  const sessionId =
    normalizeTelemetryValue(options?.sessionId) ||
    getSparkeryTelemetrySessionId();
  return {
    ...(userId ? { userId } : {}),
    ...(actorRole ? { actorRole } : {}),
    ...(sessionId ? { sessionId } : {}),
  };
};

const resolveIdempotencyKey = (action: EnqueuePayload): string => {
  if (action.type === 'update_job_status') {
    return `${action.type}:${action.payload.jobId}:${action.payload.status}`;
  }

  const locationUpdatedAt = action.payload.location.updatedAt || '';
  return `${action.type}:${action.payload.employeeId}:${locationUpdatedAt}`;
};

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

const isValidDate = (value?: string): boolean => {
  if (!value) {
    return false;
  }
  return !Number.isNaN(Date.parse(value));
};

const normalizeQueueAction = (
  action: DispatchOfflineQueueAction
): DispatchOfflineQueueAction => {
  const idempotencyKey =
    action.idempotencyKey ||
    (action.type === 'update_job_status'
      ? `${action.type}:${action.payload.jobId}:${action.payload.status}`
      : `${action.type}:${action.payload.employeeId}:${action.payload.location.updatedAt || ''}`);

  return {
    ...action,
    idempotencyKey,
    traceId:
      typeof action.traceId === 'string' && action.traceId.length > 0
        ? action.traceId
        : `dispatch.offline.action.${action.id}`,
    ...(isValidDate(action.lastAttemptAt)
      ? { lastAttemptAt: action.lastAttemptAt }
      : {}),
    ...(isValidDate(action.nextRetryAt)
      ? { nextRetryAt: action.nextRetryAt }
      : {}),
  };
};

const parseQueueAction = (
  value: unknown
): DispatchOfflineQueueAction | null => {
  if (!isObject(value)) {
    return null;
  }

  const type = value.type;
  if (type !== 'update_job_status' && type !== 'report_location') {
    return null;
  }

  if (typeof value.id !== 'string' || typeof value.createdAt !== 'string') {
    return null;
  }

  const attempts =
    typeof value.attempts === 'number' && value.attempts >= 0
      ? value.attempts
      : 0;

  if (type === 'update_job_status') {
    const payload = value.payload;
    if (!isObject(payload)) {
      return null;
    }
    if (
      typeof payload.jobId !== 'string' ||
      typeof payload.status !== 'string'
    ) {
      return null;
    }

    return normalizeQueueAction({
      id: value.id,
      idempotencyKey:
        typeof value.idempotencyKey === 'string' ? value.idempotencyKey : '',
      ...(typeof value.traceId === 'string' ? { traceId: value.traceId } : {}),
      type: 'update_job_status',
      createdAt: value.createdAt,
      attempts,
      ...(typeof value.lastAttemptAt === 'string'
        ? { lastAttemptAt: value.lastAttemptAt }
        : {}),
      ...(typeof value.nextRetryAt === 'string'
        ? { nextRetryAt: value.nextRetryAt }
        : {}),
      ...(typeof value.lastError === 'string'
        ? { lastError: value.lastError }
        : {}),
      payload: {
        jobId: payload.jobId,
        status: payload.status as DispatchJobStatus,
      },
    });
  }

  const payload = value.payload;
  if (!isObject(payload) || typeof payload.employeeId !== 'string') {
    return null;
  }
  if (!isObject(payload.location)) {
    return null;
  }

  return normalizeQueueAction({
    id: value.id,
    idempotencyKey:
      typeof value.idempotencyKey === 'string' ? value.idempotencyKey : '',
    ...(typeof value.traceId === 'string' ? { traceId: value.traceId } : {}),
    type: 'report_location',
    createdAt: value.createdAt,
    attempts,
    ...(typeof value.lastAttemptAt === 'string'
      ? { lastAttemptAt: value.lastAttemptAt }
      : {}),
    ...(typeof value.nextRetryAt === 'string'
      ? { nextRetryAt: value.nextRetryAt }
      : {}),
    ...(typeof value.lastError === 'string'
      ? { lastError: value.lastError }
      : {}),
    payload: {
      employeeId: payload.employeeId,
      location: payload.location as Omit<
        DispatchEmployeeLocation,
        'updatedAt'
      > & {
        updatedAt?: string;
      },
    },
  });
};

const parseDeadLetterAction = (
  value: unknown
): DispatchOfflineDeadLetterAction | null => {
  if (!isObject(value)) {
    return null;
  }

  if (
    typeof value.droppedAt !== 'string' ||
    typeof value.dropReason !== 'string'
  ) {
    return null;
  }

  const queueAction = parseQueueAction(value);
  if (!queueAction) {
    return null;
  }

  return {
    ...queueAction,
    droppedAt: value.droppedAt,
    dropReason: value.dropReason,
  };
};

const loadQueue = (): DispatchOfflineQueueAction[] => {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(item => parseQueueAction(item))
      .filter((item): item is DispatchOfflineQueueAction => item !== null);
  } catch {
    return [];
  }
};

const saveQueue = (queue: DispatchOfflineQueueAction[]): void => {
  localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(queue));
};

const loadDeadLetterQueue = (): DispatchOfflineDeadLetterAction[] => {
  try {
    const raw = localStorage.getItem(OFFLINE_DEAD_LETTER_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map(item => parseDeadLetterAction(item))
      .filter((item): item is DispatchOfflineDeadLetterAction => item !== null);
  } catch {
    return [];
  }
};

const saveDeadLetterQueue = (
  queue: DispatchOfflineDeadLetterAction[]
): void => {
  const trimmedQueue =
    queue.length > MAX_DEAD_LETTER_ITEMS
      ? queue.slice(queue.length - MAX_DEAD_LETTER_ITEMS)
      : queue;
  localStorage.setItem(
    OFFLINE_DEAD_LETTER_STORAGE_KEY,
    JSON.stringify(trimmedQueue)
  );
};

const buildRetryDelayMs = (attempt: number): number => {
  const safeAttempt = Math.max(1, attempt);
  const exponentialDelay = Math.min(
    MAX_RETRY_DELAY_MS,
    DEFAULT_BASE_RETRY_DELAY_MS * 2 ** (safeAttempt - 1)
  );
  const jitter = Math.floor(
    Math.random() * Math.max(250, Math.floor(exponentialDelay * 0.25))
  );
  return exponentialDelay + jitter;
};

export const getDispatchOfflineQueue = (): DispatchOfflineQueueAction[] =>
  loadQueue();

export const getDispatchOfflineQueueCount = (): number => loadQueue().length;

export const getDispatchOfflineDeadLetterQueue =
  (): DispatchOfflineDeadLetterAction[] => loadDeadLetterQueue();

export const clearDispatchOfflineQueue = (): void => {
  localStorage.removeItem(OFFLINE_QUEUE_STORAGE_KEY);
};

export const clearDispatchOfflineDeadLetterQueue = (): void => {
  localStorage.removeItem(OFFLINE_DEAD_LETTER_STORAGE_KEY);
};

export const isLikelyNetworkError = (error: unknown): boolean => {
  const text = toErrorMessage(error).toLowerCase();
  return (
    text.includes('failed to fetch') ||
    text.includes('networkerror') ||
    text.includes('network request failed') ||
    text.includes('load failed') ||
    text.includes('offline') ||
    text.includes('timeout')
  );
};

const resolveDispatchOfflineFlushErrorCode = (params: {
  networkFailed: boolean;
  failed: number;
}): DispatchOfflineFlushErrorCode | undefined => {
  if (params.networkFailed && params.failed === 0) {
    return 'DISPATCH_OFFLINE_FLUSH_NETWORK_UNAVAILABLE';
  }
  if (params.networkFailed) {
    return 'DISPATCH_OFFLINE_FLUSH_NETWORK_INTERRUPTED';
  }
  if (params.failed > 0) {
    return 'DISPATCH_OFFLINE_FLUSH_PARTIAL_FAILURE';
  }
  return undefined;
};

export const enqueueDispatchOfflineAction = (
  action: EnqueuePayload,
  options: EnqueueOptions = {}
): DispatchOfflineQueueAction => {
  const queue = loadQueue();
  const now = new Date().toISOString();
  const idempotencyKey = resolveIdempotencyKey(action);
  const traceId = createDispatchOfflineTraceId('enqueue');
  const telemetryContext = resolveDispatchOfflineTelemetryContext(options);

  let normalizedAction: DispatchOfflineQueueAction;
  if (action.type === 'update_job_status') {
    normalizedAction = {
      id: generateQueueId(),
      idempotencyKey,
      traceId,
      type: 'update_job_status',
      createdAt: now,
      attempts: 0,
      payload: action.payload,
    };
  } else {
    normalizedAction = {
      id: generateQueueId(),
      idempotencyKey,
      traceId,
      type: 'report_location',
      createdAt: now,
      attempts: 0,
      payload: action.payload,
    };
  }

  const deduplicated = queue.filter(existing => {
    if (existing.idempotencyKey === normalizedAction.idempotencyKey) {
      return false;
    }

    if (
      normalizedAction.type === 'update_job_status' &&
      existing.type === 'update_job_status'
    ) {
      return existing.payload.jobId !== normalizedAction.payload.jobId;
    }

    if (
      normalizedAction.type === 'report_location' &&
      existing.type === 'report_location'
    ) {
      return (
        existing.payload.employeeId !== normalizedAction.payload.employeeId
      );
    }

    return true;
  });

  deduplicated.push(normalizedAction);
  saveQueue(deduplicated);
  trackSparkeryEvent('dispatch.offline.enqueue', {
    success: true,
    data: {
      traceId,
      actionType: normalizedAction.type,
      queueSize: deduplicated.length,
      idempotencyKey: normalizedAction.idempotencyKey,
      ...telemetryContext,
    },
  });
  return normalizedAction;
};

export const flushDispatchOfflineQueue = async (
  handlers: DispatchOfflineQueueHandlers,
  options: FlushOptions = {}
): Promise<FlushQueueResult> => {
  const maxRetries = Math.max(1, options.maxRetries || DEFAULT_MAX_RETRIES);
  const stopOnNetworkError = options.stopOnNetworkError !== false;
  const telemetryContext = resolveDispatchOfflineTelemetryContext(options);
  const queue = loadQueue();
  const traceId = createDispatchOfflineTraceId('flush');

  if (queue.length === 0) {
    const result: FlushQueueResult = {
      processed: 0,
      synced: 0,
      failed: 0,
      remaining: 0,
      deadLettered: 0,
      networkFailed: false,
    };
    trackSparkeryEvent('dispatch.offline.flush.completed', {
      success: true,
      data: {
        traceId,
        ...result,
        ...telemetryContext,
      },
    });
    return result;
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const result: FlushQueueResult = {
      processed: 0,
      synced: 0,
      failed: 0,
      remaining: queue.length,
      deadLettered: 0,
      networkFailed: true,
    };
    trackSparkeryEvent('dispatch.offline.flush.completed', {
      success: false,
      data: {
        traceId,
        ...result,
        errorCode: 'DISPATCH_OFFLINE_FLUSH_NETWORK_UNAVAILABLE',
        ...telemetryContext,
      },
    });
    return result;
  }

  const remainingQueue: DispatchOfflineQueueAction[] = [];
  const deadLetterQueue = loadDeadLetterQueue();
  let processed = 0;
  let synced = 0;
  let failed = 0;
  let deadLettered = 0;
  let networkFailed = false;
  let failedActionTraceId: string | undefined;

  for (let index = 0; index < queue.length; index += 1) {
    const action = normalizeQueueAction(queue[index]!);

    if (action.nextRetryAt && Date.parse(action.nextRetryAt) > Date.now()) {
      remainingQueue.push(action);
      continue;
    }

    processed += 1;
    try {
      if (action.type === 'update_job_status') {
        await handlers.updateJobStatus(action.payload);
      } else {
        await handlers.reportEmployeeLocation(action.payload);
      }
      synced += 1;
    } catch (error) {
      failed += 1;
      failedActionTraceId = action.traceId;
      const nextAttempts = action.attempts + 1;
      const errorMessage = toErrorMessage(error);
      const networkError = isLikelyNetworkError(error);
      const now = new Date().toISOString();
      const retryable = nextAttempts < maxRetries;

      if (retryable) {
        const retryDelayMs = buildRetryDelayMs(nextAttempts);
        remainingQueue.push({
          ...action,
          attempts: nextAttempts,
          lastAttemptAt: now,
          nextRetryAt: new Date(Date.now() + retryDelayMs).toISOString(),
          lastError: errorMessage,
        });
      } else {
        deadLettered += 1;
        deadLetterQueue.push({
          ...action,
          attempts: nextAttempts,
          lastAttemptAt: now,
          lastError: errorMessage,
          droppedAt: now,
          dropReason: networkError
            ? `network_error_after_${nextAttempts}_attempts`
            : `max_retries_exceeded_${nextAttempts}`,
        });
      }

      if (networkError && stopOnNetworkError) {
        networkFailed = true;
        for (
          let pendingIndex = index + 1;
          pendingIndex < queue.length;
          pendingIndex += 1
        ) {
          remainingQueue.push(normalizeQueueAction(queue[pendingIndex]!));
        }
        break;
      }
    }
  }

  saveQueue(remainingQueue);
  saveDeadLetterQueue(deadLetterQueue);

  const flushErrorCode = resolveDispatchOfflineFlushErrorCode({
    networkFailed,
    failed,
  });
  trackSparkeryEvent('dispatch.offline.flush.completed', {
    success: !networkFailed && failed === 0,
    data: {
      traceId,
      processed,
      synced,
      failed,
      remaining: remainingQueue.length,
      deadLettered,
      networkFailed,
      ...(flushErrorCode ? { errorCode: flushErrorCode } : {}),
      ...(failedActionTraceId ? { failedActionTraceId } : {}),
      ...telemetryContext,
    },
  });

  return {
    processed,
    synced,
    failed,
    remaining: remainingQueue.length,
    deadLettered,
    networkFailed,
  };
};
