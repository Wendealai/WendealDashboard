/**
 * CRM Page Component
 * Provides iframe integration with Twenty CRM platform
 */

import React from 'react';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import CRMContainer from './components/CRMContainer';
import SecurityHeaders from './components/SecurityHeaders';
import CRMErrorBoundary from './components/CRMErrorBoundary';
import PerformanceMonitor from './components/PerformanceMonitor';
import './styles.css';

const { Title } = Typography;

/**
 * CRM Page Component
 * Main page for CRM module with Twenty CRM iframe integration
 */
const CRMPage: React.FC = () => {
  const { t } = useTranslation();

  // CRM instance URL - configurable via environment variables
  const crmUrl = process.env.REACT_APP_CRM_URL || 'https://crm.wendealai.com';

  return (
    <div className='crm-page crm-page-layout-override'>
      {/* Security configuration - configures CSP and other headers */}
      <SecurityHeaders />

      {/* Performance monitoring - tracks loading times and user interactions */}
      <PerformanceMonitor />

      {/* Page header removed as requested */}

      <div className='crm-content'>
        <CRMErrorBoundary>
          <CRMContainer
            src={crmUrl}
            title={t('crm.iframeTitle', 'Twenty CRM System')}
          />
        </CRMErrorBoundary>
      </div>
    </div>
  );
};

export default CRMPage;
