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
import FinanceAgingBoard from './components/dispatch/FinanceAgingBoard';
import CashflowForecastBoard from './components/dispatch/CashflowForecastBoard';
import { sparkeryDispatchService } from '@/services/sparkeryDispatchService';
import type { DispatchJob } from './dispatch/types';
import { useTranslation } from 'react-i18next';
import './sparkery.css';

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
  const { t } = useTranslation();
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
  const [agingJobs, setAgingJobs] = React.useState<DispatchJob[]>([]);
  const [agingLoading, setAgingLoading] = React.useState(false);

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
        periodLabel: t('sparkery.dispatch.financeDashboard.periodLabelMonth', {
          year: selectedYear,
          month: String(selectedMonth).padStart(2, '0'),
        }),
      };
    }
    if (viewMode === 'year') {
      const yearRange = getYearRange(selectedYear);
      return {
        ...yearRange,
        periodLabel: t('sparkery.dispatch.financeDashboard.periodLabelYear', {
          year: selectedYear,
        }),
      };
    }
    return {
      periodStart: selectedWeekStart,
      periodEnd: getWeekEnd(selectedWeekStart),
      periodLabel: t('sparkery.dispatch.financeDashboard.periodLabelWeek', {
        weekStart: selectedWeekStart,
        weekEnd: getWeekEnd(selectedWeekStart),
      }),
    };
  }, [selectedMonth, selectedWeekStart, selectedYear, t, viewMode]);

  React.useEffect(() => {
    dispatch(fetchDispatchEmployees());
    dispatch(fetchDispatchCustomerProfiles());
  }, [dispatch]);

  const loadAgingJobs = React.useCallback(
    async (options?: { silent?: boolean }) => {
      setAgingLoading(true);
      try {
        const rows = await sparkeryDispatchService.getJobs();
        setAgingJobs(rows);
      } catch {
        if (!options?.silent) {
          message.error(
            t('sparkery.dispatch.financeDashboard.messages.loadAgingFailed')
          );
        }
      } finally {
        setAgingLoading(false);
      }
    },
    [t]
  );

  const refreshFinanceData = React.useCallback(
    async (options?: { silent?: boolean }) => {
      await Promise.all([
        dispatch(
          fetchDispatchJobs({
            weekStart: periodRange.periodStart,
            weekEnd: periodRange.periodEnd,
          })
        ),
        loadAgingJobs(options?.silent ? { silent: true } : undefined),
      ]);
    },
    [dispatch, loadAgingJobs, periodRange.periodEnd, periodRange.periodStart]
  );

  React.useEffect(() => {
    refreshFinanceData({ silent: true }).catch(() => {
      // handled by downstream actions
    });
  }, [refreshFinanceData]);

  React.useEffect(() => {
    const handleWindowFocus = () => {
      refreshFinanceData({ silent: true }).catch(() => {
        // handled by downstream actions
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      refreshFinanceData({ silent: true }).catch(() => {
        // handled by downstream actions
      });
    };

    const handleStorageSync = (event: StorageEvent) => {
      if (event.key !== 'sparkery_dispatch_storage_v1') {
        return;
      }
      refreshFinanceData({ silent: true }).catch(() => {
        // handled by downstream actions
      });
    };

    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible') {
        return;
      }
      refreshFinanceData({ silent: true }).catch(() => {
        // handled by downstream actions
      });
    }, 15000);

    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('storage', handleStorageSync);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('storage', handleStorageSync);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshFinanceData]);

  const handleRefresh = async () => {
    await refreshFinanceData();
    message.success(
      t('sparkery.dispatch.financeDashboard.messages.jobsRefreshed')
    );
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
      message.success(
        t(
          'sparkery.dispatch.financeDashboard.messages.financeAdjustmentApplied'
        )
      );
      await loadAgingJobs();
      return;
    }
    message.error(
      extractThunkError(
        result,
        t(
          'sparkery.dispatch.financeDashboard.messages.financeAdjustmentApplyFailed'
        )
      )
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
      message.success(
        t('sparkery.dispatch.financeDashboard.messages.financeConfirmedLocked')
      );
      await loadAgingJobs();
      return;
    }
    message.error(
      extractThunkError(
        result,
        t('sparkery.dispatch.financeDashboard.messages.financeConfirmFailed')
      )
    );
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
      message.success(
        received
          ? t('sparkery.dispatch.financeDashboard.messages.markedPaid')
          : t('sparkery.dispatch.financeDashboard.messages.markedUnpaid')
      );
      await loadAgingJobs();
      return;
    }
    message.error(
      extractThunkError(
        result,
        t(
          'sparkery.dispatch.financeDashboard.messages.paymentStatusUpdateFailed'
        )
      )
    );
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
        t(
          'sparkery.dispatch.financeDashboard.messages.noRecurringFeeConfigured'
        )
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
      message.info(
        t('sparkery.dispatch.financeDashboard.messages.noFeeSyncNeeded')
      );
      return;
    }

    setSyncingRecurringFee(true);
    let successCount = 0;
    let failedCount = 0;

    try {
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
    } finally {
      setSyncingRecurringFee(false);
    }

    await dispatch(
      fetchDispatchJobs({
        weekStart: periodRange.periodStart,
        weekEnd: periodRange.periodEnd,
      })
    );
    await loadAgingJobs();

    if (failedCount === 0) {
      message.success(
        t('sparkery.dispatch.financeDashboard.messages.syncedRecurringFee', {
          success: successCount,
        })
      );
      return;
    }
    message.warning(
      t(
        'sparkery.dispatch.financeDashboard.messages.syncedRecurringFeeWithFailed',
        {
          success: successCount,
          failed: failedCount,
        }
      )
    );
  };

  return (
    <div className='dispatch-dashboard-page dispatch-dashboard-shell'>
      <div className='dispatch-dashboard-header'>
        <div>
          <Title level={4} className='dispatch-dashboard-title'>
            {t('sparkery.dispatch.financeDashboard.title')}
          </Title>
          <Text className='dispatch-dashboard-subtitle' type='secondary'>
            {t('sparkery.dispatch.financeDashboard.subtitle')}
          </Text>
        </div>
        <Space className='dispatch-dashboard-actions' wrap>
          <Button onClick={() => navigate('/sparkery/recurring')}>
            {t('sparkery.dispatch.financeDashboard.openRecurringTemplates')}
          </Button>
          <Button onClick={() => navigate('/sparkery/dispatch')}>
            {t('sparkery.dispatch.financeDashboard.openDispatchBoard')}
          </Button>
        </Space>
      </div>

      <Card
        size='small'
        className='dispatch-dashboard-section-card dispatch-finance-filter-card'
      >
        <Space className='dispatch-finance-filter-row' wrap size={[10, 8]}>
          <Space className='dispatch-finance-filter-group' size={6}>
            <Text type='secondary' className='dispatch-finance-filter-label'>
              {t('sparkery.dispatch.financeDashboard.view')}
            </Text>
            <Select<FinanceViewMode>
              value={viewMode}
              className='dispatch-finance-view-select'
              onChange={value => setViewMode(value)}
              options={[
                {
                  label: t('sparkery.dispatch.financeDashboard.byWeek'),
                  value: 'week',
                },
                {
                  label: t('sparkery.dispatch.financeDashboard.byMonth'),
                  value: 'month',
                },
                {
                  label: t('sparkery.dispatch.financeDashboard.byYear'),
                  value: 'year',
                },
              ]}
            />
          </Space>
          {viewMode === 'week' && (
            <Space className='dispatch-finance-filter-group' size={6}>
              <Text type='secondary' className='dispatch-finance-filter-label'>
                {t('sparkery.dispatch.filters.weekStart')}
              </Text>
              <Input
                type='date'
                className='dispatch-finance-week-input'
                value={selectedWeekStart}
                onChange={event => {
                  const nextWeekStart = event.target.value;
                  if (!nextWeekStart) {
                    return;
                  }
                  dispatch(setSelectedWeekStart(nextWeekStart));
                }}
              />
            </Space>
          )}
          {viewMode === 'month' && (
            <Space className='dispatch-finance-filter-group' size={6}>
              <Text type='secondary' className='dispatch-finance-filter-label'>
                {t('sparkery.dispatch.financeDashboard.year')}
              </Text>
              <Select<number>
                value={selectedYear}
                className='dispatch-finance-year-select'
                options={yearOptions}
                onChange={value => setSelectedYear(value)}
              />
              <Text type='secondary' className='dispatch-finance-filter-label'>
                {t('sparkery.dispatch.financeDashboard.month')}
              </Text>
              <Select<number>
                value={selectedMonth}
                className='dispatch-finance-month-select'
                options={monthOptions}
                onChange={value => setSelectedMonth(value)}
              />
            </Space>
          )}
          {viewMode === 'year' && (
            <Space className='dispatch-finance-filter-group' size={6}>
              <Text type='secondary' className='dispatch-finance-filter-label'>
                {t('sparkery.dispatch.financeDashboard.year')}
              </Text>
              <Select<number>
                value={selectedYear}
                className='dispatch-finance-year-select'
                options={yearOptions}
                onChange={value => setSelectedYear(value)}
              />
            </Space>
          )}
          <Tag
            className='dispatch-finance-period-tag dispatch-finance-period-tag-strong'
            color='blue'
          >
            {periodRange.periodLabel}
          </Tag>
          <Button
            className='dispatch-finance-filter-btn'
            onClick={handleRefresh}
          >
            {t('sparkery.dispatch.common.refresh')}
          </Button>
          <Button
            className='dispatch-finance-filter-btn dispatch-finance-filter-btn-sync'
            loading={syncingRecurringFee}
            onClick={handleSyncRecurringFees}
          >
            {t('sparkery.dispatch.financeDashboard.syncRecurringFees')}
          </Button>
        </Space>
      </Card>

      {error && (
        <Alert
          className='dispatch-dashboard-alert'
          type='error'
          message={error}
          closable
          onClose={() => dispatch(clearDispatchError())}
        />
      )}

      <WeeklyFinanceBoard
        jobs={jobs}
        employees={employees}
        weekStart={periodRange.periodStart}
        weekEnd={periodRange.periodEnd}
        title={t('sparkery.dispatch.financeDashboard.financeTitle', {
          periodLabel: periodRange.periodLabel,
        })}
        loading={isLoading}
        onApplyAdjustment={handleApplyFinanceAdjustment}
        onConfirmFinance={handleConfirmFinance}
        onTogglePaymentReceived={handleTogglePaymentReceived}
      />

      <div className='dispatch-dashboard-section-top'>
        <CashflowForecastBoard
          jobs={agingJobs}
          loading={agingLoading || isLoading}
        />
      </div>

      <div className='dispatch-dashboard-section-top'>
        <FinanceAgingBoard
          jobs={agingJobs}
          loading={agingLoading || isLoading}
          onMarkPaid={async jobId => {
            await handleTogglePaymentReceived(jobId, true);
          }}
        />
      </div>
    </div>
  );
};

export default DispatchFinanceDashboard;
