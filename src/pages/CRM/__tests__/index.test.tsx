/**
 * CRM Page Integration Tests
 * Tests page rendering, component integration, and security features
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import CRMPage from '../index';

// Mock all child components
jest.mock('../components/SecurityHeaders', () => {
  return function MockSecurityHeaders() {
    return <div data-testid='security-headers'>SecurityHeaders</div>;
  };
});

jest.mock('../components/CRMContainer', () => {
  return function MockCRMContainer({
    src,
    title,
  }: {
    src: string;
    title: string;
  }) {
    return (
      <div data-testid='crm-container'>
        CRMContainer - {title} - {src}
      </div>
    );
  };
});

jest.mock('../components/CRMErrorBoundary', () => {
  return function MockCRMErrorBoundary({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <div data-testid='error-boundary'>{children}</div>;
  };
});

jest.mock('../components/PerformanceMonitor', () => {
  return function MockPerformanceMonitor() {
    return <div data-testid='performance-monitor'>PerformanceMonitor</div>;
  };
});

// Mock useTranslation hook
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

// Mock environment variables
const originalEnv = process.env;
beforeEach(() => {
  process.env = {
    ...originalEnv,
    REACT_APP_CRM_URL: 'https://test-crm.example.com',
  };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('CRM Page', () => {
  describe('Page Structure', () => {
    it('renders page container with correct class', () => {
      render(<CRMPage />);

      const pageContainer = document.querySelector('.crm-page');
      expect(pageContainer).toBeInTheDocument();
    });

    it('renders page header with title', () => {
      render(<CRMPage />);

      const header = document.querySelector('.page-header');
      expect(header).toBeInTheDocument();

      expect(screen.getByText('CRM')).toBeInTheDocument();
    });

    it('renders content area', () => {
      render(<CRMPage />);

      const content = document.querySelector('.crm-content');
      expect(content).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('includes SecurityHeaders component', () => {
      render(<CRMPage />);

      expect(screen.getByTestId('security-headers')).toBeInTheDocument();
    });

    it('includes PerformanceMonitor component', () => {
      render(<CRMPage />);

      expect(screen.getByTestId('performance-monitor')).toBeInTheDocument();
    });

    it('wraps CRMContainer with CRMErrorBoundary', () => {
      render(<CRMPage />);

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('crm-container')).toBeInTheDocument();
    });
  });

  describe('CRM Container Configuration', () => {
    it('passes correct props to CRMContainer', () => {
      render(<CRMPage />);

      const container = screen.getByTestId('crm-container');
      expect(container).toHaveTextContent(
        'CRMContainer - Twenty CRM System - https://test-crm.example.com'
      );
    });

    it('uses environment variable for CRM URL', () => {
      process.env.REACT_APP_CRM_URL = 'https://custom-crm.example.com';

      render(<CRMPage />);

      const container = screen.getByTestId('crm-container');
      expect(container).toHaveTextContent('https://custom-crm.example.com');

      // Reset
      process.env.REACT_APP_CRM_URL = 'https://test-crm.example.com';
    });

    it('provides proper iframe title for accessibility', () => {
      render(<CRMPage />);

      const container = screen.getByTestId('crm-container');
      expect(container).toHaveTextContent('Twenty CRM System');
    });
  });

  describe('Error Handling Integration', () => {
    it('error boundary wraps the main content', () => {
      render(<CRMPage />);

      // Error boundary should contain the CRM container
      const errorBoundary = screen.getByTestId('error-boundary');
      const crmContainer = screen.getByTestId('crm-container');

      expect(errorBoundary).toContainElement(crmContainer);
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('performance monitor is included in the page', () => {
      render(<CRMPage />);

      expect(screen.getByTestId('performance-monitor')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive CSS classes', () => {
      render(<CRMPage />);

      const pageContainer = document.querySelector('.crm-page');
      const contentArea = document.querySelector('.crm-content');

      expect(pageContainer).toHaveClass('crm-page');
      expect(contentArea).toHaveClass('crm-content');
    });
  });

  describe('Security Integration', () => {
    it('includes security headers component', () => {
      render(<CRMPage />);

      expect(screen.getByTestId('security-headers')).toBeInTheDocument();
    });
  });
});
