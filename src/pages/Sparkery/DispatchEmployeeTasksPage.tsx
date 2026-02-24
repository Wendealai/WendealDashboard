import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Alert,
  Button,
  Card,
  Empty,
  List,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  CloudSyncOutlined,
  CompassOutlined,
  EnvironmentOutlined,
  LeftOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  RightOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { DispatchEmployee, DispatchJob } from './dispatch/types';
import { sparkeryDispatchService } from '@/services/sparkeryDispatchService';
import {
  enqueueDispatchOfflineAction,
  flushDispatchOfflineQueue,
  getDispatchOfflineQueueCount,
  isLikelyNetworkError,
} from './dispatch/offlineQueue';
import { useTranslation } from 'react-i18next';
import './sparkery.css';

const { Title, Text } = Typography;

interface EmployeeTasksQuery {
  employeeId: string;
  weekStart: string;
  weekEnd: string;
  date: string;
  jobIds: string[];
}

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateKey = (value: string): Date => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year || 1970, (month || 1) - 1, day || 1);
};

const resolveMonday = (value: string): string => {
  const base = parseDateKey(value);
  const day = base.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate() + mondayOffset
  );
  return formatDateKey(monday);
};

const getWeekEnd = (weekStart: string): string => {
  const start = parseDateKey(weekStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return formatDateKey(end);
};

const parseQuery = (): EmployeeTasksQuery => {
  const params = new URLSearchParams(window.location.search);
  const today = dayjs().format('YYYY-MM-DD');
  const rawWeekStart = (params.get('weekStart') || '').trim() || today;
  const weekStart = resolveMonday(rawWeekStart);
  const weekEnd = (params.get('weekEnd') || '').trim() || getWeekEnd(weekStart);
  const date = (params.get('date') || '').trim() || today;
  const jobIds = (params.get('jobIds') || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean);
  return {
    employeeId: (params.get('employeeId') || '').trim(),
    weekStart,
    weekEnd,
    date,
    jobIds: Array.from(new Set(jobIds)),
  };
};

const compareJobsBySchedule = (a: DispatchJob, b: DispatchJob): number => {
  if (a.scheduledDate !== b.scheduledDate) {
    return a.scheduledDate.localeCompare(b.scheduledDate);
  }
  if (a.scheduledStartTime !== b.scheduledStartTime) {
    return a.scheduledStartTime.localeCompare(b.scheduledStartTime);
  }
  return a.id.localeCompare(b.id);
};

const buildNavigationLink = (address?: string): string =>
  `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address || '')}`;

const statusColor: Record<DispatchJob['status'], string> = {
  pending: 'default',
  assigned: 'blue',
  in_progress: 'gold',
  completed: 'green',
  cancelled: 'red',
};

const DispatchEmployeeTasksPage: React.FC = () => {
  const { t } = useTranslation();
  const query = useMemo(() => parseQuery(), []);
  const [loading, setLoading] = useState(true);
  const [savingJobId, setSavingJobId] = useState<string | null>(null);
  const [reportingLocation, setReportingLocation] = useState(false);
  const [employees, setEmployees] = useState<DispatchEmployee[]>([]);
  const [jobs, setJobs] = useState<DispatchJob[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(
    query.employeeId
  );
  const [selectedDate, setSelectedDate] = useState(query.date);
  const [currentWeekStart, setCurrentWeekStart] = useState(query.weekStart);
  const [currentWeekEnd, setCurrentWeekEnd] = useState(query.weekEnd);
  const [error, setError] = useState('');
  const [isOnline, setIsOnline] = useState<boolean>(() => navigator.onLine);
  const [queuedActions, setQueuedActions] = useState<number>(() =>
    getDispatchOfflineQueueCount()
  );
  const [syncingQueue, setSyncingQueue] = useState(false);
  const syncingQueueRef = useRef(false);
  const statusLabels: Record<DispatchJob['status'], string> = {
    pending: t('sparkery.dispatch.status.pending'),
    assigned: t('sparkery.dispatch.status.assigned'),
    in_progress: t('sparkery.dispatch.status.inProgress'),
    completed: t('sparkery.dispatch.status.completed'),
    cancelled: t('sparkery.dispatch.status.cancelled'),
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [employeeRows, jobRows] = await Promise.all([
        sparkeryDispatchService.getEmployees(),
        sparkeryDispatchService.getJobs({
          weekStart: currentWeekStart,
          weekEnd: currentWeekEnd,
        }),
      ]);
      setEmployees(employeeRows);
      setJobs(jobRows);
      setSelectedEmployeeId(prev => {
        if (prev && employeeRows.some(employee => employee.id === prev)) {
          return prev;
        }
        if (
          query.employeeId &&
          employeeRows.some(employee => employee.id === query.employeeId)
        ) {
          return query.employeeId;
        }
        return employeeRows[0]?.id || '';
      });
    } catch {
      setError(t('sparkery.dispatch.employeeTasks.messages.loadFailed'));
    } finally {
      setLoading(false);
      setQueuedActions(getDispatchOfflineQueueCount());
    }
  }, [currentWeekEnd, currentWeekStart, query.employeeId, t]);

  useEffect(() => {
    loadData().catch(() => {
      // handled in loadData
    });
  }, [loadData]);

  const applyLocalJobStatus = useCallback(
    (jobId: string, status: DispatchJob['status']) => {
      const updatedAt = new Date().toISOString();
      setJobs(prev =>
        prev.map(job =>
          job.id === jobId ? { ...job, status, updatedAt } : job
        )
      );
    },
    []
  );

  const applyLocalLocation = useCallback(
    (
      employeeId: string,
      location: {
        lat: number;
        lng: number;
        accuracyM?: number;
        source: 'gps' | 'manual' | 'mobile';
        label?: string;
        updatedAt: string;
      }
    ) => {
      setEmployees(prev =>
        prev.map(employee =>
          employee.id === employeeId
            ? { ...employee, currentLocation: location }
            : employee
        )
      );
    },
    []
  );

  const refreshQueueCount = useCallback(() => {
    setQueuedActions(getDispatchOfflineQueueCount());
  }, []);

  const syncOfflineQueue = useCallback(
    async (silent = false) => {
      if (syncingQueueRef.current) {
        return;
      }

      if (!navigator.onLine) {
        setIsOnline(false);
        refreshQueueCount();
        if (!silent) {
          message.warning(
            t('sparkery.dispatch.employeeTasks.messages.deviceOffline')
          );
        }
        return;
      }

      syncingQueueRef.current = true;
      setSyncingQueue(true);
      try {
        const result = await flushDispatchOfflineQueue(
          {
            updateJobStatus: async payload => {
              await sparkeryDispatchService.updateJobStatus(
                payload.jobId,
                payload.status
              );
            },
            reportEmployeeLocation: async payload => {
              await sparkeryDispatchService.reportEmployeeLocation(
                payload.employeeId,
                payload.location
              );
            },
          },
          {
            stopOnNetworkError: true,
          }
        );

        setQueuedActions(result.remaining);

        if (result.synced > 0) {
          await loadData();
          if (!silent) {
            message.success(
              t(
                'sparkery.dispatch.employeeTasks.messages.syncedQueuedActions',
                {
                  count: result.synced,
                }
              )
            );
          }
        } else if (!silent && result.remaining === 0) {
          message.info(
            t('sparkery.dispatch.employeeTasks.messages.noQueuedActions')
          );
        }

        if (!silent && result.failed > 0) {
          message.warning(
            t('sparkery.dispatch.employeeTasks.messages.pendingQueuedActions', {
              count: result.remaining,
            })
          );
        }
      } finally {
        syncingQueueRef.current = false;
        setSyncingQueue(false);
      }
    },
    [loadData, refreshQueueCount, t]
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineQueue(true).catch(() => {
        // keep queue for next retry
      });
    };
    const handleOffline = () => {
      setIsOnline(false);
      refreshQueueCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshQueueCount, syncOfflineQueue]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    refreshQueueCount();
    if (navigator.onLine) {
      syncOfflineQueue(true).catch(() => {
        // keep queue for next retry
      });
    }
  }, [refreshQueueCount, syncOfflineQueue]);

  const selectedEmployee = useMemo(
    () =>
      employees.find(employee => employee.id === selectedEmployeeId) || null,
    [employees, selectedEmployeeId]
  );

  const priorityMap = useMemo(
    () => new Map(query.jobIds.map((id, index) => [id, index])),
    [query.jobIds]
  );

  const employeeJobs = useMemo(() => {
    const assigned = jobs.filter(job =>
      job.assignedEmployeeIds?.includes(selectedEmployeeId)
    );
    return [...assigned].sort((a, b) => {
      const aPriority = priorityMap.has(a.id)
        ? (priorityMap.get(a.id) as number)
        : Number.MAX_SAFE_INTEGER;
      const bPriority = priorityMap.has(b.id)
        ? (priorityMap.get(b.id) as number)
        : Number.MAX_SAFE_INTEGER;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      return compareJobsBySchedule(a, b);
    });
  }, [jobs, selectedEmployeeId, priorityMap]);

  const dateOptions = useMemo(() => {
    const counts = employeeJobs.reduce<Record<string, number>>((acc, job) => {
      acc[job.scheduledDate] = (acc[job.scheduledDate] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts)
      .sort((a, b) => a.localeCompare(b))
      .map(date => ({
        value: date,
        label: t('sparkery.dispatch.employeeTasks.dateOptionLabel', {
          date,
          weekday: dayjs(date).format('ddd'),
          count: counts[date] || 0,
        }),
      }));
  }, [employeeJobs, t]);

  useEffect(() => {
    if (dateOptions.length === 0) {
      return;
    }
    if (!dateOptions.some(option => option.value === selectedDate)) {
      setSelectedDate(dateOptions[0]!.value);
    }
  }, [dateOptions, selectedDate]);

  const jobsForDate = useMemo(
    () => employeeJobs.filter(job => job.scheduledDate === selectedDate),
    [employeeJobs, selectedDate]
  );

  const handleShiftWeek = useCallback(
    (offsetWeeks: number) => {
      const nextWeekStartDate = parseDateKey(currentWeekStart);
      nextWeekStartDate.setDate(nextWeekStartDate.getDate() + offsetWeeks * 7);
      const nextWeekStart = formatDateKey(nextWeekStartDate);
      const nextWeekEnd = getWeekEnd(nextWeekStart);
      setCurrentWeekStart(nextWeekStart);
      setCurrentWeekEnd(nextWeekEnd);

      const currentOffset = dayjs(selectedDate)
        .startOf('day')
        .diff(dayjs(currentWeekStart).startOf('day'), 'day');
      const safeOffset = Number.isFinite(currentOffset)
        ? Math.min(6, Math.max(0, currentOffset))
        : 0;
      const nextDate = dayjs(nextWeekStart)
        .add(safeOffset, 'day')
        .format('YYYY-MM-DD');
      setSelectedDate(nextDate);

      const params = new URLSearchParams(window.location.search);
      params.set('weekStart', nextWeekStart);
      params.set('weekEnd', nextWeekEnd);
      params.set('date', nextDate);
      if (selectedEmployeeId) {
        params.set('employeeId', selectedEmployeeId);
      }
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}?${params.toString()}`
      );
    },
    [currentWeekStart, selectedDate, selectedEmployeeId]
  );

  const handleUpdateStatus = async (
    job: DispatchJob,
    status: DispatchJob['status']
  ) => {
    setSavingJobId(job.id);
    try {
      if (!navigator.onLine) {
        setIsOnline(false);
        applyLocalJobStatus(job.id, status);
        enqueueDispatchOfflineAction({
          type: 'update_job_status',
          payload: {
            jobId: job.id,
            status,
          },
        });
        refreshQueueCount();
        message.warning(
          t('sparkery.dispatch.employeeTasks.messages.offlineStatusQueued')
        );
        return;
      }

      const updated = await sparkeryDispatchService.updateJobStatus(
        job.id,
        status
      );
      setJobs(prev =>
        prev.map(item => (item.id === updated.id ? updated : item))
      );
      message.success(
        t('sparkery.dispatch.employeeTasks.messages.statusUpdated', {
          status: statusLabels[status],
        })
      );
    } catch (error) {
      if (isLikelyNetworkError(error)) {
        applyLocalJobStatus(job.id, status);
        enqueueDispatchOfflineAction({
          type: 'update_job_status',
          payload: {
            jobId: job.id,
            status,
          },
        });
        refreshQueueCount();
        message.warning(
          t('sparkery.dispatch.employeeTasks.messages.networkStatusQueued')
        );
        return;
      }
      if (error instanceof Error && error.message) {
        message.error(error.message);
        return;
      }
      message.error(
        t('sparkery.dispatch.employeeTasks.messages.statusUpdateFailed')
      );
    } finally {
      setSavingJobId(null);
    }
  };

  const handleReportLocation = async () => {
    if (!selectedEmployeeId) return;
    if (!navigator.geolocation) {
      message.error(
        t('sparkery.dispatch.employeeTasks.messages.geolocationUnsupported')
      );
      return;
    }
    let capturedLocationPayload: {
      lat: number;
      lng: number;
      accuracyM: number;
      source: 'mobile';
      label: string;
      updatedAt: string;
    } | null = null;
    setReportingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 12000,
          })
      );
      capturedLocationPayload = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracyM: position.coords.accuracy,
        source: 'mobile' as const,
        label: 'employee-task-page',
        updatedAt: new Date().toISOString(),
      };

      if (!navigator.onLine) {
        setIsOnline(false);
        applyLocalLocation(selectedEmployeeId, capturedLocationPayload);
        enqueueDispatchOfflineAction({
          type: 'report_location',
          payload: {
            employeeId: selectedEmployeeId,
            location: capturedLocationPayload,
          },
        });
        refreshQueueCount();
        message.warning(
          t('sparkery.dispatch.employeeTasks.messages.offlineLocationQueued')
        );
        return;
      }

      const location = await sparkeryDispatchService.reportEmployeeLocation(
        selectedEmployeeId,
        capturedLocationPayload
      );
      applyLocalLocation(selectedEmployeeId, location);
      message.success(
        t('sparkery.dispatch.employeeTasks.messages.locationReported')
      );
    } catch (error) {
      if (isLikelyNetworkError(error) && capturedLocationPayload) {
        applyLocalLocation(selectedEmployeeId, capturedLocationPayload);
        enqueueDispatchOfflineAction({
          type: 'report_location',
          payload: {
            employeeId: selectedEmployeeId,
            location: capturedLocationPayload,
          },
        });
        refreshQueueCount();
        message.warning(
          t('sparkery.dispatch.employeeTasks.messages.networkLocationQueued')
        );
        return;
      }
      message.error(
        t('sparkery.dispatch.employeeTasks.messages.locationReportFailed')
      );
    } finally {
      setReportingLocation(false);
    }
  };

  return (
    <div className='dispatch-employee-tasks-page dispatch-employee-tasks-shell'>
      <div className='dispatch-employee-tasks-container'>
        <Card className='dispatch-employee-tasks-header-card'>
          <Space
            direction='vertical'
            size={8}
            className='dispatch-employee-tasks-header-space'
          >
            <Title level={4} className='dispatch-employee-tasks-title'>
              {t('sparkery.dispatch.employeeTasks.title')}
            </Title>
            <Space wrap>
              <Tag className='dispatch-employee-tasks-pill'>
                {t('sparkery.dispatch.employeeTasks.weekRange', {
                  weekStart: currentWeekStart,
                  weekEnd: currentWeekEnd,
                })}
              </Tag>
              <Tag color='blue' className='dispatch-employee-tasks-pill'>
                {selectedEmployee?.name ||
                  t('sparkery.dispatch.employeeTasks.noEmployeeSelected')}
              </Tag>
              <Tag color='green' className='dispatch-employee-tasks-pill'>
                {t('sparkery.dispatch.employeeTasks.jobsCount', {
                  count: employeeJobs.length,
                })}
              </Tag>
              <Tag
                color={isOnline ? 'green' : 'orange'}
                className='dispatch-employee-tasks-network-pill'
              >
                {isOnline
                  ? t('sparkery.dispatch.employeeTasks.online')
                  : t('sparkery.dispatch.employeeTasks.offline')}
              </Tag>
              {queuedActions > 0 && (
                <Tag
                  color='gold'
                  className='dispatch-employee-tasks-queue-pill'
                >
                  {t('sparkery.dispatch.employeeTasks.queuedActions', {
                    count: queuedActions,
                  })}
                </Tag>
              )}
            </Space>
          </Space>
        </Card>

        {error && (
          <Alert
            className='dispatch-employee-tasks-alert'
            type='error'
            showIcon
            message={error}
          />
        )}

        {!isOnline && (
          <Alert
            className='dispatch-employee-tasks-network-alert'
            type='warning'
            showIcon
            message={t('sparkery.dispatch.employeeTasks.offlineHint')}
          />
        )}

        <Card size='small' className='dispatch-employee-tasks-filter-card'>
          <Space wrap className='dispatch-employee-tasks-filter-row'>
            <Button
              icon={<LeftOutlined />}
              onClick={() => handleShiftWeek(-1)}
              disabled={loading}
            >
              {t('sparkery.dispatch.common.previousWeek')}
            </Button>
            <Button
              icon={<RightOutlined />}
              onClick={() => handleShiftWeek(1)}
              disabled={loading}
            >
              {t('sparkery.dispatch.common.nextWeek')}
            </Button>
            <Select
              className='dispatch-employee-tasks-select'
              value={selectedEmployeeId || null}
              onChange={setSelectedEmployeeId}
              placeholder={t('sparkery.dispatch.employeeTasks.selectEmployee')}
              options={employees.map(employee => ({
                value: employee.id,
                label: employee.nameCN
                  ? `${employee.name} / ${employee.nameCN}`
                  : employee.name,
              }))}
            />
            <Select
              className='dispatch-employee-tasks-select'
              value={selectedDate || null}
              onChange={setSelectedDate}
              placeholder={t('sparkery.dispatch.employeeTasks.selectDate')}
              options={dateOptions}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={loadData}
              loading={loading}
            >
              {t('sparkery.dispatch.common.refresh')}
            </Button>
            <Button
              icon={<CloudSyncOutlined />}
              className='dispatch-employee-tasks-sync-btn'
              onClick={() => {
                syncOfflineQueue(false).catch(() => {
                  message.error(
                    t(
                      'sparkery.dispatch.employeeTasks.messages.syncQueueFailed'
                    )
                  );
                });
              }}
              loading={syncingQueue}
              disabled={!isOnline || queuedActions === 0}
            >
              {t('sparkery.dispatch.employeeTasks.syncQueue', {
                count: queuedActions,
              })}
            </Button>
            <Button
              icon={<CompassOutlined />}
              onClick={handleReportLocation}
              loading={reportingLocation}
              disabled={!selectedEmployeeId}
            >
              {t('sparkery.dispatch.employeeTasks.reportLocation')}
            </Button>
          </Space>
        </Card>

        <Card className='dispatch-employee-tasks-list-card' loading={loading}>
          {jobsForDate.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={t('sparkery.dispatch.employeeTasks.noTasksOnDate')}
            />
          ) : (
            <List
              itemLayout='vertical'
              dataSource={jobsForDate}
              renderItem={job => (
                <List.Item
                  className='dispatch-employee-task-item'
                  actions={[
                    <Button
                      key='navigate'
                      size='small'
                      icon={<EnvironmentOutlined />}
                      href={buildNavigationLink(job.customerAddress)}
                      target='_blank'
                      rel='noreferrer'
                      disabled={!job.customerAddress}
                    >
                      {t('sparkery.dispatch.employeeTasks.navigate')}
                    </Button>,
                    <Button
                      key='start'
                      size='small'
                      icon={<PlayCircleOutlined />}
                      disabled={!['pending', 'assigned'].includes(job.status)}
                      loading={savingJobId === job.id}
                      onClick={() => {
                        handleUpdateStatus(job, 'in_progress').catch(() => {
                          // handled in handleUpdateStatus
                        });
                      }}
                    >
                      {t('sparkery.dispatch.employeeTasks.start')}
                    </Button>,
                    <Button
                      key='complete'
                      size='small'
                      type='primary'
                      icon={<CheckCircleOutlined />}
                      disabled={
                        !['pending', 'assigned', 'in_progress'].includes(
                          job.status
                        )
                      }
                      loading={savingJobId === job.id}
                      onClick={() => {
                        handleUpdateStatus(job, 'completed').catch(() => {
                          // handled in handleUpdateStatus
                        });
                      }}
                    >
                      {t('sparkery.dispatch.employeeTasks.complete')}
                    </Button>,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space wrap>
                        <Text strong>{job.title}</Text>
                        <Tag color={statusColor[job.status]}>
                          {statusLabels[job.status]}
                        </Tag>
                        <Tag>
                          {job.scheduledStartTime}-{job.scheduledEndTime}
                        </Tag>
                      </Space>
                    }
                    description={
                      <Space direction='vertical' size={2}>
                        <Text type='secondary'>
                          {job.customerName ||
                            t('sparkery.dispatch.common.customer')}
                        </Text>
                        <Text type='secondary'>
                          {job.customerAddress ||
                            t('sparkery.dispatch.common.noAddress')}
                        </Text>
                        {job.notes && (
                          <Text type='secondary'>
                            {t('sparkery.dispatch.employeeTasks.notesPrefix', {
                              notes: job.notes,
                            })}
                          </Text>
                        )}
                      </Space>
                    }
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      </div>
    </div>
  );
};

export default DispatchEmployeeTasksPage;
