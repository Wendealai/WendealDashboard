import type {
  CreateDispatchJobPayload,
  DispatchCustomerProfile,
  DispatchEmployee,
  DispatchJob,
  DispatchJobStatus,
  EmployeeSchedule,
  UpsertDispatchEmployeePayload,
  UpsertDispatchCustomerProfilePayload,
  UpdateDispatchJobPayload,
} from '@/pages/Sparkery/dispatch/types';

interface DispatchStorage {
  jobs: DispatchJob[];
  employees: DispatchEmployee[];
  schedules: EmployeeSchedule[];
  customerProfiles: DispatchCustomerProfile[];
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

  async assignJob(id: string, employeeIds: string[]): Promise<DispatchJob> {
    return this.updateJob(id, {
      assignedEmployeeIds: employeeIds,
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

  async upsertEmployee(
    payload: UpsertDispatchEmployeePayload
  ): Promise<DispatchEmployee> {
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
    if (payload.nameCN) next.nameCN = payload.nameCN;
    if (payload.phone) next.phone = payload.phone;

    if (existingIndex >= 0) {
      storage.employees[existingIndex] = next;
    } else {
      storage.employees.unshift(next);
    }
    saveStorage(storage);
    return next;
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
    return loadStorage().customerProfiles;
  },

  async upsertCustomerProfile(
    payload: UpsertDispatchCustomerProfilePayload
  ): Promise<DispatchCustomerProfile> {
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
    const storage = loadStorage();
    const created: DispatchJob[] = [];
    const weekStartDate = new Date(weekStart);

    storage.customerProfiles.forEach(profile => {
      if (
        !profile.recurringEnabled ||
        !profile.recurringWeekday ||
        !profile.recurringStartTime ||
        !profile.recurringEndTime
      ) {
        return;
      }

      const targetDate = new Date(weekStartDate);
      targetDate.setDate(targetDate.getDate() + (profile.recurringWeekday - 1));
      const scheduledDate = targetDate.toISOString().slice(0, 10);
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
        scheduledStartTime: profile.recurringStartTime,
        scheduledEndTime: profile.recurringEndTime,
        customerProfileId: profile.id,
        customerName: profile.name,
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

    saveStorage(storage);
    return created;
  },
};
