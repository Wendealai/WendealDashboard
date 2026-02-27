import React from 'react';
import { Button, Input, Select, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import type { DispatchFilters } from '../../dispatch/types';

const { Option } = Select;

interface DispatchFiltersBarProps {
  weekStart: string;
  filters: DispatchFilters;
  onWeekChange: (dateText: string) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onFiltersChange: (filters: DispatchFilters) => void;
  onRefresh: () => void;
}

export const DispatchFiltersBar: React.FC<DispatchFiltersBarProps> = ({
  weekStart,
  filters,
  onWeekChange,
  onPrevWeek,
  onNextWeek,
  onFiltersChange,
  onRefresh,
}) => {
  const { t } = useTranslation();

  const handleStatusChange = (value: DispatchFilters['status'] | undefined) => {
    if (value) {
      onFiltersChange({ ...filters, status: value });
      return;
    }
    const { status: _status, ...rest } = filters;
    onFiltersChange(rest);
  };

  return (
    <Space className='dispatch-filters-bar' wrap size={[10, 8]}>
      <Space className='dispatch-filters-main' wrap size={[10, 8]}>
        <Space className='dispatch-filter-field' size={6}>
          <span className='dispatch-filter-label'>
            {t('sparkery.dispatch.filters.weekStart')}
          </span>
          <Space size={6} wrap className='dispatch-filter-week-nav'>
            <Button
              className='dispatch-filter-button dispatch-filter-week-button'
              onClick={onPrevWeek}
            >
              {t('sparkery.dispatch.common.previousWeek')}
            </Button>
            <Button
              className='dispatch-filter-button dispatch-filter-week-button'
              onClick={onNextWeek}
            >
              {t('sparkery.dispatch.common.nextWeek')}
            </Button>
          </Space>
          <Input
            className='dispatch-filter-input dispatch-filter-date-input'
            type='date'
            value={weekStart}
            onChange={e => onWeekChange(e.target.value)}
          />
        </Space>
        <Space className='dispatch-filter-field' size={6}>
          <span className='dispatch-filter-label'>
            {t('sparkery.dispatch.filters.status')}
          </span>
          <Select
            className='dispatch-filter-select dispatch-filter-status-select'
            value={filters.status || undefined}
            placeholder={t('sparkery.dispatch.filters.jobStatus')}
            allowClear
            onChange={handleStatusChange}
          >
            <Option value='pending'>
              {t('sparkery.dispatch.status.pending')}
            </Option>
            <Option value='assigned'>
              {t('sparkery.dispatch.status.assigned')}
            </Option>
            <Option value='in_progress'>
              {t('sparkery.dispatch.status.inProgress')}
            </Option>
            <Option value='completed'>
              {t('sparkery.dispatch.status.completed')}
            </Option>
            <Option value='cancelled'>
              {t('sparkery.dispatch.status.cancelled')}
            </Option>
          </Select>
        </Space>
      </Space>
      <Button className='dispatch-filter-button' onClick={onRefresh}>
        {t('sparkery.dispatch.common.refresh')}
      </Button>
    </Space>
  );
};

export default DispatchFiltersBar;
