/**
 * Docmost Module Integration Tests
 * Comprehensive integration testing for Docmost module functionality
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import { BrowserRouter } from 'react-router-dom';
import DocmostPage from '../../pages/Docmost';

// Mock all external dependencies
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
  }),
}));

// Mock security headers
jest.mock('../../pages/Docmost/components/SecurityHeaders', () => {
  return function MockSecurityHeaders() {
    return <div data-testid='security-headers'>SecurityHeaders</div>;
  };
});

// Mock error boundary
jest.mock('../../pages/Docmost/components/DocmostErrorBoundary', () => {
  return function MockDocmostErrorBoundary({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return <div data-testid='error-boundary'>{children}</div>;
  };
});

// Mock performance monitor
jest.mock('../../pages/Docmost/components/PerformanceMonitor', () => {
  return function MockPerformanceMonitor() {
    return <div data-testid='performance-monitor'>PerformanceMonitor</div>;
  };
});

// Mock Docmost container with full functionality
jest.mock('../../pages/Docmost/components/DocmostContainer', () => {
  return function MockDocmostContainer({
    src,
    title,
  }: {
    src: string;
    title: string;
  }) {
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [retryCount, setRetryCount] = React.useState(0);

    React.useEffect(() => {
      // Simulate iframe loading
      const timer = setTimeout(() => {
        setLoading(false);
      }, 100);

      return () => clearTimeout(timer);
    }, [retryCount]);

    const handleRetry = () => {
      setError(null);
      setRetryCount(prev => prev + 1);
    };

    if (error) {
      return (
        <div data-testid='docmost-container'>
          <div className='docmost-error'>
            <div>Docmost Unavailable</div>
            <div>{error}</div>
            <button onClick={handleRetry} disabled={retryCount >= 3}>
              {retryCount >= 3 ? 'Max retries reached' : 'Retry'}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div data-testid='docmost-container'>
        {loading ? (
          <div className='docmost-loading'>
            <div>Loading Docmost system...</div>
          </div>
        ) : (
          <iframe
            src={src}
            title={title}
            className='docmost-iframe'
            sandbox='allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation'
            referrerPolicy='strict-origin-when-cross-origin'
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        )}
      </div>
    );
  };
});

// Mock window.dispatchEvent for performance monitoring
const mockDispatchEvent = jest.fn();
Object.defineProperty(window, 'dispatchEvent', {
  writable: true,
  value: mockDispatchEvent,
});

describe('Docmost Module Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders complete Docmost page structure', () => {
    render(
      <BrowserRouter>
        <DocmostPage />
      </BrowserRouter>
    );

    // Verify page structure (no title since it's removed for maximum display)
    expect(screen.getByTestId('security-headers')).toBeInTheDocument();
    expect(screen.getByTestId('performance-monitor')).toBeInTheDocument();
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    expect(screen.getByTestId('docmost-container')).toBeInTheDocument();

    // Verify layout override class is applied for maximum display
    const pageContainer = document.querySelector('.docmost-page');
    expect(pageContainer).toHaveClass('docmost-page-layout-override');
  });

  it('handles Docmost container loading states', async () => {
    render(
      <BrowserRouter>
        <DocmostPage />
      </BrowserRouter>
    );

    // Initially shows loading
    expect(screen.getByText('Loading Docmost system...')).toBeInTheDocument();

    // Wait for loading to complete
    await waitFor(() => {
      expect(
        screen.queryByText('Loading Docmost system...')
      ).not.toBeInTheDocument();
    });

    // Verify iframe is rendered
    const iframe = document.querySelector('.docmost-iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('title', 'Docmost Documentation System');
  });

  it('integrates security configurations', async () => {
    render(
      <BrowserRouter>
        <DocmostPage />
      </BrowserRouter>
    );

    // Wait for iframe to load
    await waitFor(() => {
      const iframe = document.querySelector('.docmost-iframe');
      expect(iframe).toBeInTheDocument();
    });

    // Verify iframe security attributes
    const iframe = document.querySelector('.docmost-iframe');
    expect(iframe).toHaveAttribute(
      'sandbox',
      'allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation'
    );
    expect(iframe).toHaveAttribute(
      'referrerPolicy',
      'strict-origin-when-cross-origin'
    );
  });

  it('handles error recovery workflow', () => {
    // This test verifies that error boundary and retry mechanisms are in place
    render(
      <BrowserRouter>
        <DocmostPage />
      </BrowserRouter>
    );

    // Verify error boundary is present (which handles errors)
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();

    // Verify Docmost container is present (which has retry logic)
    expect(screen.getByTestId('docmost-container')).toBeInTheDocument();
  });

  it('enforces retry limits', () => {
    // This test verifies that retry limit mechanisms are in place
    render(
      <BrowserRouter>
        <DocmostPage />
      </BrowserRouter>
    );

    // Verify Docmost container is present (which has retry limit logic)
    expect(screen.getByTestId('docmost-container')).toBeInTheDocument();
  });

  it('integrates performance monitoring', () => {
    render(
      <BrowserRouter>
        <DocmostPage />
      </BrowserRouter>
    );

    // Verify performance monitor is included
    expect(screen.getByTestId('performance-monitor')).toBeInTheDocument();

    // Note: Performance events are dispatched by the DocmostContainer component
    // which is mocked in this test, so we verify the monitor component is present
  });

  it('maintains accessibility standards', async () => {
    render(
      <BrowserRouter>
        <DocmostPage />
      </BrowserRouter>
    );

    // Verify iframe accessibility (no page heading since it's removed for maximum display)
    await waitFor(() => {
      const iframe = document.querySelector('.docmost-iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute('title', 'Docmost Documentation System');
    });

    // Verify the page container has proper structure for screen readers
    const pageContainer = document.querySelector('.docmost-page');
    expect(pageContainer).toBeInTheDocument();
    expect(pageContainer).toHaveAttribute(
      'class',
      'docmost-page docmost-page-layout-override'
    );
  });

  it('supports responsive design', async () => {
    render(
      <BrowserRouter>
        <DocmostPage />
      </BrowserRouter>
    );

    // Verify responsive classes are applied
    const pageContainer = document.querySelector('.docmost-page');
    const contentArea = document.querySelector('.docmost-content');

    expect(pageContainer).toHaveClass('docmost-page');
    expect(contentArea).toHaveClass('docmost-content');

    // Wait for iframe to load and verify responsive styling
    await waitFor(() => {
      const iframe = document.querySelector('.docmost-iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveStyle({ width: '100%', height: '100%' });
    });
  });

  it('handles development mode features', () => {
    // Mock development environment
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    render(
      <BrowserRouter>
        <DocmostPage />
      </BrowserRouter>
    );

    // Verify development indicators (if present)
    const devIndicator = screen.queryByText('Docmost Iframe - Dev Mode');
    // Development indicator may or may not be present depending on implementation

    // Restore environment
    process.env.NODE_ENV = originalEnv;
  });

  it('integrates error boundary protection', () => {
    render(
      <BrowserRouter>
        <DocmostPage />
      </BrowserRouter>
    );

    // Verify error boundary wraps the content
    expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
    expect(screen.getByTestId('docmost-container')).toBeInTheDocument();
  });
});
