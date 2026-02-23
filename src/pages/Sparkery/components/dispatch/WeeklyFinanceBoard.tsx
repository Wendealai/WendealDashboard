import React from 'react';
import {
  Button,
  Card,
  Checkbox,
  InputNumber,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DispatchEmployee, DispatchJob } from '../../dispatch/types';

const { Text } = Typography;

interface WeeklyFinanceBoardProps {
  jobs: DispatchJob[];
  employees: DispatchEmployee[];
  weekStart: string;
  weekEnd: string;
  title?: string;
  loading?: boolean;
  onApplyAdjustment: (
    jobId: string,
    deltaAmount: number
  ) => Promise<void> | void;
  onConfirmFinance: (jobId: string) => Promise<void> | void;
  onTogglePaymentReceived: (
    jobId: string,
    received: boolean
  ) => Promise<void> | void;
}

type FinanceRow = {
  id: string;
  job: DispatchJob;
};

const toMoney = (value: number | undefined): string =>
  `$${Number(value || 0).toFixed(2)}`;

const WeeklyFinanceBoard: React.FC<WeeklyFinanceBoardProps> = ({
  jobs,
  employees,
  weekStart,
  weekEnd,
  title,
  loading,
  onApplyAdjustment,
  onConfirmFinance,
  onTogglePaymentReceived,
}) => {
  const [adjustmentInput, setAdjustmentInput] = React.useState<
    Record<string, number | null>
  >({});

  const rows = React.useMemo<FinanceRow[]>(
    () =>
      jobs
        .slice()
        .sort((a, b) => {
          const dateCmp = a.scheduledDate.localeCompare(b.scheduledDate);
          if (dateCmp !== 0) return dateCmp;
          return a.scheduledStartTime.localeCompare(b.scheduledStartTime);
        })
        .map(job => ({ id: job.id, job })),
    [jobs]
  );

  const completedRows = rows.filter(row => row.job.status === 'completed');
  const confirmedRows = completedRows.filter(row => row.job.financeConfirmedAt);
  const completedPendingRows = completedRows.filter(
    row => !row.job.financeConfirmedAt
  );

  const allScheduledAmount = rows.reduce(
    (sum, row) => sum + Number(row.job.receivableTotal || 0),
    0
  );
  const completedAmount = completedRows.reduce(
    (sum, row) => sum + Number(row.job.receivableTotal || 0),
    0
  );
  const confirmedAmount = confirmedRows.reduce(
    (sum, row) => sum + Number(row.job.receivableTotal || 0),
    0
  );
  const paidRows = confirmedRows.filter(row =>
    Boolean(row.job.paymentReceivedAt)
  );
  const paidAmount = paidRows.reduce(
    (sum, row) => sum + Number(row.job.receivableTotal || 0),
    0
  );

  const columns: ColumnsType<FinanceRow> = [
    {
      title: 'Date/Time',
      key: 'dateTime',
      width: 140,
      render: (_, row) => (
        <Space direction='vertical' size={0}>
          <Text>{row.job.scheduledDate}</Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {row.job.scheduledStartTime} - {row.job.scheduledEndTime}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Task',
      key: 'task',
      render: (_, row) => (
        <Space direction='vertical' size={2}>
          <Text strong>{row.job.title}</Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {row.job.customerName || row.job.customerAddress || 'No customer'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Assignee',
      key: 'assignee',
      width: 140,
      render: (_, row) => {
        const assigned = employees.filter(employee =>
          row.job.assignedEmployeeIds?.includes(employee.id)
        );
        if (assigned.length === 0) {
          return <Text type='secondary'>Unassigned</Text>;
        }
        return (
          <Space direction='vertical' size={2}>
            {assigned.map(employee => (
              <Text key={employee.id}>{employee.name}</Text>
            ))}
          </Space>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_, row) => (
        <Tag color={row.job.status === 'completed' ? 'green' : 'default'}>
          {row.job.status}
        </Tag>
      ),
    },
    {
      title: 'Base',
      key: 'baseFee',
      width: 92,
      render: (_, row) => <Text>{toMoney(row.job.baseFee)}</Text>,
    },
    {
      title: 'Adjustment',
      key: 'adjustment',
      width: 110,
      render: (_, row) => {
        const value = Number(row.job.manualAdjustment || 0);
        return (
          <Text type={value >= 0 ? 'success' : 'danger'}>
            {value >= 0 ? '+' : ''}
            {toMoney(value)}
          </Text>
        );
      },
    },
    {
      title: 'Receivable',
      key: 'receivable',
      width: 108,
      render: (_, row) => (
        <Text strong>{toMoney(row.job.receivableTotal)}</Text>
      ),
    },
    {
      title: 'Finance',
      key: 'finance',
      width: 150,
      render: (_, row) => {
        if (row.job.financeConfirmedAt) {
          return (
            <Space direction='vertical' size={2}>
              <Tag color='gold'>Locked</Tag>
              <Text type='secondary' style={{ fontSize: 11 }}>
                {row.job.financeConfirmedAt.slice(0, 10)}
              </Text>
            </Space>
          );
        }
        if (row.job.status === 'completed') {
          return <Tag color='orange'>Pending Confirm</Tag>;
        }
        return <Tag>Not Completed</Tag>;
      },
    },
    {
      title: 'Payment',
      key: 'payment',
      width: 150,
      render: (_, row) => {
        const paymentChecked = Boolean(row.job.paymentReceivedAt);
        const canTrackPayment = Boolean(
          row.job.financeLockedAt || row.job.financeConfirmedAt
        );
        return (
          <Space direction='vertical' size={2}>
            <Checkbox
              checked={paymentChecked}
              disabled={!canTrackPayment}
              onChange={async event => {
                await onTogglePaymentReceived(row.id, event.target.checked);
              }}
            >
              {'\u5df2\u6536\u6b3e'}
            </Checkbox>
            {paymentChecked && row.job.paymentReceivedAt && (
              <Text type='secondary' style={{ fontSize: 11 }}>
                {row.job.paymentReceivedAt.slice(0, 10)}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 260,
      render: (_, row) => {
        const isLocked = Boolean(
          row.job.financeLockedAt || row.job.financeConfirmedAt
        );
        const pendingAmount = adjustmentInput[row.id];
        const deltaAmount =
          typeof pendingAmount === 'number' && Number.isFinite(pendingAmount)
            ? Number(pendingAmount.toFixed(2))
            : 0;

        return (
          <Space wrap>
            <InputNumber
              size='small'
              style={{ width: 100 }}
              precision={2}
              disabled={isLocked}
              placeholder='+/-'
              value={pendingAmount ?? null}
              onChange={value =>
                setAdjustmentInput(prev => ({
                  ...prev,
                  [row.id]: typeof value === 'number' ? value : null,
                }))
              }
            />
            <Button
              size='small'
              disabled={isLocked || deltaAmount === 0}
              onClick={async () => {
                await onApplyAdjustment(row.id, deltaAmount);
                setAdjustmentInput(prev => ({
                  ...prev,
                  [row.id]: null,
                }));
              }}
            >
              Apply Adj
            </Button>
            <Button
              size='small'
              type='primary'
              disabled={isLocked || row.job.status !== 'completed'}
              onClick={async () => {
                await onConfirmFinance(row.id);
              }}
            >
              Confirm
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <Card
      size='small'
      title={title || `Weekly Finance (${weekStart} to ${weekEnd})`}
      extra={
        <Space size={16}>
          <Text>
            Scheduled: <Text strong>{toMoney(allScheduledAmount)}</Text>
          </Text>
          <Text>
            Completed: <Text strong>{toMoney(completedAmount)}</Text>
          </Text>
          <Text>
            Confirmed: <Text strong>{toMoney(confirmedAmount)}</Text>
          </Text>
          <Text>
            Paid: <Text strong>{toMoney(paidAmount)}</Text>
          </Text>
        </Space>
      }
    >
      <Space size={16} style={{ marginBottom: 10 }}>
        <Tag color='blue'>All Jobs: {rows.length}</Tag>
        <Tag color='green'>Completed: {completedRows.length}</Tag>
        <Tag color='orange'>Pending Finance: {completedPendingRows.length}</Tag>
        <Tag color='gold'>Confirmed/Locked: {confirmedRows.length}</Tag>
        <Tag color='cyan'>Paid: {paidRows.length}</Tag>
      </Space>

      <Table<FinanceRow>
        rowKey='id'
        size='small'
        pagination={false}
        loading={Boolean(loading)}
        columns={columns}
        dataSource={rows}
        scroll={{ x: 1450 }}
      />
    </Card>
  );
};

export default WeeklyFinanceBoard;
