import React from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useNavigate } from 'react-router-dom';
import {
  clearDispatchError,
  fetchDispatchCustomerProfiles,
  fetchDispatchJobs,
  generateDispatchJobsFromRecurring,
  selectDispatchCustomerProfiles,
  selectDispatchState,
  setSelectedWeekStart,
  upsertDispatchCustomerProfile,
} from '@/store/slices/sparkeryDispatchSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import type {
  DispatchCustomerProfile,
  DispatchServiceType,
  DispatchWeekday,
  UpsertDispatchCustomerProfilePayload,
} from './dispatch/types';
import { useTranslation } from 'react-i18next';
import './sparkery.css';

const { Title, Text } = Typography;

const WEEKDAY_OPTIONS: DispatchWeekday[] = [1, 2, 3, 4, 5, 6, 7];

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

const normalizeRecurringWeekdays = (
  profile: Pick<
    DispatchCustomerProfile,
    'recurringWeekdays' | 'recurringWeekday'
  >
): DispatchWeekday[] => {
  const source = Array.isArray(profile.recurringWeekdays)
    ? profile.recurringWeekdays
    : profile.recurringWeekday
      ? [profile.recurringWeekday]
      : [];
  const valid = source.filter((value): value is DispatchWeekday =>
    [1, 2, 3, 4, 5, 6, 7].includes(value)
  );
  return Array.from(new Set(valid)).sort((a, b) => a - b);
};

const extractThunkError = (
  action: { error?: { message?: string } },
  fallback: string
): string => action.error?.message || fallback;

const isRecurringTemplate = (profile: DispatchCustomerProfile): boolean =>
  Boolean(
    profile.recurringEnabled ||
      (Array.isArray(profile.recurringWeekdays) &&
        profile.recurringWeekdays.length > 0) ||
      profile.recurringWeekday
  );

const profileToPayload = (
  profile: DispatchCustomerProfile,
  override: Partial<UpsertDispatchCustomerProfilePayload> = {}
): UpsertDispatchCustomerProfilePayload => {
  const weekdays = normalizeRecurringWeekdays(profile);
  const payload: UpsertDispatchCustomerProfilePayload = {
    id: profile.id,
    name: profile.name,
    recurringEnabled:
      typeof profile.recurringEnabled === 'boolean'
        ? profile.recurringEnabled
        : true,
    recurringWeekdays: weekdays,
  };

  const firstWeekday = weekdays[0];
  if (firstWeekday) {
    payload.recurringWeekday = firstWeekday;
  }
  if (profile.address) payload.address = profile.address;
  if (profile.phone) payload.phone = profile.phone;
  if (profile.defaultJobTitle)
    payload.defaultJobTitle = profile.defaultJobTitle;
  if (profile.defaultDescription) {
    payload.defaultDescription = profile.defaultDescription;
  }
  if (profile.defaultNotes) payload.defaultNotes = profile.defaultNotes;
  if (profile.recurringStartTime) {
    payload.recurringStartTime = profile.recurringStartTime;
  }
  if (profile.recurringEndTime)
    payload.recurringEndTime = profile.recurringEndTime;
  if (profile.recurringServiceType) {
    payload.recurringServiceType = profile.recurringServiceType;
  }
  if (profile.recurringPriority)
    payload.recurringPriority = profile.recurringPriority;
  if (
    typeof profile.recurringFee === 'number' &&
    Number.isFinite(profile.recurringFee)
  ) {
    payload.recurringFee = Number(profile.recurringFee.toFixed(2));
  }

  return {
    ...payload,
    ...override,
  };
};

const formatWeekdayTags = (
  weekdays: DispatchWeekday[],
  resolveWeekdayLabel: (day: DispatchWeekday) => string,
  emptyText: string
): React.ReactNode =>
  weekdays.length === 0 ? (
    <Text type='secondary' className='dispatch-recurring-empty-text'>
      {emptyText}
    </Text>
  ) : (
    <Space size={[4, 4]} wrap className='dispatch-recurring-weekday-tags'>
      {weekdays.map(day => (
        <Tag key={day} className='dispatch-recurring-weekday-tag'>
          {resolveWeekdayLabel(day)}
        </Tag>
      ))}
    </Space>
  );

const DispatchRecurringTemplatesPage: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { selectedWeekStart, isLoading, error } =
    useAppSelector(selectDispatchState);
  const customerProfiles = useAppSelector(selectDispatchCustomerProfiles);
  const [feeDrafts, setFeeDrafts] = React.useState<
    Record<string, number | null>
  >({});
  const [editingTemplate, setEditingTemplate] =
    React.useState<DispatchCustomerProfile | null>(null);
  const [savingFeeId, setSavingFeeId] = React.useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = React.useState(false);
  const [autoFilling, setAutoFilling] = React.useState(false);
  const [form] = Form.useForm<UpsertDispatchCustomerProfilePayload>();
  const recurringEnabled = Form.useWatch('recurringEnabled', form);
  const weekdaySelectOptions = React.useMemo(
    () =>
      WEEKDAY_OPTIONS.map(day => ({
        value: day,
        label: t(`sparkery.dispatch.common.weekday.short.${day}`),
      })),
    [t]
  );

  const resolveWeekdayLabel = React.useCallback(
    (day: DispatchWeekday) =>
      t(`sparkery.dispatch.common.weekday.short.${day}`),
    [t]
  );

  const weekRange = React.useMemo(
    () => ({
      weekStart: selectedWeekStart,
      weekEnd: getWeekEnd(selectedWeekStart),
    }),
    [selectedWeekStart]
  );

  const templates = React.useMemo(
    () =>
      customerProfiles
        .filter(isRecurringTemplate)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [customerProfiles]
  );

  React.useEffect(() => {
    dispatch(fetchDispatchCustomerProfiles());
  }, [dispatch]);

  React.useEffect(() => {
    setFeeDrafts(prev => {
      const next: Record<string, number | null> = {};
      templates.forEach(template => {
        const previousFee = prev[template.id];
        if (typeof previousFee === 'number') {
          next[template.id] = previousFee;
          return;
        }
        next[template.id] = Number((template.recurringFee || 0).toFixed(2));
      });
      return next;
    });
  }, [templates]);

  const handleRefresh = async () => {
    await dispatch(fetchDispatchCustomerProfiles());
    message.success(
      t('sparkery.dispatch.recurringTemplates.messages.templatesRefreshed')
    );
  };

  const handleAutoFill = async () => {
    setAutoFilling(true);
    const result = await dispatch(generateDispatchJobsFromRecurring(weekRange));
    setAutoFilling(false);
    if (generateDispatchJobsFromRecurring.fulfilled.match(result)) {
      const count = result.payload.length;
      message.success(
        count > 0
          ? t(
              'sparkery.dispatch.recurringTemplates.messages.generatedRecurringTasks',
              {
                count,
              }
            )
          : t(
              'sparkery.dispatch.recurringTemplates.messages.noRecurringTasksNeeded'
            )
      );
      await dispatch(fetchDispatchJobs(weekRange));
      return;
    }
    message.error(
      extractThunkError(
        result,
        t('sparkery.dispatch.recurringTemplates.messages.autoFillFailed')
      )
    );
  };

  const openEdit = (template: DispatchCustomerProfile) => {
    const weekdays = normalizeRecurringWeekdays(template);
    form.resetFields();
    const formValue: UpsertDispatchCustomerProfilePayload = {
      id: template.id,
      name: template.name,
      recurringEnabled:
        typeof template.recurringEnabled === 'boolean'
          ? template.recurringEnabled
          : true,
      recurringWeekdays: weekdays,
      recurringStartTime: template.recurringStartTime || '09:00',
      recurringEndTime: template.recurringEndTime || '11:00',
      recurringServiceType:
        (template.recurringServiceType as DispatchServiceType) || 'regular',
      recurringPriority: template.recurringPriority || 3,
      recurringFee: Number((template.recurringFee || 0).toFixed(2)),
    };
    const firstWeekday = weekdays[0];
    if (firstWeekday) {
      formValue.recurringWeekday = firstWeekday;
    }
    if (template.address) formValue.address = template.address;
    if (template.phone) formValue.phone = template.phone;
    if (template.defaultJobTitle) {
      formValue.defaultJobTitle = template.defaultJobTitle;
    }
    if (template.defaultDescription) {
      formValue.defaultDescription = template.defaultDescription;
    }
    if (template.defaultNotes) formValue.defaultNotes = template.defaultNotes;
    form.setFieldsValue(formValue);
    setEditingTemplate(template);
  };

  const handleSaveTemplate = async (
    values: UpsertDispatchCustomerProfilePayload
  ) => {
    const weekdays = Array.isArray(values.recurringWeekdays)
      ? values.recurringWeekdays
      : values.recurringWeekday
        ? [values.recurringWeekday]
        : [];
    const normalizedWeekdays = Array.from(new Set(weekdays)).sort(
      (a, b) => a - b
    ) as DispatchWeekday[];
    const payload: UpsertDispatchCustomerProfilePayload = {
      ...values,
      recurringEnabled:
        typeof values.recurringEnabled === 'boolean'
          ? values.recurringEnabled
          : true,
      recurringWeekdays: normalizedWeekdays,
    };
    const firstWeekday = normalizedWeekdays[0];
    if (firstWeekday) {
      payload.recurringWeekday = firstWeekday;
    }
    if (
      typeof payload.recurringFee === 'number' &&
      Number.isFinite(payload.recurringFee)
    ) {
      payload.recurringFee = Number(payload.recurringFee.toFixed(2));
    }

    setSavingTemplate(true);
    const result = await dispatch(upsertDispatchCustomerProfile(payload));
    setSavingTemplate(false);
    if (upsertDispatchCustomerProfile.fulfilled.match(result)) {
      message.success(
        t('sparkery.dispatch.recurringTemplates.messages.templateUpdated')
      );
      setEditingTemplate(null);
      return;
    }
    message.error(
      extractThunkError(
        result,
        t('sparkery.dispatch.recurringTemplates.messages.templateUpdateFailed')
      )
    );
  };

  const handleQuickSaveFee = async (template: DispatchCustomerProfile) => {
    const feeValue = feeDrafts[template.id];
    const normalizedFee =
      typeof feeValue === 'number' && Number.isFinite(feeValue)
        ? Number(feeValue.toFixed(2))
        : 0;
    const currentFee = Number((template.recurringFee || 0).toFixed(2));
    if (normalizedFee === currentFee) {
      message.info(
        t('sparkery.dispatch.recurringTemplates.messages.feeUnchanged')
      );
      return;
    }

    setSavingFeeId(template.id);
    const result = await dispatch(
      upsertDispatchCustomerProfile(
        profileToPayload(template, {
          recurringFee: normalizedFee,
        })
      )
    );
    setSavingFeeId(null);
    if (upsertDispatchCustomerProfile.fulfilled.match(result)) {
      message.success(
        t('sparkery.dispatch.recurringTemplates.messages.fixedFeeUpdated', {
          amount: normalizedFee.toFixed(2),
        })
      );
      return;
    }
    message.error(
      extractThunkError(
        result,
        t('sparkery.dispatch.recurringTemplates.messages.saveFixedFeeFailed')
      )
    );
  };

  const columns: ColumnsType<DispatchCustomerProfile> = [
    {
      title: t('sparkery.dispatch.recurringTemplates.table.customer'),
      key: 'customer',
      render: (_, record) => (
        <Space
          direction='vertical'
          size={0}
          className='dispatch-recurring-customer-cell'
        >
          <Text strong className='dispatch-recurring-customer-name'>
            {record.name}
          </Text>
          <Text
            type='secondary'
            className='dispatch-muted-text dispatch-recurring-customer-address'
          >
            {record.address || t('sparkery.dispatch.common.noAddress')}
          </Text>
        </Space>
      ),
    },
    {
      title: t('sparkery.dispatch.recurringTemplates.table.weekdays'),
      key: 'weekdays',
      width: 180,
      render: (_, record) =>
        formatWeekdayTags(
          normalizeRecurringWeekdays(record),
          resolveWeekdayLabel,
          t('sparkery.dispatch.recurringTemplates.notSet')
        ),
    },
    {
      title: t('sparkery.dispatch.recurringTemplates.table.time'),
      key: 'time',
      width: 140,
      render: (_, record) => (
        <Text className='dispatch-recurring-time-text'>
          {record.recurringStartTime || '--:--'} -{' '}
          {record.recurringEndTime || '--:--'}
        </Text>
      ),
    },
    {
      title: t('sparkery.dispatch.recurringTemplates.table.service'),
      key: 'service',
      width: 130,
      render: (_, record) => (
        <Tag className='dispatch-recurring-service-tag'>
          {t(
            `sparkery.dispatch.common.serviceType.${record.recurringServiceType || 'regular'}`
          )}
        </Tag>
      ),
    },
    {
      title: t('sparkery.dispatch.recurringTemplates.table.priority'),
      key: 'priority',
      width: 90,
      align: 'center',
      render: (_, record) => (
        <Text className='dispatch-recurring-priority-text'>
          {record.recurringPriority || 3}
        </Text>
      ),
    },
    {
      title: t('sparkery.dispatch.recurringTemplates.table.fixedFeeAud'),
      key: 'fee',
      width: 240,
      render: (_, record) => (
        <Space className='dispatch-recurring-fee-cell' size={8}>
          <InputNumber
            className='dispatch-recurring-fee-input'
            min={0}
            precision={2}
            value={feeDrafts[record.id] ?? 0}
            onChange={value =>
              setFeeDrafts(prev => ({
                ...prev,
                [record.id]: typeof value === 'number' ? value : null,
              }))
            }
          />
          <Button
            size='small'
            className='dispatch-recurring-save-btn'
            loading={savingFeeId === record.id}
            onClick={() => handleQuickSaveFee(record)}
          >
            {t('sparkery.dispatch.recurringTemplates.actions.save')}
          </Button>
        </Space>
      ),
    },
    {
      title: t('sparkery.dispatch.recurringTemplates.table.actions'),
      key: 'actions',
      width: 110,
      render: (_, record) => (
        <Button
          size='small'
          className='dispatch-recurring-edit-btn'
          onClick={() => openEdit(record)}
        >
          {t('sparkery.dispatch.recurringTemplates.actions.edit')}
        </Button>
      ),
    },
  ];

  return (
    <div className='dispatch-dashboard-page dispatch-dashboard-shell'>
      <div className='dispatch-dashboard-header'>
        <div>
          <Title level={4} className='dispatch-dashboard-title'>
            {t('sparkery.dispatch.recurringTemplates.title')}
          </Title>
          <Text className='dispatch-dashboard-subtitle' type='secondary'>
            {t('sparkery.dispatch.recurringTemplates.subtitle')}
          </Text>
        </div>
        <Space className='dispatch-dashboard-actions' wrap>
          <Button onClick={() => navigate('/sparkery/dispatch')}>
            {t(
              'sparkery.dispatch.recurringTemplates.actions.openDispatchBoard'
            )}
          </Button>
          <Button onClick={() => navigate('/sparkery/finance')}>
            {t('sparkery.dispatch.recurringTemplates.actions.openFinancePanel')}
          </Button>
        </Space>
      </div>

      <Card
        size='small'
        className='dispatch-dashboard-section-card dispatch-recurring-week-card'
      >
        <Space wrap className='dispatch-recurring-week-bar'>
          <Text type='secondary' className='dispatch-recurring-week-label'>
            {t('sparkery.dispatch.filters.weekStart')}
          </Text>
          <Input
            type='date'
            className='dispatch-recurring-week-input'
            value={selectedWeekStart}
            onChange={event => {
              const nextWeekStart = event.target.value;
              if (!nextWeekStart) {
                return;
              }
              dispatch(setSelectedWeekStart(nextWeekStart));
            }}
          />
          <Button onClick={handleRefresh}>
            {t('sparkery.dispatch.recurringTemplates.actions.refreshTemplates')}
          </Button>
          <Button type='primary' loading={autoFilling} onClick={handleAutoFill}>
            {t('sparkery.dispatch.recurringTemplates.actions.autoFillThisWeek')}
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

      <Card
        size='small'
        title={t('sparkery.dispatch.recurringTemplates.tableTitle', {
          count: templates.length,
        })}
        className='dispatch-recurring-table-card'
      >
        <Table<DispatchCustomerProfile>
          rowKey='id'
          size='small'
          className='dispatch-recurring-table'
          loading={Boolean(isLoading)}
          pagination={{ pageSize: 10 }}
          columns={columns}
          dataSource={templates}
          scroll={{ x: 1050 }}
        />
      </Card>

      <Modal
        title={
          editingTemplate
            ? t(
                'sparkery.dispatch.recurringTemplates.modal.editTitleWithName',
                {
                  name: editingTemplate.name,
                }
              )
            : t('sparkery.dispatch.recurringTemplates.modal.editTitle')
        }
        open={Boolean(editingTemplate)}
        onCancel={() => setEditingTemplate(null)}
        onOk={() => form.submit()}
        confirmLoading={savingTemplate}
        destroyOnHidden
        width={720}
      >
        <Form
          form={form}
          layout='vertical'
          onFinish={handleSaveTemplate}
          initialValues={{
            recurringEnabled: true,
            recurringWeekdays: [1],
            recurringServiceType: 'regular',
            recurringPriority: 3,
            recurringFee: 0,
            recurringStartTime: '09:00',
            recurringEndTime: '11:00',
          }}
        >
          <Form.Item name='id' hidden>
            <Input />
          </Form.Item>
          <Form.Item
            label={t('sparkery.dispatch.recurringTemplates.form.customerName')}
            name='name'
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={t('sparkery.dispatch.recurringTemplates.form.address')}
            name='address'
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={t('sparkery.dispatch.recurringTemplates.form.phone')}
            name='phone'
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={t(
              'sparkery.dispatch.recurringTemplates.form.recurringEnabled'
            )}
            name='recurringEnabled'
          >
            <Select>
              <Select.Option value={true}>
                {t('sparkery.dispatch.common.enabled')}
              </Select.Option>
              <Select.Option value={false}>
                {t('sparkery.dispatch.common.disabled')}
              </Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            label={t('sparkery.dispatch.recurringTemplates.form.weekdays')}
            name='recurringWeekdays'
            rules={[
              {
                validator(_, value) {
                  if (!recurringEnabled) {
                    return Promise.resolve();
                  }
                  if (Array.isArray(value) && value.length > 0) {
                    return Promise.resolve();
                  }
                  return Promise.reject(
                    new Error(
                      t(
                        'sparkery.dispatch.recurringTemplates.messages.chooseAtLeastOneWeekday'
                      )
                    )
                  );
                },
              },
            ]}
          >
            <Select
              mode='multiple'
              maxTagCount={4}
              options={weekdaySelectOptions}
              placeholder={t(
                'sparkery.dispatch.recurringTemplates.form.weekdaysPlaceholder'
              )}
            />
          </Form.Item>
          <Form.Item
            label={t('sparkery.dispatch.recurringTemplates.form.startTime')}
            name='recurringStartTime'
          >
            <Input type='time' />
          </Form.Item>
          <Form.Item
            label={t('sparkery.dispatch.recurringTemplates.form.endTime')}
            name='recurringEndTime'
          >
            <Input type='time' />
          </Form.Item>
          <Form.Item
            label={t('sparkery.dispatch.recurringTemplates.form.serviceType')}
            name='recurringServiceType'
          >
            <Select>
              <Select.Option value='bond'>
                {t('sparkery.dispatch.common.serviceType.bond')}
              </Select.Option>
              <Select.Option value='airbnb'>
                {t('sparkery.dispatch.common.serviceType.airbnb')}
              </Select.Option>
              <Select.Option value='regular'>
                {t('sparkery.dispatch.common.serviceType.regular')}
              </Select.Option>
              <Select.Option value='commercial'>
                {t('sparkery.dispatch.common.serviceType.commercial')}
              </Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            label={t('sparkery.dispatch.recurringTemplates.form.priority')}
            name='recurringPriority'
          >
            <Select>
              <Select.Option value={1}>1</Select.Option>
              <Select.Option value={2}>2</Select.Option>
              <Select.Option value={3}>3</Select.Option>
              <Select.Option value={4}>4</Select.Option>
              <Select.Option value={5}>5</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            label={t(
              'sparkery.dispatch.recurringTemplates.form.recurringFixedFeeAud'
            )}
            name='recurringFee'
          >
            <InputNumber
              className='dispatch-form-number-full-width'
              min={0}
              precision={2}
            />
          </Form.Item>
          <Form.Item
            label={t(
              'sparkery.dispatch.recurringTemplates.form.defaultTaskTitle'
            )}
            name='defaultJobTitle'
          >
            <Input />
          </Form.Item>
          <Form.Item
            label={t(
              'sparkery.dispatch.recurringTemplates.form.defaultTaskDescription'
            )}
            name='defaultDescription'
          >
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item
            label={t('sparkery.dispatch.recurringTemplates.form.defaultNotes')}
            name='defaultNotes'
          >
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DispatchRecurringTemplatesPage;
