/**
 * Information Dashboard main page component
 * Data display platform integrated with n8n workflow system
 */

import React, { useState, useCallback } from 'react';
import { Card, Row, Col, Typography, Space, Divider } from 'antd';
import {
  DashboardOutlined,
  ApiOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import WorkflowSidebar from './components/WorkflowSidebar';
import WorkflowPanel from './components/WorkflowPanel';
import ResultPanel from './components/ResultPanel';
import InvoiceOCRPage from './InvoiceOCRPage';
import RedNoteContentGenerator from '@/pages/SocialMedia/components/RedNoteContentGenerator';
import SmartOpportunities from './components/SmartOpportunities';
import type { ParsedSubredditData } from '@/services/redditWebhookService';
import type { Workflow } from './types';

const { Title, Paragraph } = Typography;

/**
 * Information Dashboard main page component
 * Provides unified information aggregation and display interface
 */
const InformationDashboard: React.FC = () => {
  const { t } = useTranslation();

  // Reddit data state
  const [redditData, setRedditData] = useState<ParsedSubredditData[]>([]);

  // Currently selected workflow state
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(
    null
  );

  /**
   * Handle Reddit data reception
   */
  const handleRedditDataReceived = useCallback(
    (data: ParsedSubredditData[]) => {
      console.log('InformationDashboard: Received Reddit data:', data);
      setRedditData(data);
    },
    []
  );

  /**
   * Handle workflow selection
   */
  const handleWorkflowSelect = useCallback((workflow: Workflow) => {
    console.log('InformationDashboard: Selected workflow:', workflow);
    setSelectedWorkflow(workflow);
  }, []);

  return (
    <div className='information-dashboard'>
      {/* Page title */}
      <div className='page-header'>
        <Title level={2}>
          <DashboardOutlined /> {t('informationDashboard.title')}
        </Title>
        <Paragraph>{t('informationDashboard.subtitle')}</Paragraph>
      </div>

      <Divider />

      {/* Main content area - 上下布局 */}
      <Row gutter={[16, 16]}>
        {/* Workflow management panel - 减少高度，只占一行 */}
        <Col xs={24}>
          <Card
            title={
              <Space>
                <ApiOutlined />
                {t('informationDashboard.workflowManagement')}
              </Space>
            }
            className='workflow-panel-card'
            style={{ marginBottom: 0 }}
          >
            <WorkflowSidebar
              onRedditDataReceived={handleRedditDataReceived}
              onWorkflowSelect={handleWorkflowSelect}
            />
          </Card>
        </Col>

        {/* Data display area - 占据剩余全部空间 */}
        <Col xs={24}>
          <Card
            title={
              <Space>
                <FilterOutlined />
                {selectedWorkflow?.id === 'invoice-ocr-workflow'
                  ? t('informationDashboard.invoiceOCRRecognition')
                  : selectedWorkflow?.id === 'rednote-content-generator'
                    ? 'Rednote Content Generator'
                    : selectedWorkflow?.id === 'smart-opportunities'
                      ? 'Smart Opportunities'
                      : t('informationDashboard.title')}
              </Space>
            }
            className='data-display-card'
            style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}
          >
            {selectedWorkflow?.id === 'invoice-ocr-workflow' ? (
              <InvoiceOCRPage />
            ) : selectedWorkflow?.id === 'rednote-content-generator' ? (
              <RedNoteContentGenerator />
            ) : selectedWorkflow?.id === 'smart-opportunities' ? (
              <SmartOpportunities />
            ) : (
              <>
                <WorkflowPanel />
                <Divider />
                <ResultPanel redditData={redditData} />
              </>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default InformationDashboard;
