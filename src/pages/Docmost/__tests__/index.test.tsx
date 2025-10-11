/**
 * Docmost Page Integration Tests
 * Tests page rendering, component integration, and security features
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import DocmostPage from '../index';

// Mock all child components
jest.mock('../components/SecurityHeaders', () => {
  return function MockSecurityHeaders() {
    return <div data-testid='security-headers'>SecurityHeaders</div>;
  };
});

jest.mock('../components/DocmostContainer', () => {
  return function MockDocmostContainer({
    src,
    title,
  }: {
    src: string;
    title: string;
  }) {
    return (
      <div data-testid='docmost-container'>
        DocmostContainer - {title} - {src}
      </div>
    );
  };
});

jest.mock('../components/DocmostErrorBoundary', () => {
  return function MockDocmostErrorBoundary({
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
    REACT_APP_DOCMOST_URL: 'https://test-docmost.example.com',
  };
});

afterEach(() => {
  process.env = originalEnv;
});

describe('Docmost Page', () => {
  describe('Page Structure', () => {
    it('renders page container with correct class', () => {
      render(<DocmostPage />);

      const pageContainer = document.querySelector('.docmost-page');
      expect(pageContainer).toBeInTheDocument();
    });

    it('renders content area', () => {
      render(<DocmostPage />);

      const content = document.querySelector('.docmost-content');
      expect(content).toBeInTheDocument();
    });
  });

  describe('Component Integration', () => {
    it('includes SecurityHeaders component', () => {
      render(<DocmostPage />);

      expect(screen.getByTestId('security-headers')).toBeInTheDocument();
    });

    it('includes PerformanceMonitor component', () => {
      render(<DocmostPage />);

      expect(screen.getByTestId('performance-monitor')).toBeInTheDocument();
    });

    it('wraps DocmostContainer with DocmostErrorBoundary', () => {
      render(<DocmostPage />);

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('docmost-container')).toBeInTheDocument();
    });
  });

  describe('Docmost Container Configuration', () => {
    it('passes correct props to DocmostContainer', () => {
      render(<DocmostPage />);

      const container = screen.getByTestId('docmost-container');
      expect(container).toHaveTextContent(
        'DocmostContainer - Docmost Documentation System - https://test-docmost.example.com'
      );
    });

    it('uses environment variable for Docmost URL', () => {
      process.env.REACT_APP_DOCMOST_URL = 'https://custom-docmost.example.com';

      render(<DocmostPage />);

      const container = screen.getByTestId('docmost-container');
      expect(container).toHaveTextContent('https://custom-docmost.example.com');

      // Reset
      process.env.REACT_APP_DOCMOST_URL = 'https://test-docmost.example.com';
    });

    it('provides proper iframe title for accessibility', () => {
      render(<DocmostPage />);

      const container = screen.getByTestId('docmost-container');
      expect(container).toHaveTextContent('Docmost Documentation System');
    });
  });

  describe('Error Handling Integration', () => {
    it('error boundary wraps the main content', () => {
      render(<DocmostPage />);

      // Error boundary should contain the Docmost container
      const errorBoundary = screen.getByTestId('error-boundary');
      const docmostContainer = screen.getByTestId('docmost-container');

      expect(errorBoundary).toContainElement(docmostContainer);
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('performance monitor is included in the page', () => {
      render(<DocmostPage />);

      expect(screen.getByTestId('performance-monitor')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('applies responsive CSS classes', () => {
      render(<DocmostPage />);

      const pageContainer = document.querySelector('.docmost-page');
      const contentArea = document.querySelector('.docmost-content');

      expect(pageContainer).toHaveClass('docmost-page');
      expect(contentArea).toHaveClass('docmost-content');
    });
  });

  describe('Security Integration', () => {
    it('includes security headers component', () => {
      render(<DocmostPage />);

      expect(screen.getByTestId('security-headers')).toBeInTheDocument();
    });
  });
});
