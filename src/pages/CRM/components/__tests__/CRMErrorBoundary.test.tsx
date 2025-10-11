/**
 * CRMErrorBoundary Component Unit Tests
 * Tests error catching, fallback UI, and recovery mechanisms
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import CRMErrorBoundary from '../CRMErrorBoundary';

// Mock useTranslation hook
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

// Mock useNavigate hook
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock window.dispatchEvent for error events
const mockDispatchEvent = jest.fn();
Object.defineProperty(window, 'dispatchEvent', {
  writable: true,
  value: mockDispatchEvent,
});

// Mock console methods
const mockConsoleError = jest
  .spyOn(console, 'error')
  .mockImplementation(() => {});
const mockConsoleWarn = jest
  .spyOn(console, 'warn')
  .mockImplementation(() => {});

// Mock setTimeout for retry functionality
jest.useFakeTimers();

describe('CRMErrorBoundary', () => {
  const TestErrorComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
      throw new Error('Test error');
    }
    return <div>No error</div>;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  afterEach(() => {
    mockConsoleError.mockClear();
    mockConsoleWarn.mockClear();
  });

  describe('Error Catching', () => {
    it('renders children when no error occurs', () => {
      render(
        <CRMErrorBoundary>
          <TestErrorComponent shouldThrow={false} />
        </CRMErrorBoundary>
      );

      expect(screen.getByText('No error')).toBeInTheDocument();
    });

    it('catches and displays error fallback when error occurs', () => {
      // Suppress console error for this test
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(
          <CRMErrorBoundary>
            <TestErrorComponent shouldThrow={true} />
          </CRMErrorBoundary>
        );
      }).not.toThrow();

      // Restore console.error
      console.error = originalError;

      expect(screen.getByText('CRM System Error')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Something went wrong while loading the CRM system. This error has been logged for investigation.'
        )
      ).toBeInTheDocument();
    });

    it('logs error details in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(
          <CRMErrorBoundary>
            <TestErrorComponent shouldThrow={true} />
          </CRMErrorBoundary>
        );
      }).not.toThrow();

      expect(mockConsoleError).toHaveBeenCalledWith(
        'CRM Error Boundary caught an error:',
        expect.objectContaining({
          error: expect.any(Error),
          componentStack: expect.any(String),
          errorId: expect.stringMatching(/^crm-error-/),
        })
      );

      // Restore environment
      process.env.NODE_ENV = originalEnv;
      console.error = originalError;
    });
  });

  describe('Error Recovery', () => {
    it('provides retry functionality', async () => {
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(
          <CRMErrorBoundary>
            <TestErrorComponent shouldThrow={true} />
          </CRMErrorBoundary>
        );
      }).not.toThrow();

      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();

      // Click retry
      fireEvent.click(retryButton);

      // Fast-forward timers
      jest.advanceTimersByTime(150);

      await waitFor(() => {
        // Should reset and try to render children again
        expect(screen.queryByText('CRM System Error')).not.toBeInTheDocument();
      });

      console.error = originalError;
    });

    it('provides go home functionality', () => {
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(
          <CRMErrorBoundary>
            <TestErrorComponent shouldThrow={true} />
          </CRMErrorBoundary>
        );
      }).not.toThrow();

      const homeButton = screen.getByRole('button', {
        name: /go to dashboard/i,
      });
      expect(homeButton).toBeInTheDocument();

      fireEvent.click(homeButton);

      expect(window.location.href).toBe('/');

      console.error = originalError;
    });
  });

  describe('Custom Fallback', () => {
    it('uses custom fallback when provided', () => {
      const customFallback = <div>Custom Error UI</div>;

      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(
          <CRMErrorBoundary fallback={customFallback}>
            <TestErrorComponent shouldThrow={true} />
          </CRMErrorBoundary>
        );
      }).not.toThrow();

      expect(screen.getByText('Custom Error UI')).toBeInTheDocument();
      expect(screen.queryByText('CRM System Error')).not.toBeInTheDocument();

      console.error = originalError;
    });
  });

  describe('Development Features', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
      process.env.NODE_ENV = originalEnv;
    });

    it('shows detailed error information in development', () => {
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(
          <CRMErrorBoundary>
            <TestErrorComponent shouldThrow={true} />
          </CRMErrorBoundary>
        );
      }).not.toThrow();

      expect(
        screen.getByText('Error Details (Development)')
      ).toBeInTheDocument();
      expect(screen.getByText(/Error ID:/)).toBeInTheDocument();
      expect(screen.getByText(/Message:/)).toBeInTheDocument();

      console.error = originalError;
    });

    it('shows stack trace in development', () => {
      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(
          <CRMErrorBoundary>
            <TestErrorComponent shouldThrow={true} />
          </CRMErrorBoundary>
        );
      }).not.toThrow();

      expect(screen.getByText('Stack Trace')).toBeInTheDocument();
      expect(screen.getByText('Component Stack')).toBeInTheDocument();

      console.error = originalError;
    });
  });

  describe('Error ID Generation', () => {
    it('generates unique error IDs', () => {
      const originalError = console.error;
      console.error = jest.fn();

      let firstErrorId: string;

      // First error
      expect(() => {
        render(
          <CRMErrorBoundary>
            <TestErrorComponent shouldThrow={true} />
          </CRMErrorBoundary>
        );
      }).not.toThrow();

      firstErrorId =
        screen
          .getByText(/Error ID: crm-error-/)
          .textContent?.match(/crm-error-[^-]+-[^-]+/)?.[0] || '';

      // Reset and create second error
      jest.clearAllMocks();

      expect(() => {
        render(
          <CRMErrorBoundary key='second'>
            <TestErrorComponent shouldThrow={true} />
          </CRMErrorBoundary>
        );
      }).not.toThrow();

      const secondErrorId =
        screen
          .getByText(/Error ID: crm-error-/)
          .textContent?.match(/crm-error-[^-]+-[^-]+/)?.[0] || '';

      expect(firstErrorId).not.toBe(secondErrorId);
      expect(firstErrorId).toMatch(/^crm-error-\d+-[a-z0-9]+$/);
      expect(secondErrorId).toMatch(/^crm-error-\d+-[a-z0-9]+$/);

      console.error = originalError;
    });
  });

  describe('Lifecycle Management', () => {
    it('clears timeout on unmount', () => {
      const originalError = console.error;
      console.error = jest.fn();

      const { unmount } = render(
        <CRMErrorBoundary>
          <TestErrorComponent shouldThrow={true} />
        </CRMErrorBoundary>
      );

      // Trigger retry to set timeout
      const retryButton = screen.getByRole('button', { name: /try again/i });
      fireEvent.click(retryButton);

      unmount();

      // Should not throw when timers are advanced after unmount
      expect(() => {
        jest.advanceTimersByTime(200);
      }).not.toThrow();

      console.error = originalError;
    });
  });
});
