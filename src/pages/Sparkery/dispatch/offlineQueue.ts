import type { DispatchEmployeeLocation, DispatchJobStatus } from './types';

const OFFLINE_QUEUE_STORAGE_KEY = 'sparkery_dispatch_mobile_offline_queue_v1';
const DEFAULT_MAX_RETRIES = 5;

interface BaseOfflineAction {
  id: string;
  type: 'update_job_status' | 'report_location';
  createdAt: string;
  attempts: number;
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
}

export interface FlushQueueResult {
  processed: number;
  synced: number;
  failed: number;
  remaining: number;
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
    return parsed.filter(item => item && typeof item === 'object');
  } catch {
    return [];
  }
};

const saveQueue = (queue: DispatchOfflineQueueAction[]): void => {
  localStorage.setItem(OFFLINE_QUEUE_STORAGE_KEY, JSON.stringify(queue));
};

export const getDispatchOfflineQueue = (): DispatchOfflineQueueAction[] =>
  loadQueue();

export const getDispatchOfflineQueueCount = (): number => loadQueue().length;

export const clearDispatchOfflineQueue = (): void => {
  localStorage.removeItem(OFFLINE_QUEUE_STORAGE_KEY);
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

export const enqueueDispatchOfflineAction = (
  action: EnqueuePayload
): DispatchOfflineQueueAction => {
  const queue = loadQueue();
  const now = new Date().toISOString();

  let normalizedAction: DispatchOfflineQueueAction;
  if (action.type === 'update_job_status') {
    normalizedAction = {
      id: generateQueueId(),
      type: 'update_job_status',
      createdAt: now,
      attempts: 0,
      payload: action.payload,
    };
  } else {
    normalizedAction = {
      id: generateQueueId(),
      type: 'report_location',
      createdAt: now,
      attempts: 0,
      payload: action.payload,
    };
  }

  const deduplicated = queue.filter(existing => {
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
  return normalizedAction;
};

export const flushDispatchOfflineQueue = async (
  handlers: DispatchOfflineQueueHandlers,
  options: FlushOptions = {}
): Promise<FlushQueueResult> => {
  const maxRetries = Math.max(1, options.maxRetries || DEFAULT_MAX_RETRIES);
  const stopOnNetworkError = options.stopOnNetworkError !== false;
  const queue = loadQueue();

  if (queue.length === 0) {
    return {
      processed: 0,
      synced: 0,
      failed: 0,
      remaining: 0,
      networkFailed: false,
    };
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return {
      processed: 0,
      synced: 0,
      failed: 0,
      remaining: queue.length,
      networkFailed: true,
    };
  }

  const remainingQueue: DispatchOfflineQueueAction[] = [];
  let processed = 0;
  let synced = 0;
  let failed = 0;
  let networkFailed = false;

  for (let index = 0; index < queue.length; index += 1) {
    const action = queue[index]!;
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
      const nextAttempts = action.attempts + 1;
      const errorMessage = toErrorMessage(error);
      const networkError = isLikelyNetworkError(error);
      const retryable = networkError || nextAttempts < maxRetries;

      if (retryable) {
        remainingQueue.push({
          ...action,
          attempts: nextAttempts,
          lastError: errorMessage,
        });
      }

      if (networkError && stopOnNetworkError) {
        networkFailed = true;
        for (
          let pendingIndex = index + 1;
          pendingIndex < queue.length;
          pendingIndex += 1
        ) {
          remainingQueue.push(queue[pendingIndex]!);
        }
        break;
      }
    }
  }

  saveQueue(remainingQueue);

  return {
    processed,
    synced,
    failed,
    remaining: remainingQueue.length,
    networkFailed,
  };
};
