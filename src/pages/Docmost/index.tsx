/**
 * Docmost Page Component
 * Provides iframe integration with Docmost documentation platform
 */

import React from 'react';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import DocmostContainer from './components/DocmostContainer';
import SecurityHeaders from './components/SecurityHeaders';
import DocmostErrorBoundary from './components/DocmostErrorBoundary';
import PerformanceMonitor from './components/PerformanceMonitor';
import './styles.css';

const { Title } = Typography;

/**
 * Docmost Page Component
 * Main page for Docmost module with Docmost iframe integration
 */
const DocmostPage: React.FC = () => {
  const { t } = useTranslation();

  // Docmost instance URL - configurable via environment variables
  const docmostUrl =
    process.env.REACT_APP_DOCMOST_URL || 'https://docmost.wendealai.com.au';

  return (
    <div className='docmost-page docmost-page-layout-override'>
      {/* Security configuration - configures CSP and other headers */}
      <SecurityHeaders />

      {/* Performance monitoring - tracks loading times and user interactions */}
      <PerformanceMonitor />

      {/* Page header removed as requested */}

      <div className='docmost-content'>
        <DocmostErrorBoundary>
          <DocmostContainer
            src={docmostUrl}
            title={t('docmost.iframeTitle', 'Docmost Documentation System')}
          />
        </DocmostErrorBoundary>
      </div>
    </div>
  );
};

export default DocmostPage;
