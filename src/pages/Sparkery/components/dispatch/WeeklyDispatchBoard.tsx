import React from 'react';
import { Button, Card, Col, Row, Select, Space, Tag, Typography } from 'antd';
import type {
  DispatchEmployee,
  DispatchJob,
  DispatchJobStatus,
} from '../../dispatch/types';

const { Text } = Typography;

interface WeeklyDispatchBoardProps {
  jobsByDate: Record<string, DispatchJob[]>;
  employees: DispatchEmployee[];
  weekStart: string;
  onAssign: (jobId: string, employeeId: string) => void;
  onStatusChange: (jobId: string, status: DispatchJobStatus) => void;
}

const getWeekDates = (weekStart: string): string[] => {
  const start = new Date(weekStart);
  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date.toISOString().slice(0, 10);
  });
};

const WeeklyDispatchBoard: React.FC<WeeklyDispatchBoardProps> = ({
  jobsByDate,
  employees,
  weekStart,
  onAssign,
  onStatusChange,
}) => {
  const weekDates = getWeekDates(weekStart);

  return (
    <Row gutter={12} wrap>
      {weekDates.map(date => {
        const jobs = jobsByDate[date] || [];
        return (
          <Col span={24} key={date}>
            <Card title={date} size='small' style={{ marginBottom: 12 }}>
              {jobs.length === 0 ? (
                <Text type='secondary'>No jobs</Text>
              ) : (
                <Space direction='vertical' style={{ width: '100%' }}>
                  {jobs.map(job => {
                    const assignedEmployee = employees.find(
                      emp => emp.id === job.assignedEmployeeId
                    );
                    return (
                      <Card key={job.id} size='small'>
                        <Space direction='vertical' style={{ width: '100%' }}>
                          <Space
                            style={{
                              justifyContent: 'space-between',
                              width: '100%',
                            }}
                          >
                            <Text strong>{job.title}</Text>
                            <Tag color='blue'>{job.serviceType}</Tag>
                          </Space>
                          <Text type='secondary'>
                            {job.scheduledStartTime} - {job.scheduledEndTime}
                          </Text>
                          <Space>
                            <Text>Staff:</Text>
                            <Select
                              style={{ width: 180 }}
                              value={job.assignedEmployeeId || undefined}
                              placeholder='Assign employee'
                              onChange={value => {
                                if (value) {
                                  onAssign(job.id, value);
                                }
                              }}
                              allowClear
                            >
                              {employees.map(emp => (
                                <Select.Option key={emp.id} value={emp.id}>
                                  {emp.name}
                                </Select.Option>
                              ))}
                            </Select>
                            {assignedEmployee && (
                              <Tag>{assignedEmployee.name}</Tag>
                            )}
                          </Space>
                          <Space>
                            <Tag>{job.status}</Tag>
                            <Button
                              size='small'
                              onClick={() =>
                                onStatusChange(job.id, 'in_progress')
                              }
                            >
                              Start
                            </Button>
                            <Button
                              size='small'
                              onClick={() =>
                                onStatusChange(job.id, 'completed')
                              }
                            >
                              Complete
                            </Button>
                            <Button
                              size='small'
                              danger
                              onClick={() =>
                                onStatusChange(job.id, 'cancelled')
                              }
                            >
                              Cancel
                            </Button>
                          </Space>
                        </Space>
                      </Card>
                    );
                  })}
                </Space>
              )}
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};

export default WeeklyDispatchBoard;
