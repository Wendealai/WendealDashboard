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

const { Title, Text } = Typography;

const WEEKDAY_OPTIONS: Array<{ value: DispatchWeekday; label: string }> = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
];

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

const formatWeekdayTags = (weekdays: DispatchWeekday[]): React.ReactNode =>
  weekdays.length === 0 ? (
    <Text type='secondary'>Not set</Text>
  ) : (
    <Space size={4} wrap>
      {weekdays.map(day => (
        <Tag key={day}>
          {WEEKDAY_OPTIONS.find(option => option.value === day)?.label}
        </Tag>
      ))}
    </Space>
  );

const DispatchRecurringTemplatesPage: React.FC = () => {
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
    message.success('Recurring templates refreshed');
  };

  const handleAutoFill = async () => {
    setAutoFilling(true);
    const result = await dispatch(generateDispatchJobsFromRecurring(weekRange));
    setAutoFilling(false);
    if (generateDispatchJobsFromRecurring.fulfilled.match(result)) {
      const count = result.payload.length;
      message.success(
        count > 0
          ? `Generated ${count} recurring tasks for this week`
          : 'No new recurring tasks needed for this week'
      );
      await dispatch(fetchDispatchJobs(weekRange));
      return;
    }
    message.error(
      extractThunkError(result, 'Failed to auto fill recurring tasks')
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
      message.success('Recurring template updated');
      setEditingTemplate(null);
      return;
    }
    message.error(
      extractThunkError(result, 'Failed to update recurring template')
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
      message.info('Fee unchanged');
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
      message.success(`Fixed fee updated to $${normalizedFee.toFixed(2)}`);
      return;
    }
    message.error(extractThunkError(result, 'Failed to save fixed fee'));
  };

  const columns: ColumnsType<DispatchCustomerProfile> = [
    {
      title: 'Customer',
      key: 'customer',
      render: (_, record) => (
        <Space direction='vertical' size={0}>
          <Text strong>{record.name}</Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.address || 'No address'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Weekdays',
      key: 'weekdays',
      width: 180,
      render: (_, record) =>
        formatWeekdayTags(normalizeRecurringWeekdays(record)),
    },
    {
      title: 'Time',
      key: 'time',
      width: 140,
      render: (_, record) => (
        <Text>
          {record.recurringStartTime || '--:--'} -{' '}
          {record.recurringEndTime || '--:--'}
        </Text>
      ),
    },
    {
      title: 'Service',
      key: 'service',
      width: 130,
      render: (_, record) => (
        <Tag>{record.recurringServiceType || 'regular'}</Tag>
      ),
    },
    {
      title: 'Priority',
      key: 'priority',
      width: 90,
      align: 'center',
      render: (_, record) => <Text>{record.recurringPriority || 3}</Text>,
    },
    {
      title: 'Fixed Fee (AUD)',
      key: 'fee',
      width: 240,
      render: (_, record) => (
        <Space>
          <InputNumber
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
            loading={savingFeeId === record.id}
            onClick={() => handleQuickSaveFee(record)}
          >
            Save
          </Button>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 110,
      render: (_, record) => (
        <Button size='small' onClick={() => openEdit(record)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <div className='dispatch-dashboard-page' style={{ padding: 12 }}>
      <div className='dispatch-dashboard-header'>
        <div>
          <Title
            level={4}
            className='dispatch-dashboard-title'
            style={{ marginBottom: 4 }}
          >
            Recurring Task Templates
          </Title>
          <Text className='dispatch-dashboard-subtitle' type='secondary'>
            Edit recurring unit fee and schedule here, then auto fill weekly
            jobs.
          </Text>
        </div>
        <Space className='dispatch-dashboard-actions' wrap>
          <Button onClick={() => navigate('/sparkery/dispatch')}>
            Open Dispatch Board
          </Button>
          <Button onClick={() => navigate('/sparkery/finance')}>
            Open Finance Panel
          </Button>
        </Space>
      </div>

      <Card size='small' style={{ marginBottom: 12 }}>
        <Space wrap>
          <Text type='secondary'>Week Start</Text>
          <Input
            type='date'
            value={selectedWeekStart}
            onChange={event =>
              dispatch(setSelectedWeekStart(event.target.value))
            }
            style={{ width: 180 }}
          />
          <Button onClick={handleRefresh}>Refresh Templates</Button>
          <Button type='primary' loading={autoFilling} onClick={handleAutoFill}>
            Auto Fill This Week
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

      <Card size='small' title={`Recurring Templates (${templates.length})`}>
        <Table<DispatchCustomerProfile>
          rowKey='id'
          size='small'
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
            ? `Edit Recurring Template - ${editingTemplate.name}`
            : 'Edit Recurring Template'
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
            label='Customer Name'
            name='name'
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label='Address' name='address'>
            <Input />
          </Form.Item>
          <Form.Item label='Phone' name='phone'>
            <Input />
          </Form.Item>
          <Form.Item label='Recurring Enabled' name='recurringEnabled'>
            <Select>
              <Select.Option value={true}>Enabled</Select.Option>
              <Select.Option value={false}>Disabled</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            label='Weekdays'
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
                    new Error('Please choose at least one weekday')
                  );
                },
              },
            ]}
          >
            <Select
              mode='multiple'
              maxTagCount={4}
              options={WEEKDAY_OPTIONS}
              placeholder='Choose recurring weekdays'
            />
          </Form.Item>
          <Form.Item label='Start Time' name='recurringStartTime'>
            <Input type='time' />
          </Form.Item>
          <Form.Item label='End Time' name='recurringEndTime'>
            <Input type='time' />
          </Form.Item>
          <Form.Item label='Service Type' name='recurringServiceType'>
            <Select>
              <Select.Option value='bond'>Bond</Select.Option>
              <Select.Option value='airbnb'>Airbnb</Select.Option>
              <Select.Option value='regular'>Regular</Select.Option>
              <Select.Option value='commercial'>Commercial</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label='Priority' name='recurringPriority'>
            <Select>
              <Select.Option value={1}>1</Select.Option>
              <Select.Option value={2}>2</Select.Option>
              <Select.Option value={3}>3</Select.Option>
              <Select.Option value={4}>4</Select.Option>
              <Select.Option value={5}>5</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label='Recurring Fixed Fee (AUD)' name='recurringFee'>
            <InputNumber min={0} precision={2} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label='Default Task Title' name='defaultJobTitle'>
            <Input />
          </Form.Item>
          <Form.Item label='Default Task Description' name='defaultDescription'>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label='Default Notes' name='defaultNotes'>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DispatchRecurringTemplatesPage;
