import type {
  CreateDispatchJobPayload,
  DispatchCustomerProfile,
  DispatchEmployee,
  DispatchEmployeeLocation,
  DispatchJob,
  DispatchJobStatus,
  EmployeeSchedule,
  UpsertDispatchEmployeePayload,
  UpsertDispatchCustomerProfilePayload,
  UpdateDispatchJobPayload,
} from '@/pages/Sparkery/dispatch/types';
import type { Employee as InspectionEmployee } from '@/pages/CleaningInspection/types';
import {
  loadEmployees as loadInspectionEmployees,
  saveEmployees as saveInspectionEmployees,
} from '@/services/inspectionService';
import { trackSparkeryEvent } from '@/services/sparkeryTelemetry';
import { getSupabaseConfig, supabaseFetch } from './apiLayer';
import {
  ensureSupabaseRows,
  isSupabaseDispatchCustomerProfileRowValue,
  isSupabaseDispatchEmployeeLocationRowValue,
  isSupabaseDispatchEmployeeRowValue,
  isSupabaseDispatchJobRowValue,
  mergeEmployeeLocations,
  normalizeRecurringWeekdays,
  toCustomerProfile,
  toCustomerProfileRow,
  toEmployee,
  toEmployeeLocation,
  toEmployeeLocationRow,
  toEmployeeRow,
  toJob,
  toJobRow,
  type SupabaseDispatchCustomerProfileRow,
  type SupabaseDispatchEmployeeLocationRow,
  type SupabaseDispatchEmployeeRow,
  type SupabaseDispatchJobRow,
} from './mapperLayer';

interface DispatchStorage {
  jobs: DispatchJob[];
  employees: DispatchEmployee[];
  schedules: EmployeeSchedule[];
  customerProfiles: DispatchCustomerProfile[];
}

interface DispatchBackupPayload {
  version: 'v1';
  exportedAt: string;
  data: DispatchStorage;
  employeeLocations?: Record<string, DispatchEmployeeLocation>;
}

const STORAGE_KEY = 'sparkery_dispatch_storage_v1';
const EMPLOYEE_LOCATION_STORAGE_KEY = 'sparkery_dispatch_employee_locations_v1';
const INSPECTION_EMPLOYEE_STORAGE_KEY = 'cleaning-inspection-employees';

const toInspectionEmployee = (
  employee: DispatchEmployee
): InspectionEmployee => {
  const hasNameCN = Boolean(employee.nameCN?.trim());
  const record: InspectionEmployee = {
    id: employee.id,
    name: hasNameCN ? employee.nameCN!.trim() : employee.name.trim(),
  };
  if (hasNameCN && employee.name.trim()) {
    record.nameEn = employee.name.trim();
  }
  if (employee.phone?.trim()) {
    record.phone = employee.phone.trim();
  }
  return record;
};

const toDispatchEmployeeFromInspection = (
  employee: InspectionEmployee,
  existing?: DispatchEmployee
): DispatchEmployee => {
  const next: DispatchEmployee = {
    id: employee.id,
    name: employee.nameEn?.trim() || employee.name,
    skills: existing?.skills || ['regular'],
    status: existing?.status || 'available',
  };

  if (employee.nameEn?.trim()) {
    next.nameCN = employee.name;
  } else if (existing?.nameCN) {
    next.nameCN = existing.nameCN;
  }

  if (employee.phone?.trim()) {
    next.phone = employee.phone.trim();
  } else if (existing?.phone) {
    next.phone = existing.phone;
  }

  if (existing?.currentLocation) {
    next.currentLocation = existing.currentLocation;
  }

  return next;
};

const mergeInspectionEmployees = async (
  dispatchEmployees: DispatchEmployee[]
): Promise<DispatchEmployee[]> => {
  const byId = new Map<string, DispatchEmployee>();
  dispatchEmployees.forEach(employee => byId.set(employee.id, employee));

  try {
    const inspectionEmployees = await loadInspectionEmployees();
    inspectionEmployees.forEach(employee => {
      const existing = byId.get(employee.id);
      byId.set(
        employee.id,
        toDispatchEmployeeFromInspection(employee, existing)
      );
    });
  } catch {
    // Keep dispatch list if inspection source is unavailable.
  }

  return Array.from(byId.values());
};

const syncInspectionEmployeesFromDispatch = async (
  dispatchEmployees: DispatchEmployee[]
): Promise<void> => {
  try {
    const currentInspectionEmployees = await loadInspectionEmployees();
    const byId = new Map<string, InspectionEmployee>();
    currentInspectionEmployees.forEach(employee =>
      byId.set(employee.id, employee)
    );
    dispatchEmployees.forEach(employee =>
      byId.set(employee.id, toInspectionEmployee(employee))
    );
    await saveInspectionEmployees(Array.from(byId.values()));
  } catch {
    // Best-effort sync only; ignore mirror sync failures.
  }
};

const defaultEmployees: DispatchEmployee[] = [
  {
    id: 'emp-1',
    name: 'Alex Chen',
    nameCN: '陈安',
    phone: '0400 000 001',
    skills: ['bond', 'airbnb', 'regular'],
    status: 'available',
  },
  {
    id: 'emp-2',
    name: 'Mia Zhang',
    nameCN: '张米娅',
    phone: '0400 000 002',
    skills: ['bond', 'regular', 'commercial'],
    status: 'available',
  },
  {
    id: 'emp-3',
    name: 'Leo Wang',
    nameCN: '王乐',
    phone: '0400 000 003',
    skills: ['airbnb', 'commercial'],
    status: 'off',
  },
];

const createInitialStorage = (): DispatchStorage => ({
  jobs: [],
  employees: defaultEmployees,
  schedules: [],
  customerProfiles: [],
});

const loadStorage = (): DispatchStorage => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const initial = createInitialStorage();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<DispatchStorage>;
    return {
      jobs: parsed.jobs || [],
      employees: parsed.employees || defaultEmployees,
      schedules: parsed.schedules || [],
      customerProfiles: parsed.customerProfiles || [],
    };
  } catch {
    const initial = createInitialStorage();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    return initial;
  }
};

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateStr: string): Date => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date();
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  const parsed = new Date(year || 1970, (month || 1) - 1, day || 1);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
};

const saveStorage = (storage: DispatchStorage): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(storage));
};

const loadLocalEmployeeLocations = (): Record<
  string,
  DispatchEmployeeLocation
> => {
  const raw = localStorage.getItem(EMPLOYEE_LOCATION_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, DispatchEmployeeLocation>;
    const normalized: Record<string, DispatchEmployeeLocation> = {};

    Object.entries(parsed).forEach(([employeeId, location]) => {
      if (!location || typeof location !== 'object') {
        return;
      }

      const lat = Number(location.lat);
      const lng = Number(location.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
      }

      const result: DispatchEmployeeLocation = {
        lat,
        lng,
        source: location.source || 'mobile',
        updatedAt: location.updatedAt || new Date().toISOString(),
      };

      if (typeof location.accuracyM === 'number') {
        result.accuracyM = location.accuracyM;
      }
      if (location.label) {
        result.label = location.label;
      }

      normalized[employeeId] = result;
    });

    return normalized;
  } catch {
    return {};
  }
};

const saveLocalEmployeeLocations = (
  locations: Record<string, DispatchEmployeeLocation>
): void => {
  localStorage.setItem(
    EMPLOYEE_LOCATION_STORAGE_KEY,
    JSON.stringify(locations)
  );
};

const removeInspectionEmployeeLocalCache = (employeeId: string): void => {
  try {
    const raw = localStorage.getItem(INSPECTION_EMPLOYEE_STORAGE_KEY);
    if (!raw) {
      return;
    }
    const parsed = JSON.parse(raw) as InspectionEmployee[];
    if (!Array.isArray(parsed)) {
      return;
    }
    const filtered = parsed.filter(employee => employee?.id !== employeeId);
    localStorage.setItem(
      INSPECTION_EMPLOYEE_STORAGE_KEY,
      JSON.stringify(filtered)
    );
  } catch {
    // Ignore invalid local inspection employee cache.
  }
};

const removeInspectionEmployeeMirror = async (
  employeeId: string
): Promise<void> => {
  removeInspectionEmployeeLocalCache(employeeId);
  if (!getSupabaseConfig()) {
    return;
  }

  const encodedId = encodeURIComponent(employeeId);
  try {
    await supabaseFetch<unknown[]>(
      `/rest/v1/cleaning_inspection_employees?id=eq.${encodedId}`,
      {
        method: 'DELETE',
        headers: {
          Prefer: 'return=representation',
        },
      }
    );
  } catch (error) {
    if (
      !isSupabaseRelationMissingError(error, 'cleaning_inspection_employees')
    ) {
      throw error;
    }
  }
};

const isSupabaseRelationMissingError = (
  error: unknown,
  relationName: string
): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  const relation = relationName.toLowerCase();
  return (
    message.includes(relation) &&
    (message.includes('42p01') ||
      message.includes('relation') ||
      message.includes('schema cache'))
  );
};

const isSupabaseForeignKeyError = (
  error: unknown,
  constraintName?: string
): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();
  if (!message.includes('23503')) {
    return false;
  }

  if (!constraintName) {
    return true;
  }

  return message.includes(constraintName.toLowerCase());
};

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

const findEmployeeFromLocalOrInspection = async (
  employeeId: string
): Promise<DispatchEmployee | null> => {
  const fromLocalStorage = loadStorage().employees.find(
    employee => employee.id === employeeId
  );
  if (fromLocalStorage) {
    return fromLocalStorage;
  }

  try {
    const inspectionEmployees = await loadInspectionEmployees();
    const inspectionEmployee = inspectionEmployees.find(
      employee => employee.id === employeeId
    );
    if (inspectionEmployee) {
      return toDispatchEmployeeFromInspection(inspectionEmployee);
    }
  } catch {
    // ignore, fallback to generated minimal employee
  }

  return null;
};

const ensureSupabaseEmployeeExists = async (
  employeeId: string
): Promise<void> => {
  const encodedId = encodeURIComponent(employeeId);
  const existingRowsRaw = await supabaseFetch<unknown[]>(
    `/rest/v1/dispatch_employees?select=*&id=eq.${encodedId}&limit=1`
  );
  const existingRows = ensureSupabaseRows(
    existingRowsRaw,
    isSupabaseDispatchEmployeeRowValue,
    'dispatch_employees'
  );
  if (existingRows[0]) {
    return;
  }

  const sourceEmployee = await findEmployeeFromLocalOrInspection(employeeId);
  const payload: UpsertDispatchEmployeePayload = sourceEmployee
    ? {
        id: sourceEmployee.id,
        name: sourceEmployee.name,
        skills:
          sourceEmployee.skills.length > 0
            ? sourceEmployee.skills
            : ['regular'],
        status: sourceEmployee.status || 'available',
      }
    : {
        id: employeeId,
        name: `Employee ${employeeId}`,
        skills: ['regular'],
        status: 'available',
      };

  if (sourceEmployee?.nameCN) {
    payload.nameCN = sourceEmployee.nameCN;
  }
  if (sourceEmployee?.phone) {
    payload.phone = sourceEmployee.phone;
  }

  const row = toEmployeeRow(payload, employeeId);
  await supabaseFetch<SupabaseDispatchEmployeeRow[]>(
    '/rest/v1/dispatch_employees?on_conflict=id',
    {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify([row]),
    }
  );
};

const normalizeEmployeeLocation = (
  location: Omit<DispatchEmployeeLocation, 'updatedAt'> & {
    updatedAt?: string;
  }
): DispatchEmployeeLocation => {
  const normalized: DispatchEmployeeLocation = {
    lat: Number(location.lat),
    lng: Number(location.lng),
    source: location.source,
    updatedAt: location.updatedAt || new Date().toISOString(),
  };

  if (typeof location.accuracyM === 'number') {
    normalized.accuracyM = location.accuracyM;
  }
  if (location.label) {
    normalized.label = location.label;
  }

  return normalized;
};

const generateId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const roundMoney = (value: number): number =>
  Number((Number.isFinite(value) ? value : 0).toFixed(2));

const calculateReceivableTotal = (
  baseFee?: number,
  manualAdjustment?: number
): number => roundMoney((baseFee || 0) + (manualAdjustment || 0));

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

export const sparkeryDispatchService = {
  async getJobs(params?: {
    weekStart?: string;
    weekEnd?: string;
  }): Promise<DispatchJob[]> {
    if (getSupabaseConfig()) {
      const query = buildDispatchJobsQuery(params);

      let rows: SupabaseDispatchJobRow[];
      try {
        const rowsRaw = await supabaseFetch<unknown[]>(
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
          const fallbackRowsRaw = await supabaseFetch<unknown[]>(
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

    const storage = loadStorage();
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

  async createJob(payload: CreateDispatchJobPayload): Promise<DispatchJob> {
    const startedAt = Date.now();
    const normalizedPricingMode =
      payload.pricingMode ||
      (payload.recurringEnabled ? 'recurring_fixed' : 'one_time_manual');
    const normalizedBaseFee = roundMoney(payload.baseFee || 0);
    const normalizedAdjustment = roundMoney(payload.manualAdjustment || 0);
    const normalizedReceivableTotal = calculateReceivableTotal(
      normalizedBaseFee,
      normalizedAdjustment
    );

    if (getSupabaseConfig()) {
      const now = new Date().toISOString();
      const id = generateId('job');
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
        const resultRaw = await supabaseFetch<unknown[]>(
          '/rest/v1/dispatch_jobs?on_conflict=id',
          {
            method: 'POST',
            headers: {
              Prefer: 'resolution=merge-duplicates,return=representation',
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
        trackSparkeryEvent('dispatch.job.create.failed', {
          success: false,
          durationMs: Date.now() - startedAt,
          data: {
            source: 'supabase',
            reason: error instanceof Error ? error.message : 'unknown_error',
          },
        });
        if (isSupabaseMissingDispatchFinanceSchemaError(error)) {
          throw new Error(DISPATCH_FINANCE_SCHEMA_ERROR_MESSAGE);
        }
        throw error;
      }
      const first = result[0];
      if (!first) {
        trackSparkeryEvent('dispatch.job.create.failed', {
          success: false,
          durationMs: Date.now() - startedAt,
          data: {
            source: 'supabase',
            reason: 'empty_response_rows',
          },
        });
        throw new Error('Supabase job creation returned no rows');
      }
      const createdJob = toJob(first);
      trackSparkeryEvent('dispatch.job.create.succeeded', {
        success: true,
        durationMs: Date.now() - startedAt,
        data: {
          source: 'supabase',
          jobId: createdJob.id,
          serviceType: createdJob.serviceType,
        },
      });
      return createdJob;
    }

    const storage = loadStorage();
    const now = new Date().toISOString();
    const job: DispatchJob = {
      id: generateId('job'),
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
    if (payload.customerAddress) job.customerAddress = payload.customerAddress;
    if (payload.customerPhone) job.customerPhone = payload.customerPhone;
    if (payload.propertyType) job.propertyType = payload.propertyType;
    if (typeof payload.estimatedDurationHours === 'number') {
      job.estimatedDurationHours = payload.estimatedDurationHours;
    }
    storage.jobs.unshift(job);
    saveStorage(storage);
    trackSparkeryEvent('dispatch.job.create.succeeded', {
      success: true,
      durationMs: Date.now() - startedAt,
      data: {
        source: 'local',
        jobId: job.id,
        serviceType: job.serviceType,
      },
    });
    return job;
  },

  async updateJob(
    id: string,
    patch: UpdateDispatchJobPayload
  ): Promise<DispatchJob> {
    const startedAt = Date.now();
    if (getSupabaseConfig()) {
      const query = buildDispatchJobsQuery({ id, limit: 1 });
      let existingList: SupabaseDispatchJobRow[];
      try {
        const existingListRaw = await supabaseFetch<unknown[]>(
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
          const fallbackExistingRaw = await supabaseFetch<unknown[]>(
            `/rest/v1/dispatch_jobs?${fallbackQuery.toString()}`
          );
          existingList = ensureSupabaseRows(
            fallbackExistingRaw,
            isSupabaseDispatchJobRowValue,
            'dispatch_jobs'
          );
        } else if (isSupabaseMissingDispatchFinanceSchemaError(error)) {
          trackSparkeryEvent('dispatch.job.update.failed', {
            success: false,
            durationMs: Date.now() - startedAt,
            data: {
              source: 'supabase',
              stage: 'fetch_existing',
              jobId: id,
              reason: error instanceof Error ? error.message : 'unknown_error',
            },
          });
          throw new Error(DISPATCH_FINANCE_SCHEMA_ERROR_MESSAGE);
        } else {
          trackSparkeryEvent('dispatch.job.update.failed', {
            success: false,
            durationMs: Date.now() - startedAt,
            data: {
              source: 'supabase',
              stage: 'fetch_existing',
              jobId: id,
              reason: error instanceof Error ? error.message : 'unknown_error',
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
        const resultRaw = await supabaseFetch<unknown[]>(
          `/rest/v1/dispatch_jobs?id=eq.${encodedId}`,
          {
            method: 'PATCH',
            headers: {
              Prefer: 'return=representation',
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
        trackSparkeryEvent('dispatch.job.update.failed', {
          success: false,
          durationMs: Date.now() - startedAt,
          data: {
            source: 'supabase',
            stage: 'patch',
            jobId: id,
            reason: error instanceof Error ? error.message : 'unknown_error',
          },
        });
        if (isSupabaseMissingDispatchFinanceSchemaError(error)) {
          throw new Error(DISPATCH_FINANCE_SCHEMA_ERROR_MESSAGE);
        }
        throw error;
      }
      const first = result[0];
      if (!first) {
        trackSparkeryEvent('dispatch.job.update.failed', {
          success: false,
          durationMs: Date.now() - startedAt,
          data: {
            source: 'supabase',
            stage: 'patch',
            jobId: id,
            reason: 'empty_response_rows',
          },
        });
        throw new Error('Supabase job update returned no rows');
      }
      const updatedJob = toJob(first);
      trackSparkeryEvent('dispatch.job.update.succeeded', {
        success: true,
        durationMs: Date.now() - startedAt,
        data: {
          source: 'supabase',
          jobId: updatedJob.id,
        },
      });
      return updatedJob;
    }

    const storage = loadStorage();
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
    saveStorage(storage);
    trackSparkeryEvent('dispatch.job.update.succeeded', {
      success: true,
      durationMs: Date.now() - startedAt,
      data: {
        source: 'local',
        jobId: updated.id,
      },
    });
    return updated;
  },

  async assignJob(id: string, employeeIds: string[]): Promise<DispatchJob> {
    const currentJobs = await this.getJobs();
    const job = currentJobs.find(item => item.id === id);
    if (job && isJobFinanceLocked(job)) {
      throw new Error(
        'This job is finance-locked and assignee cannot be modified.'
      );
    }
    return this.updateJob(id, {
      assignedEmployeeIds: employeeIds,
      status: 'assigned',
    });
  },

  async updateJobStatus(
    id: string,
    status: DispatchJobStatus
  ): Promise<DispatchJob> {
    const currentJobs = await this.getJobs();
    const job = currentJobs.find(item => item.id === id);
    if (job && isJobFinanceLocked(job)) {
      throw new Error(
        'This job is finance-locked and status cannot be modified.'
      );
    }
    return this.updateJob(id, { status });
  },

  async deleteJob(id: string): Promise<void> {
    const currentJobs = await this.getJobs();
    const job = currentJobs.find(item => item.id === id);
    if (job && isJobFinanceLocked(job)) {
      throw new Error('This job is finance-locked and cannot be deleted.');
    }

    if (getSupabaseConfig()) {
      const encodedId = encodeURIComponent(id);
      await supabaseFetch<SupabaseDispatchJobRow[]>(
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

    const storage = loadStorage();
    storage.jobs = storage.jobs.filter(job => job.id !== id);
    saveStorage(storage);
  },

  async applyJobFinanceAdjustment(
    id: string,
    adjustmentDelta: number
  ): Promise<DispatchJob> {
    const normalizedDelta = roundMoney(adjustmentDelta);
    if (!Number.isFinite(normalizedDelta)) {
      throw new Error('Invalid adjustment amount');
    }

    const jobs = await this.getJobs();
    const existing = jobs.find(job => job.id === id);
    if (!existing) {
      throw new Error('Job not found');
    }
    if (isJobFinanceLocked(existing)) {
      throw new Error('This job is finance-locked. Adjustment is not allowed.');
    }

    const nextAdjustment = roundMoney(
      (existing.manualAdjustment || 0) + normalizedDelta
    );
    const nextTotal = calculateReceivableTotal(
      existing.baseFee || 0,
      nextAdjustment
    );

    return this.updateJob(id, {
      manualAdjustment: nextAdjustment,
      receivableTotal: nextTotal,
    });
  },

  async confirmJobFinance(
    id: string,
    confirmedBy?: string
  ): Promise<DispatchJob> {
    const jobs = await this.getJobs();
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
    return this.updateJob(id, {
      financeConfirmedAt: now,
      financeConfirmedBy: confirmedBy || 'dispatch-admin',
      financeLockedAt: now,
      financeLockReason: 'completed_and_confirmed',
      receivableTotal: calculateReceivableTotal(
        existing.baseFee || 0,
        existing.manualAdjustment || 0
      ),
    });
  },

  async setJobPaymentReceived(
    id: string,
    received: boolean,
    receivedBy?: string
  ): Promise<DispatchJob> {
    const jobs = await this.getJobs();
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
      return this.updateJob(id, {
        paymentReceivedAt: now,
        paymentReceivedBy: receivedBy || 'dispatch-finance-panel',
      });
    }

    return this.updateJob(id, {
      paymentReceivedAt: null,
      paymentReceivedBy: null,
    });
  },

  async getEmployeeLocations(): Promise<
    Record<string, DispatchEmployeeLocation>
  > {
    const supabaseConfig = getSupabaseConfig();
    if (supabaseConfig) {
      try {
        const rowsRaw = await supabaseFetch<unknown[]>(
          '/rest/v1/dispatch_employee_locations?select=*&order=updated_at.desc.nullslast,employee_id.asc'
        );
        const rows = ensureSupabaseRows(
          rowsRaw,
          isSupabaseDispatchEmployeeLocationRowValue,
          'dispatch_employee_locations'
        );
        const locations = rows.reduce<Record<string, DispatchEmployeeLocation>>(
          (acc, row) => {
            acc[row.employee_id] = toEmployeeLocation(row);
            return acc;
          },
          {}
        );
        saveLocalEmployeeLocations(locations);
        return locations;
      } catch (error) {
        if (
          !isSupabaseRelationMissingError(error, 'dispatch_employee_locations')
        ) {
          throw error;
        }
      }
    }

    return loadLocalEmployeeLocations();
  },

  async reportEmployeeLocation(
    employeeId: string,
    locationInput: Omit<DispatchEmployeeLocation, 'updatedAt'> & {
      updatedAt?: string;
    }
  ): Promise<DispatchEmployeeLocation> {
    const location = normalizeEmployeeLocation(locationInput);
    const supabaseConfig = getSupabaseConfig();

    if (supabaseConfig) {
      const upsertLocation =
        async (): Promise<DispatchEmployeeLocation | null> => {
          const row = toEmployeeLocationRow(employeeId, location);
          const result = await supabaseFetch<
            SupabaseDispatchEmployeeLocationRow[]
          >('/rest/v1/dispatch_employee_locations?on_conflict=employee_id', {
            method: 'POST',
            headers: {
              Prefer: 'resolution=merge-duplicates,return=representation',
            },
            body: JSON.stringify([row]),
          });

          const first = result[0];
          if (!first) {
            return null;
          }

          const resolved = toEmployeeLocation(first);
          const localLocations = loadLocalEmployeeLocations();
          localLocations[employeeId] = resolved;
          saveLocalEmployeeLocations(localLocations);
          return resolved;
        };

      try {
        const resolved = await upsertLocation();
        if (resolved) {
          return resolved;
        }
      } catch (error) {
        if (
          isSupabaseForeignKeyError(
            error,
            'dispatch_employee_locations_employee_id_fkey'
          )
        ) {
          await ensureSupabaseEmployeeExists(employeeId);
          const resolved = await upsertLocation();
          if (resolved) {
            return resolved;
          }
        }

        if (
          !isSupabaseRelationMissingError(error, 'dispatch_employee_locations')
        ) {
          throw error;
        }
      }
    }

    const localLocations = loadLocalEmployeeLocations();
    localLocations[employeeId] = location;
    saveLocalEmployeeLocations(localLocations);
    return location;
  },

  async getEmployees(): Promise<DispatchEmployee[]> {
    if (getSupabaseConfig()) {
      const rowsRaw = await supabaseFetch<unknown[]>(
        '/rest/v1/dispatch_employees?select=*&order=id.asc'
      );
      const rows = ensureSupabaseRows(
        rowsRaw,
        isSupabaseDispatchEmployeeRowValue,
        'dispatch_employees'
      );
      const baseEmployees = rows.map(toEmployee);
      let locations: Record<string, DispatchEmployeeLocation> = {};
      try {
        locations = await this.getEmployeeLocations();
      } catch {
        locations = loadLocalEmployeeLocations();
      }
      const withLocations = mergeEmployeeLocations(baseEmployees, locations);
      return mergeInspectionEmployees(withLocations);
    }

    const storage = loadStorage();
    const locations = loadLocalEmployeeLocations();
    const withLocations = mergeEmployeeLocations(storage.employees, locations);
    return mergeInspectionEmployees(withLocations);
  },

  async upsertEmployee(
    payload: UpsertDispatchEmployeePayload
  ): Promise<DispatchEmployee> {
    if (getSupabaseConfig()) {
      const row = toEmployeeRow(payload, payload.id || generateId('emp'));
      const resultRaw = await supabaseFetch<unknown[]>(
        '/rest/v1/dispatch_employees?on_conflict=id',
        {
          method: 'POST',
          headers: {
            Prefer: 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify([row]),
        }
      );
      const result = ensureSupabaseRows(
        resultRaw,
        isSupabaseDispatchEmployeeRowValue,
        'dispatch_employees'
      );
      const first = result[0];
      if (!first) {
        throw new Error('Supabase employee upsert returned no rows');
      }
      const employee = toEmployee(first);
      const locations = await this.getEmployeeLocations();
      const location = locations[employee.id];
      const mergedEmployee = !location
        ? employee
        : {
            ...employee,
            currentLocation: location,
          };
      await syncInspectionEmployeesFromDispatch([mergedEmployee]);
      return mergedEmployee;
    }

    const storage = loadStorage();
    const employeeId = payload.id || generateId('emp');
    const existingIndex = storage.employees.findIndex(
      emp => emp.id === employeeId
    );

    const next: DispatchEmployee = {
      id: employeeId,
      name: payload.name,
      skills: payload.skills,
      status: payload.status,
    };
    const existingEmployee =
      existingIndex >= 0 ? storage.employees[existingIndex] : undefined;
    if (payload.nameCN) next.nameCN = payload.nameCN;
    if (payload.phone) next.phone = payload.phone;
    if (existingEmployee?.currentLocation) {
      next.currentLocation = existingEmployee.currentLocation;
    }

    if (existingIndex >= 0) {
      storage.employees[existingIndex] = next;
    } else {
      storage.employees.unshift(next);
    }
    saveStorage(storage);
    await syncInspectionEmployeesFromDispatch(storage.employees);
    return next;
  },

  async deleteEmployee(id: string): Promise<void> {
    const encodedId = encodeURIComponent(id);

    if (getSupabaseConfig()) {
      try {
        await supabaseFetch<SupabaseDispatchEmployeeLocationRow[]>(
          `/rest/v1/dispatch_employee_locations?employee_id=eq.${encodedId}`,
          {
            method: 'DELETE',
            headers: {
              Prefer: 'return=representation',
            },
          }
        );
      } catch (error) {
        if (
          !isSupabaseRelationMissingError(error, 'dispatch_employee_locations')
        ) {
          throw error;
        }
      }

      await supabaseFetch<SupabaseDispatchEmployeeRow[]>(
        `/rest/v1/dispatch_employees?id=eq.${encodedId}`,
        {
          method: 'DELETE',
          headers: {
            Prefer: 'return=representation',
          },
        }
      );
    }

    const storage = loadStorage();
    const now = new Date().toISOString();
    storage.employees = storage.employees.filter(
      employee => employee.id !== id
    );
    storage.jobs = storage.jobs.map(job => {
      if (!job.assignedEmployeeIds?.includes(id)) {
        return job;
      }
      const nextAssignedIds = job.assignedEmployeeIds.filter(
        employeeId => employeeId !== id
      );
      const nextJob: DispatchJob = {
        ...job,
        updatedAt: now,
      };
      if (nextAssignedIds.length > 0) {
        nextJob.assignedEmployeeIds = nextAssignedIds;
      } else {
        delete nextJob.assignedEmployeeIds;
        if (nextJob.status === 'assigned') {
          nextJob.status = 'pending';
        }
      }
      return nextJob;
    });
    saveStorage(storage);

    const localLocations = loadLocalEmployeeLocations();
    if (localLocations[id]) {
      delete localLocations[id];
      saveLocalEmployeeLocations(localLocations);
    }

    try {
      await removeInspectionEmployeeMirror(id);
    } catch {
      // Best-effort cleanup only; ignore mirror deletion failures.
    }
  },

  async upsertEmployeeSchedule(
    schedule: EmployeeSchedule
  ): Promise<EmployeeSchedule> {
    const storage = loadStorage();
    const idx = storage.schedules.findIndex(s => s.id === schedule.id);
    if (idx >= 0) {
      storage.schedules[idx] = schedule;
    } else {
      storage.schedules.push(schedule);
    }
    saveStorage(storage);
    return schedule;
  },

  async getCustomerProfiles(): Promise<DispatchCustomerProfile[]> {
    if (getSupabaseConfig()) {
      const rowsRaw = await supabaseFetch<unknown[]>(
        '/rest/v1/dispatch_customer_profiles?select=*&order=updated_at.desc.nullslast,id.asc'
      );
      const rows = ensureSupabaseRows(
        rowsRaw,
        isSupabaseDispatchCustomerProfileRowValue,
        'dispatch_customer_profiles'
      );
      return rows.map(toCustomerProfile);
    }
    return loadStorage().customerProfiles;
  },

  async upsertCustomerProfile(
    payload: UpsertDispatchCustomerProfilePayload
  ): Promise<DispatchCustomerProfile> {
    if (getSupabaseConfig()) {
      const row = toCustomerProfileRow(
        payload,
        payload.id || generateId('customer')
      );
      let result: SupabaseDispatchCustomerProfileRow[];
      try {
        const resultRaw = await supabaseFetch<unknown[]>(
          '/rest/v1/dispatch_customer_profiles?on_conflict=id',
          {
            method: 'POST',
            headers: {
              Prefer: 'resolution=merge-duplicates,return=representation',
            },
            body: JSON.stringify([row]),
          }
        );
        result = ensureSupabaseRows(
          resultRaw,
          isSupabaseDispatchCustomerProfileRowValue,
          'dispatch_customer_profiles'
        );
      } catch (error) {
        let fallbackRow: Record<string, unknown> | null = null;

        if (
          row.recurring_weekdays &&
          isSupabaseMissingColumnError(error, 'recurring_weekdays')
        ) {
          fallbackRow = {
            ...row,
            recurring_weekday:
              row.recurring_weekday || row.recurring_weekdays[0],
          };
          delete fallbackRow.recurring_weekdays;
        }

        if (isSupabaseMissingColumnError(error, 'recurring_fee')) {
          if (
            typeof payload.recurringFee === 'number' &&
            Number.isFinite(payload.recurringFee)
          ) {
            throw new Error(DISPATCH_FINANCE_SCHEMA_ERROR_MESSAGE);
          }
          fallbackRow = {
            ...(fallbackRow || row),
          };
          delete fallbackRow.recurring_fee;
        }

        if (!fallbackRow) {
          throw error;
        }

        const fallbackResultRaw = await supabaseFetch<unknown[]>(
          '/rest/v1/dispatch_customer_profiles?on_conflict=id',
          {
            method: 'POST',
            headers: {
              Prefer: 'resolution=merge-duplicates,return=representation',
            },
            body: JSON.stringify([fallbackRow]),
          }
        );
        result = ensureSupabaseRows(
          fallbackResultRaw,
          isSupabaseDispatchCustomerProfileRowValue,
          'dispatch_customer_profiles'
        );
      }

      const first = result[0];
      if (!first) {
        throw new Error('Supabase customer upsert returned no rows');
      }
      return toCustomerProfile(first);
    }

    const storage = loadStorage();
    const now = new Date().toISOString();
    const profileId = payload.id || generateId('customer');
    const existingIndex = storage.customerProfiles.findIndex(
      p => p.id === profileId
    );

    const baseProfile: DispatchCustomerProfile = {
      id: profileId,
      name: payload.name,
      createdAt: now,
      updatedAt: now,
    };

    if (payload.address) baseProfile.address = payload.address;
    if (payload.phone) baseProfile.phone = payload.phone;
    if (payload.defaultJobTitle)
      baseProfile.defaultJobTitle = payload.defaultJobTitle;
    if (payload.defaultDescription)
      baseProfile.defaultDescription = payload.defaultDescription;
    if (payload.defaultNotes) baseProfile.defaultNotes = payload.defaultNotes;
    if (typeof payload.recurringEnabled === 'boolean') {
      baseProfile.recurringEnabled = payload.recurringEnabled;
    }
    if (payload.recurringWeekday) {
      baseProfile.recurringWeekday = payload.recurringWeekday;
    }
    const recurringWeekdays = normalizeRecurringWeekdays(
      payload.recurringWeekdays
    );
    if (recurringWeekdays.length > 0) {
      baseProfile.recurringWeekdays = recurringWeekdays;
      const firstWeekday = recurringWeekdays[0];
      if (firstWeekday) {
        baseProfile.recurringWeekday = firstWeekday;
      }
    }
    if (payload.recurringStartTime) {
      baseProfile.recurringStartTime = payload.recurringStartTime;
    }
    if (payload.recurringEndTime) {
      baseProfile.recurringEndTime = payload.recurringEndTime;
    }
    if (payload.recurringServiceType) {
      baseProfile.recurringServiceType = payload.recurringServiceType;
    }
    if (payload.recurringPriority) {
      baseProfile.recurringPriority = payload.recurringPriority;
    }
    if (
      typeof payload.recurringFee === 'number' &&
      Number.isFinite(payload.recurringFee)
    ) {
      baseProfile.recurringFee = roundMoney(payload.recurringFee);
    }

    if (existingIndex >= 0) {
      const existing = storage.customerProfiles[existingIndex];
      const updated: DispatchCustomerProfile = {
        ...existing,
        ...baseProfile,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };
      storage.customerProfiles[existingIndex] = updated;
      saveStorage(storage);
      return updated;
    }

    storage.customerProfiles.unshift(baseProfile);
    saveStorage(storage);
    return baseProfile;
  },

  async createJobsFromRecurringProfiles(
    weekStart: string,
    weekEnd: string
  ): Promise<DispatchJob[]> {
    if (getSupabaseConfig()) {
      const profiles = await this.getCustomerProfiles();
      const existingJobs = await this.getJobs({ weekStart, weekEnd });
      const created: DispatchJob[] = [];
      const weekStartDate = parseDateKey(weekStart);

      for (const profile of profiles) {
        if (
          !profile.recurringEnabled ||
          !profile.recurringStartTime ||
          !profile.recurringEndTime
        ) {
          continue;
        }
        const recurringDays = normalizeRecurringWeekdays(
          profile.recurringWeekdays
        );
        const effectiveDays =
          recurringDays.length > 0
            ? recurringDays
            : profile.recurringWeekday
              ? [profile.recurringWeekday]
              : [];
        if (effectiveDays.length === 0) {
          continue;
        }

        for (const weekday of effectiveDays) {
          const targetDate = new Date(weekStartDate);
          targetDate.setDate(targetDate.getDate() + (weekday - 1));
          const scheduledDate = formatDateKey(targetDate);
          if (scheduledDate < weekStart || scheduledDate > weekEnd) {
            continue;
          }

          const existed = existingJobs.some(
            job =>
              job.customerProfileId === profile.id &&
              job.scheduledDate === scheduledDate &&
              job.scheduledStartTime === profile.recurringStartTime
          );
          if (existed) {
            continue;
          }

          const createPayload: CreateDispatchJobPayload = {
            title:
              profile.defaultJobTitle || `${profile.name} Recurring Service`,
            customerProfileId: profile.id,
            customerName: profile.name,
            serviceType: profile.recurringServiceType || 'regular',
            priority: profile.recurringPriority || 3,
            scheduledDate,
            scheduledStartTime: profile.recurringStartTime,
            scheduledEndTime: profile.recurringEndTime,
            pricingMode: 'recurring_fixed',
            feeCurrency: 'AUD',
            baseFee: roundMoney(profile.recurringFee || 0),
            manualAdjustment: 0,
          };
          if (profile.defaultDescription) {
            createPayload.description = profile.defaultDescription;
          }
          if (profile.defaultNotes) {
            createPayload.notes = profile.defaultNotes;
          }
          if (profile.address) {
            createPayload.customerAddress = profile.address;
          }
          if (profile.phone) {
            createPayload.customerPhone = profile.phone;
          }

          const createdJob = await this.createJob(createPayload);
          created.push(createdJob);
        }
      }

      return created;
    }

    const storage = loadStorage();
    const created: DispatchJob[] = [];
    const weekStartDate = parseDateKey(weekStart);

    storage.customerProfiles.forEach(profile => {
      if (
        !profile.recurringEnabled ||
        !profile.recurringStartTime ||
        !profile.recurringEndTime
      ) {
        return;
      }
      const recurringDays = normalizeRecurringWeekdays(
        profile.recurringWeekdays
      );
      const effectiveDays =
        recurringDays.length > 0
          ? recurringDays
          : profile.recurringWeekday
            ? [profile.recurringWeekday]
            : [];
      if (effectiveDays.length === 0) {
        return;
      }

      effectiveDays.forEach(weekday => {
        const targetDate = new Date(weekStartDate);
        targetDate.setDate(targetDate.getDate() + (weekday - 1));
        const scheduledDate = formatDateKey(targetDate);
        if (scheduledDate < weekStart || scheduledDate > weekEnd) {
          return;
        }

        const existed = storage.jobs.some(
          job =>
            job.customerProfileId === profile.id &&
            job.scheduledDate === scheduledDate &&
            job.scheduledStartTime === profile.recurringStartTime
        );

        if (existed) {
          return;
        }

        const now = new Date().toISOString();
        const job: DispatchJob = {
          id: generateId('job'),
          title: profile.defaultJobTitle || `${profile.name} Recurring Service`,
          serviceType: profile.recurringServiceType || 'regular',
          status: 'pending',
          priority: profile.recurringPriority || 3,
          scheduledDate,
          scheduledStartTime: profile.recurringStartTime!,
          scheduledEndTime: profile.recurringEndTime!,
          customerProfileId: profile.id,
          customerName: profile.name,
          pricingMode: 'recurring_fixed',
          feeCurrency: 'AUD',
          baseFee: roundMoney(profile.recurringFee || 0),
          manualAdjustment: 0,
          receivableTotal: roundMoney(profile.recurringFee || 0),
          createdAt: now,
          updatedAt: now,
        };

        if (profile.address) job.customerAddress = profile.address;
        if (profile.phone) job.customerPhone = profile.phone;
        if (profile.defaultDescription)
          job.description = profile.defaultDescription;
        if (profile.defaultNotes) job.notes = profile.defaultNotes;

        storage.jobs.unshift(job);
        created.push(job);
      });
    });

    saveStorage(storage);
    return created;
  },

  async migrateLocalPeopleToSupabase(): Promise<{
    employees: number;
    customerProfiles: number;
    jobs: number;
  }> {
    if (!getSupabaseConfig()) {
      throw new Error('Supabase is not configured');
    }

    const storage = loadStorage();
    const localLocations = loadLocalEmployeeLocations();
    const employeesRows = storage.employees.map(employee =>
      toEmployeeRow(employee, employee.id)
    );
    const employeeLocationRows = Object.entries(localLocations).map(
      ([employeeId, location]) => toEmployeeLocationRow(employeeId, location)
    );
    const customerRows = storage.customerProfiles.map(profile =>
      toCustomerProfileRow(profile, profile.id)
    );
    const jobsRows = storage.jobs.map(job => {
      const { id, createdAt, updatedAt, ...jobPayload } = job;
      return toJobRow(jobPayload, id, createdAt, updatedAt);
    });

    if (employeesRows.length > 0) {
      await supabaseFetch<SupabaseDispatchEmployeeRow[]>(
        '/rest/v1/dispatch_employees?on_conflict=id',
        {
          method: 'POST',
          headers: {
            Prefer: 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify(employeesRows),
        }
      );
    }

    if (employeeLocationRows.length > 0) {
      try {
        await supabaseFetch<SupabaseDispatchEmployeeLocationRow[]>(
          '/rest/v1/dispatch_employee_locations?on_conflict=employee_id',
          {
            method: 'POST',
            headers: {
              Prefer: 'resolution=merge-duplicates,return=representation',
            },
            body: JSON.stringify(employeeLocationRows),
          }
        );
      } catch (error) {
        if (
          !isSupabaseRelationMissingError(error, 'dispatch_employee_locations')
        ) {
          throw error;
        }
      }
    }

    if (customerRows.length > 0) {
      await supabaseFetch<SupabaseDispatchCustomerProfileRow[]>(
        '/rest/v1/dispatch_customer_profiles?on_conflict=id',
        {
          method: 'POST',
          headers: {
            Prefer: 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify(customerRows),
        }
      );
    }

    if (jobsRows.length > 0) {
      await supabaseFetch<SupabaseDispatchJobRow[]>(
        '/rest/v1/dispatch_jobs?on_conflict=id',
        {
          method: 'POST',
          headers: {
            Prefer: 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify(jobsRows),
        }
      );
    }

    return {
      employees: employeesRows.length,
      customerProfiles: customerRows.length,
      jobs: jobsRows.length,
    };
  },

  async exportBackup(): Promise<string> {
    const storage = loadStorage();
    const employeeLocations = loadLocalEmployeeLocations();
    const payload: DispatchBackupPayload = {
      version: 'v1',
      exportedAt: new Date().toISOString(),
      data: storage,
      employeeLocations,
    };
    return JSON.stringify(payload, null, 2);
  },

  async importBackup(rawBackup: string): Promise<DispatchStorage> {
    let parsed: DispatchBackupPayload;
    try {
      parsed = JSON.parse(rawBackup) as DispatchBackupPayload;
    } catch {
      throw new Error('Backup JSON format is invalid');
    }

    if (!parsed?.data) {
      throw new Error('Backup JSON missing data field');
    }

    const employeeLocations: Record<string, DispatchEmployeeLocation> =
      parsed.employeeLocations && typeof parsed.employeeLocations === 'object'
        ? parsed.employeeLocations
        : {};
    saveLocalEmployeeLocations(employeeLocations);

    const nextStorage: DispatchStorage = {
      jobs: Array.isArray(parsed.data.jobs) ? parsed.data.jobs : [],
      employees: Array.isArray(parsed.data.employees)
        ? parsed.data.employees
        : defaultEmployees,
      schedules: Array.isArray(parsed.data.schedules)
        ? parsed.data.schedules
        : [],
      customerProfiles: Array.isArray(parsed.data.customerProfiles)
        ? parsed.data.customerProfiles
        : [],
    };

    const mergedEmployees = mergeEmployeeLocations(
      nextStorage.employees,
      employeeLocations
    );
    const mergedStorage: DispatchStorage = {
      ...nextStorage,
      employees: mergedEmployees,
    };

    saveStorage(mergedStorage);
    return mergedStorage;
  },
};
