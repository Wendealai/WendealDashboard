import React from 'react';
import {
  Button,
  Form,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type {
  DispatchCustomerProfile,
  DispatchEmployee,
  DispatchEmployeeLocation,
  UpsertDispatchCustomerProfilePayload,
  UpsertDispatchEmployeePayload,
} from '../../dispatch/types';
import {
  geocodeAddress,
  isGoogleMapsConfigured,
} from '@/services/googleMapsService';

const { Text } = Typography;
const WEEKDAY_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

interface ManualLocationFormValues {
  placeType: 'home' | 'departure' | 'custom';
  customLabel?: string;
  address?: string;
  lat?: number;
  lng?: number;
}

interface DispatchAdminSetupModalProps {
  open: boolean;
  employees: DispatchEmployee[];
  customerProfiles: DispatchCustomerProfile[];
  loading: boolean;
  onCancel: () => void;
  onSaveEmployee: (payload: UpsertDispatchEmployeePayload) => Promise<void>;
  onDeleteEmployee: (employeeId: string) => Promise<void>;
  onReportEmployeeLocation: (
    employeeId: string,
    location: Omit<DispatchEmployeeLocation, 'updatedAt'> & {
      updatedAt?: string;
    }
  ) => Promise<void>;
  onSaveCustomer: (
    payload: UpsertDispatchCustomerProfilePayload
  ) => Promise<DispatchCustomerProfile | void>;
  onMigrateLocalPeople: () => Promise<void>;
  onResetMigrationPrompt: () => void;
  onExportBackup: () => Promise<void>;
  onImportBackup: (file: File) => Promise<void>;
}

const DispatchAdminSetupModal: React.FC<DispatchAdminSetupModalProps> = ({
  open,
  employees,
  customerProfiles,
  loading,
  onCancel,
  onSaveEmployee,
  onDeleteEmployee,
  onReportEmployeeLocation,
  onSaveCustomer,
  onMigrateLocalPeople,
  onResetMigrationPrompt,
  onExportBackup,
  onImportBackup,
}) => {
  const [employeeForm] = Form.useForm<UpsertDispatchEmployeePayload>();
  const [customerForm] = Form.useForm<UpsertDispatchCustomerProfilePayload>();
  const [manualLocationForm] = Form.useForm<ManualLocationFormValues>();
  const [reportingEmployeeId, setReportingEmployeeId] = React.useState<
    string | null
  >(null);
  const [manualLocationEmployee, setManualLocationEmployee] =
    React.useState<DispatchEmployee | null>(null);
  const [manualLocationSaving, setManualLocationSaving] = React.useState(false);
  const [deletingEmployeeId, setDeletingEmployeeId] = React.useState<
    string | null
  >(null);

  const manualPlaceType = Form.useWatch('placeType', manualLocationForm);

  const getLocationReportLink = (employeeId: string): string => {
    const params = new URLSearchParams({ employeeId });
    return `${window.location.origin}/dispatch-location-report?${params.toString()}`;
  };

  const copyLocationReportLink = async (employeeId: string) => {
    const url = getLocationReportLink(employeeId);
    try {
      if (!navigator.clipboard?.writeText) {
        message.warning(`Copy not supported. Open link: ${url}`);
        return;
      }
      await navigator.clipboard.writeText(url);
      message.success('Location report link copied');
    } catch {
      message.error('Failed to copy location report link');
    }
  };

  const reportBrowserLocation = async (employeeId: string) => {
    if (!navigator.geolocation) {
      message.error('Current browser does not support geolocation');
      return;
    }

    setReportingEmployeeId(employeeId);
    navigator.geolocation.getCurrentPosition(
      async position => {
        try {
          await onReportEmployeeLocation(employeeId, {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracyM: position.coords.accuracy,
            source: 'gps',
          });
        } finally {
          setReportingEmployeeId(null);
        }
      },
      error => {
        setReportingEmployeeId(null);
        message.error(`Location report failed: ${error.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 10000,
      }
    );
  };

  const openManualLocation = (employee: DispatchEmployee) => {
    setManualLocationEmployee(employee);
    manualLocationForm.resetFields();
    manualLocationForm.setFieldsValue({
      placeType: 'departure',
      customLabel: '',
      address: '',
    });
  };

  const closeManualLocation = (force = false) => {
    if (manualLocationSaving && !force) {
      return;
    }
    setManualLocationEmployee(null);
    manualLocationForm.resetFields();
  };

  const resolveManualLabel = (values: ManualLocationFormValues): string => {
    if (values.placeType === 'home') {
      return 'Home';
    }
    if (values.placeType === 'departure') {
      return 'Today Departure';
    }
    return values.customLabel?.trim() || 'Manual Location';
  };

  const submitManualLocation = async (values: ManualLocationFormValues) => {
    const employee = manualLocationEmployee;
    if (!employee) {
      return;
    }

    setManualLocationSaving(true);
    try {
      let lat = values.lat;
      let lng = values.lng;

      if (
        typeof lat !== 'number' ||
        !Number.isFinite(lat) ||
        typeof lng !== 'number' ||
        !Number.isFinite(lng)
      ) {
        const address = values.address?.trim();
        if (!address) {
          message.warning('Please enter address or latitude/longitude');
          return;
        }
        if (!isGoogleMapsConfigured()) {
          message.error(
            'Google Maps is not configured. Please enter latitude and longitude manually.'
          );
          return;
        }
        const geocoded = await geocodeAddress(address);
        if (!geocoded) {
          message.error('Address geocoding failed. Please refine address.');
          return;
        }
        lat = geocoded.lat;
        lng = geocoded.lng;
      }

      const baseLabel = resolveManualLabel(values);
      const address = values.address?.trim();
      const label = address ? `${baseLabel}: ${address}` : baseLabel;

      await onReportEmployeeLocation(employee.id, {
        lat,
        lng,
        source: 'manual',
        label,
      });
      message.success('Manual location saved');
      closeManualLocation(true);
    } finally {
      setManualLocationSaving(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    setDeletingEmployeeId(employeeId);
    try {
      await onDeleteEmployee(employeeId);
      if (employeeForm.getFieldValue('id') === employeeId) {
        employeeForm.resetFields();
      }
    } catch (error) {
      message.error(
        error instanceof Error ? error.message : 'Failed to delete employee'
      );
    } finally {
      setDeletingEmployeeId(null);
    }
  };

  return (
    <Modal
      title='Dispatch Pre-setup (Employees & Customers)'
      open={open}
      onCancel={onCancel}
      footer={null}
      width={920}
      className='dispatch-admin-modal'
      destroyOnHidden
    >
      <Space className='dispatch-admin-toolbar' wrap>
        <Button
          loading={loading}
          className='dispatch-admin-toolbar-btn'
          onClick={onMigrateLocalPeople}
        >
          Migrate Local Data to Supabase
        </Button>
        <Button
          className='dispatch-admin-toolbar-btn'
          onClick={onResetMigrationPrompt}
        >
          Reset Migration Prompt
        </Button>
        <Button
          loading={loading}
          className='dispatch-admin-toolbar-btn'
          onClick={onExportBackup}
        >
          Export JSON Backup
        </Button>
        <Button loading={loading} className='dispatch-admin-toolbar-btn'>
          <label className='dispatch-admin-import-label'>
            Import JSON Backup
            <input
              type='file'
              accept='application/json'
              className='dispatch-admin-hidden-input'
              onChange={async event => {
                const file = event.target.files?.[0];
                if (!file) return;
                await onImportBackup(file);
                event.currentTarget.value = '';
              }}
            />
          </label>
        </Button>
      </Space>

      <Tabs
        className='dispatch-admin-tabs'
        items={[
          {
            key: 'employees',
            label: 'Employees',
            children: (
              <div className='dispatch-admin-grid'>
                <div>
                  <div className='dispatch-admin-panel-head'>
                    <Text strong className='dispatch-admin-panel-title'>
                      Current Employees
                    </Text>
                    <Text
                      type='secondary'
                      className='dispatch-admin-panel-subtitle'
                    >
                      Manage dispatch staff and location status.
                    </Text>
                  </div>
                  <div className='dispatch-admin-scroll'>
                    {employees.map(emp => (
                      <div key={emp.id} className='dispatch-admin-list-item'>
                        <Space
                          wrap
                          size={[6, 6]}
                          className='dispatch-admin-item-head'
                        >
                          <Text strong>{emp.name}</Text>
                          <Tag className='dispatch-admin-status-tag'>
                            {emp.status}
                          </Tag>
                          <Tag
                            color={emp.currentLocation ? 'green' : 'orange'}
                            className='dispatch-admin-location-tag'
                          >
                            {emp.currentLocation ? 'Located' : 'Unlocated'}
                          </Tag>
                          {emp.currentLocation && (
                            <Tag
                              color='green'
                              className='dispatch-admin-coord-tag'
                            >
                              {emp.currentLocation.lat.toFixed(4)},{' '}
                              {emp.currentLocation.lng.toFixed(4)}
                            </Tag>
                          )}
                        </Space>
                        {emp.currentLocation && (
                          <div>
                            <Text type='secondary'>
                              Updated:{' '}
                              {new Date(
                                emp.currentLocation.updatedAt
                              ).toLocaleString()}
                            </Text>
                          </div>
                        )}
                        <div className='dispatch-admin-item-actions'>
                          <Space size={[8, 6]} wrap>
                            <Button
                              size='small'
                              className='dispatch-admin-action-btn'
                              onClick={() => employeeForm.setFieldsValue(emp)}
                            >
                              Edit
                            </Button>
                            <Button
                              size='small'
                              className='dispatch-admin-action-btn'
                              loading={reportingEmployeeId === emp.id}
                              onClick={() => reportBrowserLocation(emp.id)}
                            >
                              Report GPS
                            </Button>
                            <Button
                              size='small'
                              className='dispatch-admin-action-btn'
                              onClick={() => copyLocationReportLink(emp.id)}
                            >
                              Copy Location Link
                            </Button>
                            <Button
                              size='small'
                              className='dispatch-admin-action-btn'
                              onClick={() => openManualLocation(emp)}
                            >
                              Manual Location
                            </Button>
                            <Popconfirm
                              title='Delete employee?'
                              description='This will remove the employee from dispatch and inspection lists.'
                              okText='Delete'
                              cancelText='Cancel'
                              okButtonProps={{ danger: true }}
                              onConfirm={() => handleDeleteEmployee(emp.id)}
                            >
                              <Button
                                size='small'
                                danger
                                className='dispatch-admin-action-btn'
                                loading={deletingEmployeeId === emp.id}
                              >
                                Delete
                              </Button>
                            </Popconfirm>
                          </Space>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className='dispatch-admin-panel-head'>
                    <Text strong className='dispatch-admin-panel-title'>
                      Add / Edit Employee
                    </Text>
                    <Text
                      type='secondary'
                      className='dispatch-admin-panel-subtitle'
                    >
                      Keep skills and status current for scheduling.
                    </Text>
                  </div>
                  <Form
                    form={employeeForm}
                    layout='vertical'
                    className='dispatch-admin-form'
                    initialValues={{ status: 'available', skills: ['regular'] }}
                    onFinish={async values => {
                      await onSaveEmployee(values);
                      employeeForm.resetFields();
                    }}
                  >
                    <Form.Item name='id' hidden>
                      <Input />
                    </Form.Item>
                    <Form.Item
                      label='Name'
                      name='name'
                      rules={[{ required: true }]}
                    >
                      <Input />
                    </Form.Item>
                    <Form.Item label='Phone' name='phone'>
                      <Input />
                    </Form.Item>
                    <Form.Item
                      label='Skills'
                      name='skills'
                      rules={[{ required: true }]}
                    >
                      <Select mode='multiple'>
                        <Select.Option value='bond'>Bond</Select.Option>
                        <Select.Option value='airbnb'>Airbnb</Select.Option>
                        <Select.Option value='regular'>Regular</Select.Option>
                        <Select.Option value='commercial'>
                          Commercial
                        </Select.Option>
                      </Select>
                    </Form.Item>
                    <Form.Item
                      label='Status'
                      name='status'
                      rules={[{ required: true }]}
                    >
                      <Select>
                        <Select.Option value='available'>
                          Available
                        </Select.Option>
                        <Select.Option value='off'>Off</Select.Option>
                      </Select>
                    </Form.Item>
                    <Button
                      type='primary'
                      htmlType='submit'
                      block
                      className='dispatch-admin-submit-btn'
                    >
                      Save Employee
                    </Button>
                  </Form>
                </div>
              </div>
            ),
          },
          {
            key: 'customers',
            label: 'Customers',
            children: (
              <div className='dispatch-admin-grid'>
                <div>
                  <div className='dispatch-admin-panel-head'>
                    <Text strong className='dispatch-admin-panel-title'>
                      Long-term Customers
                    </Text>
                    <Text
                      type='secondary'
                      className='dispatch-admin-panel-subtitle'
                    >
                      Recurring profiles used by weekly auto-fill.
                    </Text>
                  </div>
                  <div className='dispatch-admin-scroll'>
                    {customerProfiles.map(customer => (
                      <div
                        key={customer.id}
                        className='dispatch-admin-list-item'
                      >
                        <Text strong>{customer.name}</Text>
                        <div>
                          <Text type='secondary'>{customer.address}</Text>
                        </div>
                        <div>
                          <Text type='secondary'>
                            Recurring Fee: $
                            {Number(customer.recurringFee || 0).toFixed(2)}
                          </Text>
                        </div>
                        <div className='dispatch-admin-item-actions'>
                          <Button
                            size='small'
                            className='dispatch-admin-action-btn'
                            onClick={() =>
                              customerForm.setFieldsValue({
                                ...customer,
                                recurringWeekdays:
                                  customer.recurringWeekdays &&
                                  customer.recurringWeekdays.length > 0
                                    ? customer.recurringWeekdays
                                    : customer.recurringWeekday
                                      ? [customer.recurringWeekday]
                                      : [],
                              })
                            }
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className='dispatch-admin-panel-head'>
                    <Text strong className='dispatch-admin-panel-title'>
                      Add / Edit Customer
                    </Text>
                    <Text
                      type='secondary'
                      className='dispatch-admin-panel-subtitle'
                    >
                      Configure default task details and recurring rules.
                    </Text>
                  </div>
                  <Form
                    form={customerForm}
                    layout='vertical'
                    className='dispatch-admin-form'
                    initialValues={{
                      recurringEnabled: false,
                      recurringWeekday: 1,
                      recurringWeekdays: [1],
                      recurringServiceType: 'regular',
                      recurringPriority: 3,
                      recurringFee: 0,
                      recurringStartTime: '09:00',
                      recurringEndTime: '11:00',
                    }}
                    onFinish={async values => {
                      const weekdays = Array.isArray(values.recurringWeekdays)
                        ? values.recurringWeekdays
                        : values.recurringWeekday
                          ? [values.recurringWeekday]
                          : [];
                      const nextPayload: UpsertDispatchCustomerProfilePayload =
                        {
                          ...values,
                          recurringWeekdays: weekdays,
                        };
                      const firstWeekday = weekdays[0];
                      if (firstWeekday) {
                        nextPayload.recurringWeekday = firstWeekday;
                      }
                      await onSaveCustomer(nextPayload);
                      customerForm.resetFields();
                    }}
                  >
                    <Form.Item name='id' hidden>
                      <Input />
                    </Form.Item>
                    <Form.Item
                      label='Name'
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
                    <Form.Item
                      label='Default Task Title'
                      name='defaultJobTitle'
                    >
                      <Input />
                    </Form.Item>
                    <Form.Item
                      label='Default Task Description'
                      name='defaultDescription'
                    >
                      <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item label='Default Notes' name='defaultNotes'>
                      <Input.TextArea rows={3} />
                    </Form.Item>
                    <Form.Item
                      label='Recurring Weekly Task'
                      name='recurringEnabled'
                    >
                      <Select>
                        <Select.Option value={false}>Disabled</Select.Option>
                        <Select.Option value={true}>Enabled</Select.Option>
                      </Select>
                    </Form.Item>
                    <Form.Item
                      label='Weekdays'
                      name='recurringWeekdays'
                      rules={[
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!getFieldValue('recurringEnabled')) {
                              return Promise.resolve();
                            }
                            if (Array.isArray(value) && value.length > 0) {
                              return Promise.resolve();
                            }
                            return Promise.reject(
                              new Error('Please choose at least one weekday')
                            );
                          },
                        }),
                      ]}
                    >
                      <Select
                        mode='multiple'
                        maxTagCount={3}
                        options={WEEKDAY_OPTIONS}
                      />
                    </Form.Item>
                    <Form.Item
                      label='Recurring Start Time'
                      name='recurringStartTime'
                    >
                      <Input type='time' />
                    </Form.Item>
                    <Form.Item
                      label='Recurring End Time'
                      name='recurringEndTime'
                    >
                      <Input type='time' />
                    </Form.Item>
                    <Form.Item
                      label='Recurring Service Type'
                      name='recurringServiceType'
                    >
                      <Select>
                        <Select.Option value='bond'>Bond</Select.Option>
                        <Select.Option value='airbnb'>Airbnb</Select.Option>
                        <Select.Option value='regular'>Regular</Select.Option>
                        <Select.Option value='commercial'>
                          Commercial
                        </Select.Option>
                      </Select>
                    </Form.Item>
                    <Form.Item
                      label='Recurring Priority'
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
                      label='Recurring Fixed Fee (AUD)'
                      name='recurringFee'
                    >
                      <InputNumber
                        className='dispatch-form-number-full-width'
                        min={0}
                        precision={2}
                      />
                    </Form.Item>
                    <Button
                      type='primary'
                      htmlType='submit'
                      block
                      className='dispatch-admin-submit-btn'
                    >
                      Save Customer
                    </Button>
                  </Form>
                </div>
              </div>
            ),
          },
        ]}
      />

      <Modal
        title={
          manualLocationEmployee
            ? `Manual Location - ${manualLocationEmployee.name}`
            : 'Manual Location'
        }
        open={Boolean(manualLocationEmployee)}
        onCancel={() => closeManualLocation()}
        onOk={() => manualLocationForm.submit()}
        confirmLoading={manualLocationSaving}
        className='dispatch-admin-manual-location-modal'
        destroyOnHidden
      >
        <Form
          form={manualLocationForm}
          layout='vertical'
          initialValues={{ placeType: 'departure' }}
          onFinish={submitManualLocation}
        >
          <Form.Item
            label='Location Type'
            name='placeType'
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value='home'>Home Address</Select.Option>
              <Select.Option value='departure'>Today Departure</Select.Option>
              <Select.Option value='custom'>Custom Label</Select.Option>
            </Select>
          </Form.Item>
          {manualPlaceType === 'custom' && (
            <Form.Item
              label='Custom Label'
              name='customLabel'
              rules={[{ required: true, message: 'Please enter custom label' }]}
            >
              <Input placeholder='e.g. Temporary Start Point' />
            </Form.Item>
          )}
          <Form.Item label='Address' name='address'>
            <Input placeholder='Home address or today departure address' />
          </Form.Item>
          <Text type='secondary' className='dispatch-admin-manual-location-tip'>
            If address cannot be geocoded, enter latitude/longitude directly.
          </Text>
          <div className='dispatch-location-grid'>
            <Form.Item
              label='Latitude'
              name='lat'
              className='dispatch-admin-compact-form-item'
            >
              <InputNumber
                className='dispatch-form-number-full-width'
                placeholder='-27.4705'
                step={0.000001}
              />
            </Form.Item>
            <Form.Item
              label='Longitude'
              name='lng'
              className='dispatch-admin-compact-form-item'
            >
              <InputNumber
                className='dispatch-form-number-full-width'
                placeholder='153.0260'
                step={0.000001}
              />
            </Form.Item>
          </div>
        </Form>
      </Modal>
    </Modal>
  );
};

export default DispatchAdminSetupModal;
