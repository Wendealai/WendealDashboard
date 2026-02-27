import React from 'react';
import {
  Button,
  Card,
  Checkbox,
  InputNumber,
  Space,
  Tag,
  Typography,
  type TableColumnsType,
} from 'antd';
import { useTranslation } from 'react-i18next';
import type { DispatchEmployee, DispatchJob } from '../../dispatch/types';
import SparkeryDataTable from '@/components/sparkery/SparkeryDataTable';

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

const getStatusTagColor = (status: DispatchJob['status']): string => {
  switch (status) {
    case 'completed':
      return 'green';
    case 'in_progress':
      return 'processing';
    case 'assigned':
      return 'blue';
    case 'cancelled':
      return 'red';
    default:
      return 'default';
  }
};

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
  const { t } = useTranslation();
  const [adjustmentInput, setAdjustmentInput] = React.useState<
    Record<string, number | null>
  >({});

  const statusLabels: Record<DispatchJob['status'], string> = {
    pending: t('sparkery.dispatch.status.pending'),
    assigned: t('sparkery.dispatch.status.assigned'),
    in_progress: t('sparkery.dispatch.status.inProgress'),
    completed: t('sparkery.dispatch.status.completed'),
    cancelled: t('sparkery.dispatch.status.cancelled'),
  };

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

  const columns: TableColumnsType<FinanceRow> = [
    {
      title: t('sparkery.dispatch.financeBoard.columns.dateTime'),
      key: 'dateTime',
      width: 140,
      render: (_, row) => (
        <Space
          direction='vertical'
          size={0}
          className='dispatch-finance-date-block'
        >
          <Text className='dispatch-finance-date-primary'>
            {row.job.scheduledDate}
          </Text>
          <Text type='secondary' className='dispatch-finance-muted-text'>
            {row.job.scheduledStartTime} - {row.job.scheduledEndTime}
          </Text>
        </Space>
      ),
    },
    {
      title: t('sparkery.dispatch.financeBoard.columns.task'),
      key: 'task',
      render: (_, row) => (
        <Space
          direction='vertical'
          size={2}
          className='dispatch-finance-task-block'
        >
          <Text strong className='dispatch-finance-task-title'>
            {row.job.title}
          </Text>
          <Text type='secondary' className='dispatch-finance-muted-text'>
            {row.job.customerName ||
              row.job.customerAddress ||
              t('sparkery.dispatch.common.noCustomer')}
          </Text>
        </Space>
      ),
    },
    {
      title: t('sparkery.dispatch.financeBoard.columns.assignee'),
      key: 'assignee',
      width: 140,
      render: (_, row) => {
        const assigned = employees.filter(employee =>
          row.job.assignedEmployeeIds?.includes(employee.id)
        );
        if (assigned.length === 0) {
          return (
            <Text type='secondary' className='dispatch-finance-muted-text'>
              {t('sparkery.dispatch.common.unassigned')}
            </Text>
          );
        }
        return (
          <Space size={[4, 4]} wrap>
            {assigned.map(employee => (
              <Tag key={employee.id} className='dispatch-assignee-name-tag'>
                {employee.name}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: t('sparkery.dispatch.financeBoard.columns.status'),
      key: 'status',
      width: 120,
      render: (_, row) => (
        <Tag
          color={getStatusTagColor(row.job.status)}
          className='dispatch-finance-status-tag'
        >
          {statusLabels[row.job.status]}
        </Tag>
      ),
    },
    {
      title: t('sparkery.dispatch.financeBoard.columns.base'),
      key: 'baseFee',
      width: 92,
      render: (_, row) => (
        <Text className='dispatch-finance-money-base'>
          {toMoney(row.job.baseFee)}
        </Text>
      ),
    },
    {
      title: t('sparkery.dispatch.financeBoard.columns.adjustment'),
      key: 'adjustment',
      width: 110,
      render: (_, row) => {
        const value = Number(row.job.manualAdjustment || 0);
        return (
          <Text
            className={
              value >= 0
                ? 'dispatch-finance-adjust-text dispatch-finance-adjust-text-positive'
                : 'dispatch-finance-adjust-text dispatch-finance-adjust-text-negative'
            }
          >
            {value >= 0 ? '+' : ''}
            {toMoney(value)}
          </Text>
        );
      },
    },
    {
      title: t('sparkery.dispatch.financeBoard.columns.receivable'),
      key: 'receivable',
      width: 108,
      render: (_, row) => (
        <Text strong className='dispatch-finance-money-receivable'>
          {toMoney(row.job.receivableTotal)}
        </Text>
      ),
    },
    {
      title: t('sparkery.dispatch.financeBoard.columns.finance'),
      key: 'finance',
      width: 150,
      render: (_, row) => {
        if (row.job.financeConfirmedAt) {
          return (
            <Space direction='vertical' size={2}>
              <Tag color='gold' className='dispatch-finance-lock-tag'>
                {t('sparkery.dispatch.financeBoard.locked')}
              </Tag>
              <Text type='secondary' className='dispatch-finance-date-text'>
                {row.job.financeConfirmedAt.slice(0, 10)}
              </Text>
            </Space>
          );
        }
        if (row.job.status === 'completed') {
          return (
            <Tag color='orange' className='dispatch-finance-pending-tag'>
              {t('sparkery.dispatch.financeBoard.pendingConfirm')}
            </Tag>
          );
        }
        return (
          <Tag className='dispatch-finance-not-completed-tag'>
            {t('sparkery.dispatch.financeBoard.notCompleted')}
          </Tag>
        );
      },
    },
    {
      title: t('sparkery.dispatch.financeBoard.columns.payment'),
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
              className='dispatch-finance-payment-check'
              checked={paymentChecked}
              disabled={!canTrackPayment}
              onChange={async event => {
                await onTogglePaymentReceived(row.id, event.target.checked);
              }}
            >
              {t('sparkery.dispatch.financeBoard.paymentReceived')}
            </Checkbox>
            {paymentChecked && row.job.paymentReceivedAt && (
              <Text type='secondary' className='dispatch-finance-date-text'>
                {row.job.paymentReceivedAt.slice(0, 10)}
              </Text>
            )}
          </Space>
        );
      },
    },
    {
      title: t('sparkery.dispatch.financeBoard.columns.actions'),
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
          <Space wrap className='dispatch-finance-action-row'>
            <InputNumber
              size='small'
              className='dispatch-finance-adjust-input'
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
              className='dispatch-finance-action-btn dispatch-finance-action-apply'
              disabled={isLocked || deltaAmount === 0}
              onClick={async () => {
                await onApplyAdjustment(row.id, deltaAmount);
                setAdjustmentInput(prev => ({
                  ...prev,
                  [row.id]: null,
                }));
              }}
            >
              {t('sparkery.dispatch.financeBoard.applyAdjustment')}
            </Button>
            <Button
              size='small'
              type='primary'
              className='dispatch-finance-action-btn dispatch-finance-action-confirm'
              disabled={isLocked || row.job.status !== 'completed'}
              onClick={async () => {
                await onConfirmFinance(row.id);
              }}
            >
              {t('sparkery.dispatch.financeBoard.confirm')}
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <Card
      className='dispatch-finance-board-card'
      size='small'
      title={
        title ||
        t('sparkery.dispatch.financeBoard.weeklyTitle', {
          weekStart,
          weekEnd,
        })
      }
      extra={
        <Space size={[16, 6]} wrap className='dispatch-finance-extra-metrics'>
          <Text className='dispatch-finance-extra-metric'>
            {t('sparkery.dispatch.financeBoard.metrics.scheduled')}:{' '}
            <Text strong className='dispatch-finance-extra-metric-value'>
              {toMoney(allScheduledAmount)}
            </Text>
          </Text>
          <Text className='dispatch-finance-extra-metric'>
            {t('sparkery.dispatch.financeBoard.metrics.completed')}:{' '}
            <Text strong className='dispatch-finance-extra-metric-value'>
              {toMoney(completedAmount)}
            </Text>
          </Text>
          <Text className='dispatch-finance-extra-metric'>
            {t('sparkery.dispatch.financeBoard.metrics.confirmed')}:{' '}
            <Text strong className='dispatch-finance-extra-metric-value'>
              {toMoney(confirmedAmount)}
            </Text>
          </Text>
          <Text className='dispatch-finance-extra-metric'>
            {t('sparkery.dispatch.financeBoard.metrics.paid')}:{' '}
            <Text strong className='dispatch-finance-extra-metric-value'>
              {toMoney(paidAmount)}
            </Text>
          </Text>
        </Space>
      }
    >
      <Space className='dispatch-finance-summary-tags' size={16} wrap>
        <Tag className='dispatch-finance-pill dispatch-finance-pill-all'>
          {t('sparkery.dispatch.financeBoard.tags.allJobs', {
            count: rows.length,
          })}
        </Tag>
        <Tag className='dispatch-finance-pill dispatch-finance-pill-completed'>
          {t('sparkery.dispatch.financeBoard.tags.completed', {
            count: completedRows.length,
          })}
        </Tag>
        <Tag className='dispatch-finance-pill dispatch-finance-pill-pending'>
          {t('sparkery.dispatch.financeBoard.tags.pendingFinance', {
            count: completedPendingRows.length,
          })}
        </Tag>
        <Tag className='dispatch-finance-pill dispatch-finance-pill-confirmed'>
          {t('sparkery.dispatch.financeBoard.tags.confirmedLocked', {
            count: confirmedRows.length,
          })}
        </Tag>
        <Tag className='dispatch-finance-pill dispatch-finance-pill-paid'>
          {t('sparkery.dispatch.financeBoard.tags.paid', {
            count: paidRows.length,
          })}
        </Tag>
      </Space>

      <SparkeryDataTable<FinanceRow>
        tableId='dispatch-weekly-finance-board'
        className='dispatch-finance-table'
        rowKey='id'
        size='small'
        pagination={false}
        loading={Boolean(loading)}
        showSortBuilder
        columns={columns}
        dataSource={rows}
        scroll={{ x: 1450 }}
      />
    </Card>
  );
};

export default WeeklyFinanceBoard;
