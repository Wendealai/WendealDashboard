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
  exportDispatchBackup,
  fetchDispatchCustomerProfiles,
  fetchDispatchEmployees,
  fetchDispatchJobs,
  generateDispatchJobsFromRecurring,
  importDispatchBackup,
  migrateDispatchLocalPeopleToSupabase,
  selectDispatchCustomerProfiles,
  selectDispatchEmployees,
  selectDispatchJobsByDate,
  selectDispatchState,
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
  DispatchFilters,
  DispatchJob,
  DispatchJobStatus,
} from './dispatch/types';
import DispatchFiltersBar from './components/dispatch/DispatchFiltersBar';
import DispatchAdminSetupModal from './components/dispatch/DispatchAdminSetupModal';
import DispatchJobFormModal from './components/dispatch/DispatchJobFormModal';
import WeeklyDispatchBoard from './components/dispatch/WeeklyDispatchBoard';

const { Title, Text } = Typography;
const DISPATCH_LOCAL_STORAGE_KEY = 'sparkery_dispatch_storage_v1';
const DISPATCH_AUTO_MIGRATION_PROMPT_KEY =
  'sparkery_dispatch_auto_migration_prompt_seen_v1';

const getWeekEnd = (weekStart: string): string => {
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end.toISOString().slice(0, 10);
};

const DispatchDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const { selectedWeekStart, filters, error, isLoading } =
    useAppSelector(selectDispatchState);
  const employees = useAppSelector(selectDispatchEmployees);
  const customerProfiles = useAppSelector(selectDispatchCustomerProfiles);
  const jobsByDate = useAppSelector(selectDispatchJobsByDate);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<DispatchJob | null>(null);
  const [adminSetupOpen, setAdminSetupOpen] = useState(false);

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

  const handleCreateJob = async (payload: CreateDispatchJobPayload) => {
    if (editingJob) {
      await dispatch(updateDispatchJob({ id: editingJob.id, patch: payload }));
      message.success('Job updated');
    } else {
      await dispatch(createDispatchJob(payload));
      message.success('Job created');
    }
    setModalOpen(false);
    setEditingJob(null);
  };

  const handleAssign = async (jobId: string, employeeIds: string[]) => {
    await dispatch(assignDispatchJob({ id: jobId, employeeIds }));
    message.success('Employees assigned');
  };

  const handleStatusChange = async (
    jobId: string,
    status: DispatchJobStatus
  ) => {
    await dispatch(updateDispatchJobStatus({ id: jobId, status }));
    message.success('Status updated');
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

  const handleAddCustomerProfile = async (payload: {
    name: string;
    address?: string;
    phone?: string;
    defaultJobTitle?: string;
    defaultDescription?: string;
    defaultNotes?: string;
  }) => {
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
            onReschedule={handleReschedule}
            onEdit={handleEdit}
          />
        </Col>
      </Row>

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
