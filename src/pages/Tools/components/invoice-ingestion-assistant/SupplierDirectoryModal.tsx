import React from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import type { FormInstance } from 'antd';
import type { SupplierDirectoryEntry } from '@/pages/Tools/types/invoiceIngestionAssistant';

const { Text } = Typography;

interface SupplierDirectoryModalProps {
  open: boolean;
  suppliers: SupplierDirectoryEntry[];
  editingSupplierId: string | null;
  supplierForm: FormInstance;
  onCancel: () => void;
  onSave: () => void;
  onClear: () => void;
  onEditSupplier: (supplier: SupplierDirectoryEntry) => void;
  onDeleteSupplier: (supplierId: string) => void;
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

const validateOptionalCurrency = async (_rule: unknown, value: string) => {
  if (!value) {
    return;
  }
  if (!/^[A-Z]{3}$/.test(String(value))) {
    throw new Error('Currency must be a 3-letter uppercase code');
  }
};

const validateOptionalCode = async (_rule: unknown, value: string) => {
  if (!value) {
    return;
  }
  if (!/^[A-Za-z0-9-]{1,20}$/.test(String(value))) {
    throw new Error('Use letters/numbers with optional "-" (max 20 chars)');
  }
};

const SupplierDirectoryModal: React.FC<SupplierDirectoryModalProps> = ({
  open,
  suppliers,
  editingSupplierId,
  supplierForm,
  onCancel,
  onSave,
  onClear,
  onEditSupplier,
  onDeleteSupplier,
}) => {
  return (
    <Modal
      title='Supplier Directory'
      open={open}
      onCancel={onCancel}
      footer={null}
      width={860}
    >
      <Row gutter={16}>
        <Col span={10}>
          <Card size='small' title='Add / Edit Supplier'>
            <Form form={supplierForm} layout='vertical'>
              <Form.Item
                name='name'
                label='Supplier Name'
                rules={[
                  { required: true },
                  { min: 2, message: 'Supplier name is too short' },
                ]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name='aliases'
                label='Aliases (comma separated)'
                rules={[{ max: 300, message: 'Alias input is too long' }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name='abn'
                label='ABN'
                rules={[{ validator: validateOptionalAbn }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name='default_account_code'
                label='Default Account Code'
                rules={[{ validator: validateOptionalCode }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name='default_tax_type'
                label='Default Tax Type'
                rules={[{ max: 40, message: 'Max 40 characters' }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name='default_currency'
                label='Default Currency'
                rules={[{ validator: validateOptionalCurrency }]}
              >
                <Input />
              </Form.Item>
              <Form.Item
                name='default_transaction_type'
                label='Default Transaction Type'
              >
                <Select
                  allowClear
                  options={[
                    { label: 'Spend Money', value: 'SPEND_MONEY' },
                    { label: 'Bill', value: 'BILL' },
                  ]}
                />
              </Form.Item>
              <Space>
                <Button type='primary' onClick={onSave}>
                  {editingSupplierId ? 'Update' : 'Add'}
                </Button>
                <Button onClick={onClear}>Clear</Button>
              </Space>
            </Form>
          </Card>
        </Col>
        <Col span={14}>
          <Card size='small' title='Known Suppliers'>
            <Table
              rowKey='id'
              size='small'
              pagination={{ pageSize: 6 }}
              columns={[
                {
                  title: 'Name',
                  dataIndex: 'name',
                  render: (_value, record: SupplierDirectoryEntry) => (
                    <Space direction='vertical' size={0}>
                      <Text strong>{record.name}</Text>
                      <Text type='secondary' style={{ fontSize: 12 }}>
                        {record.aliases.join(', ') || '-'}
                      </Text>
                    </Space>
                  ),
                },
                {
                  title: 'Defaults',
                  width: 170,
                  render: (_value, record: SupplierDirectoryEntry) => (
                    <Text style={{ fontSize: 12 }}>
                      {record.default_account_code || '-'} /{' '}
                      {record.default_tax_type || '-'}
                    </Text>
                  ),
                },
                {
                  title: 'Actions',
                  width: 160,
                  render: (_value, record: SupplierDirectoryEntry) => (
                    <Space>
                      <Button
                        size='small'
                        onClick={() => onEditSupplier(record)}
                      >
                        Edit
                      </Button>
                      <Popconfirm
                        title='Delete supplier profile?'
                        description='This action cannot be undone.'
                        okText='Delete'
                        cancelText='Cancel'
                        onConfirm={() => onDeleteSupplier(record.id)}
                      >
                        <Button size='small' danger>
                          Delete
                        </Button>
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
              dataSource={suppliers}
            />
          </Card>
        </Col>
      </Row>
    </Modal>
  );
};

export default SupplierDirectoryModal;
