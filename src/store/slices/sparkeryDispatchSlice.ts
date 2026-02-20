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

interface DispatchLocalSyncResult {
  employees: number;
  customerProfiles: number;
  jobs: number;
}

interface DispatchBackupImportResult {
  jobs: DispatchJob[];
  employees: DispatchEmployee[];
  customerProfiles: DispatchCustomerProfile[];
}

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
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff));
  return monday.toISOString().slice(0, 10);
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
  const date = new Date(weekStart);
  const end = new Date(date);
  end.setDate(date.getDate() + 6);
  return end.toISOString().slice(0, 10);
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
>('sparkeryDispatch/createJob', async payload => {
  return sparkeryDispatchService.createJob(payload);
});

export const updateDispatchJob = createAsyncThunk<
  DispatchJob,
  UpdateDispatchJobPayloadInput
>('sparkeryDispatch/updateJob', async ({ id, patch }) => {
  return sparkeryDispatchService.updateJob(id, patch);
});

export const assignDispatchJob = createAsyncThunk<
  DispatchJob,
  AssignDispatchJobPayload
>('sparkeryDispatch/assignJob', async ({ id, employeeIds }) => {
  return sparkeryDispatchService.assignJob(id, employeeIds);
});

export const updateDispatchJobStatus = createAsyncThunk<
  DispatchJob,
  UpdateDispatchJobStatusPayload
>('sparkeryDispatch/updateJobStatus', async ({ id, status }) => {
  return sparkeryDispatchService.updateJobStatus(id, status);
});

export const deleteDispatchJob = createAsyncThunk<string, string>(
  'sparkeryDispatch/deleteJob',
  async id => {
    await sparkeryDispatchService.deleteJob(id);
    return id;
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
