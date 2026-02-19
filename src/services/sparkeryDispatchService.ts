import type {
  CreateDispatchJobPayload,
  DispatchEmployee,
  DispatchJob,
  DispatchJobStatus,
  EmployeeSchedule,
  UpdateDispatchJobPayload,
} from '@/pages/Sparkery/dispatch/types';

interface DispatchStorage {
  jobs: DispatchJob[];
  employees: DispatchEmployee[];
  schedules: EmployeeSchedule[];
}

const STORAGE_KEY = 'sparkery_dispatch_storage_v1';

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

const generateId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const sparkeryDispatchService = {
  async getJobs(params?: {
    weekStart?: string;
    weekEnd?: string;
  }): Promise<DispatchJob[]> {
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
      createdAt: now,
      updatedAt: now,
    };
    if (payload.description) job.description = payload.description;
    if (payload.customerName) job.customerName = payload.customerName;
    if (payload.customerAddress) job.customerAddress = payload.customerAddress;
    if (payload.customerPhone) job.customerPhone = payload.customerPhone;
    if (payload.propertyType) job.propertyType = payload.propertyType;
    if (typeof payload.estimatedDurationHours === 'number') {
      job.estimatedDurationHours = payload.estimatedDurationHours;
    }
    storage.jobs.unshift(job);
    saveStorage(storage);
    return job;
  },

  async updateJob(
    id: string,
    patch: UpdateDispatchJobPayload
  ): Promise<DispatchJob> {
    const storage = loadStorage();
    const idx = storage.jobs.findIndex(job => job.id === id);
    if (idx === -1) {
      throw new Error('Job not found');
    }
    const existing = storage.jobs[idx];
    if (!existing) {
      throw new Error('Job not found');
    }
    const updated: DispatchJob = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    storage.jobs[idx] = updated;
    saveStorage(storage);
    return updated;
  },

  async assignJob(id: string, employeeId: string): Promise<DispatchJob> {
    return this.updateJob(id, {
      assignedEmployeeId: employeeId,
      status: 'assigned',
    });
  },

  async updateJobStatus(
    id: string,
    status: DispatchJobStatus
  ): Promise<DispatchJob> {
    return this.updateJob(id, { status });
  },

  async deleteJob(id: string): Promise<void> {
    const storage = loadStorage();
    storage.jobs = storage.jobs.filter(job => job.id !== id);
    saveStorage(storage);
  },

  async getEmployees(): Promise<DispatchEmployee[]> {
    return loadStorage().employees;
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
};
