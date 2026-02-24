/**
 * Sparkery Main Page - Container for all Sparkery tools with tabs
 */

import React, { useState } from 'react';
import { Tabs, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  HomeOutlined,
  ShoppingCartOutlined,
  CalculatorOutlined,
  FileTextOutlined,
  GlobalOutlined,
  UnorderedListOutlined,
  ScheduleOutlined,
  DollarOutlined,
  RetweetOutlined,
} from '@ant-design/icons';
import CleaningInspectionAdmin from './CleaningInspectionAdmin';
import ChinaProcurementReport from './ChinaProcurementReport';
import BrisbaneQuoteCalculator from './BrisbaneQuoteCalculator';
import BondCleanQuoteForm from './BondCleanQuoteForm';
import BondCleanQuoteFormCN from './BondCleanQuoteFormCN';
import BondCleanQuoteSubmissions from './BondCleanQuoteSubmissions';
import DispatchDashboard from './DispatchDashboard';
import DispatchFinanceDashboard from './DispatchFinanceDashboard';
import DispatchRecurringTemplatesPage from './DispatchRecurringTemplatesPage';
import { QuoteDraftContext, type QuoteDraftData } from './quoteDraftContext';
import './sparkery.css';

const { Title } = Typography;

/** Main Sparkery Page Component */
const SparkeryPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('quote-calculator');
  const [draftData, setDraftData] = useState<QuoteDraftData | null>(null);

  const tabItems = [
    {
      key: 'quote-calculator',
      label: (
        <span>
          <CalculatorOutlined />
          {t('sparkery.tabs.quoteCalculator')}
        </span>
      ),
      children: <BrisbaneQuoteCalculator />,
    },
    {
      key: 'cleaning-inspection',
      label: (
        <span>
          <HomeOutlined />
          {t('sparkery.tabs.cleaningInspection')}
        </span>
      ),
      children: <CleaningInspectionAdmin />,
    },
    {
      key: 'china-procurement',
      label: (
        <span>
          <ShoppingCartOutlined />
          {t('sparkery.tabs.chinaProcurement')}
        </span>
      ),
      children: <ChinaProcurementReport />,
    },
    {
      key: 'quote-form-en',
      label: (
        <span>
          <FileTextOutlined />
          {t('sparkery.tabs.quoteFormEn')}
        </span>
      ),
      children: <BondCleanQuoteForm />,
    },
    {
      key: 'quote-form-cn',
      label: (
        <span>
          <GlobalOutlined />
          {t('sparkery.tabs.quoteFormCn')}
        </span>
      ),
      children: <BondCleanQuoteFormCN />,
    },
    {
      key: 'quote-submissions',
      label: (
        <span>
          <UnorderedListOutlined />
          {t('sparkery.tabs.quoteSubmissions')}
        </span>
      ),
      children: <BondCleanQuoteSubmissions />,
    },
    {
      key: 'dispatch-dashboard',
      label: (
        <span>
          <ScheduleOutlined />
          {t('sparkery.tabs.dispatchDashboard')}
        </span>
      ),
      children: <DispatchDashboard />,
    },
    {
      key: 'dispatch-recurring-templates',
      label: (
        <span>
          <RetweetOutlined />
          {t('sparkery.tabs.recurringTemplates')}
        </span>
      ),
      children: <DispatchRecurringTemplatesPage />,
    },
    {
      key: 'dispatch-finance',
      label: (
        <span>
          <DollarOutlined />
          {t('sparkery.tabs.financeDashboard')}
        </span>
      ),
      children: <DispatchFinanceDashboard />,
    },
  ];

  return (
    <QuoteDraftContext.Provider
      value={{ draftData, setDraftData, activeTab, setActiveTab }}
    >
      <div className='sparkery-page sparkery-page-shell'>
        <Title level={3} className='sparkery-page-title'>
          {t('sparkery.title')}
        </Title>
        <Tabs
          className='sparkery-tabs'
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          animated={false}
          tabBarGutter={8}
        />
      </div>
    </QuoteDraftContext.Provider>
  );
};

export default SparkeryPage;
