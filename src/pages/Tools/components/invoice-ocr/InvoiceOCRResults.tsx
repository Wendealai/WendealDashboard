/**
 * Invoice OCR Results Display Component
 *
 * A comprehensive component for displaying OCR processing results with advanced
 * data visualization, export capabilities, and result management features.
 *
 * Features:
 * - Results table with sorting and filtering
 * - Detailed result view with extracted data
 * - Google Sheets export integration
 * - Result validation and editing
 * - Batch operations support
 * - Progress tracking and status updates
 * - Error handling and retry mechanisms
 *
 * @component
 * @example
 * ```tsx
 * <InvoiceOCRResults
 *   results={ocrResults}
 *   loading={false}
 *   onExportToSheets={() => exportToSheets()}
 *   onValidateResult={(resultId, isValid) => validateResult(resultId, isValid)}
 * />
 * ```
 *
 * @see {@link InvoiceOCRResult} - Result data structure
 * @see {@link InvoiceOCRPage} - Parent page component
 * @see {@link invoiceOCRService} - Service for result operations
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Typography,
  Badge,
  Tag,
  Tooltip,
  Progress,
  Statistic,
  Row,
  Col,
  Alert,
  Empty,
  Spin,
  Modal,
  Descriptions,
  List,
  Avatar,
  Divider,
  Dropdown,
  Menu,
  Collapse,
  Tabs,
} from 'antd';

import { useMessage } from '@/hooks';
import { useErrorModal } from '@/hooks/useErrorModal';
import { useTranslation } from 'react-i18next';
import ErrorModal from '@/components/common/ErrorModal';

const { Panel } = Collapse;
const { TabPane } = Tabs;
import {
  FileTextOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  DownloadOutlined,
  GoogleOutlined,
  ReloadOutlined,
  DeleteOutlined,
  MoreOutlined,
  CloudDownloadOutlined,
  BulbOutlined,
  CloseCircleOutlined,
  BarChartOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { invoiceOCRService } from '../../../../services/invoiceOCRService';
import type {
  InvoiceOCRResult,
  InvoiceOCRBatchTask,
} from '../../../../pages/InformationDashboard/types/invoiceOCR';
import type { EnhancedWebhookResponse } from '@/types/workflow';

const { Title, Text } = Typography;
const { confirm } = Modal;

/**
 * Invoice OCR 结果展示组件属性接口
 */
interface InvoiceOCRResultsProps {
  /** 工作流 ID */
  workflowId: string;
  /** 批处理任务 ID */
  batchTaskId?: string;
  /** 是否显示统计信息 */
  showStats?: boolean;
  /** 是否显示历史记录 */
  showHistory?: boolean;
  /** 处理状态 */
  processingStatus?:
    | 'idle'
    | 'uploading'
    | 'processing'
    | 'completed'
    | 'error';
  /** 处理完成的数据 */
  completedData?: {
    executionId?: string;
    googleSheetsUrl?: string;
    processedFiles?: number;
    totalFiles?: number;
    hasBusinessData?: boolean;
    schemaWarnings?: string[];
    idempotencyKey?: string;
    diagnostics?: {
      httpStatus?: number;
      contentType?: string;
      attemptCount?: number;
      elapsedMs?: number;
      transportWarnings?: string[];
    };
    rawResponse?: unknown;
    /** 增强版webhook响应数据 */
    enhancedData?: EnhancedWebhookResponse;
  };
  /** 外部刷新触发令牌 */
  refreshToken?: number;
  /** 结果选择回调 */
  onResultSelect?: (result: InvoiceOCRResult) => void;
  /** 批处理任务选择回调 */
  onBatchTaskSelect?: (batchTask: InvoiceOCRBatchTask) => void;
  /** Google Sheets 跳转回调 */
  onGoogleSheetsRedirect?: (results: InvoiceOCRResult[]) => void;
  /** 处理新文件回调 - 重置到上传界面 */
  onProcessNewFiles?: () => void;
}

/**
 * 处理状态颜色映射
 */
const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'processing':
      return 'processing';
    case 'failed':
      return 'error';
    case 'pending':
      return 'default';
    case 'cancelled':
      return 'warning';
    default:
      return 'default';
  }
};

/**
 * 处理状态图标映射
 */
const getStatusIcon = (status: string): React.ReactNode => {
  switch (status) {
    case 'completed':
      return <CheckCircleOutlined />;
    case 'processing':
      return <ClockCircleOutlined />;
    case 'failed':
      return <ExclamationCircleOutlined />;
    case 'pending':
      return <ClockCircleOutlined />;
    case 'cancelled':
      return <ExclamationCircleOutlined />;
    default:
      return <ClockCircleOutlined />;
  }
};

/**
 * 文件类型图标映射
 */
const getFileTypeIcon = (fileName: string): React.ReactNode => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return <FilePdfOutlined style={{ color: '#ff4d4f' }} />;
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'tiff':
    case 'bmp':
      return <FileImageOutlined style={{ color: '#52c41a' }} />;
    default:
      return <FileTextOutlined style={{ color: '#1890ff' }} />;
  }
};

/**
 * Invoice OCR 结果展示组件
 * 展示 OCR 处理结果、统计信息和提供后续操作
 */
const InvoiceOCRResults: React.FC<InvoiceOCRResultsProps> = ({
  workflowId,
  batchTaskId,
  showStats = true,
  showHistory = true,
  processingStatus = 'idle',
  completedData,
  refreshToken = 0,
  onResultSelect,
  onBatchTaskSelect,
  onGoogleSheetsRedirect,
  onProcessNewFiles,
}) => {
  const { t } = useTranslation();
  const message = useMessage();
  const { isVisible, errorInfo, showError, hideError } = useErrorModal();
  const [results, setResults] = useState<InvoiceOCRResult[]>([]);
  const [batchTasks, setBatchTasks] = useState<InvoiceOCRBatchTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedResults, setSelectedResults] = useState<InvoiceOCRResult[]>(
    []
  );
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedResult, setSelectedResult] = useState<InvoiceOCRResult | null>(
    null
  );

  /**
   * 加载 OCR 结果数据
   */
  const loadResults = useCallback(async () => {
    if (!workflowId) return;

    setLoading(true);
    try {
      // 加载结果列表
      const resultsData = await invoiceOCRService.getResults(workflowId, {
        ...(batchTaskId && { batchTaskId }),
        page: 1,
        pageSize: 100,
      });
      setResults(resultsData.items || []);

      // 加载批处理任务
      const batchTasksData = await invoiceOCRService.getBatchTasks(workflowId, {
        page: 1,
        pageSize: 50,
      });
      setBatchTasks(batchTasksData.items || []);

      // Note: Stats and history loading removed as variables are unused
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [workflowId, batchTaskId, showStats, showHistory]);

  /**
   * 组件挂载时加载数据
   */
  useEffect(() => {
    void loadResults();
  }, [loadResults]);

  useEffect(() => {
    if (refreshToken > 0) {
      void loadResults();
    }
  }, [loadResults, refreshToken]);

  /**
   * 查看结果详情
   */
  const handleViewDetail = useCallback(
    (result: InvoiceOCRResult) => {
      setSelectedResult(result);
      setDetailModalVisible(true);
      onResultSelect?.(result);
    },
    [onResultSelect]
  );

  /**
   * 下载结果文件
   */
  const handleDownloadResult = useCallback(async (result: InvoiceOCRResult) => {
    try {
      await invoiceOCRService.downloadResult(workflowId, result.id);
      message.success('File downloaded successfully');
    } catch (error) {
      showError({
        title: 'Download failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
      });
    }
  }, []);

  /**
   * 批量下载结果
   */
  const handleBatchDownload = useCallback(async () => {
    if (selectedResults.length === 0) {
      message.warning('Please select results to download first');
      return;
    }

    try {
      const resultIds = selectedResults.map(result => result.id);
      await invoiceOCRService.downloadResults(workflowId, resultIds);
      message.success('Batch download successful');
    } catch (error) {
      showError({
        title: 'Batch download failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
      });
    }
  }, [selectedResults]);

  /**
   * 删除结果
   */
  const handleDeleteResult = useCallback(
    async (result: InvoiceOCRResult) => {
      confirm({
        title: 'Confirm Delete',
        content: `Are you sure you want to delete the result "${result.originalFile?.name || result.id}"?`,
        onOk: async () => {
          try {
            await invoiceOCRService.deleteResult(workflowId, result.id);
            message.success('Deleted successfully');
            loadResults();
          } catch (error) {
            showError({
              title: 'Delete failed',
              message: error instanceof Error ? error.message : 'Unknown error',
              details: error instanceof Error ? error.stack : undefined,
            });
          }
        },
      });
    },
    [loadResults]
  );

  /**
   * 跳转到 Google Sheets
   */
  const handleGoogleSheetsRedirect = useCallback(() => {
    const targetResults =
      selectedResults.length > 0 ? selectedResults : results;
    if (targetResults.length === 0) {
      message.warning('没有可导出的结果');
      return;
    }

    onGoogleSheetsRedirect?.(targetResults);

    // 模拟跳转到 Google Sheets
    const sheetsUrl =
      'https://docs.google.com/spreadsheets/d/1K8VGSofJUBK7yCTqtaPNQvSZ1HeGDNZOvO2UQ6SRJzg/edit?usp=sharing';
    window.open(sheetsUrl, '_blank');
    message.success(
      `正在跳转到 Google Sheets，将导出 ${targetResults.length} 条结果`
    );
  }, [selectedResults, results, onGoogleSheetsRedirect]);

  const handleCopyExecutionId = useCallback(
    async (value?: string) => {
      if (!value) {
        return;
      }

      try {
        await navigator.clipboard.writeText(value);
        message.success('Execution ID 已复制');
      } catch (copyError) {
        console.error('Failed to copy execution ID:', copyError);
        message.error('复制失败，请手动复制');
      }
    },
    [message]
  );

  const handleExportDiagnostics = useCallback(() => {
    if (!completedData) {
      message.warning('暂无可导出的诊断信息');
      return;
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      executionId: completedData.executionId || '',
      requestKey: completedData.idempotencyKey || '',
      hasBusinessData: Boolean(completedData.hasBusinessData),
      schemaWarnings: completedData.schemaWarnings || [],
      diagnostics: completedData.diagnostics || {},
      rawResponse: completedData.rawResponse || null,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `invoice-ocr-diagnostics-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    message.success('诊断信息已导出');
  }, [completedData, message]);

  /**
   * 结果表格列定义
   */
  const resultColumns: ColumnsType<InvoiceOCRResult> = [
    {
      title: 'File Name',
      dataIndex: 'originalFile',
      key: 'fileName',
      render: (originalFile: any) => (
        <Space>
          {getFileTypeIcon(originalFile?.name || '')}
          <Text strong>{originalFile?.name || ''}</Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Badge
          status={getStatusColor(status) as any}
          text={
            <Space>
              {getStatusIcon(status)}
              {status === 'completed'
                ? 'Completed'
                : status === 'processing'
                  ? 'Processing'
                  : status === 'failed'
                    ? 'Failed'
                    : status === 'pending'
                      ? 'Pending'
                      : 'Cancelled'}
            </Space>
          }
        />
      ),
    },
    {
      title: 'Confidence',
      dataIndex: 'confidence',
      key: 'confidence',
      render: (confidence: number) => (
        <Progress
          percent={Math.round(confidence * 100)}
          size='small'
          status={
            confidence >= 0.8
              ? 'success'
              : confidence >= 0.6
                ? 'normal'
                : 'exception'
          }
        />
      ),
    },
    {
      title: 'Extracted Fields',
      dataIndex: 'extractedFields',
      key: 'extractedFields',
      render: (fields: any) => (
        <Tag color='blue'>{Object.keys(fields || {}).length} fields</Tag>
      ),
    },
    {
      title: 'Processed Time',
      dataIndex: 'completedAt',
      key: 'completedAt',
      render: (completedAt: string) => (
        <Text type='secondary'>
          {completedAt ? new Date(completedAt).toLocaleString('en-US') : 'N/A'}
        </Text>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title='View Details'>
            <Button
              type='text'
              size='small'
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Tooltip title='Download Result'>
            <Button
              type='text'
              size='small'
              icon={<DownloadOutlined />}
              onClick={() => handleDownloadResult(record)}
            />
          </Tooltip>
          <Dropdown
            overlay={
              <Menu>
                <Menu.Item
                  key='delete'
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteResult(record)}
                  danger
                >
                  Delete
                </Menu.Item>
              </Menu>
            }
          >
            <Button type='text' size='small' icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  /**
   * 渲染财务统计摘要
   */
  const renderFinancialSummary = () => {
    if (!completedData?.enhancedData?.results?.[0]?.financialSummary)
      return null;

    const { financialSummary } = completedData.enhancedData.results[0];

    return (
      <Card title='💰 财务统计' size='small' style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Statistic
              title='平均金额'
              value={parseFloat(financialSummary.averageAmount)}
              precision={2}
              prefix='$'
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title='发票数量'
              value={financialSummary.count}
              prefix={<FileTextOutlined />}
            />
          </Col>
        </Row>

        <Divider style={{ margin: '16px 0' }} />

        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Statistic
              title='最小金额'
              value={parseFloat(financialSummary.minAmount)}
              precision={2}
              prefix='$'
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title='最大金额'
              value={parseFloat(financialSummary.maxAmount)}
              precision={2}
              prefix='$'
              valueStyle={{ color: '#eb2f96' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title='中位数金额'
              value={parseFloat(financialSummary.medianAmount)}
              precision={2}
              prefix='$'
              valueStyle={{ color: '#fa8c16' }}
            />
          </Col>
        </Row>
      </Card>
    );
  };

  /**
   * 渲染处理详情视图
   */
  const renderProcessingDetails = () => {
    if (!completedData?.enhancedData?.results?.[0]?.processingDetails)
      return null;

    const { processingDetails } = completedData.enhancedData.results[0];
    const { successfulInvoices, failedExtractions, qualityIssues, duplicates } =
      processingDetails;

    const successColumns = [
      {
        title: '序号',
        dataIndex: 'index',
        key: 'index',
        width: 80,
        align: 'center' as const,
      },
      {
        title: '发票号',
        dataIndex: 'invoiceNumber',
        key: 'invoiceNumber',
        width: 200,
        render: (text: string) => <Text code>{text}</Text>,
      },
      {
        title: '供应商',
        dataIndex: 'vendorName',
        key: 'vendorName',
        width: 200,
      },
      {
        title: '金额',
        dataIndex: 'totalAmount',
        key: 'totalAmount',
        width: 120,
        align: 'right' as const,
        render: (amount: number) => (
          <Text strong style={{ color: '#52c41a' }}>
            ${amount.toFixed(2)}
          </Text>
        ),
      },
    ];

    const failureColumns = [
      {
        title: '序号',
        dataIndex: 'index',
        key: 'index',
        width: 80,
        align: 'center' as const,
      },
      {
        title: '错误信息',
        dataIndex: 'error',
        key: 'error',
        render: (text: string) => (
          <Text type='danger' style={{ fontSize: '12px' }}>
            {text}
          </Text>
        ),
      },
    ];

    const qualityColumns = [
      {
        title: '序号',
        dataIndex: 'index',
        key: 'index',
        width: 80,
        align: 'center' as const,
      },
      {
        title: '发票号',
        dataIndex: 'invoiceNumber',
        key: 'invoiceNumber',
        width: 200,
        render: (text: string) => <Text code>{text}</Text>,
      },
      {
        title: '质量问题',
        dataIndex: 'issues',
        key: 'issues',
        render: (issues: string[]) => (
          <div>
            {issues.map((issue, idx) => (
              <Tag key={idx} color='orange' style={{ marginBottom: 4 }}>
                {issue}
              </Tag>
            ))}
          </div>
        ),
      },
    ];

    const duplicateColumns = [
      {
        title: '序号',
        dataIndex: 'index',
        key: 'index',
        width: 80,
        align: 'center' as const,
      },
      {
        title: '重复发票号',
        dataIndex: 'invoiceNumber',
        key: 'invoiceNumber',
        render: (text: string) => (
          <Text code type='warning'>
            {text}
          </Text>
        ),
      },
    ];

    return (
      <Card title='📋 处理详情' size='small' style={{ marginBottom: 16 }}>
        <Collapse ghost>
          <Panel
            header={
              <span>
                <CheckCircleOutlined
                  style={{ color: '#52c41a', marginRight: 8 }}
                />
                成功处理的发票 ({successfulInvoices.length})
              </span>
            }
            key='successful'
          >
            <Table
              columns={successColumns}
              dataSource={successfulInvoices}
              rowKey='index'
              size='small'
              pagination={false}
              scroll={{ y: 300 }}
            />
          </Panel>

          {failedExtractions.length > 0 && (
            <Panel
              header={
                <span>
                  <ExclamationCircleOutlined
                    style={{ color: '#ff4d4f', marginRight: 8 }}
                  />
                  失败提取记录 ({failedExtractions.length})
                </span>
              }
              key='failed'
            >
              <Table
                columns={failureColumns}
                dataSource={failedExtractions}
                rowKey='index'
                size='small'
                pagination={false}
                scroll={{ y: 200 }}
              />
            </Panel>
          )}

          {qualityIssues.length > 0 && (
            <Panel
              header={
                <span>
                  <ExclamationCircleOutlined
                    style={{ color: '#fa8c16', marginRight: 8 }}
                  />
                  质量问题 ({qualityIssues.length})
                </span>
              }
              key='quality'
            >
              <Table
                columns={qualityColumns}
                dataSource={qualityIssues}
                rowKey='index'
                size='small'
                pagination={false}
                scroll={{ y: 200 }}
              />
            </Panel>
          )}

          {duplicates.length > 0 && (
            <Panel
              header={
                <span>
                  <ExclamationCircleOutlined
                    style={{ color: '#fa8c16', marginRight: 8 }}
                  />
                  重复记录 ({duplicates.length})
                </span>
              }
              key='duplicates'
            >
              <Table
                columns={duplicateColumns}
                dataSource={duplicates}
                rowKey='index'
                size='small'
                pagination={false}
                scroll={{ y: 200 }}
              />
            </Panel>
          )}
        </Collapse>
      </Card>
    );
  };

  /**
   * 渲染处理建议部分
   */
  const renderRecommendations = () => {
    if (!completedData?.enhancedData?.results?.[0]?.recommendations)
      return null;

    const { recommendations } = completedData.enhancedData.results[0];

    return (
      <Card title='💡 处理建议' size='small' style={{ marginBottom: 16 }}>
        <List
          dataSource={recommendations}
          renderItem={(item, index) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <Avatar
                    size='small'
                    style={{
                      backgroundColor: item.includes('正常')
                        ? '#52c41a'
                        : '#fa8c16',
                      fontSize: '12px',
                    }}
                  >
                    {index + 1}
                  </Avatar>
                }
                description={
                  <Text
                    style={{
                      color: item.includes('正常') ? '#52c41a' : '#fa8c16',
                      fontSize: '14px',
                    }}
                  >
                    {item}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    );
  };

  /**
   * 渲染统计信息
   */
  const renderStats = () => {
    // 优先显示增强版数据
    if (completedData?.enhancedData?.results?.[0]) {
      return (
        <>
          {renderFinancialSummary()}
          {renderProcessingDetails()}
          {renderRecommendations()}
        </>
      );
    }

    // 后备：显示原有统计信息 (removed as stats variable is unused)
    return null;
  };

  /**
   * 渲染批处理任务列表
   */
  const renderBatchTasks = () => {
    if (batchTasks.length === 0) return null;

    return (
      <Card title='Batch Tasks' size='small' style={{ marginBottom: 16 }}>
        <List
          size='small'
          dataSource={batchTasks}
          renderItem={task => (
            <List.Item
              actions={[
                <Button
                  type='link'
                  size='small'
                  onClick={() => onBatchTaskSelect?.(task)}
                >
                  View Details
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    icon={getStatusIcon(task.status)}
                    style={{
                      backgroundColor:
                        task.status === 'completed'
                          ? '#52c41a'
                          : task.status === 'processing'
                            ? '#1890ff'
                            : '#ff4d4f',
                    }}
                  />
                }
                title={task.name}
                description={
                  <Space>
                    <Text type='secondary'>
                      {task.files?.length || 0} 个文件
                    </Text>
                    <Text type='secondary'>•</Text>
                    <Text type='secondary'>
                      {new Date(task.createdAt).toLocaleString('zh-CN')}
                    </Text>
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    );
  };

  /**
   * 渲染结果详情模态框
   */
  const renderDetailModal = () => {
    if (!selectedResult) return null;

    return (
      <Modal
        title={`结果详情 - ${selectedResult.originalFile?.name || selectedResult.id}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button
            key='download'
            icon={<DownloadOutlined />}
            onClick={() => handleDownloadResult(selectedResult)}
          >
            下载结果
          </Button>,
          <Button key='close' onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label='文件名'>
            {selectedResult.originalFile?.name || selectedResult.id}
          </Descriptions.Item>
          <Descriptions.Item label='处理状态'>
            <Badge
              status={getStatusColor(selectedResult.status) as any}
              text={selectedResult.status}
            />
          </Descriptions.Item>
          <Descriptions.Item label='置信度'>
            <Progress
              percent={
                selectedResult.confidence
                  ? Math.round(selectedResult.confidence * 100)
                  : 0
              }
              size='small'
              status={
                selectedResult.confidence && selectedResult.confidence >= 0.8
                  ? 'success'
                  : 'normal'
              }
            />
          </Descriptions.Item>
          <Descriptions.Item label='处理时间'>
            {selectedResult.completedAt
              ? new Date(selectedResult.completedAt).toLocaleString('zh-CN')
              : 'N/A'}
          </Descriptions.Item>
        </Descriptions>

        <Divider>提取的字段</Divider>
        <Descriptions bordered column={1}>
          {Object.entries(selectedResult.extractedData || {}).map(
            ([key, value]) => (
              <Descriptions.Item key={key} label={key}>
                {typeof value === 'object'
                  ? JSON.stringify(value, null, 2)
                  : String(value)}
              </Descriptions.Item>
            )
          )}
        </Descriptions>
      </Modal>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size='large' />
        <div style={{ marginTop: 16 }}>
          <Text type='secondary'>正在加载 OCR 结果...</Text>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    // 如果处理状态为完成，显示增强的处理完成内容
    if (processingStatus === 'completed' && completedData) {
      console.log('=== InvoiceOCRResults 调试信息 ===');
      console.log('completedData:', completedData);
      console.log('completedData.enhancedData:', completedData.enhancedData);

      const enhancedData = completedData.enhancedData;

      // 如果有增强数据，显示详细的处理结果
      // 检查 enhancedData 是否包含必要的字段（适配实际数据结构）
      if (
        enhancedData &&
        enhancedData.results &&
        enhancedData.results.length > 0 &&
        (enhancedData.results[0]?.summary ||
          enhancedData.results[0]?.financialSummary ||
          enhancedData.results[0]?.processingDetails)
      ) {
        console.log('显示详细的增强数据结果');
        console.log('enhancedData 包含的字段:', Object.keys(enhancedData));
        const stats = invoiceOCRService.extractProcessingStats(enhancedData);

        return (
          <div className='invoice-processing-enhanced'>
            {/* 处理完成标题 */}
            <Card
              style={{
                textAlign: 'center',
                background: 'linear-gradient(135deg, #f6ffed 0%, #f0f9ff 100%)',
                border: '1px solid #b7eb8f',
                borderRadius: '12px',
                padding: '32px 20px',
                marginBottom: 24,
              }}
            >
              <CheckCircleOutlined
                style={{
                  fontSize: 64,
                  color: '#52c41a',
                  marginBottom: 16,
                }}
              />
              <Title level={2} style={{ color: '#52c41a', marginBottom: 8 }}>
                🎉 Invoice Processing Completed!
              </Title>
              <Text type='secondary' style={{ fontSize: 16 }}>
                Your invoices have been successfully processed and analyzed
              </Text>
              {(completedData.executionId || completedData.idempotencyKey) && (
                <div style={{ marginTop: 12 }}>
                  <Space size='middle' wrap>
                    {completedData.executionId && (
                      <Tag color='blue' style={{ padding: '4px 8px' }}>
                        Execution ID: {completedData.executionId}
                      </Tag>
                    )}
                    {completedData.executionId && (
                      <Button
                        size='small'
                        icon={<CopyOutlined />}
                        onClick={() =>
                          void handleCopyExecutionId(completedData.executionId)
                        }
                      >
                        复制 ID
                      </Button>
                    )}
                    {completedData.idempotencyKey && (
                      <Tag color='purple' style={{ padding: '4px 8px' }}>
                        Request Key: {completedData.idempotencyKey}
                      </Tag>
                    )}
                    {typeof completedData.diagnostics?.attemptCount ===
                      'number' && (
                      <Tag color='geekblue' style={{ padding: '4px 8px' }}>
                        Attempts: {completedData.diagnostics.attemptCount}
                      </Tag>
                    )}
                    {typeof completedData.diagnostics?.elapsedMs ===
                      'number' && (
                      <Tag color='cyan' style={{ padding: '4px 8px' }}>
                        Elapsed: {completedData.diagnostics.elapsedMs}ms
                      </Tag>
                    )}
                    <Button
                      size='small'
                      icon={<DownloadOutlined />}
                      onClick={handleExportDiagnostics}
                    >
                      导出诊断
                    </Button>
                  </Space>
                </div>
              )}
            </Card>

            {/* 处理建议 */}
            {enhancedData.results[0]?.recommendations &&
              enhancedData.results[0].recommendations.length > 0 && (
                <Card title='💡 Recommendations' style={{ marginBottom: 24 }}>
                  <List
                    dataSource={enhancedData.results[0].recommendations}
                    renderItem={(recommendation: string) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<BulbOutlined style={{ color: '#1890ff' }} />}
                          description={recommendation}
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              )}

            {/* 操作按钮 */}
            <Card>
              <Space
                size='large'
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {(enhancedData.googleSheetsUrl ||
                  completedData?.googleSheetsUrl) && (
                  <Button
                    type='primary'
                    size='large'
                    icon={<GoogleOutlined />}
                    onClick={() => {
                      const url =
                        enhancedData.googleSheetsUrl ||
                        completedData?.googleSheetsUrl;
                      console.log('Opening Google Sheets:', url);
                      window.open(url, '_blank');
                    }}
                    style={{
                      background: '#52c41a',
                      borderColor: '#52c41a',
                      borderRadius: '8px',
                      height: '48px',
                      padding: '0 32px',
                      fontSize: '16px',
                    }}
                  >
                    View Google Sheets
                  </Button>
                )}
                <Button
                  type='primary'
                  size='large'
                  icon={<CloudDownloadOutlined />}
                  onClick={() => {
                    const url =
                      'https://drive.google.com/drive/folders/1bF1UhR6cWhaTe_JulYMlQdW_dxVVCzVp?usp=sharing';
                    console.log('Opening Google Drive:', url);
                    window.open(url, '_blank');
                  }}
                  style={{
                    background: '#1890ff',
                    borderColor: '#1890ff',
                    borderRadius: '8px',
                    height: '48px',
                    padding: '0 32px',
                    fontSize: '16px',
                  }}
                >
                  View Google Drive
                </Button>
                <Button
                  size='large'
                  onClick={() => {
                    if (onProcessNewFiles) {
                      onProcessNewFiles();
                    } else {
                      window.location.reload();
                    }
                  }}
                  style={{
                    borderRadius: '8px',
                    height: '48px',
                    padding: '0 24px',
                  }}
                >
                  Process New Files
                </Button>
              </Space>
            </Card>

            {/* 财务摘要 */}
            {enhancedData.results[0]?.financialSummary && (
              <Card title='💰 Financial Summary' style={{ marginBottom: 24 }}>
                <Row gutter={[16, 16]}>
                  <Col xs={12} sm={8} md={8}>
                    <Statistic
                      title='Average Amount'
                      value={
                        enhancedData.results[0].financialSummary.averageAmount
                      }
                      precision={2}
                      prefix='$'
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col xs={12} sm={8} md={8}>
                    <Statistic
                      title='Min Amount'
                      value={enhancedData.results[0].financialSummary.minAmount}
                      precision={2}
                      prefix='$'
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col xs={12} sm={8} md={8}>
                    <Statistic
                      title='Max Amount'
                      value={enhancedData.results[0].financialSummary.maxAmount}
                      precision={2}
                      prefix='$'
                      valueStyle={{ color: '#fa8c16' }}
                    />
                  </Col>
                </Row>
              </Card>
            )}

            {/* 处理详情 */}
            {enhancedData.results[0]?.processingDetails && (
              <Card title='📋 Processing Details' style={{ marginBottom: 24 }}>
                <Tabs defaultActiveKey='successful'>
                  <TabPane
                    tab={`✅ Successful (${enhancedData.results[0].processingDetails.successfulInvoices?.length || 0})`}
                    key='successful'
                  >
                    {enhancedData.results[0].processingDetails
                      .successfulInvoices?.length > 0 ? (
                      <List
                        dataSource={
                          enhancedData.results[0].processingDetails
                            .successfulInvoices
                        }
                        renderItem={(item: any) => (
                          <List.Item>
                            <List.Item.Meta
                              avatar={
                                <CheckCircleOutlined
                                  style={{ color: '#52c41a' }}
                                />
                              }
                              title={`Invoice #${item.invoiceNumber || 'N/A'} (Index: ${item.index || 'N/A'})`}
                              description={
                                <div>
                                  <div>
                                    <strong>Vendor:</strong>{' '}
                                    {item.vendorName || 'N/A'}
                                  </div>
                                  <div>
                                    <strong>Total Amount:</strong> $
                                    {item.totalAmount || 'N/A'}
                                  </div>
                                </div>
                              }
                            />
                          </List.Item>
                        )}
                      />
                    ) : (
                      <Empty description='No successful invoices' />
                    )}
                  </TabPane>
                  <TabPane
                    tab={`❌ Failed (${enhancedData.results[0].processingDetails.failedExtractions?.length || 0})`}
                    key='failed'
                  >
                    {enhancedData.results[0].processingDetails.failedExtractions
                      ?.length > 0 ? (
                      <List
                        dataSource={
                          enhancedData.results[0].processingDetails
                            .failedExtractions
                        }
                        renderItem={(item: any) => (
                          <List.Item>
                            <List.Item.Meta
                              avatar={
                                <CloseCircleOutlined
                                  style={{ color: '#f5222d' }}
                                />
                              }
                              title={item.fileName || item.documentId}
                              description={item.error || 'Processing failed'}
                            />
                          </List.Item>
                        )}
                      />
                    ) : (
                      <Empty description='No failed extractions' />
                    )}
                  </TabPane>
                  <TabPane
                    tab={`⚠️ Quality Issues (${enhancedData.results[0].processingDetails.qualityIssues?.length || 0})`}
                    key='quality'
                  >
                    {enhancedData.results[0].processingDetails.qualityIssues
                      ?.length > 0 ? (
                      <List
                        dataSource={
                          enhancedData.results[0].processingDetails
                            .qualityIssues
                        }
                        renderItem={(item: any) => (
                          <List.Item>
                            <List.Item.Meta
                              avatar={
                                <ExclamationCircleOutlined
                                  style={{ color: '#fa8c16' }}
                                />
                              }
                              title={item.fileName || item.documentId}
                              description={
                                item.issue || 'Quality issue detected'
                              }
                            />
                          </List.Item>
                        )}
                      />
                    ) : (
                      <Empty description='No quality issues' />
                    )}
                  </TabPane>
                </Tabs>
              </Card>
            )}
          </div>
        );
      }

      // 如果只有基础完成数据，显示简化版本
      console.log('显示简化版本的完成界面');
      console.log('enhancedData 检查结果:', {
        enhancedDataExists: !!enhancedData,
        hasResults: !!enhancedData?.results?.length,
        hasSummary: !!enhancedData?.results?.[0]?.summary,
        hasFinancialSummary: !!enhancedData?.results?.[0]?.financialSummary,
        hasProcessingDetails: !!enhancedData?.results?.[0]?.processingDetails,
        availableFields: enhancedData ? Object.keys(enhancedData) : [],
      });

      return (
        <div className='invoice-processing-completed'>
          <Card
            style={{
              textAlign: 'center',
              background: 'linear-gradient(135deg, #f6ffed 0%, #f0f9ff 100%)',
              border: '1px solid #b7eb8f',
              borderRadius: '12px',
              padding: '40px 20px',
            }}
          >
            <div style={{ marginBottom: 24 }}>
              <CheckCircleOutlined
                style={{
                  fontSize: 72,
                  color: '#52c41a',
                  marginBottom: 16,
                }}
              />
              <Title level={2} style={{ color: '#52c41a', marginBottom: 8 }}>
                {t('invoiceOCR.completion.processingCompleted')}
              </Title>
              <Text type='secondary' style={{ fontSize: 16 }}>
                {t('invoiceOCR.completion.processingCompletedMessage')}
              </Text>
            </div>

            {(completedData.executionId || completedData.idempotencyKey) && (
              <div style={{ marginBottom: 20 }}>
                <Space size='middle' wrap>
                  {completedData.executionId && (
                    <Tag color='blue' style={{ padding: '4px 8px' }}>
                      Execution ID: {completedData.executionId}
                    </Tag>
                  )}
                  {completedData.executionId && (
                    <Button
                      size='small'
                      icon={<CopyOutlined />}
                      onClick={() =>
                        void handleCopyExecutionId(completedData.executionId)
                      }
                    >
                      复制 ID
                    </Button>
                  )}
                  {completedData.idempotencyKey && (
                    <Tag color='purple' style={{ padding: '4px 8px' }}>
                      Request Key: {completedData.idempotencyKey}
                    </Tag>
                  )}
                  {typeof completedData.diagnostics?.attemptCount ===
                    'number' && (
                    <Tag color='geekblue' style={{ padding: '4px 8px' }}>
                      Attempts: {completedData.diagnostics.attemptCount}
                    </Tag>
                  )}
                  {typeof completedData.diagnostics?.elapsedMs === 'number' && (
                    <Tag color='cyan' style={{ padding: '4px 8px' }}>
                      Elapsed: {completedData.diagnostics.elapsedMs}ms
                    </Tag>
                  )}
                  <Button
                    size='small'
                    icon={<DownloadOutlined />}
                    onClick={handleExportDiagnostics}
                  >
                    导出诊断
                  </Button>
                </Space>
              </div>
            )}

            <Space size='large' wrap>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  void loadResults();
                }}
                style={{
                  borderRadius: '8px',
                  height: '48px',
                  padding: '0 24px',
                }}
              >
                刷新结果
              </Button>
              {completedData.googleSheetsUrl && (
                <Button
                  type='primary'
                  size='large'
                  icon={<GoogleOutlined />}
                  onClick={() => {
                    console.log(
                      'Opening Google Sheets:',
                      completedData.googleSheetsUrl
                    );
                    window.open(completedData.googleSheetsUrl, '_blank');
                  }}
                  style={{
                    background: '#52c41a',
                    borderColor: '#52c41a',
                    borderRadius: '8px',
                    height: '48px',
                    padding: '0 32px',
                    fontSize: '16px',
                  }}
                >
                  {t('invoiceOCR.completion.viewGoogleSheets')}
                </Button>
              )}
              <Button
                size='large'
                onClick={() => {
                  if (onProcessNewFiles) {
                    onProcessNewFiles();
                  } else {
                    // 如果没有提供回调函数，则刷新页面作为后备方案
                    window.location.reload();
                  }
                }}
                style={{
                  borderRadius: '8px',
                  height: '48px',
                  padding: '0 24px',
                }}
              >
                {t('invoiceOCR.completion.processNewFiles')}
              </Button>
            </Space>

            <Alert
              style={{ marginTop: 20, textAlign: 'left' }}
              type='warning'
              showIcon
              message='未收到结构化识别结果'
              description='识别请求已提交，但工作流暂未返回可展示数据。请先点击“刷新结果”；若持续为空，请检查 n8n 流程执行日志。'
            />
            {completedData.schemaWarnings &&
              completedData.schemaWarnings.length > 0 && (
                <Alert
                  style={{ marginTop: 12, textAlign: 'left' }}
                  type='info'
                  showIcon
                  message='响应诊断'
                  description={`Schema warnings: ${completedData.schemaWarnings.join(', ')}`}
                />
              )}
            {completedData.diagnostics?.transportWarnings &&
              completedData.diagnostics.transportWarnings.length > 0 && (
                <Alert
                  style={{ marginTop: 12, textAlign: 'left' }}
                  type='info'
                  showIcon
                  message='传输层诊断'
                  description={completedData.diagnostics.transportWarnings.join(
                    ' | '
                  )}
                />
              )}

            <Divider style={{ margin: '32px 0 16px' }} />
            <Text type='secondary' style={{ fontSize: 12 }}>
              {t('invoiceOCR.completion.tip')}
            </Text>
          </Card>
        </div>
      );
    }

    // 默认空状态
    return (
      <Empty
        image={<FileTextOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />}
        description={
          <Space direction='vertical'>
            <Text>暂无 OCR 处理结果</Text>
            <Text type='secondary'>请先上传发票文件进行处理</Text>
          </Space>
        }
      />
    );
  }

  return (
    <div className='invoice-ocr-results'>
      {/* 统计信息 */}
      {renderStats()}

      {/* 批处理任务 */}
      {renderBatchTasks()}

      {/* 操作栏 */}
      <Card size='small' style={{ marginBottom: 16 }}>
        <Row justify='space-between' align='middle'>
          <Col>
            <Space>
              <Text strong>OCR 处理结果</Text>
              <Badge count={results.length} showZero />
              {selectedResults.length > 0 && (
                <Text type='secondary'>已选择 {selectedResults.length} 项</Text>
              )}
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                type='primary'
                icon={<GoogleOutlined />}
                onClick={handleGoogleSheetsRedirect}
                disabled={results.length === 0}
              >
                导出到 Google Sheets
              </Button>
              <Button
                icon={<CloudDownloadOutlined />}
                onClick={handleBatchDownload}
                disabled={selectedResults.length === 0}
              >
                批量下载
              </Button>
              <Button icon={<ReloadOutlined />} onClick={loadResults}>
                刷新
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 结果表格 */}
      <Card>
        <Table
          columns={resultColumns}
          dataSource={results}
          rowKey='id'
          size='small'
          rowSelection={{
            selectedRowKeys: selectedResults.map(result => result.id),
            onChange: (selectedRowKeys, selectedRows) => {
              setSelectedResults(selectedRows);
            },
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
          }}
        />
      </Card>

      {/* 结果详情模态框 */}
      {renderDetailModal()}

      {/* 错误模态框 */}
      <ErrorModal
        visible={isVisible}
        title={errorInfo?.title}
        message={errorInfo?.message || ''}
        details={errorInfo?.details}
        troubleshooting={errorInfo?.troubleshooting}
        onClose={hideError}
      />
    </div>
  );
};

export default InvoiceOCRResults;
