import React from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
} from 'antd';
import type { FormInstance } from 'antd';
import type {
  InvoiceAssistantDocument,
  InvoiceReviewDraft,
} from '@/pages/Tools/types/invoiceIngestionAssistant';

interface ReviewDrawerProps {
  reviewingDoc: InvoiceAssistantDocument | null;
  reviewImageUrl: string | null;
  reviewForm: FormInstance;
  onClose: () => void;
  onSave: () => void;
  onAutoClassify: () => void;
  onApplyQuickGst: (gstStatus: InvoiceReviewDraft['gst_status']) => void;
}

const validateOptionalAbn = async (_rule: unknown, value: string) => {
  if (!value) {
    return;
  }
  const digits = String(value).replace(/\s+/g, '');
  if (!/^\d{11}$/.test(digits)) {
    throw new Error('ABN must be 11 digits');
  }
};

const validateOptionalAccountCode = async (_rule: unknown, value: string) => {
  if (!value) {
    return;
  }
  if (!/^[A-Za-z0-9-]{1,20}$/.test(String(value))) {
    throw new Error('Use letters/numbers with optional "-" (max 20 chars)');
  }
};

const ReviewDrawer: React.FC<ReviewDrawerProps> = ({
  reviewingDoc,
  reviewImageUrl,
  reviewForm,
  onClose,
  onSave,
  onAutoClassify,
  onApplyQuickGst,
}) => {
  return (
    <Drawer
      title='Review Before Sync'
      open={Boolean(reviewingDoc)}
      width={560}
      onClose={onClose}
      extra={
        <Space>
          <Button onClick={onAutoClassify}>One-click classify</Button>
          <Button type='primary' onClick={onSave}>
            Save Draft
          </Button>
        </Space>
      }
    >
      {reviewingDoc && (
        <>
          <Alert
            type={reviewingDoc.needs_human_review ? 'warning' : 'success'}
            message={
              reviewingDoc.needs_human_review
                ? 'Manual review required before sync.'
                : 'Draft looks ready to sync.'
            }
            description={
              reviewingDoc.reasons.length > 0
                ? reviewingDoc.reasons.join(' | ')
                : 'No validation blockers.'
            }
            showIcon
            style={{ marginBottom: 12 }}
          />
          {reviewImageUrl && (
            <Card
              size='small'
              title='Original Document'
              style={{ marginBottom: 12 }}
            >
              <img
                src={reviewImageUrl}
                alt={reviewingDoc.file_name}
                style={{
                  width: '100%',
                  borderRadius: 8,
                  objectFit: 'contain',
                }}
              />
            </Card>
          )}
          <Form form={reviewForm} layout='vertical'>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name='transaction_type'
                  label='Transaction Type'
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
              <Col span={12}>
                <Form.Item
                  name='currency'
                  label='Currency'
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
            </Row>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name='invoice_date'
                  label='Invoice Date'
                  rules={[{ required: true, message: 'Required' }]}
                >
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name='due_date' label='Due Date'>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name='supplier_name'
              label='Supplier Name'
              rules={[
                { required: true, message: 'Required' },
                { min: 2, message: 'Supplier name is too short' },
              ]}
            >
              <Input />
            </Form.Item>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name='abn'
                  label='ABN'
                  rules={[{ validator: validateOptionalAbn }]}
                >
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name='invoice_number'
                  label='Invoice Number'
                  rules={[{ max: 80, message: 'Max 80 characters' }]}
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item
                  name='total'
                  label='Total'
                  rules={[
                    { required: true, message: 'Required' },
                    {
                      validator: async (_rule, value: number | null) => {
                        if (typeof value === 'number' && value > 0) {
                          return;
                        }
                        throw new Error('Total must be greater than 0');
                      },
                    },
                  ]}
                >
                  <InputNumber
                    min={0}
                    precision={2}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name='gst_amount'
                  label='GST Amount'
                  rules={[
                    {
                      validator: async (_rule, value: number | null) => {
                        if (typeof value !== 'number') {
                          return;
                        }
                        if (value < 0) {
                          throw new Error('GST amount cannot be negative');
                        }
                      },
                    },
                  ]}
                >
                  <InputNumber
                    min={0}
                    precision={2}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name='gst_status' label='GST Status'>
              <Select
                options={[
                  { label: 'Explicit Amount', value: 'explicit_amount' },
                  {
                    label: 'Included, Amount Unknown',
                    value: 'included_unknown_amount',
                  },
                  { label: 'No GST Indicated', value: 'no_gst_indicated' },
                  { label: 'Unknown', value: 'unknown' },
                  { label: 'Mixed', value: 'mixed' },
                ]}
              />
            </Form.Item>

            <Space wrap style={{ marginBottom: 10 }}>
              <Button
                size='small'
                onClick={() => onApplyQuickGst('included_unknown_amount')}
              >
                GST Included
              </Button>
              <Button
                size='small'
                onClick={() => onApplyQuickGst('no_gst_indicated')}
              >
                No GST
              </Button>
              <Button size='small' onClick={() => onApplyQuickGst('mixed')}>
                Mixed
              </Button>
            </Space>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name='category' label='Category'>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name='account_code'
                  label='Account Code'
                  rules={[{ validator: validateOptionalAccountCode }]}
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name='tax_type' label='Tax Type'>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name='payment_method' label='Payment Method'>
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name='description' label='Description'>
              <Input.TextArea rows={2} />
            </Form.Item>
          </Form>
        </>
      )}
    </Drawer>
  );
};

export default ReviewDrawer;
