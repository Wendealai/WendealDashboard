import type {
  CreateDispatchJobPayload,
  DispatchJob,
  DispatchJobStatus,
  UpdateDispatchJobPayload,
} from '@/pages/Sparkery/dispatch/types';
import {
  getSparkeryTelemetryActorRole,
  getSparkeryTelemetrySessionId,
  getSparkeryTelemetryUserId,
} from '@/services/sparkeryTelemetry';
import { createSparkeryIdempotencyKey } from '@/services/sparkeryIdempotency';
import {
  ensureSupabaseRows,
  isSupabaseDispatchJobRowValue,
  toJob,
  toJobRow,
  type SupabaseDispatchJobRow,
} from './mapperLayer';
import type { SupabaseConfig } from './apiLayer';

type SupabaseFetch = <T>(path: string, options?: RequestInit) => Promise<T>;

type TrackSparkeryEvent = (
  name:
    | 'dispatch.job.create.succeeded'
    | 'dispatch.job.create.failed'
    | 'dispatch.job.update.succeeded'
    | 'dispatch.job.update.failed',
  payload: {
    success?: boolean;
    durationMs?: number;
    data?: Record<string, unknown>;
  }
) => void;

interface DispatchStorageWithJobs {
  jobs: DispatchJob[];
  [key: string]: unknown;
}

export interface DispatchJobsDomainDependencies {
  getSupabaseConfig: () => SupabaseConfig | null;
  supabaseFetch: SupabaseFetch;
  loadStorage: () => DispatchStorageWithJobs;
  saveStorage: (storage: DispatchStorageWithJobs) => void;
  trackSparkeryEvent: TrackSparkeryEvent;
  generateId: (prefix: string) => string;
}

export interface DispatchJobsDomainService {
  getJobs(params?: {
    weekStart?: string;
    weekEnd?: string;
  }): Promise<DispatchJob[]>;
  createJob(
    payload: CreateDispatchJobPayload,
    options?: DispatchJobMutationOptions
  ): Promise<DispatchJob>;
  updateJob(
    id: string,
    patch: UpdateDispatchJobPayload,
    options?: DispatchJobMutationOptions
  ): Promise<DispatchJob>;
  assignJob(
    id: string,
    employeeIds: string[],
    options?: DispatchJobMutationOptions
  ): Promise<DispatchJob>;
  updateJobStatus(
    id: string,
    status: DispatchJobStatus,
    options?: DispatchJobMutationOptions
  ): Promise<DispatchJob>;
  deleteJob(id: string): Promise<void>;
  applyJobFinanceAdjustment(
    id: string,
    adjustmentDelta: number,
    options?: DispatchJobMutationOptions
  ): Promise<DispatchJob>;
  confirmJobFinance(
    id: string,
    confirmedBy?: string,
    options?: DispatchJobMutationOptions
  ): Promise<DispatchJob>;
  setJobPaymentReceived(
    id: string,
    received: boolean,
    receivedBy?: string,
    options?: DispatchJobMutationOptions
  ): Promise<DispatchJob>;
}

export interface DispatchJobMutationOptions {
  userId?: string;
  actorRole?: string;
  sessionId?: string;
}

const roundMoney = (value: number): number =>
  Number((Number.isFinite(value) ? value : 0).toFixed(2));

const calculateReceivableTotal = (
  baseFee?: number,
  manualAdjustment?: number
): number => roundMoney((baseFee || 0) + (manualAdjustment || 0));

const isSupabaseMissingColumnError = (
  error: unknown,
  columnName: string
): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  const targetColumn = columnName.toLowerCase();
  return (
    message.includes(targetColumn) &&
    ((message.includes('column') && message.includes('does not exist')) ||
      (message.includes('schema cache') &&
        (message.includes('could not find') || message.includes('not found'))))
  );
};

const DISPATCH_FINANCE_SCHEMA_ERROR_MESSAGE =
  'Dispatch finance schema is missing in Supabase. Run docs/supabase/dispatch-finance.sql in SQL Editor, then refresh.';

const isSupabaseMissingDispatchFinanceSchemaError = (error: unknown): boolean =>
  isSupabaseMissingColumnError(error, 'pricing_mode') ||
  isSupabaseMissingColumnError(error, 'fee_currency') ||
  isSupabaseMissingColumnError(error, 'base_fee') ||
  isSupabaseMissingColumnError(error, 'manual_adjustment') ||
  isSupabaseMissingColumnError(error, 'receivable_total') ||
  isSupabaseMissingColumnError(error, 'finance_confirmed_at') ||
  isSupabaseMissingColumnError(error, 'finance_confirmed_by') ||
  isSupabaseMissingColumnError(error, 'finance_locked_at') ||
  isSupabaseMissingColumnError(error, 'finance_lock_reason') ||
  isSupabaseMissingColumnError(error, 'payment_received_at') ||
  isSupabaseMissingColumnError(error, 'payment_received_by') ||
  isSupabaseMissingColumnError(error, 'recurring_fee');

const isSupabaseMissingPaymentTrackingColumnError = (error: unknown): boolean =>
  isSupabaseMissingColumnError(error, 'payment_received_at') ||
  isSupabaseMissingColumnError(error, 'payment_received_by');

const DISPATCH_JOB_SELECT_COLUMNS = [
  'id',
  'title',
  'description',
  'notes',
  'image_urls',
  'customer_profile_id',
  'customer_name',
  'customer_address',
  'customer_phone',
  'service_type',
  'property_type',
  'estimated_duration_hours',
  'status',
  'priority',
  'scheduled_date',
  'scheduled_start_time',
  'scheduled_end_time',
  'assigned_employee_ids',
  'pricing_mode',
  'fee_currency',
  'base_fee',
  'manual_adjustment',
  'receivable_total',
  'finance_confirmed_at',
  'finance_confirmed_by',
  'finance_locked_at',
  'finance_lock_reason',
  'payment_received_at',
  'payment_received_by',
  'created_at',
  'updated_at',
].join(',');

const DISPATCH_JOB_SELECT_COLUMNS_NO_PAYMENT =
  DISPATCH_JOB_SELECT_COLUMNS.split(',')
    .filter(
      column =>
        column !== 'payment_received_at' && column !== 'payment_received_by'
    )
    .join(',');

const buildDispatchJobsQuery = (params?: {
  weekStart?: string;
  weekEnd?: string;
  id?: string;
  limit?: number;
  includePaymentColumns?: boolean;
}): URLSearchParams => {
  const selectColumns =
    params?.includePaymentColumns === false
      ? DISPATCH_JOB_SELECT_COLUMNS_NO_PAYMENT
      : DISPATCH_JOB_SELECT_COLUMNS;
  const query = new URLSearchParams({
    select: selectColumns,
    order: 'scheduled_date.asc,scheduled_start_time.asc',
  });

  if (params?.weekStart) {
    query.append('scheduled_date', `gte.${params.weekStart}`);
  }
  if (params?.weekEnd) {
    query.append('scheduled_date', `lte.${params.weekEnd}`);
  }
  if (params?.id) {
    query.append('id', `eq.${params.id}`);
  }
  if (typeof params?.limit === 'number') {
    query.append('limit', String(params.limit));
  }

  return query;
};

const isJobFinanceLocked = (
  job: Pick<DispatchJob, 'financeLockedAt' | 'financeConfirmedAt'>
): boolean => Boolean(job.financeLockedAt || job.financeConfirmedAt);

const hasLockedFieldChange = (
  patch: UpdateDispatchJobPayload,
  keys: Array<keyof UpdateDispatchJobPayload>
): boolean =>
  keys.some(
    key =>
      Object.prototype.hasOwnProperty.call(patch, key) &&
      typeof patch[key] !== 'undefined'
  );

type DispatchJobTelemetryErrorCode =
  | 'DISPATCH_FINANCE_SCHEMA_MISSING'
  | 'DISPATCH_SUPABASE_REQUEST_FAILED'
  | 'DISPATCH_SUPABASE_EMPTY_RESPONSE';

const createDispatchTraceId = (operation: string): string =>
  `dispatch.${operation}.${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const resolveDispatchJobErrorCode = (
  error: unknown,
  fallback: DispatchJobTelemetryErrorCode
): DispatchJobTelemetryErrorCode => {
  if (isSupabaseMissingDispatchFinanceSchemaError(error)) {
    return 'DISPATCH_FINANCE_SCHEMA_MISSING';
  }
  return fallback;
};

const normalizeTelemetryField = (value?: string): string | undefined =>
  typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;

const resolveDispatchJobTelemetryContext = (
  options?: DispatchJobMutationOptions
): {
  userId?: string;
  actorRole?: string;
  sessionId?: string;
} => {
  const userId =
    normalizeTelemetryField(options?.userId) || getSparkeryTelemetryUserId();
  const actorRole =
    normalizeTelemetryField(options?.actorRole) ||
    getSparkeryTelemetryActorRole();
  const sessionId =
    normalizeTelemetryField(options?.sessionId) ||
    getSparkeryTelemetrySessionId();
  return {
    ...(userId ? { userId } : {}),
    ...(actorRole ? { actorRole } : {}),
    ...(sessionId ? { sessionId } : {}),
  };
};

type DispatchFinanceAuditAction =
  | 'finance_adjustment_applied'
  | 'finance_confirmed'
  | 'payment_received_marked'
  | 'payment_received_unmarked';

const writeDispatchFinanceAuditLog = async (
  deps: DispatchJobsDomainDependencies,
  params: {
    action: DispatchFinanceAuditAction;
    jobId: string;
    traceId: string;
    before: DispatchJob;
    after: DispatchJob;
    telemetryContext: {
      userId?: string;
      actorRole?: string;
      sessionId?: string;
    };
    metadata?: Record<string, unknown>;
  }
): Promise<void> => {
  if (!deps.getSupabaseConfig()) {
    return;
  }

  const row = {
    job_id: params.jobId,
    action: params.action,
    trace_id: params.traceId,
    actor_user_id: params.telemetryContext.userId || null,
    actor_role: params.telemetryContext.actorRole || null,
    session_id: params.telemetryContext.sessionId || null,
    before_payload: params.before,
    after_payload: params.after,
    metadata: params.metadata || null,
    created_at: new Date().toISOString(),
  };

  try {
    await deps.supabaseFetch<unknown[]>(
      '/rest/v1/dispatch_finance_audit_logs',
      {
        method: 'POST',
        headers: {
          Prefer: 'return=minimal',
        },
        body: JSON.stringify([row]),
      }
    );
  } catch {
    // Best-effort audit logging. Main mutation should not fail because of audit write.
  }
};

export const createDispatchJobsDomainService = (
  deps: DispatchJobsDomainDependencies
): DispatchJobsDomainService => {
  const service: DispatchJobsDomainService = {
    async getJobs(params?: { weekStart?: string; weekEnd?: string }) {
      if (deps.getSupabaseConfig()) {
        const query = buildDispatchJobsQuery(params);

        let rows: SupabaseDispatchJobRow[];
        try {
          const rowsRaw = await deps.supabaseFetch<unknown[]>(
            `/rest/v1/dispatch_jobs?${query.toString()}`
          );
          rows = ensureSupabaseRows(
            rowsRaw,
            isSupabaseDispatchJobRowValue,
            'dispatch_jobs'
          );
        } catch (error) {
          if (isSupabaseMissingPaymentTrackingColumnError(error)) {
            const fallbackQuery = buildDispatchJobsQuery({
              ...params,
              includePaymentColumns: false,
            });
            const fallbackRowsRaw = await deps.supabaseFetch<unknown[]>(
              `/rest/v1/dispatch_jobs?${fallbackQuery.toString()}`
            );
            rows = ensureSupabaseRows(
              fallbackRowsRaw,
              isSupabaseDispatchJobRowValue,
              'dispatch_jobs'
            );
            return rows.map(toJob);
          }
          if (isSupabaseMissingDispatchFinanceSchemaError(error)) {
            throw new Error(DISPATCH_FINANCE_SCHEMA_ERROR_MESSAGE);
          }
          throw error;
        }
        return rows.map(toJob);
      }

      const storage = deps.loadStorage();
      if (!params?.weekStart || !params.weekEnd) {
        return storage.jobs;
      }

      return storage.jobs.filter(job => {
        return (
          job.scheduledDate >= params.weekStart! &&
          job.scheduledDate <= params.weekEnd!
        );
      });
    },

    async createJob(
      payload: CreateDispatchJobPayload,
      options?: DispatchJobMutationOptions
    ) {
      const startedAt = Date.now();
      const traceId = createDispatchTraceId('job.create');
      const telemetryContext = resolveDispatchJobTelemetryContext(options);
      const idempotencyKey = createSparkeryIdempotencyKey(
        'dispatch.job.create',
        payload
      );
      const normalizedPricingMode =
        payload.pricingMode ||
        (payload.recurringEnabled ? 'recurring_fixed' : 'one_time_manual');
      const normalizedBaseFee = roundMoney(payload.baseFee || 0);
      const normalizedAdjustment = roundMoney(payload.manualAdjustment || 0);
      const normalizedReceivableTotal = calculateReceivableTotal(
        normalizedBaseFee,
        normalizedAdjustment
      );

      if (deps.getSupabaseConfig()) {
        const now = new Date().toISOString();
        const id = deps.generateId('job');
        const row = toJobRow(
          {
            ...payload,
            status: 'pending',
            assignedEmployeeIds: [],
            pricingMode: normalizedPricingMode,
            feeCurrency: 'AUD',
            baseFee: normalizedBaseFee,
            manualAdjustment: normalizedAdjustment,
            receivableTotal: normalizedReceivableTotal,
          },
          id,
          now,
          now
        );
        let result: SupabaseDispatchJobRow[];
        try {
          const resultRaw = await deps.supabaseFetch<unknown[]>(
            '/rest/v1/dispatch_jobs?on_conflict=id',
            {
              method: 'POST',
              headers: {
                Prefer: 'resolution=merge-duplicates,return=representation',
                'X-Idempotency-Key': idempotencyKey,
              },
              body: JSON.stringify([row]),
            }
          );
          result = ensureSupabaseRows(
            resultRaw,
            isSupabaseDispatchJobRowValue,
            'dispatch_jobs'
          );
        } catch (error) {
          const errorCode = resolveDispatchJobErrorCode(
            error,
            'DISPATCH_SUPABASE_REQUEST_FAILED'
          );
          deps.trackSparkeryEvent('dispatch.job.create.failed', {
            success: false,
            durationMs: Date.now() - startedAt,
            data: {
              traceId,
              errorCode,
              source: 'supabase',
              reason: error instanceof Error ? error.message : 'unknown_error',
              idempotencyKey,
              ...telemetryContext,
            },
          });
          if (isSupabaseMissingDispatchFinanceSchemaError(error)) {
            throw new Error(DISPATCH_FINANCE_SCHEMA_ERROR_MESSAGE);
          }
          throw error;
        }
        const first = result[0];
        if (!first) {
          deps.trackSparkeryEvent('dispatch.job.create.failed', {
            success: false,
            durationMs: Date.now() - startedAt,
            data: {
              traceId,
              errorCode: 'DISPATCH_SUPABASE_EMPTY_RESPONSE',
              source: 'supabase',
              reason: 'empty_response_rows',
              idempotencyKey,
              ...telemetryContext,
            },
          });
          throw new Error('Supabase job creation returned no rows');
        }
        const createdJob = toJob(first);
        deps.trackSparkeryEvent('dispatch.job.create.succeeded', {
          success: true,
          durationMs: Date.now() - startedAt,
          data: {
            traceId,
            source: 'supabase',
            jobId: createdJob.id,
            serviceType: createdJob.serviceType,
            idempotencyKey,
            ...telemetryContext,
          },
        });
        return createdJob;
      }

      const storage = deps.loadStorage();
      const now = new Date().toISOString();
      const job: DispatchJob = {
        id: deps.generateId('job'),
        title: payload.title,
        serviceType: payload.serviceType,
        status: 'pending',
        priority: payload.priority,
        scheduledDate: payload.scheduledDate,
        scheduledStartTime: payload.scheduledStartTime,
        scheduledEndTime: payload.scheduledEndTime,
        pricingMode: normalizedPricingMode,
        feeCurrency: 'AUD',
        baseFee: normalizedBaseFee,
        manualAdjustment: normalizedAdjustment,
        receivableTotal: normalizedReceivableTotal,
        createdAt: now,
        updatedAt: now,
      };
      if (payload.description) job.description = payload.description;
      if (payload.notes) job.notes = payload.notes;
      if (payload.imageUrls && payload.imageUrls.length > 0) {
        job.imageUrls = payload.imageUrls;
      }
      if (payload.customerProfileId) {
        job.customerProfileId = payload.customerProfileId;
      }
      if (payload.customerName) job.customerName = payload.customerName;
      if (payload.customerAddress)
        job.customerAddress = payload.customerAddress;
      if (payload.customerPhone) job.customerPhone = payload.customerPhone;
      if (payload.propertyType) job.propertyType = payload.propertyType;
      if (typeof payload.estimatedDurationHours === 'number') {
        job.estimatedDurationHours = payload.estimatedDurationHours;
      }
      storage.jobs.unshift(job);
      deps.saveStorage(storage);
      deps.trackSparkeryEvent('dispatch.job.create.succeeded', {
        success: true,
        durationMs: Date.now() - startedAt,
        data: {
          traceId,
          source: 'local',
          jobId: job.id,
          serviceType: job.serviceType,
          idempotencyKey,
          ...telemetryContext,
        },
      });
      return job;
    },

    async updateJob(
      id: string,
      patch: UpdateDispatchJobPayload,
      options?: DispatchJobMutationOptions
    ) {
      const startedAt = Date.now();
      const traceId = createDispatchTraceId('job.update');
      const telemetryContext = resolveDispatchJobTelemetryContext(options);
      const idempotencyKey = createSparkeryIdempotencyKey(
        'dispatch.job.update',
        {
          id,
          patch,
        }
      );
      if (deps.getSupabaseConfig()) {
        const query = buildDispatchJobsQuery({ id, limit: 1 });
        let existingList: SupabaseDispatchJobRow[];
        try {
          const existingListRaw = await deps.supabaseFetch<unknown[]>(
            `/rest/v1/dispatch_jobs?${query.toString()}`
          );
          existingList = ensureSupabaseRows(
            existingListRaw,
            isSupabaseDispatchJobRowValue,
            'dispatch_jobs'
          );
        } catch (error) {
          if (isSupabaseMissingPaymentTrackingColumnError(error)) {
            const fallbackQuery = buildDispatchJobsQuery({
              id,
              limit: 1,
              includePaymentColumns: false,
            });
            const fallbackExistingRaw = await deps.supabaseFetch<unknown[]>(
              `/rest/v1/dispatch_jobs?${fallbackQuery.toString()}`
            );
            existingList = ensureSupabaseRows(
              fallbackExistingRaw,
              isSupabaseDispatchJobRowValue,
              'dispatch_jobs'
            );
          } else if (isSupabaseMissingDispatchFinanceSchemaError(error)) {
            deps.trackSparkeryEvent('dispatch.job.update.failed', {
              success: false,
              durationMs: Date.now() - startedAt,
              data: {
                traceId,
                errorCode: 'DISPATCH_FINANCE_SCHEMA_MISSING',
                source: 'supabase',
                stage: 'fetch_existing',
                jobId: id,
                reason:
                  error instanceof Error ? error.message : 'unknown_error',
                idempotencyKey,
                ...telemetryContext,
              },
            });
            throw new Error(DISPATCH_FINANCE_SCHEMA_ERROR_MESSAGE);
          } else {
            deps.trackSparkeryEvent('dispatch.job.update.failed', {
              success: false,
              durationMs: Date.now() - startedAt,
              data: {
                traceId,
                errorCode: 'DISPATCH_SUPABASE_REQUEST_FAILED',
                source: 'supabase',
                stage: 'fetch_existing',
                jobId: id,
                reason:
                  error instanceof Error ? error.message : 'unknown_error',
                idempotencyKey,
                ...telemetryContext,
              },
            });
            throw error;
          }
        }
        const existing = existingList[0];
        if (!existing) {
          throw new Error('Job not found');
        }

        const current = toJob(existing);
        if (isJobFinanceLocked(current)) {
          const blockedFields: Array<keyof UpdateDispatchJobPayload> = [
            'title',
            'description',
            'notes',
            'imageUrls',
            'customerProfileId',
            'customerName',
            'customerAddress',
            'customerPhone',
            'serviceType',
            'propertyType',
            'estimatedDurationHours',
            'status',
            'priority',
            'scheduledDate',
            'scheduledStartTime',
            'scheduledEndTime',
            'assignedEmployeeIds',
            'pricingMode',
            'baseFee',
            'manualAdjustment',
            'receivableTotal',
          ];
          if (hasLockedFieldChange(patch, blockedFields)) {
            throw new Error(
              'This job is finance-locked and cannot be edited. Add a finance adjustment instead.'
            );
          }
        }

        const nextBaseFee =
          typeof patch.baseFee === 'number'
            ? roundMoney(patch.baseFee)
            : current.baseFee || 0;
        const nextAdjustment =
          typeof patch.manualAdjustment === 'number'
            ? roundMoney(patch.manualAdjustment)
            : current.manualAdjustment || 0;
        const nextReceivableTotal =
          typeof patch.receivableTotal === 'number'
            ? roundMoney(patch.receivableTotal)
            : hasLockedFieldChange(patch, ['baseFee', 'manualAdjustment'])
              ? calculateReceivableTotal(nextBaseFee, nextAdjustment)
              : typeof current.receivableTotal === 'number'
                ? current.receivableTotal
                : calculateReceivableTotal(nextBaseFee, nextAdjustment);

        const merged: DispatchJob = {
          ...current,
          ...patch,
          id,
          baseFee: nextBaseFee,
          manualAdjustment: nextAdjustment,
          receivableTotal: nextReceivableTotal,
          feeCurrency: patch.feeCurrency || current.feeCurrency || 'AUD',
          pricingMode:
            patch.pricingMode || current.pricingMode || 'one_time_manual',
          createdAt: current.createdAt,
          updatedAt: new Date().toISOString(),
        };
        const hasField = (key: keyof UpdateDispatchJobPayload): boolean =>
          Object.prototype.hasOwnProperty.call(patch, key);
        const row: Partial<SupabaseDispatchJobRow> = {
          updated_at: merged.updatedAt,
        };

        if (hasField('title')) {
          row.title = merged.title;
        }
        if (hasField('description')) {
          row.description = merged.description || null;
        }
        if (hasField('notes')) {
          row.notes = merged.notes || null;
        }
        if (hasField('imageUrls')) {
          row.image_urls = merged.imageUrls || null;
        }
        if (hasField('customerProfileId')) {
          row.customer_profile_id = merged.customerProfileId || null;
        }
        if (hasField('customerName')) {
          row.customer_name = merged.customerName || null;
        }
        if (hasField('customerAddress')) {
          row.customer_address = merged.customerAddress || null;
        }
        if (hasField('customerPhone')) {
          row.customer_phone = merged.customerPhone || null;
        }
        if (hasField('serviceType')) {
          row.service_type = merged.serviceType;
        }
        if (hasField('propertyType')) {
          row.property_type = merged.propertyType || null;
        }
        if (hasField('estimatedDurationHours')) {
          row.estimated_duration_hours = merged.estimatedDurationHours ?? null;
        }
        if (hasField('status')) {
          row.status = merged.status;
        }
        if (hasField('priority')) {
          row.priority = merged.priority;
        }
        if (hasField('scheduledDate')) {
          row.scheduled_date = merged.scheduledDate;
        }
        if (hasField('scheduledStartTime')) {
          row.scheduled_start_time = merged.scheduledStartTime;
        }
        if (hasField('scheduledEndTime')) {
          row.scheduled_end_time = merged.scheduledEndTime;
        }
        if (hasField('assignedEmployeeIds')) {
          row.assigned_employee_ids = merged.assignedEmployeeIds || null;
        }
        if (hasField('pricingMode')) {
          row.pricing_mode = merged.pricingMode || 'one_time_manual';
        }
        if (hasField('feeCurrency')) {
          row.fee_currency = merged.feeCurrency || 'AUD';
        }
        if (hasField('baseFee')) {
          row.base_fee = nextBaseFee;
        }
        if (hasField('manualAdjustment')) {
          row.manual_adjustment = nextAdjustment;
        }
        if (
          hasLockedFieldChange(patch, [
            'baseFee',
            'manualAdjustment',
            'receivableTotal',
          ])
        ) {
          row.receivable_total = nextReceivableTotal;
        }
        if (hasField('financeConfirmedAt')) {
          row.finance_confirmed_at = merged.financeConfirmedAt || null;
        }
        if (hasField('financeConfirmedBy')) {
          row.finance_confirmed_by = merged.financeConfirmedBy || null;
        }
        if (hasField('financeLockedAt')) {
          row.finance_locked_at = merged.financeLockedAt || null;
        }
        if (hasField('financeLockReason')) {
          row.finance_lock_reason = merged.financeLockReason || null;
        }
        if (hasField('paymentReceivedAt')) {
          row.payment_received_at = merged.paymentReceivedAt || null;
        }
        if (hasField('paymentReceivedBy')) {
          row.payment_received_by = merged.paymentReceivedBy || null;
        }

        let result: SupabaseDispatchJobRow[];
        try {
          const encodedId = encodeURIComponent(id);
          const resultRaw = await deps.supabaseFetch<unknown[]>(
            `/rest/v1/dispatch_jobs?id=eq.${encodedId}`,
            {
              method: 'PATCH',
              headers: {
                Prefer: 'return=representation',
                'X-Idempotency-Key': idempotencyKey,
              },
              body: JSON.stringify(row),
            }
          );
          result = ensureSupabaseRows(
            resultRaw,
            isSupabaseDispatchJobRowValue,
            'dispatch_jobs'
          );
        } catch (error) {
          const errorCode = resolveDispatchJobErrorCode(
            error,
            'DISPATCH_SUPABASE_REQUEST_FAILED'
          );
          deps.trackSparkeryEvent('dispatch.job.update.failed', {
            success: false,
            durationMs: Date.now() - startedAt,
            data: {
              traceId,
              errorCode,
              source: 'supabase',
              stage: 'patch',
              jobId: id,
              reason: error instanceof Error ? error.message : 'unknown_error',
              idempotencyKey,
              ...telemetryContext,
            },
          });
          if (isSupabaseMissingDispatchFinanceSchemaError(error)) {
            throw new Error(DISPATCH_FINANCE_SCHEMA_ERROR_MESSAGE);
          }
          throw error;
        }
        const first = result[0];
        if (!first) {
          deps.trackSparkeryEvent('dispatch.job.update.failed', {
            success: false,
            durationMs: Date.now() - startedAt,
            data: {
              traceId,
              errorCode: 'DISPATCH_SUPABASE_EMPTY_RESPONSE',
              source: 'supabase',
              stage: 'patch',
              jobId: id,
              reason: 'empty_response_rows',
              idempotencyKey,
              ...telemetryContext,
            },
          });
          throw new Error('Supabase job update returned no rows');
        }
        const updatedJob = toJob(first);
        deps.trackSparkeryEvent('dispatch.job.update.succeeded', {
          success: true,
          durationMs: Date.now() - startedAt,
          data: {
            traceId,
            source: 'supabase',
            jobId: updatedJob.id,
            idempotencyKey,
            ...telemetryContext,
          },
        });
        return updatedJob;
      }

      const storage = deps.loadStorage();
      const idx = storage.jobs.findIndex(job => job.id === id);
      if (idx === -1) {
        throw new Error('Job not found');
      }
      const existing = storage.jobs[idx];
      if (!existing) {
        throw new Error('Job not found');
      }
      if (isJobFinanceLocked(existing)) {
        const blockedFields: Array<keyof UpdateDispatchJobPayload> = [
          'title',
          'description',
          'notes',
          'imageUrls',
          'customerProfileId',
          'customerName',
          'customerAddress',
          'customerPhone',
          'serviceType',
          'propertyType',
          'estimatedDurationHours',
          'status',
          'priority',
          'scheduledDate',
          'scheduledStartTime',
          'scheduledEndTime',
          'assignedEmployeeIds',
          'pricingMode',
          'baseFee',
          'manualAdjustment',
          'receivableTotal',
        ];
        if (hasLockedFieldChange(patch, blockedFields)) {
          throw new Error(
            'This job is finance-locked and cannot be edited. Add a finance adjustment instead.'
          );
        }
      }
      const nextBaseFee =
        typeof patch.baseFee === 'number'
          ? roundMoney(patch.baseFee)
          : existing.baseFee || 0;
      const nextAdjustment =
        typeof patch.manualAdjustment === 'number'
          ? roundMoney(patch.manualAdjustment)
          : existing.manualAdjustment || 0;
      const nextReceivableTotal =
        typeof patch.receivableTotal === 'number'
          ? roundMoney(patch.receivableTotal)
          : hasLockedFieldChange(patch, ['baseFee', 'manualAdjustment'])
            ? calculateReceivableTotal(nextBaseFee, nextAdjustment)
            : typeof existing.receivableTotal === 'number'
              ? existing.receivableTotal
              : calculateReceivableTotal(nextBaseFee, nextAdjustment);
      const updated: DispatchJob = {
        ...existing,
        ...patch,
        baseFee: nextBaseFee,
        manualAdjustment: nextAdjustment,
        receivableTotal: nextReceivableTotal,
        feeCurrency: patch.feeCurrency || existing.feeCurrency || 'AUD',
        pricingMode:
          patch.pricingMode || existing.pricingMode || 'one_time_manual',
        updatedAt: new Date().toISOString(),
      };
      storage.jobs[idx] = updated;
      deps.saveStorage(storage);
      deps.trackSparkeryEvent('dispatch.job.update.succeeded', {
        success: true,
        durationMs: Date.now() - startedAt,
        data: {
          traceId,
          source: 'local',
          jobId: updated.id,
          idempotencyKey,
          ...telemetryContext,
        },
      });
      return updated;
    },

    async assignJob(
      id: string,
      employeeIds: string[],
      options?: DispatchJobMutationOptions
    ) {
      const currentJobs = await service.getJobs();
      const job = currentJobs.find(item => item.id === id);
      if (job && isJobFinanceLocked(job)) {
        throw new Error(
          'This job is finance-locked and assignee cannot be modified.'
        );
      }
      return service.updateJob(
        id,
        {
          assignedEmployeeIds: employeeIds,
          status: 'assigned',
        },
        options
      );
    },

    async updateJobStatus(
      id: string,
      status: DispatchJobStatus,
      options?: DispatchJobMutationOptions
    ) {
      const currentJobs = await service.getJobs();
      const job = currentJobs.find(item => item.id === id);
      if (job && isJobFinanceLocked(job)) {
        throw new Error(
          'This job is finance-locked and status cannot be modified.'
        );
      }
      return service.updateJob(id, { status }, options);
    },

    async deleteJob(id: string) {
      const currentJobs = await service.getJobs();
      const job = currentJobs.find(item => item.id === id);
      if (job && isJobFinanceLocked(job)) {
        throw new Error('This job is finance-locked and cannot be deleted.');
      }

      if (deps.getSupabaseConfig()) {
        const encodedId = encodeURIComponent(id);
        await deps.supabaseFetch<SupabaseDispatchJobRow[]>(
          `/rest/v1/dispatch_jobs?id=eq.${encodedId}`,
          {
            method: 'DELETE',
            headers: {
              Prefer: 'return=representation',
            },
          }
        );
        return;
      }

      const storage = deps.loadStorage();
      storage.jobs = storage.jobs.filter(job => job.id !== id);
      deps.saveStorage(storage);
    },

    async applyJobFinanceAdjustment(
      id: string,
      adjustmentDelta: number,
      options?: DispatchJobMutationOptions
    ) {
      const traceId = createDispatchTraceId('finance.adjustment');
      const telemetryContext = resolveDispatchJobTelemetryContext(options);
      const normalizedDelta = roundMoney(adjustmentDelta);
      if (!Number.isFinite(normalizedDelta)) {
        throw new Error('Invalid adjustment amount');
      }

      const jobs = await service.getJobs();
      const existing = jobs.find(job => job.id === id);
      if (!existing) {
        throw new Error('Job not found');
      }
      if (isJobFinanceLocked(existing)) {
        throw new Error(
          'This job is finance-locked. Adjustment is not allowed.'
        );
      }

      const nextAdjustment = roundMoney(
        (existing.manualAdjustment || 0) + normalizedDelta
      );
      const nextTotal = calculateReceivableTotal(
        existing.baseFee || 0,
        nextAdjustment
      );

      const updated = await service.updateJob(
        id,
        {
          manualAdjustment: nextAdjustment,
          receivableTotal: nextTotal,
        },
        options
      );
      await writeDispatchFinanceAuditLog(deps, {
        action: 'finance_adjustment_applied',
        jobId: id,
        traceId,
        before: existing,
        after: updated,
        telemetryContext,
        metadata: {
          adjustmentDelta: normalizedDelta,
        },
      });
      return updated;
    },

    async confirmJobFinance(
      id: string,
      confirmedBy?: string,
      options?: DispatchJobMutationOptions
    ) {
      const traceId = createDispatchTraceId('finance.confirm');
      const telemetryContext = resolveDispatchJobTelemetryContext(options);
      const jobs = await service.getJobs();
      const existing = jobs.find(job => job.id === id);
      if (!existing) {
        throw new Error('Job not found');
      }
      if (existing.status !== 'completed') {
        throw new Error('Only completed jobs can be confirmed for finance.');
      }
      if (isJobFinanceLocked(existing)) {
        throw new Error('This job is already finance-locked.');
      }

      const now = new Date().toISOString();
      const updated = await service.updateJob(
        id,
        {
          financeConfirmedAt: now,
          financeConfirmedBy: confirmedBy || 'dispatch-admin',
          financeLockedAt: now,
          financeLockReason: 'completed_and_confirmed',
          receivableTotal: calculateReceivableTotal(
            existing.baseFee || 0,
            existing.manualAdjustment || 0
          ),
        },
        options
      );
      await writeDispatchFinanceAuditLog(deps, {
        action: 'finance_confirmed',
        jobId: id,
        traceId,
        before: existing,
        after: updated,
        telemetryContext,
        metadata: {
          confirmedBy: confirmedBy || 'dispatch-admin',
        },
      });
      return updated;
    },

    async setJobPaymentReceived(
      id: string,
      received: boolean,
      receivedBy?: string,
      options?: DispatchJobMutationOptions
    ) {
      const traceId = createDispatchTraceId('finance.payment');
      const telemetryContext = resolveDispatchJobTelemetryContext(options);
      const jobs = await service.getJobs();
      const existing = jobs.find(job => job.id === id);
      if (!existing) {
        throw new Error('Job not found');
      }
      if (!isJobFinanceLocked(existing)) {
        throw new Error(
          'Only finance-confirmed jobs can be marked as payment received.'
        );
      }

      if (received && existing.paymentReceivedAt) {
        return existing;
      }
      if (!received && !existing.paymentReceivedAt) {
        return existing;
      }

      if (received) {
        const now = new Date().toISOString();
        const updated = await service.updateJob(
          id,
          {
            paymentReceivedAt: now,
            paymentReceivedBy: receivedBy || 'dispatch-finance-panel',
          },
          options
        );
        await writeDispatchFinanceAuditLog(deps, {
          action: 'payment_received_marked',
          jobId: id,
          traceId,
          before: existing,
          after: updated,
          telemetryContext,
          metadata: {
            receivedBy: receivedBy || 'dispatch-finance-panel',
          },
        });
        return updated;
      }

      const updated = await service.updateJob(
        id,
        {
          paymentReceivedAt: null,
          paymentReceivedBy: null,
        },
        options
      );
      await writeDispatchFinanceAuditLog(deps, {
        action: 'payment_received_unmarked',
        jobId: id,
        traceId,
        before: existing,
        after: updated,
        telemetryContext,
      });
      return updated;
    },
  };

  return service;
};
