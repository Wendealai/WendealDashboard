import type {
  DispatchEmployee,
  DispatchEmployeeLocation,
  DispatchJob,
  EmployeeSchedule,
  UpsertDispatchEmployeePayload,
} from '@/pages/Sparkery/dispatch/types';
import {
  ensureSupabaseRows,
  isSupabaseDispatchEmployeeLocationRowValue,
  isSupabaseDispatchEmployeeRowValue,
  mergeEmployeeLocations,
  toEmployee,
  toEmployeeLocation,
  toEmployeeLocationRow,
  toEmployeeRow,
  type SupabaseDispatchEmployeeLocationRow,
  type SupabaseDispatchEmployeeRow,
} from './mapperLayer';
import type { SupabaseConfig } from './apiLayer';

type SupabaseFetch = <T>(path: string, options?: RequestInit) => Promise<T>;

interface DispatchStorageWithEmployees {
  jobs: DispatchJob[];
  employees: DispatchEmployee[];
  schedules: EmployeeSchedule[];
  [key: string]: unknown;
}

export interface DispatchEmployeesDomainDependencies {
  getSupabaseConfig: () => SupabaseConfig | null;
  supabaseFetch: SupabaseFetch;
  loadStorage: () => DispatchStorageWithEmployees;
  saveStorage: (storage: DispatchStorageWithEmployees) => void;
  loadLocalEmployeeLocations: () => Record<string, DispatchEmployeeLocation>;
  saveLocalEmployeeLocations: (
    locations: Record<string, DispatchEmployeeLocation>
  ) => void;
  mergeInspectionEmployees: (
    dispatchEmployees: DispatchEmployee[]
  ) => Promise<DispatchEmployee[]>;
  syncInspectionEmployeesFromDispatch: (
    dispatchEmployees: DispatchEmployee[]
  ) => Promise<void>;
  removeInspectionEmployeeMirror: (employeeId: string) => Promise<void>;
  ensureSupabaseEmployeeExists: (employeeId: string) => Promise<void>;
  normalizeEmployeeLocation: (
    location: Omit<DispatchEmployeeLocation, 'updatedAt'> & {
      updatedAt?: string;
    }
  ) => DispatchEmployeeLocation;
  isSupabaseRelationMissingError: (
    error: unknown,
    relationName: string
  ) => boolean;
  isSupabaseForeignKeyError: (
    error: unknown,
    constraintName?: string
  ) => boolean;
  generateId: (prefix: string) => string;
}

export interface DispatchEmployeesDomainService {
  getEmployeeLocations(): Promise<Record<string, DispatchEmployeeLocation>>;
  reportEmployeeLocation(
    employeeId: string,
    locationInput: Omit<DispatchEmployeeLocation, 'updatedAt'> & {
      updatedAt?: string;
    }
  ): Promise<DispatchEmployeeLocation>;
  getEmployees(): Promise<DispatchEmployee[]>;
  upsertEmployee(
    payload: UpsertDispatchEmployeePayload
  ): Promise<DispatchEmployee>;
  deleteEmployee(id: string): Promise<void>;
  upsertEmployeeSchedule(schedule: EmployeeSchedule): Promise<EmployeeSchedule>;
}

export const createDispatchEmployeesDomainService = (
  deps: DispatchEmployeesDomainDependencies
): DispatchEmployeesDomainService => {
  const service: DispatchEmployeesDomainService = {
    async getEmployeeLocations() {
      const supabaseConfig = deps.getSupabaseConfig();
      if (supabaseConfig) {
        try {
          const rowsRaw = await deps.supabaseFetch<unknown[]>(
            '/rest/v1/dispatch_employee_locations?select=*&order=updated_at.desc.nullslast,employee_id.asc'
          );
          const rows = ensureSupabaseRows(
            rowsRaw,
            isSupabaseDispatchEmployeeLocationRowValue,
            'dispatch_employee_locations'
          );
          const locations = rows.reduce<
            Record<string, DispatchEmployeeLocation>
          >((acc, row) => {
            acc[row.employee_id] = toEmployeeLocation(row);
            return acc;
          }, {});
          deps.saveLocalEmployeeLocations(locations);
          return locations;
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

      return deps.loadLocalEmployeeLocations();
    },

    async reportEmployeeLocation(employeeId: string, locationInput) {
      const location = deps.normalizeEmployeeLocation(locationInput);
      const supabaseConfig = deps.getSupabaseConfig();

      if (supabaseConfig) {
        const upsertLocation =
          async (): Promise<DispatchEmployeeLocation | null> => {
            const row = toEmployeeLocationRow(employeeId, location);
            const result = await deps.supabaseFetch<
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
            const localLocations = deps.loadLocalEmployeeLocations();
            localLocations[employeeId] = resolved;
            deps.saveLocalEmployeeLocations(localLocations);
            return resolved;
          };

        try {
          const resolved = await upsertLocation();
          if (resolved) {
            return resolved;
          }
        } catch (error) {
          if (
            deps.isSupabaseForeignKeyError(
              error,
              'dispatch_employee_locations_employee_id_fkey'
            )
          ) {
            await deps.ensureSupabaseEmployeeExists(employeeId);
            const resolved = await upsertLocation();
            if (resolved) {
              return resolved;
            }
          }

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

      const localLocations = deps.loadLocalEmployeeLocations();
      localLocations[employeeId] = location;
      deps.saveLocalEmployeeLocations(localLocations);
      return location;
    },

    async getEmployees() {
      if (deps.getSupabaseConfig()) {
        const rowsRaw = await deps.supabaseFetch<unknown[]>(
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
          locations = await service.getEmployeeLocations();
        } catch {
          locations = deps.loadLocalEmployeeLocations();
        }
        const withLocations = mergeEmployeeLocations(baseEmployees, locations);
        return deps.mergeInspectionEmployees(withLocations);
      }

      const storage = deps.loadStorage();
      const locations = deps.loadLocalEmployeeLocations();
      const withLocations = mergeEmployeeLocations(
        storage.employees,
        locations
      );
      return deps.mergeInspectionEmployees(withLocations);
    },

    async upsertEmployee(payload: UpsertDispatchEmployeePayload) {
      if (deps.getSupabaseConfig()) {
        const row = toEmployeeRow(
          payload,
          payload.id || deps.generateId('emp')
        );
        const resultRaw = await deps.supabaseFetch<unknown[]>(
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
        const locations = await service.getEmployeeLocations();
        const location = locations[employee.id];
        const mergedEmployee = !location
          ? employee
          : {
              ...employee,
              currentLocation: location,
            };
        await deps.syncInspectionEmployeesFromDispatch([mergedEmployee]);
        return mergedEmployee;
      }

      const storage = deps.loadStorage();
      const employeeId = payload.id || deps.generateId('emp');
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
      deps.saveStorage(storage);
      await deps.syncInspectionEmployeesFromDispatch(storage.employees);
      return next;
    },

    async deleteEmployee(id: string) {
      const encodedId = encodeURIComponent(id);

      if (deps.getSupabaseConfig()) {
        try {
          await deps.supabaseFetch<SupabaseDispatchEmployeeLocationRow[]>(
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
            !deps.isSupabaseRelationMissingError(
              error,
              'dispatch_employee_locations'
            )
          ) {
            throw error;
          }
        }

        await deps.supabaseFetch<SupabaseDispatchEmployeeRow[]>(
          `/rest/v1/dispatch_employees?id=eq.${encodedId}`,
          {
            method: 'DELETE',
            headers: {
              Prefer: 'return=representation',
            },
          }
        );
      }

      const storage = deps.loadStorage();
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
      deps.saveStorage(storage);

      const localLocations = deps.loadLocalEmployeeLocations();
      if (localLocations[id]) {
        delete localLocations[id];
        deps.saveLocalEmployeeLocations(localLocations);
      }

      try {
        await deps.removeInspectionEmployeeMirror(id);
      } catch {
        // Best-effort cleanup only; ignore mirror deletion failures.
      }
    },

    async upsertEmployeeSchedule(schedule: EmployeeSchedule) {
      const storage = deps.loadStorage();
      const idx = storage.schedules.findIndex(s => s.id === schedule.id);
      if (idx >= 0) {
        storage.schedules[idx] = schedule;
      } else {
        storage.schedules.push(schedule);
      }
      deps.saveStorage(storage);
      return schedule;
    },
  };

  return service;
};
