import React from 'react';
import { Col, Form, Input, InputNumber, Modal, Row, Select } from 'antd';
import type { FormInstance } from 'antd';

interface AssistantSettingsModalProps {
  open: boolean;
  settingsForm: FormInstance;
  onCancel: () => void;
  onSave: () => void;
}

const validateOptionalUrl = async (_rule: unknown, value: string) => {
  if (!value) {
    return;
  }
  try {
    const parsed = new URL(String(value));
    if (!parsed.protocol.startsWith('http')) {
      throw new Error('Only http/https URLs are allowed');
    }
  } catch (_error) {
    throw new Error('Enter a valid URL');
  }
};

const AssistantSettingsModal: React.FC<AssistantSettingsModalProps> = ({
  open,
  settingsForm,
  onCancel,
  onSave,
}) => {
  return (
    <Modal
      title='Assistant Settings'
      open={open}
      onCancel={onCancel}
      onOk={onSave}
    >
      <Form form={settingsForm} layout='vertical'>
        <Form.Item
          name='drive_root_folder'
          label='Google Drive Root Folder'
          rules={[
            { required: true },
            { max: 120, message: 'Max 120 characters' },
          ]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          name='state_sync_endpoint'
          label='State Sync Endpoint'
          rules={[{ validator: validateOptionalUrl }]}
        >
          <Input placeholder='Optional backend endpoint URL' />
        </Form.Item>
        <Form.Item
          name='orchestration_endpoint'
          label='Orchestration Endpoint'
          rules={[{ validator: validateOptionalUrl }]}
        >
          <Input placeholder='Optional backend endpoint URL' />
        </Form.Item>
        <Form.Item
          name='drive_archive_endpoint'
          label='Drive Archive Endpoint'
          rules={[{ validator: validateOptionalUrl }]}
        >
          <Input placeholder='Optional backend endpoint URL' />
        </Form.Item>
        <Form.Item
          name='ocr_extract_endpoint'
          label='OCR Extract Endpoint'
          rules={[{ validator: validateOptionalUrl }]}
        >
          <Input placeholder='Optional backend endpoint URL' />
        </Form.Item>
        <Form.Item
          name='xero_sync_endpoint'
          label='Xero Sync Endpoint'
          rules={[{ validator: validateOptionalUrl }]}
        >
          <Input placeholder='Optional backend endpoint URL' />
        </Form.Item>
        <Form.Item
          name='xero_attachment_endpoint'
          label='Xero Attachment Endpoint'
          rules={[{ validator: validateOptionalUrl }]}
        >
          <Input placeholder='Optional backend endpoint URL' />
        </Form.Item>
        <Form.Item
          name='xero_duplicate_check_endpoint'
          label='Xero Duplicate Check Endpoint'
          rules={[{ validator: validateOptionalUrl }]}
        >
          <Input placeholder='Optional backend endpoint URL' />
        </Form.Item>
        <Form.Item
          name='abn_validation_endpoint'
          label='ABN Validation Endpoint'
          rules={[{ validator: validateOptionalUrl }]}
        >
          <Input placeholder='Optional backend endpoint URL' />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name='default_currency'
              label='Default Currency'
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { label: 'AUD', value: 'AUD' },
                  { label: 'USD', value: 'USD' },
                  { label: 'CNY', value: 'CNY' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name='default_transaction_type'
              label='Default Xero Type'
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { label: 'Spend Money', value: 'SPEND_MONEY' },
                  { label: 'Bill', value: 'BILL' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          name='auto_learn_supplier_rules'
          label='Auto-learn Supplier Rules'
          rules={[{ required: true }]}
        >
          <Select
            options={[
              { label: 'Enabled', value: true },
              { label: 'Disabled', value: false },
            ]}
          />
        </Form.Item>
        <Form.Item
          name='require_batch_approval'
          label='Require Batch Approval'
          rules={[{ required: true }]}
        >
          <Select
            options={[
              { label: 'Enabled', value: true },
              { label: 'Disabled', value: false },
            ]}
          />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item
              name='dry_run_mode'
              label='Dry-run Mode'
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { label: 'Enabled', value: true },
                  { label: 'Disabled', value: false },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name='blob_retention_days'
              label='Blob Retention (days)'
              rules={[{ required: true }]}
            >
              <InputNumber
                min={1}
                max={365}
                precision={0}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

export default AssistantSettingsModal;
