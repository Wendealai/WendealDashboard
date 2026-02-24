import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  Upload,
  type TableColumnsType,
  type UploadFile,
  type UploadProps,
} from 'antd';
import {
  CloudUploadOutlined,
  DatabaseOutlined,
  FileSearchOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SyncOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { useMessage } from '@/hooks';
import {
  getInvoiceSourceBlob,
  removeInvoiceSourceBlob,
} from '@/services/invoiceIngestionBlobStore';
import { invoiceIngestionAssistantService } from '@/services/invoiceIngestionAssistantService';
import type {
  InvoiceAssistantDocument,
  InvoiceAssistantSettings,
  InvoiceReviewDraft,
  SupplierDirectoryEntry,
  XeroTransactionType,
} from '@/pages/Tools/types/invoiceIngestionAssistant';

const { Text } = Typography;
const { Dragger } = Upload;

const STATUS_COLOR_MAP: Record<string, string> = {
  uploaded: 'default',
  recognized: 'blue',
  ready_to_sync: 'gold',
  synced: 'green',
  recognize_failed: 'red',
  sync_failed: 'volcano',
};

const statusText = (status: InvoiceAssistantDocument['status']): string => {
  switch (status) {
    case 'uploaded':
      return 'Uploaded';
    case 'recognized':
      return 'Recognized';
    case 'ready_to_sync':
      return 'Ready To Sync';
    case 'synced':
      return 'Synced';
    case 'recognize_failed':
      return 'Recognize Failed';
    case 'sync_failed':
      return 'Sync Failed';
    default:
      return status;
  }
};

const toDateString = (value: Dayjs | null): string | null =>
  value ? value.format('YYYY-MM-DD') : null;

const parseAliases = (raw: string): string[] =>
  raw
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);

const InvoiceIngestionAssistant: React.FC = () => {
  const message = useMessage();
  const [documents, setDocuments] = useState<InvoiceAssistantDocument[]>([]);
  const [settings, setSettings] = useState<InvoiceAssistantSettings | null>(
    null
  );
  const [suppliers, setSuppliers] = useState<SupplierDirectoryEntry[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [pendingFileList, setPendingFileList] = useState<UploadFile[]>([]);
  const [reviewingDocId, setReviewingDocId] = useState<string | null>(null);
  const [reviewImageUrl, setReviewImageUrl] = useState<string | null>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [supplierVisible, setSupplierVisible] = useState(false);
  const [nightBatchDate, setNightBatchDate] = useState<Dayjs | null>(dayjs());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<Dayjs | null>(null);
  const [supplierForm] = Form.useForm();
  const [reviewForm] = Form.useForm();
  const [settingsForm] = Form.useForm();
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(
    null
  );

  const refreshState = useCallback(() => {
    const state = invoiceIngestionAssistantService.getState();
    setDocuments(
      [...state.documents].sort((a, b) =>
        a.created_at < b.created_at ? 1 : -1
      )
    );
    setSuppliers(state.suppliers);
    setSettings(state.settings);
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  const reviewingDoc = useMemo(
    () => documents.find(item => item.document_id === reviewingDocId) || null,
    [documents, reviewingDocId]
  );

  useEffect(() => {
    let disposed = false;
    let objectUrl = '';

    const loadPreview = async () => {
      if (!reviewingDoc) {
        setReviewImageUrl(null);
        return;
      }
      const blobRecord = await getInvoiceSourceBlob(reviewingDoc.document_id);
      if (!blobRecord || disposed) {
        setReviewImageUrl(null);
        return;
      }
      objectUrl = URL.createObjectURL(blobRecord.blob);
      setReviewImageUrl(objectUrl);
    };

    void loadPreview();

    return () => {
      disposed = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [reviewingDoc]);

  useEffect(() => {
    if (!reviewingDoc?.review) {
      reviewForm.resetFields();
      return;
    }
    reviewForm.setFieldsValue({
      ...reviewingDoc.review,
      invoice_date: reviewingDoc.review.invoice_date
        ? dayjs(reviewingDoc.review.invoice_date)
        : null,
      due_date: reviewingDoc.review.due_date
        ? dayjs(reviewingDoc.review.due_date)
        : null,
    });
  }, [reviewForm, reviewingDoc]);

  useEffect(() => {
    if (!settings) {
      return;
    }
    settingsForm.setFieldsValue(settings);
  }, [settings, settingsForm]);

  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      if (statusFilter !== 'all' && doc.status !== statusFilter) {
        return false;
      }
      if (
        dateFilter &&
        doc.archive_date_folder !== dateFilter.format('YYYY-MM-DD')
      ) {
        return false;
      }
      return true;
    });
  }, [dateFilter, documents, statusFilter]);

  const metrics = useMemo(() => {
    const pendingSync = documents.filter(
      item => item.status === 'ready_to_sync'
    ).length;
    const pendingReview = documents.filter(
      item => item.status === 'recognized' || item.status === 'uploaded'
    ).length;
    const synced = documents.filter(item => item.status === 'synced').length;
    const failed = documents.filter(
      item =>
        item.status === 'recognize_failed' || item.status === 'sync_failed'
    ).length;
    return {
      total: documents.length,
      pendingSync,
      pendingReview,
      synced,
      failed,
    };
  }, [documents]);

  const selectedDocumentIds = useMemo(
    () => selectedRowKeys.map(item => String(item)),
    [selectedRowKeys]
  );

  const withAction = useCallback(
    async (key: string, action: () => Promise<void>) => {
      setActionLoading(key);
      try {
        await action();
      } finally {
        setActionLoading(null);
      }
    },
    []
  );

  const ensureSelection = useCallback((): boolean => {
    if (selectedDocumentIds.length > 0) {
      return true;
    }
    message.warning('Please select at least one queue item.');
    return false;
  }, [message, selectedDocumentIds.length]);

  const handleArchiveUpload = useCallback(async () => {
    const files = pendingFileList
      .map(item => item.originFileObj)
      .filter((item): item is Exclude<UploadFile['originFileObj'], undefined> =>
        Boolean(item)
      );

    if (files.length === 0) {
      message.warning('Select files first.');
      return;
    }

    await withAction('archive', async () => {
      const summary =
        await invoiceIngestionAssistantService.uploadAndArchive(files);
      setPendingFileList([]);
      refreshState();
      message.success(
        `Archived ${summary.succeeded}/${summary.total} file(s) to queue.`
      );
    });
  }, [message, pendingFileList, refreshState, withAction]);

  const handleRecognizeSelected = useCallback(async () => {
    if (!ensureSelection()) {
      return;
    }
    await withAction('recognize', async () => {
      const summary =
        await invoiceIngestionAssistantService.batchRecognize(
          selectedDocumentIds
        );
      refreshState();
      message.success(
        `Recognized ${summary.succeeded}/${summary.total}. Failed: ${summary.failed}.`
      );
    });
  }, [ensureSelection, message, refreshState, selectedDocumentIds, withAction]);

  const handleReadySelected = useCallback(async () => {
    if (!ensureSelection()) {
      return;
    }
    await withAction('ready', async () => {
      const summary =
        invoiceIngestionAssistantService.markReadyToSync(selectedDocumentIds);
      refreshState();
      message.success(
        `Ready items: ${summary.succeeded}/${summary.total}. Blocked: ${summary.failed}.`
      );
    });
  }, [ensureSelection, message, refreshState, selectedDocumentIds, withAction]);

  const handleSyncSelected = useCallback(async () => {
    if (!ensureSelection()) {
      return;
    }
    await withAction('sync', async () => {
      const summary =
        await invoiceIngestionAssistantService.batchSyncToXero(
          selectedDocumentIds
        );
      refreshState();
      message.success(
        `Synced ${summary.succeeded}/${summary.total}. Failed: ${summary.failed}.`
      );
    });
  }, [ensureSelection, message, refreshState, selectedDocumentIds, withAction]);

  const handleNightBatchSelect = useCallback(() => {
    if (!nightBatchDate) {
      message.warning('Choose a date first.');
      return;
    }
    const targetFolder = nightBatchDate.format('YYYY-MM-DD');
    const pendingIds = documents
      .filter(
        item =>
          item.archive_date_folder === targetFolder && item.status !== 'synced'
      )
      .map(item => item.document_id);
    setSelectedRowKeys(pendingIds);
    message.success(
      `Selected ${pendingIds.length} pending item(s) for ${targetFolder}.`
    );
  }, [documents, message, nightBatchDate]);

  const handleSaveSettings = useCallback(async () => {
    const values = await settingsForm.validateFields();
    const nextSettings = invoiceIngestionAssistantService.saveSettings({
      drive_root_folder: values.drive_root_folder,
      drive_archive_endpoint: values.drive_archive_endpoint || null,
      ocr_extract_endpoint: values.ocr_extract_endpoint || null,
      xero_sync_endpoint: values.xero_sync_endpoint || null,
      default_currency: values.default_currency || 'AUD',
      default_transaction_type: values.default_transaction_type,
      dry_run_mode: Boolean(values.dry_run_mode),
    });
    setSettings(nextSettings);
    setSettingsVisible(false);
    message.success('Assistant settings saved.');
  }, [message, settingsForm]);

  const handleSaveSupplier = useCallback(async () => {
    const values = await supplierForm.validateFields();
    const supplierPayload: Omit<SupplierDirectoryEntry, 'id'> & {
      id?: string;
    } = {
      name: values.name,
      aliases: parseAliases(values.aliases || ''),
      abn: values.abn || null,
      default_account_code: values.default_account_code || null,
      default_tax_type: values.default_tax_type || null,
      default_currency: values.default_currency || null,
      default_transaction_type: values.default_transaction_type || null,
    };
    if (editingSupplierId) {
      supplierPayload.id = editingSupplierId;
    }
    invoiceIngestionAssistantService.upsertSupplier(supplierPayload);
    refreshState();
    setEditingSupplierId(null);
    supplierForm.resetFields();
    message.success('Supplier directory updated.');
  }, [editingSupplierId, message, refreshState, supplierForm]);

  const handleEditSupplier = useCallback(
    (supplier: SupplierDirectoryEntry) => {
      setEditingSupplierId(supplier.id);
      supplierForm.setFieldsValue({
        name: supplier.name,
        aliases: supplier.aliases.join(', '),
        abn: supplier.abn || '',
        default_account_code: supplier.default_account_code || '',
        default_tax_type: supplier.default_tax_type || '',
        default_currency: supplier.default_currency || '',
        default_transaction_type: supplier.default_transaction_type,
      });
    },
    [supplierForm]
  );

  const handleDeleteSupplier = useCallback(
    (supplierId: string) => {
      invoiceIngestionAssistantService.removeSupplier(supplierId);
      if (editingSupplierId === supplierId) {
        setEditingSupplierId(null);
        supplierForm.resetFields();
      }
      refreshState();
      message.success('Supplier removed.');
    },
    [editingSupplierId, message, refreshState, supplierForm]
  );

  const handleAutoClassifyReview = useCallback(() => {
    const supplierName = String(
      reviewForm.getFieldValue('supplier_name') || ''
    );
    if (!supplierName) {
      message.warning('Supplier name is required for classification.');
      return;
    }
    const normalized = supplierName.toUpperCase();
    const matchedSupplier = suppliers.find(item =>
      [item.name, ...item.aliases]
        .map(alias => alias.toUpperCase())
        .some(alias => normalized.includes(alias))
    );
    if (!matchedSupplier) {
      message.warning('No supplier profile matched.');
      return;
    }

    reviewForm.setFieldsValue({
      account_code: matchedSupplier.default_account_code,
      tax_type: matchedSupplier.default_tax_type,
      currency:
        matchedSupplier.default_currency ||
        String(reviewForm.getFieldValue('currency') || 'AUD'),
      transaction_type:
        matchedSupplier.default_transaction_type ||
        String(reviewForm.getFieldValue('transaction_type') || 'SPEND_MONEY'),
      abn: reviewForm.getFieldValue('abn') || matchedSupplier.abn,
    });

    message.success(`Applied defaults from ${matchedSupplier.name}.`);
  }, [message, reviewForm, suppliers]);

  const applyQuickGst = useCallback(
    (gstStatus: InvoiceReviewDraft['gst_status']) => {
      reviewForm.setFieldValue('gst_status', gstStatus);
      if (gstStatus === 'no_gst_indicated') {
        reviewForm.setFieldValue('gst_amount', null);
      }
    },
    [reviewForm]
  );

  const handleSaveReview = useCallback(async () => {
    if (!reviewingDoc) {
      return;
    }
    const values = await reviewForm.validateFields();
    invoiceIngestionAssistantService.updateReview(reviewingDoc.document_id, {
      invoice_date: toDateString(values.invoice_date),
      due_date: toDateString(values.due_date),
      supplier_name: values.supplier_name || null,
      abn: values.abn || null,
      invoice_number: values.invoice_number || null,
      currency: values.currency || 'AUD',
      total:
        typeof values.total === 'number' && Number.isFinite(values.total)
          ? values.total
          : null,
      gst_amount:
        typeof values.gst_amount === 'number' &&
        Number.isFinite(values.gst_amount)
          ? values.gst_amount
          : null,
      gst_status: values.gst_status,
      tax_invoice_flag: Boolean(values.tax_invoice_flag),
      category: values.category || null,
      account_code: values.account_code || null,
      tax_type: values.tax_type || null,
      description: values.description || null,
      payment_method: values.payment_method || null,
      transaction_type: values.transaction_type as XeroTransactionType,
    });
    refreshState();
    message.success('Review draft saved.');
  }, [message, refreshState, reviewForm, reviewingDoc]);

  const handleDeleteDocument = useCallback(
    async (documentId: string) => {
      await removeInvoiceSourceBlob(documentId);
      invoiceIngestionAssistantService.deleteDocument(documentId);
      setSelectedRowKeys(current =>
        current.filter(item => String(item) !== documentId)
      );
      refreshState();
      message.success('Queue item deleted.');
    },
    [message, refreshState]
  );

  const columns = useMemo<TableColumnsType<InvoiceAssistantDocument>>(
    () => [
      {
        title: 'Document',
        dataIndex: 'document_id',
        width: 220,
        render: (_value, record) => (
          <Space direction='vertical' size={2}>
            <Text strong>{record.document_id}</Text>
            <Text type='secondary' style={{ fontSize: 12 }}>
              {record.file_name}
            </Text>
          </Space>
        ),
      },
      {
        title: 'Archive',
        dataIndex: 'archive_date_folder',
        width: 150,
      },
      {
        title: 'Supplier',
        width: 170,
        render: (_value, record) =>
          record.review?.supplier_name ||
          record.extraction?.supplier_name ||
          '-',
      },
      {
        title: 'Date',
        width: 130,
        render: (_value, record) => record.review?.invoice_date || '-',
      },
      {
        title: 'Total',
        width: 120,
        render: (_value, record) =>
          typeof record.review?.total === 'number'
            ? `${record.review.currency} ${record.review.total.toFixed(2)}`
            : '-',
      },
      {
        title: 'Status',
        dataIndex: 'status',
        width: 130,
        render: value => (
          <Tag color={STATUS_COLOR_MAP[value] || 'default'}>
            {statusText(value)}
          </Tag>
        ),
      },
      {
        title: 'Drive',
        width: 130,
        render: (_value, record) =>
          record.drive_url ? (
            <a href={record.drive_url} target='_blank' rel='noreferrer'>
              Open
            </a>
          ) : (
            <Text type='secondary'>N/A</Text>
          ),
      },
      {
        title: 'Xero',
        width: 150,
        render: (_value, record) =>
          record.xero_id ? (
            <Text copyable={{ text: record.xero_id }}>{record.xero_id}</Text>
          ) : (
            <Text type='secondary'>-</Text>
          ),
      },
      {
        title: 'Actions',
        key: 'actions',
        width: 210,
        fixed: 'right',
        render: (_value, record) => (
          <Space wrap>
            <Button
              size='small'
              onClick={() => setReviewingDocId(record.document_id)}
            >
              Review
            </Button>
            <Button
              size='small'
              danger
              onClick={() => {
                void handleDeleteDocument(record.document_id);
              }}
            >
              Delete
            </Button>
          </Space>
        ),
      },
    ],
    [handleDeleteDocument]
  );

  const uploadProps: UploadProps = {
    multiple: true,
    accept: 'image/*,.pdf',
    beforeUpload: () => false,
    fileList: pendingFileList,
    onChange: info => setPendingFileList(info.fileList),
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Card>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} lg={6}>
            <Statistic title='Total Docs' value={metrics.total} />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic title='Pending Review' value={metrics.pendingReview} />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic title='Ready To Sync' value={metrics.pendingSync} />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Statistic
              title='Synced / Failed'
              value={`${metrics.synced} / ${metrics.failed}`}
            />
          </Col>
        </Row>
      </Card>

      <Card
        title={
          <Space>
            <UploadOutlined />
            <span>Capture & Archive</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<SafetyCertificateOutlined />}
              onClick={() => setSettingsVisible(true)}
            >
              Settings
            </Button>
            <Button
              icon={<DatabaseOutlined />}
              onClick={() => setSupplierVisible(true)}
            >
              Supplier Directory
            </Button>
          </Space>
        }
      >
        <Dragger {...uploadProps}>
          <p className='ant-upload-drag-icon'>
            <UploadOutlined style={{ color: '#1677ff', fontSize: 24 }} />
          </p>
          <p className='ant-upload-text'>
            Drag receipts/invoices here, or click to select files
          </p>
          <p className='ant-upload-hint'>
            Daytime capture now, night review/sync in batch later.
          </p>
        </Dragger>
        <Divider style={{ margin: '12px 0' }} />
        <Space wrap>
          <Button
            type='primary'
            icon={<CloudUploadOutlined />}
            loading={actionLoading === 'archive'}
            onClick={() => {
              void handleArchiveUpload();
            }}
          >
            Archive To Drive Queue
          </Button>
          <Text type='secondary'>
            Root folder: {settings?.drive_root_folder || 'Invoices'}
          </Text>
        </Space>
      </Card>

      <Card
        title={
          <Space>
            <FileSearchOutlined />
            <span>Queue Management</span>
          </Space>
        }
      >
        <Space wrap style={{ marginBottom: 12 }}>
          <Select
            value={statusFilter}
            style={{ width: 190 }}
            onChange={setStatusFilter}
            options={[
              { label: 'All Statuses', value: 'all' },
              { label: 'Uploaded', value: 'uploaded' },
              { label: 'Recognized', value: 'recognized' },
              { label: 'Ready To Sync', value: 'ready_to_sync' },
              { label: 'Synced', value: 'synced' },
              { label: 'Recognize Failed', value: 'recognize_failed' },
              { label: 'Sync Failed', value: 'sync_failed' },
            ]}
          />
          <DatePicker value={dateFilter} onChange={setDateFilter} allowClear />
          <Button icon={<ReloadOutlined />} onClick={refreshState}>
            Refresh
          </Button>
        </Space>

        <Space wrap style={{ marginBottom: 12 }}>
          <Button
            icon={<FileSearchOutlined />}
            loading={actionLoading === 'recognize'}
            onClick={() => {
              void handleRecognizeSelected();
            }}
          >
            Batch Recognize
          </Button>
          <Button
            icon={<SyncOutlined />}
            loading={actionLoading === 'ready'}
            onClick={() => {
              void handleReadySelected();
            }}
          >
            Mark Ready
          </Button>
          <Button
            type='primary'
            icon={<SyncOutlined />}
            loading={actionLoading === 'sync'}
            onClick={() => {
              void handleSyncSelected();
            }}
          >
            Sync To Xero
          </Button>
        </Space>

        <Space wrap style={{ marginBottom: 12 }}>
          <DatePicker value={nightBatchDate} onChange={setNightBatchDate} />
          <Button onClick={handleNightBatchSelect}>
            Night Batch: Select Day Pending
          </Button>
          <Text type='secondary'>
            Flow: Select day, recognize, review, sync.
          </Text>
        </Space>

        <Table
          rowKey='document_id'
          rowSelection={{
            selectedRowKeys,
            onChange: keys => setSelectedRowKeys(keys),
          }}
          columns={columns}
          dataSource={filteredDocuments}
          size='small'
          scroll={{ x: 1400 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
        />
      </Card>

      <Drawer
        title='Review Before Sync'
        open={Boolean(reviewingDoc)}
        width={560}
        onClose={() => setReviewingDocId(null)}
        extra={
          <Space>
            <Button onClick={handleAutoClassifyReview}>
              One-click classify
            </Button>
            <Button
              type='primary'
              onClick={() => {
                void handleSaveReview();
              }}
            >
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
                rules={[{ required: true, message: 'Required' }]}
              >
                <Input />
              </Form.Item>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name='abn' label='ABN'>
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name='invoice_number' label='Invoice Number'>
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name='total'
                    label='Total'
                    rules={[{ required: true, message: 'Required' }]}
                  >
                    <InputNumber
                      min={0}
                      precision={2}
                      style={{ width: '100%' }}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name='gst_amount' label='GST Amount'>
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
                  onClick={() => applyQuickGst('included_unknown_amount')}
                >
                  GST Included
                </Button>
                <Button
                  size='small'
                  onClick={() => applyQuickGst('no_gst_indicated')}
                >
                  No GST
                </Button>
                <Button size='small' onClick={() => applyQuickGst('mixed')}>
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
                  <Form.Item name='account_code' label='Account Code'>
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

      <Modal
        title='Assistant Settings'
        open={settingsVisible}
        onCancel={() => setSettingsVisible(false)}
        onOk={() => {
          void handleSaveSettings();
        }}
      >
        <Form form={settingsForm} layout='vertical'>
          <Form.Item
            name='drive_root_folder'
            label='Google Drive Root Folder'
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name='drive_archive_endpoint'
            label='Drive Archive Endpoint'
          >
            <Input placeholder='Optional backend endpoint URL' />
          </Form.Item>
          <Form.Item name='ocr_extract_endpoint' label='OCR Extract Endpoint'>
            <Input placeholder='Optional backend endpoint URL' />
          </Form.Item>
          <Form.Item name='xero_sync_endpoint' label='Xero Sync Endpoint'>
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
          <Form.Item name='dry_run_mode' label='Dry-run Mode'>
            <Select
              options={[
                { label: 'Enabled', value: true },
                { label: 'Disabled', value: false },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title='Supplier Directory'
        open={supplierVisible}
        onCancel={() => setSupplierVisible(false)}
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
                  rules={[{ required: true }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item name='aliases' label='Aliases (comma separated)'>
                  <Input />
                </Form.Item>
                <Form.Item name='abn' label='ABN'>
                  <Input />
                </Form.Item>
                <Form.Item
                  name='default_account_code'
                  label='Default Account Code'
                >
                  <Input />
                </Form.Item>
                <Form.Item name='default_tax_type' label='Default Tax Type'>
                  <Input />
                </Form.Item>
                <Form.Item name='default_currency' label='Default Currency'>
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
                  <Button
                    type='primary'
                    onClick={() => {
                      void handleSaveSupplier();
                    }}
                  >
                    {editingSupplierId ? 'Update' : 'Add'}
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingSupplierId(null);
                      supplierForm.resetFields();
                    }}
                  >
                    Clear
                  </Button>
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
                    width: 140,
                    render: (_value, record: SupplierDirectoryEntry) => (
                      <Space>
                        <Button
                          size='small'
                          onClick={() => handleEditSupplier(record)}
                        >
                          Edit
                        </Button>
                        <Button
                          size='small'
                          danger
                          onClick={() => handleDeleteSupplier(record.id)}
                        >
                          Delete
                        </Button>
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
    </div>
  );
};

export default InvoiceIngestionAssistant;
