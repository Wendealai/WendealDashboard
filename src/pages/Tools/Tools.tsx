/**
 * Tools Dashboard main page component
 * Data display platform integrated with n8n workflow system
 */

import React, { useState, useCallback, type ReactNode } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Space,
  Divider,
  Popover,
  Breadcrumb,
  Button,
} from 'antd';
import {
  ToolOutlined,
  FilterOutlined,
  InfoCircleOutlined,
  HomeOutlined,
  SettingOutlined,
  FileSearchOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import WorkflowSidebar from './components/WorkflowSidebar';
import WorkflowPanel from './components/WorkflowPanel';
import ResultPanel from './components/ResultPanel';
import InvoiceOCRPage from './components/InvoiceOCRPage';
import UniversalOCRPage from './components/UniversalOCRPage';
import SmartOpportunities from './components/SmartOpportunities';
import TaxInvoiceReceipt from './components/TaxInvoiceReceipt';
import ToolsWorkflowContainer from './components/ToolsWorkflowContainer';
import InvoiceIngestionAssistant from './components/InvoiceIngestionAssistant';
import type { Workflow } from './types';

const { Title, Text } = Typography;
const WORKFLOW_QUERY_KEY = 'workflow';
const INVOICE_INGESTION_ASSISTANT_WORKFLOW_ID =
  'invoice-ingestion-assistant-workflow';

/**
 * Tools Dashboard main page component
 * Provides unified information aggregation and display interface
 */
const Tools: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Currently selected workflow state
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
    null
  );

  const updateWorkflowQuery = useCallback(
    (workflowId?: string) => {
      const nextSearchParams = new URLSearchParams(searchParams);
      if (workflowId) {
        nextSearchParams.set(WORKFLOW_QUERY_KEY, workflowId);
      } else {
        nextSearchParams.delete(WORKFLOW_QUERY_KEY);
      }
      setSearchParams(nextSearchParams, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  /**
   * Handle workflow selection
   */
  const handleWorkflowSelect = useCallback(
    (workflow: Workflow | null) => {
      console.log('Tools: Selected workflow:', workflow);
      setSelectedWorkflow(workflow);
      updateWorkflowQuery(workflow?.id);
    },
    [updateWorkflowQuery]
  );

  const handleOpenInvoiceIngestionAssistant = useCallback(() => {
    setSelectedWorkflow(null);
    updateWorkflowQuery(INVOICE_INGESTION_ASSISTANT_WORKFLOW_ID);
  }, [updateWorkflowQuery]);

  const workflowFromQuery = searchParams.get(WORKFLOW_QUERY_KEY) || '';
  const selectedWorkflowId = selectedWorkflow?.id || workflowFromQuery;
  const workflowTitleMap: Record<string, string> = {
    'invoice-ocr-workflow': t('informationDashboard.invoiceOCRRecognition'),
    'universal-ocr-workflow': 'Universal OCR Processing',
    'smart-opportunities': 'Smart Opportunities',
    'tax-invoice-receipt-workflow': 'Tax Invoice/Receipt',
    'invoice-ingestion-assistant-workflow':
      '发票采集助手 / Invoice Ingestion Assistant',
    'invoice-shelf-workflow': 'InvoiceShelf',
    'tools-workflow': t('tools.workflow.iframeTitle', 'Business Tools'),
  };

  const workflowContentMap: Record<string, ReactNode> = {
    'invoice-ocr-workflow': <InvoiceOCRPage />,
    'universal-ocr-workflow': <UniversalOCRPage />,
    'smart-opportunities': <SmartOpportunities />,
    'tax-invoice-receipt-workflow': <TaxInvoiceReceipt />,
    'invoice-ingestion-assistant-workflow': <InvoiceIngestionAssistant />,
    'tools-workflow': (
      <ToolsWorkflowContainer
        src='https://vert.wendealai.com'
        title={t('tools.workflow.iframeTitle', 'Business Tools')}
      />
    ),
    'invoice-shelf-workflow': (
      <ToolsWorkflowContainer
        src='https://invoice.wendealai.com'
        title='InvoiceShelf'
      />
    ),
  };
  const resolvedWorkflowId = workflowContentMap[selectedWorkflowId]
    ? selectedWorkflowId
    : '';

  const defaultContent = (
    <>
      <WorkflowPanel />
      <Divider />
      <ResultPanel />
    </>
  );

  return (
    <div className='information-dashboard'>
      {/* Breadcrumb Navigation */}
      <Breadcrumb
        style={{ marginBottom: '16px' }}
        items={[
          {
            href: '/',
            title: <HomeOutlined />,
          },
          {
            href: '/tools',
            title: (
              <>
                <SettingOutlined />
                <span>Tools</span>
              </>
            ),
          },
          {
            title:
              selectedWorkflow?.name ||
              workflowTitleMap[resolvedWorkflowId] ||
              'Dashboard',
          },
        ]}
      />

      {/* Page title */}
      <div className='page-header'>
        <Title level={2} style={{ marginBottom: 8, fontSize: '22px' }}>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <ToolOutlined style={{ marginRight: 12 }} />
            {t('navigation.tools')}
            <Button
              type='primary'
              size='small'
              icon={<FileSearchOutlined />}
              onClick={handleOpenInvoiceIngestionAssistant}
              style={{ marginLeft: '12px' }}
            >
              发票采集助手
            </Button>
            <Popover
              content={
                <div style={{ maxWidth: '550px' }}>
                  <div style={{ marginBottom: '12px' }}>
                    <Text strong style={{ fontSize: '16px' }}>
                      Essential Business Tools
                    </Text>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <Text
                      type='secondary'
                      style={{ lineHeight: '1.6', fontSize: '14px' }}
                    >
                      A comprehensive collection of essential business tools and
                      workflows frequently used in daily operations,
                      streamlining business processes and improving operational
                      efficiency.
                    </Text>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <Text strong style={{ fontSize: '14px' }}>
                      Key Features:
                    </Text>
                  </div>
                  <Space
                    direction='vertical'
                    size='small'
                    style={{ fontSize: '13px' }}
                  >
                    <div>• Invoice OCR Processing</div>
                    <div>• Smart Business Opportunities</div>
                    <div>• Workflow Management</div>
                  </Space>
                  <div style={{ marginTop: '12px' }}>
                    <Text
                      type='secondary'
                      style={{ fontSize: '13px', lineHeight: '1.6' }}
                    >
                      Designed for daily business operations, providing quick
                      access to commonly used tools and workflows to enhance
                      productivity and streamline business processes.
                    </Text>
                  </div>
                </div>
              }
              trigger='hover'
              placement='bottomRight'
              mouseEnterDelay={0.5}
              overlayStyle={{ maxWidth: '600px' }}
            >
              <InfoCircleOutlined
                style={{
                  color: '#888888',
                  cursor: 'pointer',
                  marginLeft: '8px',
                  fontSize: '18px',
                }}
              />
            </Popover>
          </span>
        </Title>
      </div>

      <Divider />

      {/* Main content area - 上下布局 */}
      <Row gutter={[16, 16]}>
        {/* Workflow management panel - 作为底层，无包装框 */}
        <Col xs={24}>
          <div style={{ marginBottom: '16px' }}>
            <WorkflowSidebar onWorkflowSelect={handleWorkflowSelect} />
          </div>
        </Col>

        {/* Data display area - 占据剩余全部空间 */}
        <Col xs={24}>
          <Card
            title={
              <Space>
                <FilterOutlined />
                <span style={{ fontSize: '16px' }}>
                  {workflowTitleMap[resolvedWorkflowId] ||
                    t('informationDashboard.title')}
                </span>
              </Space>
            }
            className='data-display-card'
            style={{ height: 'calc(100vh - 80px)', minHeight: '850px' }}
          >
            {workflowContentMap[resolvedWorkflowId] || defaultContent}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Tools;
