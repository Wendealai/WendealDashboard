import React from 'react';
import {
  Button,
  Card,
  Empty,
  Space,
  Tag,
  Typography,
  message,
  type TableColumnsType,
} from 'antd';
import { CopyOutlined, DollarOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';
import type { DispatchJob } from '../../dispatch/types';
import SparkeryDataTable from '@/components/sparkery/SparkeryDataTable';

const { Text } = Typography;

type AgingBucket = '0-30' | '31-60' | '60+';

interface AgingRow {
  id: string;
  job: DispatchJob;
  ageDays: number;
  bucket: AgingBucket;
}

interface AgingSummary {
  totalAmount: number;
  totalCount: number;
  bucket0_30Amount: number;
  bucket0_30Count: number;
  bucket31_60Amount: number;
  bucket31_60Count: number;
  bucket60Amount: number;
  bucket60Count: number;
}

interface FinanceAgingBoardProps {
  jobs: DispatchJob[];
  loading?: boolean;
  onMarkPaid: (jobId: string) => Promise<void> | void;
}

const toMoney = (value: number): string => `$${Number(value || 0).toFixed(2)}`;

const resolveBucket = (ageDays: number): AgingBucket => {
  if (ageDays <= 30) return '0-30';
  if (ageDays <= 60) return '31-60';
  return '60+';
};

const FinanceAgingBoard: React.FC<FinanceAgingBoardProps> = ({
  jobs,
  loading,
  onMarkPaid,
}) => {
  const { t } = useTranslation();

  const getPriorityMeta = React.useCallback(
    (bucket: AgingBucket): { label: string; color: string; action: string } => {
      if (bucket === '60+') {
        return {
          label: t('sparkery.dispatch.aging.priority.high'),
          color: 'red',
          action: t('sparkery.dispatch.aging.suggestedAction.high'),
        };
      }
      if (bucket === '31-60') {
        return {
          label: t('sparkery.dispatch.aging.priority.medium'),
          color: 'orange',
          action: t('sparkery.dispatch.aging.suggestedAction.medium'),
        };
      }
      return {
        label: t('sparkery.dispatch.aging.priority.low'),
        color: 'blue',
        action: t('sparkery.dispatch.aging.suggestedAction.low'),
      };
    },
    [t]
  );

  const buildReminderTemplate = React.useCallback(
    (row: AgingRow): string => {
      const job = row.job;
      const customer =
        job.customerName || t('sparkery.dispatch.common.customer');
      const receivable = Number(job.receivableTotal || 0);
      const confirmedDate = job.financeConfirmedAt
        ? dayjs(job.financeConfirmedAt).format('YYYY-MM-DD')
        : 'N/A';
      return [
        t('sparkery.dispatch.aging.reminder.hi', { customer }),
        t('sparkery.dispatch.aging.reminder.line1', { task: job.title }),
        t('sparkery.dispatch.aging.reminder.line2', {
          amount: toMoney(receivable),
        }),
        t('sparkery.dispatch.aging.reminder.line3', { date: confirmedDate }),
        t('sparkery.dispatch.aging.reminder.line4'),
        '',
        t('sparkery.dispatch.aging.reminder.signature'),
      ].join('\n');
    },
    [t]
  );

  const receivableRows = React.useMemo<AgingRow[]>(() => {
    const today = dayjs().startOf('day');
    return jobs
      .filter(job => {
        const receivable = Number(job.receivableTotal || 0);
        return (
          receivable > 0 &&
          job.status === 'completed' &&
          Boolean(job.financeConfirmedAt) &&
          !job.paymentReceivedAt
        );
      })
      .map(job => {
        const referenceDate = dayjs(
          job.financeConfirmedAt || job.scheduledDate
        );
        const ageDays = Math.max(
          0,
          today.diff(referenceDate.startOf('day'), 'day')
        );
        return {
          id: job.id,
          job,
          ageDays,
          bucket: resolveBucket(ageDays),
        };
      })
      .sort((a, b) => {
        if (a.ageDays !== b.ageDays) {
          return b.ageDays - a.ageDays;
        }
        const amountA = Number(a.job.receivableTotal || 0);
        const amountB = Number(b.job.receivableTotal || 0);
        if (amountA !== amountB) {
          return amountB - amountA;
        }
        return a.job.scheduledDate.localeCompare(b.job.scheduledDate);
      });
  }, [jobs]);

  const summary = React.useMemo<AgingSummary>(() => {
    const initial: AgingSummary = {
      totalAmount: 0,
      totalCount: 0,
      bucket0_30Amount: 0,
      bucket0_30Count: 0,
      bucket31_60Amount: 0,
      bucket31_60Count: 0,
      bucket60Amount: 0,
      bucket60Count: 0,
    };

    return receivableRows.reduce((acc, row) => {
      const amount = Number(row.job.receivableTotal || 0);
      acc.totalAmount += amount;
      acc.totalCount += 1;

      if (row.bucket === '0-30') {
        acc.bucket0_30Amount += amount;
        acc.bucket0_30Count += 1;
      } else if (row.bucket === '31-60') {
        acc.bucket31_60Amount += amount;
        acc.bucket31_60Count += 1;
      } else {
        acc.bucket60Amount += amount;
        acc.bucket60Count += 1;
      }
      return acc;
    }, initial);
  }, [receivableRows]);

  const [payingId, setPayingId] = React.useState<string | null>(null);

  const copyReminder = async (row: AgingRow) => {
    const content = buildReminderTemplate(row);
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard unavailable');
      }
      await navigator.clipboard.writeText(content);
      message.success(t('sparkery.dispatch.aging.messages.reminderCopied'));
    } catch {
      message.error(t('sparkery.dispatch.aging.messages.reminderCopyFailed'));
    }
  };

  const markPaid = async (row: AgingRow) => {
    setPayingId(row.id);
    try {
      await onMarkPaid(row.id);
    } finally {
      setPayingId(null);
    }
  };

  const columns: TableColumnsType<AgingRow> = [
    {
      title: t('sparkery.dispatch.aging.columns.priority'),
      key: 'priority',
      width: 110,
      render: (_, row) => {
        const priority = getPriorityMeta(row.bucket);
        return <Tag color={priority.color}>{priority.label}</Tag>;
      },
    },
    {
      title: t('sparkery.dispatch.aging.columns.aging'),
      key: 'aging',
      width: 140,
      render: (_, row) => (
        <Space direction='vertical' size={0} className='dispatch-aging-cell'>
          <Tag className='dispatch-aging-bucket-tag'>
            {t('sparkery.dispatch.aging.daysBucket', { bucket: row.bucket })}
          </Tag>
          <Text type='secondary' className='dispatch-aging-days-text'>
            {t('sparkery.dispatch.aging.daysValue', { days: row.ageDays })}
          </Text>
        </Space>
      ),
    },
    {
      title: t('sparkery.dispatch.aging.columns.customerTask'),
      key: 'customerTask',
      render: (_, row) => (
        <Space
          direction='vertical'
          size={2}
          className='dispatch-aging-customer-block'
        >
          <Text strong className='dispatch-aging-task-title'>
            {row.job.title}
          </Text>
          <Text type='secondary' className='dispatch-aging-customer-text'>
            {row.job.customerName ||
              row.job.customerAddress ||
              t('sparkery.dispatch.common.noCustomer')}
          </Text>
        </Space>
      ),
    },
    {
      title: t('sparkery.dispatch.aging.columns.confirmedDate'),
      key: 'confirmedDate',
      width: 130,
      render: (_, row) => (
        <Text className='dispatch-aging-date-text'>
          {dayjs(row.job.financeConfirmedAt).format('YYYY-MM-DD')}
        </Text>
      ),
    },
    {
      title: t('sparkery.dispatch.aging.columns.outstanding'),
      key: 'outstanding',
      width: 120,
      render: (_, row) => (
        <Text strong className='dispatch-aging-money-text'>
          {toMoney(Number(row.job.receivableTotal || 0))}
        </Text>
      ),
    },
    {
      title: t('sparkery.dispatch.aging.columns.suggestedAction'),
      key: 'suggestedAction',
      width: 200,
      render: (_, row) => (
        <Text type='secondary' className='dispatch-aging-action-text'>
          {getPriorityMeta(row.bucket).action}
        </Text>
      ),
    },
    {
      title: t('sparkery.dispatch.aging.columns.actions'),
      key: 'actions',
      width: 220,
      render: (_, row) => (
        <Space wrap className='dispatch-aging-actions'>
          <Button
            size='small'
            icon={<CopyOutlined />}
            className='dispatch-aging-action-btn'
            onClick={() => {
              copyReminder(row).catch(() => {
                // handled in copyReminder
              });
            }}
          >
            {t('sparkery.dispatch.aging.copyReminder')}
          </Button>
          <Button
            size='small'
            type='primary'
            icon={<DollarOutlined />}
            className='dispatch-aging-action-btn dispatch-aging-action-btn-primary'
            loading={payingId === row.id}
            onClick={() => {
              markPaid(row).catch(() => {
                // handled in markPaid
              });
            }}
          >
            {t('sparkery.dispatch.aging.markPaid')}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      className='dispatch-finance-aging-board-card'
      size='small'
      title={t('sparkery.dispatch.aging.title')}
      extra={
        <Space size={[12, 6]} wrap className='dispatch-aging-summary-tags'>
          <Tag className='dispatch-aging-summary-tag dispatch-aging-summary-tag-total'>
            {t('sparkery.dispatch.aging.summary.outstanding', {
              count: summary.totalCount,
              amount: toMoney(summary.totalAmount),
            })}
          </Tag>
          <Tag className='dispatch-aging-summary-tag dispatch-aging-summary-tag-0-30'>
            {t('sparkery.dispatch.aging.summary.bucket0_30', {
              count: summary.bucket0_30Count,
              amount: toMoney(summary.bucket0_30Amount),
            })}
          </Tag>
          <Tag className='dispatch-aging-summary-tag dispatch-aging-summary-tag-31-60'>
            {t('sparkery.dispatch.aging.summary.bucket31_60', {
              count: summary.bucket31_60Count,
              amount: toMoney(summary.bucket31_60Amount),
            })}
          </Tag>
          <Tag className='dispatch-aging-summary-tag dispatch-aging-summary-tag-60'>
            {t('sparkery.dispatch.aging.summary.bucket60', {
              count: summary.bucket60Count,
              amount: toMoney(summary.bucket60Amount),
            })}
          </Tag>
        </Space>
      }
    >
      {receivableRows.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('sparkery.dispatch.aging.empty')}
        />
      ) : (
        <SparkeryDataTable<AgingRow>
          tableId='dispatch-finance-aging-board'
          className='dispatch-aging-table'
          rowKey='id'
          size='small'
          loading={Boolean(loading)}
          pagination={false}
          showSortBuilder
          columns={columns}
          dataSource={receivableRows}
          scroll={{ x: 1260 }}
        />
      )}
    </Card>
  );
};

export default FinanceAgingBoard;
