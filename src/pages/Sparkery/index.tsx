/**
 * Sparkery Main Page - Container for all Sparkery tools with tabs
 */

import React, { Suspense, lazy, useMemo, useState } from 'react';
import { Spin, Tabs, Typography } from 'antd';
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
import { QuoteDraftContext, type QuoteDraftData } from './quoteDraftContext';
import './sparkery.css';

const { Title } = Typography;
const BrisbaneQuoteCalculator = lazy(() => import('./BrisbaneQuoteCalculator'));
const CleaningInspectionAdmin = lazy(() => import('./CleaningInspectionAdmin'));
const ChinaProcurementReport = lazy(() => import('./ChinaProcurementReport'));
const BondCleanQuoteForm = lazy(() => import('./BondCleanQuoteForm'));
const BondCleanQuoteFormCN = lazy(() => import('./BondCleanQuoteFormCN'));
const BondCleanQuoteSubmissions = lazy(
  () => import('./BondCleanQuoteSubmissions')
);
const DispatchDashboard = lazy(() => import('./DispatchDashboard'));
const DispatchFinanceDashboard = lazy(
  () => import('./DispatchFinanceDashboard')
);
const DispatchRecurringTemplatesPage = lazy(
  () => import('./DispatchRecurringTemplatesPage')
);

type SparkeryTabComponent = React.LazyExoticComponent<React.ComponentType>;

const tabContentFallback = (
  <div
    style={{
      minHeight: 280,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}
  >
    <Spin size='large' />
  </div>
);

const renderLazyTabContent = (
  Component: SparkeryTabComponent
): React.ReactNode => (
  <Suspense fallback={tabContentFallback}>
    <Component />
  </Suspense>
);

/** Main Sparkery Page Component */
const SparkeryPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('quote-calculator');
  const [draftData, setDraftData] = useState<QuoteDraftData | null>(null);

  const tabItems = useMemo(
    () => [
      {
        key: 'quote-calculator',
        label: (
          <span>
            <CalculatorOutlined />
            {t('sparkery.tabs.quoteCalculator')}
          </span>
        ),
        children: renderLazyTabContent(BrisbaneQuoteCalculator),
      },
      {
        key: 'cleaning-inspection',
        label: (
          <span>
            <HomeOutlined />
            {t('sparkery.tabs.cleaningInspection')}
          </span>
        ),
        children: renderLazyTabContent(CleaningInspectionAdmin),
      },
      {
        key: 'china-procurement',
        label: (
          <span>
            <ShoppingCartOutlined />
            {t('sparkery.tabs.chinaProcurement')}
          </span>
        ),
        children: renderLazyTabContent(ChinaProcurementReport),
      },
      {
        key: 'quote-form-en',
        label: (
          <span>
            <FileTextOutlined />
            {t('sparkery.tabs.quoteFormEn')}
          </span>
        ),
        children: renderLazyTabContent(BondCleanQuoteForm),
      },
      {
        key: 'quote-form-cn',
        label: (
          <span>
            <GlobalOutlined />
            {t('sparkery.tabs.quoteFormCn')}
          </span>
        ),
        children: renderLazyTabContent(BondCleanQuoteFormCN),
      },
      {
        key: 'quote-submissions',
        label: (
          <span>
            <UnorderedListOutlined />
            {t('sparkery.tabs.quoteSubmissions')}
          </span>
        ),
        children: renderLazyTabContent(BondCleanQuoteSubmissions),
      },
      {
        key: 'dispatch-dashboard',
        label: (
          <span>
            <ScheduleOutlined />
            {t('sparkery.tabs.dispatchDashboard')}
          </span>
        ),
        children: renderLazyTabContent(DispatchDashboard),
      },
      {
        key: 'dispatch-recurring-templates',
        label: (
          <span>
            <RetweetOutlined />
            {t('sparkery.tabs.recurringTemplates')}
          </span>
        ),
        children: renderLazyTabContent(DispatchRecurringTemplatesPage),
      },
      {
        key: 'dispatch-finance',
        label: (
          <span>
            <DollarOutlined />
            {t('sparkery.tabs.financeDashboard')}
          </span>
        ),
        children: renderLazyTabContent(DispatchFinanceDashboard),
      },
    ],
    [t]
  );

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
