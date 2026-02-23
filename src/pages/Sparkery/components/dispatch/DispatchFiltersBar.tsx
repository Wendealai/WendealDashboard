import React from 'react';
import { Button, Input, Select, Space } from 'antd';
import type { DispatchFilters } from '../../dispatch/types';

const { Option } = Select;

interface DispatchFiltersBarProps {
  weekStart: string;
  filters: DispatchFilters;
  onWeekChange: (dateText: string) => void;
  onFiltersChange: (filters: DispatchFilters) => void;
  onRefresh: () => void;
}

const DispatchFiltersBar: React.FC<DispatchFiltersBarProps> = ({
  weekStart,
  filters,
  onWeekChange,
  onFiltersChange,
  onRefresh,
}) => {
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
          <span className='dispatch-filter-label'>Week Start</span>
          <Input
            className='dispatch-filter-input dispatch-filter-date-input'
            type='date'
            value={weekStart}
            onChange={e => onWeekChange(e.target.value)}
          />
        </Space>
        <Space className='dispatch-filter-field' size={6}>
          <span className='dispatch-filter-label'>Status</span>
          <Select
            className='dispatch-filter-select dispatch-filter-status-select'
            value={filters.status || undefined}
            placeholder='Job status'
            allowClear
            onChange={handleStatusChange}
          >
            <Option value='pending'>Pending</Option>
            <Option value='assigned'>Assigned</Option>
            <Option value='in_progress'>In Progress</Option>
            <Option value='completed'>Completed</Option>
            <Option value='cancelled'>Cancelled</Option>
          </Select>
        </Space>
      </Space>
      <Button className='dispatch-filter-button' onClick={onRefresh}>
        Refresh
      </Button>
    </Space>
  );
};

export default DispatchFiltersBar;
