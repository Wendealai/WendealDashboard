/**
 * PerformanceMonitor Component Unit Tests
 * Tests performance tracking, metrics collection, and event handling
 */

import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import PerformanceMonitor from '../PerformanceMonitor';

// Mock window.dispatchEvent
const mockDispatchEvent = jest.fn();
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();

// Mock Performance API
const mockPerformanceMark = jest.fn();
const mockPerformanceMeasure = jest.fn();
const mockPerformanceObserve = jest.fn();
const mockPerformanceDisconnect = jest.fn();

const mockPerformanceObserver = jest.fn().mockImplementation(() => ({
  observe: mockPerformanceObserve,
  disconnect: mockPerformanceDisconnect,
}));

// Mock window.performance
Object.defineProperty(window, 'dispatchEvent', {
  writable: true,
  value: mockDispatchEvent,
});

Object.defineProperty(window, 'addEventListener', {
  writable: true,
  value: mockAddEventListener,
});

Object.defineProperty(window, 'removeEventListener', {
  writable: true,
  value: mockRemoveEventListener,
});

Object.defineProperty(window, 'performance', {
  writable: true,
  value: {
    mark: mockPerformanceMark,
    measure: mockPerformanceMeasure,
    getEntriesByType: jest.fn(),
  },
});

// Mock PerformanceObserver
Object.defineProperty(window, 'PerformanceObserver', {
  writable: true,
  value: mockPerformanceObserver,
});

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});

// Mock Date.now for consistent timestamps
const mockNow = jest.fn();
Date.now = mockNow;
mockNow.mockReturnValue(1000000000); // Fixed timestamp for testing

describe('PerformanceMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNow.mockReturnValue(1000000000);
  });

  afterEach(() => {
    mockConsoleLog.mockClear();
  });

  describe('Component Lifecycle', () => {
    it('renders without crashing', () => {
      expect(() => {
        render(<PerformanceMonitor />);
      }).not.toThrow();
    });

    it('does not render any visible content', () => {
      const { container } = render(<PerformanceMonitor />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Event Listeners', () => {
    it('adds event listeners on mount', () => {
      render(<PerformanceMonitor />);

      expect(mockAddEventListener).toHaveBeenCalledWith(
        'crm-iframe-load-start',
        expect.any(Function)
      );
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'crm-iframe-loaded',
        expect.any(Function)
      );
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'crm-error',
        expect.any(Function)
      );
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'crm-retry',
        expect.any(Function)
      );
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );
    });

    it('removes event listeners on unmount', () => {
      const { unmount } = render(<PerformanceMonitor />);

      unmount();

      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'crm-iframe-load-start',
        expect.any(Function)
      );
      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'crm-iframe-loaded',
        expect.any(Function)
      );
      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'crm-error',
        expect.any(Function)
      );
      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'crm-retry',
        expect.any(Function)
      );
      expect(mockRemoveEventListener).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function)
      );
    });
  });

  describe('Performance Event Handling', () => {
    it('handles iframe load start event', () => {
      render(<PerformanceMonitor />);

      // Get the event handler
      const loadStartHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'crm-iframe-load-start'
      )?.[1];

      loadStartHandler();

      expect(mockPerformanceMark).toHaveBeenCalledWith('crm-iframe-load-start');
    });

    it('handles iframe loaded event', () => {
      render(<PerformanceMonitor />);

      // Get the event handler
      const loadedHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'crm-iframe-loaded'
      )?.[1];

      loadedHandler();

      expect(mockPerformanceMark).toHaveBeenCalledWith('crm-iframe-loaded');
      expect(mockPerformanceMeasure).toHaveBeenCalledWith(
        'crm-iframe-load-time',
        'crm-iframe-load-start',
        'crm-iframe-loaded'
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'CRM Performance: Iframe loaded',
        expect.objectContaining({
          totalLoadTime: expect.stringMatching(/\d+ms/),
          timestamp: expect.any(String),
        })
      );
    });

    it('handles error events', () => {
      render(<PerformanceMonitor />);

      // Get the event handler
      const errorHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'crm-error'
      )?.[1];

      errorHandler();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'CRM Performance: Error occurred',
        expect.objectContaining({
          errorCount: 1,
          timestamp: expect.any(String),
        })
      );
    });

    it('handles retry events', () => {
      render(<PerformanceMonitor />);

      // Get the event handler
      const retryHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'crm-retry'
      )?.[1];

      retryHandler();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'CRM Performance: Retry attempted',
        expect.objectContaining({
          retryCount: 1,
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('Visibility Change Handling', () => {
    it('logs when user leaves page', () => {
      render(<PerformanceMonitor />);

      // Get the visibility change handler
      const visibilityHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'visibilitychange'
      )?.[1];

      // Mock document.hidden = true
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true,
      });

      visibilityHandler();

      expect(mockConsoleLog).toHaveBeenCalledWith('CRM: User left page');
    });

    it('logs when user returns to page', () => {
      render(<PerformanceMonitor />);

      // Get the visibility change handler
      const visibilityHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'visibilitychange'
      )?.[1];

      // Mock document.hidden = false
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false,
      });

      visibilityHandler();

      expect(mockConsoleLog).toHaveBeenCalledWith('CRM: User returned to page');
    });
  });

  describe('Performance Observer', () => {
    it('sets up paint event observer', () => {
      render(<PerformanceMonitor />);

      expect(mockPerformanceObserver).toHaveBeenCalled();
      expect(mockPerformanceObserve).toHaveBeenCalledWith({
        entryTypes: ['paint'],
      });
    });

    it('handles paint events', () => {
      render(<PerformanceMonitor />);

      // Get the PerformanceObserver callback
      const observerCallback = mockPerformanceObserver.mock.calls[0][0];
      const mockEntries = [
        {
          name: 'first-paint',
          startTime: 100,
        },
      ];

      observerCallback({ getEntries: () => mockEntries });

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'CRM Performance: First Paint',
        expect.objectContaining({
          time: '100ms',
          timestamp: expect.any(String),
        })
      );
    });

    it('disconnects observer on unmount', () => {
      const { unmount } = render(<PerformanceMonitor />);

      unmount();

      expect(mockPerformanceDisconnect).toHaveBeenCalled();
    });
  });

  describe('Session Metrics', () => {
    it('logs final metrics on unmount', () => {
      const { unmount } = render(<PerformanceMonitor />);

      // Advance time to simulate session duration
      mockNow.mockReturnValue(1000010000); // 10 seconds later

      unmount();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'CRM Performance: Session ended',
        expect.objectContaining({
          totalSessionTime: '10000ms',
          errors: 0,
          retries: 0,
          iframeLoadTime: 'Not loaded',
          firstPaint: 'Not recorded',
          timestamp: expect.any(String),
        })
      );
    });

    it('includes error and retry counts in final metrics', () => {
      const { unmount } = render(<PerformanceMonitor />);

      // Trigger some events
      const errorHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'crm-error'
      )?.[1];
      const retryHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'crm-retry'
      )?.[1];

      errorHandler();
      errorHandler();
      retryHandler();

      mockNow.mockReturnValue(1000010000);
      unmount();

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'CRM Performance: Session ended',
        expect.objectContaining({
          errors: 2,
          retries: 1,
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('handles performance API unavailability gracefully', () => {
      // Mock performance API as undefined
      Object.defineProperty(window, 'performance', {
        writable: true,
        value: undefined,
      });

      expect(() => {
        render(<PerformanceMonitor />);
      }).not.toThrow();

      // Restore performance API
      Object.defineProperty(window, 'performance', {
        writable: true,
        value: {
          mark: mockPerformanceMark,
          measure: mockPerformanceMeasure,
          getEntriesByType: jest.fn(),
        },
      });
    });

    it('handles PerformanceObserver unavailability gracefully', () => {
      // Mock PerformanceObserver as undefined
      Object.defineProperty(window, 'PerformanceObserver', {
        writable: true,
        value: undefined,
      });

      expect(() => {
        render(<PerformanceMonitor />);
      }).not.toThrow();

      // Restore PerformanceObserver
      Object.defineProperty(window, 'PerformanceObserver', {
        writable: true,
        value: mockPerformanceObserver,
      });
    });
  });
});
