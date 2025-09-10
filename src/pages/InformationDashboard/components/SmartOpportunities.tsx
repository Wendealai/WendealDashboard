/**
 * SmartOpportunities Component
 * 智能商业机会发现主组件
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Row,
  Col,
  Card,
  Space,
  Typography,
  message,
  Spin,
  Alert,
  Button,
} from 'antd';
import { ThunderboltOutlined, DatabaseOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

// 导入子组件
import InputForm from './InputForm';
import AirtableTable from './AirtableTable';

// 导入服务和类型
import {
  AirtableService,
  createAirtableService,
  defaultAirtableConfig,
} from '@/services/airtableService';
import type {
  SmartOpportunitiesProps,
  WorkflowParameters,
  OpportunityRecord,
} from '@/types/smartOpportunities';
import { DataLoadingState } from '@/types/smartOpportunities';

const { Title, Text } = Typography;

/**
 * SmartOpportunities主组件
 * 整合输入表单和数据展示，实现完整的商业机会发现功能
 */
const SmartOpportunities: React.FC<SmartOpportunitiesProps> = ({
  onParametersChange,
  onDataLoaded,
  onError,
}) => {
  const { t } = useTranslation();

  // 状态管理
  const [parameters, setParameters] = useState<WorkflowParameters>({
    industry: '',
    city: '',
    country: '',
  });

  const [data, setData] = useState<OpportunityRecord[]>([]);
  const [loadingState, setLoadingState] = useState<DataLoadingState>(
    DataLoadingState.IDLE
  );
  const [error, setError] = useState<string | null>(null);
  const [webhookWarning, setWebhookWarning] = useState<string | null>(null);
  const [airtableService] = useState<AirtableService>(() =>
    createAirtableService(defaultAirtableConfig)
  );

  /**
   * 处理参数变化
   */
  const handleParametersChange = useCallback(
    (newParameters: WorkflowParameters) => {
      setParameters(newParameters);
      onParametersChange?.(newParameters);
    },
    [onParametersChange]
  );

  /**
   * 处理工作流提交
   */
  const handleWorkflowSubmit = useCallback(
    async (workflowParams: WorkflowParameters) => {
      console.log('handleWorkflowSubmit called with params:', workflowParams);
      try {
        setLoadingState(DataLoadingState.LOADING);
        setError(null);

        // 构建搜索条件
        const searchCriteria = {
          industry: workflowParams.industry,
          city: workflowParams.city,
          country: workflowParams.country,
          limit: 100, // 限制返回数量
        };

        console.log(
          'Starting Smart Opportunities workflow with parameters:',
          searchCriteria
        );

        // 调用webhook API (使用代理路径解决CORS问题)
        const webhookUrl = '/webhook/Smart-opportunities';
        console.log('Making webhook request to:', webhookUrl);
        console.log('Webhook payload:', {
          industry: workflowParams.industry,
          city: workflowParams.city,
          country: workflowParams.country,
        });

        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            industry: workflowParams.industry,
            city: workflowParams.city,
            country: workflowParams.country,
          }),
        });

        console.log('Webhook response status:', webhookResponse.status);
        console.log('Webhook response ok:', webhookResponse.ok);

        if (!webhookResponse.ok) {
          const errorText = await webhookResponse.text();
          console.error('Webhook error response:', errorText);
          console.warn(
            'Webhook failed, but continuing with local data processing...'
          );

          // 设置webhook警告，但不抛出错误
          setWebhookWarning(
            `Webhook service temporarily unavailable (Error ${webhookResponse.status}). Using local data processing.`
          );
        } else {
          console.log('Webhook call successful');
          setWebhookWarning(null); // 清除之前的警告

          // 等待一段时间让工作流处理完成
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // 首先尝试获取所有现有数据，然后根据参数过滤
        let searchResults;
        try {
          console.log('Fetching all records from Airtable...');
          // 获取所有记录（不限制数量）
          const allRecords = await airtableService.getAllRecords({
            // 不设置filterByFormula，让它获取所有记录
            // 不设置maxRecords，让它获取所有可用记录
          });
          console.log(`Fetched ${allRecords.length} records from Airtable`);

          // 如果有搜索参数，则进行过滤
          if (
            workflowParams.industry ||
            workflowParams.city ||
            workflowParams.country
          ) {
            searchResults = allRecords.filter(record => {
              const matchIndustry =
                !workflowParams.industry ||
                record.fields.industry
                  ?.toLowerCase()
                  .includes(workflowParams.industry.toLowerCase());
              const matchCity =
                !workflowParams.city ||
                record.fields.city
                  ?.toLowerCase()
                  .includes(workflowParams.city.toLowerCase());
              const matchCountry =
                !workflowParams.country ||
                record.fields.country
                  ?.toLowerCase()
                  .includes(workflowParams.country.toLowerCase());

              return matchIndustry && matchCity && matchCountry;
            });
            console.log(
              `Filtered to ${searchResults.length} records matching criteria`
            );
          } else {
            searchResults = allRecords;
          }

          // 如果没有匹配的记录，显示提示
          if (searchResults.length === 0) {
            console.log(
              'No records found matching criteria, showing all records'
            );
            searchResults = allRecords.slice(0, 10); // 显示前10条记录
          }
        } catch (airtableError) {
          console.error('Airtable API error:', airtableError);
          setError(`Data loading failed: ${airtableError.message}`);
          setLoadingState(DataLoadingState.ERROR);
          return;
        }

        setData(searchResults);
        setLoadingState(DataLoadingState.SUCCESS);
        setError(null); // 清除之前的错误状态
        onDataLoaded?.(searchResults);

        message.success(
          `Successfully discovered ${searchResults.length} business opportunities!`
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Workflow execution failed';
        console.error('Smart Opportunities workflow error:', err);

        setError(errorMessage);
        setLoadingState(DataLoadingState.ERROR);
        onError?.(err instanceof Error ? err : new Error(errorMessage));

        message.error(errorMessage);
      }
    },
    [airtableService, onDataLoaded, onError]
  );

  /**
   * 处理表格排序
   */
  const handleTableSort = useCallback(
    async (field: string, direction: 'asc' | 'desc') => {
      try {
        // 这里可以重新获取排序后的数据
        console.log(`Sorting by ${field} ${direction}`);
        // 实际实现中可以调用带有排序参数的API
      } catch (err) {
        console.error('Table sort error:', err);
      }
    },
    []
  );

  /**
   * 处理分页变化
   */
  const handlePageChange = useCallback((page: number, pageSize: number) => {
    console.log(`Page changed to ${page}, page size: ${pageSize}`);
    // 实际实现中可以在这里处理分页逻辑
  }, []);

  /**
   * 测试Airtable连接
   */
  const testAirtableConnection = useCallback(async () => {
    console.log('=== Airtable Connection Diagnosis Started ===');
    console.log('Configuration Info:');
    console.log('- Base ID:', defaultAirtableConfig.baseId);
    console.log('- Table Name:', defaultAirtableConfig.tableName);
    console.log('- API Key Length:', defaultAirtableConfig.apiKey.length);
    console.log(
      '- API Key Prefix:',
      defaultAirtableConfig.apiKey.substring(0, 15)
    );

    try {
      console.log('Creating Airtable service instance...');
      const testService = createAirtableService(defaultAirtableConfig);

      console.log('Testing connection...');
      const testRecords = await testService.getAllRecords({
        maxRecords: 1,
      });

      console.log('✅ Airtable connection test successful!');
      console.log('- Records found:', testRecords.length);
      console.log('=== Airtable Connection Diagnosis Completed ===');

      message.success(
        `Airtable connection test successful! Found ${testRecords.length} records`
      );
    } catch (error) {
      console.error('❌ Airtable connection test failed:');
      console.error('- Error message:', error.message);
      console.error('- Error details:', error);
      console.log('=== Airtable Connection Diagnosis Completed ===');

      let errorMessage = 'Airtable connection test failed: ';

      if (error.message?.includes('403')) {
        errorMessage +=
          'API Key does not have permission to access this Base. Please check:\n1. API Key is correct\n2. API Key has access to this Base\n3. Base is shared with this API Key';
      } else if (error.message?.includes('404')) {
        errorMessage +=
          'Base or table does not exist. Please check Base ID and table name';
      } else if (error.message?.includes('401')) {
        errorMessage += 'API Key is invalid or expired';
      } else {
        errorMessage += error.message;
      }

      message.error(errorMessage, 10); // 显示10秒
    }
  }, []);

  /**
   * 处理刷新
   */
  const handleRefresh = useCallback(async () => {
    console.log('Manual refresh triggered');
    try {
      setLoadingState(DataLoadingState.LOADING);
      setError(null);

      // 重新获取所有数据
      const allRecords = await airtableService.getAllRecords({
        maxRecords: 100,
      });

      console.log(`Refreshed ${allRecords.length} records from Airtable`);

      setData(allRecords);
      setLoadingState(DataLoadingState.SUCCESS);
      onDataLoaded?.(allRecords);

      message.success(`Successfully refreshed ${allRecords.length} records!`);
    } catch (error) {
      console.error('Refresh failed:', error);
      setError(`Refresh data failed: ${error.message}`);
      setLoadingState(DataLoadingState.ERROR);
      message.error(`Refresh data failed: ${error.message}`);
    }
  }, [airtableService, onDataLoaded]);

  /**
   * 组件挂载时的初始化和数据加载
   */
  useEffect(() => {
    console.log('SmartOpportunities component mounted');
    console.log('Current state:', { data, loadingState, error, parameters });

    // 组件挂载时自动加载现有数据
    const loadInitialData = async () => {
      try {
        console.log('Loading initial data from Airtable...');
        console.log('Airtable Config:', {
          baseId: defaultAirtableConfig.baseId,
          tableName: defaultAirtableConfig.tableName,
          apiKey: defaultAirtableConfig.apiKey.substring(0, 10) + '...', // 只显示前10位
        });

        const allRecords = await airtableService.getAllRecords({
          // 不限制初始加载数量，获取所有可用记录
        });
        console.log(`Loaded ${allRecords.length} records from Airtable`);

        setData(allRecords);
        setLoadingState(DataLoadingState.SUCCESS);
        onDataLoaded?.(allRecords);
      } catch (error) {
        console.error('Failed to load initial data:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          statusText: error.statusText,
        });

        // 如果是403错误，自动切换到演示模式
        if (error.message?.includes('403')) {
          console.log('403 error detected, switching to demo mode...');
          const demoData = [
            {
              id: 'demo_1',
              fields: {
                businessName: 'Sunshine Cafe',
                industry: 'coffee shop',
                city: 'Brisbane',
                country: 'Australia',
                description:
                  'Premium coffee shop located in the heart of Brisbane CBD, offering exceptional coffee quality and ambiance.',
                contactInfo: 'info@sunshinecafe.com',
              },
              createdTime: new Date().toISOString(),
            },
            {
              id: 'demo_2',
              fields: {
                businessName: 'Modern Hair Salon',
                industry: 'barber',
                city: 'Brisbane',
                country: 'Australia',
                description:
                  'Modern hair salon providing professional hair services with experienced stylists.',
                contactInfo: 'contact@modernsalon.com',
              },
              createdTime: new Date(Date.now() - 86400000).toISOString(),
            },
            {
              id: 'demo_3',
              fields: {
                businessName: 'Real Estate Agency',
                industry: 'real estate agency',
                city: 'Brisbane',
                country: 'Australia',
                description:
                  'Professional real estate agency helping clients buy and sell properties.',
                contactInfo: 'sales@realestatebrisbane.com',
              },
              createdTime: new Date(Date.now() - 172800000).toISOString(),
            },
          ];

          setData(demoData);
          setLoadingState(DataLoadingState.SUCCESS);
          setError(null); // 清除错误状态，显示演示数据
          onDataLoaded?.(demoData);

          message.warning(
            'Airtable connection failed, switched to demo mode. Please check API configuration and refresh the page.',
            5
          );
        } else {
          const errorMessage = error?.message || 'Unknown error';
          setError(`Initial data loading failed: ${errorMessage}`);
          setLoadingState(DataLoadingState.ERROR);
        }
      }
    };

    loadInitialData();

    return () => {
      console.log('SmartOpportunities component unmounted');
    };
  }, []);

  /**
   * 调试信息
   */
  useEffect(() => {
    console.log('SmartOpportunities render:', {
      dataLength: data.length,
      loadingState,
      error,
    });
  });

  /**
   * 实时同步数据
   * 每30秒自动刷新一次数据
   */
  useEffect(() => {
    if (data.length === 0 || loadingState === DataLoadingState.LOADING) {
      return; // 如果没有数据或正在加载，不启动同步
    }

    const syncInterval = setInterval(async () => {
      try {
        console.log('Auto-syncing Smart Opportunities data...');

        // 使用当前参数重新获取数据
        if (parameters.industry && parameters.city && parameters.country) {
          const searchCriteria = {
            industry: parameters.industry,
            city: parameters.city,
            country: parameters.country,
            limit: 100,
          };

          let searchResults;
          try {
            console.log('Auto-syncing: Fetching all records from Airtable...');
            // 获取所有记录并应用当前过滤条件
            const allRecords = await airtableService.getAllRecords({
              // 不设置filterByFormula，获取所有记录
            });

            // 应用当前参数过滤
            if (parameters.industry || parameters.city || parameters.country) {
              searchResults = allRecords.filter(record => {
                const matchIndustry =
                  !parameters.industry ||
                  record.fields.industry
                    ?.toLowerCase()
                    .includes(parameters.industry.toLowerCase());
                const matchCity =
                  !parameters.city ||
                  record.fields.city
                    ?.toLowerCase()
                    .includes(parameters.city.toLowerCase());
                const matchCountry =
                  !parameters.country ||
                  record.fields.country
                    ?.toLowerCase()
                    .includes(parameters.country.toLowerCase());

                return matchIndustry && matchCity && matchCountry;
              });
            } else {
              searchResults = allRecords;
            }

            console.log(`Auto-synced ${searchResults.length} records`);
          } catch (airtableError) {
            console.warn('Airtable API error during sync:', airtableError);
            // 同步失败时保持现有数据不变
            return;
          }

          setData(searchResults);
          onDataLoaded?.(searchResults);
          console.log(`Auto-synced ${searchResults.length} opportunities`);
        }
      } catch (syncError) {
        console.error('Auto-sync failed:', syncError);
      }
    }, 30000); // 每30秒同步一次

    return () => {
      clearInterval(syncInterval);
      console.log('Auto-sync stopped');
    };
  }, [data.length, loadingState, parameters, airtableService, onDataLoaded]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 上下布局 - 输入区域在上，表格在下 */}
      <Row gutter={[16, 16]} style={{ flex: 1, minHeight: 0 }}>
        {/* 上方输入区域 */}
        <Col xs={24} style={{ flex: '0 0 auto' }}>
          <InputForm
            value={parameters}
            onChange={handleParametersChange}
            onSubmit={handleWorkflowSubmit}
            loading={loadingState === DataLoadingState.LOADING}
          />
        </Col>

        {/* 下方数据展示区域 - 占据剩余全部空间 */}
        <Col xs={24} style={{ flex: 1, minHeight: 0 }}>
          <AirtableTable
            data={data}
            loading={loadingState === DataLoadingState.LOADING}
            error={error}
            onDataChange={setData}
            airtableService={airtableService}
            onSort={handleTableSort}
            onPageChange={handlePageChange}
          />
        </Col>
      </Row>

      {/* 全局加载状态覆盖层 */}
      {loadingState === DataLoadingState.LOADING && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            borderRadius: '8px',
          }}
        >
          <Space direction='vertical' align='center'>
            <Spin size='large' />
            <Text strong>Discovering business opportunities...</Text>
            <Text type='secondary' style={{ fontSize: '12px' }}>
              This may take a few seconds, please wait patiently
            </Text>
          </Space>
        </div>
      )}

      {/* 状态信息提示 */}
      <div style={{ marginTop: 16 }}>
        <Space direction='vertical' style={{ width: '100%' }}>
          {loadingState === DataLoadingState.ERROR && (
            <Alert
              message='Airtable连接失败'
              description={
                <div>
                  <p>请检查以下信息：</p>
                  <ul>
                    <li>API Key是否正确</li>
                    <li>Base ID是否正确</li>
                    <li>表名是否为"Smart Opportunities"</li>
                    <li>网络连接是否正常</li>
                  </ul>
                  <p>
                    <strong>当前配置：</strong>
                  </p>
                  <ul>
                    <li>Base ID: {defaultAirtableConfig.baseId}</li>
                    <li>表名: {defaultAirtableConfig.tableName}</li>
                    <li>
                      API Key: {defaultAirtableConfig.apiKey.substring(0, 10)}
                      ...
                    </li>
                  </ul>
                </div>
              }
              type='error'
              showIcon
              closable
            />
          )}
          {loadingState === DataLoadingState.SUCCESS && data.length > 0 && (
            <Alert
              message='Data Loading Completed'
              description={`Successfully discovered ${data.length} business opportunities`}
              type='success'
              showIcon
              closable
            />
          )}
          {webhookWarning && (
            <Alert
              message='Webhook Service Warning'
              description={webhookWarning}
              type='warning'
              showIcon
              closable
              onClose={() => setWebhookWarning(null)}
            />
          )}
          {loadingState === DataLoadingState.ERROR && (
            <Alert
              message='操作失败'
              description={
                <div>
                  <p>{error || '未知错误'}</p>
                  <div style={{ marginTop: 8 }}>
                    <Button
                      size='small'
                      onClick={testAirtableConnection}
                      loading={loadingState === DataLoadingState.LOADING}
                    >
                      测试连接
                    </Button>
                  </div>
                </div>
              }
              type='error'
              showIcon
              closable
              action={
                <Space>
                  <a onClick={handleRefresh}>重试</a>
                </Space>
              }
            />
          )}

          {loadingState === DataLoadingState.IDLE && data.length === 0 && (
            <Alert
              message='Get Started'
              description="Please fill in the parameters on the left and click 'Start Workflow' to begin discovering business opportunities"
              type='info'
              showIcon
            />
          )}
        </Space>
      </div>
    </div>
  );
};

export default SmartOpportunities;
