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
import { createDispatchCustomersDomainService } from './customersDomain';
import { createDispatchEmployeesDomainService } from './employeesDomain';
import {
  createDispatchJobsDomainService,
  type DispatchJobMutationOptions,
} from './jobsDomain';
import { createDispatchRecoveryDomainService } from './recoveryDomain';
import {
  ensureSupabaseRows,
  isSupabaseDispatchEmployeeRowValue,
  toEmployeeRow,
  type SupabaseDispatchEmployeeRow,
} from './mapperLayer';

interface DispatchStorage {
  jobs: DispatchJob[];
  employees: DispatchEmployee[];
  schedules: EmployeeSchedule[];
  customerProfiles: DispatchCustomerProfile[];
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

const dispatchJobsDomain = createDispatchJobsDomainService({
  getSupabaseConfig,
  supabaseFetch,
  loadStorage: () => loadStorage() as { jobs: DispatchJob[] },
  saveStorage: storage => saveStorage(storage as unknown as DispatchStorage),
  trackSparkeryEvent,
  generateId,
});

const dispatchEmployeesDomain = createDispatchEmployeesDomainService({
  getSupabaseConfig,
  supabaseFetch,
  loadStorage: () =>
    loadStorage() as {
      jobs: DispatchJob[];
      employees: DispatchEmployee[];
      schedules: EmployeeSchedule[];
    },
  saveStorage: storage => saveStorage(storage as unknown as DispatchStorage),
  loadLocalEmployeeLocations,
  saveLocalEmployeeLocations,
  mergeInspectionEmployees,
  syncInspectionEmployeesFromDispatch,
  removeInspectionEmployeeMirror,
  ensureSupabaseEmployeeExists,
  normalizeEmployeeLocation,
  isSupabaseRelationMissingError,
  isSupabaseForeignKeyError,
  generateId,
});

const dispatchCustomersDomain = createDispatchCustomersDomainService({
  getSupabaseConfig,
  supabaseFetch,
  loadStorage: () =>
    loadStorage() as {
      jobs: DispatchJob[];
      customerProfiles: DispatchCustomerProfile[];
    },
  saveStorage: storage => saveStorage(storage as unknown as DispatchStorage),
  getJobs: params => dispatchJobsDomain.getJobs(params),
  createJob: payload => dispatchJobsDomain.createJob(payload),
  roundMoney,
  generateId,
});

const dispatchRecoveryDomain = createDispatchRecoveryDomainService({
  getSupabaseConfig,
  supabaseFetch,
  loadStorage,
  saveStorage,
  loadLocalEmployeeLocations,
  saveLocalEmployeeLocations,
  isSupabaseRelationMissingError,
  defaultEmployees,
});

export const sparkeryDispatchService = {
  async getJobs(params?: {
    weekStart?: string;
    weekEnd?: string;
  }): Promise<DispatchJob[]> {
    return dispatchJobsDomain.getJobs(params);
  },

  async createJob(
    payload: CreateDispatchJobPayload,
    options?: DispatchJobMutationOptions
  ): Promise<DispatchJob> {
    return dispatchJobsDomain.createJob(payload, options);
  },

  async updateJob(
    id: string,
    patch: UpdateDispatchJobPayload,
    options?: DispatchJobMutationOptions
  ): Promise<DispatchJob> {
    return dispatchJobsDomain.updateJob(id, patch, options);
  },

  async assignJob(
    id: string,
    employeeIds: string[],
    options?: DispatchJobMutationOptions
  ): Promise<DispatchJob> {
    return dispatchJobsDomain.assignJob(id, employeeIds, options);
  },

  async updateJobStatus(
    id: string,
    status: DispatchJobStatus,
    options?: DispatchJobMutationOptions
  ): Promise<DispatchJob> {
    return dispatchJobsDomain.updateJobStatus(id, status, options);
  },

  async deleteJob(id: string): Promise<void> {
    return dispatchJobsDomain.deleteJob(id);
  },

  async applyJobFinanceAdjustment(
    id: string,
    adjustmentDelta: number,
    options?: DispatchJobMutationOptions
  ): Promise<DispatchJob> {
    return dispatchJobsDomain.applyJobFinanceAdjustment(
      id,
      adjustmentDelta,
      options
    );
  },

  async confirmJobFinance(
    id: string,
    confirmedBy?: string,
    options?: DispatchJobMutationOptions
  ): Promise<DispatchJob> {
    return dispatchJobsDomain.confirmJobFinance(id, confirmedBy, options);
  },

  async setJobPaymentReceived(
    id: string,
    received: boolean,
    receivedBy?: string,
    options?: DispatchJobMutationOptions
  ): Promise<DispatchJob> {
    return dispatchJobsDomain.setJobPaymentReceived(
      id,
      received,
      receivedBy,
      options
    );
  },

  async getEmployeeLocations(): Promise<
    Record<string, DispatchEmployeeLocation>
  > {
    return dispatchEmployeesDomain.getEmployeeLocations();
  },

  async reportEmployeeLocation(
    employeeId: string,
    locationInput: Omit<DispatchEmployeeLocation, 'updatedAt'> & {
      updatedAt?: string;
    }
  ): Promise<DispatchEmployeeLocation> {
    return dispatchEmployeesDomain.reportEmployeeLocation(
      employeeId,
      locationInput
    );
  },

  async getEmployees(): Promise<DispatchEmployee[]> {
    return dispatchEmployeesDomain.getEmployees();
  },

  async upsertEmployee(
    payload: UpsertDispatchEmployeePayload
  ): Promise<DispatchEmployee> {
    return dispatchEmployeesDomain.upsertEmployee(payload);
  },

  async deleteEmployee(id: string): Promise<void> {
    return dispatchEmployeesDomain.deleteEmployee(id);
  },

  async upsertEmployeeSchedule(
    schedule: EmployeeSchedule
  ): Promise<EmployeeSchedule> {
    return dispatchEmployeesDomain.upsertEmployeeSchedule(schedule);
  },

  async getCustomerProfiles(): Promise<DispatchCustomerProfile[]> {
    return dispatchCustomersDomain.getCustomerProfiles();
  },

  async upsertCustomerProfile(
    payload: UpsertDispatchCustomerProfilePayload
  ): Promise<DispatchCustomerProfile> {
    return dispatchCustomersDomain.upsertCustomerProfile(payload);
  },

  async createJobsFromRecurringProfiles(
    weekStart: string,
    weekEnd: string
  ): Promise<DispatchJob[]> {
    return dispatchCustomersDomain.createJobsFromRecurringProfiles(
      weekStart,
      weekEnd
    );
  },

  async migrateLocalPeopleToSupabase(): Promise<{
    employees: number;
    customerProfiles: number;
    jobs: number;
  }> {
    return dispatchRecoveryDomain.migrateLocalPeopleToSupabase();
  },

  async exportBackup(): Promise<string> {
    return dispatchRecoveryDomain.exportBackup();
  },

  async importBackup(rawBackup: string): Promise<DispatchStorage> {
    return dispatchRecoveryDomain.importBackup(rawBackup);
  },
};
