import type {
  DispatchCustomerProfile,
  DispatchEmployee,
  DispatchEmployeeLocation,
  DispatchJob,
  EmployeeSchedule,
} from '@/pages/Sparkery/dispatch/types';
import {
  mergeEmployeeLocations,
  toCustomerProfileRow,
  toEmployeeLocationRow,
  toEmployeeRow,
  toJobRow,
  type SupabaseDispatchCustomerProfileRow,
  type SupabaseDispatchEmployeeLocationRow,
  type SupabaseDispatchEmployeeRow,
  type SupabaseDispatchJobRow,
} from './mapperLayer';
import type { SupabaseConfig } from './apiLayer';

type SupabaseFetch = <T>(path: string, options?: RequestInit) => Promise<T>;

export interface DispatchRecoveryStorage {
  jobs: DispatchJob[];
  employees: DispatchEmployee[];
  schedules: EmployeeSchedule[];
  customerProfiles: DispatchCustomerProfile[];
}

interface DispatchBackupPayload {
  version: 'v1';
  exportedAt: string;
  data: DispatchRecoveryStorage;
  employeeLocations?: Record<string, DispatchEmployeeLocation>;
}

export interface DispatchRecoveryDomainDependencies {
  getSupabaseConfig: () => SupabaseConfig | null;
  supabaseFetch: SupabaseFetch;
  loadStorage: () => DispatchRecoveryStorage;
  saveStorage: (storage: DispatchRecoveryStorage) => void;
  loadLocalEmployeeLocations: () => Record<string, DispatchEmployeeLocation>;
  saveLocalEmployeeLocations: (
    locations: Record<string, DispatchEmployeeLocation>
  ) => void;
  isSupabaseRelationMissingError: (
    error: unknown,
    relationName: string
  ) => boolean;
  defaultEmployees: DispatchEmployee[];
}

export interface DispatchRecoveryDomainService {
  migrateLocalPeopleToSupabase(): Promise<{
    employees: number;
    customerProfiles: number;
    jobs: number;
  }>;
  exportBackup(): Promise<string>;
  importBackup(rawBackup: string): Promise<DispatchRecoveryStorage>;
}

export const createDispatchRecoveryDomainService = (
  deps: DispatchRecoveryDomainDependencies
): DispatchRecoveryDomainService => {
  const service: DispatchRecoveryDomainService = {
    async migrateLocalPeopleToSupabase() {
      if (!deps.getSupabaseConfig()) {
        throw new Error('Supabase is not configured');
      }

      const storage = deps.loadStorage();
      const localLocations = deps.loadLocalEmployeeLocations();
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
        await deps.supabaseFetch<SupabaseDispatchEmployeeRow[]>(
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
          await deps.supabaseFetch<SupabaseDispatchEmployeeLocationRow[]>(
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
            !deps.isSupabaseRelationMissingError(
              error,
              'dispatch_employee_locations'
            )
          ) {
            throw error;
          }
        }
      }

      if (customerRows.length > 0) {
        await deps.supabaseFetch<SupabaseDispatchCustomerProfileRow[]>(
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
        await deps.supabaseFetch<SupabaseDispatchJobRow[]>(
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

    async exportBackup() {
      const storage = deps.loadStorage();
      const employeeLocations = deps.loadLocalEmployeeLocations();
      const payload: DispatchBackupPayload = {
        version: 'v1',
        exportedAt: new Date().toISOString(),
        data: storage,
        employeeLocations,
      };
      return JSON.stringify(payload, null, 2);
    },

    async importBackup(rawBackup: string) {
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
      deps.saveLocalEmployeeLocations(employeeLocations);

      const nextStorage: DispatchRecoveryStorage = {
        jobs: Array.isArray(parsed.data.jobs) ? parsed.data.jobs : [],
        employees: Array.isArray(parsed.data.employees)
          ? parsed.data.employees
          : deps.defaultEmployees,
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
      const mergedStorage: DispatchRecoveryStorage = {
        ...nextStorage,
        employees: mergedEmployees,
      };

      deps.saveStorage(mergedStorage);
      return mergedStorage;
    },
  };

  return service;
};
