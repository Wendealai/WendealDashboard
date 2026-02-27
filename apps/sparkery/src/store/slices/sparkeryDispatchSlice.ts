import {
  createAsyncThunk,
  createSelector,
  createSlice,
  type PayloadAction,
} from '@reduxjs/toolkit';
import { sparkeryDispatchService } from '@/services/sparkeryDispatchService';
import type {
  CreateDispatchJobPayload,
  DispatchCustomerProfile,
  DispatchEmployee,
  DispatchEmployeeLocation,
  DispatchFilters,
  DispatchJob,
  DispatchJobStatus,
  UpsertDispatchEmployeePayload,
  UpsertDispatchCustomerProfilePayload,
  UpdateDispatchJobPayload,
} from '@/pages/Sparkery/dispatch/types';
import type { RootState } from '@/store';

interface FetchJobsPayload {
  weekStart?: string;
  weekEnd?: string;
}

interface AssignDispatchJobPayload {
  id: string;
  employeeIds: string[];
}

interface UpdateDispatchJobStatusPayload {
  id: string;
  status: DispatchJobStatus;
}

interface UpdateDispatchJobPayloadInput {
  id: string;
  patch: UpdateDispatchJobPayload;
}

interface ApplyDispatchJobFinanceAdjustmentPayload {
  id: string;
  adjustmentDelta: number;
}

interface ConfirmDispatchJobFinancePayload {
  id: string;
  confirmedBy?: string;
}

interface SetDispatchJobPaymentReceivedPayload {
  id: string;
  received: boolean;
  receivedBy?: string;
}

interface DispatchLocalSyncResult {
  employees: number;
  customerProfiles: number;
  jobs: number;
}

interface ReportDispatchEmployeeLocationPayload {
  employeeId: string;
  location: Omit<DispatchEmployeeLocation, 'updatedAt'> & {
    updatedAt?: string;
  };
}

interface DispatchBackupImportResult {
  jobs: DispatchJob[];
  employees: DispatchEmployee[];
  customerProfiles: DispatchCustomerProfile[];
}

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year || 1970, (month || 1) - 1, day || 1);
};

export interface SparkeryDispatchState {
  jobs: DispatchJob[];
  employees: DispatchEmployee[];
  customerProfiles: DispatchCustomerProfile[];
  selectedWeekStart: string;
  filters: DispatchFilters;
  isLoading: boolean;
  error: string | null;
}

const getStartOfWeek = (): string => {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + mondayOffset
  );
  return formatDateKey(monday);
};

const initialState: SparkeryDispatchState = {
  jobs: [],
  employees: [],
  customerProfiles: [],
  selectedWeekStart: getStartOfWeek(),
  filters: {},
  isLoading: false,
  error: null,
};

const getWeekEnd = (weekStart: string): string => {
  const date = parseDateKey(weekStart);
  const end = new Date(date);
  end.setDate(date.getDate() + 6);
  return formatDateKey(end);
};

const toNonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : undefined;

const normalizeBase64 = (value: string): string => {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const paddingLength = (4 - (base64.length % 4)) % 4;
  return `${base64}${'='.repeat(paddingLength)}`;
};

const decodeBase64 = (value: string): string | null => {
  if (!value || typeof atob !== 'function') {
    return null;
  }
  try {
    return atob(normalizeBase64(value));
  } catch {
    return null;
  }
};

const parseDispatchTelemetryTokenPayload = (
  token: string
): Record<string, unknown> | null => {
  const parts = token.split('.');
  if (parts.length >= 2) {
    const decodedPayload = decodeBase64(parts[1] || '');
    if (decodedPayload) {
      try {
        const parsed = JSON.parse(decodedPayload) as unknown;
        if (parsed && typeof parsed === 'object') {
          return parsed as Record<string, unknown>;
        }
      } catch {
        // noop
      }
    }
  }

  const decodedToken = decodeBase64(token);
  if (!decodedToken) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodedToken) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const record = parsed as Record<string, unknown>;
    if (record.payload && typeof record.payload === 'object') {
      return record.payload as Record<string, unknown>;
    }
    return record;
  } catch {
    return null;
  }
};

const resolveDispatchTelemetrySessionIdFromToken = (
  token?: string | null
): string | undefined => {
  const normalizedToken = toNonEmptyString(token);
  if (!normalizedToken) {
    return undefined;
  }

  const payload = parseDispatchTelemetryTokenPayload(normalizedToken);
  if (!payload) {
    return undefined;
  }

  const explicitSessionId =
    toNonEmptyString(payload.sessionId) ??
    toNonEmptyString(payload.session_id) ??
    toNonEmptyString(payload.sid) ??
    toNonEmptyString(payload.jti);
  if (explicitSessionId) {
    return explicitSessionId;
  }

  const subject = toNonEmptyString(payload.sub);
  const issuedAt = toNonEmptyString(payload.iat);
  if (subject && issuedAt) {
    return `${subject}:${issuedAt}`;
  }
  return undefined;
};

const resolveDispatchTelemetryUserId = (state: RootState): string | undefined =>
  toNonEmptyString(state.auth?.user?.id);

const resolveDispatchTelemetryActorRole = (
  state: RootState
): string | undefined => toNonEmptyString(state.auth?.user?.role);

const resolveDispatchTelemetrySessionId = (
  state: RootState
): string | undefined => {
  const tokenSessionId = resolveDispatchTelemetrySessionIdFromToken(
    state.auth?.token
  );
  if (tokenSessionId) {
    return tokenSessionId;
  }

  const userId = resolveDispatchTelemetryUserId(state);
  const sessionExpiry = toNonEmptyString(state.auth?.sessionExpiry);
  if (userId && sessionExpiry) {
    return `${userId}:${sessionExpiry}`;
  }
  return undefined;
};

const resolveDispatchTelemetryContext = (
  state: RootState
): {
  userId?: string;
  actorRole?: string;
  sessionId?: string;
} => {
  const userId = resolveDispatchTelemetryUserId(state);
  const actorRole = resolveDispatchTelemetryActorRole(state);
  const sessionId = resolveDispatchTelemetrySessionId(state);
  return {
    ...(userId ? { userId } : {}),
    ...(actorRole ? { actorRole } : {}),
    ...(sessionId ? { sessionId } : {}),
  };
};

const withDispatchTelemetryContext = (
  state: RootState
):
  | {
      userId?: string;
      actorRole?: string;
      sessionId?: string;
    }
  | undefined => {
  const context = resolveDispatchTelemetryContext(state);
  if (context.userId || context.actorRole || context.sessionId) {
    return context;
  }
  return undefined;
};

export const fetchDispatchJobs = createAsyncThunk<
  DispatchJob[],
  FetchJobsPayload | undefined
>('sparkeryDispatch/fetchJobs', async payload => {
  return sparkeryDispatchService.getJobs(payload);
});

export const fetchDispatchEmployees = createAsyncThunk<DispatchEmployee[]>(
  'sparkeryDispatch/fetchEmployees',
  async () => {
    return sparkeryDispatchService.getEmployees();
  }
);

export const upsertDispatchEmployee = createAsyncThunk<
  DispatchEmployee,
  UpsertDispatchEmployeePayload
>('sparkeryDispatch/upsertEmployee', async payload => {
  return sparkeryDispatchService.upsertEmployee(payload);
});

export const deleteDispatchEmployee = createAsyncThunk<string, string>(
  'sparkeryDispatch/deleteEmployee',
  async id => {
    await sparkeryDispatchService.deleteEmployee(id);
    return id;
  }
);

export const reportDispatchEmployeeLocation = createAsyncThunk<
  { employeeId: string; location: DispatchEmployeeLocation },
  ReportDispatchEmployeeLocationPayload
>('sparkeryDispatch/reportEmployeeLocation', async payload => {
  const location = await sparkeryDispatchService.reportEmployeeLocation(
    payload.employeeId,
    payload.location
  );
  return {
    employeeId: payload.employeeId,
    location,
  };
});

export const fetchDispatchCustomerProfiles = createAsyncThunk<
  DispatchCustomerProfile[]
>('sparkeryDispatch/fetchCustomerProfiles', async () => {
  return sparkeryDispatchService.getCustomerProfiles();
});

export const upsertDispatchCustomerProfile = createAsyncThunk<
  DispatchCustomerProfile,
  UpsertDispatchCustomerProfilePayload
>('sparkeryDispatch/upsertCustomerProfile', async payload => {
  return sparkeryDispatchService.upsertCustomerProfile(payload);
});

export const generateDispatchJobsFromRecurring = createAsyncThunk<
  DispatchJob[],
  { weekStart: string; weekEnd: string }
>('sparkeryDispatch/generateRecurringJobs', async ({ weekStart, weekEnd }) => {
  return sparkeryDispatchService.createJobsFromRecurringProfiles(
    weekStart,
    weekEnd
  );
});

export const createDispatchJob = createAsyncThunk<
  DispatchJob,
  CreateDispatchJobPayload
>('sparkeryDispatch/createJob', async (payload, { getState }) => {
  const telemetryContext = withDispatchTelemetryContext(
    getState() as RootState
  );
  return sparkeryDispatchService.createJob(payload, telemetryContext);
});

export const updateDispatchJob = createAsyncThunk<
  DispatchJob,
  UpdateDispatchJobPayloadInput
>('sparkeryDispatch/updateJob', async ({ id, patch }, { getState }) => {
  const telemetryContext = withDispatchTelemetryContext(
    getState() as RootState
  );
  return sparkeryDispatchService.updateJob(id, patch, telemetryContext);
});

export const assignDispatchJob = createAsyncThunk<
  DispatchJob,
  AssignDispatchJobPayload
>('sparkeryDispatch/assignJob', async ({ id, employeeIds }, { getState }) => {
  const telemetryContext = withDispatchTelemetryContext(
    getState() as RootState
  );
  return sparkeryDispatchService.assignJob(id, employeeIds, telemetryContext);
});

export const updateDispatchJobStatus = createAsyncThunk<
  DispatchJob,
  UpdateDispatchJobStatusPayload
>('sparkeryDispatch/updateJobStatus', async ({ id, status }, { getState }) => {
  const telemetryContext = withDispatchTelemetryContext(
    getState() as RootState
  );
  return sparkeryDispatchService.updateJobStatus(id, status, telemetryContext);
});

export const deleteDispatchJob = createAsyncThunk<string, string>(
  'sparkeryDispatch/deleteJob',
  async id => {
    await sparkeryDispatchService.deleteJob(id);
    return id;
  }
);

export const applyDispatchJobFinanceAdjustment = createAsyncThunk<
  DispatchJob,
  ApplyDispatchJobFinanceAdjustmentPayload
>(
  'sparkeryDispatch/applyFinanceAdjustment',
  async ({ id, adjustmentDelta }, { getState }) => {
    const telemetryContext = withDispatchTelemetryContext(
      getState() as RootState
    );
    return sparkeryDispatchService.applyJobFinanceAdjustment(
      id,
      adjustmentDelta,
      telemetryContext
    );
  }
);

export const confirmDispatchJobFinance = createAsyncThunk<
  DispatchJob,
  ConfirmDispatchJobFinancePayload
>(
  'sparkeryDispatch/confirmFinance',
  async ({ id, confirmedBy }, { getState }) => {
    const telemetryContext = withDispatchTelemetryContext(
      getState() as RootState
    );
    return sparkeryDispatchService.confirmJobFinance(
      id,
      confirmedBy,
      telemetryContext
    );
  }
);

export const setDispatchJobPaymentReceived = createAsyncThunk<
  DispatchJob,
  SetDispatchJobPaymentReceivedPayload
>(
  'sparkeryDispatch/setPaymentReceived',
  async ({ id, received, receivedBy }, { getState }) => {
    const telemetryContext = withDispatchTelemetryContext(
      getState() as RootState
    );
    return sparkeryDispatchService.setJobPaymentReceived(
      id,
      received,
      receivedBy,
      telemetryContext
    );
  }
);

export const migrateDispatchLocalPeopleToSupabase =
  createAsyncThunk<DispatchLocalSyncResult>(
    'sparkeryDispatch/migrateLocalPeopleToSupabase',
    async () => {
      return sparkeryDispatchService.migrateLocalPeopleToSupabase();
    }
  );

export const exportDispatchBackup = createAsyncThunk<string>(
  'sparkeryDispatch/exportBackup',
  async () => {
    return sparkeryDispatchService.exportBackup();
  }
);

export const importDispatchBackup = createAsyncThunk<
  DispatchBackupImportResult,
  string
>('sparkeryDispatch/importBackup', async rawBackup => {
  return sparkeryDispatchService.importBackup(rawBackup);
});

const upsertJob = (
  jobs: DispatchJob[],
  updatedJob: DispatchJob
): DispatchJob[] => {
  const index = jobs.findIndex(job => job.id === updatedJob.id);
  if (index === -1) {
    return [updatedJob, ...jobs];
  }
  const cloned = [...jobs];
  cloned[index] = updatedJob;
  return cloned;
};

const upsertCustomerProfile = (
  profiles: DispatchCustomerProfile[],
  profile: DispatchCustomerProfile
): DispatchCustomerProfile[] => {
  const idx = profiles.findIndex(item => item.id === profile.id);
  if (idx === -1) {
    return [profile, ...profiles];
  }
  const cloned = [...profiles];
  cloned[idx] = profile;
  return cloned;
};

const upsertEmployee = (
  employees: DispatchEmployee[],
  employee: DispatchEmployee
): DispatchEmployee[] => {
  const idx = employees.findIndex(item => item.id === employee.id);
  if (idx === -1) {
    return [employee, ...employees];
  }
  const cloned = [...employees];
  cloned[idx] = employee;
  return cloned;
};

const setPending = (state: SparkeryDispatchState): void => {
  state.isLoading = true;
  state.error = null;
};

const setRejected = (
  state: SparkeryDispatchState,
  action: PayloadAction<
    unknown,
    string,
    never,
    { message?: string } | undefined
  >
): void => {
  state.isLoading = false;
  state.error = action.error?.message || 'Dispatch request failed';
};

export const sparkeryDispatchSlice = createSlice({
  name: 'sparkeryDispatch',
  initialState,
  reducers: {
    setSelectedWeekStart(state, action: PayloadAction<string>) {
      state.selectedWeekStart = action.payload;
    },
    setFilters(state, action: PayloadAction<DispatchFilters>) {
      state.filters = action.payload;
    },
    clearDispatchError(state) {
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchDispatchJobs.pending, setPending)
      .addCase(fetchDispatchJobs.fulfilled, (state, action) => {
        state.isLoading = false;
        state.jobs = action.payload;
      })
      .addCase(fetchDispatchJobs.rejected, setRejected)
      .addCase(fetchDispatchEmployees.pending, setPending)
      .addCase(fetchDispatchEmployees.fulfilled, (state, action) => {
        state.isLoading = false;
        state.employees = action.payload;
      })
      .addCase(fetchDispatchEmployees.rejected, setRejected)
      .addCase(upsertDispatchEmployee.pending, setPending)
      .addCase(upsertDispatchEmployee.fulfilled, (state, action) => {
        state.isLoading = false;
        state.employees = upsertEmployee(state.employees, action.payload);
      })
      .addCase(upsertDispatchEmployee.rejected, setRejected)
      .addCase(deleteDispatchEmployee.pending, setPending)
      .addCase(deleteDispatchEmployee.fulfilled, (state, action) => {
        state.isLoading = false;
        state.employees = state.employees.filter(
          employee => employee.id !== action.payload
        );
        state.jobs = state.jobs.map(job => {
          if (!job.assignedEmployeeIds?.includes(action.payload)) {
            return job;
          }
          const nextAssignedIds = job.assignedEmployeeIds.filter(
            employeeId => employeeId !== action.payload
          );
          if (nextAssignedIds.length > 0) {
            return {
              ...job,
              assignedEmployeeIds: nextAssignedIds,
            };
          }
          const nextJob: DispatchJob = { ...job };
          delete nextJob.assignedEmployeeIds;
          if (nextJob.status === 'assigned') {
            nextJob.status = 'pending';
          }
          return nextJob;
        });
      })
      .addCase(deleteDispatchEmployee.rejected, setRejected)
      .addCase(reportDispatchEmployeeLocation.pending, setPending)
      .addCase(reportDispatchEmployeeLocation.fulfilled, (state, action) => {
        state.isLoading = false;
        state.employees = state.employees.map(employee => {
          if (employee.id !== action.payload.employeeId) {
            return employee;
          }
          return {
            ...employee,
            currentLocation: action.payload.location,
          };
        });
      })
      .addCase(reportDispatchEmployeeLocation.rejected, setRejected)
      .addCase(fetchDispatchCustomerProfiles.pending, setPending)
      .addCase(fetchDispatchCustomerProfiles.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customerProfiles = action.payload;
      })
      .addCase(fetchDispatchCustomerProfiles.rejected, setRejected)
      .addCase(upsertDispatchCustomerProfile.pending, setPending)
      .addCase(upsertDispatchCustomerProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.customerProfiles = upsertCustomerProfile(
          state.customerProfiles,
          action.payload
        );
      })
      .addCase(upsertDispatchCustomerProfile.rejected, setRejected)
      .addCase(generateDispatchJobsFromRecurring.pending, setPending)
      .addCase(generateDispatchJobsFromRecurring.fulfilled, (state, action) => {
        state.isLoading = false;
        const merged = [...action.payload, ...state.jobs];
        const deduped = new Map<string, DispatchJob>();
        merged.forEach(job => {
          deduped.set(job.id, job);
        });
        state.jobs = Array.from(deduped.values());
      })
      .addCase(generateDispatchJobsFromRecurring.rejected, setRejected)
      .addCase(createDispatchJob.pending, setPending)
      .addCase(createDispatchJob.fulfilled, (state, action) => {
        state.isLoading = false;
        state.jobs = [action.payload, ...state.jobs];
      })
      .addCase(createDispatchJob.rejected, setRejected)
      .addCase(updateDispatchJob.pending, setPending)
      .addCase(updateDispatchJob.fulfilled, (state, action) => {
        state.isLoading = false;
        state.jobs = upsertJob(state.jobs, action.payload);
      })
      .addCase(updateDispatchJob.rejected, setRejected)
      .addCase(assignDispatchJob.pending, setPending)
      .addCase(assignDispatchJob.fulfilled, (state, action) => {
        state.isLoading = false;
        state.jobs = upsertJob(state.jobs, action.payload);
      })
      .addCase(assignDispatchJob.rejected, setRejected)
      .addCase(updateDispatchJobStatus.pending, setPending)
      .addCase(updateDispatchJobStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.jobs = upsertJob(state.jobs, action.payload);
      })
      .addCase(updateDispatchJobStatus.rejected, setRejected)
      .addCase(deleteDispatchJob.pending, setPending)
      .addCase(deleteDispatchJob.fulfilled, (state, action) => {
        state.isLoading = false;
        state.jobs = state.jobs.filter(job => job.id !== action.payload);
      })
      .addCase(deleteDispatchJob.rejected, setRejected)
      .addCase(applyDispatchJobFinanceAdjustment.pending, setPending)
      .addCase(applyDispatchJobFinanceAdjustment.fulfilled, (state, action) => {
        state.isLoading = false;
        state.jobs = upsertJob(state.jobs, action.payload);
      })
      .addCase(applyDispatchJobFinanceAdjustment.rejected, setRejected)
      .addCase(confirmDispatchJobFinance.pending, setPending)
      .addCase(confirmDispatchJobFinance.fulfilled, (state, action) => {
        state.isLoading = false;
        state.jobs = upsertJob(state.jobs, action.payload);
      })
      .addCase(confirmDispatchJobFinance.rejected, setRejected)
      .addCase(setDispatchJobPaymentReceived.pending, setPending)
      .addCase(setDispatchJobPaymentReceived.fulfilled, (state, action) => {
        state.isLoading = false;
        state.jobs = upsertJob(state.jobs, action.payload);
      })
      .addCase(setDispatchJobPaymentReceived.rejected, setRejected)
      .addCase(migrateDispatchLocalPeopleToSupabase.pending, setPending)
      .addCase(migrateDispatchLocalPeopleToSupabase.fulfilled, state => {
        state.isLoading = false;
      })
      .addCase(migrateDispatchLocalPeopleToSupabase.rejected, setRejected)
      .addCase(exportDispatchBackup.pending, setPending)
      .addCase(exportDispatchBackup.fulfilled, state => {
        state.isLoading = false;
      })
      .addCase(exportDispatchBackup.rejected, setRejected)
      .addCase(importDispatchBackup.pending, setPending)
      .addCase(importDispatchBackup.fulfilled, (state, action) => {
        state.isLoading = false;
        state.jobs = action.payload.jobs;
        state.employees = action.payload.employees;
        state.customerProfiles = action.payload.customerProfiles;
      })
      .addCase(importDispatchBackup.rejected, setRejected);
  },
});

export const { setSelectedWeekStart, setFilters, clearDispatchError } =
  sparkeryDispatchSlice.actions;

export default sparkeryDispatchSlice.reducer;

export const selectDispatchState = (state: RootState): SparkeryDispatchState =>
  state.sparkeryDispatch;

export const selectDispatchJobs = (state: RootState): DispatchJob[] =>
  selectDispatchState(state).jobs;

export const selectDispatchEmployees = (state: RootState): DispatchEmployee[] =>
  selectDispatchState(state).employees;

export const selectDispatchCustomerProfiles = (
  state: RootState
): DispatchCustomerProfile[] => selectDispatchState(state).customerProfiles;

export const selectDispatchWeekRange = createSelector(
  [selectDispatchState],
  dispatchState => ({
    weekStart: dispatchState.selectedWeekStart,
    weekEnd: getWeekEnd(dispatchState.selectedWeekStart),
  })
);

export const selectDispatchJobsByDate = createSelector(
  [selectDispatchJobs, selectDispatchState],
  (jobs, dispatchState) => {
    const filtered = jobs.filter(job => {
      if (
        dispatchState.filters.status &&
        job.status !== dispatchState.filters.status
      ) {
        return false;
      }
      if (
        dispatchState.filters.serviceType &&
        job.serviceType !== dispatchState.filters.serviceType
      ) {
        return false;
      }
      if (
        dispatchState.filters.priority &&
        job.priority !== dispatchState.filters.priority
      ) {
        return false;
      }
      if (
        dispatchState.filters.assignedEmployeeId &&
        !job.assignedEmployeeIds?.includes(
          dispatchState.filters.assignedEmployeeId
        )
      ) {
        return false;
      }
      return true;
    });

    return filtered.reduce<Record<string, DispatchJob[]>>((acc, job) => {
      if (!acc[job.scheduledDate]) {
        acc[job.scheduledDate] = [];
      }
      acc[job.scheduledDate]?.push(job);
      return acc;
    }, {});
  }
);
