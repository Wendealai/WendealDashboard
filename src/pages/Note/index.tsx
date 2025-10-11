/**
 * Note Page Component
 * Provides iframe integration with Note platform
 */

import React from 'react';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import NoteContainer from './components/NoteContainer';
import SecurityHeaders from './components/SecurityHeaders';
import NoteErrorBoundary from './components/NoteErrorBoundary';
import PerformanceMonitor from './components/PerformanceMonitor';
import './styles.css';

const { Title } = Typography;

/**
 * Note Page Component
 * Main page for Note module with Note iframe integration
 */
const NotePage: React.FC = () => {
  const { t } = useTranslation();

  // Note instance URL - configurable via environment variables
  const noteUrl =
    process.env.REACT_APP_NOTE_URL || 'https://note.wendealai.com';

  return (
    <div className='note-page note-page-layout-override'>
      {/* Security configuration - configures CSP and other headers */}
      <SecurityHeaders />

      {/* Performance monitoring - tracks loading times and user interactions */}
      <PerformanceMonitor />

      {/* Page header removed as requested */}

      <div className='note-content'>
        <NoteErrorBoundary>
          <NoteContainer
            src={noteUrl}
            title={t('note.iframeTitle', 'Note System')}
          />
        </NoteErrorBoundary>
      </div>
    </div>
  );
};

export default NotePage;
