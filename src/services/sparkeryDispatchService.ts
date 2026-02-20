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

interface DispatchBackupPayload {
  version: 'v1';
  exportedAt: string;
  data: DispatchStorage;
}

interface SupabaseConfig {
  url: string;
  anonKey: string;
}

type SupabaseRuntime = typeof globalThis & {
  __WENDEAL_SUPABASE_CONFIG__?: {
    url?: string;
    anonKey?: string;
  };
};

interface SupabaseDispatchEmployeeRow {
  id: string;
  name: string;
  name_cn: string | null;
  phone: string | null;
  skills: DispatchEmployee['skills'] | null;
  status: DispatchEmployee['status'];
}

interface SupabaseDispatchJobRow {
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
  created_at: string;
  updated_at: string;
}

interface SupabaseDispatchCustomerProfileRow {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  default_job_title: string | null;
  default_description: string | null;
  default_notes: string | null;
  recurring_enabled: boolean | null;
  recurring_weekday: DispatchCustomerProfile['recurringWeekday'] | null;
  recurring_start_time: string | null;
  recurring_end_time: string | null;
  recurring_service_type:
    | DispatchCustomerProfile['recurringServiceType']
    | null;
  recurring_priority: DispatchCustomerProfile['recurringPriority'] | null;
  created_at: string | null;
  updated_at: string | null;
}

const STORAGE_KEY = 'sparkery_dispatch_storage_v1';

const getSupabaseConfig = (): SupabaseConfig | null => {
  const runtime = globalThis as SupabaseRuntime;
  const runtimeConfig = runtime.__WENDEAL_SUPABASE_CONFIG__;
  const runtimeUrl = runtimeConfig?.url?.trim();
  const runtimeAnonKey = runtimeConfig?.anonKey?.trim();
  if (runtimeUrl && runtimeAnonKey) {
    return { url: runtimeUrl, anonKey: runtimeAnonKey };
  }

  return null;
};

const toEmployee = (row: SupabaseDispatchEmployeeRow): DispatchEmployee => {
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

const toEmployeeRow = (
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

const toJob = (row: SupabaseDispatchJobRow): DispatchJob => {
  const job: DispatchJob = {
    id: row.id,
    title: row.title,
    serviceType: row.service_type,
    status: row.status,
    priority: row.priority,
    scheduledDate: row.scheduled_date,
    scheduledStartTime: row.scheduled_start_time,
    scheduledEndTime: row.scheduled_end_time,
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
  return job;
};

const toJobRow = (
  payload: Omit<DispatchJob, 'id' | 'createdAt' | 'updatedAt'>,
  id: string,
  createdAt: string,
  updatedAt: string
): SupabaseDispatchJobRow => ({
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
  created_at: createdAt,
  updated_at: updatedAt,
});

const toCustomerProfile = (
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
  if (row.recurring_start_time)
    profile.recurringStartTime = row.recurring_start_time;
  if (row.recurring_end_time) profile.recurringEndTime = row.recurring_end_time;
  if (row.recurring_service_type) {
    profile.recurringServiceType = row.recurring_service_type;
  }
  if (row.recurring_priority)
    profile.recurringPriority = row.recurring_priority;

  return profile;
};

const toCustomerProfileRow = (
  payload: UpsertDispatchCustomerProfilePayload,
  id: string
): Omit<SupabaseDispatchCustomerProfileRow, 'created_at' | 'updated_at'> => ({
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
  recurring_weekday: payload.recurringWeekday || null,
  recurring_start_time: payload.recurringStartTime || null,
  recurring_end_time: payload.recurringEndTime || null,
  recurring_service_type: payload.recurringServiceType || null,
  recurring_priority: payload.recurringPriority || null,
});

const supabaseFetch = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<T> => {
  const config = getSupabaseConfig();
  if (!config) {
    throw new Error('Supabase is not configured');
  }

  const requestUrl = `${config.url.replace(/\/$/, '')}${path}`;
  const response = await fetch(requestUrl, {
    ...options,
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Supabase request failed (${response.status}): ${details || 'No details'}`
    );
  }

  return (await response.json()) as T;
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

const generateId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const sparkeryDispatchService = {
  async getJobs(params?: {
    weekStart?: string;
    weekEnd?: string;
  }): Promise<DispatchJob[]> {
    if (getSupabaseConfig()) {
      const query = new URLSearchParams({
        select: '*',
        order: 'scheduled_date.asc,scheduled_start_time.asc',
      });
      if (params?.weekStart) {
        query.append('scheduled_date', `gte.${params.weekStart}`);
      }
      if (params?.weekEnd) {
        query.append('scheduled_date', `lte.${params.weekEnd}`);
      }

      const rows = await supabaseFetch<SupabaseDispatchJobRow[]>(
        `/rest/v1/dispatch_jobs?${query.toString()}`
      );
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
    if (getSupabaseConfig()) {
      const now = new Date().toISOString();
      const id = generateId('job');
      const row = toJobRow(
        {
          ...payload,
          status: 'pending',
          assignedEmployeeIds: [],
        },
        id,
        now,
        now
      );

      const result = await supabaseFetch<SupabaseDispatchJobRow[]>(
        '/rest/v1/dispatch_jobs?on_conflict=id',
        {
          method: 'POST',
          headers: {
            Prefer: 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify([row]),
        }
      );
      const first = result[0];
      if (!first) {
        throw new Error('Supabase job creation returned no rows');
      }
      return toJob(first);
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
    if (getSupabaseConfig()) {
      const existingList = await supabaseFetch<SupabaseDispatchJobRow[]>(
        `/rest/v1/dispatch_jobs?select=*&id=eq.${id}`
      );
      const existing = existingList[0];
      if (!existing) {
        throw new Error('Job not found');
      }

      const current = toJob(existing);
      const merged: DispatchJob = {
        ...current,
        ...patch,
        id,
        createdAt: current.createdAt,
        updatedAt: new Date().toISOString(),
      };

      const {
        id: _jobId,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        ...jobPayload
      } = merged;

      const row = toJobRow(jobPayload, id, current.createdAt, merged.updatedAt);

      const result = await supabaseFetch<SupabaseDispatchJobRow[]>(
        `/rest/v1/dispatch_jobs?id=eq.${id}`,
        {
          method: 'PATCH',
          headers: {
            Prefer: 'return=representation',
          },
          body: JSON.stringify(row),
        }
      );
      const first = result[0];
      if (!first) {
        throw new Error('Supabase job update returned no rows');
      }
      return toJob(first);
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
    if (getSupabaseConfig()) {
      await supabaseFetch<SupabaseDispatchJobRow[]>(
        `/rest/v1/dispatch_jobs?id=eq.${id}`,
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

  async getEmployees(): Promise<DispatchEmployee[]> {
    if (getSupabaseConfig()) {
      const rows = await supabaseFetch<SupabaseDispatchEmployeeRow[]>(
        '/rest/v1/dispatch_employees?select=*&order=id.asc'
      );
      return rows.map(toEmployee);
    }
    return loadStorage().employees;
  },

  async upsertEmployee(
    payload: UpsertDispatchEmployeePayload
  ): Promise<DispatchEmployee> {
    if (getSupabaseConfig()) {
      const row = toEmployeeRow(payload, payload.id || generateId('emp'));
      const result = await supabaseFetch<SupabaseDispatchEmployeeRow[]>(
        '/rest/v1/dispatch_employees?on_conflict=id',
        {
          method: 'POST',
          headers: {
            Prefer: 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify([row]),
        }
      );
      const first = result[0];
      if (!first) {
        throw new Error('Supabase employee upsert returned no rows');
      }
      return toEmployee(first);
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
    if (getSupabaseConfig()) {
      const rows = await supabaseFetch<SupabaseDispatchCustomerProfileRow[]>(
        '/rest/v1/dispatch_customer_profiles?select=*&order=updated_at.desc.nullslast,id.asc'
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

      const result = await supabaseFetch<SupabaseDispatchCustomerProfileRow[]>(
        '/rest/v1/dispatch_customer_profiles?on_conflict=id',
        {
          method: 'POST',
          headers: {
            Prefer: 'resolution=merge-duplicates,return=representation',
          },
          body: JSON.stringify([row]),
        }
      );

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
    if (getSupabaseConfig()) {
      const profiles = await this.getCustomerProfiles();
      const existingJobs = await this.getJobs({ weekStart, weekEnd });
      const created: DispatchJob[] = [];
      const weekStartDate = new Date(weekStart);

      for (const profile of profiles) {
        if (
          !profile.recurringEnabled ||
          !profile.recurringWeekday ||
          !profile.recurringStartTime ||
          !profile.recurringEndTime
        ) {
          continue;
        }

        const targetDate = new Date(weekStartDate);
        targetDate.setDate(
          targetDate.getDate() + (profile.recurringWeekday - 1)
        );
        const scheduledDate = targetDate.toISOString().slice(0, 10);
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
          title: profile.defaultJobTitle || `${profile.name} Recurring Service`,
          customerProfileId: profile.id,
          customerName: profile.name,
          serviceType: profile.recurringServiceType || 'regular',
          priority: profile.recurringPriority || 3,
          scheduledDate,
          scheduledStartTime: profile.recurringStartTime,
          scheduledEndTime: profile.recurringEndTime,
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

      return created;
    }

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

  async migrateLocalPeopleToSupabase(): Promise<{
    employees: number;
    customerProfiles: number;
    jobs: number;
  }> {
    if (!getSupabaseConfig()) {
      throw new Error('Supabase is not configured');
    }

    const storage = loadStorage();
    const employeesRows = storage.employees.map(employee =>
      toEmployeeRow(employee, employee.id)
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
    const payload: DispatchBackupPayload = {
      version: 'v1',
      exportedAt: new Date().toISOString(),
      data: storage,
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

    saveStorage(nextStorage);
    return nextStorage;
  },
};
