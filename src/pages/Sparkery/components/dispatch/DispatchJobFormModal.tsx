import React from 'react';
import { Form, Input, InputNumber, Modal, Select } from 'antd';
import type {
  CreateDispatchJobPayload,
  DispatchJob,
} from '../../dispatch/types';

interface DispatchJobFormModalProps {
  open: boolean;
  loading?: boolean;
  initialValue?: DispatchJob;
  onCancel: () => void;
  onSubmit: (values: CreateDispatchJobPayload) => Promise<void> | void;
}

const DispatchJobFormModal: React.FC<DispatchJobFormModalProps> = ({
  open,
  loading,
  initialValue,
  onCancel,
  onSubmit,
}) => {
  const [form] = Form.useForm<CreateDispatchJobPayload>();

  return (
    <Modal
      title={initialValue ? 'Edit Job' : 'Create Job'}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={Boolean(loading)}
      destroyOnHidden
    >
      <Form
        form={form}
        layout='vertical'
        initialValues={
          initialValue || {
            serviceType: 'bond',
            priority: 3,
            scheduledDate: new Date().toISOString().slice(0, 10),
            scheduledStartTime: '09:00',
            scheduledEndTime: '12:00',
          }
        }
        onFinish={onSubmit}
      >
        <Form.Item label='Title' name='title' rules={[{ required: true }]}>
          <Input placeholder='Job title' />
        </Form.Item>
        <Form.Item label='Customer Name' name='customerName'>
          <Input placeholder='Customer name' />
        </Form.Item>
        <Form.Item label='Address' name='customerAddress'>
          <Input placeholder='Customer address' />
        </Form.Item>
        <Form.Item
          label='Service Type'
          name='serviceType'
          rules={[{ required: true }]}
        >
          <Select>
            <Select.Option value='bond'>Bond</Select.Option>
            <Select.Option value='airbnb'>Airbnb</Select.Option>
            <Select.Option value='regular'>Regular</Select.Option>
            <Select.Option value='commercial'>Commercial</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item
          label='Priority'
          name='priority'
          rules={[{ required: true }]}
        >
          <InputNumber min={1} max={5} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          label='Date'
          name='scheduledDate'
          rules={[{ required: true }]}
        >
          <Input type='date' />
        </Form.Item>
        <Form.Item
          label='Start Time'
          name='scheduledStartTime'
          rules={[{ required: true }]}
        >
          <Input type='time' />
        </Form.Item>
        <Form.Item
          label='End Time'
          name='scheduledEndTime'
          rules={[{ required: true }]}
        >
          <Input type='time' />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default DispatchJobFormModal;
