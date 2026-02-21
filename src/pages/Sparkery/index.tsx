/**
 * Sparkery Main Page - Container for all Sparkery tools with tabs
 */

import React, { useState, createContext, useContext } from 'react';
import { Tabs, Typography } from 'antd';
import {
  HomeOutlined,
  ShoppingCartOutlined,
  CalculatorOutlined,
  FileTextOutlined,
  GlobalOutlined,
  UnorderedListOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';
import CleaningInspectionAdmin from './CleaningInspectionAdmin';
import ChinaProcurementReport from './ChinaProcurementReport';
import BrisbaneQuoteCalculator from './BrisbaneQuoteCalculator';
import BondCleanQuoteForm from './BondCleanQuoteForm';
import BondCleanQuoteFormCN from './BondCleanQuoteFormCN';
import BondCleanQuoteSubmissions from './BondCleanQuoteSubmissions';
import DispatchDashboard from './DispatchDashboard';
import './sparkery.css';

const { Title } = Typography;

// Draft data interface for cross-component communication
export interface QuoteDraftData {
  customerName: string;
  email: string;
  phone: string;
  propertyAddress: string;
  propertyType: 'apartment' | 'townhouse' | 'house';
  houseLevel?: 'single' | 'double';
  roomType: string;
  customRoomType?: string;
  hasCarpet: boolean;
  carpetRooms: number;
  garage: boolean;
  glassDoorWindowCount: number;
  oven: boolean;
  fridge: boolean;
  wallStainsCount: number;
  acFilterCount: number;
  blindsCount: number;
  moldCount: number;
  heavySoiling: boolean;
  rubbishRemoval: boolean;
  rubbishRemovalNotes?: string;
  preferredDate: string;
  additionalNotes: string;
  isSparkeryNewCustomer: boolean;
}

// Context for draft data
interface QuoteDraftContextType {
  draftData: QuoteDraftData | null;
  setDraftData: (data: QuoteDraftData | null) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const QuoteDraftContext = createContext<QuoteDraftContextType>({
  draftData: null,
  setDraftData: () => {},
  activeTab: 'quote-calculator',
  setActiveTab: () => {},
});

export const useQuoteDraft = () => useContext(QuoteDraftContext);

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
  ];

  return (
    <QuoteDraftContext.Provider
      value={{ draftData, setDraftData, activeTab, setActiveTab }}
    >
      <div className='sparkery-page' style={{ padding: '12px' }}>
        <Title level={3} style={{ marginBottom: '16px' }}>
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
