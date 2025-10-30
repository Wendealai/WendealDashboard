/**
 * Todo Page Component
 * Provides iframe integration with todo.wendealai.com
 */

import React from 'react';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import TodoContainer from './components/TodoContainer';
import SecurityHeaders from './components/SecurityHeaders';
import TodoErrorBoundary from './components/TodoErrorBoundary';
import PerformanceMonitor from './components/PerformanceMonitor';
import './styles.css';

const { Title } = Typography;

/**
 * Todo Page Component
 * Main page for Todo module with iframe integration
 */
const TodoPage: React.FC = () => {
  const { t } = useTranslation();

  // Todo URL
  const todoUrl = 'https://todo.wendealai.com';

  return (
    <div className='todo-page todo-page-layout-override'>
      {/* Security configuration - configures CSP and other headers */}
      <SecurityHeaders />

      {/* Performance monitoring - tracks loading times and user interactions */}
      <PerformanceMonitor />

      <div className='todo-content'>
        <TodoErrorBoundary>
          <TodoContainer url={todoUrl} />
        </TodoErrorBoundary>
      </div>
    </div>
  );
};

export default TodoPage;
