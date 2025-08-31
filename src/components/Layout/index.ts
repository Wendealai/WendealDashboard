// Export all layout components
export { default as MainLayout } from './MainLayout';
export { default as WhatsNewPanel } from './WhatsNewPanel';

// Export component Props interfaces and types
export type { MainLayoutProps } from './MainLayout';
export type { WhatsNewItem, WhatsNewPanelProps } from './WhatsNewPanel';

// Re-export components from other directories that are commonly used in layout
export {
  default as ExportButton,
  type ExportButtonProps,
} from '../common/ExportButton';
export {
  default as ThemeCustomizer,
  type ThemeCustomizerProps,
} from '../common/ThemeCustomizer';
