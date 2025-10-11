/**
 * Performance Monitor Component
 * Monitors and reports Docmost module performance metrics
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
        console.log('Docmost: User left page');
      } else {
        console.log('Docmost: User returned to page');
      }
    };

    // Monitor iframe loading performance
    const handleIframeLoad = () => {
      const loadTime = Date.now();
      metricsRef.current.iframeLoadEnd = loadTime;

      const totalLoadTime =
        loadTime - (metricsRef.current.iframeLoadStart || startTimeRef.current);

      console.log('Docmost Performance: Iframe loaded', {
        totalLoadTime: `${totalLoadTime}ms`,
        timestamp: new Date(loadTime).toISOString(),
      });

      // Report to performance monitoring (if available)
      if ('performance' in window && 'mark' in window.performance) {
        try {
          window.performance.mark('docmost-iframe-loaded');
          window.performance.measure(
            'docmost-iframe-load-time',
            'docmost-iframe-load-start',
            'docmost-iframe-loaded'
          );
        } catch (error) {
          console.warn(
            'Docmost Performance: Could not record performance marks:',
            error
          );
        }
      }
    };

    // Monitor errors
    const handleError = () => {
      metricsRef.current.errors++;
      console.warn('Docmost Performance: Error occurred', {
        errorCount: metricsRef.current.errors,
        timestamp: new Date().toISOString(),
      });
    };

    // Monitor retries
    const handleRetry = () => {
      metricsRef.current.retries++;
      console.log('Docmost Performance: Retry attempted', {
        retryCount: metricsRef.current.retries,
        timestamp: new Date().toISOString(),
      });
    };

    // Set up event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for custom events from DocmostContainer
    window.addEventListener('docmost-iframe-load-start', () => {
      metricsRef.current.iframeLoadStart = Date.now();
      if ('performance' in window && 'mark' in window.performance) {
        try {
          window.performance.mark('docmost-iframe-load-start');
        } catch (error) {
          console.warn(
            'Docmost Performance: Could not record start mark:',
            error
          );
        }
      }
    });

    window.addEventListener('docmost-iframe-loaded', handleIframeLoad);
    window.addEventListener('docmost-error', handleError);
    window.addEventListener('docmost-retry', handleRetry);

    // Record First Paint (approximate)
    if ('performance' in window && 'getEntriesByType' in window.performance) {
      const observer = new PerformanceObserver(list => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.name === 'first-paint') {
            metricsRef.current.firstPaint = entry.startTime;
            console.log('Docmost Performance: First Paint', {
              time: `${entry.startTime}ms`,
              timestamp: new Date().toISOString(),
            });
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['paint'] });
      } catch (error) {
        console.warn(
          'Docmost Performance: Could not observe paint events:',
          error
        );
      }

      return () => observer.disconnect();
    }

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('docmost-iframe-loaded', handleIframeLoad);
      window.removeEventListener('docmost-error', handleError);
      window.removeEventListener('docmost-retry', handleRetry);
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

      console.log('Docmost Performance: Session ended', finalMetrics);

      // In production, send metrics to monitoring service
      if (process.env.NODE_ENV === 'production') {
        // Example: Send to monitoring service
        // monitoringService.track('docmost-session-end', finalMetrics);
      }
    };
  }, []);

  // This component doesn't render anything visible
  return null;
};

export default PerformanceMonitor;
