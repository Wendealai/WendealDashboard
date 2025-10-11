/**
 * Files Page Component
 * Provides iframe integration with file management platform
 */

import React from 'react';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import FilesContainer from './components/FilesContainer';
import SecurityHeaders from '../CRM/components/SecurityHeaders';
import CRMErrorBoundary from '../CRM/components/CRMErrorBoundary';
import PerformanceMonitor from '../CRM/components/PerformanceMonitor';
import './styles.css';

const { Title } = Typography;

/**
 * Files Page Component
 * Main page for Files module with file management iframe integration
 */
const FilesPage: React.FC = () => {
  const { t } = useTranslation();

  // Files instance URL - configurable via environment variables
  const filesUrl =
    process.env.REACT_APP_FILES_URL || 'https://send.wendealai.com';

  return (
    <div className='files-page files-page-layout-override'>
      {/* Security configuration - configures CSP and other headers */}
      <SecurityHeaders />

      {/* Performance monitoring - tracks loading times and user interactions */}
      <PerformanceMonitor />

      {/* Page header removed as requested */}

      <div className='files-content'>
        <CRMErrorBoundary>
          <FilesContainer
            src={filesUrl}
            title={t('files.iframeTitle', 'File Management System')}
          />
        </CRMErrorBoundary>
      </div>
    </div>
  );
};

export default FilesPage;
