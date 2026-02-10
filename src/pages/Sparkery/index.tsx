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
} from '@ant-design/icons';
import CleaningInspectionAdmin from './CleaningInspectionAdmin';
import ChinaProcurementReport from './ChinaProcurementReport';
import BrisbaneQuoteCalculator from './BrisbaneQuoteCalculator';
import BondCleanQuoteForm from './BondCleanQuoteForm';
import BondCleanQuoteFormCN from './BondCleanQuoteFormCN';

const { Title } = Typography;

/** Main Sparkery Page Component */
const SparkeryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('quote-calculator');

  const tabItems = [
    {
      key: 'cleaning-inspection',
      label: (
        <span>
          <HomeOutlined />
          Cleaning Inspection
        </span>
      ),
      children: <CleaningInspectionAdmin />,
    },
    {
      key: 'china-procurement',
      label: (
        <span>
          <ShoppingCartOutlined />
          China Procurement
        </span>
      ),
      children: <ChinaProcurementReport />,
    },
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
      key: 'quote-form-en',
      label: (
        <span>
          <FileTextOutlined />
          Quote Form (EN)
        </span>
      ),
      children: <BondCleanQuoteForm />,
    },
    {
      key: 'quote-form-cn',
      label: (
        <span>
          <GlobalOutlined />
          报价表单 (中文)
        </span>
      ),
      children: <BondCleanQuoteFormCN />,
    },
  ];

  return (
    <div style={{ padding: '12px' }}>
      <Title level={3} style={{ marginBottom: '16px' }}>
        Sparkery Tools
      </Title>
      <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
    </div>
  );
};

export default SparkeryPage;
