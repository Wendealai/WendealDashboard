import React from 'react';
import {
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Upload,
  message,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import type {
  CreateDispatchJobPayload,
  DispatchCustomerProfile,
  DispatchJob,
  DispatchWeekday,
  UpsertDispatchCustomerProfilePayload,
} from '../../dispatch/types';

const getTodayDateKey = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface DispatchJobFormModalProps {
  open: boolean;
  loading?: boolean;
  initialValue?: DispatchJob;
  customerProfiles: DispatchCustomerProfile[];
  onCancel: () => void;
  onSubmit: (values: CreateDispatchJobPayload) => Promise<void> | void;
  onAddCustomerProfile: (
    payload: UpsertDispatchCustomerProfilePayload
  ) => Promise<DispatchCustomerProfile>;
}

const DispatchJobFormModal: React.FC<DispatchJobFormModalProps> = ({
  open,
  loading,
  initialValue,
  customerProfiles,
  onCancel,
  onSubmit,
  onAddCustomerProfile,
}) => {
  const [form] = Form.useForm<CreateDispatchJobPayload>();
  const recurringEnabled = Form.useWatch('recurringEnabled', form);
  const MAX_IMAGE_SIZE_MB = 2;
  const MAX_IMAGE_COUNT = 8;
  const weekdayOptions: Array<{ value: DispatchWeekday; label: string }> = [
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
    { value: 7, label: 'Sunday' },
  ];

  const handleCustomerProfileChange = (value: string) => {
    if (value === '__new__') {
      form.resetFields(['customerProfileId']);
      return;
    }
    const profile = customerProfiles.find(item => item.id === value);
    if (!profile) return;
    const patch: Partial<CreateDispatchJobPayload> = {
      customerProfileId: profile.id,
      customerName: profile.name,
    };
    if (profile.address) patch.customerAddress = profile.address;
    if (profile.phone) patch.customerPhone = profile.phone;
    if (profile.defaultJobTitle) patch.title = profile.defaultJobTitle;
    if (profile.defaultDescription)
      patch.description = profile.defaultDescription;
    if (profile.defaultNotes) patch.notes = profile.defaultNotes;
    if (typeof profile.recurringEnabled === 'boolean') {
      patch.recurringEnabled = profile.recurringEnabled;
    }
    if (profile.recurringStartTime) {
      patch.scheduledStartTime = profile.recurringStartTime;
    }
    if (profile.recurringEndTime) {
      patch.scheduledEndTime = profile.recurringEndTime;
    }
    if (profile.recurringServiceType) {
      patch.serviceType = profile.recurringServiceType;
    }
    if (profile.recurringPriority) {
      patch.priority = profile.recurringPriority;
    }
    if (profile.recurringWeekdays && profile.recurringWeekdays.length > 0) {
      patch.recurringWeekdays = profile.recurringWeekdays;
      const firstWeekday = profile.recurringWeekdays[0];
      if (firstWeekday) {
        patch.recurringWeekday = firstWeekday;
      }
    } else if (profile.recurringWeekday) {
      patch.recurringWeekday = profile.recurringWeekday;
      patch.recurringWeekdays = [profile.recurringWeekday];
    }
    form.setFieldsValue(patch);
  };

  const handleAddLongTermCustomer = async () => {
    const values = form.getFieldsValue();
    if (!values.customerName) {
      message.warning('Please fill customer name first');
      return;
    }

    const payload: UpsertDispatchCustomerProfilePayload = {
      name: values.customerName,
      defaultJobTitle: values.title,
    };
    if (values.customerAddress) payload.address = values.customerAddress;
    if (values.customerPhone) payload.phone = values.customerPhone;
    if (values.description) payload.defaultDescription = values.description;
    if (values.notes) payload.defaultNotes = values.notes;
    const recurringWeekdays = Array.isArray(values.recurringWeekdays)
      ? values.recurringWeekdays
      : values.recurringWeekday
        ? [values.recurringWeekday]
        : [];
    if (typeof values.recurringEnabled === 'boolean') {
      payload.recurringEnabled = values.recurringEnabled;
    }
    if (recurringWeekdays.length > 0) {
      const firstWeekday = recurringWeekdays[0];
      if (firstWeekday) {
        payload.recurringWeekday = firstWeekday;
      }
      payload.recurringWeekdays = recurringWeekdays;
    }
    if (values.scheduledStartTime) {
      payload.recurringStartTime = values.scheduledStartTime;
    }
    if (values.scheduledEndTime) {
      payload.recurringEndTime = values.scheduledEndTime;
    }
    if (values.serviceType) {
      payload.recurringServiceType = values.serviceType;
    }
    if (values.priority) {
      payload.recurringPriority = values.priority;
    }

    const saved = await onAddCustomerProfile(payload);

    form.setFieldsValue({ customerProfileId: saved.id });
    message.success('Added to long-term customer list');
  };

  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = error => reject(error);
    });
  };

  const normalizeUploadToUrls = async (
    fileList: Array<UploadFile | string>
  ): Promise<string[]> => {
    const urls = await Promise.all(
      fileList.map(async file => {
        if (typeof file === 'string') {
          return file;
        }
        if (file.url) return file.url;
        if (file.thumbUrl) return file.thumbUrl;
        if (file.originFileObj) {
          return toBase64(file.originFileObj as File);
        }
        return '';
      })
    );
    return urls.filter(Boolean);
  };

  const uploadInitialFiles: UploadFile[] = React.useMemo(() => {
    if (!initialValue?.imageUrls) {
      return [];
    }
    return initialValue.imageUrls.map((url: string, index: number) => ({
      uid: `existing-${index}`,
      name: `image-${index + 1}.png`,
      status: 'done',
      url,
      thumbUrl: url,
    }));
  }, [initialValue?.imageUrls]);

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
            scheduledDate: getTodayDateKey(),
            scheduledStartTime: '09:00',
            scheduledEndTime: '12:00',
            recurringEnabled: false,
            recurringWeekdays: [],
          }
        }
        onFinish={async values => {
          const normalized = { ...values };
          const anyImageUrls = (
            normalized as unknown as { imageUrls?: UploadFile[] }
          ).imageUrls;
          if (Array.isArray(anyImageUrls)) {
            normalized.imageUrls = await normalizeUploadToUrls(anyImageUrls);
          }
          const recurringWeekdays = Array.isArray(normalized.recurringWeekdays)
            ? normalized.recurringWeekdays
            : normalized.recurringWeekday
              ? [normalized.recurringWeekday]
              : [];
          if (recurringWeekdays.length > 0) {
            normalized.recurringWeekdays = recurringWeekdays;
            const firstWeekday = recurringWeekdays[0];
            if (firstWeekday) {
              normalized.recurringWeekday = firstWeekday;
            }
          } else {
            normalized.recurringWeekdays = [];
          }
          await onSubmit(normalized);
        }}
      >
        <Form.Item label='Title' name='title' rules={[{ required: true }]}>
          <Input placeholder='Job title' />
        </Form.Item>
        <Form.Item label='Customer Library' name='customerProfileId'>
          <Select
            placeholder='Select recurring customer'
            allowClear
            onChange={handleCustomerProfileChange}
          >
            {customerProfiles.map(profile => (
              <Select.Option key={profile.id} value={profile.id}>
                {profile.name}
              </Select.Option>
            ))}
            <Select.Option value='__new__'>
              + New One-time Customer
            </Select.Option>
          </Select>
        </Form.Item>
        <Form.Item label='Customer Name' name='customerName'>
          <Input placeholder='Customer name' />
        </Form.Item>
        <Form.Item label='Description' name='description'>
          <Input.TextArea
            autoSize={{ minRows: 3, maxRows: 10 }}
            placeholder='Task content/description'
            style={{ resize: 'vertical' }}
          />
        </Form.Item>
        <Form.Item label='Notes' name='notes'>
          <Input.TextArea
            autoSize={{ minRows: 4, maxRows: 12 }}
            placeholder='注意事项 / notes'
            style={{ resize: 'vertical' }}
          />
        </Form.Item>
        <Form.Item label='Address' name='customerAddress'>
          <Input placeholder='Customer address' />
        </Form.Item>
        <Form.Item label='Phone' name='customerPhone'>
          <Input placeholder='Customer phone' />
        </Form.Item>
        <Form.Item>
          <Button onClick={handleAddLongTermCustomer} block>
            Add to Long-term Customer List
          </Button>
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
        <Form.Item
          label='Recurring Weekly Task'
          name='recurringEnabled'
          tooltip='Enable this if this job should be generated every week'
        >
          <Select>
            <Select.Option value={false}>Disabled</Select.Option>
            <Select.Option value={true}>Enabled</Select.Option>
          </Select>
        </Form.Item>
        <Form.Item
          label='Recurring Weekdays'
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
                  new Error('Please select at least one recurring weekday')
                );
              },
            },
          ]}
        >
          <Select
            mode='multiple'
            placeholder='e.g. Wednesday + Sunday'
            options={weekdayOptions}
            maxTagCount={3}
          />
        </Form.Item>
        <Form.Item
          label='Images'
          name='imageUrls'
          initialValue={uploadInitialFiles}
          valuePropName='fileList'
          getValueFromEvent={e => (Array.isArray(e) ? e : e?.fileList || [])}
        >
          <Upload
            listType='picture-card'
            beforeUpload={file => {
              const isTooLarge = file.size / 1024 / 1024 > MAX_IMAGE_SIZE_MB;
              if (isTooLarge) {
                message.error(`Each image must be <= ${MAX_IMAGE_SIZE_MB}MB`);
                return Upload.LIST_IGNORE;
              }
              return false;
            }}
            multiple
            maxCount={MAX_IMAGE_COUNT}
          >
            + Upload
          </Upload>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default DispatchJobFormModal;
