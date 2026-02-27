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
import { useTranslation } from 'react-i18next';

const { Text } = Typography;
const WEEKDAY_OPTIONS: number[] = [1, 2, 3, 4, 5, 6, 7];

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
  const { t } = useTranslation();
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
        message.warning(
          t('sparkery.dispatch.adminSetup.messages.copyNotSupported', { url })
        );
        return;
      }
      await navigator.clipboard.writeText(url);
      message.success(
        t('sparkery.dispatch.adminSetup.messages.locationReportLinkCopied')
      );
    } catch {
      message.error(
        t('sparkery.dispatch.adminSetup.messages.copyLocationReportLinkFailed')
      );
    }
  };

  const reportBrowserLocation = async (employeeId: string) => {
    if (!navigator.geolocation) {
      message.error(
        t('sparkery.dispatch.adminSetup.messages.geolocationUnsupported')
      );
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
        message.error(
          t('sparkery.dispatch.adminSetup.messages.locationReportFailed', {
            reason: error.message,
          })
        );
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
      return t('sparkery.dispatch.adminSetup.manualLocation.placeType.home');
    }
    if (values.placeType === 'departure') {
      return t(
        'sparkery.dispatch.adminSetup.manualLocation.placeType.departure'
      );
    }
    return (
      values.customLabel?.trim() ||
      t('sparkery.dispatch.adminSetup.manualLocation.placeType.manualFallback')
    );
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
          message.warning(
            t('sparkery.dispatch.adminSetup.messages.inputAddressOrCoordinates')
          );
          return;
        }
        if (!isGoogleMapsConfigured()) {
          message.error(
            t('sparkery.dispatch.adminSetup.messages.googleMapsNotConfigured')
          );
          return;
        }
        const geocoded = await geocodeAddress(address);
        if (!geocoded) {
          message.error(
            t('sparkery.dispatch.adminSetup.messages.addressGeocodeFailed')
          );
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
      message.success(
        t('sparkery.dispatch.adminSetup.messages.manualLocationSaved')
      );
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
        error instanceof Error
          ? error.message
          : t('sparkery.dispatch.adminSetup.messages.deleteEmployeeFailed')
      );
    } finally {
      setDeletingEmployeeId(null);
    }
  };

  return (
    <Modal
      title={t('sparkery.dispatch.adminSetup.title')}
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
          {t('sparkery.dispatch.adminSetup.actions.migrateLocalData')}
        </Button>
        <Button
          className='dispatch-admin-toolbar-btn'
          onClick={onResetMigrationPrompt}
        >
          {t('sparkery.dispatch.adminSetup.actions.resetMigrationPrompt')}
        </Button>
        <Button
          loading={loading}
          className='dispatch-admin-toolbar-btn'
          onClick={onExportBackup}
        >
          {t('sparkery.dispatch.adminSetup.actions.exportJsonBackup')}
        </Button>
        <Button loading={loading} className='dispatch-admin-toolbar-btn'>
          <label className='dispatch-admin-import-label'>
            {t('sparkery.dispatch.adminSetup.actions.importJsonBackup')}
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
            label: t('sparkery.dispatch.adminSetup.tabs.employees'),
            children: (
              <div className='dispatch-admin-grid'>
                <div>
                  <div className='dispatch-admin-panel-head'>
                    <Text strong className='dispatch-admin-panel-title'>
                      {t(
                        'sparkery.dispatch.adminSetup.employees.currentEmployees'
                      )}
                    </Text>
                    <Text
                      type='secondary'
                      className='dispatch-admin-panel-subtitle'
                    >
                      {t(
                        'sparkery.dispatch.adminSetup.employees.currentEmployeesSubtitle'
                      )}
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
                            {t(
                              `sparkery.dispatch.adminSetup.employeeStatus.${emp.status}`
                            )}
                          </Tag>
                          <Tag
                            color={emp.currentLocation ? 'green' : 'orange'}
                            className='dispatch-admin-location-tag'
                          >
                            {emp.currentLocation
                              ? t(
                                  'sparkery.dispatch.adminSetup.employees.located'
                                )
                              : t(
                                  'sparkery.dispatch.adminSetup.employees.unlocated'
                                )}
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
                              {t(
                                'sparkery.dispatch.adminSetup.employees.updatedAt'
                              )}{' '}
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
                              {t('sparkery.dispatch.adminSetup.actions.edit')}
                            </Button>
                            <Button
                              size='small'
                              className='dispatch-admin-action-btn'
                              loading={reportingEmployeeId === emp.id}
                              onClick={() => reportBrowserLocation(emp.id)}
                            >
                              {t(
                                'sparkery.dispatch.adminSetup.actions.reportGps'
                              )}
                            </Button>
                            <Button
                              size='small'
                              className='dispatch-admin-action-btn'
                              onClick={() => copyLocationReportLink(emp.id)}
                            >
                              {t(
                                'sparkery.dispatch.adminSetup.actions.copyLocationLink'
                              )}
                            </Button>
                            <Button
                              size='small'
                              className='dispatch-admin-action-btn'
                              onClick={() => openManualLocation(emp)}
                            >
                              {t(
                                'sparkery.dispatch.adminSetup.actions.manualLocation'
                              )}
                            </Button>
                            <Popconfirm
                              title={t(
                                'sparkery.dispatch.adminSetup.confirm.deleteEmployeeTitle'
                              )}
                              description={t(
                                'sparkery.dispatch.adminSetup.confirm.deleteEmployeeDescription'
                              )}
                              okText={t(
                                'sparkery.dispatch.adminSetup.actions.delete'
                              )}
                              cancelText={t(
                                'sparkery.dispatch.adminSetup.actions.cancel'
                              )}
                              okButtonProps={{ danger: true }}
                              onConfirm={() => handleDeleteEmployee(emp.id)}
                            >
                              <Button
                                size='small'
                                danger
                                className='dispatch-admin-action-btn'
                                loading={deletingEmployeeId === emp.id}
                              >
                                {t(
                                  'sparkery.dispatch.adminSetup.actions.delete'
                                )}
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
                      {t(
                        'sparkery.dispatch.adminSetup.employees.addEditEmployee'
                      )}
                    </Text>
                    <Text
                      type='secondary'
                      className='dispatch-admin-panel-subtitle'
                    >
                      {t(
                        'sparkery.dispatch.adminSetup.employees.addEditEmployeeSubtitle'
                      )}
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
                      label={t('sparkery.dispatch.adminSetup.form.name')}
                      name='name'
                      rules={[{ required: true }]}
                    >
                      <Input />
                    </Form.Item>
                    <Form.Item
                      label={t('sparkery.dispatch.adminSetup.form.phone')}
                      name='phone'
                    >
                      <Input />
                    </Form.Item>
                    <Form.Item
                      label={t('sparkery.dispatch.adminSetup.form.skills')}
                      name='skills'
                      rules={[{ required: true }]}
                    >
                      <Select mode='multiple'>
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
                      label={t('sparkery.dispatch.adminSetup.form.status')}
                      name='status'
                      rules={[{ required: true }]}
                    >
                      <Select>
                        <Select.Option value='available'>
                          {t(
                            'sparkery.dispatch.adminSetup.employeeStatus.available'
                          )}
                        </Select.Option>
                        <Select.Option value='off'>
                          {t('sparkery.dispatch.adminSetup.employeeStatus.off')}
                        </Select.Option>
                      </Select>
                    </Form.Item>
                    <Button
                      type='primary'
                      htmlType='submit'
                      block
                      className='dispatch-admin-submit-btn'
                    >
                      {t('sparkery.dispatch.adminSetup.actions.saveEmployee')}
                    </Button>
                  </Form>
                </div>
              </div>
            ),
          },
          {
            key: 'customers',
            label: t('sparkery.dispatch.adminSetup.tabs.customers'),
            children: (
              <div className='dispatch-admin-grid'>
                <div>
                  <div className='dispatch-admin-panel-head'>
                    <Text strong className='dispatch-admin-panel-title'>
                      {t(
                        'sparkery.dispatch.adminSetup.customers.longTermCustomers'
                      )}
                    </Text>
                    <Text
                      type='secondary'
                      className='dispatch-admin-panel-subtitle'
                    >
                      {t(
                        'sparkery.dispatch.adminSetup.customers.longTermCustomersSubtitle'
                      )}
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
                          <Text type='secondary'>
                            {customer.address ||
                              t('sparkery.dispatch.common.noAddress')}
                          </Text>
                        </div>
                        <div>
                          <Text type='secondary'>
                            {t(
                              'sparkery.dispatch.adminSetup.customers.recurringFeePrefix'
                            )}{' '}
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
                            {t('sparkery.dispatch.adminSetup.actions.edit')}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className='dispatch-admin-panel-head'>
                    <Text strong className='dispatch-admin-panel-title'>
                      {t(
                        'sparkery.dispatch.adminSetup.customers.addEditCustomer'
                      )}
                    </Text>
                    <Text
                      type='secondary'
                      className='dispatch-admin-panel-subtitle'
                    >
                      {t(
                        'sparkery.dispatch.adminSetup.customers.addEditCustomerSubtitle'
                      )}
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
                      label={t('sparkery.dispatch.adminSetup.form.name')}
                      name='name'
                      rules={[{ required: true }]}
                    >
                      <Input />
                    </Form.Item>
                    <Form.Item
                      label={t('sparkery.dispatch.adminSetup.form.address')}
                      name='address'
                    >
                      <Input />
                    </Form.Item>
                    <Form.Item
                      label={t('sparkery.dispatch.adminSetup.form.phone')}
                      name='phone'
                    >
                      <Input />
                    </Form.Item>
                    <Form.Item
                      label={t(
                        'sparkery.dispatch.adminSetup.form.defaultTaskTitle'
                      )}
                      name='defaultJobTitle'
                    >
                      <Input />
                    </Form.Item>
                    <Form.Item
                      label={t(
                        'sparkery.dispatch.adminSetup.form.defaultTaskDescription'
                      )}
                      name='defaultDescription'
                    >
                      <Input.TextArea rows={2} />
                    </Form.Item>
                    <Form.Item
                      label={t(
                        'sparkery.dispatch.adminSetup.form.defaultNotes'
                      )}
                      name='defaultNotes'
                    >
                      <Input.TextArea rows={3} />
                    </Form.Item>
                    <Form.Item
                      label={t(
                        'sparkery.dispatch.adminSetup.form.recurringWeeklyTask'
                      )}
                      name='recurringEnabled'
                    >
                      <Select>
                        <Select.Option value={false}>
                          {t('sparkery.dispatch.common.disabled')}
                        </Select.Option>
                        <Select.Option value={true}>
                          {t('sparkery.dispatch.common.enabled')}
                        </Select.Option>
                      </Select>
                    </Form.Item>
                    <Form.Item
                      label={t('sparkery.dispatch.adminSetup.form.weekdays')}
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
                              new Error(
                                t(
                                  'sparkery.dispatch.adminSetup.messages.chooseAtLeastOneWeekday'
                                )
                              )
                            );
                          },
                        }),
                      ]}
                    >
                      <Select
                        mode='multiple'
                        maxTagCount={3}
                        options={WEEKDAY_OPTIONS.map(day => ({
                          value: day,
                          label: t(
                            `sparkery.dispatch.common.weekday.full.${day}`
                          ),
                        }))}
                      />
                    </Form.Item>
                    <Form.Item
                      label={t(
                        'sparkery.dispatch.adminSetup.form.recurringStartTime'
                      )}
                      name='recurringStartTime'
                    >
                      <Input type='time' />
                    </Form.Item>
                    <Form.Item
                      label={t(
                        'sparkery.dispatch.adminSetup.form.recurringEndTime'
                      )}
                      name='recurringEndTime'
                    >
                      <Input type='time' />
                    </Form.Item>
                    <Form.Item
                      label={t(
                        'sparkery.dispatch.adminSetup.form.recurringServiceType'
                      )}
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
                      label={t(
                        'sparkery.dispatch.adminSetup.form.recurringPriority'
                      )}
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
                        'sparkery.dispatch.adminSetup.form.recurringFixedFeeAud'
                      )}
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
                      {t('sparkery.dispatch.adminSetup.actions.saveCustomer')}
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
            ? t('sparkery.dispatch.adminSetup.manualLocation.titleWithName', {
                name: manualLocationEmployee.name,
              })
            : t('sparkery.dispatch.adminSetup.manualLocation.title')
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
            label={t(
              'sparkery.dispatch.adminSetup.manualLocation.locationType'
            )}
            name='placeType'
            rules={[{ required: true }]}
          >
            <Select>
              <Select.Option value='home'>
                {t('sparkery.dispatch.adminSetup.manualLocation.homeAddress')}
              </Select.Option>
              <Select.Option value='departure'>
                {t(
                  'sparkery.dispatch.adminSetup.manualLocation.todayDeparture'
                )}
              </Select.Option>
              <Select.Option value='custom'>
                {t(
                  'sparkery.dispatch.adminSetup.manualLocation.customLabelOption'
                )}
              </Select.Option>
            </Select>
          </Form.Item>
          {manualPlaceType === 'custom' && (
            <Form.Item
              label={t(
                'sparkery.dispatch.adminSetup.manualLocation.customLabel'
              )}
              name='customLabel'
              rules={[
                {
                  required: true,
                  message: t(
                    'sparkery.dispatch.adminSetup.messages.enterCustomLabel'
                  ),
                },
              ]}
            >
              <Input
                placeholder={t(
                  'sparkery.dispatch.adminSetup.manualLocation.customLabelPlaceholder'
                )}
              />
            </Form.Item>
          )}
          <Form.Item
            label={t('sparkery.dispatch.adminSetup.form.address')}
            name='address'
          >
            <Input
              placeholder={t(
                'sparkery.dispatch.adminSetup.manualLocation.addressPlaceholder'
              )}
            />
          </Form.Item>
          <Text type='secondary' className='dispatch-admin-manual-location-tip'>
            {t('sparkery.dispatch.adminSetup.manualLocation.geocodeTip')}
          </Text>
          <div className='dispatch-location-grid'>
            <Form.Item
              label={t('sparkery.dispatch.adminSetup.manualLocation.latitude')}
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
              label={t('sparkery.dispatch.adminSetup.manualLocation.longitude')}
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
