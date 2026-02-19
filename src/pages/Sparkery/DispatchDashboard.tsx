import React, { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  message,
  Row,
  Space,
  Typography,
} from 'antd';
import {
  assignDispatchJob,
  clearDispatchError,
  createDispatchJob,
  fetchDispatchEmployees,
  fetchDispatchJobs,
  selectDispatchEmployees,
  selectDispatchJobsByDate,
  selectDispatchState,
  setFilters,
  setSelectedWeekStart,
  updateDispatchJobStatus,
} from '@/store/slices/sparkeryDispatchSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type {
  CreateDispatchJobPayload,
  DispatchFilters,
  DispatchJobStatus,
} from './dispatch/types';
import DispatchFiltersBar from './components/dispatch/DispatchFiltersBar';
import DispatchJobFormModal from './components/dispatch/DispatchJobFormModal';
import WeeklyDispatchBoard from './components/dispatch/WeeklyDispatchBoard';

const { Title, Text } = Typography;

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
  const jobsByDate = useAppSelector(selectDispatchJobsByDate);
  const [modalOpen, setModalOpen] = useState(false);

  const weekRange = useMemo(
    () => ({
      weekStart: selectedWeekStart,
      weekEnd: getWeekEnd(selectedWeekStart),
    }),
    [selectedWeekStart]
  );

  React.useEffect(() => {
    dispatch(fetchDispatchEmployees());
  }, [dispatch]);

  React.useEffect(() => {
    dispatch(fetchDispatchJobs(weekRange));
  }, [dispatch, weekRange]);

  const handleRefresh = async () => {
    await dispatch(fetchDispatchJobs(weekRange));
    message.success('Dispatch jobs refreshed');
  };

  const handleCreateJob = async (payload: CreateDispatchJobPayload) => {
    await dispatch(createDispatchJob(payload));
    message.success('Job created');
    setModalOpen(false);
  };

  const handleAssign = async (jobId: string, employeeId: string) => {
    await dispatch(assignDispatchJob({ id: jobId, employeeId }));
    message.success('Employee assigned');
  };

  const handleStatusChange = async (
    jobId: string,
    status: DispatchJobStatus
  ) => {
    await dispatch(updateDispatchJobStatus({ id: jobId, status }));
    message.success('Status updated');
  };

  const handleWeekChange = (weekStart: string) => {
    if (!weekStart) return;
    dispatch(setSelectedWeekStart(weekStart));
  };

  const handleFiltersChange = (newFilters: DispatchFilters) => {
    dispatch(setFilters(newFilters));
  };

  return (
    <div style={{ padding: 12 }}>
      <Space
        style={{
          width: '100%',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>
            Sparkery Dispatch Dashboard
          </Title>
          <Text type='secondary'>Weekly scheduling and assignment board</Text>
        </div>
        <Button type='primary' onClick={() => setModalOpen(true)}>
          Create Job
        </Button>
      </Space>

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
          />
        </Col>
      </Row>

      <DispatchJobFormModal
        open={modalOpen}
        loading={isLoading}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleCreateJob}
      />
    </div>
  );
};

export default DispatchDashboard;
