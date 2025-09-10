import React, { Suspense, type ComponentType } from 'react';
import { Spin } from 'antd';
import type { LazyExoticComponent } from 'react';

// 默认加载组件
const DefaultFallback: React.FC = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '200px',
      width: '100%',
    }}
  >
    <Spin size='large'>
      <div style={{ padding: '20px', textAlign: 'center' }}>加载中...</div>
    </Spin>
  </div>
);

// 页面级别的加载组件
const PageFallback: React.FC = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      width: '100%',
    }}
  >
    <Spin size='large'>
      <div style={{ padding: '20px', textAlign: 'center' }}>页面加载中...</div>
    </Spin>
  </div>
);

// 组件级别的加载组件
const ComponentFallback: React.FC = () => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100px',
      width: '100%',
    }}
  >
    <Spin>
      <div style={{ padding: '20px', textAlign: 'center' }}>组件加载中...</div>
    </Spin>
  </div>
);

interface LazyLoadOptions {
  fallback?: React.ComponentType;
  errorBoundary?: boolean;
  retryCount?: number;
  timeout?: number;
}

// 错误边界组件
class LazyLoadErrorBoundary extends React.Component<
  { children: React.ReactNode; onRetry?: () => void },
  { hasError: boolean; retryCount: number }
> {
  constructor(props: { children: React.ReactNode; onRetry?: () => void }) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LazyLoad Error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      retryCount: this.state.retryCount + 1,
    });
    this.props.onRetry?.();
  };

  override render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px',
            textAlign: 'center',
            padding: '20px',
          }}
        >
          <h3>组件加载失败</h3>
          <p>请检查网络连接或稍后重试</p>
          <button
            onClick={this.handleRetry}
            style={{
              padding: '8px 16px',
              backgroundColor: '#1890ff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            重试 ({this.state.retryCount})
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// 懒加载高阶组件
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): LazyExoticComponent<T> {
  const {
    fallback = DefaultFallback,
    errorBoundary = true,
    retryCount = 3,
    timeout = 10000,
  } = options;

  // 创建带重试机制的导入函数
  const importWithRetry = async (): Promise<{ default: T }> => {
    let lastError: Error;

    for (let i = 0; i < retryCount; i++) {
      try {
        // 添加超时控制
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Import timeout')), timeout);
        });

        const result = await Promise.race([importFunc(), timeoutPromise]);

        return result;
      } catch (error) {
        lastError = error as Error;
        console.warn(`Import attempt ${i + 1} failed:`, error);

        // 如果不是最后一次尝试，等待一段时间后重试
        if (i < retryCount - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }

    throw lastError!;
  };

  const LazyComponent = React.lazy(importWithRetry);

  // 返回包装后的组件
  const WrappedComponent = React.forwardRef<any, any>((props, ref) => {
    const FallbackComponent = fallback;

    const content = (
      <Suspense fallback={<FallbackComponent />}>
        <LazyComponent {...(props as any)} ref={ref} />
      </Suspense>
    );

    if (errorBoundary) {
      return <LazyLoadErrorBoundary>{content}</LazyLoadErrorBoundary>;
    }

    return content;
  });

  // 保持组件名称
  WrappedComponent.displayName = `LazyLoad(${(LazyComponent as any).displayName || 'Component'})`;

  return WrappedComponent as unknown as LazyExoticComponent<T>;
}

// 页面级别懒加载
export function lazyLoadPage<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazyLoad(importFunc, {
    fallback: PageFallback,
    errorBoundary: true,
    retryCount: 3,
    timeout: 15000,
  });
}

// 组件级别懒加载
export function lazyLoadComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazyLoad(importFunc, {
    fallback: ComponentFallback,
    errorBoundary: true,
    retryCount: 2,
    timeout: 8000,
  });
}

// 预加载函数
export function preloadComponent(
  importFunc: () => Promise<{ default: ComponentType<any> }>
): Promise<void> {
  return importFunc()
    .then(() => {
      console.log('Component preloaded successfully');
    })
    .catch(error => {
      console.warn('Component preload failed:', error);
    });
}

// 批量预加载
export function preloadComponents(
  importFuncs: Array<() => Promise<{ default: ComponentType<any> }>>
): Promise<void[]> {
  return Promise.allSettled(
    importFuncs.map(importFunc => preloadComponent(importFunc))
  ).then(results => {
    const failed = results.filter(result => result.status === 'rejected');
    if (failed.length > 0) {
      console.warn(`${failed.length} components failed to preload`);
    }
    return results.map(() => undefined);
  });
}

// 路由级别预加载
export function preloadRoute(routePath: string): void {
  // 这里可以根据路由路径预加载对应的组件
  // 实际实现需要根据路由配置来确定
  console.log(`Preloading route: ${routePath}`);
}

export {
  DefaultFallback,
  PageFallback,
  ComponentFallback,
  LazyLoadErrorBoundary,
};
