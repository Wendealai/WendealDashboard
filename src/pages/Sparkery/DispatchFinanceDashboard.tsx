import React from 'react';
import {
  Alert,
  Button,
  Card,
  Input,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import {
  applyDispatchJobFinanceAdjustment,
  clearDispatchError,
  confirmDispatchJobFinance,
  fetchDispatchCustomerProfiles,
  fetchDispatchEmployees,
  fetchDispatchJobs,
  setDispatchJobPaymentReceived,
  selectDispatchCustomerProfiles,
  selectDispatchEmployees,
  selectDispatchJobs,
  selectDispatchState,
  setSelectedWeekStart,
  updateDispatchJob,
} from '@/store/slices/sparkeryDispatchSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import WeeklyFinanceBoard from './components/dispatch/WeeklyFinanceBoard';

const { Title, Text } = Typography;

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

const getWeekEnd = (weekStart: string): string => {
  const start = parseDateKey(weekStart);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return formatDateKey(end);
};

const getMonthRange = (year: number, month: number) => {
  const monthIndex = Math.max(1, Math.min(12, month));
  const start = new Date(year, monthIndex - 1, 1);
  const end = new Date(year, monthIndex, 0);
  return {
    periodStart: formatDateKey(start),
    periodEnd: formatDateKey(end),
  };
};

const getYearRange = (year: number) => {
  const start = new Date(year, 0, 1);
  const end = new Date(year, 11, 31);
  return {
    periodStart: formatDateKey(start),
    periodEnd: formatDateKey(end),
  };
};

const extractThunkError = (
  action: { error?: { message?: string } },
  fallback: string
): string => action.error?.message || fallback;

type FinanceViewMode = 'week' | 'month' | 'year';

const DispatchFinanceDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { selectedWeekStart, isLoading, error } =
    useAppSelector(selectDispatchState);
  const jobs = useAppSelector(selectDispatchJobs);
  const employees = useAppSelector(selectDispatchEmployees);
  const customerProfiles = useAppSelector(selectDispatchCustomerProfiles);
  const [syncingRecurringFee, setSyncingRecurringFee] = React.useState(false);
  const today = React.useMemo(() => new Date(), []);
  const [viewMode, setViewMode] = React.useState<FinanceViewMode>('week');
  const [selectedYear, setSelectedYear] = React.useState<number>(
    today.getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = React.useState<number>(
    today.getMonth() + 1
  );

  const yearOptions = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    const options: Array<{ label: string; value: number }> = [];
    for (let year = currentYear - 5; year <= currentYear + 5; year += 1) {
      options.push({ label: String(year), value: year });
    }
    return options;
  }, []);

  const monthOptions = React.useMemo(
    () =>
      Array.from({ length: 12 }).map((_, index) => ({
        label: `${index + 1}`.padStart(2, '0'),
        value: index + 1,
      })),
    []
  );

  const periodRange = React.useMemo(() => {
    if (viewMode === 'month') {
      const monthRange = getMonthRange(selectedYear, selectedMonth);
      return {
        ...monthRange,
        periodLabel: `Month ${selectedYear}-${String(selectedMonth).padStart(2, '0')}`,
      };
    }
    if (viewMode === 'year') {
      const yearRange = getYearRange(selectedYear);
      return {
        ...yearRange,
        periodLabel: `Year ${selectedYear}`,
      };
    }
    return {
      periodStart: selectedWeekStart,
      periodEnd: getWeekEnd(selectedWeekStart),
      periodLabel: `Week ${selectedWeekStart} to ${getWeekEnd(selectedWeekStart)}`,
    };
  }, [selectedMonth, selectedWeekStart, selectedYear, viewMode]);

  React.useEffect(() => {
    dispatch(fetchDispatchEmployees());
    dispatch(fetchDispatchCustomerProfiles());
  }, [dispatch]);

  React.useEffect(() => {
    dispatch(
      fetchDispatchJobs({
        weekStart: periodRange.periodStart,
        weekEnd: periodRange.periodEnd,
      })
    );
  }, [dispatch, periodRange.periodEnd, periodRange.periodStart]);

  const handleRefresh = async () => {
    await dispatch(
      fetchDispatchJobs({
        weekStart: periodRange.periodStart,
        weekEnd: periodRange.periodEnd,
      })
    );
    message.success('Finance jobs refreshed');
  };

  const handleApplyFinanceAdjustment = async (
    jobId: string,
    deltaAmount: number
  ) => {
    const result = await dispatch(
      applyDispatchJobFinanceAdjustment({
        id: jobId,
        adjustmentDelta: deltaAmount,
      })
    );
    if (applyDispatchJobFinanceAdjustment.fulfilled.match(result)) {
      message.success('Finance adjustment applied');
      return;
    }
    message.error(
      extractThunkError(result, 'Failed to apply finance adjustment')
    );
  };

  const handleConfirmFinance = async (jobId: string) => {
    const result = await dispatch(
      confirmDispatchJobFinance({
        id: jobId,
        confirmedBy: 'dispatch-finance-panel',
      })
    );
    if (confirmDispatchJobFinance.fulfilled.match(result)) {
      message.success('Finance confirmed and locked');
      return;
    }
    message.error(extractThunkError(result, 'Failed to confirm finance'));
  };

  const handleTogglePaymentReceived = async (
    jobId: string,
    received: boolean
  ) => {
    const result = await dispatch(
      setDispatchJobPaymentReceived({
        id: jobId,
        received,
        receivedBy: 'dispatch-finance-panel',
      })
    );
    if (setDispatchJobPaymentReceived.fulfilled.match(result)) {
      message.success(received ? 'Marked as paid' : 'Marked as unpaid');
      return;
    }
    message.error(extractThunkError(result, 'Failed to update payment status'));
  };

  const handleSyncRecurringFees = async () => {
    const recurringFeeMap = new Map<string, number>();
    customerProfiles.forEach(profile => {
      if (
        profile.id &&
        typeof profile.recurringFee === 'number' &&
        Number.isFinite(profile.recurringFee)
      ) {
        recurringFeeMap.set(
          profile.id,
          Number(profile.recurringFee.toFixed(2))
        );
      }
    });

    if (recurringFeeMap.size === 0) {
      message.warning(
        'No recurring customer fixed fee configured. Please set recurring fee in customer profile first.'
      );
      return;
    }

    const candidates = jobs.filter(job => {
      if (job.financeLockedAt || job.financeConfirmedAt) {
        return false;
      }
      if (job.pricingMode !== 'recurring_fixed') {
        return false;
      }
      if (!job.customerProfileId) {
        return false;
      }
      if (!recurringFeeMap.has(job.customerProfileId)) {
        return false;
      }
      const targetFee = recurringFeeMap.get(job.customerProfileId) as number;
      return Number((job.baseFee || 0).toFixed(2)) !== targetFee;
    });

    if (candidates.length === 0) {
      message.info('No recurring jobs need fee sync in current filter');
      return;
    }

    setSyncingRecurringFee(true);
    let successCount = 0;
    let failedCount = 0;

    for (const job of candidates) {
      const customerProfileId = job.customerProfileId;
      if (!customerProfileId) {
        continue;
      }
      const targetFee = recurringFeeMap.get(customerProfileId);
      if (typeof targetFee !== 'number') {
        continue;
      }

      const nextReceivable = Number(
        (targetFee + Number(job.manualAdjustment || 0)).toFixed(2)
      );
      const result = await dispatch(
        updateDispatchJob({
          id: job.id,
          patch: {
            pricingMode: 'recurring_fixed',
            feeCurrency: 'AUD',
            baseFee: targetFee,
            receivableTotal: nextReceivable,
          },
        })
      );
      if (updateDispatchJob.fulfilled.match(result)) {
        successCount += 1;
      } else {
        failedCount += 1;
      }
    }

    setSyncingRecurringFee(false);
    await dispatch(
      fetchDispatchJobs({
        weekStart: periodRange.periodStart,
        weekEnd: periodRange.periodEnd,
      })
    );

    if (failedCount === 0) {
      message.success(`Synced recurring fixed fee for ${successCount} jobs`);
      return;
    }
    message.warning(
      `Synced ${successCount} jobs, ${failedCount} failed (likely finance-locked or schema not migrated)`
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
            Sparkery Finance Dashboard
          </Title>
          <Text className='dispatch-dashboard-subtitle' type='secondary'>
            Receivable summary and lock confirmation by week/month/year
          </Text>
        </div>
        <Space className='dispatch-dashboard-actions' wrap>
          <Button onClick={() => navigate('/sparkery/recurring')}>
            Open Recurring Templates
          </Button>
          <Button onClick={() => navigate('/sparkery/dispatch')}>
            Open Dispatch Board
          </Button>
        </Space>
      </div>

      <Card size='small' style={{ marginBottom: 12 }}>
        <Space wrap>
          <Text type='secondary'>View</Text>
          <Select<FinanceViewMode>
            value={viewMode}
            style={{ width: 130 }}
            onChange={value => setViewMode(value)}
            options={[
              { label: 'By Week', value: 'week' },
              { label: 'By Month', value: 'month' },
              { label: 'By Year', value: 'year' },
            ]}
          />
          {viewMode === 'week' && (
            <>
              <Text type='secondary'>Week Start</Text>
              <Input
                type='date'
                value={selectedWeekStart}
                onChange={event =>
                  dispatch(setSelectedWeekStart(event.target.value))
                }
                style={{ width: 180 }}
              />
            </>
          )}
          {viewMode === 'month' && (
            <>
              <Text type='secondary'>Year</Text>
              <Select<number>
                value={selectedYear}
                style={{ width: 110 }}
                options={yearOptions}
                onChange={value => setSelectedYear(value)}
              />
              <Text type='secondary'>Month</Text>
              <Select<number>
                value={selectedMonth}
                style={{ width: 100 }}
                options={monthOptions}
                onChange={value => setSelectedMonth(value)}
              />
            </>
          )}
          {viewMode === 'year' && (
            <>
              <Text type='secondary'>Year</Text>
              <Select<number>
                value={selectedYear}
                style={{ width: 110 }}
                options={yearOptions}
                onChange={value => setSelectedYear(value)}
              />
            </>
          )}
          <Tag color='blue'>{periodRange.periodLabel}</Tag>
          <Button onClick={handleRefresh}>Refresh</Button>
          <Button
            loading={syncingRecurringFee}
            onClick={handleSyncRecurringFees}
          >
            One-click Sync Repeating Fees
          </Button>
        </Space>
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

      <WeeklyFinanceBoard
        jobs={jobs}
        employees={employees}
        weekStart={periodRange.periodStart}
        weekEnd={periodRange.periodEnd}
        title={`Finance (${periodRange.periodLabel})`}
        loading={isLoading}
        onApplyAdjustment={handleApplyFinanceAdjustment}
        onConfirmFinance={handleConfirmFinance}
        onTogglePaymentReceived={handleTogglePaymentReceived}
      />
    </div>
  );
};

export default DispatchFinanceDashboard;
