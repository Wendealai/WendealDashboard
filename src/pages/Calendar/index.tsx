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

  // Google Calendar embed URL with specific configuration
  const calendarUrl =
    'https://calendar.google.com/calendar/embed?height=600&wkst=1&ctz=Australia%2FBrisbane&mode=MONTH&hl=en_GB&src=d2VuZGVhbGF1QGdtYWlsLmNvbQ&src=NjhkNDA5NGFiOGQ4ODRlMTI4YTk0NzkyYzY0ODdlN2E4YzRjMzZjMTJlZDdlNGY3MzI3ZGEyMmMwYjdjNjUzYkBncm91cC5jYWxlbmRhci5nb29nbGUuY29t&src=emguYXVzdHJhbGlhbiNob2xpZGF5QGdyb3VwLnYuY2FsZW5kYXIuZ29vZ2xlLmNvbQ&color=%23039be5&color=%234285f4&color=%230b8043';

  return (
    <div className='calendar-page calendar-page-layout-override'>
      {/* Security configuration - configures CSP and other headers */}
      <SecurityHeaders />

      {/* Performance monitoring - tracks loading times and user interactions */}
      <PerformanceMonitor />

      {/* Page header removed as requested */}

      <div className='calendar-content'>
        <CalendarErrorBoundary>
          <CalendarContainer
            src={calendarUrl}
            title={t('calendar.iframeTitle', 'Google Calendar')}
          />
        </CalendarErrorBoundary>
      </div>
    </div>
  );
};

export default CalendarPage;
