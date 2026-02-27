/**
 * Sparkery Main Page - Container for all Sparkery tools with tabs
 */

import React, {
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
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
import { useSparkeryTabPrefetch } from './useSparkeryTabPrefetch';
import { loadSparkeryLocaleOverrides } from '@/locales';
import './sparkery.css';

const { Title } = Typography;
const loadBrisbaneQuoteCalculator = () => import('./BrisbaneQuoteCalculator');
const loadCleaningInspectionAdmin = () => import('./CleaningInspectionAdmin');
const loadChinaProcurementReport = () => import('./ChinaProcurementReport');
const loadBondCleanQuoteForm = () => import('./BondCleanQuoteFormEN');
const loadBondCleanQuoteFormCN = () => import('./BondCleanQuoteFormCN');
const loadBondCleanQuoteSubmissions = () =>
  import('./BondCleanQuoteSubmissions');
const loadDispatchDashboard = () => import('./DispatchDashboard');
const loadDispatchFinanceDashboard = () => import('./DispatchFinanceDashboard');
const loadDispatchRecurringTemplatesPage = () =>
  import('./DispatchRecurringTemplatesPage');

const BrisbaneQuoteCalculator = lazy(loadBrisbaneQuoteCalculator);
const CleaningInspectionAdmin = lazy(loadCleaningInspectionAdmin);
const ChinaProcurementReport = lazy(loadChinaProcurementReport);
const BondCleanQuoteForm = lazy(loadBondCleanQuoteForm);
const BondCleanQuoteFormCN = lazy(loadBondCleanQuoteFormCN);
const BondCleanQuoteSubmissions = lazy(loadBondCleanQuoteSubmissions);
const DispatchDashboard = lazy(loadDispatchDashboard);
const DispatchFinanceDashboard = lazy(loadDispatchFinanceDashboard);
const DispatchRecurringTemplatesPage = lazy(loadDispatchRecurringTemplatesPage);

const SPARKERY_TAB_PRELOADERS: Record<string, () => Promise<unknown>> = {
  'quote-calculator': loadBrisbaneQuoteCalculator,
  'cleaning-inspection': loadCleaningInspectionAdmin,
  'china-procurement': loadChinaProcurementReport,
  'quote-form-en': loadBondCleanQuoteForm,
  'quote-form-cn': loadBondCleanQuoteFormCN,
  'quote-submissions': loadBondCleanQuoteSubmissions,
  'dispatch-dashboard': loadDispatchDashboard,
  'dispatch-recurring-templates': loadDispatchRecurringTemplatesPage,
  'dispatch-finance': loadDispatchFinanceDashboard,
};

const SPARKERY_TAB_ORDER = [
  'quote-calculator',
  'cleaning-inspection',
  'china-procurement',
  'quote-form-en',
  'quote-form-cn',
  'quote-submissions',
  'dispatch-dashboard',
  'dispatch-recurring-templates',
  'dispatch-finance',
] as const;

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
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState('quote-calculator');
  const [draftData, setDraftData] = useState<QuoteDraftData | null>(null);
  const [localeReady, setLocaleReady] = useState(false);
  const prefetchTab = useSparkeryTabPrefetch({
    activeTab,
    tabOrder: SPARKERY_TAB_ORDER,
    preloaders: SPARKERY_TAB_PRELOADERS,
  });

  useEffect(() => {
    let isCancelled = false;
    setLocaleReady(false);

    void (async () => {
      await loadSparkeryLocaleOverrides(i18n.language);
      if (!isCancelled) {
        setLocaleReady(true);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [i18n.language]);

  const renderTabLabel = useCallback(
    (tabKey: string, icon: React.ReactNode, text: string) => (
      <span
        onMouseEnter={() => prefetchTab(tabKey)}
        onFocus={() => prefetchTab(tabKey)}
      >
        {icon}
        {text}
      </span>
    ),
    [prefetchTab]
  );

  const tabItems = useMemo(
    () => [
      {
        key: 'quote-calculator',
        label: renderTabLabel(
          'quote-calculator',
          <CalculatorOutlined />,
          t('sparkery.tabs.quoteCalculator')
        ),
        children: renderLazyTabContent(BrisbaneQuoteCalculator),
      },
      {
        key: 'cleaning-inspection',
        label: renderTabLabel(
          'cleaning-inspection',
          <HomeOutlined />,
          t('sparkery.tabs.cleaningInspection')
        ),
        children: renderLazyTabContent(CleaningInspectionAdmin),
      },
      {
        key: 'china-procurement',
        label: renderTabLabel(
          'china-procurement',
          <ShoppingCartOutlined />,
          t('sparkery.tabs.chinaProcurement')
        ),
        children: renderLazyTabContent(ChinaProcurementReport),
      },
      {
        key: 'quote-form-en',
        label: renderTabLabel(
          'quote-form-en',
          <FileTextOutlined />,
          t('sparkery.tabs.quoteFormEn')
        ),
        children: renderLazyTabContent(BondCleanQuoteForm),
      },
      {
        key: 'quote-form-cn',
        label: renderTabLabel(
          'quote-form-cn',
          <GlobalOutlined />,
          t('sparkery.tabs.quoteFormCn')
        ),
        children: renderLazyTabContent(BondCleanQuoteFormCN),
      },
      {
        key: 'quote-submissions',
        label: renderTabLabel(
          'quote-submissions',
          <UnorderedListOutlined />,
          t('sparkery.tabs.quoteSubmissions')
        ),
        children: renderLazyTabContent(BondCleanQuoteSubmissions),
      },
      {
        key: 'dispatch-dashboard',
        label: renderTabLabel(
          'dispatch-dashboard',
          <ScheduleOutlined />,
          t('sparkery.tabs.dispatchDashboard')
        ),
        children: renderLazyTabContent(DispatchDashboard),
      },
      {
        key: 'dispatch-recurring-templates',
        label: renderTabLabel(
          'dispatch-recurring-templates',
          <RetweetOutlined />,
          t('sparkery.tabs.recurringTemplates')
        ),
        children: renderLazyTabContent(DispatchRecurringTemplatesPage),
      },
      {
        key: 'dispatch-finance',
        label: renderTabLabel(
          'dispatch-finance',
          <DollarOutlined />,
          t('sparkery.tabs.financeDashboard')
        ),
        children: renderLazyTabContent(DispatchFinanceDashboard),
      },
    ],
    [renderTabLabel, t]
  );

  if (!localeReady) {
    return (
      <div
        className='sparkery-page sparkery-page-shell'
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
  }

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
