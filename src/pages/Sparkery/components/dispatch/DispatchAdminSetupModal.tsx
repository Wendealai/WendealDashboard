import React from 'react';
import {
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type {
  DispatchCustomerProfile,
  DispatchEmployee,
  UpsertDispatchCustomerProfilePayload,
  UpsertDispatchEmployeePayload,
} from '../../dispatch/types';

const { Text } = Typography;

interface DispatchAdminSetupModalProps {
  open: boolean;
  employees: DispatchEmployee[];
  customerProfiles: DispatchCustomerProfile[];
  loading: boolean;
  onCancel: () => void;
  onSaveEmployee: (payload: UpsertDispatchEmployeePayload) => Promise<void>;
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
  onSaveCustomer,
  onMigrateLocalPeople,
  onResetMigrationPrompt,
  onExportBackup,
  onImportBackup,
}) => {
  const [employeeForm] = Form.useForm<UpsertDispatchEmployeePayload>();
  const [customerForm] = Form.useForm<UpsertDispatchCustomerProfilePayload>();

  return (
    <Modal
      title='Dispatch Pre-setup (Employees & Customers)'
      open={open}
      onCancel={onCancel}
      footer={null}
      width={920}
      destroyOnHidden
    >
      <Space style={{ marginBottom: 12 }} wrap>
        <Button loading={loading} onClick={onMigrateLocalPeople}>
          Migrate Local Data to Supabase
        </Button>
        <Button onClick={onResetMigrationPrompt}>Reset Migration Prompt</Button>
        <Button loading={loading} onClick={onExportBackup}>
          Export JSON Backup
        </Button>
        <Button loading={loading}>
          <label style={{ cursor: 'pointer' }}>
            Import JSON Backup
            <input
              type='file'
              accept='application/json'
              style={{ display: 'none' }}
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
        items={[
          {
            key: 'employees',
            label: 'Employees',
            children: (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                }}
              >
                <div>
                  <Text strong>Current Employees</Text>
                  <div
                    style={{ marginTop: 8, maxHeight: 320, overflow: 'auto' }}
                  >
                    {employees.map(emp => (
                      <div
                        key={emp.id}
                        style={{
                          padding: 10,
                          border: '1px solid #f0f0f0',
                          borderRadius: 6,
                          marginBottom: 8,
                        }}
                      >
                        <Space>
                          <Text strong>{emp.name}</Text>
                          <Tag>{emp.status}</Tag>
                        </Space>
                        <div style={{ marginTop: 6 }}>
                          <Button
                            size='small'
                            onClick={() => employeeForm.setFieldsValue(emp)}
                          >
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <Text strong>Add / Edit Employee</Text>
                  <Form
                    form={employeeForm}
                    layout='vertical'
                    style={{ marginTop: 8 }}
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
                    <Button type='primary' htmlType='submit' block>
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
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 16,
                }}
              >
                <div>
                  <Text strong>Long-term Customers</Text>
                  <div
                    style={{ marginTop: 8, maxHeight: 320, overflow: 'auto' }}
                  >
                    {customerProfiles.map(customer => (
                      <div
                        key={customer.id}
                        style={{
                          padding: 10,
                          border: '1px solid #f0f0f0',
                          borderRadius: 6,
                          marginBottom: 8,
                        }}
                      >
                        <Text strong>{customer.name}</Text>
                        <div>
                          <Text type='secondary'>{customer.address}</Text>
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <Button
                            size='small'
                            onClick={() =>
                              customerForm.setFieldsValue(customer)
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
                  <Text strong>Add / Edit Customer</Text>
                  <Form
                    form={customerForm}
                    layout='vertical'
                    style={{ marginTop: 8 }}
                    initialValues={{
                      recurringEnabled: false,
                      recurringWeekday: 1,
                      recurringServiceType: 'regular',
                      recurringPriority: 3,
                      recurringStartTime: '09:00',
                      recurringEndTime: '11:00',
                    }}
                    onFinish={async values => {
                      await onSaveCustomer(values);
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
                    <Form.Item label='Weekday' name='recurringWeekday'>
                      <Select>
                        <Select.Option value={1}>Monday</Select.Option>
                        <Select.Option value={2}>Tuesday</Select.Option>
                        <Select.Option value={3}>Wednesday</Select.Option>
                        <Select.Option value={4}>Thursday</Select.Option>
                        <Select.Option value={5}>Friday</Select.Option>
                        <Select.Option value={6}>Saturday</Select.Option>
                        <Select.Option value={7}>Sunday</Select.Option>
                      </Select>
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
                    <Button type='primary' htmlType='submit' block>
                      Save Customer
                    </Button>
                  </Form>
                </div>
              </div>
            ),
          },
        ]}
      />
    </Modal>
  );
};

export default DispatchAdminSetupModal;
