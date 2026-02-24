import type {
  DispatchCustomerProfile,
  DispatchEmployee,
  DispatchEmployeeLocation,
  DispatchJob,
  DispatchWeekday,
  UpsertDispatchCustomerProfilePayload,
  UpsertDispatchEmployeePayload,
} from '@/pages/Sparkery/dispatch/types';

export interface SupabaseDispatchEmployeeRow {
  id: string;
  name: string;
  name_cn: string | null;
  phone: string | null;
  skills: DispatchEmployee['skills'] | null;
  status: DispatchEmployee['status'];
}

export interface SupabaseDispatchEmployeeLocationRow {
  employee_id: string;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  source: DispatchEmployeeLocation['source'] | null;
  label: string | null;
  updated_at: string;
}

export interface SupabaseDispatchJobRow {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
  image_urls: string[] | null;
  customer_profile_id: string | null;
  customer_name: string | null;
  customer_address: string | null;
  customer_phone: string | null;
  service_type: DispatchJob['serviceType'];
  property_type: DispatchJob['propertyType'] | null;
  estimated_duration_hours: number | null;
  status: DispatchJob['status'];
  priority: DispatchJob['priority'];
  scheduled_date: string;
  scheduled_start_time: string;
  scheduled_end_time: string;
  assigned_employee_ids: string[] | null;
  pricing_mode?: 'recurring_fixed' | 'one_time_manual' | null;
  fee_currency?: 'AUD' | null;
  base_fee?: number | null;
  manual_adjustment?: number | null;
  receivable_total?: number | null;
  finance_confirmed_at?: string | null;
  finance_confirmed_by?: string | null;
  finance_locked_at?: string | null;
  finance_lock_reason?: string | null;
  payment_received_at?: string | null;
  payment_received_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupabaseDispatchCustomerProfileRow {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  default_job_title: string | null;
  default_description: string | null;
  default_notes: string | null;
  recurring_enabled: boolean | null;
  recurring_weekday: DispatchCustomerProfile['recurringWeekday'] | null;
  recurring_weekdays?: DispatchWeekday[] | null;
  recurring_start_time: string | null;
  recurring_end_time: string | null;
  recurring_service_type:
    | DispatchCustomerProfile['recurringServiceType']
    | null;
  recurring_priority: DispatchCustomerProfile['recurringPriority'] | null;
  recurring_fee?: number | null;
  created_at: string | null;
  updated_at: string | null;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

const isString = (value: unknown): value is string => typeof value === 'string';

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isStringArrayOrNull = (value: unknown): value is string[] | null =>
  value === null ||
  (Array.isArray(value) && value.every(item => isString(item)));

export const ensureSupabaseRows = <T>(
  rows: unknown,
  guard: (row: unknown) => row is T,
  entityName: string
): T[] => {
  if (!Array.isArray(rows)) {
    throw new Error(`Supabase ${entityName} payload is not an array`);
  }
  const invalidIndex = rows.findIndex(row => !guard(row));
  if (invalidIndex >= 0) {
    throw new Error(
      `Supabase ${entityName} payload has invalid row at index ${invalidIndex}`
    );
  }
  return rows;
};

export const isSupabaseDispatchEmployeeRowValue = (
  row: unknown
): row is SupabaseDispatchEmployeeRow => {
  if (!isRecord(row)) {
    return false;
  }
  return (
    isString(row.id) &&
    isString(row.name) &&
    (row.name_cn === null || isString(row.name_cn)) &&
    (row.phone === null || isString(row.phone)) &&
    (row.skills === null || Array.isArray(row.skills)) &&
    isString(row.status)
  );
};

export const isSupabaseDispatchEmployeeLocationRowValue = (
  row: unknown
): row is SupabaseDispatchEmployeeLocationRow => {
  if (!isRecord(row)) {
    return false;
  }
  return (
    isString(row.employee_id) &&
    isNumber(row.lat) &&
    isNumber(row.lng) &&
    (row.accuracy_m === null || isNumber(row.accuracy_m)) &&
    (row.source === null || isString(row.source)) &&
    (row.label === null || isString(row.label)) &&
    isString(row.updated_at)
  );
};

export const isSupabaseDispatchJobRowValue = (
  row: unknown
): row is SupabaseDispatchJobRow => {
  if (!isRecord(row)) {
    return false;
  }

  return (
    isString(row.id) &&
    isString(row.title) &&
    (row.description === null || isString(row.description)) &&
    (row.notes === null || isString(row.notes)) &&
    isStringArrayOrNull(row.image_urls) &&
    (row.customer_profile_id === null || isString(row.customer_profile_id)) &&
    (row.customer_name === null || isString(row.customer_name)) &&
    (row.customer_address === null || isString(row.customer_address)) &&
    (row.customer_phone === null || isString(row.customer_phone)) &&
    isString(row.service_type) &&
    (row.property_type === null || isString(row.property_type)) &&
    (row.estimated_duration_hours === null ||
      isNumber(row.estimated_duration_hours)) &&
    isString(row.status) &&
    (typeof row.priority === 'number' || typeof row.priority === 'string') &&
    isString(row.scheduled_date) &&
    isString(row.scheduled_start_time) &&
    isString(row.scheduled_end_time) &&
    (row.assigned_employee_ids === null ||
      (Array.isArray(row.assigned_employee_ids) &&
        row.assigned_employee_ids.every(item => isString(item)))) &&
    isString(row.created_at) &&
    isString(row.updated_at)
  );
};

export const isSupabaseDispatchCustomerProfileRowValue = (
  row: unknown
): row is SupabaseDispatchCustomerProfileRow => {
  if (!isRecord(row)) {
    return false;
  }
  return (
    isString(row.id) &&
    isString(row.name) &&
    (row.address === null || isString(row.address)) &&
    (row.phone === null || isString(row.phone)) &&
    (row.default_job_title === null || isString(row.default_job_title)) &&
    (row.default_description === null || isString(row.default_description)) &&
    (row.default_notes === null || isString(row.default_notes)) &&
    (row.recurring_enabled === null ||
      typeof row.recurring_enabled === 'boolean') &&
    (row.recurring_weekday === null ||
      typeof row.recurring_weekday === 'number') &&
    (row.recurring_weekdays === null ||
      row.recurring_weekdays === undefined ||
      (Array.isArray(row.recurring_weekdays) &&
        row.recurring_weekdays.every(item => typeof item === 'number'))) &&
    (row.recurring_start_time === null || isString(row.recurring_start_time)) &&
    (row.recurring_end_time === null || isString(row.recurring_end_time)) &&
    (row.recurring_service_type === null ||
      isString(row.recurring_service_type)) &&
    (row.recurring_priority === null ||
      typeof row.recurring_priority === 'number') &&
    (row.recurring_fee === null ||
      row.recurring_fee === undefined ||
      isNumber(row.recurring_fee)) &&
    (row.created_at === null || isString(row.created_at)) &&
    (row.updated_at === null || isString(row.updated_at))
  );
};

const WEEKDAY_VALUES: DispatchWeekday[] = [1, 2, 3, 4, 5, 6, 7];

export const normalizeRecurringWeekdays = (
  weekdays: Array<number | DispatchWeekday> | null | undefined
): DispatchWeekday[] => {
  if (!Array.isArray(weekdays)) {
    return [];
  }

  const unique = new Set<DispatchWeekday>();
  weekdays.forEach(value => {
    const numeric = Number(value) as DispatchWeekday;
    if (WEEKDAY_VALUES.includes(numeric)) {
      unique.add(numeric);
    }
  });
  return Array.from(unique).sort((a, b) => a - b);
};

export const toEmployee = (
  row: SupabaseDispatchEmployeeRow
): DispatchEmployee => {
  const employee: DispatchEmployee = {
    id: row.id,
    name: row.name,
    skills: Array.isArray(row.skills) ? row.skills : [],
    status: row.status,
  };
  if (row.name_cn) employee.nameCN = row.name_cn;
  if (row.phone) employee.phone = row.phone;
  return employee;
};

export const toEmployeeLocation = (
  row: SupabaseDispatchEmployeeLocationRow
): DispatchEmployeeLocation => {
  const location: DispatchEmployeeLocation = {
    lat: row.lat,
    lng: row.lng,
    source: row.source || 'mobile',
    updatedAt: row.updated_at,
  };
  if (typeof row.accuracy_m === 'number') {
    location.accuracyM = row.accuracy_m;
  }
  if (row.label) {
    location.label = row.label;
  }
  return location;
};

export const toEmployeeLocationRow = (
  employeeId: string,
  location: DispatchEmployeeLocation
): SupabaseDispatchEmployeeLocationRow => ({
  employee_id: employeeId,
  lat: location.lat,
  lng: location.lng,
  accuracy_m: location.accuracyM ?? null,
  source: location.source,
  label: location.label ?? null,
  updated_at: location.updatedAt,
});

export const mergeEmployeeLocations = (
  employees: DispatchEmployee[],
  locations: Record<string, DispatchEmployeeLocation>
): DispatchEmployee[] =>
  employees.map(employee => {
    const location = locations[employee.id];
    if (!location) {
      return employee;
    }
    return {
      ...employee,
      currentLocation: location,
    };
  });

export const toEmployeeRow = (
  payload: UpsertDispatchEmployeePayload,
  id: string
): SupabaseDispatchEmployeeRow => ({
  id,
  name: payload.name,
  name_cn: payload.nameCN || null,
  phone: payload.phone || null,
  skills: payload.skills,
  status: payload.status,
});

export const toJob = (row: SupabaseDispatchJobRow): DispatchJob => {
  const baseFee =
    typeof row.base_fee === 'number' && Number.isFinite(row.base_fee)
      ? row.base_fee
      : 0;
  const manualAdjustment =
    typeof row.manual_adjustment === 'number' &&
    Number.isFinite(row.manual_adjustment)
      ? row.manual_adjustment
      : 0;
  const derivedReceivable = Number((baseFee + manualAdjustment).toFixed(2));
  const receivableTotal =
    typeof row.receivable_total === 'number' &&
    Number.isFinite(row.receivable_total)
      ? row.receivable_total
      : derivedReceivable;

  const job: DispatchJob = {
    id: row.id,
    title: row.title,
    serviceType: row.service_type,
    status: row.status,
    priority: row.priority,
    scheduledDate: row.scheduled_date,
    scheduledStartTime: row.scheduled_start_time,
    scheduledEndTime: row.scheduled_end_time,
    pricingMode: row.pricing_mode || 'one_time_manual',
    feeCurrency: row.fee_currency || 'AUD',
    baseFee,
    manualAdjustment,
    receivableTotal,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (row.description) job.description = row.description;
  if (row.notes) job.notes = row.notes;
  if (row.image_urls) job.imageUrls = row.image_urls;
  if (row.customer_profile_id) job.customerProfileId = row.customer_profile_id;
  if (row.customer_name) job.customerName = row.customer_name;
  if (row.customer_address) job.customerAddress = row.customer_address;
  if (row.customer_phone) job.customerPhone = row.customer_phone;
  if (row.property_type) job.propertyType = row.property_type;
  if (typeof row.estimated_duration_hours === 'number') {
    job.estimatedDurationHours = row.estimated_duration_hours;
  }
  if (row.assigned_employee_ids) {
    job.assignedEmployeeIds = row.assigned_employee_ids;
  }
  if (row.finance_confirmed_at) {
    job.financeConfirmedAt = row.finance_confirmed_at;
  }
  if (row.finance_confirmed_by) {
    job.financeConfirmedBy = row.finance_confirmed_by;
  }
  if (row.finance_locked_at) {
    job.financeLockedAt = row.finance_locked_at;
  }
  if (row.finance_lock_reason) {
    job.financeLockReason = row.finance_lock_reason;
  }
  if (row.payment_received_at) {
    job.paymentReceivedAt = row.payment_received_at;
  }
  if (row.payment_received_by) {
    job.paymentReceivedBy = row.payment_received_by;
  }
  return job;
};

export const toJobRow = (
  payload: Omit<DispatchJob, 'id' | 'createdAt' | 'updatedAt'>,
  id: string,
  createdAt: string,
  updatedAt: string
): SupabaseDispatchJobRow => {
  const baseFee =
    typeof payload.baseFee === 'number' && Number.isFinite(payload.baseFee)
      ? payload.baseFee
      : 0;
  const manualAdjustment =
    typeof payload.manualAdjustment === 'number' &&
    Number.isFinite(payload.manualAdjustment)
      ? payload.manualAdjustment
      : 0;
  const receivableTotal =
    typeof payload.receivableTotal === 'number' &&
    Number.isFinite(payload.receivableTotal)
      ? payload.receivableTotal
      : Number((baseFee + manualAdjustment).toFixed(2));

  const row: SupabaseDispatchJobRow = {
    id,
    title: payload.title,
    description: payload.description || null,
    notes: payload.notes || null,
    image_urls: payload.imageUrls || null,
    customer_profile_id: payload.customerProfileId || null,
    customer_name: payload.customerName || null,
    customer_address: payload.customerAddress || null,
    customer_phone: payload.customerPhone || null,
    service_type: payload.serviceType,
    property_type: payload.propertyType || null,
    estimated_duration_hours: payload.estimatedDurationHours ?? null,
    status: payload.status,
    priority: payload.priority,
    scheduled_date: payload.scheduledDate,
    scheduled_start_time: payload.scheduledStartTime,
    scheduled_end_time: payload.scheduledEndTime,
    assigned_employee_ids: payload.assignedEmployeeIds || null,
    pricing_mode: payload.pricingMode || 'one_time_manual',
    fee_currency: payload.feeCurrency || 'AUD',
    base_fee: baseFee,
    manual_adjustment: manualAdjustment,
    receivable_total: receivableTotal,
    created_at: createdAt,
    updated_at: updatedAt,
  };

  if (typeof payload.financeConfirmedAt !== 'undefined') {
    row.finance_confirmed_at = payload.financeConfirmedAt || null;
  }
  if (typeof payload.financeConfirmedBy !== 'undefined') {
    row.finance_confirmed_by = payload.financeConfirmedBy || null;
  }
  if (typeof payload.financeLockedAt !== 'undefined') {
    row.finance_locked_at = payload.financeLockedAt || null;
  }
  if (typeof payload.financeLockReason !== 'undefined') {
    row.finance_lock_reason = payload.financeLockReason || null;
  }
  if (typeof payload.paymentReceivedAt !== 'undefined') {
    row.payment_received_at = payload.paymentReceivedAt || null;
  }
  if (typeof payload.paymentReceivedBy !== 'undefined') {
    row.payment_received_by = payload.paymentReceivedBy || null;
  }

  return row;
};

export const toCustomerProfile = (
  row: SupabaseDispatchCustomerProfileRow
): DispatchCustomerProfile => {
  const now = new Date().toISOString();
  const profile: DispatchCustomerProfile = {
    id: row.id,
    name: row.name,
    createdAt: row.created_at || now,
    updatedAt: row.updated_at || now,
  };

  if (row.address) profile.address = row.address;
  if (row.phone) profile.phone = row.phone;
  if (row.default_job_title) profile.defaultJobTitle = row.default_job_title;
  if (row.default_description)
    profile.defaultDescription = row.default_description;
  if (row.default_notes) profile.defaultNotes = row.default_notes;
  if (typeof row.recurring_enabled === 'boolean') {
    profile.recurringEnabled = row.recurring_enabled;
  }
  if (row.recurring_weekday) profile.recurringWeekday = row.recurring_weekday;
  const recurringWeekdays = normalizeRecurringWeekdays(row.recurring_weekdays);
  if (recurringWeekdays.length > 0) {
    profile.recurringWeekdays = recurringWeekdays;
    if (!profile.recurringWeekday) {
      const firstWeekday = recurringWeekdays[0];
      if (firstWeekday) {
        profile.recurringWeekday = firstWeekday;
      }
    }
  }
  if (row.recurring_start_time)
    profile.recurringStartTime = row.recurring_start_time;
  if (row.recurring_end_time) profile.recurringEndTime = row.recurring_end_time;
  if (row.recurring_service_type) {
    profile.recurringServiceType = row.recurring_service_type;
  }
  if (row.recurring_priority)
    profile.recurringPriority = row.recurring_priority;
  if (
    typeof row.recurring_fee === 'number' &&
    Number.isFinite(row.recurring_fee)
  ) {
    profile.recurringFee = row.recurring_fee;
  }

  return profile;
};

export const toCustomerProfileRow = (
  payload: UpsertDispatchCustomerProfilePayload,
  id: string
): Omit<SupabaseDispatchCustomerProfileRow, 'created_at' | 'updated_at'> => {
  const recurringWeekdays = normalizeRecurringWeekdays(
    payload.recurringWeekdays
  );
  const fallbackWeekday = payload.recurringWeekday || null;
  const firstWeekday = recurringWeekdays[0] || fallbackWeekday;

  return {
    id,
    name: payload.name,
    address: payload.address || null,
    phone: payload.phone || null,
    default_job_title: payload.defaultJobTitle || null,
    default_description: payload.defaultDescription || null,
    default_notes: payload.defaultNotes || null,
    recurring_enabled:
      typeof payload.recurringEnabled === 'boolean'
        ? payload.recurringEnabled
        : null,
    recurring_weekday: firstWeekday,
    recurring_weekdays: recurringWeekdays.length > 1 ? recurringWeekdays : null,
    recurring_start_time: payload.recurringStartTime || null,
    recurring_end_time: payload.recurringEndTime || null,
    recurring_service_type: payload.recurringServiceType || null,
    recurring_priority: payload.recurringPriority || null,
    recurring_fee:
      typeof payload.recurringFee === 'number' &&
      Number.isFinite(payload.recurringFee)
        ? payload.recurringFee
        : null,
  };
};
