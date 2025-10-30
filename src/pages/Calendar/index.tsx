/**
 * Calendar Page Component
 * Provides iframe integration with Google Calendar
 */

import React from 'react';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import CalendarContainer from './components/CalendarContainer';
import SecurityHeaders from './components/SecurityHeaders';
import CalendarErrorBoundary from './components/CalendarErrorBoundary';
import PerformanceMonitor from './components/PerformanceMonitor';
import './styles.css';

const { Title } = Typography;

/**
 * Calendar Page Component
 * Main page for Calendar module with Google Calendar iframe integration
 */
const CalendarPage: React.FC = () => {
  const { t } = useTranslation();

  // Calendly URL for scheduling
  const calendlyUrl = 'https://calendly.com/wendealau/30min';

  return (
    <div className='calendar-page calendar-page-layout-override'>
      {/* Security configuration - configures CSP and other headers */}
      <SecurityHeaders />

      {/* Performance monitoring - tracks loading times and user interactions */}
      <PerformanceMonitor />

      {/* Page header removed as requested */}

      <div className='calendar-content'>
        <CalendarErrorBoundary>
          <CalendarContainer url={calendlyUrl} />
        </CalendarErrorBoundary>
      </div>
    </div>
  );
};

export default CalendarPage;
