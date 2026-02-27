import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Button,
  Checkbox,
  Drawer,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Typography,
  type TableColumnsType,
  type TableProps,
} from 'antd';
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  PlusOutlined,
  SettingOutlined,
  SortAscendingOutlined,
  UndoOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface ColumnLayoutSetting {
  visible: boolean;
  order: number;
  width?: number;
}

type ColumnLayoutRecord = Record<string, ColumnLayoutSetting>;
type ColumnQuickFilterRecord = Record<string, string>;

interface ColumnQuickFilterConfig<T extends object> {
  placeholder?: string;
  match?: ((record: T, query: string) => boolean) | undefined;
}

type ColumnQuickFilterMap<T extends object> = Partial<
  Record<string, ColumnQuickFilterConfig<T> | false>
>;

interface ColumnSortConfig<T extends object> {
  label?: string;
  compare?: ((left: T, right: T) => number) | undefined;
}

type ColumnSortMap<T extends object> = Partial<
  Record<string, ColumnSortConfig<T> | false>
>;

type SortDirection = 'asc' | 'desc';

interface ColumnSortRule {
  id: string;
  direction: SortDirection;
}

interface SparkeryDataTableProps<T extends object>
  extends Omit<TableProps<T>, 'columns' | 'dataSource'> {
  tableId: string;
  columns: TableColumnsType<T>;
  dataSource: T[];
  onRowOpen?: ((record: T) => void) | undefined;
  toolbar?: React.ReactNode | undefined;
  showQuickFilterRow?: boolean | undefined;
  quickFilterColumns?: ColumnQuickFilterMap<T> | undefined;
  quickFilterEmptyHint?: string | undefined;
  showSortBuilder?: boolean | undefined;
  sortBuilderColumns?: ColumnSortMap<T> | undefined;
  virtualizeThreshold?: number | undefined;
  enableRowKeyboardNavigation?: boolean | undefined;
}

const toStorageKey = (tableId: string) =>
  `sparkery_saas_table_layout_${tableId.trim().toLowerCase()}`;
const toQuickFilterStorageKey = (tableId: string) =>
  `sparkery_saas_table_quick_filters_${tableId.trim().toLowerCase()}`;
const toSortStorageKey = (tableId: string) =>
  `sparkery_saas_table_sort_rules_${tableId.trim().toLowerCase()}`;

const safeReadLayout = (key: string): ColumnLayoutRecord => {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return Object.entries(parsed).reduce<ColumnLayoutRecord>((acc, [id, value]) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return acc;
      }
      const rawVisible = (value as { visible?: unknown }).visible;
      const rawOrder = (value as { order?: unknown }).order;
      const rawWidth = (value as { width?: unknown }).width;
      const visible = rawVisible !== false;
      const order =
        typeof rawOrder === 'number' && Number.isFinite(rawOrder)
          ? Math.max(0, Math.floor(rawOrder))
          : 0;
      const width =
        typeof rawWidth === 'number' && Number.isFinite(rawWidth)
          ? Math.max(80, Math.min(880, Math.floor(rawWidth)))
          : undefined;
      acc[id] = { visible, order, ...(typeof width === 'number' ? { width } : {}) };
      return acc;
    }, {});
  } catch {
    return {};
  }
};

const safeWriteLayout = (key: string, layout: ColumnLayoutRecord) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(layout));
  } catch {
    // ignore storage failures
  }
};

const safeReadQuickFilters = (key: string): ColumnQuickFilterRecord => {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return Object.entries(parsed).reduce<ColumnQuickFilterRecord>(
      (acc, [id, value]) => {
        if (typeof value === 'string') {
          acc[id] = value;
        }
        return acc;
      },
      {}
    );
  } catch {
    return {};
  }
};

const safeWriteQuickFilters = (key: string, filters: ColumnQuickFilterRecord) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(filters));
  } catch {
    // ignore storage failures
  }
};

const safeReadSortRules = (key: string): ColumnSortRule[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.reduce<ColumnSortRule[]>((acc, item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return acc;
      }
      const id = (item as { id?: unknown }).id;
      const direction = (item as { direction?: unknown }).direction;
      if (
        typeof id !== 'string' ||
        (direction !== 'asc' && direction !== 'desc')
      ) {
        return acc;
      }
      acc.push({ id, direction });
      return acc;
    }, []);
  } catch {
    return [];
  }
};

const safeWriteSortRules = (key: string, rules: ColumnSortRule[]) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(key, JSON.stringify(rules));
  } catch {
    // ignore storage failures
  }
};

const normalizeColumnId = <T extends object>(
  column: TableColumnsType<T>[number],
  index: number
): string => {
  const rawKey = column.key;
  if (typeof rawKey === 'string' || typeof rawKey === 'number') {
    return String(rawKey);
  }
  const rawDataIndex =
    'dataIndex' in column ? column.dataIndex : undefined;
  if (Array.isArray(rawDataIndex)) {
    return rawDataIndex.join('.');
  }
  if (typeof rawDataIndex === 'string' || typeof rawDataIndex === 'number') {
    return String(rawDataIndex);
  }
  return `column_${index}`;
};

const columnTitleText = <T extends object>(
  column: TableColumnsType<T>[number],
  fallback: string
): string => {
  const title = column.title;
  if (typeof title === 'string') {
    return title;
  }
  if (typeof title === 'number') {
    return String(title);
  }
  return fallback;
};

const resolveColumnValue = <T extends object>(
  record: T,
  column: TableColumnsType<T>[number],
  fallbackId: string
): unknown => {
  const rawDataIndex =
    'dataIndex' in column ? column.dataIndex : undefined;
  if (Array.isArray(rawDataIndex)) {
    return rawDataIndex.reduce<unknown>((acc, currentKey) => {
      if (acc === null || acc === undefined) {
        return undefined;
      }
      return (acc as Record<string, unknown>)[String(currentKey)];
    }, record as unknown);
  }
  if (
    typeof rawDataIndex === 'string' ||
    typeof rawDataIndex === 'number'
  ) {
    return (record as Record<string, unknown>)[String(rawDataIndex)];
  }
  return (record as Record<string, unknown>)[fallbackId];
};

const compareUnknownValues = (left: unknown, right: unknown): number => {
  const leftValue = left ?? '';
  const rightValue = right ?? '';
  if (typeof leftValue === 'number' && typeof rightValue === 'number') {
    return leftValue - rightValue;
  }
  const leftDate =
    typeof leftValue === 'string' ? Date.parse(leftValue) : Number.NaN;
  const rightDate =
    typeof rightValue === 'string' ? Date.parse(rightValue) : Number.NaN;
  if (Number.isFinite(leftDate) && Number.isFinite(rightDate)) {
    return leftDate - rightDate;
  }
  return String(leftValue).localeCompare(String(rightValue), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
};

function SparkeryDataTable<T extends object>({
  tableId,
  columns,
  dataSource,
  onRowOpen,
  toolbar,
  showQuickFilterRow = false,
  quickFilterColumns,
  quickFilterEmptyHint,
  showSortBuilder = false,
  sortBuilderColumns,
  virtualizeThreshold = 120,
  enableRowKeyboardNavigation = true,
  onRow,
  rowClassName,
  ...tableProps
}: SparkeryDataTableProps<T>) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sortDrawerOpen, setSortDrawerOpen] = useState(false);
  const storageKey = useMemo(() => toStorageKey(tableId), [tableId]);
  const quickFilterStorageKey = useMemo(
    () => toQuickFilterStorageKey(tableId),
    [tableId]
  );
  const sortStorageKey = useMemo(() => toSortStorageKey(tableId), [tableId]);

  const defaultLayout = useMemo<ColumnLayoutRecord>(
    () =>
      columns.reduce<ColumnLayoutRecord>((acc, column, index) => {
        const id = normalizeColumnId(column, index);
        acc[id] = {
          visible: true,
          order: index,
          ...(typeof column.width === 'number' ? { width: column.width } : {}),
        };
        return acc;
      }, {}),
    [columns]
  );

  const [layout, setLayout] = useState<ColumnLayoutRecord>(() =>
    safeReadLayout(storageKey)
  );
  const [quickFilters, setQuickFilters] = useState<ColumnQuickFilterRecord>(() =>
    safeReadQuickFilters(quickFilterStorageKey)
  );
  const [sortRules, setSortRules] = useState<ColumnSortRule[]>(() =>
    safeReadSortRules(sortStorageKey)
  );

  useEffect(() => {
    setLayout(prev => {
      const merged: ColumnLayoutRecord = {};
      Object.entries(defaultLayout).forEach(([id, defaults]) => {
        const existing = prev[id];
        merged[id] = {
          visible: existing?.visible ?? defaults.visible,
          order:
            typeof existing?.order === 'number' && Number.isFinite(existing.order)
              ? existing.order
              : defaults.order,
          ...(typeof existing?.width === 'number'
            ? { width: existing.width }
            : typeof defaults.width === 'number'
              ? { width: defaults.width }
              : {}),
        };
      });
      return merged;
    });
  }, [defaultLayout]);

  useEffect(() => {
    safeWriteLayout(storageKey, layout);
  }, [layout, storageKey]);

  useEffect(() => {
    safeWriteQuickFilters(quickFilterStorageKey, quickFilters);
  }, [quickFilterStorageKey, quickFilters]);

  useEffect(() => {
    safeWriteSortRules(sortStorageKey, sortRules);
  }, [sortRules, sortStorageKey]);

  const viewColumns = useMemo(() => {
    const ordered = columns
      .map((column, index) => {
        const id = normalizeColumnId(column, index);
        const setting = layout[id] || defaultLayout[id] || { visible: true, order: index };
        return { id, column, setting };
      })
      .sort((a, b) => a.setting.order - b.setting.order)
      .filter(item => item.setting.visible)
      .map(item => ({
        ...item.column,
        ...(typeof item.setting.width === 'number' ? { width: item.setting.width } : {}),
      }));
    return ordered;
  }, [columns, defaultLayout, layout]);

  const manageRows = useMemo(
    () =>
      columns
        .map((column, index) => {
          const id = normalizeColumnId(column, index);
          const setting = layout[id] || defaultLayout[id] || { visible: true, order: index };
          return {
            id,
            label: columnTitleText(column, id),
            setting,
          };
        })
        .sort((a, b) => a.setting.order - b.setting.order),
    [columns, defaultLayout, layout]
  );

  const filterableColumns = useMemo(
    () =>
      columns
        .map((column, index) => {
          const id = normalizeColumnId(column, index);
          const quickFilterOption = quickFilterColumns?.[id];
          if (quickFilterOption === false) {
            return null;
          }
          if (quickFilterOption) {
            return {
              id,
              label: columnTitleText(column, id),
              config: quickFilterOption,
              column,
            };
          }
          const rawDataIndex =
            'dataIndex' in column ? column.dataIndex : undefined;
          if (Array.isArray(rawDataIndex) && rawDataIndex.length > 0) {
            return {
              id,
              label: columnTitleText(column, id),
              config: {},
              column,
            };
          }
          if (
            typeof rawDataIndex === 'string' ||
            typeof rawDataIndex === 'number'
          ) {
            return {
              id,
              label: columnTitleText(column, id),
              config: {},
              column,
            };
          }
          return null;
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [columns, quickFilterColumns]
  );

  const sortableColumns = useMemo(
    () =>
      columns
        .map((column, index) => {
          const id = normalizeColumnId(column, index);
          const sortOption = sortBuilderColumns?.[id];
          if (sortOption === false) {
            return null;
          }
          if (sortOption) {
            return {
              id,
              label: sortOption.label || columnTitleText(column, id),
              config: sortOption,
              column,
            };
          }
          const rawDataIndex =
            'dataIndex' in column ? column.dataIndex : undefined;
          if (Array.isArray(rawDataIndex) && rawDataIndex.length > 0) {
            return {
              id,
              label: columnTitleText(column, id),
              config: {},
              column,
            };
          }
          if (
            typeof rawDataIndex === 'string' ||
            typeof rawDataIndex === 'number'
          ) {
            return {
              id,
              label: columnTitleText(column, id),
              config: {},
              column,
            };
          }
          return null;
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item)),
    [columns, sortBuilderColumns]
  );

  useEffect(() => {
    const allowed = new Set(filterableColumns.map(item => item.id));
    setQuickFilters(prev =>
      Object.entries(prev).reduce<ColumnQuickFilterRecord>((acc, [id, value]) => {
        if (allowed.has(id)) {
          acc[id] = value;
        }
        return acc;
      }, {})
    );
  }, [filterableColumns]);

  useEffect(() => {
    const allowed = new Set(sortableColumns.map(item => item.id));
    setSortRules(prev => prev.filter(rule => allowed.has(rule.id)));
  }, [sortableColumns]);

  const activeQuickFilters = useMemo(
    () =>
      Object.entries(quickFilters).reduce<ColumnQuickFilterRecord>(
        (acc, [id, value]) => {
          const normalized = value.trim().toLowerCase();
          if (normalized) {
            acc[id] = normalized;
          }
          return acc;
        },
        {}
      ),
    [quickFilters]
  );

  const hasActiveQuickFilters = useMemo(
    () => Object.keys(activeQuickFilters).length > 0,
    [activeQuickFilters]
  );

  const activeFilterDiagnostics = useMemo(() => {
    const filterableMap = new Map(
      filterableColumns.map(item => [item.id, item.label] as const)
    );
    return Object.entries(activeQuickFilters).map(([id, query]) => ({
      id,
      label: filterableMap.get(id) ?? id,
      query,
    }));
  }, [activeQuickFilters, filterableColumns]);

  const filteredDataSource = useMemo(() => {
    if (!showQuickFilterRow || !hasActiveQuickFilters) {
      return dataSource;
    }
    const filterableMap = new Map(
      filterableColumns.map(item => [item.id, item] as const)
    );

    return dataSource.filter(record => {
      return Object.entries(activeQuickFilters).every(([id, query]) => {
        const filterable = filterableMap.get(id);
        if (!filterable) {
          return true;
        }
        if (filterable.config?.match) {
          return filterable.config.match(record, query);
        }
        const rawValue = resolveColumnValue(record, filterable.column, id);
        const normalizedValue = String(rawValue ?? '').toLowerCase();
        return normalizedValue.includes(query);
      });
    });
  }, [
    activeQuickFilters,
    dataSource,
    filterableColumns,
    hasActiveQuickFilters,
    showQuickFilterRow,
  ]);

  const setQuickFilterValue = useCallback((id: string, value: string) => {
    setQuickFilters(prev => ({
      ...prev,
      [id]: value,
    }));
  }, []);

  const clearQuickFilters = useCallback(() => {
    setQuickFilters({});
  }, []);

  const sortedDataSource = useMemo(() => {
    if (!showSortBuilder || sortRules.length === 0) {
      return filteredDataSource;
    }
    const sortableMap = new Map(
      sortableColumns.map(item => [item.id, item] as const)
    );
    const normalizedRules = sortRules.filter(rule => sortableMap.has(rule.id));
    if (normalizedRules.length === 0) {
      return filteredDataSource;
    }
    return filteredDataSource
      .map((record, index) => ({ record, index }))
      .sort((left, right) => {
        for (const rule of normalizedRules) {
          const sortable = sortableMap.get(rule.id);
          if (!sortable) {
            continue;
          }
          const rawCompare = sortable.config?.compare
            ? sortable.config.compare(left.record, right.record)
            : compareUnknownValues(
                resolveColumnValue(left.record, sortable.column, sortable.id),
                resolveColumnValue(right.record, sortable.column, sortable.id)
              );
          if (rawCompare !== 0) {
            return rule.direction === 'asc' ? rawCompare : -rawCompare;
          }
        }
        return left.index - right.index;
      })
      .map(item => item.record);
  }, [
    filteredDataSource,
    showSortBuilder,
    sortRules,
    sortableColumns,
  ]);

  const addSortRule = useCallback(() => {
    const first = sortableColumns[0];
    if (!first) {
      return;
    }
    setSortRules(prev => [...prev, { id: first.id, direction: 'asc' }]);
  }, [sortableColumns]);

  const updateSortRule = useCallback(
    (index: number, patch: Partial<ColumnSortRule>) => {
      setSortRules(prev =>
        prev.map((rule, ruleIndex) =>
          ruleIndex === index ? { ...rule, ...patch } : rule
        )
      );
    },
    []
  );

  const removeSortRule = useCallback((index: number) => {
    setSortRules(prev => prev.filter((_, ruleIndex) => ruleIndex !== index));
  }, []);

  const clearSortRules = useCallback(() => {
    setSortRules([]);
  }, []);

  const sortColumnOptions = useMemo(
    () =>
      sortableColumns.map(item => ({
        label: item.label,
        value: item.id,
      })),
    [sortableColumns]
  );

  const shouldVirtualize = useMemo(() => {
    if (tableProps.virtual === false) {
      return false;
    }
    if (tableProps.virtual === true) {
      return true;
    }
    return sortedDataSource.length >= virtualizeThreshold;
  }, [sortedDataSource.length, tableProps.virtual, virtualizeThreshold]);

  const mergedScroll = useMemo<TableProps<T>['scroll']>(() => {
    const base = tableProps.scroll;
    if (!shouldVirtualize) {
      return base;
    }
    if (base && typeof base === 'object' && 'y' in base && base.y) {
      return base;
    }
    return {
      ...(base || {}),
      y: 560,
    };
  }, [shouldVirtualize, tableProps.scroll]);

  const mergedLocale = useMemo<
    NonNullable<TableProps<T>['locale']> | undefined
  >(() => {
    const baseLocale = tableProps.locale;
    const shouldShowDiagnostics =
      showQuickFilterRow &&
      hasActiveQuickFilters &&
      sortedDataSource.length === 0;
    if (!shouldShowDiagnostics) {
      return baseLocale;
    }
    return {
      ...(baseLocale || {}),
      emptyText: (
        <div className='sparkery-data-table-empty-diagnostics'>
          <Text strong>
            {quickFilterEmptyHint ||
              'No rows match the current quick filters.'}
          </Text>
          <div className='sparkery-data-table-empty-diagnostics-list'>
            {activeFilterDiagnostics.map(item => (
              <Text key={item.id} type='secondary'>
                {item.label}: {item.query}
              </Text>
            ))}
          </div>
          <Button size='small' onClick={clearQuickFilters}>
            Clear Filters
          </Button>
        </div>
      ),
    };
  }, [
    activeFilterDiagnostics,
    clearQuickFilters,
    sortedDataSource.length,
    hasActiveQuickFilters,
    quickFilterEmptyHint,
    showQuickFilterRow,
    tableProps.locale,
  ]);

  const toggleVisibility = useCallback((id: string, visible: boolean) => {
    setLayout(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { visible: true, order: 0 }),
        visible,
      },
    }));
  }, []);

  const setColumnWidth = useCallback((id: string, width: number | null) => {
    setLayout(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || { visible: true, order: 0 }),
        ...(typeof width === 'number' && Number.isFinite(width)
          ? { width: Math.max(80, Math.min(880, Math.floor(width))) }
          : {}),
      },
    }));
  }, []);

  const moveColumn = useCallback((id: string, direction: 'up' | 'down') => {
    setLayout(prev => {
      const sortedIds = Object.entries(prev)
        .sort((a, b) => a[1].order - b[1].order)
        .map(([currentId]) => currentId);
      const index = sortedIds.indexOf(id);
      if (index < 0) {
        return prev;
      }
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= sortedIds.length) {
        return prev;
      }
      const targetId = sortedIds[targetIndex];
      if (!targetId) {
        return prev;
      }
      const current = prev[id];
      const target = prev[targetId];
      if (!current || !target) {
        return prev;
      }
      return {
        ...prev,
        [id]: { ...current, order: target.order },
        [targetId]: { ...target, order: current.order },
      };
    });
  }, []);

  const resetLayout = useCallback(() => {
    setLayout(defaultLayout);
  }, [defaultLayout]);

  const mergedOnRow = useMemo<TableProps<T>['onRow']>(() => {
    if (!onRowOpen && !onRow && !enableRowKeyboardNavigation) {
      return onRow;
    }
    return (record, index) => {
      const base = onRow ? onRow(record, index) : {};
      return {
        ...base,
        tabIndex:
          enableRowKeyboardNavigation && typeof base?.tabIndex !== 'number'
            ? 0
            : base?.tabIndex,
        onKeyDown: event => {
          base?.onKeyDown?.(event);
          if (event.defaultPrevented) {
            return;
          }
          if (enableRowKeyboardNavigation) {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              const rowElement = event.currentTarget as HTMLElement;
              const parent = rowElement.parentElement;
              if (parent) {
                const rowNodes = Array.from(
                  parent.querySelectorAll<HTMLElement>('tr')
                ).filter(node => !node.classList.contains('ant-table-placeholder'));
                const currentIndex = rowNodes.indexOf(rowElement);
                if (currentIndex >= 0) {
                  const targetIndex =
                    event.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1;
                  const target = rowNodes[targetIndex];
                  if (target) {
                    event.preventDefault();
                    target.focus();
                    return;
                  }
                }
              }
            }
          }
          if ((event.key === 'Enter' || event.key === ' ') && onRowOpen) {
            event.preventDefault();
            onRowOpen(record);
          }
        },
      };
    };
  }, [enableRowKeyboardNavigation, onRow, onRowOpen]);

  const mergedRowClassName = useCallback(
    (record: T, index: number, indent: number) => {
      const base =
        typeof rowClassName === 'function'
          ? rowClassName(record, index, indent)
          : rowClassName || '';
      const quickOpenClass =
        onRowOpen || enableRowKeyboardNavigation
          ? ' sparkery-data-table-row-openable'
          : '';
      return `${base}${quickOpenClass}`.trim();
    },
    [enableRowKeyboardNavigation, onRowOpen, rowClassName]
  );

  return (
    <div className='sparkery-data-table'>
      <div className='sparkery-data-table-toolbar'>
        <Space>{toolbar}</Space>
        <Space>
          {showQuickFilterRow && (
            <Button
              size='small'
              disabled={!hasActiveQuickFilters}
              onClick={clearQuickFilters}
              aria-label='Clear quick filters'
            >
              Clear Filters
            </Button>
          )}
          {showSortBuilder && (
            <Button
              size='small'
              icon={<SortAscendingOutlined />}
              onClick={() => setSortDrawerOpen(true)}
              aria-label='Open sort builder'
            >
              Sort
            </Button>
          )}
          <Button
            size='small'
            icon={<UndoOutlined />}
            onClick={resetLayout}
            aria-label='Reset table layout'
          >
            Reset
          </Button>
          <Button
            size='small'
            icon={<SettingOutlined />}
            onClick={() => setDrawerOpen(true)}
            aria-label='Open table column settings'
          >
            Columns
          </Button>
        </Space>
      </div>
      {showQuickFilterRow && filterableColumns.length > 0 && (
        <div className='sparkery-data-table-quick-filters'>
          {filterableColumns.map(item => (
            <Input
              key={item.id}
              size='small'
              allowClear
              value={quickFilters[item.id] ?? ''}
              placeholder={
                item.config?.placeholder
                  ? item.config.placeholder
                  : `Filter ${item.label}`
              }
              onChange={event =>
                setQuickFilterValue(item.id, event.target.value)
              }
            />
          ))}
        </div>
      )}
      <Table<T>
        {...tableProps}
        {...(mergedOnRow ? { onRow: mergedOnRow } : {})}
        {...(rowClassName || onRowOpen || enableRowKeyboardNavigation
          ? { rowClassName: mergedRowClassName }
          : {})}
        {...(mergedLocale ? { locale: mergedLocale } : {})}
        {...(mergedScroll ? { scroll: mergedScroll } : {})}
        {...(shouldVirtualize ? { virtual: true } : {})}
        columns={viewColumns}
        dataSource={sortedDataSource}
      />
      <Drawer
        title='Table Column Settings'
        width={380}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <Space direction='vertical' className='sparkery-data-table-settings'>
          {manageRows.map((item, index) => (
            <div key={item.id} className='sparkery-data-table-settings-row'>
              <Checkbox
                checked={item.setting.visible}
                onChange={event => toggleVisibility(item.id, event.target.checked)}
              >
                <Text>{item.label}</Text>
              </Checkbox>
              <Space size={6}>
                <InputNumber
                  size='small'
                  min={80}
                  max={880}
                  value={item.setting.width ?? null}
                  onChange={value =>
                    setColumnWidth(item.id, typeof value === 'number' ? value : null)
                  }
                  placeholder='Width'
                />
                <Button
                  size='small'
                  icon={<ArrowUpOutlined />}
                  disabled={index === 0}
                  onClick={() => moveColumn(item.id, 'up')}
                  aria-label={`Move ${item.label} up`}
                />
                <Button
                  size='small'
                  icon={<ArrowDownOutlined />}
                  disabled={index === manageRows.length - 1}
                  onClick={() => moveColumn(item.id, 'down')}
                  aria-label={`Move ${item.label} down`}
                />
              </Space>
            </div>
          ))}
        </Space>
      </Drawer>
      <Drawer
        title='Sort Builder'
        width={400}
        open={sortDrawerOpen}
        onClose={() => setSortDrawerOpen(false)}
      >
        <Space direction='vertical' className='sparkery-data-table-sort-builder'>
          <Space>
            <Button
              size='small'
              icon={<PlusOutlined />}
              disabled={sortColumnOptions.length === 0}
              onClick={addSortRule}
            >
              Add Rule
            </Button>
            <Button
              size='small'
              icon={<UndoOutlined />}
              disabled={sortRules.length === 0}
              onClick={clearSortRules}
            >
              Clear Sort
            </Button>
          </Space>
          {sortRules.length === 0 ? (
            <Text type='secondary'>
              No sort rules yet. Add one to apply multi-column sorting.
            </Text>
          ) : (
            sortRules.map((rule, index) => (
              <Space
                key={`${rule.id}_${index}`}
                className='sparkery-data-table-sort-row'
                align='start'
              >
                <Select
                  size='small'
                  className='sparkery-data-table-sort-column-select'
                  value={rule.id}
                  options={sortColumnOptions}
                  onChange={value =>
                    updateSortRule(index, { id: String(value) })
                  }
                />
                <Select
                  size='small'
                  className='sparkery-data-table-sort-direction-select'
                  value={rule.direction}
                  options={[
                    { label: 'Ascending', value: 'asc' as const },
                    { label: 'Descending', value: 'desc' as const },
                  ]}
                  onChange={value =>
                    updateSortRule(index, { direction: value as SortDirection })
                  }
                />
                <Button
                  size='small'
                  icon={<DeleteOutlined />}
                  aria-label={`Remove sort rule ${index + 1}`}
                  onClick={() => removeSortRule(index)}
                />
              </Space>
            ))
          )}
        </Space>
      </Drawer>
    </div>
  );
}

export default SparkeryDataTable;
