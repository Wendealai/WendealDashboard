import React from 'react';
import { Card, Empty, Progress, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useTranslation } from 'react-i18next';
import dayjs, { type Dayjs } from 'dayjs';
import type { DispatchJob } from '../../dispatch/types';

const { Text } = Typography;

const DEFAULT_COLLECTION_LAG_DAYS = 7;
const FORECAST_MONTH_WINDOW = 4;

type ForecastStatus = 'overdue' | 'due_soon' | 'upcoming';

interface ForecastRow {
  id: string;
  jobId: string;
  title: string;
  customer: string;
  amount: number;
  confirmedDate: Dayjs;
  expectedDate: Dayjs;
  overdueDays: number;
  status: ForecastStatus;
}

interface MonthForecastRow {
  key: string;
  periodLabel: string;
  plannedAmount: number;
  overdueCarryIn: number;
  projectedInflow: number;
  jobCount: number;
  sharePercent: number;
}

interface RiskQueueRow {
  id: string;
  title: string;
  customer: string;
  expectedDate: Dayjs;
  overdueDays: number;
  amount: number;
}

interface CashflowForecastBoardProps {
  jobs: DispatchJob[];
  loading?: boolean;
}

const toMoney = (value: number): string => `$${Number(value || 0).toFixed(2)}`;

const computeMedian = (values: number[], fallback: number): number => {
  if (values.length === 0) {
    return fallback;
  }
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[middle] ?? fallback;
  }
  const left = sorted[middle - 1] ?? fallback;
  const right = sorted[middle] ?? fallback;
  return Math.round((left + right) / 2);
};

const computeAverage = (values: number[], fallback: number): number => {
  if (values.length === 0) {
    return fallback;
  }
  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length
  );
};

const resolveForecastStatus = (
  overdueDays: number,
  daysUntilExpected: number
): ForecastStatus => {
  if (overdueDays > 0) {
    return 'overdue';
  }
  if (daysUntilExpected <= 7) {
    return 'due_soon';
  }
  return 'upcoming';
};

const CashflowForecastBoard: React.FC<CashflowForecastBoardProps> = ({
  jobs,
  loading,
}) => {
  const { t } = useTranslation();
  const today = React.useMemo(() => dayjs().startOf('day'), []);

  const resolveModelConfidence = React.useCallback(
    (sampleSize: number): { label: string; color: string } => {
      if (sampleSize >= 15) {
        return {
          label: t('sparkery.dispatch.cashflow.confidence.high'),
          color: 'green',
        };
      }
      if (sampleSize >= 6) {
        return {
          label: t('sparkery.dispatch.cashflow.confidence.medium'),
          color: 'gold',
        };
      }
      return {
        label: t('sparkery.dispatch.cashflow.confidence.low'),
        color: 'orange',
      };
    },
    [t]
  );

  const resolveRiskMeta = React.useCallback(
    (overdueDays: number): { label: string; color: string } => {
      if (overdueDays >= 30) {
        return {
          label: t('sparkery.dispatch.cashflow.risk.high'),
          color: 'red',
        };
      }
      if (overdueDays >= 14) {
        return {
          label: t('sparkery.dispatch.cashflow.risk.medium'),
          color: 'orange',
        };
      }
      return {
        label: t('sparkery.dispatch.cashflow.risk.low'),
        color: 'blue',
      };
    },
    [t]
  );

  const paidLagDays = React.useMemo(
    () =>
      jobs
        .filter(job => {
          const amount = Number(job.receivableTotal || 0);
          return (
            amount > 0 &&
            job.status === 'completed' &&
            Boolean(job.financeConfirmedAt) &&
            Boolean(job.paymentReceivedAt)
          );
        })
        .map(job => {
          const confirmedAt = dayjs(job.financeConfirmedAt);
          const paidAt = dayjs(job.paymentReceivedAt);
          if (!confirmedAt.isValid() || !paidAt.isValid()) {
            return null;
          }
          const diff = paidAt
            .startOf('day')
            .diff(confirmedAt.startOf('day'), 'day');
          return Math.max(0, diff);
        })
        .filter((value): value is number => typeof value === 'number'),
    [jobs]
  );

  const medianLagDays = React.useMemo(
    () => computeMedian(paidLagDays, DEFAULT_COLLECTION_LAG_DAYS),
    [paidLagDays]
  );

  const averageLagDays = React.useMemo(
    () => computeAverage(paidLagDays, DEFAULT_COLLECTION_LAG_DAYS),
    [paidLagDays]
  );

  const forecastRows = React.useMemo<ForecastRow[]>(() => {
    return jobs
      .filter(job => {
        const amount = Number(job.receivableTotal || 0);
        return (
          amount > 0 &&
          job.status === 'completed' &&
          Boolean(job.financeConfirmedAt) &&
          !job.paymentReceivedAt
        );
      })
      .map(job => {
        const confirmedDate = dayjs(
          job.financeConfirmedAt || job.scheduledDate
        ).startOf('day');
        const expectedDate = confirmedDate.add(medianLagDays, 'day');
        const overdueDays = Math.max(0, today.diff(expectedDate, 'day'));
        const daysUntilExpected = expectedDate.diff(today, 'day');
        return {
          id: job.id,
          jobId: job.id,
          title: job.title,
          customer:
            job.customerName ||
            job.customerAddress ||
            t('sparkery.dispatch.cashflow.unknownCustomer'),
          amount: Number(job.receivableTotal || 0),
          confirmedDate,
          expectedDate,
          overdueDays,
          status: resolveForecastStatus(overdueDays, daysUntilExpected),
        };
      })
      .sort((a, b) => {
        if (a.overdueDays !== b.overdueDays) {
          return b.overdueDays - a.overdueDays;
        }
        if (a.expectedDate.valueOf() !== b.expectedDate.valueOf()) {
          return a.expectedDate.valueOf() - b.expectedDate.valueOf();
        }
        return b.amount - a.amount;
      });
  }, [jobs, medianLagDays, t, today]);

  const outstandingAmount = React.useMemo(
    () => forecastRows.reduce((sum, row) => sum + row.amount, 0),
    [forecastRows]
  );

  const overdueRows = React.useMemo(
    () => forecastRows.filter(row => row.overdueDays > 0),
    [forecastRows]
  );

  const overdueAmount = React.useMemo(
    () => overdueRows.reduce((sum, row) => sum + row.amount, 0),
    [overdueRows]
  );

  const weekStart = React.useMemo(() => {
    const dayIndex = today.day();
    const mondayOffset = dayIndex === 0 ? -6 : 1 - dayIndex;
    return today.add(mondayOffset, 'day');
  }, [today]);

  const weekEnd = React.useMemo(() => weekStart.add(6, 'day'), [weekStart]);

  const dueThisWeekAmount = React.useMemo(
    () =>
      forecastRows
        .filter(
          row =>
            row.expectedDate.valueOf() >= weekStart.valueOf() &&
            row.expectedDate.valueOf() <= weekEnd.valueOf()
        )
        .reduce((sum, row) => sum + row.amount, 0),
    [forecastRows, weekEnd, weekStart]
  );

  const dueThisMonthAmount = React.useMemo(
    () =>
      forecastRows
        .filter(row => row.expectedDate.isSame(today, 'month'))
        .reduce((sum, row) => sum + row.amount, 0),
    [forecastRows, today]
  );

  const confidence = React.useMemo(
    () => resolveModelConfidence(paidLagDays.length),
    [paidLagDays.length, resolveModelConfidence]
  );

  const monthRows = React.useMemo<MonthForecastRow[]>(() => {
    const currentMonthStart = today.startOf('month');
    const rows: MonthForecastRow[] = [];
    for (let index = 0; index < FORECAST_MONTH_WINDOW; index += 1) {
      const monthStart = currentMonthStart.add(index, 'month');
      const monthLabel = monthStart.format('MMM YYYY');
      const plannedRows = forecastRows.filter(
        row =>
          row.overdueDays === 0 && row.expectedDate.isSame(monthStart, 'month')
      );
      const plannedAmount = plannedRows.reduce(
        (sum, row) => sum + row.amount,
        0
      );
      const overdueCarryIn = index === 0 ? overdueAmount : 0;
      const projectedInflow = plannedAmount + overdueCarryIn;
      const jobCount =
        plannedRows.length + (index === 0 ? overdueRows.length : 0);
      rows.push({
        key: monthStart.format('YYYY-MM'),
        periodLabel: monthLabel,
        plannedAmount,
        overdueCarryIn,
        projectedInflow,
        jobCount,
        sharePercent:
          outstandingAmount > 0
            ? Math.min(100, (projectedInflow / outstandingAmount) * 100)
            : 0,
      });
    }
    return rows;
  }, [
    forecastRows,
    overdueAmount,
    overdueRows.length,
    outstandingAmount,
    today,
  ]);

  const forecastTotalAmount = React.useMemo(
    () => monthRows.reduce((sum, row) => sum + row.projectedInflow, 0),
    [monthRows]
  );

  const riskRows = React.useMemo<RiskQueueRow[]>(
    () =>
      overdueRows.slice(0, 8).map(row => ({
        id: row.id,
        title: row.title,
        customer: row.customer,
        expectedDate: row.expectedDate,
        overdueDays: row.overdueDays,
        amount: row.amount,
      })),
    [overdueRows]
  );

  const monthColumns: ColumnsType<MonthForecastRow> = [
    {
      title: t('sparkery.dispatch.cashflow.columns.period'),
      key: 'period',
      width: 130,
      render: (_, row) => (
        <Space
          direction='vertical'
          size={0}
          className='dispatch-cashflow-month-cell'
        >
          <Text strong className='dispatch-cashflow-month-label'>
            {row.periodLabel}
          </Text>
          <Text type='secondary' className='dispatch-cashflow-month-sub'>
            {t('sparkery.dispatch.cashflow.nextWindow')}
          </Text>
        </Space>
      ),
    },
    {
      title: t('sparkery.dispatch.cashflow.columns.plannedCollection'),
      dataIndex: 'plannedAmount',
      key: 'plannedAmount',
      width: 150,
      render: value => (
        <Text className='dispatch-cashflow-money'>{toMoney(value)}</Text>
      ),
    },
    {
      title: t('sparkery.dispatch.cashflow.columns.overdueCarryIn'),
      dataIndex: 'overdueCarryIn',
      key: 'overdueCarryIn',
      width: 150,
      render: value => (
        <Text className='dispatch-cashflow-overdue-money'>
          {toMoney(value)}
        </Text>
      ),
    },
    {
      title: t('sparkery.dispatch.cashflow.columns.projectedInflow'),
      dataIndex: 'projectedInflow',
      key: 'projectedInflow',
      width: 160,
      render: value => (
        <Text strong className='dispatch-cashflow-projected-money'>
          {toMoney(value)}
        </Text>
      ),
    },
    {
      title: t('sparkery.dispatch.cashflow.columns.jobs'),
      dataIndex: 'jobCount',
      key: 'jobCount',
      width: 90,
      render: value => (
        <Tag className='dispatch-cashflow-jobs-tag'>{value}</Tag>
      ),
    },
    {
      title: t('sparkery.dispatch.cashflow.columns.share'),
      dataIndex: 'sharePercent',
      key: 'sharePercent',
      width: 150,
      render: value => (
        <Progress
          percent={Number(value.toFixed(1))}
          showInfo={false}
          size='small'
          className='dispatch-cashflow-progress'
        />
      ),
    },
  ];

  const riskColumns: ColumnsType<RiskQueueRow> = [
    {
      title: t('sparkery.dispatch.cashflow.columns.risk'),
      key: 'risk',
      width: 90,
      render: (_, row) => {
        const meta = resolveRiskMeta(row.overdueDays);
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: t('sparkery.dispatch.cashflow.columns.customerTask'),
      key: 'task',
      render: (_, row) => (
        <Space
          direction='vertical'
          size={2}
          className='dispatch-cashflow-risk-task-block'
        >
          <Text strong className='dispatch-cashflow-risk-task'>
            {row.title}
          </Text>
          <Text type='secondary' className='dispatch-cashflow-risk-customer'>
            {row.customer}
          </Text>
        </Space>
      ),
    },
    {
      title: t('sparkery.dispatch.cashflow.columns.expectedDate'),
      key: 'expectedDate',
      width: 130,
      render: (_, row) => (
        <Text className='dispatch-cashflow-risk-date'>
          {row.expectedDate.format('YYYY-MM-DD')}
        </Text>
      ),
    },
    {
      title: t('sparkery.dispatch.cashflow.columns.overdue'),
      key: 'overdueDays',
      width: 100,
      render: (_, row) => (
        <Text className='dispatch-cashflow-risk-days'>
          {t('sparkery.dispatch.cashflow.overdueDays', {
            days: row.overdueDays,
          })}
        </Text>
      ),
    },
    {
      title: t('sparkery.dispatch.cashflow.columns.amount'),
      key: 'amount',
      width: 120,
      render: (_, row) => (
        <Text strong className='dispatch-cashflow-money'>
          {toMoney(row.amount)}
        </Text>
      ),
    },
  ];

  return (
    <Card
      className='dispatch-finance-cashflow-board-card'
      size='small'
      title={t('sparkery.dispatch.cashflow.title')}
      extra={
        <Tag color={confidence.color} className='dispatch-cashflow-model-tag'>
          {t('sparkery.dispatch.cashflow.modelTag', {
            median: medianLagDays,
            average: averageLagDays,
            samples: paidLagDays.length,
            confidence: confidence.label,
          })}
        </Tag>
      }
    >
      {forecastRows.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('sparkery.dispatch.cashflow.empty')}
        />
      ) : (
        <Space
          direction='vertical'
          size={12}
          className='dispatch-cashflow-body'
        >
          <Space wrap size={[10, 8]} className='dispatch-cashflow-kpi-row'>
            <Tag className='dispatch-cashflow-kpi-tag dispatch-cashflow-kpi-tag-strong'>
              {t('sparkery.dispatch.cashflow.kpi.outstanding', {
                amount: toMoney(outstandingAmount),
              })}
            </Tag>
            <Tag className='dispatch-cashflow-kpi-tag dispatch-cashflow-kpi-tag-week'>
              {t('sparkery.dispatch.cashflow.kpi.dueThisWeek', {
                amount: toMoney(dueThisWeekAmount),
              })}
            </Tag>
            <Tag className='dispatch-cashflow-kpi-tag dispatch-cashflow-kpi-tag-month'>
              {t('sparkery.dispatch.cashflow.kpi.dueThisMonth', {
                amount: toMoney(dueThisMonthAmount),
              })}
            </Tag>
            <Tag className='dispatch-cashflow-kpi-tag dispatch-cashflow-kpi-tag-overdue'>
              {t('sparkery.dispatch.cashflow.kpi.overdueBacklog', {
                amount: toMoney(overdueAmount),
              })}
            </Tag>
            <Tag className='dispatch-cashflow-kpi-tag dispatch-cashflow-kpi-tag-horizon'>
              {t('sparkery.dispatch.cashflow.kpi.forecastInflow', {
                months: FORECAST_MONTH_WINDOW,
                amount: toMoney(forecastTotalAmount),
              })}
            </Tag>
          </Space>

          <Table<MonthForecastRow>
            className='dispatch-cashflow-forecast-table'
            rowKey='key'
            size='small'
            loading={Boolean(loading)}
            pagination={false}
            columns={monthColumns}
            dataSource={monthRows}
            scroll={{ x: 780 }}
          />

          <Text strong className='dispatch-cashflow-risk-queue-title'>
            {t('sparkery.dispatch.cashflow.riskQueueTitle')}
          </Text>

          {riskRows.length === 0 ? (
            <Text type='secondary' className='dispatch-cashflow-empty-hint'>
              {t('sparkery.dispatch.cashflow.riskQueueEmpty')}
            </Text>
          ) : (
            <Table<RiskQueueRow>
              className='dispatch-cashflow-risk-table'
              rowKey='id'
              size='small'
              loading={Boolean(loading)}
              pagination={false}
              columns={riskColumns}
              dataSource={riskRows}
              scroll={{ x: 760 }}
            />
          )}
        </Space>
      )}
    </Card>
  );
};

export default CashflowForecastBoard;
