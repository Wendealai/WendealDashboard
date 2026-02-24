import type {
  CreateDispatchJobPayload,
  DispatchCustomerProfile,
  DispatchEmployee,
  DispatchEmployeeLocation,
  DispatchJob,
  EmployeeSchedule,
} from '@/pages/Sparkery/dispatch/types';
import { createDispatchCustomersDomainService } from '@/services/sparkeryDispatch/customersDomain';
import { createDispatchEmployeesDomainService } from '@/services/sparkeryDispatch/employeesDomain';
import { createDispatchJobsDomainService } from '@/services/sparkeryDispatch/jobsDomain';
import {
  createDispatchRecoveryDomainService,
  type DispatchRecoveryStorage,
} from '@/services/sparkeryDispatch/recoveryDomain';

const createBaseJob = (
  id: string,
  patch: Partial<DispatchJob> = {}
): DispatchJob => ({
  id,
  title: patch.title || 'Job',
  serviceType: patch.serviceType || 'regular',
  status: patch.status || 'pending',
  priority: patch.priority || 3,
  scheduledDate: patch.scheduledDate || '2026-02-24',
  scheduledStartTime: patch.scheduledStartTime || '09:00',
  scheduledEndTime: patch.scheduledEndTime || '11:00',
  createdAt: patch.createdAt || new Date().toISOString(),
  updatedAt: patch.updatedAt || new Date().toISOString(),
  ...patch,
});

const createJobPayload = (
  patch: Partial<CreateDispatchJobPayload> = {}
): CreateDispatchJobPayload => ({
  title: patch.title || 'New Job',
  serviceType: patch.serviceType || 'regular',
  priority: patch.priority || 3,
  scheduledDate: patch.scheduledDate || '2026-02-24',
  scheduledStartTime: patch.scheduledStartTime || '10:00',
  scheduledEndTime: patch.scheduledEndTime || '12:00',
  ...patch,
});

describe('sparkery dispatch domain split contracts', () => {
  it('keeps jobs local finance flow consistent and emits traceId telemetry', async () => {
    const storage: { jobs: DispatchJob[] } = { jobs: [] };
    const events: Array<{
      name: string;
      payload: { data?: Record<string, unknown> };
    }> = [];
    let idCounter = 0;

    const service = createDispatchJobsDomainService({
      getSupabaseConfig: () => null,
      supabaseFetch: async <T>(): Promise<T> => {
        throw new Error('supabase should not be called in local test');
      },
      loadStorage: () => storage,
      saveStorage: next => {
        storage.jobs = next.jobs;
      },
      trackSparkeryEvent: (name, payload) => {
        events.push({ name, payload });
      },
      generateId: prefix => `${prefix}-${++idCounter}`,
    });

    const created = await service.createJob(
      createJobPayload({
        baseFee: 100,
        manualAdjustment: 20,
      }),
      {
        userId: 'dispatch-user-qa-001',
      }
    );
    expect(created.receivableTotal).toBe(120);

    const adjusted = await service.applyJobFinanceAdjustment(created.id, 5, {
      userId: 'dispatch-user-qa-001',
    });
    expect(adjusted.manualAdjustment).toBe(25);
    expect(adjusted.receivableTotal).toBe(125);

    await service.updateJobStatus(created.id, 'completed');
    const confirmed = await service.confirmJobFinance(created.id, 'qa-user');
    expect(Boolean(confirmed.financeLockedAt)).toBe(true);

    const received = await service.setJobPaymentReceived(
      created.id,
      true,
      'finance'
    );
    expect(Boolean(received.paymentReceivedAt)).toBe(true);

    const createTelemetry = events.find(
      event => event.name === 'dispatch.job.create.succeeded'
    );
    expect(typeof createTelemetry?.payload.data?.traceId).toBe('string');
    expect(createTelemetry?.payload.data?.userId).toBe('dispatch-user-qa-001');
    const updateTelemetry = events.find(
      event => event.name === 'dispatch.job.update.succeeded'
    );
    expect(updateTelemetry?.payload.data?.userId).toBe('dispatch-user-qa-001');
  });

  it('handles employees local location/report/delete without regression', async () => {
    const storage: {
      jobs: DispatchJob[];
      employees: DispatchEmployee[];
      schedules: EmployeeSchedule[];
    } = {
      jobs: [
        createBaseJob('job-1', {
          status: 'assigned',
          assignedEmployeeIds: ['emp-1'],
        }),
      ],
      employees: [
        {
          id: 'emp-1',
          name: 'Alex',
          skills: ['regular'],
          status: 'available',
        },
      ],
      schedules: [],
    };
    let localLocations: Record<string, DispatchEmployeeLocation> = {};
    let removedMirrorId: string | null = null;
    let idCounter = 0;

    const service = createDispatchEmployeesDomainService({
      getSupabaseConfig: () => null,
      supabaseFetch: async <T>(): Promise<T> => {
        throw new Error('supabase should not be called in local test');
      },
      loadStorage: () => storage,
      saveStorage: next => {
        storage.jobs = next.jobs;
        storage.employees = next.employees;
        storage.schedules = next.schedules;
      },
      loadLocalEmployeeLocations: () => localLocations,
      saveLocalEmployeeLocations: locations => {
        localLocations = locations;
      },
      mergeInspectionEmployees: async employees => employees,
      syncInspectionEmployeesFromDispatch: async () => undefined,
      removeInspectionEmployeeMirror: async employeeId => {
        removedMirrorId = employeeId;
      },
      ensureSupabaseEmployeeExists: async () => undefined,
      normalizeEmployeeLocation: location => ({
        lat: Number(location.lat),
        lng: Number(location.lng),
        source: location.source,
        updatedAt: location.updatedAt || '2026-02-24T00:00:00.000Z',
        ...(typeof location.accuracyM === 'number'
          ? { accuracyM: location.accuracyM }
          : {}),
        ...(location.label ? { label: location.label } : {}),
      }),
      isSupabaseRelationMissingError: () => false,
      isSupabaseForeignKeyError: () => false,
      generateId: prefix => `${prefix}-${++idCounter}`,
    });

    await service.reportEmployeeLocation('emp-1', {
      lat: -27.4698,
      lng: 153.0251,
      source: 'manual',
      label: 'Brisbane CBD',
    });
    const employeesWithLocations = await service.getEmployees();
    expect(employeesWithLocations[0]?.currentLocation?.label).toBe(
      'Brisbane CBD'
    );

    await service.deleteEmployee('emp-1');
    expect(storage.employees).toHaveLength(0);
    expect(storage.jobs[0]?.assignedEmployeeIds).toBeUndefined();
    expect(storage.jobs[0]?.status).toBe('pending');
    expect(removedMirrorId).toBe('emp-1');
  });

  it('creates recurring jobs locally and prevents duplicate generation', async () => {
    const storage: {
      jobs: DispatchJob[];
      customerProfiles: DispatchCustomerProfile[];
    } = {
      jobs: [],
      customerProfiles: [],
    };
    let idCounter = 0;

    const service = createDispatchCustomersDomainService({
      getSupabaseConfig: () => null,
      supabaseFetch: async <T>(): Promise<T> => {
        throw new Error('supabase should not be called in local test');
      },
      loadStorage: () => storage,
      saveStorage: next => {
        storage.jobs = next.jobs;
        storage.customerProfiles = next.customerProfiles;
      },
      getJobs: async () => storage.jobs,
      createJob: async payload => createBaseJob('unused', payload),
      roundMoney: value =>
        Number((Number.isFinite(value) ? value : 0).toFixed(2)),
      generateId: prefix => `${prefix}-${++idCounter}`,
    });

    const profile = await service.upsertCustomerProfile({
      name: 'Acme Pty Ltd',
      recurringEnabled: true,
      recurringWeekdays: [3, 5],
      recurringStartTime: '09:00',
      recurringEndTime: '11:00',
      recurringServiceType: 'regular',
      recurringPriority: 3,
      recurringFee: 199.995,
    });
    expect(profile.recurringFee).toBe(200);
    expect(profile.recurringWeekday).toBe(3);

    const firstBatch = await service.createJobsFromRecurringProfiles(
      '2026-02-23',
      '2026-03-01'
    );
    expect(firstBatch).toHaveLength(2);
    expect(firstBatch[0]?.pricingMode).toBe('recurring_fixed');
    expect(firstBatch[0]?.receivableTotal).toBe(200);

    const secondBatch = await service.createJobsFromRecurringProfiles(
      '2026-02-23',
      '2026-03-01'
    );
    expect(secondBatch).toHaveLength(0);
  });

  it('supports recovery export/import and supabase migration contract', async () => {
    const storage: DispatchRecoveryStorage = {
      jobs: [
        createBaseJob('job-1', {
          customerProfileId: 'customer-1',
          customerName: 'Acme Pty Ltd',
          assignedEmployeeIds: ['emp-1'],
        }),
      ],
      employees: [
        {
          id: 'emp-1',
          name: 'Alex',
          skills: ['regular'],
          status: 'available',
        },
      ],
      schedules: [],
      customerProfiles: [
        {
          id: 'customer-1',
          name: 'Acme Pty Ltd',
          createdAt: '2026-02-24T00:00:00.000Z',
          updatedAt: '2026-02-24T00:00:00.000Z',
        },
      ],
    };
    let localLocations: Record<string, DispatchEmployeeLocation> = {
      'emp-1': {
        lat: -27.4698,
        lng: 153.0251,
        source: 'manual',
        updatedAt: '2026-02-24T00:00:00.000Z',
      },
    };
    const supabasePaths: string[] = [];

    const service = createDispatchRecoveryDomainService({
      getSupabaseConfig: () => ({
        url: 'https://example.supabase.co',
        anonKey: 'key',
      }),
      supabaseFetch: async <T>(path: string): Promise<T> => {
        supabasePaths.push(path);
        return [] as unknown as T;
      },
      loadStorage: () => storage,
      saveStorage: next => {
        storage.jobs = next.jobs;
        storage.employees = next.employees;
        storage.schedules = next.schedules;
        storage.customerProfiles = next.customerProfiles;
      },
      loadLocalEmployeeLocations: () => localLocations,
      saveLocalEmployeeLocations: locations => {
        localLocations = locations;
      },
      isSupabaseRelationMissingError: () => false,
      defaultEmployees: [
        {
          id: 'emp-default',
          name: 'Default',
          skills: ['regular'],
          status: 'available',
        },
      ],
    });

    const backup = await service.exportBackup();
    const imported = await service.importBackup(backup);
    expect(imported.jobs).toHaveLength(1);
    expect(imported.employees[0]?.currentLocation?.lat).toBe(-27.4698);

    const result = await service.migrateLocalPeopleToSupabase();
    expect(result).toEqual({
      employees: 1,
      customerProfiles: 1,
      jobs: 1,
    });
    expect(supabasePaths).toEqual(
      expect.arrayContaining([
        '/rest/v1/dispatch_employees?on_conflict=id',
        '/rest/v1/dispatch_employee_locations?on_conflict=employee_id',
        '/rest/v1/dispatch_customer_profiles?on_conflict=id',
        '/rest/v1/dispatch_jobs?on_conflict=id',
      ])
    );
  });
});
