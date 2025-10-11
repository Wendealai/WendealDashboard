/**
 * Performance Monitor Component
 * Monitors and reports CRM module performance metrics
 */

import { useEffect, useRef } from 'react';

/**
 * Performance Monitor Component
 * Tracks loading times, iframe performance, and user interactions
 */
const PerformanceMonitor: React.FC = () => {
  const startTimeRef = useRef<number>(Date.now());
  const metricsRef = useRef<{
    loadStart: number;
    loadEnd?: number;
    firstPaint?: number;
    iframeLoadStart?: number;
    iframeLoadEnd?: number;
    errors: number;
    retries: number;
  }>({
    loadStart: Date.now(),
    errors: 0,
    retries: 0,
  });

  useEffect(() => {
    // Record component mount time
    const mountTime = Date.now();
    metricsRef.current.loadStart = mountTime;

    // Monitor page visibility changes (user engagement)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('CRM: User left page');
      } else {
        console.log('CRM: User returned to page');
      }
    };

    // Monitor iframe loading performance
    const handleIframeLoad = () => {
      const loadTime = Date.now();
      metricsRef.current.iframeLoadEnd = loadTime;

      const totalLoadTime =
        loadTime - (metricsRef.current.iframeLoadStart || startTimeRef.current);

      console.log('CRM Performance: Iframe loaded', {
        totalLoadTime: `${totalLoadTime}ms`,
        timestamp: new Date(loadTime).toISOString(),
      });

      // Report to performance monitoring (if available)
      if ('performance' in window && 'mark' in window.performance) {
        try {
          window.performance.mark('crm-iframe-loaded');
          window.performance.measure(
            'crm-iframe-load-time',
            'crm-iframe-load-start',
            'crm-iframe-loaded'
          );
        } catch (error) {
          console.warn(
            'CRM Performance: Could not record performance marks:',
            error
          );
        }
      }
    };

    // Monitor errors
    const handleError = () => {
      metricsRef.current.errors++;
      console.warn('CRM Performance: Error occurred', {
        errorCount: metricsRef.current.errors,
        timestamp: new Date().toISOString(),
      });
    };

    // Monitor retries
    const handleRetry = () => {
      metricsRef.current.retries++;
      console.log('CRM Performance: Retry attempted', {
        retryCount: metricsRef.current.retries,
        timestamp: new Date().toISOString(),
      });
    };

    // Set up event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for custom events from CRMContainer
    window.addEventListener('crm-iframe-load-start', () => {
      metricsRef.current.iframeLoadStart = Date.now();
      if ('performance' in window && 'mark' in window.performance) {
        try {
          window.performance.mark('crm-iframe-load-start');
        } catch (error) {
          console.warn('CRM Performance: Could not record start mark:', error);
        }
      }
    });

    window.addEventListener('crm-iframe-loaded', handleIframeLoad);
    window.addEventListener('crm-error', handleError);
    window.addEventListener('crm-retry', handleRetry);

    // Record First Paint (approximate)
    if ('performance' in window && 'getEntriesByType' in window.performance) {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.name === 'first-paint') {
            metricsRef.current.firstPaint = entry.startTime;
            console.log('CRM Performance: First Paint', {
              time: `${entry.startTime}ms`,
              timestamp: new Date().toISOString(),
            });
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['paint'] });
      } catch (error) {
        console.warn('CRM Performance: Could not observe paint events:', error);
      }

      return () => observer.disconnect();
    }

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('crm-iframe-loaded', handleIframeLoad);
      window.removeEventListener('crm-error', handleError);
      window.removeEventListener('crm-retry', handleRetry);
    };
  }, []);

  // Report final metrics on unmount
  useEffect(() => {
    return () => {
      const endTime = Date.now();
      const totalTime = endTime - startTimeRef.current;

      const finalMetrics = {
        totalSessionTime: `${totalTime}ms`,
        errors: metricsRef.current.errors,
        retries: metricsRef.current.retries,
        iframeLoadTime:
          metricsRef.current.iframeLoadEnd && metricsRef.current.iframeLoadStart
            ? `${metricsRef.current.iframeLoadEnd - metricsRef.current.iframeLoadStart}ms`
            : 'Not loaded',
        firstPaint: metricsRef.current.firstPaint
          ? `${metricsRef.current.firstPaint}ms`
          : 'Not recorded',
        timestamp: new Date(endTime).toISOString(),
      };

      console.log('CRM Performance: Session ended', finalMetrics);

      // In production, send metrics to monitoring service
      if (process.env.NODE_ENV === 'production') {
        // Example: Send to monitoring service
        // monitoringService.track('crm-session-end', finalMetrics);
      }
    };
  }, []);

  // This component doesn't render anything visible
  return null;
};

export default PerformanceMonitor;
