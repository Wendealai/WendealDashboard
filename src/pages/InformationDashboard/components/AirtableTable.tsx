/**
 * AirtableTable Component
 * 显示Airtable数据的表格组件
 */

import React, { useMemo, useState, useCallback, useRef } from 'react';
import {
  Table,
  Card,
  Space,
  Typography,
  Empty,
  Alert,
  Tag,
  Tooltip,
  Button,
  Modal,
  Progress,
} from 'antd';
import {
  DatabaseOutlined,
  GlobalOutlined,
  MailOutlined,
  ReloadOutlined,
  ExclamationCircleOutlined,
  LinkOutlined,
  DownloadOutlined,
  UploadOutlined,
  ClearOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type {
  AirtableTableProps,
  OpportunityRecord,
} from '@/types/smartOpportunities';

const { Text, Paragraph } = Typography;

/**
 * AirtableTable组件
 * 显示Smart Opportunities的Airtable数据
 */
const AirtableTable: React.FC<AirtableTableProps> = ({
  data,
  loading,
  error,
  airtableService,
  onDataChange,
}) => {
  const [clearModalVisible, setClearModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [cancelImport, setCancelImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [clearProgress, setClearProgress] = useState({ current: 0, total: 0 });
  const [importProgress, setImportProgress] = useState({
    current: 0,
    total: 0,
  });
  const cancelImportRef = useRef(false);

  /**
   * 刷新数据
   */
  const handleRefresh = useCallback(async () => {
    if (!airtableService) return;

    try {
      // 重新获取所有数据
      const allRecords = await airtableService.getAllRecords({});
      // 更新本地状态
      onDataChange?.(allRecords);
    } catch (error) {
      console.error('Failed to refresh data:', error);
      // 可以在这里显示错误提示
    }
  }, [airtableService, onDataChange]);

  /**
   * 导出CSV
   */
  const handleExportCSV = useCallback(() => {
    if (data.length === 0) return;

    const csvContent = [
      // 表头
      [
        'Business Name',
        'Category',
        'City',
        'Address',
        'Website',
        'Phone',
        'Rating',
        'Reviews',
        'Opportunities',
        'Lead Score',
        'Created Time',
      ],
      // 数据行
      ...data.map(record => [
        record.fields.businessName || '',
        record.fields.industry || '',
        record.fields.city || '',
        record.fields.country || '',
        record.fields.description || '',
        record.fields.contactInfo || '',
        '', // Rating - not in current schema
        '', // Reviews - not in current schema
        '', // Opportunities - not in current schema
        '', // Lead Score - not in current schema
        record.fields.createdTime || '',
      ]),
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'business_opportunities.csv';
    link.click();
  }, [data]);

  /**
   * 清空确认
   */
  const handleClearClick = useCallback(() => {
    setClearModalVisible(true);
  }, []);

  const handleClearCancel = useCallback(() => {
    setClearModalVisible(false);
  }, []);

  const handleClearConfirm = useCallback(async () => {
    if (!airtableService) {
      console.error('airtableService is not available');
      return;
    }

    setClearing(true);
    setClearProgress({ current: 0, total: data.length });

    try {
      let deletedCount = 0;

      // 删除所有记录，逐步更新进度
      for (const record of data) {
        await airtableService.deleteRecord(record.id);
        deletedCount++;
        setClearProgress({ current: deletedCount, total: data.length });
      }

      // 更新本地状态
      onDataChange?.([]);
      setClearModalVisible(false);
      setClearProgress({ current: 0, total: 0 });
    } catch (error) {
      console.error('Failed to clear data:', error);
      setClearProgress({ current: 0, total: 0 });
    } finally {
      setClearing(false);
    }
  }, [airtableService, data, onDataChange]);

  /**
   * 导入相关
   */
  const handleImportClick = useCallback(() => {
    console.log('Import button clicked');
    setImportModalVisible(true);
  }, []);

  const handleImportCancel = useCallback(() => {
    console.log('Import cancel clicked');
    if (importing) {
      // 如果正在导入，设置取消标志
      setCancelImport(true);
      cancelImportRef.current = true; // 同步更新ref
      console.log('Cancel flag set - will stop after current record');
    } else {
      // 如果没有在导入，直接关闭
      setImportModalVisible(false);
      setImportFile(null);
      setImportProgress({ current: 0, total: 0 });
      setCancelImport(false); // 确保状态重置
      cancelImportRef.current = false; // 同步更新ref
    }
  }, [importing]);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      console.log('File select event triggered');
      console.log('Event target:', event.target);
      console.log('Files:', event.target.files);

      const file = event.target.files?.[0];
      console.log('Selected file:', file);

      if (file) {
        // 接受 .csv 文件扩展名或者 CSV 相关的 MIME 类型
        if (
          file.name.endsWith('.csv') ||
          file.type === 'text/csv' ||
          file.type === 'application/csv' ||
          file.type === 'application/vnd.ms-excel' ||
          file.type === 'text/plain'
        ) {
          setImportFile(file);
          console.log('File accepted:', file.name, 'Type:', file.type);
        } else {
          alert('Please select a valid CSV file');
          console.log(
            'File rejected - not supported type:',
            file.name,
            'Type:',
            file.type
          );
        }
      } else {
        console.log('No file selected');
      }
    },
    []
  );

  const handleImportConfirm = useCallback(async () => {
    console.log('Import confirm clicked');
    console.log('airtableService:', airtableService);
    console.log('importFile:', importFile);

    if (!airtableService || !importFile) {
      console.log('Missing airtableService or importFile');
      return;
    }

    setImporting(true);
    setImportProgress({ current: 0, total: 0 });
    setCancelImport(false); // 重置取消状态
    cancelImportRef.current = false; // 重置ref
    console.log('Starting import process...');

    try {
      console.log('Reading file content...');
      const text = await importFile.text();
      console.log('File content length:', text.length);
      console.log('First 200 chars:', text.substring(0, 200));

      const lines = text.split('\n');
      console.log('Total lines:', lines.length);

      if (lines.length === 0 || !lines[0]) {
        throw new Error('CSV file is empty or invalid');
      }

      // 使用正则表达式正确解析CSV，处理引号和逗号
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        let i = 0;

        while (i < line.length) {
          const char = line[i];

          if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
              // 转义的引号
              current += '"';
              i += 2;
              continue;
            } else {
              // 切换引号状态
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            // 字段分隔符
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }

          i++;
        }

        // 添加最后一个字段
        result.push(current.trim());
        return result;
      };

      const headers = parseCSVLine(lines[0]);
      console.log('Headers:', headers);
      console.log('Headers count:', headers.length);
      console.log('Expected headers:', [
        'Business Name',
        'Category',
        'City',
        'Address',
        'Website',
        'Phone',
        'Rating',
        'Reviews',
        'Opportunities',
        'Lead Score',
        'Created Time',
      ]);

      // 解析数据行
      const newRecords = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line || !line.trim()) continue;
        const values = parseCSVLine(line);
        console.log(`Parsing line ${i}:`, line);
        console.log(`Parsed values:`, values);
        console.log(`Values count:`, values.length);
        const record: any = {};
        headers.forEach((header, index) => {
          // 确保index不超过values数组长度
          if (index >= values.length) {
            console.log(
              `Warning: Header "${header}" at index ${index} has no corresponding value`
            );
            return;
          }

          // 字段名映射：只包含Airtable表中实际存在的字段
          const fieldMapping: { [key: string]: string } = {
            'Business Name': 'Business Name',
            Category: 'Category',
            City: 'City',
            Address: 'Address',
            Website: 'Website',
            Opportunities: 'Opportunities',
            // 以下字段在Airtable表中不存在或数据类型不匹配，已移除：
            // 'Phone': 'Phone', // 不存在的字段
            // 'Rating': 'Rating', // 数据类型问题
            // 'Reviews': 'Reviews', // 数据类型问题
            // 'Lead Score': 'Lead Score', // 数据类型问题
            // 'Created Time': 'Created Time' // 不存在的字段
          };

          // 只处理映射中存在的字段，完全跳过无效字段
          if (fieldMapping[header]) {
            const airtableFieldName = fieldMapping[header];
            record[airtableFieldName] = values[index] || '';
          } else {
            console.log(
              `Skipping invalid field: ${header} (value: ${values[index]})`
            );
          }
        });
        newRecords.push(record);
      }

      console.log('Parsed records count:', newRecords.length);
      console.log('First record sample:', newRecords[0]);

      // 设置进度总数
      setImportProgress({ current: 0, total: newRecords.length });

      // 创建记录
      console.log('Creating records...');
      let createdCount = 0;
      let failedCount = 0;
      const failedRecords = [];

      for (let i = 0; i < newRecords.length; i++) {
        // 检查是否被取消（使用ref以确保立即响应）
        if (cancelImportRef.current) {
          console.log('Import cancelled by user');
          break;
        }

        const recordData = newRecords[i];

        try {
          console.log(
            `Creating record ${i + 1}/${newRecords.length}:`,
            recordData
          );
          await airtableService.createRecord(recordData);
          createdCount++;
          console.log(`✅ Record ${i + 1} created successfully`);
        } catch (recordError) {
          console.error(`❌ Failed to create record ${i + 1}:`, recordError);
          failedCount++;
          const errorMessage =
            recordError instanceof Error
              ? recordError.message
              : 'Unknown error';
          failedRecords.push({
            index: i + 1,
            error: errorMessage,
            data: recordData,
          });
          // 继续处理其他记录，但记录失败情况
        }

        // 更新进度条（无论成功还是失败都要更新进度）
        setImportProgress({ current: i + 1, total: newRecords.length });
      }

      console.log(`Import summary:`);
      console.log(`✅ Successfully created: ${createdCount} records`);
      console.log(`❌ Failed to create: ${failedCount} records`);

      if (failedRecords.length > 0) {
        console.log('Failed records details:');
        failedRecords.forEach(failure => {
          console.log(`  Record ${failure.index}: ${failure.error}`);
        });
      }

      // 刷新数据 - 多次重试确保获取最新数据
      console.log('Refreshing data...');

      let allRecords = [];
      let retryCount = 0;
      const maxRetries = 5;

      while (retryCount < maxRetries) {
        try {
          console.log(
            `Attempting to refresh data (attempt ${retryCount + 1}/${maxRetries})...`
          );

          // 等待一段时间让Airtable处理完数据
          if (retryCount > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
          }

          allRecords = await airtableService.getAllRecords({});
          console.log(
            `Fetched ${allRecords.length} records after import (attempt ${retryCount + 1})`
          );

          // 如果获取到的记录数合理（不少于导入前的记录数加上成功导入的记录数），就认为数据已同步
          const expectedMinRecords = createdCount; // 至少应该有我们刚创建的记录
          if (allRecords.length >= expectedMinRecords) {
            console.log('✅ Data refresh successful - records are in sync');
            break;
          } else {
            console.log(
              `⚠️  Record count seems low (${allRecords.length} vs expected ${expectedMinRecords}), retrying...`
            );
          }

          retryCount++;
        } catch (refreshError) {
          console.error(
            `Refresh attempt ${retryCount + 1} failed:`,
            refreshError
          );
          retryCount++;

          if (retryCount >= maxRetries) {
            console.error('❌ All refresh attempts failed');
            break;
          }

          // 等待更长时间再重试
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      onDataChange?.(allRecords);
      setImportModalVisible(false);
      setImportFile(null);
      setImportProgress({ current: 0, total: 0 });

      // 显示导入结果
      if (failedCount > 0) {
        console.warn(
          `Import completed with ${failedCount} failures. Check console for details.`
        );
      } else {
        console.log('Import completed successfully - all records imported!');
      }
    } catch (error) {
      console.error('Failed to import data:', error);
      console.error('Error details:', error);
      setImportProgress({ current: 0, total: 0 });
    } finally {
      setImporting(false);
      setCancelImport(false);
      cancelImportRef.current = false; // 重置ref
      setImportProgress({ current: 0, total: 0 });
    }
  }, [airtableService, importFile, onDataChange]);

  /**
   * 表格列配置
   */
  const columns: ColumnsType<OpportunityRecord> = useMemo(
    () => [
      {
        title: 'Business Name',
        dataIndex: ['fields', 'Business Name'],
        key: 'businessName',
        width: 250,
        render: (text: string) => (
          <Text strong style={{ fontSize: '13px' }}>
            {text || 'N/A'}
          </Text>
        ),
      },
      {
        title: 'Category',
        dataIndex: ['fields', 'Category'],
        key: 'category',
        width: 120,
        render: (text: string) => (
          <Tag color='blue' style={{ fontSize: '12px' }}>
            {text || 'N/A'}
          </Tag>
        ),
      },
      {
        title: 'City',
        dataIndex: ['fields', 'City'],
        key: 'city',
        width: 150,
        render: (text: string) => (
          <Text style={{ fontSize: '12px' }}>{text || 'N/A'}</Text>
        ),
      },
      {
        title: 'Address',
        dataIndex: ['fields', 'Address'],
        key: 'address',
        width: 200,
        render: (text: string) => (
          <Text style={{ fontSize: '12px' }}>{text || 'N/A'}</Text>
        ),
      },
      {
        title: 'Website',
        dataIndex: ['fields', 'Website'],
        key: 'website',
        width: 80,
        render: (text: string) =>
          text ? (
            <Tooltip title='Visit website'>
              <LinkOutlined
                style={{
                  fontSize: '14px',
                  color: '#1890ff',
                  cursor: 'pointer',
                }}
                onClick={() => window.open(text, '_blank')}
              />
            </Tooltip>
          ) : (
            <Text style={{ fontSize: '12px', color: '#999' }}>N/A</Text>
          ),
      },
      {
        title: 'Phone',
        dataIndex: ['fields', 'Phone'],
        key: 'phone',
        width: 130,
        render: (text: string) => (
          <Text style={{ fontSize: '12px' }}>{text || 'N/A'}</Text>
        ),
      },
      {
        title: 'Rating',
        dataIndex: ['fields', 'Rating'],
        key: 'rating',
        width: 70,
        render: (text: string) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <GlobalOutlined style={{ fontSize: '12px', color: '#faad14' }} />
            <Text style={{ fontSize: '12px' }}>{text || 'N/A'}</Text>
          </div>
        ),
      },
      {
        title: 'Reviews',
        dataIndex: ['fields', 'Reviews'],
        key: 'reviews',
        width: 70,
        render: (text: string) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <MailOutlined style={{ fontSize: '12px', color: '#52c41a' }} />
            <Text style={{ fontSize: '12px' }}>{text || 'N/A'}</Text>
          </div>
        ),
      },
      {
        title: 'Opportunities',
        dataIndex: ['fields', 'Opportunities'],
        key: 'opportunities',
        width: 300,
        render: (text: string) => (
          <Paragraph
            ellipsis={{ rows: 2, expandable: true, symbol: 'more' }}
            style={{ fontSize: '12px', margin: 0 }}
          >
            {text || 'N/A'}
          </Paragraph>
        ),
      },
      {
        title: 'Lead Score',
        dataIndex: ['fields', 'Lead Score'],
        key: 'leadScore',
        width: 80,
        render: (text: string) => (
          <Tag color='green' style={{ fontSize: '12px' }}>
            {text || 'N/A'}
          </Tag>
        ),
      },
      {
        title: 'Created',
        dataIndex: ['fields', 'Created Time'],
        key: 'createdTime',
        width: 100,
        render: (text: string) => (
          <Text style={{ fontSize: '12px' }}>
            {text ? new Date(text).toLocaleDateString('en-US') : 'N/A'}
          </Text>
        ),
      },
    ],
    []
  );

  return (
    <>
      <Card
        title={
          <Space>
            <DatabaseOutlined />
            <span>Business Opportunity Data</span>
            <Text type='secondary' style={{ fontSize: '12px' }}>
              ({data.length} records)
            </Text>
            {loading && (
              <Tag color='blue' style={{ fontSize: '10px' }}>
                Loading...
              </Tag>
            )}
            {!loading && data.length > 0 && (
              <Tag color='green' style={{ fontSize: '10px' }}>
                <ExclamationCircleOutlined style={{ marginRight: 2 }} />
                Real-time sync
              </Tag>
            )}
            {!loading && data.length === 0 && !error && (
              <Tag color='orange' style={{ fontSize: '10px' }}>
                No data
              </Tag>
            )}
          </Space>
        }
        size='small'
        extra={
          <Space>
            <Button
              type='text'
              icon={<UploadOutlined />}
              onClick={handleImportClick}
              size='small'
              disabled={!!loading}
            >
              Import CSV
            </Button>
            <Button
              type='text'
              icon={<DownloadOutlined />}
              onClick={handleExportCSV}
              size='small'
              disabled={!!loading || data.length === 0}
            >
              Export CSV
            </Button>
            <Button
              type='text'
              icon={<ClearOutlined />}
              onClick={handleClearClick}
              size='small'
              disabled={!!loading || data.length === 0}
              danger
            >
              Clear Table
            </Button>
            <Button
              type='text'
              icon={<ReloadOutlined />}
              onClick={handleRefresh}
              size='small'
              disabled={!!loading}
            >
              Reload
            </Button>
          </Space>
        }
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '500px',
        }}
        styles={{
          body: {
            flex: 1,
            padding: 0,
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* 错误提示 */}
        {error && (
          <div style={{ padding: '16px' }}>
            <Alert
              message='Data Loading Error'
              description={
                typeof error === 'string'
                  ? error
                  : 'Failed to load business opportunity data'
              }
              type='error'
              showIcon
              style={{ marginBottom: 16 }}
            />
          </div>
        )}

        {/* 表格 */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <Table
            dataSource={data}
            columns={columns}
            rowKey='id'
            size='small'
            scroll={{ x: 'max-content', y: 550 }}
            pagination={{
              total: data.length,
              pageSize: 15,
              pageSizeOptions: ['15', '30', '50', '100', '200'],
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} of ${total} items`,
              size: 'small',
            }}
            locale={{
              emptyText: (
                <Empty
                  description={
                    loading
                      ? 'Loading data...'
                      : 'No business opportunity data available'
                  }
                />
              ),
            }}
            loading={!!loading}
          />
        </div>
      </Card>

      {/* 清空确认对话框 */}
      <Modal
        title={
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginRight: '-24px',
            }}
          >
            <span
              style={{ fontSize: '16px', fontWeight: '600', color: '#262626' }}
            >
              Clear Table Confirmation
            </span>
            <Button
              type='text'
              icon={<CloseOutlined />}
              onClick={handleClearCancel}
              size='small'
              style={{
                color: '#8c8c8c',
                marginLeft: '8px',
              }}
            />
          </div>
        }
        open={clearModalVisible}
        onOk={handleClearConfirm}
        onCancel={handleClearCancel}
        confirmLoading={clearing}
        okText='Clear All Data'
        cancelText='Cancel'
        closable={false}
        okButtonProps={{
          danger: true,
          loading: clearing,
        }}
      >
        <div style={{ padding: '16px 0' }}>
          {!clearing ? (
            <>
              <Alert
                message='Important: Please export your data first!'
                description='This action will permanently delete all records from the table. Make sure to export and backup your data before proceeding.'
                type='warning'
                showIcon
                style={{ marginBottom: 16 }}
              />
              <div>
                <p>
                  <strong>Records to be deleted:</strong> {data.length}
                </p>
                <p>
                  <strong>Action:</strong> This will also clear data from
                  Airtable database
                </p>
                <p style={{ color: '#ff4d4f', marginTop: 8 }}>
                  ⚠️ This action cannot be undone. Are you sure you want to
                  continue?
                </p>
              </div>
            </>
          ) : (
            <>
              <Alert
                message='Deleting Records...'
                description='Please wait while we delete all records from the database.'
                type='info'
                showIcon
                style={{ marginBottom: 16 }}
              />
              <div style={{ marginBottom: 16 }}>
                <Progress
                  percent={
                    clearProgress.total > 0
                      ? Math.round(
                          (clearProgress.current / clearProgress.total) * 100
                        )
                      : 0
                  }
                  status='active'
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                  format={percent =>
                    `${clearProgress.current}/${clearProgress.total} (${percent}%)`
                  }
                />
                <p style={{ textAlign: 'center', marginTop: 8, color: '#666' }}>
                  Deleting record {clearProgress.current} of{' '}
                  {clearProgress.total}
                </p>
              </div>
            </>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 16,
            }}
          >
            <Button
              type='link'
              icon={<GlobalOutlined />}
              onClick={() =>
                window.open(
                  'https://airtable.com/appU7ykK2mZQZv444/shrloalLaNAIaW3oq',
                  '_blank'
                )
              }
              size='small'
            >
              View in Airtable
            </Button>
            <div style={{ fontSize: '12px', color: '#999' }}>
              {!clearing
                ? `${data.length} records will be deleted`
                : `${clearProgress.current}/${clearProgress.total} completed`}
            </div>
          </div>
        </div>
      </Modal>

      {/* 导入CSV数据对话框 */}
      <Modal
        title='Import CSV Data'
        open={importModalVisible}
        onOk={handleImportConfirm}
        onCancel={handleImportCancel}
        confirmLoading={importing}
        okText='Import Data'
        cancelText={importing ? 'Cancel Import' : 'Cancel'}
        okButtonProps={{
          disabled: !importFile || importing,
          loading: importing,
        }}
        cancelButtonProps={{
          disabled: false,
        }}
      >
        <div style={{ padding: '16px 0' }}>
          {!importing ? (
            <>
              <Alert
                message='CSV Import Instructions'
                description='Please select a CSV file exported from this system. The import will add records to the existing data.'
                type='info'
                showIcon
                style={{ marginBottom: 16 }}
              />
              <div style={{ marginBottom: 16 }}>
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '40px',
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px 12px',
                    backgroundColor: '#fafafa',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    console.log('File input container clicked');
                    const fileInput = document.getElementById(
                      'csv-file-input'
                    ) as HTMLInputElement;
                    if (fileInput) {
                      fileInput.click();
                    }
                  }}
                >
                  <UploadOutlined
                    style={{ marginRight: '8px', color: '#1890ff' }}
                  />
                  <span style={{ color: '#666' }}>
                    {importFile
                      ? importFile.name
                      : 'Click to select CSV file...'}
                  </span>
                  <input
                    id='csv-file-input'
                    type='file'
                    accept='.csv,text/csv,application/csv,text/plain'
                    onChange={handleFileSelect}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer',
                    }}
                  />
                </div>
                {importFile && (
                  <div
                    style={{ marginTop: 8, color: '#52c41a', fontSize: '12px' }}
                  >
                    ✓ Selected file: {importFile.name} (
                    {(importFile.size / 1024).toFixed(1)} KB)
                  </div>
                )}
                {!importFile && (
                  <div
                    style={{ marginTop: 8, color: '#999', fontSize: '12px' }}
                  >
                    Supported format: CSV files exported from this system
                  </div>
                )}
              </div>
              <div>
                <p>
                  <strong>Supported fields:</strong> CSV file with the following
                  columns (only valid fields will be imported):
                </p>
                <ul style={{ marginLeft: 20 }}>
                  <li>✅ Business Name</li>
                  <li>✅ Category</li>
                  <li>✅ City</li>
                  <li>✅ Address</li>
                  <li>✅ Website</li>
                  <li>✅ Opportunities</li>
                  <li>❌ Phone (field not available in Airtable)</li>
                  <li>❌ Rating (data type mismatch)</li>
                  <li>❌ Reviews (data type mismatch)</li>
                  <li>❌ Lead Score (data type mismatch)</li>
                  <li>❌ Created Time (field not available in Airtable)</li>
                </ul>
                <p style={{ color: '#666', fontSize: '12px', marginTop: 8 }}>
                  Note: Only the ✅ marked fields will be imported to Airtable.
                </p>
              </div>
            </>
          ) : (
            <>
              <Alert
                message='Importing Records...'
                description='Please wait while we import records from your CSV file.'
                type='info'
                showIcon
                style={{ marginBottom: 16 }}
              />
              <div style={{ marginBottom: 16 }}>
                <Progress
                  percent={
                    importProgress.total > 0
                      ? Math.round(
                          (importProgress.current / importProgress.total) * 100
                        )
                      : 0
                  }
                  status={cancelImport ? 'exception' : 'active'}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                  format={percent =>
                    `${importProgress.current}/${importProgress.total} (${percent}%)`
                  }
                />
                <p style={{ textAlign: 'center', marginTop: 8, color: '#666' }}>
                  {cancelImport
                    ? 'Cancelling import...'
                    : `Importing record ${importProgress.current} of ${importProgress.total}`}
                </p>
              </div>
            </>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 16,
            }}
          >
            <Button
              type='link'
              icon={<GlobalOutlined />}
              onClick={() =>
                window.open(
                  'https://airtable.com/appU7ykK2mZQZv444/shrloalLaNAIaW3oq',
                  '_blank'
                )
              }
              size='small'
              disabled={importing}
            >
              View in Airtable
            </Button>
            <div style={{ fontSize: '12px', color: '#999' }}>
              {!importing
                ? importFile
                  ? `${importFile.name} selected`
                  : 'No file selected'
                : `${importProgress.current}/${importProgress.total} imported`}
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AirtableTable;
