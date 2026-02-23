/**
 * Sparkery Main Page - Container for all Sparkery tools with tabs
 */

import React, { useState } from 'react';
import { Tabs, Typography } from 'antd';
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
  const [activeTab, setActiveTab] = useState('quote-calculator');
  const [draftData, setDraftData] = useState<QuoteDraftData | null>(null);

  const tabItems = [
    {
      key: 'quote-calculator',
      label: (
        <span>
          <CalculatorOutlined />
          报价工具
        </span>
      ),
      children: <BrisbaneQuoteCalculator />,
    },
    {
      key: 'cleaning-inspection',
      label: (
        <span>
          <HomeOutlined />
          清洁检查
        </span>
      ),
      children: <CleaningInspectionAdmin />,
    },
    {
      key: 'china-procurement',
      label: (
        <span>
          <ShoppingCartOutlined />
          中国采购
        </span>
      ),
      children: <ChinaProcurementReport />,
    },
    {
      key: 'quote-form-en',
      label: (
        <span>
          <FileTextOutlined />
          报价表单（英文）
        </span>
      ),
      children: <BondCleanQuoteForm />,
    },
    {
      key: 'quote-form-cn',
      label: (
        <span>
          <GlobalOutlined />
          报价表单（中文）
        </span>
      ),
      children: <BondCleanQuoteFormCN />,
    },
    {
      key: 'quote-submissions',
      label: (
        <span>
          <UnorderedListOutlined />
          已提交报价
        </span>
      ),
      children: <BondCleanQuoteSubmissions />,
    },
    {
      key: 'dispatch-dashboard',
      label: (
        <span>
          <ScheduleOutlined />
          派单看板
        </span>
      ),
      children: <DispatchDashboard />,
    },
    {
      key: 'dispatch-recurring-templates',
      label: (
        <span>
          <RetweetOutlined />
          周期模板
        </span>
      ),
      children: <DispatchRecurringTemplatesPage />,
    },
    {
      key: 'dispatch-finance',
      label: (
        <span>
          <DollarOutlined />
          财务看板
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
          Sparkery Tools
        </Title>
        <Tabs
          className='sparkery-tabs'
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </div>
    </QuoteDraftContext.Provider>
  );
};

export default SparkeryPage;
