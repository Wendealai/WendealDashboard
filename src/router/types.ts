import type { ComponentType, LazyExoticComponent } from 'react';

export interface RouteConfig {
  path: string;
  element: ComponentType<any> | LazyExoticComponent<ComponentType<any>>;
  children?: RouteConfig[];
  index?: boolean;
  caseSensitive?: boolean;
  id?: string;
  loader?: any;
  action?: any;
  errorElement?: ComponentType<any>;
  shouldRevalidate?: any;
  handle?: any;
  lazy?: any;
  meta?: {
    title?: string;
    requiresAuth?: boolean;
    roles?: string[];
    icon?: string;
    hideInMenu?: boolean;
  };
}

export interface NavigationItem {
  key: string;
  label: string;
  path?: string;
  icon?: string;
  children?: NavigationItem[];
  requiresAuth?: boolean;
  roles?: string[];
}
