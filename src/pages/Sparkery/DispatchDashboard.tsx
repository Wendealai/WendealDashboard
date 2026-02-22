import React, { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  message,
  Modal,
  Row,
  Space,
  Typography,
} from 'antd';
import {
  assignDispatchJob,
  clearDispatchError,
  createDispatchJob,
  deleteDispatchEmployee,
  deleteDispatchJob,
  exportDispatchBackup,
  fetchDispatchCustomerProfiles,
  fetchDispatchEmployees,
  fetchDispatchJobs,
  generateDispatchJobsFromRecurring,
  importDispatchBackup,
  migrateDispatchLocalPeopleToSupabase,
  selectDispatchCustomerProfiles,
  selectDispatchEmployees,
  selectDispatchJobs,
  selectDispatchJobsByDate,
  selectDispatchState,
  reportDispatchEmployeeLocation,
  setFilters,
  setSelectedWeekStart,
  upsertDispatchEmployee,
  upsertDispatchCustomerProfile,
  updateDispatchJob,
  updateDispatchJobStatus,
} from '@/store/slices/sparkeryDispatchSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type {
  CreateDispatchJobPayload,
  DispatchEmployeeLocation,
  DispatchFilters,
  DispatchJob,
  DispatchJobStatus,
  DispatchWeekday,
  UpsertDispatchCustomerProfilePayload,
} from './dispatch/types';
import DispatchFiltersBar from './components/dispatch/DispatchFiltersBar';
import DispatchAdminSetupModal from './components/dispatch/DispatchAdminSetupModal';
import DispatchJobFormModal from './components/dispatch/DispatchJobFormModal';
import WeeklyDispatchBoard from './components/dispatch/WeeklyDispatchBoard';
import DispatchMapPlanner from './components/dispatch/DispatchMapPlanner';
import {
  isGoogleCalendarConfigured,
  syncDispatchWeekToGoogleCalendar,
} from '@/services/googleCalendarService';

const { Title, Text } = Typography;
const DISPATCH_LOCAL_STORAGE_KEY = 'sparkery_dispatch_storage_v1';
const DISPATCH_AUTO_MIGRATION_PROMPT_KEY =
  'sparkery_dispatch_auto_migration_prompt_seen_v1';

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

const getWeekEnd = (weekStart: string): string => {
  const start = parseDateKey(weekStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return formatDateKey(end);
};

const getWeekStart = (dateStr: string): string => {
  const date = parseDateKey(dateStr);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + mondayOffset
  );
  return formatDateKey(monday);
};

const extractThunkError = (
  action: { error?: { message?: string } },
  fallback: string
): string => action.error?.message || fallback;

const normalizeRecurringWeekdays = (
  payload: Pick<
    CreateDispatchJobPayload,
    'recurringWeekdays' | 'recurringWeekday'
  >
): DispatchWeekday[] => {
  const source = Array.isArray(payload.recurringWeekdays)
    ? payload.recurringWeekdays
    : payload.recurringWeekday
      ? [payload.recurringWeekday]
      : [];
  const validWeekdays = source.filter((value): value is DispatchWeekday =>
    [1, 2, 3, 4, 5, 6, 7].includes(value)
  );
  return Array.from(new Set(validWeekdays)).sort((a, b) => a - b);
};

const DispatchDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { selectedWeekStart, filters, error, isLoading } =
    useAppSelector(selectDispatchState);
  const employees = useAppSelector(selectDispatchEmployees);
  const customerProfiles = useAppSelector(selectDispatchCustomerProfiles);
  const jobsByDate = useAppSelector(selectDispatchJobsByDate);
  const jobs = useAppSelector(selectDispatchJobs);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<DispatchJob | null>(null);
  const [adminSetupOpen, setAdminSetupOpen] = useState(false);
  const [syncingGoogleCalendar, setSyncingGoogleCalendar] = useState(false);
  const supabaseConfigured = React.useMemo(() => {
    const runtime = globalThis as typeof globalThis & {
      __WENDEAL_SUPABASE_CONFIG__?: {
        url?: string;
        anonKey?: string;
      };
    };
    return Boolean(
      runtime.__WENDEAL_SUPABASE_CONFIG__?.url &&
        runtime.__WENDEAL_SUPABASE_CONFIG__?.anonKey
    );
  }, []);
  const googleCalendarConfigured = React.useMemo(
    () => isGoogleCalendarConfigured(),
    []
  );

  const weekRange = useMemo(
    () => ({
      weekStart: selectedWeekStart,
      weekEnd: getWeekEnd(selectedWeekStart),
    }),
    [selectedWeekStart]
  );

  React.useEffect(() => {
    dispatch(fetchDispatchEmployees());
    dispatch(fetchDispatchCustomerProfiles());
  }, [dispatch]);

  React.useEffect(() => {
    dispatch(fetchDispatchJobs(weekRange));
  }, [dispatch, weekRange]);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      dispatch(fetchDispatchEmployees());
    }, 30000);
    return () => {
      window.clearInterval(timer);
    };
  }, [dispatch]);

  React.useEffect(() => {
    if (localStorage.getItem(DISPATCH_AUTO_MIGRATION_PROMPT_KEY)) {
      return;
    }

    const runtime = globalThis as typeof globalThis & {
      __WENDEAL_SUPABASE_CONFIG__?: {
        url?: string;
        anonKey?: string;
      };
    };
    const supabaseReady = Boolean(
      runtime.__WENDEAL_SUPABASE_CONFIG__?.url &&
        runtime.__WENDEAL_SUPABASE_CONFIG__?.anonKey
    );
    if (!supabaseReady) {
      return;
    }

    const raw = localStorage.getItem(DISPATCH_LOCAL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(DISPATCH_AUTO_MIGRATION_PROMPT_KEY, 'no-local-data');
      return;
    }

    try {
      const parsed = JSON.parse(raw) as { jobs?: unknown[] };
      const hasLocalJobs = Array.isArray(parsed.jobs) && parsed.jobs.length > 0;
      if (!hasLocalJobs) {
        localStorage.setItem(
          DISPATCH_AUTO_MIGRATION_PROMPT_KEY,
          'no-local-jobs'
        );
        return;
      }
    } catch {
      return;
    }

    Modal.confirm({
      title: 'Found local jobs data',
      content:
        'Supabase is connected. Do you want to migrate local jobs/customers/employees to cloud now?',
      okText: 'Migrate now',
      cancelText: 'Later',
      onOk: async () => {
        localStorage.setItem(DISPATCH_AUTO_MIGRATION_PROMPT_KEY, 'migrated');
        const result = await dispatch(migrateDispatchLocalPeopleToSupabase());
        if (migrateDispatchLocalPeopleToSupabase.fulfilled.match(result)) {
          message.success(
            `Migrated ${result.payload.employees} employees, ${result.payload.customerProfiles} customers, and ${result.payload.jobs} jobs`
          );
          await dispatch(fetchDispatchJobs(weekRange));
          await dispatch(fetchDispatchEmployees());
          await dispatch(fetchDispatchCustomerProfiles());
          return;
        }
        localStorage.removeItem(DISPATCH_AUTO_MIGRATION_PROMPT_KEY);
        message.error('Failed to migrate local data to Supabase');
      },
      onCancel: () => {
        localStorage.setItem(DISPATCH_AUTO_MIGRATION_PROMPT_KEY, 'skipped');
      },
    });
  }, [dispatch, weekRange]);

  const handleRefresh = async () => {
    await dispatch(fetchDispatchJobs(weekRange));
    message.success('Dispatch jobs refreshed');
  };

  const handleSyncGoogleCalendar = async () => {
    if (!googleCalendarConfigured) {
      message.warning(
        'Google Calendar is not configured. Please set credentials first.'
      );
      return;
    }

    setSyncingGoogleCalendar(true);
    try {
      const result = await syncDispatchWeekToGoogleCalendar({
        jobs,
        weekStart: weekRange.weekStart,
        weekEnd: weekRange.weekEnd,
      });
      message.success(
        `Calendar synced: +${result.created} / ~${result.updated} / -${result.deleted}`
      );
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : 'Failed to sync Google Calendar'
      );
    } finally {
      setSyncingGoogleCalendar(false);
    }
  };

  const handleCreateJob = async (payload: CreateDispatchJobPayload) => {
    const isEditing = Boolean(editingJob);
    const recurringWeekdays = normalizeRecurringWeekdays(payload);
    const recurringEnabled = Boolean(payload.recurringEnabled);
    let savedJob: DispatchJob | null = null;

    if (editingJob) {
      const result = await dispatch(
        updateDispatchJob({ id: editingJob.id, patch: payload })
      );
      if (!updateDispatchJob.fulfilled.match(result)) {
        message.error(
          extractThunkError(result, 'Failed to update task in Supabase')
        );
        return;
      }
      savedJob = result.payload;
      message.success('Job updated');
      await dispatch(fetchDispatchJobs(weekRange));
    } else {
      const result = await dispatch(createDispatchJob(payload));
      if (!createDispatchJob.fulfilled.match(result)) {
        message.error(
          extractThunkError(result, 'Failed to create task in Supabase')
        );
        return;
      }
      savedJob = result.payload;

      let refreshRange = weekRange;
      const createdDate = result.payload.scheduledDate || payload.scheduledDate;
      if (
        createdDate < weekRange.weekStart ||
        createdDate > weekRange.weekEnd
      ) {
        const targetWeekStart = getWeekStart(createdDate);
        refreshRange = {
          weekStart: targetWeekStart,
          weekEnd: getWeekEnd(targetWeekStart),
        };
        dispatch(setSelectedWeekStart(targetWeekStart));
      }

      message.success('Job created');
      await dispatch(fetchDispatchJobs(refreshRange));
    }

    if (recurringEnabled) {
      if (recurringWeekdays.length === 0) {
        message.warning(
          'Task saved, but recurring weekdays are empty. Please select at least one weekday.'
        );
      } else {
        const existingProfile = payload.customerProfileId
          ? customerProfiles.find(
              profile => profile.id === payload.customerProfileId
            )
          : undefined;
        const profileName =
          payload.customerName?.trim() ||
          existingProfile?.name?.trim() ||
          savedJob?.customerName?.trim() ||
          '';

        if (!profileName) {
          message.warning(
            'Task saved, but recurring template needs customer name or customer profile.'
          );
        } else {
          const recurringProfilePayload: UpsertDispatchCustomerProfilePayload =
            {
              name: profileName,
              recurringEnabled: true,
              recurringWeekdays,
              recurringStartTime: payload.scheduledStartTime,
              recurringEndTime: payload.scheduledEndTime,
              recurringServiceType: payload.serviceType,
              recurringPriority: payload.priority,
              defaultJobTitle: payload.title,
            };
          const profileId = payload.customerProfileId || existingProfile?.id;
          if (profileId) {
            recurringProfilePayload.id = profileId;
          }
          const firstWeekday = recurringWeekdays[0];
          if (firstWeekday) {
            recurringProfilePayload.recurringWeekday = firstWeekday;
          }
          const address =
            payload.customerAddress ||
            existingProfile?.address ||
            savedJob?.customerAddress;
          if (address) recurringProfilePayload.address = address;
          const phone =
            payload.customerPhone ||
            existingProfile?.phone ||
            savedJob?.customerPhone;
          if (phone) recurringProfilePayload.phone = phone;
          if (payload.description) {
            recurringProfilePayload.defaultDescription = payload.description;
          }
          if (payload.notes) {
            recurringProfilePayload.defaultNotes = payload.notes;
          }

          const profileResult = await dispatch(
            upsertDispatchCustomerProfile(recurringProfilePayload)
          );
          if (upsertDispatchCustomerProfile.fulfilled.match(profileResult)) {
            const savedProfile = profileResult.payload;
            if (savedJob && !savedJob.customerProfileId) {
              const jobPatch: Partial<
                Omit<DispatchJob, 'id' | 'createdAt' | 'updatedAt'>
              > = {
                customerProfileId: savedProfile.id,
                customerName: savedJob.customerName || savedProfile.name,
              };
              const nextAddress =
                savedJob.customerAddress || savedProfile.address;
              if (nextAddress) {
                jobPatch.customerAddress = nextAddress;
              }
              const nextPhone = savedJob.customerPhone || savedProfile.phone;
              if (nextPhone) {
                jobPatch.customerPhone = nextPhone;
              }
              await dispatch(
                updateDispatchJob({
                  id: savedJob.id,
                  patch: jobPatch,
                })
              );
            }
            await dispatch(fetchDispatchCustomerProfiles());
            message.success(
              `Recurring template saved (${recurringWeekdays.length} day${
                recurringWeekdays.length > 1 ? 's' : ''
              }/week)`
            );
          } else {
            message.warning(
              extractThunkError(
                profileResult,
                'Task saved, but failed to save recurring template'
              )
            );
          }
        }
      }
    }

    if (isEditing) {
      setEditingJob(null);
    }
    setModalOpen(false);
  };

  const handleAssign = async (jobId: string, employeeIds: string[]) => {
    await dispatch(assignDispatchJob({ id: jobId, employeeIds }));
    message.success('Employees assigned');
  };

  const handleAssignJobsToEmployee = async (
    jobIds: string[],
    employeeId: string
  ) => {
    for (const jobId of jobIds) {
      await dispatch(
        assignDispatchJob({ id: jobId, employeeIds: [employeeId] })
      );
    }
    message.success(`Assigned ${jobIds.length} jobs`);
    await dispatch(fetchDispatchJobs(weekRange));
  };

  const handleStatusChange = async (
    jobId: string,
    status: DispatchJobStatus
  ) => {
    await dispatch(updateDispatchJobStatus({ id: jobId, status }));
    message.success('Status updated');
  };

  const handleDeleteJob = async (jobId: string) => {
    const result = await dispatch(deleteDispatchJob(jobId));
    if (deleteDispatchJob.fulfilled.match(result)) {
      message.success('Task deleted');
      return;
    }
    message.error('Failed to delete task');
  };

  const handleReschedule = async (
    jobId: string,
    scheduledDate: string,
    scheduledStartTime: string,
    scheduledEndTime: string
  ) => {
    await dispatch(
      updateDispatchJob({
        id: jobId,
        patch: { scheduledDate, scheduledStartTime, scheduledEndTime },
      })
    );
    message.success('Job time updated');
  };

  const handleWeekChange = (weekStart: string) => {
    if (!weekStart) return;
    dispatch(setSelectedWeekStart(weekStart));
  };

  const handleFiltersChange = (newFilters: DispatchFilters) => {
    dispatch(setFilters(newFilters));
  };

  const handleEdit = (job: DispatchJob) => {
    setEditingJob(job);
    setModalOpen(true);
  };

  const handleAddCustomerProfile = async (
    payload: UpsertDispatchCustomerProfilePayload
  ) => {
    const result = await dispatch(upsertDispatchCustomerProfile(payload));
    if (upsertDispatchCustomerProfile.fulfilled.match(result)) {
      return result.payload;
    }
    throw new Error('Failed to save customer profile');
  };

  const handleSaveEmployee = async (payload: {
    id?: string;
    name: string;
    nameCN?: string;
    phone?: string;
    skills: Array<'bond' | 'airbnb' | 'regular' | 'commercial'>;
    status: 'available' | 'off';
  }) => {
    const result = await dispatch(upsertDispatchEmployee(payload));
    if (upsertDispatchEmployee.fulfilled.match(result)) {
      message.success('Employee saved');
      return;
    }
    throw new Error('Failed to save employee');
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    const result = await dispatch(deleteDispatchEmployee(employeeId));
    if (deleteDispatchEmployee.fulfilled.match(result)) {
      message.success('Employee deleted');
      return;
    }
    throw new Error(extractThunkError(result, 'Failed to delete employee'));
  };

  const handleReportEmployeeLocation = async (
    employeeId: string,
    location: Omit<DispatchEmployeeLocation, 'updatedAt'> & {
      updatedAt?: string;
    }
  ) => {
    const result = await dispatch(
      reportDispatchEmployeeLocation({
        employeeId,
        location,
      })
    );
    if (reportDispatchEmployeeLocation.fulfilled.match(result)) {
      message.success('Employee location updated');
      await dispatch(fetchDispatchEmployees());
      return;
    }
    throw new Error('Failed to report employee location');
  };

  const handleAutoFillRecurringJobs = async () => {
    const result = await dispatch(generateDispatchJobsFromRecurring(weekRange));
    if (generateDispatchJobsFromRecurring.fulfilled.match(result)) {
      const count = result.payload.length;
      message.success(
        count > 0
          ? `Generated ${count} recurring tasks for this week`
          : 'No new recurring tasks needed for this week'
      );
      return;
    }
    message.error('Failed to generate recurring tasks');
  };

  const handleMigrateLocalPeople = async () => {
    const result = await dispatch(migrateDispatchLocalPeopleToSupabase());
    if (migrateDispatchLocalPeopleToSupabase.fulfilled.match(result)) {
      message.success(
        `Migrated ${result.payload.employees} employees, ${result.payload.customerProfiles} customers, and ${result.payload.jobs} jobs`
      );
      await dispatch(fetchDispatchJobs(weekRange));
      await dispatch(fetchDispatchEmployees());
      await dispatch(fetchDispatchCustomerProfiles());
      return;
    }
    message.error('Failed to migrate local data to Supabase');
  };

  const handleExportBackup = async () => {
    const result = await dispatch(exportDispatchBackup());
    if (exportDispatchBackup.fulfilled.match(result)) {
      const content = result.payload;
      const blob = new Blob([content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dispatch-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      message.success('Backup exported');
      return;
    }
    message.error('Failed to export backup');
  };

  const handleImportBackup = async (file: File) => {
    const content = await file.text();
    const result = await dispatch(importDispatchBackup(content));
    if (importDispatchBackup.fulfilled.match(result)) {
      message.success('Backup imported');
      await dispatch(fetchDispatchJobs(weekRange));
      return;
    }
    message.error('Failed to import backup file');
  };

  const handleResetMigrationPrompt = () => {
    localStorage.removeItem(DISPATCH_AUTO_MIGRATION_PROMPT_KEY);
    message.success(
      'Migration prompt reset. It will show again when local jobs are detected.'
    );
  };

  return (
    <div className='dispatch-dashboard-page' style={{ padding: 12 }}>
      <div className='dispatch-dashboard-header'>
        <div>
          <Title
            level={4}
            className='dispatch-dashboard-title'
            style={{ marginBottom: 4 }}
          >
            Sparkery Dispatch Dashboard
          </Title>
          <Text className='dispatch-dashboard-subtitle' type='secondary'>
            Weekly scheduling and assignment board
          </Text>
        </div>
        <Space className='dispatch-dashboard-actions' wrap>
          <Button
            onClick={handleSyncGoogleCalendar}
            loading={syncingGoogleCalendar}
            disabled={!googleCalendarConfigured}
          >
            Sync Week to Google Calendar
          </Button>
          <Button onClick={() => setAdminSetupOpen(true)}>
            Edit Employees & Customers
          </Button>
          <Button onClick={handleAutoFillRecurringJobs}>
            Auto Fill Recurring Tasks
          </Button>
          <Button type='primary' onClick={() => setModalOpen(true)}>
            Create Job
          </Button>
        </Space>
      </div>

      <Card size='small' style={{ marginBottom: 12 }}>
        <DispatchFiltersBar
          weekStart={selectedWeekStart}
          filters={filters}
          onWeekChange={handleWeekChange}
          onFiltersChange={handleFiltersChange}
          onRefresh={handleRefresh}
        />
      </Card>

      {!supabaseConfigured && (
        <Alert
          type='warning'
          showIcon
          style={{ marginBottom: 12 }}
          message='Supabase is not configured'
          description='Dispatch data is currently stored in browser local storage only. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to persist tasks to cloud.'
        />
      )}

      {!googleCalendarConfigured && (
        <Alert
          type='info'
          showIcon
          style={{ marginBottom: 12 }}
          message='Google Calendar sync is not configured'
          description='Set VITE_GOOGLE_CALENDAR_CLIENT_ID to enable one-click Google Calendar sync.'
        />
      )}

      {error && (
        <Alert
          type='error'
          message={error}
          closable
          onClose={() => dispatch(clearDispatchError())}
          style={{ marginBottom: 12 }}
        />
      )}

      <Row gutter={12}>
        <Col span={24}>
          <WeeklyDispatchBoard
            jobsByDate={jobsByDate}
            employees={employees}
            weekStart={selectedWeekStart}
            onAssign={handleAssign}
            onStatusChange={handleStatusChange}
            onDelete={handleDeleteJob}
            onReschedule={handleReschedule}
            onEdit={handleEdit}
          />
        </Col>
      </Row>

      <Card size='small' style={{ marginTop: 12 }}>
        <DispatchMapPlanner
          jobs={jobs}
          employees={employees}
          weekStart={selectedWeekStart}
          onAssignJobsToEmployee={handleAssignJobsToEmployee}
        />
      </Card>

      <DispatchJobFormModal
        open={modalOpen}
        loading={isLoading}
        {...(editingJob ? { initialValue: editingJob } : {})}
        customerProfiles={customerProfiles}
        onCancel={() => {
          setModalOpen(false);
          setEditingJob(null);
        }}
        onSubmit={handleCreateJob}
        onAddCustomerProfile={handleAddCustomerProfile}
      />

      <DispatchAdminSetupModal
        open={adminSetupOpen}
        loading={isLoading}
        employees={employees}
        customerProfiles={customerProfiles}
        onCancel={() => setAdminSetupOpen(false)}
        onSaveEmployee={handleSaveEmployee}
        onDeleteEmployee={handleDeleteEmployee}
        onReportEmployeeLocation={handleReportEmployeeLocation}
        onSaveCustomer={handleAddCustomerProfile}
        onMigrateLocalPeople={handleMigrateLocalPeople}
        onResetMigrationPrompt={handleResetMigrationPrompt}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
      />
    </div>
  );
};

export default DispatchDashboard;
