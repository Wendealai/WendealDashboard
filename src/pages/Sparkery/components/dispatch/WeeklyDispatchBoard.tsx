import React, { useEffect, useMemo, useState } from 'react';
import {
  Button,
  Card,
  Modal,
  Popconfirm,
  Popover,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd';
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

  return (
    <Card title='Weekly Dispatch Board (Mon-Sun, 07:00-24:00)' size='small'>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '72px repeat(7, minmax(140px, 1fr))',
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          overflowX: 'auto',
        }}
      >
        <div
          style={{ borderRight: '1px solid #f0f0f0', background: '#fafafa' }}
        />
        {weekDates.map(date => {
          const isToday = date === todayDateKey;
          return (
            <div
              key={`header-${date}`}
              style={{
                padding: '8px 6px',
                textAlign: 'center',
                borderRight: '1px solid #f0f0f0',
                borderBottom: '1px solid #f0f0f0',
                background: isToday ? '#fff7e6' : '#fafafa',
                color: isToday ? '#ad6800' : undefined,
                boxShadow: isToday ? 'inset 0 -2px 0 #fa8c16' : undefined,
                fontWeight: 600,
                minWidth: 140,
              }}
            >
              {getDayHeader(date)}
              {isToday && (
                <div style={{ fontSize: 10, marginTop: 2, fontWeight: 600 }}>
                  Today
                </div>
              )}
            </div>
          );
        })}

        <div
          style={{
            height: boardHeight,
            borderRight: '1px solid #f0f0f0',
            position: 'relative',
            background: '#fcfcfc',
          }}
        >
          {hourLabels.map((label, index) => (
            <div
              key={label}
              style={{
                position: 'absolute',
                top: index * SLOT_HEIGHT * 2 - 8,
                right: 6,
                fontSize: 11,
                color: '#8c8c8c',
              }}
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
              style={{
                height: boardHeight,
                position: 'relative',
                borderRight: '1px solid #f0f0f0',
                background: isToday ? '#fffdf5' : '#fff',
                minWidth: 140,
              }}
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
                  style={{
                    position: 'absolute',
                    top: slotIndex * SLOT_HEIGHT,
                    left: 0,
                    right: 0,
                    borderTop:
                      slotIndex % 2 === 0
                        ? '1px solid rgba(0,0,0,0.08)'
                        : '1px dashed rgba(0,0,0,0.05)',
                  }}
                />
              ))}

              {dropPreview && dropPreview.date === date && (
                <div
                  style={{
                    position: 'absolute',
                    left: 4,
                    right: 4,
                    top:
                      ((dropPreview.startMinutes - START_HOUR * 60) /
                        SLOT_MINUTES) *
                      SLOT_HEIGHT,
                    height: SLOT_HEIGHT * 2 - 4,
                    background: 'rgba(24, 144, 255, 0.15)',
                    border: '1px dashed #1890ff',
                    borderRadius: 6,
                    pointerEvents: 'none',
                    zIndex: 1,
                  }}
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
                      <div style={{ maxWidth: 320 }}>
                        <div style={{ marginBottom: 6 }}>
                          <strong>{job.title}</strong>
                        </div>
                        <div>
                          <strong>Time:</strong> {job.scheduledDate}{' '}
                          {job.scheduledStartTime} - {job.scheduledEndTime}
                        </div>
                        {job.description && (
                          <div style={{ marginTop: 6 }}>
                            <strong>Task:</strong> {job.description}
                          </div>
                        )}
                        {job.notes && (
                          <div style={{ marginTop: 6 }}>
                            <strong>Notes:</strong> {job.notes}
                          </div>
                        )}
                        {job.imageUrls && job.imageUrls.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <strong>Images:</strong>
                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: 4,
                                marginTop: 4,
                              }}
                            >
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
                                  style={{
                                    width: '100%',
                                    height: 56,
                                    objectFit: 'cover',
                                    cursor: 'zoom-in',
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    }
                  >
                    <div
                      draggable={!isResizing}
                      onDragStart={event => {
                        setDraggingJob(job);
                        event.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => {
                        setDraggingJob(null);
                        setDropPreview(null);
                      }}
                      style={{
                        position: 'absolute',
                        left: `calc(${left}% + 4px)`,
                        width: `calc(${columnWidthPercent}% - 8px)`,
                        top: item.top,
                        height: effectiveHeight,
                        background: `${color}22`,
                        borderLeft: `4px solid ${color}`,
                        borderRadius: 6,
                        padding: '4px 6px',
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                        zIndex: draggingJob?.id === job.id ? 3 : 2,
                        cursor: 'grab',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          gap: 6,
                        }}
                      >
                        <Text
                          strong
                          style={{ fontSize: 10, lineHeight: '14px' }}
                          ellipsis={{ tooltip: titleWithSchedule }}
                        >
                          {titleWithSchedule}
                        </Text>
                        <Space size={4}>
                          <Tag
                            color='processing'
                            style={{
                              marginInlineEnd: 0,
                              fontSize: 10,
                              lineHeight: '16px',
                              padding: '0 4px',
                            }}
                          >
                            {job.serviceType}
                          </Tag>
                          <Button
                            size='small'
                            onClick={event => {
                              event.stopPropagation();
                              onEdit(job);
                            }}
                            style={{ padding: '0 8px', height: 22 }}
                          >
                            Edit
                          </Button>
                          <Popconfirm
                            title='Delete this task?'
                            description='This cannot be undone.'
                            okText='Delete'
                            cancelText='Cancel'
                            onConfirm={async event => {
                              event?.stopPropagation?.();
                              await onDelete(job.id);
                            }}
                          >
                            <Button
                              size='small'
                              danger
                              onClick={event => event.stopPropagation()}
                              style={{ padding: '0 8px', height: 22 }}
                            >
                              Delete
                            </Button>
                          </Popconfirm>
                        </Space>
                      </div>
                      {isResizing && (
                        <div
                          style={{
                            position: 'absolute',
                            top: -26,
                            left: 8,
                            background: '#262626',
                            color: '#fff',
                            borderRadius: 4,
                            padding: '2px 6px',
                            fontSize: 11,
                            lineHeight: '16px',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                          }}
                        >
                          {liveStartText} - {liveEndText} ({liveDurationText})
                        </div>
                      )}
                      <Space
                        size={4}
                        style={{ width: '100%', marginTop: 2 }}
                        wrap
                      >
                        <Space size={4} style={{ fontSize: 10 }}>
                          <Text type='secondary' style={{ fontSize: 10 }}>
                            执行人:
                          </Text>
                          {assignedEmployees.length > 0 ? (
                            <Space size={2}>
                              {assignedEmployees.map(emp => (
                                <Tag
                                  key={emp.id}
                                  color='blue'
                                  style={{
                                    marginInlineEnd: 0,
                                    fontSize: 10,
                                    padding: '0 4px',
                                    lineHeight: '16px',
                                  }}
                                >
                                  {emp.name
                                    .split(' ')
                                    .map(word => word[0])
                                    .join('')
                                    .toUpperCase()}
                                </Tag>
                              ))}
                            </Space>
                          ) : (
                            <Text type='secondary' style={{ fontSize: 10 }}>
                              未分配
                            </Text>
                          )}
                          <Select
                            mode='multiple'
                            size='small'
                            className='dispatch-assignee-select'
                            popupClassName='dispatch-assignee-select-popup'
                            style={{
                              width: 152,
                              fontSize: 10,
                            }}
                            value={job.assignedEmployeeIds || []}
                            placeholder='Select'
                            onChange={value => {
                              onAssign(job.id, value);
                            }}
                            maxTagCount={1}
                            maxTagTextLength={5}
                            listHeight={180}
                            dropdownStyle={{
                              minWidth: 200,
                            }}
                          >
                            {employees.map(emp => (
                              <Select.Option key={emp.id} value={emp.id}>
                                <span
                                  style={{
                                    display: 'block',
                                    fontSize: 10,
                                    lineHeight: '15px',
                                  }}
                                >
                                  {emp.name}
                                </span>
                              </Select.Option>
                            ))}
                          </Select>
                        </Space>
                        <Select
                          size='small'
                          style={{ minWidth: 92, fontSize: 10 }}
                          value={job.status}
                          onChange={value =>
                            onStatusChange(job.id, value as DispatchJobStatus)
                          }
                        >
                          <Select.Option value='pending'>Pending</Select.Option>
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
                      </Space>
                      <div
                        onMouseDown={event => {
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
                        style={{
                          position: 'absolute',
                          left: 0,
                          right: 0,
                          bottom: 0,
                          height: 8,
                          cursor: 'ns-resize',
                          background: 'transparent',
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
            style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain' }}
          />
        )}
      </Modal>
    </Card>
  );
};

export default WeeklyDispatchBoard;
