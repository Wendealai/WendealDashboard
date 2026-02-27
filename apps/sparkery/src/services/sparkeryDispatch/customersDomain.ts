import type {
  CreateDispatchJobPayload,
  DispatchCustomerProfile,
  DispatchJob,
  UpsertDispatchCustomerProfilePayload,
} from '@/pages/Sparkery/dispatch/types';
import {
  ensureSupabaseRows,
  isSupabaseDispatchCustomerProfileRowValue,
  normalizeRecurringWeekdays,
  toCustomerProfile,
  toCustomerProfileRow,
  type SupabaseDispatchCustomerProfileRow,
} from './mapperLayer';
import type { SupabaseConfig } from './apiLayer';

type SupabaseFetch = <T>(path: string, options?: RequestInit) => Promise<T>;

interface DispatchStorageWithCustomers {
  jobs: DispatchJob[];
  customerProfiles: DispatchCustomerProfile[];
  [key: string]: unknown;
}

export interface DispatchCustomersDomainDependencies {
  getSupabaseConfig: () => SupabaseConfig | null;
  supabaseFetch: SupabaseFetch;
  loadStorage: () => DispatchStorageWithCustomers;
  saveStorage: (storage: DispatchStorageWithCustomers) => void;
  getJobs: (params?: {
    weekStart?: string;
    weekEnd?: string;
  }) => Promise<DispatchJob[]>;
  createJob: (payload: CreateDispatchJobPayload) => Promise<DispatchJob>;
  roundMoney: (value: number) => number;
  generateId: (prefix: string) => string;
}

export interface DispatchCustomersDomainService {
  getCustomerProfiles(): Promise<DispatchCustomerProfile[]>;
  upsertCustomerProfile(
    payload: UpsertDispatchCustomerProfilePayload
  ): Promise<DispatchCustomerProfile>;
  createJobsFromRecurringProfiles(
    weekStart: string,
    weekEnd: string
  ): Promise<DispatchJob[]>;
}

const DISPATCH_FINANCE_SCHEMA_ERROR_MESSAGE =
  'Dispatch finance schema is missing in Supabase. Run docs/supabase/dispatch-finance.sql in SQL Editor, then refresh.';

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

export const createDispatchCustomersDomainService = (
  deps: DispatchCustomersDomainDependencies
): DispatchCustomersDomainService => {
  const service: DispatchCustomersDomainService = {
    async getCustomerProfiles() {
      if (deps.getSupabaseConfig()) {
        const rowsRaw = await deps.supabaseFetch<unknown[]>(
          '/rest/v1/dispatch_customer_profiles?select=*&order=updated_at.desc.nullslast,id.asc'
        );
        const rows = ensureSupabaseRows(
          rowsRaw,
          isSupabaseDispatchCustomerProfileRowValue,
          'dispatch_customer_profiles'
        );
        return rows.map(toCustomerProfile);
      }
      return deps.loadStorage().customerProfiles;
    },

    async upsertCustomerProfile(payload: UpsertDispatchCustomerProfilePayload) {
      if (deps.getSupabaseConfig()) {
        const row = toCustomerProfileRow(
          payload,
          payload.id || deps.generateId('customer')
        );
        let result: SupabaseDispatchCustomerProfileRow[];
        try {
          const resultRaw = await deps.supabaseFetch<unknown[]>(
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

          const fallbackResultRaw = await deps.supabaseFetch<unknown[]>(
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

      const storage = deps.loadStorage();
      const now = new Date().toISOString();
      const profileId = payload.id || deps.generateId('customer');
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
        baseProfile.recurringFee = deps.roundMoney(payload.recurringFee);
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
        deps.saveStorage(storage);
        return updated;
      }

      storage.customerProfiles.unshift(baseProfile);
      deps.saveStorage(storage);
      return baseProfile;
    },

    async createJobsFromRecurringProfiles(weekStart: string, weekEnd: string) {
      if (deps.getSupabaseConfig()) {
        const profiles = await service.getCustomerProfiles();
        const existingJobs = await deps.getJobs({ weekStart, weekEnd });
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
              baseFee: deps.roundMoney(profile.recurringFee || 0),
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

            const createdJob = await deps.createJob(createPayload);
            created.push(createdJob);
          }
        }

        return created;
      }

      const storage = deps.loadStorage();
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
            id: deps.generateId('job'),
            title:
              profile.defaultJobTitle || `${profile.name} Recurring Service`,
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
            baseFee: deps.roundMoney(profile.recurringFee || 0),
            manualAdjustment: 0,
            receivableTotal: deps.roundMoney(profile.recurringFee || 0),
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

      deps.saveStorage(storage);
      return created;
    },
  };

  return service;
};
