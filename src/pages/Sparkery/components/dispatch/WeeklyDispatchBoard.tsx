import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Modal,
  Popover,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
import { EllipsisOutlined } from '@ant-design/icons';
import type {
  DispatchEmployee,
  DispatchJob,
  DispatchJobStatus,
} from '../../dispatch/types';

const { Text } = Typography;

const START_HOUR = 7;
const END_HOUR = 24;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 26;

const SERVICE_COLORS: Record<DispatchJob['serviceType'], string> = {
  airbnb: '#ff5a5f',
  regular: '#13c2c2',
  commercial: '#91caff',
  bond: '#8b5e3c',
};

const JOB_STATUS_META: Record<
  DispatchJobStatus,
  { label: string; color: string }
> = {
  pending: { label: 'Pending', color: 'default' },
  assigned: { label: 'Assigned', color: 'processing' },
  in_progress: { label: 'In Progress', color: 'blue' },
  completed: { label: 'Completed', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'error' },
};

interface WeeklyDispatchBoardProps {
  jobsByDate: Record<string, DispatchJob[]>;
  employees: DispatchEmployee[];
  weekStart: string;
  onAssign: (jobId: string, employeeIds: string[]) => void;
  onStatusChange: (jobId: string, status: DispatchJobStatus) => void;
  onDelete: (jobId: string) => Promise<void> | void;
  onReschedule: (
    jobId: string,
    scheduledDate: string,
    scheduledStartTime: string,
    scheduledEndTime: string
  ) => void;
  onEdit: (job: DispatchJob) => void;
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

const getTodayDateKey = (): string => formatDateKey(new Date());

const getWeekDates = (weekStart: string): string[] => {
  const start = parseDateKey(weekStart);
  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return formatDateKey(date);
  });
};

const parseTimeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

const getEventPosition = (job: DispatchJob) => {
  const startMinutes = parseTimeToMinutes(job.scheduledStartTime);
  const endMinutes = parseTimeToMinutes(job.scheduledEndTime);
  const timelineStart = START_HOUR * 60;
  const timelineEnd = END_HOUR * 60;
  const clampedStart = Math.max(
    timelineStart,
    Math.min(startMinutes, timelineEnd)
  );
  const clampedEnd = Math.max(
    clampedStart + SLOT_MINUTES,
    Math.min(endMinutes, timelineEnd)
  );
  const topSlots = (clampedStart - timelineStart) / SLOT_MINUTES;
  const heightSlots = (clampedEnd - clampedStart) / SLOT_MINUTES;

  return {
    top: topSlots * SLOT_HEIGHT,
    height: Math.max(24, heightSlots * SLOT_HEIGHT - 4),
  };
};

const formatMinutesToTime = (minutes: number): string => {
  const safeMinutes = Math.max(0, Math.min(24 * 60, minutes));
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const formatDurationHours = (
  startMinutes: number,
  endMinutes: number
): string => {
  const duration = Math.max(0, endMinutes - startMinutes);
  if (duration < 60) {
    return `${duration}m`;
  }
  const hours = duration / 60;
  return Number.isInteger(hours) ? `${hours}h` : `${hours.toFixed(1)}h`;
};

interface PositionedJob {
  job: DispatchJob;
  top: number;
  height: number;
  columnIndex: number;
  totalColumns: number;
}

const buildPositionedJobs = (jobs: DispatchJob[]): PositionedJob[] => {
  const sortedJobs = jobs
    .slice()
    .sort(
      (a, b) =>
        parseTimeToMinutes(a.scheduledStartTime) -
        parseTimeToMinutes(b.scheduledStartTime)
    );

  const activeColumns: number[] = [];
  const items: PositionedJob[] = [];

  sortedJobs.forEach(job => {
    const start = parseTimeToMinutes(job.scheduledStartTime);
    const end = Math.max(
      start + SLOT_MINUTES,
      parseTimeToMinutes(job.scheduledEndTime)
    );

    for (let i = activeColumns.length - 1; i >= 0; i -= 1) {
      const activeColumnEnd = activeColumns[i];
      if (activeColumnEnd !== undefined && activeColumnEnd <= start) {
        activeColumns.splice(i, 1);
      }
    }

    let columnIndex = 0;
    while (activeColumns.includes(columnIndex)) {
      columnIndex += 1;
    }
    activeColumns.push(columnIndex);
    activeColumns.sort((a, b) => a - b);

    const eventPos = getEventPosition(job);
    items.push({
      job,
      top: eventPos.top,
      height: eventPos.height,
      columnIndex,
      totalColumns: Math.max(1, activeColumns.length),
    });
  });

  return items.map(current => {
    const currentStart = parseTimeToMinutes(current.job.scheduledStartTime);
    const currentEnd = Math.max(
      currentStart + SLOT_MINUTES,
      parseTimeToMinutes(current.job.scheduledEndTime)
    );

    let maxOverlapColumns = current.totalColumns;
    items.forEach(other => {
      if (other.job.id === current.job.id) return;
      const otherStart = parseTimeToMinutes(other.job.scheduledStartTime);
      const otherEnd = Math.max(
        otherStart + SLOT_MINUTES,
        parseTimeToMinutes(other.job.scheduledEndTime)
      );
      const overlap = currentStart < otherEnd && otherStart < currentEnd;
      if (overlap) {
        maxOverlapColumns = Math.max(
          maxOverlapColumns,
          current.columnIndex + 1,
          other.columnIndex + 1
        );
      }
    });

    return {
      ...current,
      totalColumns: Math.max(1, maxOverlapColumns),
    };
  });
};

const getHourLabels = (): string[] => {
  const labels: string[] = [];
  for (let hour = START_HOUR; hour <= END_HOUR; hour += 1) {
    labels.push(`${String(hour).padStart(2, '0')}:00`);
  }
  return labels;
};

const getDayHeader = (dateText: string): string => {
  const date = parseDateKey(dateText);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
  const shortDate = date.toLocaleDateString('en-AU', {
    day: '2-digit',
    month: '2-digit',
  });
  return `${weekday} ${shortDate}`;
};

const getGivenName = (fullName: string): string => {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return '';
  }
  const [given] = trimmed.split(/\s+/);
  return given || trimmed;
};

const cssVars = (
  variables: Record<`--${string}`, string | number>
): React.CSSProperties => variables as React.CSSProperties;

const WeeklyDispatchBoard: React.FC<WeeklyDispatchBoardProps> = ({
  jobsByDate,
  employees,
  weekStart,
  onAssign,
  onStatusChange,
  onDelete,
  onReschedule,
  onEdit,
}) => {
  const weekDates = getWeekDates(weekStart);
  const todayDateKey = getTodayDateKey();
  const totalSlots = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES;
  const boardHeight = totalSlots * SLOT_HEIGHT;
  const hourLabels = getHourLabels();
  const [draggingJob, setDraggingJob] = useState<DispatchJob | null>(null);
  const [dropPreview, setDropPreview] = useState<{
    date: string;
    startMinutes: number;
  } | null>(null);
  const [resizingState, setResizingState] = useState<{
    jobId: string;
    date: string;
    startMinutes: number;
    endMinutes: number;
    originY: number;
    originEndMinutes: number;
  } | null>(null);
  const [previewState, setPreviewState] = useState<{
    urls: string[];
    index: number;
  } | null>(null);
  const [optionsOpenJobId, setOptionsOpenJobId] = useState<string | null>(null);

  const positionedByDate = useMemo(() => {
    const result: Record<string, PositionedJob[]> = {};
    weekDates.forEach(date => {
      result[date] = buildPositionedJobs(jobsByDate[date] || []);
    });
    return result;
  }, [jobsByDate, weekDates]);

  const getStartMinutesByMouse = (
    event: React.DragEvent<HTMLDivElement>
  ): number => {
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeY = event.clientY - rect.top;
    const rawSlots = Math.round(relativeY / SLOT_HEIGHT);
    const maxStartSlots = totalSlots - 1;
    const slot = Math.max(0, Math.min(rawSlots, maxStartSlots));
    return START_HOUR * 60 + slot * SLOT_MINUTES;
  };

  useEffect(() => {
    if (!resizingState) return;

    const onMouseMove = (event: MouseEvent) => {
      const deltaY = event.clientY - resizingState.originY;
      const deltaSlots = Math.round(deltaY / SLOT_HEIGHT);
      const nextEndMinutes = Math.max(
        resizingState.startMinutes + SLOT_MINUTES,
        Math.min(
          END_HOUR * 60,
          resizingState.originEndMinutes + deltaSlots * SLOT_MINUTES
        )
      );
      setResizingState(prev =>
        prev
          ? {
              ...prev,
              endMinutes: nextEndMinutes,
            }
          : prev
      );
    };

    const onMouseUp = () => {
      setResizingState(prev => {
        if (prev) {
          onReschedule(
            prev.jobId,
            prev.date,
            formatMinutesToTime(prev.startMinutes),
            formatMinutesToTime(prev.endMinutes)
          );
        }
        return null;
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onReschedule, resizingState]);

  const handleDeleteWithConfirm = (job: DispatchJob) => {
    Modal.confirm({
      title: 'Delete this task?',
      content: 'This cannot be undone.',
      okText: 'Delete',
      okButtonProps: { danger: true },
      cancelText: 'Cancel',
      onOk: async () => {
        await onDelete(job.id);
        setOptionsOpenJobId(null);
      },
    });
  };

  return (
    <Card
      className='dispatch-board-card'
      title='Weekly Dispatch Board (Mon-Sun, 07:00-24:00)'
      size='small'
    >
      <div
        className='dispatch-weekly-grid'
        style={cssVars({
          '--dispatch-weekly-board-height': `${boardHeight}px`,
          '--dispatch-weekly-slot-height': `${SLOT_HEIGHT}px`,
        })}
      >
        <div className='dispatch-weekly-grid-corner' />
        {weekDates.map(date => {
          const isToday = date === todayDateKey;
          return (
            <div
              key={`header-${date}`}
              className={`dispatch-weekly-header-cell${
                isToday ? ' dispatch-weekly-header-cell-today' : ''
              }`}
            >
              {getDayHeader(date)}
              {isToday && (
                <div className='dispatch-weekly-header-today-label'>Today</div>
              )}
            </div>
          );
        })}

        <div className='dispatch-weekly-time-column'>
          {hourLabels.map((label, index) => (
            <div
              key={label}
              className='dispatch-weekly-hour-label'
              style={cssVars({
                '--dispatch-weekly-hour-top': `${index * SLOT_HEIGHT * 2 - 8}px`,
              })}
            >
              {label}
            </div>
          ))}
        </div>

        {weekDates.map(date => {
          const isToday = date === todayDateKey;
          const positionedJobs = positionedByDate[date] || [];

          return (
            <div
              key={`col-${date}`}
              className={`dispatch-weekly-day-column${
                isToday ? ' dispatch-weekly-day-column-today' : ''
              }`}
              onDragOver={event => {
                event.preventDefault();
                if (!draggingJob) return;
                const startMinutes = getStartMinutesByMouse(event);
                setDropPreview({ date, startMinutes });
              }}
              onDrop={event => {
                event.preventDefault();
                if (!draggingJob) return;
                const duration = Math.max(
                  SLOT_MINUTES,
                  parseTimeToMinutes(draggingJob.scheduledEndTime) -
                    parseTimeToMinutes(draggingJob.scheduledStartTime)
                );
                const startMinutes = getStartMinutesByMouse(event);
                const endMinutes = Math.min(
                  END_HOUR * 60,
                  startMinutes + duration
                );
                onReschedule(
                  draggingJob.id,
                  date,
                  formatMinutesToTime(startMinutes),
                  formatMinutesToTime(endMinutes)
                );
                setDraggingJob(null);
                setDropPreview(null);
              }}
            >
              {Array.from({ length: totalSlots + 1 }).map((_, slotIndex) => (
                <div
                  key={`line-${date}-${slotIndex}`}
                  className={`dispatch-weekly-slot-line ${
                    slotIndex % 2 === 0
                      ? 'dispatch-weekly-slot-line-major'
                      : 'dispatch-weekly-slot-line-minor'
                  }`}
                  style={cssVars({
                    '--dispatch-weekly-slot-top': `${slotIndex * SLOT_HEIGHT}px`,
                  })}
                />
              ))}

              {dropPreview && dropPreview.date === date && (
                <div
                  className='dispatch-weekly-drop-preview'
                  style={cssVars({
                    '--dispatch-weekly-drop-top': `${((dropPreview.startMinutes - START_HOUR * 60) / SLOT_MINUTES) * SLOT_HEIGHT}px`,
                    '--dispatch-weekly-drop-height': `${SLOT_HEIGHT * 2 - 4}px`,
                  })}
                />
              )}

              {positionedJobs.map(item => {
                const { job } = item;
                const assignedEmployees = employees.filter(emp =>
                  job.assignedEmployeeIds?.includes(emp.id)
                );
                const color = SERVICE_COLORS[job.serviceType] || '#69c0ff';
                const columnWidthPercent = 100 / item.totalColumns;
                const left = item.columnIndex * columnWidthPercent;
                const isResizing = resizingState?.jobId === job.id;
                const isFinanceLocked = Boolean(
                  job.financeLockedAt || job.financeConfirmedAt
                );
                const startMinutes = parseTimeToMinutes(job.scheduledStartTime);
                const endMinutes = parseTimeToMinutes(job.scheduledEndTime);
                const effectiveEndMinutes = isResizing
                  ? resizingState.endMinutes
                  : endMinutes;
                const effectiveHeight = Math.max(
                  24,
                  ((effectiveEndMinutes - startMinutes) / SLOT_MINUTES) *
                    SLOT_HEIGHT -
                    4
                );
                const liveStartText = formatMinutesToTime(startMinutes);
                const liveEndText = formatMinutesToTime(effectiveEndMinutes);
                const liveDurationText = formatDurationHours(
                  startMinutes,
                  effectiveEndMinutes
                );
                const titleWithSchedule = `${job.title} ${liveStartText}-${liveEndText} (${liveDurationText})`;

                return (
                  <Popover
                    key={job.id}
                    placement='rightTop'
                    content={
                      <div className='dispatch-weekly-popover-content'>
                        <div className='dispatch-weekly-popover-title'>
                          <strong>{job.title}</strong>
                        </div>
                        <div className='dispatch-weekly-popover-row dispatch-weekly-popover-row-tight'>
                          <Text
                            strong
                            className='dispatch-weekly-popover-label'
                          >
                            Time
                          </Text>
                          <Text className='dispatch-weekly-popover-value'>
                            {job.scheduledDate} {job.scheduledStartTime} -{' '}
                            {job.scheduledEndTime}
                          </Text>
                        </div>
                        <div className='dispatch-weekly-popover-row'>
                          <Text
                            strong
                            className='dispatch-weekly-popover-label'
                          >
                            Finance
                          </Text>
                          <div className='dispatch-weekly-popover-finance-values'>
                            <Text
                              type='secondary'
                              className='dispatch-weekly-popover-value'
                            >
                              Base ${Number(job.baseFee || 0).toFixed(2)} | Adj
                              ${Number(job.manualAdjustment || 0).toFixed(2)}
                            </Text>
                            <Text className='dispatch-weekly-popover-total'>
                              Total $
                              {Number(job.receivableTotal || 0).toFixed(2)}
                            </Text>
                          </div>
                        </div>
                        <div className='dispatch-weekly-popover-row'>
                          <Text
                            strong
                            className='dispatch-weekly-popover-label'
                          >
                            Accounting
                          </Text>
                          <Text
                            type='secondary'
                            className='dispatch-weekly-popover-value'
                          >
                            {job.financeConfirmedAt
                              ? `Confirmed ${job.financeConfirmedAt}`
                              : 'Pending confirmation'}
                          </Text>
                        </div>
                        {job.description && (
                          <div className='dispatch-weekly-popover-row'>
                            <Text
                              strong
                              className='dispatch-weekly-popover-label'
                            >
                              Task
                            </Text>
                            <Text className='dispatch-weekly-popover-value'>
                              {job.description}
                            </Text>
                          </div>
                        )}
                        {job.notes && (
                          <div className='dispatch-weekly-popover-row'>
                            <Text
                              strong
                              className='dispatch-weekly-popover-label'
                            >
                              Notes
                            </Text>
                            <Text
                              type='secondary'
                              className='dispatch-weekly-popover-value'
                            >
                              {job.notes}
                            </Text>
                          </div>
                        )}
                        {job.imageUrls && job.imageUrls.length > 0 && (
                          <div className='dispatch-weekly-popover-images'>
                            <Text
                              strong
                              className='dispatch-weekly-popover-label'
                            >
                              Images
                            </Text>
                            <div className='dispatch-weekly-image-grid'>
                              {job.imageUrls.slice(0, 6).map(url => (
                                <img
                                  key={url}
                                  src={url}
                                  alt='job'
                                  onClick={event => {
                                    event.stopPropagation();
                                    setPreviewState({
                                      urls: job.imageUrls || [],
                                      index: (job.imageUrls || []).indexOf(url),
                                    });
                                  }}
                                  className='dispatch-weekly-image-thumb'
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    }
                  >
                    <div
                      className='dispatch-weekly-job-card'
                      draggable={!isResizing && !isFinanceLocked}
                      onDragStart={event => {
                        if (isFinanceLocked) {
                          event.preventDefault();
                          return;
                        }
                        setDraggingJob(job);
                        event.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => {
                        setDraggingJob(null);
                        setDropPreview(null);
                      }}
                      style={cssVars({
                        '--dispatch-weekly-card-left': `calc(${left}% + 4px)`,
                        '--dispatch-weekly-card-width': `calc(${columnWidthPercent}% - 8px)`,
                        '--dispatch-weekly-card-top': `${item.top}px`,
                        '--dispatch-weekly-card-height': `${effectiveHeight}px`,
                        '--dispatch-weekly-card-bg': `${color}22`,
                        '--dispatch-weekly-card-border': color,
                        '--dispatch-weekly-card-z':
                          draggingJob?.id === job.id ? 3 : 2,
                      })}
                    >
                      <div className='dispatch-weekly-job-header'>
                        <Text
                          strong
                          className='dispatch-weekly-job-title'
                          ellipsis={{ tooltip: titleWithSchedule }}
                        >
                          {titleWithSchedule}
                        </Text>
                        <Space size={4}>
                          {isFinanceLocked && (
                            <Tag
                              color='gold'
                              className='dispatch-weekly-tag-compact dispatch-weekly-tag-locked'
                            >
                              Locked
                            </Tag>
                          )}
                          <Tag
                            color='processing'
                            className='dispatch-weekly-tag-compact dispatch-weekly-tag-service'
                          >
                            {job.serviceType}
                          </Tag>
                          <Popover
                            trigger='click'
                            placement='bottomRight'
                            open={optionsOpenJobId === job.id}
                            onOpenChange={nextOpen =>
                              setOptionsOpenJobId(nextOpen ? job.id : null)
                            }
                            content={
                              <div
                                className='dispatch-weekly-options-content'
                                onClick={event => event.stopPropagation()}
                              >
                                <Text
                                  type='secondary'
                                  className='dispatch-weekly-options-label'
                                >
                                  Assignees
                                </Text>
                                <Select
                                  className='dispatch-assignee-select dispatch-weekly-options-select'
                                  classNames={{
                                    popup: {
                                      root: 'dispatch-assignee-select-popup',
                                    },
                                  }}
                                  mode='multiple'
                                  size='small'
                                  value={job.assignedEmployeeIds || []}
                                  placeholder='Select assignees'
                                  disabled={isFinanceLocked}
                                  onChange={value => {
                                    onAssign(job.id, value);
                                    setOptionsOpenJobId(null);
                                  }}
                                  maxTagCount='responsive'
                                  listHeight={360}
                                  dropdownMatchSelectWidth={false}
                                >
                                  {employees.map(emp => (
                                    <Select.Option
                                      key={emp.id}
                                      value={emp.id}
                                      title={emp.name}
                                    >
                                      <span className='dispatch-weekly-assignee-option'>
                                        {emp.name}
                                      </span>
                                    </Select.Option>
                                  ))}
                                </Select>
                                <Text
                                  type='secondary'
                                  className='dispatch-weekly-options-label'
                                >
                                  Status
                                </Text>
                                <Select
                                  className='dispatch-status-select'
                                  classNames={{
                                    popup: {
                                      root: 'dispatch-status-select-popup',
                                    },
                                  }}
                                  size='small'
                                  value={job.status}
                                  disabled={isFinanceLocked}
                                  onChange={value => {
                                    onStatusChange(
                                      job.id,
                                      value as DispatchJobStatus
                                    );
                                    setOptionsOpenJobId(null);
                                  }}
                                >
                                  <Select.Option value='pending'>
                                    Pending
                                  </Select.Option>
                                  <Select.Option value='assigned'>
                                    Assigned
                                  </Select.Option>
                                  <Select.Option value='in_progress'>
                                    In Progress
                                  </Select.Option>
                                  <Select.Option value='completed'>
                                    Completed
                                  </Select.Option>
                                  <Select.Option value='cancelled'>
                                    Cancelled
                                  </Select.Option>
                                </Select>
                                <Space>
                                  <Button
                                    size='small'
                                    className='dispatch-weekly-option-btn'
                                    disabled={isFinanceLocked}
                                    onClick={() => {
                                      setOptionsOpenJobId(null);
                                      onEdit(job);
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size='small'
                                    danger
                                    className='dispatch-weekly-option-btn dispatch-weekly-option-btn-danger'
                                    disabled={isFinanceLocked}
                                    onClick={() => {
                                      handleDeleteWithConfirm(job);
                                    }}
                                  >
                                    Delete
                                  </Button>
                                </Space>
                                {isFinanceLocked && (
                                  <Text
                                    type='secondary'
                                    className='dispatch-weekly-options-note'
                                  >
                                    Finance locked job can only be viewed.
                                  </Text>
                                )}
                              </div>
                            }
                          >
                            <Button
                              className='dispatch-weekly-options-button'
                              size='small'
                              icon={<EllipsisOutlined />}
                              onClick={event => event.stopPropagation()}
                            />
                          </Popover>
                        </Space>
                      </div>
                      {isResizing && (
                        <div className='dispatch-weekly-resize-tip'>
                          {liveStartText} - {liveEndText} ({liveDurationText})
                        </div>
                      )}
                      <Space size={4} className='dispatch-weekly-tag-row' wrap>
                        <Tag
                          color='green'
                          className='dispatch-weekly-tag-compact dispatch-weekly-tag-money'
                        >
                          ${Number(job.receivableTotal || 0).toFixed(2)}
                        </Tag>
                        <Tag
                          color={JOB_STATUS_META[job.status].color}
                          className='dispatch-weekly-tag-compact dispatch-weekly-tag-status'
                        >
                          {JOB_STATUS_META[job.status].label}
                        </Tag>
                        {assignedEmployees.length > 0 ? (
                          <Space
                            size={2}
                            className='dispatch-weekly-assignee-group'
                          >
                            {assignedEmployees.map(emp => (
                              <Tag
                                key={emp.id}
                                className='dispatch-weekly-assignee-tag'
                              >
                                {getGivenName(emp.name)}
                              </Tag>
                            ))}
                          </Space>
                        ) : (
                          <Tag className='dispatch-weekly-tag-compact dispatch-weekly-tag-unassigned'>
                            Unassigned
                          </Tag>
                        )}
                      </Space>
                      <div
                        className='dispatch-weekly-resize-handle'
                        onMouseDown={event => {
                          if (isFinanceLocked) {
                            return;
                          }
                          event.preventDefault();
                          event.stopPropagation();
                          setResizingState({
                            jobId: job.id,
                            date: job.scheduledDate,
                            startMinutes,
                            endMinutes,
                            originY: event.clientY,
                            originEndMinutes: endMinutes,
                          });
                        }}
                      />
                    </div>
                  </Popover>
                );
              })}
            </div>
          );
        })}
      </div>

      <Modal
        open={Boolean(previewState)}
        className='dispatch-weekly-preview-modal'
        title='Task Image Preview'
        footer={
          previewState ? (
            <Space>
              <Button
                onClick={() => {
                  if (!previewState.urls.length) return;
                  setPreviewState({
                    ...previewState,
                    index:
                      (previewState.index - 1 + previewState.urls.length) %
                      previewState.urls.length,
                  });
                }}
              >
                Prev
              </Button>
              <Button
                onClick={() => {
                  if (!previewState.urls.length) return;
                  setPreviewState({
                    ...previewState,
                    index: (previewState.index + 1) % previewState.urls.length,
                  });
                }}
              >
                Next
              </Button>
            </Space>
          ) : null
        }
        onCancel={() => setPreviewState(null)}
        width={760}
      >
        {previewState && previewState.urls[previewState.index] && (
          <img
            src={previewState.urls[previewState.index]}
            alt='preview'
            className='dispatch-weekly-preview-image'
          />
        )}
      </Modal>
    </Card>
  );
};

export default WeeklyDispatchBoard;
