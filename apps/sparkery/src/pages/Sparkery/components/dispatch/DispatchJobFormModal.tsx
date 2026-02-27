import React from 'react';
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd';
import { CameraOutlined, InboxOutlined } from '@ant-design/icons';
import type { RcFile, UploadFile } from 'antd/es/upload/interface';
import type {
  CreateDispatchJobPayload,
  DispatchCustomerProfile,
  DispatchJob,
  DispatchWeekday,
  UpsertDispatchCustomerProfilePayload,
} from '../../dispatch/types';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

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
  const { t } = useTranslation();
  const [form] = Form.useForm<CreateDispatchJobPayload>();
  const recurringEnabled = Form.useWatch('recurringEnabled', form);
  const watchedUploads = (Form.useWatch('imageUrls', form) ||
    []) as unknown as UploadFile[];
  const MAX_IMAGE_SIZE_MB = 2;
  const MAX_IMAGE_COUNT = 8;
  const [attachmentStatusByUid, setAttachmentStatusByUid] = React.useState<
    Record<string, 'parsing' | 'ready'>
  >({});
  const attachmentParseTimersRef = React.useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const defaultFormValues = React.useMemo<CreateDispatchJobPayload>(
    () => ({
      title: '',
      serviceType: 'bond',
      priority: 3,
      scheduledDate: getTodayDateKey(),
      scheduledStartTime: '09:00',
      scheduledEndTime: '12:00',
      recurringEnabled: false,
      recurringWeekdays: [],
      pricingMode: 'one_time_manual',
      feeCurrency: 'AUD',
      baseFee: 0,
      manualAdjustment: 0,
    }),
    []
  );
  const weekdayOptions: Array<{ value: DispatchWeekday; label: string }> = [
    { value: 1, label: t('sparkery.dispatch.common.weekday.full.1') },
    { value: 2, label: t('sparkery.dispatch.common.weekday.full.2') },
    { value: 3, label: t('sparkery.dispatch.common.weekday.full.3') },
    { value: 4, label: t('sparkery.dispatch.common.weekday.full.4') },
    { value: 5, label: t('sparkery.dispatch.common.weekday.full.5') },
    { value: 6, label: t('sparkery.dispatch.common.weekday.full.6') },
    { value: 7, label: t('sparkery.dispatch.common.weekday.full.7') },
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
      if (profile.recurringEnabled) {
        patch.pricingMode = 'recurring_fixed';
      }
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
    if (typeof profile.recurringFee === 'number') {
      patch.pricingMode = 'recurring_fixed';
      patch.baseFee = profile.recurringFee;
      patch.manualAdjustment = 0;
      patch.feeCurrency = 'AUD';
    } else if (profile.recurringEnabled) {
      patch.pricingMode = 'recurring_fixed';
      patch.baseFee = 0;
      patch.manualAdjustment = 0;
      patch.feeCurrency = 'AUD';
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
      message.warning(
        t('sparkery.dispatch.jobForm.messages.fillCustomerNameFirst')
      );
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
    if (typeof values.baseFee === 'number' && Number.isFinite(values.baseFee)) {
      payload.recurringFee = values.baseFee;
    }

    const saved = await onAddCustomerProfile(payload);

    form.setFieldsValue({ customerProfileId: saved.id });
    message.success(
      t('sparkery.dispatch.jobForm.messages.addedToLongTermCustomerList')
    );
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

  const syncAttachmentStatuses = React.useCallback((fileList: UploadFile[]) => {
    const activeUids = new Set(fileList.map(file => file.uid));
    Object.entries(attachmentParseTimersRef.current).forEach(([uid, timer]) => {
      if (!activeUids.has(uid)) {
        clearTimeout(timer);
        delete attachmentParseTimersRef.current[uid];
      }
    });

    setAttachmentStatusByUid(prev => {
      const next: Record<string, 'parsing' | 'ready'> = {};
      fileList.forEach(file => {
        const knownStatus = prev[file.uid];
        if (file.url || knownStatus === 'ready') {
          next[file.uid] = 'ready';
          return;
        }
        next[file.uid] = knownStatus || 'parsing';
        if (!knownStatus && !attachmentParseTimersRef.current[file.uid]) {
          attachmentParseTimersRef.current[file.uid] = setTimeout(() => {
            setAttachmentStatusByUid(current => ({
              ...current,
              [file.uid]: 'ready',
            }));
            delete attachmentParseTimersRef.current[file.uid];
          }, 600);
        }
      });
      return next;
    });
  }, []);

  React.useEffect(() => {
    if (!open) {
      Object.values(attachmentParseTimersRef.current).forEach(timer =>
        clearTimeout(timer)
      );
      attachmentParseTimersRef.current = {};
      setAttachmentStatusByUid({});
      return;
    }
    form.resetFields();
    if (initialValue) {
      const { imageUrls: _ignoredImageUrls, ...initialWithoutImages } =
        initialValue;
      form.setFieldsValue({
        ...defaultFormValues,
        ...initialWithoutImages,
        pricingMode: initialValue.pricingMode || 'one_time_manual',
        feeCurrency: initialValue.feeCurrency || 'AUD',
        baseFee:
          typeof initialValue.baseFee === 'number' &&
          Number.isFinite(initialValue.baseFee)
            ? initialValue.baseFee
            : 0,
        manualAdjustment:
          typeof initialValue.manualAdjustment === 'number' &&
          Number.isFinite(initialValue.manualAdjustment)
            ? initialValue.manualAdjustment
            : 0,
      });
      syncAttachmentStatuses(uploadInitialFiles);
      return;
    }
    form.setFieldsValue(defaultFormValues);
    syncAttachmentStatuses([]);
  }, [
    open,
    initialValue,
    form,
    defaultFormValues,
    syncAttachmentStatuses,
    uploadInitialFiles,
  ]);

  React.useEffect(() => {
    if (!open) {
      return;
    }
    const handlePaste = (event: ClipboardEvent) => {
      const clipboardItems = Array.from(event.clipboardData?.items || []);
      const imageFiles: File[] = [];
      clipboardItems.forEach(item => {
        const file = item.getAsFile();
        if (file && file.type.toLowerCase().startsWith('image/')) {
          imageFiles.push(file);
        }
      });
      if (imageFiles.length === 0) {
        return;
      }
      event.preventDefault();

      const currentUploads = ((form.getFieldValue('imageUrls') as UploadFile[]) ||
        []) as UploadFile[];
      const remainingSlots = Math.max(0, MAX_IMAGE_COUNT - currentUploads.length);
      if (remainingSlots <= 0) {
        message.warning(
          t('sparkery.dispatch.jobForm.messages.imageCountLimit', {
            defaultValue: 'Maximum {{count}} images allowed.',
            count: MAX_IMAGE_COUNT,
          })
        );
        return;
      }
      const nextUploads: UploadFile[] = [];
      imageFiles.slice(0, remainingSlots).forEach((file, index) => {
        const isTooLarge = file.size / 1024 / 1024 > MAX_IMAGE_SIZE_MB;
        if (isTooLarge) {
          return;
        }
        nextUploads.push({
          uid: `paste-${Date.now()}-${index}`,
          name: file.name || `pasted-${index + 1}.png`,
          status: 'done',
          originFileObj: file as RcFile,
        });
      });

      if (nextUploads.length === 0) {
        message.warning(
          t('sparkery.dispatch.jobForm.messages.imageSizeLimit', {
            size: MAX_IMAGE_SIZE_MB,
          })
        );
        return;
      }

      const mergedUploads = [...currentUploads, ...nextUploads].slice(
        0,
        MAX_IMAGE_COUNT
      );
      form.setFieldsValue({
        imageUrls: mergedUploads as unknown as string[],
      } as Partial<CreateDispatchJobPayload>);
      syncAttachmentStatuses(mergedUploads);
      message.success(
        t('sparkery.dispatch.jobForm.messages.pastedImages', {
          defaultValue: 'Added {{count}} image(s) from clipboard.',
          count: nextUploads.length,
        })
      );
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [form, open, syncAttachmentStatuses, t]);

  React.useEffect(
    () => () => {
      Object.values(attachmentParseTimersRef.current).forEach(timer =>
        clearTimeout(timer)
      );
      attachmentParseTimersRef.current = {};
    },
    []
  );

  return (
    <Modal
      title={
        initialValue
          ? t('sparkery.dispatch.jobForm.modal.editJob')
          : t('sparkery.dispatch.jobForm.modal.createJob')
      }
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={Boolean(loading)}
      className='dispatch-job-form-modal'
      destroyOnHidden
    >
      <Form
        form={form}
        layout='vertical'
        className='dispatch-job-form'
        initialValues={defaultFormValues}
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
          normalized.feeCurrency = 'AUD';
          normalized.baseFee =
            typeof normalized.baseFee === 'number' &&
            Number.isFinite(normalized.baseFee)
              ? Number(normalized.baseFee.toFixed(2))
              : 0;
          normalized.manualAdjustment =
            typeof normalized.manualAdjustment === 'number' &&
            Number.isFinite(normalized.manualAdjustment)
              ? Number(normalized.manualAdjustment.toFixed(2))
              : 0;
          await onSubmit(normalized);
        }}
      >
        <div className='dispatch-job-form-section-title'>
          {t('sparkery.dispatch.jobForm.sections.jobDetails')}
        </div>
        <Form.Item
          label={t('sparkery.dispatch.jobForm.fields.title')}
          name='title'
          rules={[{ required: true }]}
        >
          <Input
            placeholder={t('sparkery.dispatch.jobForm.placeholders.jobTitle')}
          />
        </Form.Item>
        <Form.Item
          label={t('sparkery.dispatch.jobForm.fields.serviceType')}
          name='serviceType'
          rules={[{ required: true }]}
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
          label={t('sparkery.dispatch.jobForm.fields.priority')}
          name='priority'
          rules={[{ required: true }]}
        >
          <InputNumber
            className='dispatch-form-number-full-width'
            min={1}
            max={5}
          />
        </Form.Item>
        <div className='dispatch-job-form-section-title'>
          {t('sparkery.dispatch.jobForm.sections.customer')}
        </div>
        <Form.Item
          label={t('sparkery.dispatch.jobForm.fields.customerLibrary')}
          name='customerProfileId'
        >
          <Select
            placeholder={t(
              'sparkery.dispatch.jobForm.placeholders.selectRecurringCustomer'
            )}
            allowClear
            onChange={handleCustomerProfileChange}
          >
            {customerProfiles.map(profile => (
              <Select.Option key={profile.id} value={profile.id}>
                {profile.name}
              </Select.Option>
            ))}
            <Select.Option value='__new__'>
              {t('sparkery.dispatch.jobForm.newOneTimeCustomer')}
            </Select.Option>
          </Select>
        </Form.Item>
        <Form.Item
          label={t('sparkery.dispatch.jobForm.fields.customerName')}
          name='customerName'
        >
          <Input
            placeholder={t(
              'sparkery.dispatch.jobForm.placeholders.customerName'
            )}
          />
        </Form.Item>
        <Form.Item
          label={t('sparkery.dispatch.jobForm.fields.description')}
          name='description'
        >
          <Input.TextArea
            autoSize={{ minRows: 3, maxRows: 10 }}
            placeholder={t(
              'sparkery.dispatch.jobForm.placeholders.taskDescription'
            )}
            className='dispatch-textarea-vertical'
          />
        </Form.Item>
        <Form.Item
          label={t('sparkery.dispatch.jobForm.fields.notes')}
          name='notes'
        >
          <Input.TextArea
            autoSize={{ minRows: 4, maxRows: 12 }}
            placeholder={t('sparkery.dispatch.jobForm.placeholders.notes')}
            className='dispatch-textarea-vertical'
          />
        </Form.Item>
        <Form.Item
          label={t('sparkery.dispatch.jobForm.fields.address')}
          name='customerAddress'
        >
          <Input
            placeholder={t(
              'sparkery.dispatch.jobForm.placeholders.customerAddress'
            )}
          />
        </Form.Item>
        <Form.Item
          label={t('sparkery.dispatch.jobForm.fields.phone')}
          name='customerPhone'
        >
          <Input
            placeholder={t(
              'sparkery.dispatch.jobForm.placeholders.customerPhone'
            )}
          />
        </Form.Item>
        <Form.Item>
          <Button
            onClick={handleAddLongTermCustomer}
            block
            className='dispatch-job-form-secondary-btn'
          >
            {t('sparkery.dispatch.jobForm.actions.addToLongTermCustomerList')}
          </Button>
        </Form.Item>
        <div className='dispatch-job-form-section-title'>
          {t('sparkery.dispatch.jobForm.sections.pricing')}
        </div>
        <div className='dispatch-job-form-pricing-grid'>
          <Form.Item
            label={t('sparkery.dispatch.jobForm.fields.pricingMode')}
            name='pricingMode'
            tooltip={t('sparkery.dispatch.jobForm.tooltips.pricingMode')}
            className='dispatch-job-form-pricing-item'
          >
            <Select>
              <Select.Option value='one_time_manual'>
                {t('sparkery.dispatch.jobForm.pricingMode.oneTimeManual')}
              </Select.Option>
              <Select.Option value='recurring_fixed'>
                {t('sparkery.dispatch.jobForm.pricingMode.recurringFixed')}
              </Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            label={t('sparkery.dispatch.jobForm.fields.baseCleaningFeeAud')}
            name='baseFee'
            rules={[
              {
                required: true,
                message: t('sparkery.dispatch.jobForm.messages.inputBaseFee'),
              },
            ]}
            className='dispatch-job-form-pricing-item'
          >
            <InputNumber
              className='dispatch-form-number-full-width'
              min={0}
              precision={2}
              placeholder={t('sparkery.dispatch.jobForm.placeholders.baseFee')}
            />
          </Form.Item>
          <Form.Item
            label={t(
              'sparkery.dispatch.jobForm.fields.initialAdjustmentOptional'
            )}
            name='manualAdjustment'
            tooltip={t('sparkery.dispatch.jobForm.tooltips.initialAdjustment')}
            className='dispatch-job-form-pricing-item'
          >
            <InputNumber
              className='dispatch-form-number-full-width'
              precision={2}
              placeholder={t(
                'sparkery.dispatch.jobForm.placeholders.adjustment'
              )}
            />
          </Form.Item>
        </div>
        <div className='dispatch-job-form-section-title'>
          {t('sparkery.dispatch.jobForm.sections.schedule')}
        </div>
        <div className='dispatch-job-form-time-grid'>
          <Form.Item
            label={t('sparkery.dispatch.jobForm.fields.date')}
            name='scheduledDate'
            rules={[{ required: true }]}
            className='dispatch-job-form-time-item'
          >
            <Input type='date' />
          </Form.Item>
          <Form.Item
            label={t('sparkery.dispatch.jobForm.fields.startTime')}
            name='scheduledStartTime'
            rules={[{ required: true }]}
            className='dispatch-job-form-time-item'
          >
            <Input type='time' />
          </Form.Item>
          <Form.Item
            label={t('sparkery.dispatch.jobForm.fields.endTime')}
            name='scheduledEndTime'
            rules={[{ required: true }]}
            className='dispatch-job-form-time-item'
          >
            <Input type='time' />
          </Form.Item>
        </div>
        <div className='dispatch-job-form-section-title'>
          {t('sparkery.dispatch.jobForm.sections.recurringRules')}
        </div>
        <Form.Item
          label={t('sparkery.dispatch.jobForm.fields.recurringWeeklyTask')}
          name='recurringEnabled'
          tooltip={t('sparkery.dispatch.jobForm.tooltips.recurringWeeklyTask')}
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
          label={t('sparkery.dispatch.jobForm.fields.recurringWeekdays')}
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
                      'sparkery.dispatch.jobForm.messages.selectAtLeastOneRecurringWeekday'
                    )
                  )
                );
              },
            },
          ]}
        >
          <Select
            mode='multiple'
            placeholder={t(
              'sparkery.dispatch.jobForm.placeholders.recurringWeekdays'
            )}
            options={weekdayOptions}
            maxTagCount={3}
          />
        </Form.Item>
        <div className='dispatch-job-form-section-title'>
          {t('sparkery.dispatch.jobForm.sections.images')}
        </div>
        <Form.Item
          label={t('sparkery.dispatch.jobForm.fields.images')}
          name='imageUrls'
          initialValue={uploadInitialFiles}
          valuePropName='fileList'
          getValueFromEvent={e => (Array.isArray(e) ? e : e?.fileList || [])}
        >
          <Upload.Dragger
            className='dispatch-job-form-upload'
            listType='picture'
            accept='image/*'
            capture='environment'
            aria-label={t('sparkery.dispatch.jobForm.uploadDropText', {
              defaultValue: 'Drag images here or click to upload',
            })}
            aria-describedby='dispatch-job-form-upload-hint dispatch-job-form-upload-workflow'
            beforeUpload={file => {
              const isTooLarge = file.size / 1024 / 1024 > MAX_IMAGE_SIZE_MB;
              if (isTooLarge) {
                message.error(
                  t('sparkery.dispatch.jobForm.messages.imageSizeLimit', {
                    size: MAX_IMAGE_SIZE_MB,
                  })
                );
                return Upload.LIST_IGNORE;
              }
              return false;
            }}
            onChange={info =>
              syncAttachmentStatuses((info.fileList || []) as UploadFile[])
            }
            multiple
            maxCount={MAX_IMAGE_COUNT}
          >
            <p className='ant-upload-drag-icon'>
              <InboxOutlined />
            </p>
            <p className='ant-upload-text'>
              {t('sparkery.dispatch.jobForm.uploadDropText', {
                defaultValue: 'Drag images here or click to upload',
              })}
            </p>
            <p className='ant-upload-hint'>
              <Space size={6}>
                <CameraOutlined />
                <span id='dispatch-job-form-upload-hint'>
                  {t('sparkery.dispatch.jobForm.uploadDropHint', {
                    defaultValue:
                      'Supports drag, paste screenshot (Ctrl/Cmd+V), and mobile camera capture.',
                  })}
                </span>
              </Space>
            </p>
          </Upload.Dragger>
        </Form.Item>
        {watchedUploads.length > 0 && (
          <Space
            wrap
            className='dispatch-job-form-attachment-statuses'
            role='status'
            aria-live='polite'
            aria-label={t('sparkery.dispatch.jobForm.uploadWorkflow.title', {
              defaultValue: 'Attachment workflow',
            })}
          >
            {watchedUploads.map(file => {
              const status = attachmentStatusByUid[file.uid] || 'parsing';
              return (
                <Tag
                  key={file.uid}
                  color={status === 'ready' ? 'success' : 'processing'}
                >
                  {file.name} |{' '}
                  {status === 'ready'
                    ? t('sparkery.dispatch.jobForm.parseStatus.ready', {
                        defaultValue: 'Ready',
                      })
                    : t('sparkery.dispatch.jobForm.parseStatus.parsing', {
                        defaultValue: 'Parsing',
                      })}
                </Tag>
              );
            })}
          </Space>
        )}
        <Alert
          id='dispatch-job-form-upload-workflow'
          type='info'
          showIcon
          message={t('sparkery.dispatch.jobForm.uploadWorkflow.title', {
            defaultValue: 'Attachment workflow',
          })}
          description={
            <Space direction='vertical' size={2}>
              <Text>
                {t('sparkery.dispatch.jobForm.uploadWorkflow.step1', {
                  defaultValue:
                    '1) Upload or paste all job photos in one place.',
                })}
              </Text>
              <Text>
                {t('sparkery.dispatch.jobForm.uploadWorkflow.step2', {
                  defaultValue:
                    '2) Wait for parse status to become Ready before saving.',
                })}
              </Text>
            </Space>
          }
          className='dispatch-job-form-upload-alert'
        />
        <div className='dispatch-job-form-help'>
          {t('sparkery.dispatch.jobForm.imageHelp', {
            count: MAX_IMAGE_COUNT,
            size: MAX_IMAGE_SIZE_MB,
          })}
        </div>
      </Form>
    </Modal>
  );
};

export default DispatchJobFormModal;
