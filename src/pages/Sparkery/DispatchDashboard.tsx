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
  Tag,
  Typography,
} from 'antd';
import {
  applyDispatchJobFinanceAdjustment,
  assignDispatchJob,
  clearDispatchError,
  confirmDispatchJobFinance,
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
  setDispatchJobPaymentReceived,
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
import { DispatchFiltersBar } from './components/dispatch/DispatchFiltersBar';
import DispatchAdminSetupModal from './components/dispatch/DispatchAdminSetupModal';
import DispatchJobFormModal from './components/dispatch/DispatchJobFormModal';
import WeeklyDispatchBoard from './components/dispatch/WeeklyDispatchBoard';
import DispatchMapPlanner from './components/dispatch/DispatchMapPlanner';
import WeeklyFinanceBoard from './components/dispatch/WeeklyFinanceBoard';
import {
  isGoogleCalendarConfigured,
  syncDispatchWeekToGoogleCalendar,
} from '@/services/googleCalendarService';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './sparkery.css';

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
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
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
      title: t('sparkery.dispatch.dashboard.migrateFoundTitle'),
      content: t('sparkery.dispatch.dashboard.migrateFoundContent'),
      okText: t('sparkery.dispatch.dashboard.migrateNow'),
      cancelText: t('sparkery.dispatch.dashboard.later'),
      onOk: async () => {
        localStorage.setItem(DISPATCH_AUTO_MIGRATION_PROMPT_KEY, 'migrated');
        const result = await dispatch(migrateDispatchLocalPeopleToSupabase());
        if (migrateDispatchLocalPeopleToSupabase.fulfilled.match(result)) {
          message.success(
            t('sparkery.dispatch.dashboard.migratedSummary', {
              employees: result.payload.employees,
              customers: result.payload.customerProfiles,
              jobs: result.payload.jobs,
            })
          );
          await dispatch(fetchDispatchJobs(weekRange));
          await dispatch(fetchDispatchEmployees());
          await dispatch(fetchDispatchCustomerProfiles());
          return;
        }
        localStorage.removeItem(DISPATCH_AUTO_MIGRATION_PROMPT_KEY);
        message.error(t('sparkery.dispatch.dashboard.migrateFailed'));
      },
      onCancel: () => {
        localStorage.setItem(DISPATCH_AUTO_MIGRATION_PROMPT_KEY, 'skipped');
      },
    });
  }, [dispatch, t, weekRange]);

  const handleRefresh = async () => {
    await dispatch(fetchDispatchJobs(weekRange));
    message.success(t('sparkery.dispatch.dashboard.messages.jobsRefreshed'));
  };

  const handleSyncGoogleCalendar = async () => {
    if (!googleCalendarConfigured) {
      message.warning(
        t('sparkery.dispatch.dashboard.messages.googleNotConfigured')
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
        t('sparkery.dispatch.dashboard.messages.calendarSynced', {
          created: result.created,
          updated: result.updated,
          deleted: result.deleted,
        })
      );
    } catch (error) {
      message.error(
        error instanceof Error
          ? error.message
          : t('sparkery.dispatch.dashboard.messages.calendarSyncFailed')
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
          extractThunkError(
            result,
            t('sparkery.dispatch.dashboard.messages.updateTaskFailed')
          )
        );
        return;
      }
      savedJob = result.payload;
      message.success(t('sparkery.dispatch.dashboard.messages.jobUpdated'));
      await dispatch(fetchDispatchJobs(weekRange));
    } else {
      const result = await dispatch(createDispatchJob(payload));
      if (!createDispatchJob.fulfilled.match(result)) {
        message.error(
          extractThunkError(
            result,
            t('sparkery.dispatch.dashboard.messages.createTaskFailed')
          )
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

      message.success(t('sparkery.dispatch.dashboard.messages.jobCreated'));
      await dispatch(fetchDispatchJobs(refreshRange));
    }

    if (recurringEnabled) {
      if (recurringWeekdays.length === 0) {
        message.warning(
          t('sparkery.dispatch.dashboard.messages.recurringWeekdaysEmpty')
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
            t('sparkery.dispatch.dashboard.messages.recurringNeedCustomer')
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
          if (
            typeof payload.baseFee === 'number' &&
            Number.isFinite(payload.baseFee)
          ) {
            recurringProfilePayload.recurringFee = payload.baseFee;
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
              t('sparkery.dispatch.dashboard.messages.recurringSaved', {
                days: recurringWeekdays.length,
              })
            );
          } else {
            message.warning(
              extractThunkError(
                profileResult,
                t('sparkery.dispatch.dashboard.messages.recurringSaveFailed')
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
    const result = await dispatch(
      assignDispatchJob({ id: jobId, employeeIds })
    );
    if (assignDispatchJob.fulfilled.match(result)) {
      message.success(
        t('sparkery.dispatch.dashboard.messages.employeesAssigned')
      );
      return;
    }
    message.error(
      extractThunkError(
        result,
        t('sparkery.dispatch.dashboard.messages.assignEmployeesFailed')
      )
    );
  };

  const handleAssignJobsToEmployee = async (
    jobIds: string[],
    employeeId: string
  ) => {
    let successCount = 0;
    let failedCount = 0;
    for (const jobId of jobIds) {
      const result = await dispatch(
        assignDispatchJob({ id: jobId, employeeIds: [employeeId] })
      );
      if (assignDispatchJob.fulfilled.match(result)) {
        successCount += 1;
      } else {
        failedCount += 1;
      }
    }
    if (failedCount === 0) {
      message.success(
        t('sparkery.dispatch.dashboard.messages.assignedJobs', {
          success: successCount,
        })
      );
    } else {
      message.warning(
        t('sparkery.dispatch.dashboard.messages.assignedJobsWithSkipped', {
          success: successCount,
          failed: failedCount,
        })
      );
    }
    await dispatch(fetchDispatchJobs(weekRange));
  };

  const handleStatusChange = async (
    jobId: string,
    status: DispatchJobStatus
  ) => {
    const result = await dispatch(
      updateDispatchJobStatus({ id: jobId, status })
    );
    if (updateDispatchJobStatus.fulfilled.match(result)) {
      message.success(t('sparkery.dispatch.dashboard.messages.statusUpdated'));
      return;
    }
    message.error(
      extractThunkError(
        result,
        t('sparkery.dispatch.dashboard.messages.statusUpdateFailed')
      )
    );
  };

  const handleDeleteJob = async (jobId: string) => {
    const result = await dispatch(deleteDispatchJob(jobId));
    if (deleteDispatchJob.fulfilled.match(result)) {
      message.success(t('sparkery.dispatch.dashboard.messages.taskDeleted'));
      return;
    }
    message.error(
      extractThunkError(
        result,
        t('sparkery.dispatch.dashboard.messages.deleteTaskFailed')
      )
    );
  };

  const handleReschedule = async (
    jobId: string,
    scheduledDate: string,
    scheduledStartTime: string,
    scheduledEndTime: string
  ) => {
    const result = await dispatch(
      updateDispatchJob({
        id: jobId,
        patch: { scheduledDate, scheduledStartTime, scheduledEndTime },
      })
    );
    if (updateDispatchJob.fulfilled.match(result)) {
      message.success(t('sparkery.dispatch.dashboard.messages.jobTimeUpdated'));
      return;
    }
    message.error(
      extractThunkError(
        result,
        t('sparkery.dispatch.dashboard.messages.jobTimeUpdateFailed')
      )
    );
  };

  const handleApplyFinanceAdjustment = async (
    jobId: string,
    deltaAmount: number
  ) => {
    const result = await dispatch(
      applyDispatchJobFinanceAdjustment({
        id: jobId,
        adjustmentDelta: deltaAmount,
      })
    );
    if (applyDispatchJobFinanceAdjustment.fulfilled.match(result)) {
      message.success(
        t('sparkery.dispatch.dashboard.messages.financeAdjustmentApplied')
      );
      return;
    }
    message.error(
      extractThunkError(
        result,
        t('sparkery.dispatch.dashboard.messages.financeAdjustmentApplyFailed')
      )
    );
  };

  const handleConfirmFinance = async (jobId: string) => {
    const result = await dispatch(
      confirmDispatchJobFinance({
        id: jobId,
        confirmedBy: 'dispatch-dashboard',
      })
    );
    if (confirmDispatchJobFinance.fulfilled.match(result)) {
      message.success(
        t('sparkery.dispatch.dashboard.messages.financeConfirmedLocked')
      );
      return;
    }
    message.error(
      extractThunkError(
        result,
        t('sparkery.dispatch.dashboard.messages.financeConfirmFailed')
      )
    );
  };

  const handleTogglePaymentReceived = async (
    jobId: string,
    received: boolean
  ) => {
    const result = await dispatch(
      setDispatchJobPaymentReceived({
        id: jobId,
        received,
        receivedBy: 'dispatch-dashboard',
      })
    );
    if (setDispatchJobPaymentReceived.fulfilled.match(result)) {
      message.success(
        received
          ? t('sparkery.dispatch.dashboard.messages.markedPaid')
          : t('sparkery.dispatch.dashboard.messages.markedUnpaid')
      );
      return;
    }
    message.error(
      extractThunkError(
        result,
        t('sparkery.dispatch.dashboard.messages.paymentStatusUpdateFailed')
      )
    );
  };

  const handleWeekChange = (weekStart: string) => {
    if (!weekStart) return;
    dispatch(setSelectedWeekStart(weekStart));
  };

  const handleShiftWeek = (offsetWeeks: number) => {
    if (!Number.isFinite(offsetWeeks) || offsetWeeks === 0) {
      return;
    }
    const start = parseDateKey(selectedWeekStart);
    start.setDate(start.getDate() + offsetWeeks * 7);
    dispatch(setSelectedWeekStart(formatDateKey(start)));
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
    throw new Error(
      t('sparkery.dispatch.dashboard.messages.customerSaveFailed')
    );
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
      message.success(t('sparkery.dispatch.dashboard.messages.employeeSaved'));
      return;
    }
    throw new Error(
      t('sparkery.dispatch.dashboard.messages.employeeSaveFailed')
    );
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    const result = await dispatch(deleteDispatchEmployee(employeeId));
    if (deleteDispatchEmployee.fulfilled.match(result)) {
      message.success(
        t('sparkery.dispatch.dashboard.messages.employeeDeleted')
      );
      return;
    }
    throw new Error(
      extractThunkError(
        result,
        t('sparkery.dispatch.dashboard.messages.employeeDeleteFailed')
      )
    );
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
      message.success(
        t('sparkery.dispatch.dashboard.messages.employeeLocationUpdated')
      );
      await dispatch(fetchDispatchEmployees());
      return;
    }
    throw new Error(
      t('sparkery.dispatch.dashboard.messages.employeeLocationReportFailed')
    );
  };

  const handleAutoFillRecurringJobs = async () => {
    const result = await dispatch(generateDispatchJobsFromRecurring(weekRange));
    if (generateDispatchJobsFromRecurring.fulfilled.match(result)) {
      const count = result.payload.length;
      message.success(
        count > 0
          ? t('sparkery.dispatch.dashboard.messages.generatedRecurringTasks', {
              count,
            })
          : t('sparkery.dispatch.dashboard.messages.noRecurringTasksNeeded')
      );
      return;
    }
    message.error(
      t('sparkery.dispatch.dashboard.messages.generateRecurringTasksFailed')
    );
  };

  const handleMigrateLocalPeople = async () => {
    const result = await dispatch(migrateDispatchLocalPeopleToSupabase());
    if (migrateDispatchLocalPeopleToSupabase.fulfilled.match(result)) {
      message.success(
        t('sparkery.dispatch.dashboard.migratedSummary', {
          employees: result.payload.employees,
          customers: result.payload.customerProfiles,
          jobs: result.payload.jobs,
        })
      );
      await dispatch(fetchDispatchJobs(weekRange));
      await dispatch(fetchDispatchEmployees());
      await dispatch(fetchDispatchCustomerProfiles());
      return;
    }
    message.error(t('sparkery.dispatch.dashboard.migrateFailed'));
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
      message.success(t('sparkery.dispatch.dashboard.messages.backupExported'));
      return;
    }
    message.error(t('sparkery.dispatch.dashboard.messages.backupExportFailed'));
  };

  const handleImportBackup = async (file: File) => {
    const content = await file.text();
    const result = await dispatch(importDispatchBackup(content));
    if (importDispatchBackup.fulfilled.match(result)) {
      message.success(t('sparkery.dispatch.dashboard.messages.backupImported'));
      await dispatch(fetchDispatchJobs(weekRange));
      return;
    }
    message.error(t('sparkery.dispatch.dashboard.messages.backupImportFailed'));
  };

  const handleResetMigrationPrompt = () => {
    localStorage.removeItem(DISPATCH_AUTO_MIGRATION_PROMPT_KEY);
    message.success(
      t('sparkery.dispatch.dashboard.messages.migrationPromptReset')
    );
  };

  return (
    <div className='dispatch-dashboard-page dispatch-dashboard-shell'>
      <div className='dispatch-dashboard-header'>
        <div>
          <Title level={4} className='dispatch-dashboard-title'>
            {t('sparkery.dispatch.dashboard.title')}
          </Title>
          <Text className='dispatch-dashboard-subtitle' type='secondary'>
            {t('sparkery.dispatch.dashboard.subtitle')}
          </Text>
          <Space
            size={[6, 6]}
            wrap
            className='dispatch-dashboard-header-status'
          >
            <Tag
              className={
                supabaseConfigured
                  ? 'dispatch-dashboard-status-tag dispatch-dashboard-status-tag-online'
                  : 'dispatch-dashboard-status-tag dispatch-dashboard-status-tag-local'
              }
            >
              {t('sparkery.dispatch.dashboard.supabaseStatus', {
                status: supabaseConfigured
                  ? t('sparkery.dispatch.dashboard.connected')
                  : t('sparkery.dispatch.dashboard.localOnly'),
              })}
            </Tag>
            <Tag
              className={
                googleCalendarConfigured
                  ? 'dispatch-dashboard-status-tag dispatch-dashboard-status-tag-online'
                  : 'dispatch-dashboard-status-tag dispatch-dashboard-status-tag-warning'
              }
            >
              {t('sparkery.dispatch.dashboard.googleCalendarStatus', {
                status: googleCalendarConfigured
                  ? t('sparkery.dispatch.dashboard.enabled')
                  : t('sparkery.dispatch.dashboard.disabled'),
              })}
            </Tag>
          </Space>
        </div>
        <Space className='dispatch-dashboard-actions' wrap>
          <Button
            className='dispatch-dashboard-action-btn dispatch-dashboard-action-btn-sync'
            onClick={handleSyncGoogleCalendar}
            loading={syncingGoogleCalendar}
            disabled={!googleCalendarConfigured}
          >
            {t('sparkery.dispatch.dashboard.syncWeekToGoogleCalendar')}
          </Button>
          <Button
            className='dispatch-dashboard-action-btn'
            onClick={() => setAdminSetupOpen(true)}
          >
            {t('sparkery.dispatch.dashboard.editEmployeesCustomers')}
          </Button>
          <Button
            className='dispatch-dashboard-action-btn'
            onClick={() => navigate('/sparkery/recurring')}
          >
            {t('sparkery.dispatch.dashboard.recurringTemplates')}
          </Button>
          <Button
            className='dispatch-dashboard-action-btn'
            onClick={() => navigate('/sparkery/finance')}
          >
            {t('sparkery.dispatch.dashboard.openFinancePanel')}
          </Button>
          <Button
            className='dispatch-dashboard-action-btn'
            onClick={() =>
              navigate(
                `/dispatch-employee-tasks?weekStart=${weekRange.weekStart}&weekEnd=${weekRange.weekEnd}`
              )
            }
          >
            {t('sparkery.dispatch.dashboard.employeeTasksMobile')}
          </Button>
          <Button
            className='dispatch-dashboard-action-btn dispatch-dashboard-action-btn-auto'
            onClick={handleAutoFillRecurringJobs}
          >
            {t('sparkery.dispatch.dashboard.autoFillRecurringTasks')}
          </Button>
          <Button
            type='primary'
            className='dispatch-dashboard-action-btn dispatch-dashboard-action-btn-primary'
            onClick={() => setModalOpen(true)}
          >
            {t('sparkery.dispatch.dashboard.createJob')}
          </Button>
        </Space>
      </div>

      <Card size='small' className='dispatch-dashboard-section-card'>
        <DispatchFiltersBar
          weekStart={selectedWeekStart}
          filters={filters}
          onWeekChange={handleWeekChange}
          onPrevWeek={() => handleShiftWeek(-1)}
          onNextWeek={() => handleShiftWeek(1)}
          onFiltersChange={handleFiltersChange}
          onRefresh={handleRefresh}
        />
      </Card>

      {!supabaseConfigured && (
        <Alert
          className='dispatch-dashboard-alert dispatch-dashboard-alert-warning'
          type='warning'
          showIcon
          message={t('sparkery.dispatch.dashboard.supabaseNotConfigured')}
          description={t(
            'sparkery.dispatch.dashboard.supabaseNotConfiguredDesc'
          )}
        />
      )}

      {!googleCalendarConfigured && (
        <Alert
          className='dispatch-dashboard-alert dispatch-dashboard-alert-info'
          type='info'
          showIcon
          message={t('sparkery.dispatch.dashboard.googleSyncNotConfigured')}
          description={t(
            'sparkery.dispatch.dashboard.googleSyncNotConfiguredDesc'
          )}
        />
      )}

      {error && (
        <Alert
          className='dispatch-dashboard-alert dispatch-dashboard-alert-error'
          type='error'
          message={error}
          closable
          onClose={() => dispatch(clearDispatchError())}
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

      <Card
        size='small'
        className='dispatch-dashboard-section-card dispatch-dashboard-section-card-top'
      >
        <DispatchMapPlanner
          jobs={jobs}
          employees={employees}
          weekStart={selectedWeekStart}
          onAssignJobsToEmployee={handleAssignJobsToEmployee}
        />
      </Card>

      <div className='dispatch-dashboard-section-top'>
        <WeeklyFinanceBoard
          jobs={jobs}
          employees={employees}
          weekStart={weekRange.weekStart}
          weekEnd={weekRange.weekEnd}
          loading={isLoading}
          onApplyAdjustment={handleApplyFinanceAdjustment}
          onConfirmFinance={handleConfirmFinance}
          onTogglePaymentReceived={handleTogglePaymentReceived}
        />
      </div>

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
