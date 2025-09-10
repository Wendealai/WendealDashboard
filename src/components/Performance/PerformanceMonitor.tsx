import React, { useEffect, useState } from 'react';
import { Card, Statistic, Row, Col, Progress, Alert } from 'antd';
import {
  ClockCircleOutlined,
  ThunderboltOutlined,
  EyeOutlined,
} from '@ant-design/icons';

export interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  memoryUsage?: {
    used: number;
    total: number;
  };
}

export interface PerformanceMonitorProps {
  showDetails?: boolean;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  showDetails = false,
  onMetricsUpdate,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fcp: 0,
    lcp: 0,
    fid: 0,
    cls: 0,
    ttfb: 0,
  });
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // 检查浏览器支持
    if (!('performance' in window) || !('PerformanceObserver' in window)) {
      setIsSupported(false);
      return;
    }

    const measurePerformance = () => {
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');

      const newMetrics: PerformanceMetrics = {
        fcp: 0,
        lcp: 0,
        fid: 0,
        cls: 0,
        ttfb: navigation
          ? navigation.responseStart - navigation.requestStart
          : 0,
      };

      // First Contentful Paint
      const fcpEntry = paint.find(
        entry => entry.name === 'first-contentful-paint'
      );
      if (fcpEntry) {
        newMetrics.fcp = fcpEntry.startTime;
      }

      // Memory usage (if supported)
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        newMetrics.memoryUsage = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
        };
      }

      setMetrics(newMetrics);
      onMetricsUpdate?.(newMetrics);
    };

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver(list => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      setMetrics(prev => ({ ...prev, lcp: lastEntry.startTime }));
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    const fidObserver = new PerformanceObserver(list => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        setMetrics(prev => ({
          ...prev,
          fid: entry.processingStart - entry.startTime,
        }));
      });
    });
    fidObserver.observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    const clsObserver = new PerformanceObserver(list => {
      let clsValue = 0;
      list.getEntries().forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      setMetrics(prev => ({ ...prev, cls: clsValue }));
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // 初始测量
    measurePerformance();

    // 定期更新内存使用情况
    const memoryInterval = setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: {
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
          },
        }));
      }
    }, 5000);

    return () => {
      lcpObserver.disconnect();
      fidObserver.disconnect();
      clsObserver.disconnect();
      clearInterval(memoryInterval);
    };
  }, [onMetricsUpdate]);

  const getPerformanceScore = (
    metric: keyof PerformanceMetrics,
    value: number
  ): number => {
    switch (metric) {
      case 'fcp':
        return value < 1800 ? 100 : value < 3000 ? 75 : value < 4200 ? 50 : 25;
      case 'lcp':
        return value < 2500 ? 100 : value < 4000 ? 75 : value < 5500 ? 50 : 25;
      case 'fid':
        return value < 100 ? 100 : value < 300 ? 75 : value < 500 ? 50 : 25;
      case 'cls':
        return value < 0.1 ? 100 : value < 0.25 ? 75 : value < 0.4 ? 50 : 25;
      case 'ttfb':
        return value < 800 ? 100 : value < 1800 ? 75 : value < 2500 ? 50 : 25;
      default:
        return 100;
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#52c41a';
    if (score >= 50) return '#faad14';
    return '#ff4d4f';
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isSupported) {
    return (
      <Alert
        message='性能监控不可用'
        description='您的浏览器不支持性能监控API'
        type='warning'
        showIcon
      />
    );
  }

  if (!showDetails) {
    return null;
  }

  return (
    <Card title='性能监控' size='small'>
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card size='small'>
            <Statistic
              title='首次内容绘制 (FCP)'
              value={metrics.fcp}
              suffix='ms'
              prefix={<ClockCircleOutlined />}
              valueStyle={{
                color: getScoreColor(getPerformanceScore('fcp', metrics.fcp)),
              }}
            />
            <Progress
              percent={getPerformanceScore('fcp', metrics.fcp)}
              strokeColor={getScoreColor(
                getPerformanceScore('fcp', metrics.fcp)
              )}
              size='small'
              showInfo={false}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size='small'>
            <Statistic
              title='最大内容绘制 (LCP)'
              value={metrics.lcp}
              suffix='ms'
              prefix={<EyeOutlined />}
              valueStyle={{
                color: getScoreColor(getPerformanceScore('lcp', metrics.lcp)),
              }}
            />
            <Progress
              percent={getPerformanceScore('lcp', metrics.lcp)}
              strokeColor={getScoreColor(
                getPerformanceScore('lcp', metrics.lcp)
              )}
              size='small'
              showInfo={false}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size='small'>
            <Statistic
              title='首次输入延迟 (FID)'
              value={metrics.fid}
              suffix='ms'
              prefix={<ThunderboltOutlined />}
              valueStyle={{
                color: getScoreColor(getPerformanceScore('fid', metrics.fid)),
              }}
            />
            <Progress
              percent={getPerformanceScore('fid', metrics.fid)}
              strokeColor={getScoreColor(
                getPerformanceScore('fid', metrics.fid)
              )}
              size='small'
              showInfo={false}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size='small'>
            <Statistic
              title='累积布局偏移 (CLS)'
              value={metrics.cls}
              precision={3}
              valueStyle={{
                color: getScoreColor(getPerformanceScore('cls', metrics.cls)),
              }}
            />
            <Progress
              percent={getPerformanceScore('cls', metrics.cls)}
              strokeColor={getScoreColor(
                getPerformanceScore('cls', metrics.cls)
              )}
              size='small'
              showInfo={false}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size='small'>
            <Statistic
              title='首字节时间 (TTFB)'
              value={metrics.ttfb}
              suffix='ms'
              valueStyle={{
                color: getScoreColor(getPerformanceScore('ttfb', metrics.ttfb)),
              }}
            />
            <Progress
              percent={getPerformanceScore('ttfb', metrics.ttfb)}
              strokeColor={getScoreColor(
                getPerformanceScore('ttfb', metrics.ttfb)
              )}
              size='small'
              showInfo={false}
            />
          </Card>
        </Col>
        {metrics.memoryUsage && (
          <Col span={8}>
            <Card size='small'>
              <Statistic
                title='内存使用'
                value={formatBytes(metrics.memoryUsage.used)}
                suffix={`/ ${formatBytes(metrics.memoryUsage.total)}`}
              />
              <Progress
                percent={
                  (metrics.memoryUsage.used / metrics.memoryUsage.total) * 100
                }
                strokeColor={
                  metrics.memoryUsage.used / metrics.memoryUsage.total > 0.8
                    ? '#ff4d4f'
                    : '#52c41a'
                }
                size='small'
              />
            </Card>
          </Col>
        )}
      </Row>
    </Card>
  );
};

export { PerformanceMonitor as default };
export { PerformanceMonitor };
export type { PerformanceMetrics };
