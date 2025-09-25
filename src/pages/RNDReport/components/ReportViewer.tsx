/**
 * ReportViewer Component
 * HTML report viewer with reading progress tracking and visual fidelity preservation
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Modal,
  Button,
  Progress,
  Space,
  Typography,
  Tooltip,
  Slider,
  Tag,
  Divider,
  Alert,
  Spin,
} from 'antd';
import {
  FullscreenOutlined,
  FullscreenExitOutlined,
  SettingOutlined,
  CloseOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  UserOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useMessage } from '@/hooks/useMessage';

// Import iframe-resizer
// Removed iframe-resizer due to import issues

// Import types
import type { Report, ReadingProgress } from '../../../types/rndReport';

// Import service
import { RNDReportService } from '../../../services/rndReportService';

// Import utilities
import { FileProcessingUtils, DateUtils } from '../../../utils/rndReportUtils';

const { Text, Title } = Typography;

/**
 * Generate a simple hash for content integrity checking
 */
const generateContentHash = async (content: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 16);
};

/**
 * Validate content integrity with multiple checks
 */
const validateContentIntegrity = (
  content: string
): { isValid: boolean; issues: string[] } => {
  const issues: string[] = [];

  // Check 1: Basic length validation
  if (content.length < 50) {
    issues.push('Content is too short');
  }

  // Check 2: Encoding validation
  if (content.includes('�') || content.includes('���')) {
    issues.push('Content contains encoding errors');
  }

  // Check 3: HTML structure validation
  const hasHtmlTag = content.includes('<html') || content.includes('<HTML');
  const hasHeadTag = content.includes('<head') || content.includes('<HEAD');
  const hasBodyTag = content.includes('<body') || content.includes('<BODY');

  if (!hasHtmlTag && !hasHeadTag && !hasBodyTag) {
    issues.push('Content lacks basic HTML structure');
  }

  // Check 4: Check for suspicious patterns
  if (
    content.includes('display: none') &&
    content.includes('position: absolute')
  ) {
    issues.push('Content may contain hidden malicious elements');
  }

  // Check 5: Check for broken references
  const scriptCount = (content.match(/<script/g) || []).length;
  const scriptCloseCount = (content.match(/<\/script>/g) || []).length;
  if (scriptCount !== scriptCloseCount) {
    issues.push('Unclosed script tags detected');
  }

  return {
    isValid: issues.length === 0,
    issues,
  };
};

/**
 * ReportViewer Props Interface
 */
export interface ReportViewerProps {
  /** Report to display */
  report: Report;
  /** Whether viewer is open */
  isOpen: boolean;
  /** Whether viewer is in fullscreen mode */
  isFullscreen: boolean;
  /** Whether settings panel is shown */
  showSettings: boolean;
  /** Callback when viewer is closed */
  onClose: () => void;
  /** Callback when fullscreen mode is toggled */
  onFullscreenToggle: () => void;
  /** Callback when settings panel is toggled */
  onSettingsToggle: () => void;
  /** Callback when reading progress is updated */
  onProgressUpdate: (progress: number) => void;
  /** Custom class name */
  className?: string;
}

/**
 * ReportViewer Component
 * Comprehensive HTML report viewer with progress tracking
 */
const ReportViewer: React.FC<ReportViewerProps> = ({
  report,
  isOpen,
  isFullscreen,
  showSettings,
  onClose,
  onFullscreenToggle,
  onSettingsToggle,
  onProgressUpdate,
  className,
}) => {
  const { t } = useTranslation();
  const message = useMessage();

  // Refs
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const serviceRef = useRef<RNDReportService | null>(null);

  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readingProgress, setReadingProgress] =
    useState<ReadingProgress | null>(null);
  const [currentScrollTop, setCurrentScrollTop] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [serviceReady, setServiceReady] = useState(false);

  /**
   * Load report content with improved caching and consistency checks
   */
  const loadReportContent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 开始加载报告内容:', report.name, report.id);

      // Initialize service if not ready
      if (!serviceRef.current) {
        const service = new RNDReportService();
        await service.initialize({
          maxFileSize: 50 * 1024 * 1024,
          allowedFileTypes: ['text/html', 'application/xhtml+xml'],
          storagePath: 'rnd-reports',
          autoExtractMetadata: true,
          enableReadingProgress: true,
          enableBookmarks: true,
          enableSearch: true,
          enableCategories: true,
          defaultViewMode: 'list',
          itemsPerPage: 20,
          enableOfflineMode: true,
        });
        serviceRef.current = service;
        setServiceReady(true);
      }

      // Load HTML content from localStorage
      let content = localStorage.getItem(`rnd-report-content-${report.id}`);
      console.log('📦 从localStorage获取原始内容:', {
        key: `rnd-report-content-${report.id}`,
        hasContent: !!content,
        contentLength: content?.length || 0,
        contentPreview: content?.substring(0, 200) + '...' || 'null',
      });

      if (!content) {
        console.warn('⚠️ Report content not found, attempting recovery...');

        // Try to recover content
        const recovered = await attemptContentRecovery(report);
        if (recovered) {
          console.log('✅ Content recovered successfully');
          // Reload content after recovery
          content = localStorage.getItem(`rnd-report-content-${report.id}`);
          if (!content) {
            throw new Error('Content recovery failed - no content available');
          }
        } else {
          throw new Error('Report content not found and recovery failed');
        }
      }

      // Generate content hash for consistency checking
      const contentHash = await generateContentHash(content);
      const storedHash = localStorage.getItem(`rnd-report-hash-${report.id}`);

      // Check if content has changed
      const contentChanged = storedHash && storedHash !== contentHash;

      // Check for cached processed content
      const cacheKey = `rnd-report-processed-${report.id}`;
      const cachedContent = localStorage.getItem(cacheKey);
      const cacheMetadataKey = `rnd-report-cache-metadata-${report.id}`;
      const cacheMetadata = JSON.parse(
        localStorage.getItem(cacheMetadataKey) || '{}'
      );

      // Determine if we need to re-process content
      const needsReprocessing =
        !cachedContent ||
        contentChanged ||
        !cacheMetadata.processedAt ||
        !cacheMetadata.processingVersion ||
        cacheMetadata.processingVersion !== '2.0' || // Version check for consistency
        Date.now() - cacheMetadata.processedAt > 24 * 60 * 60 * 1000; // 24 hours

      let processedContent = cachedContent;

      if (needsReprocessing) {
        console.log('🔄 需要重新处理内容:', {
          noCache: !cachedContent,
          contentChanged,
          cacheExpired:
            !cacheMetadata.processedAt ||
            Date.now() - cacheMetadata.processedAt > 24 * 60 * 60 * 1000,
        });

        // Process content with consistent logic
        processedContent = await processContentConsistently(content, report);

        // Cache the processed content
        if (processedContent) {
          localStorage.setItem(cacheKey, processedContent);
        }

        // Store cache metadata
        const metadata = {
          processedAt: Date.now(),
          contentHash,
          processingVersion: '2.0', // Version for future compatibility
        };
        localStorage.setItem(cacheMetadataKey, JSON.stringify(metadata));

        console.log('💾 Processed content cached with metadata');
      } else {
        console.log('📋 使用缓存的处理后内容');
      }

      // Update content hash if changed
      if (contentChanged || !storedHash) {
        localStorage.setItem(`rnd-report-hash-${report.id}`, contentHash);
        console.log('🔐 Updated content hash');
      }

      if (processedContent) {
        setHtmlContent(processedContent);
        console.log('✅ HTML content loaded successfully');
      } else {
        throw new Error('Failed to process content - result is null');
      }

      // Load reading progress from service
      if (serviceRef.current) {
        try {
          const progress = await serviceRef.current.getReadingProgress(
            report.id
          );
          setReadingProgress(progress);
          setCurrentScrollTop(progress.currentPosition || 0);
          console.log('📖 Loaded reading progress:', progress);
        } catch (progressError) {
          console.warn('Failed to load reading progress:', progressError);
          const savedProgress = localStorage.getItem(
            `rnd-report-progress-${report.id}`
          );
          if (savedProgress) {
            const progress = JSON.parse(savedProgress);
            setReadingProgress(progress);
            setCurrentScrollTop(progress.currentPosition || 0);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load report content:', err);
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [report.id]);

  /**
   * Process content consistently to ensure same input produces same output
   */
  const processContentConsistently = async (
    content: string,
    report: Report
  ): Promise<string> => {
    console.log('🔧 Processing content consistently for report:', report.id);

    // Step 1: Validate content integrity first
    const integrityCheck = validateContentIntegrity(content);
    if (!integrityCheck.isValid) {
      console.warn(
        '⚠️ Content integrity issues detected:',
        integrityCheck.issues
      );
      // Continue processing but log the issues
    }

    // Step 2: Clean encoding errors
    let processedContent = content.replace(/�+/g, '');

    // Step 3: Check for very short content that might be corrupted
    if (processedContent.length < 50) {
      console.warn('🚨 HTML content appears to be too short or corrupted');
      processedContent = `<html><head><title>${report.name}</title></head><body><div style="padding: 20px; color: #666; text-align: center;">Content appears to be corrupted or too short. Please re-upload the report.</div></body></html>`;
    }

    // Step 4: Basic HTML structure validation and fixing
    const hasHtmlTag =
      processedContent.includes('<html') || processedContent.includes('<HTML');
    const hasBodyTag =
      processedContent.includes('<body') || processedContent.includes('<BODY');

    // Ensure basic HTML structure
    if (!hasHtmlTag) {
      processedContent = `<html><head><title>${report.name}</title></head><body>${processedContent}</body></html>`;
      console.log('🔧 Added HTML structure wrapper');
    } else if (!hasBodyTag) {
      processedContent = processedContent
        .replace('</head>', '</head><body>')
        .replace('</html>', '</body></html>');
      console.log('🔧 Added body wrapper');
    }

    // Step 5: Sanitize HTML content for security
    const sanitizedContent =
      FileProcessingUtils.sanitizeHtmlContent(processedContent);
    console.log('🧹 Content sanitized, length:', sanitizedContent.length);

    // Step 6: Create complete HTML document with consistent styling
    const fullHtml = createHtmlDocument(sanitizedContent);

    if (!fullHtml || fullHtml.length === 0) {
      throw new Error('Failed to create HTML document');
    }

    // Step 7: Final validation
    const finalIntegrityCheck = validateContentIntegrity(fullHtml);
    if (!finalIntegrityCheck.isValid) {
      console.error(
        '❌ Final content validation failed:',
        finalIntegrityCheck.issues
      );
      // Still return the content but log the error
    } else {
      console.log('✅ Content processing completed successfully');
    }

    return fullHtml;
  };

  /**
   * Create complete HTML document with minimal styling
   */
  const createHtmlDocument = (content: string): string => {
    const baseStyles = `
      <style>
        /* Reset and base styles */
        * {
          box-sizing: border-box;
        }

        html, body {
          margin: 0;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          background: white;
          color: #333;
        }

        /* Ensure content is visible */
        body {
          min-height: 100px;
        }

        /* Fix common visibility issues */
        [style*="display: none"] {
          display: block !important;
        }

        [style*="visibility: hidden"] {
          visibility: visible !important;
        }

        [style*="opacity: 0"] {
          opacity: 1 !important;
        }

        /* Fix positioning issues */
        [style*="position: fixed"][style*="top: -9999px"],
        [style*="position: absolute"][style*="left: -9999px"] {
          position: static !important;
        }

        [style*="margin-left: -9999px"],
        [style*="margin-top: -9999px"] {
          margin: 0 !important;
        }

        /* Ensure images are responsive */
        img {
          max-width: 100%;
          height: auto;
        }

        /* Basic table styling */
        table {
          border-collapse: collapse;
          width: 100%;
        }

        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }

        th {
          background-color: #f5f5f5;
        }

        /* Fix for hidden elements */
        [hidden] {
          display: block !important;
        }
      </style>
    `;

    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${report.name}</title>
          ${baseStyles}
        </head>
        <body>
          ${content}
        </body>
      </html>
    `;
  };

  /**
   * Debug localStorage content
   */
  const debugLocalStorage = useCallback(() => {
    console.log('🔍 Debugging localStorage for report:', report.id);
    const keys = Object.keys(localStorage).filter(
      key => key.includes('rnd-report') && key.includes(report.id)
    );

    keys.forEach(key => {
      const value = localStorage.getItem(key);
      console.log(`📦 ${key}:`, {
        length: value?.length || 0,
        preview: value?.substring(0, 200) + '...' || 'null',
      });

      // Special analysis for HTML content
      if (key.includes('content') && value) {
        console.log('🔍 HTML Content Analysis:');
        console.log(
          '- Is HTML:',
          value.includes('<html') || value.includes('<HTML')
        );
        console.log(
          '- Has head:',
          value.includes('<head') || value.includes('<HEAD')
        );
        console.log(
          '- Has body:',
          value.includes('<body') || value.includes('<BODY')
        );
        console.log(
          '- Has DOCTYPE:',
          value.includes('<!DOCTYPE') || value.includes('<!doctype')
        );
        console.log('- Has scripts:', value.includes('<script'));
        console.log('- Has styles:', value.includes('<style'));
        console.log(
          '- Has external CSS:',
          value.includes('<link') && value.includes('stylesheet')
        );
        console.log(
          '- Content structure:',
          value.includes('<html') &&
            value.includes('<head') &&
            value.includes('<body')
            ? 'Complete'
            : 'Fragment'
        );
      }
    });
  }, [report.id]);

  /**
   * Attempt to recover corrupted or missing content
   */
  const attemptContentRecovery = useCallback(
    async (report: Report): Promise<boolean> => {
      console.log('🔄 Attempting content recovery for report:', report.id);

      try {
        // Check if we have any backup or alternative content
        const backupKeys = Object.keys(localStorage).filter(
          key =>
            key.includes(report.id) &&
            (key.includes('backup') || key.includes('temp'))
        );

        if (backupKeys.length > 0) {
          console.log('📋 Found backup content, attempting recovery...');

          for (const backupKey of backupKeys) {
            const backupContent = localStorage.getItem(backupKey);
            if (backupContent && backupContent.length > 50) {
              // Validate the backup content
              const integrityCheck = validateContentIntegrity(backupContent);
              if (integrityCheck.isValid) {
                // Restore from backup
                localStorage.setItem(
                  `rnd-report-content-${report.id}`,
                  backupContent
                );

                // Generate new hash
                const contentHash = await generateContentHash(backupContent);
                localStorage.setItem(
                  `rnd-report-hash-${report.id}`,
                  contentHash
                );

                console.log('✅ Content recovered from backup successfully');
                return true;
              }
            }
          }
        }

        // Try to reconstruct content from processed cache if available
        const processedKey = `rnd-report-processed-${report.id}`;
        const processedContent = localStorage.getItem(processedKey);

        if (processedContent) {
          console.log('📝 Attempting recovery from processed content...');

          // Extract content from the processed HTML
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = processedContent;

          // Remove our wrapper styles and scripts
          const styleTags = tempDiv.querySelectorAll('style');
          styleTags.forEach(style => {
            if (
              style.textContent &&
              style.textContent.includes('box-sizing: border-box')
            ) {
              style.remove();
            }
          });

          const scripts = tempDiv.querySelectorAll('script');
          scripts.forEach(script => script.remove());

          const recoveredContent = tempDiv.innerHTML;

          if (recoveredContent && recoveredContent.length > 50) {
            const integrityCheck = validateContentIntegrity(recoveredContent);
            if (integrityCheck.isValid) {
              localStorage.setItem(
                `rnd-report-content-${report.id}`,
                recoveredContent
              );

              const contentHash = await generateContentHash(recoveredContent);
              localStorage.setItem(`rnd-report-hash-${report.id}`, contentHash);

              console.log(
                '✅ Content recovered from processed cache successfully'
              );
              return true;
            }
          }
        }

        console.warn(
          '⚠️ Content recovery failed - no valid backup or processed content found'
        );
        return false;
      } catch (error) {
        console.error('❌ Content recovery failed:', error);
        return false;
      }
    },
    []
  );

  /**
   * Handle iframe load
   */
  const handleIframeLoad = useCallback(() => {
    if (!iframeRef.current) return undefined;

    try {
      console.log('📄 Iframe loaded successfully');

      const iframeDocument =
        iframeRef.current.contentDocument ||
        iframeRef.current.contentWindow?.document;

      if (!iframeDocument) {
        console.error('❌ Cannot access iframe document');
        setError('Cannot access iframe content');
        return undefined;
      }

      const bodyElement = iframeDocument.body;
      if (!bodyElement) {
        console.error('❌ Iframe body not found');
        setError('Iframe content failed to load');
        return undefined;
      }

      console.log('✅ Iframe content loaded:', {
        title: iframeDocument.title,
        bodyChildren: bodyElement.children.length,
        hasContent: bodyElement.textContent?.trim().length > 0,
      });

      // Basic scroll tracking setup
      const handleScroll = () => {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }

        scrollTimeoutRef.current = setTimeout(() => {
          const scrollTop =
            iframeDocument.documentElement.scrollTop ||
            iframeDocument.body.scrollTop;
          const scrollHeight = iframeDocument.documentElement.scrollHeight;
          const clientHeight = iframeRef.current?.clientHeight || 600;

          if (scrollHeight > clientHeight) {
            const progress = FileProcessingUtils.calculateReadingProgress(
              scrollTop,
              scrollHeight,
              clientHeight
            );

            setContentHeight(scrollHeight);

            // Calculate percentage
            const maxScrollTop = scrollHeight - clientHeight;
            const progressPercentage =
              scrollHeight <= clientHeight
                ? 100
                : Math.min(
                    100,
                    Math.max(0, Math.round((scrollTop / maxScrollTop) * 100))
                  );

            setCurrentScrollTop(progressPercentage);
            onProgressUpdate(progress);

            // Save progress
            if (serviceRef.current && serviceReady) {
              serviceRef.current
                .updateReadingProgress(report.id, {
                  currentPosition: progressPercentage,
                  totalPages: Math.ceil(scrollHeight / clientHeight),
                  currentPage: Math.ceil(scrollTop / clientHeight) + 1,
                })
                .catch(error => {
                  console.warn('Failed to save progress to service:', error);
                });
            }
          }
        }, 100);
      };

      // Add scroll listener
      iframeDocument.addEventListener('scroll', handleScroll, {
        passive: true,
      });

      // Restore scroll position
      if (currentScrollTop > 0 && readingProgress) {
        setTimeout(() => {
          const scrollHeight = iframeDocument.documentElement.scrollHeight;
          const clientHeight = iframeRef.current?.clientHeight || 600;
          const maxScrollTop = scrollHeight - clientHeight;
          const targetScrollTop =
            currentScrollTop <= 100
              ? (currentScrollTop / 100) * maxScrollTop
              : currentScrollTop;

          iframeDocument.documentElement.scrollTop = targetScrollTop;
          console.log('📖 Restored scroll position:', targetScrollTop);
        }, 300);
      }

      // Cleanup function
      return () => {
        iframeDocument.removeEventListener('scroll', handleScroll);
      };
    } catch (err) {
      console.error('Failed to initialize iframe:', err);
      setError('Failed to initialize report viewer');
      return undefined;
    }
  }, [
    report.id,
    currentScrollTop,
    readingProgress,
    onProgressUpdate,
    serviceReady,
  ]);

  /**
   * Handle progress slider change
   */
  const handleProgressChange = useCallback(
    (value: number) => {
      if (!iframeRef.current?.contentWindow) return;

      const scrollHeight = contentHeight;
      const clientHeight = iframeRef.current.contentWindow.innerHeight;
      const maxScrollTop = scrollHeight - clientHeight;
      const targetScrollTop = (value / 100) * maxScrollTop;

      iframeRef.current.contentWindow.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth',
      });

      // Update currentScrollTop with the percentage value for consistency
      setCurrentScrollTop(value);
      onProgressUpdate(value);
    },
    [contentHeight, onProgressUpdate]
  );

  /**
   * Handle keyboard shortcuts
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          onClose();
          break;
        case 'F11':
        case 'F':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            onFullscreenToggle();
          }
          break;
        case 'S':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            onSettingsToggle();
          }
          break;
      }
    },
    [isOpen, onClose, onFullscreenToggle, onSettingsToggle]
  );

  // Effects
  useEffect(() => {
    if (isOpen) {
      debugLocalStorage();
      loadReportContent();
    }
  }, [isOpen, loadReportContent, debugLocalStorage]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Modal width based on fullscreen state
   */
  const modalWidth = isFullscreen ? '100vw' : '90vw';
  const modalHeight = isFullscreen ? '100vh' : '90vh';

  return (
    <Modal
      title={
        <Space direction='vertical' size={0} style={{ width: '100%' }}>
          <Space align='center'>
            <FileTextOutlined />
            <Title level={4} style={{ margin: 0 }}>
              {report.name}
            </Title>
            <Tag
              color='default'
              style={{
                backgroundColor: '#666',
                color: 'white',
                borderColor: '#666',
              }}
            >
              {FileProcessingUtils.formatFileSize(report.fileSize)}
            </Tag>
            {readingProgress && (
              <Tag
                style={{
                  backgroundColor: '#666',
                  borderColor: '#666',
                  color: 'white',
                }}
              >
                {readingProgress.currentPosition}% {t('rndReport.viewer.read')}
              </Tag>
            )}
          </Space>
          {report.metadata?.title && report.metadata.title !== report.name && (
            <Text type='secondary' style={{ fontSize: '14px' }}>
              {report.metadata.title}
            </Text>
          )}
        </Space>
      }
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={modalWidth}
      style={{
        top: isFullscreen ? 0 : 20,
        padding: 0,
      }}
      styles={{
        body: {
          height: modalHeight,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      centered={!isFullscreen}
      destroyOnClose
      maskClosable={!isFullscreen}
      {...(className && { className })}
    >
      <div
        ref={containerRef}
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
      >
        {/* Toolbar */}
        <div
          style={{
            padding: '12px 24px',
            borderBottom: '1px solid #f0f0f0',
            background: '#fafafa',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Space>
            <Tooltip title={t('rndReport.viewer.shortcuts.fullscreen')}>
              <Button
                type='text'
                icon={
                  isFullscreen ? (
                    <FullscreenExitOutlined />
                  ) : (
                    <FullscreenOutlined />
                  )
                }
                onClick={onFullscreenToggle}
              />
            </Tooltip>
            <Tooltip title={t('rndReport.viewer.shortcuts.settings')}>
              <Button
                type='text'
                icon={<SettingOutlined />}
                onClick={onSettingsToggle}
              />
            </Tooltip>
          </Space>

          <Space>
            {readingProgress && (
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                <Text type='secondary' style={{ fontSize: '12px' }}>
                  {t('rndReport.viewer.page')} {readingProgress.currentPage} /{' '}
                  {readingProgress.totalPages}
                </Text>
                <div style={{ width: '200px' }}>
                  <Slider
                    value={readingProgress.currentPosition}
                    onChange={handleProgressChange}
                    min={0}
                    max={100}
                    tooltip={{ formatter: value => `${value}%` }}
                  />
                </div>
                <Text type='secondary' style={{ fontSize: '12px' }}>
                  {readingProgress.currentPosition}%
                </Text>
              </div>
            )}
            <Button type='text' icon={<CloseOutlined />} onClick={onClose}>
              {t('common.close')}
            </Button>
          </Space>
        </div>

        {/* Content Area */}
        <div style={{ flex: 1, display: 'flex' }}>
          {/* Main Content */}
          <div style={{ flex: 1, position: 'relative' }}>
            {loading && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#fff',
                  zIndex: 10,
                }}
              >
                <Space direction='vertical' align='center'>
                  <Spin size='large' />
                  <Text>{t('rndReport.viewer.loading')}</Text>
                </Space>
              </div>
            )}

            {error && (
              <div style={{ padding: '24px' }}>
                <Alert
                  message={t('rndReport.viewer.error')}
                  description={error}
                  type='error'
                  showIcon
                />
                {htmlContent && (
                  <div style={{ marginTop: '16px' }}>
                    <Button
                      onClick={() => {
                        console.log('🔍 Testing HTML content directly...');
                        console.log('HTML length:', htmlContent.length);
                        console.log(
                          'HTML preview:',
                          htmlContent.substring(0, 1000) + '...'
                        );

                        // Try to create a simple test
                        const testWindow = window.open('', '_blank');
                        if (testWindow) {
                          testWindow.document.write(htmlContent);
                          testWindow.document.close();
                        }
                      }}
                    >
                      Test HTML Content in New Window
                    </Button>
                  </div>
                )}
              </div>
            )}

            {!loading && !error && htmlContent && (
              <div
                style={{ position: 'relative', width: '100%', height: '100%' }}
              >
                <iframe
                  ref={iframeRef}
                  srcDoc={htmlContent}
                  onLoad={() => {
                    console.log('✅ Iframe loaded successfully');
                    console.log(
                      '📄 Iframe document:',
                      iframeRef.current?.contentDocument?.body?.innerHTML?.substring(
                        0,
                        200
                      ) + '...'
                    );
                    handleIframeLoad();
                  }}
                  onError={() => {
                    console.error('❌ Iframe failed to load');
                    console.log('🔍 HTML content length:', htmlContent.length);
                    console.log(
                      '🔍 HTML content preview:',
                      htmlContent.substring(0, 500) + '...'
                    );
                    setError('Iframe failed to load HTML content');
                  }}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    background: '#fff',
                  }}
                  title={report.name}
                  sandbox='allow-same-origin allow-scripts allow-forms allow-popups allow-presentation'
                />
              </div>
            )}

            {/* Fallback display if iframe fails */}
            {!loading && error && htmlContent && (
              <div
                style={{ padding: '24px', height: '100%', overflow: 'auto' }}
              >
                <Alert
                  message='Iframe加载失败'
                  description='尝试直接显示HTML内容'
                  type='warning'
                  showIcon
                  style={{ marginBottom: '16px' }}
                />
                <div
                  dangerouslySetInnerHTML={{ __html: htmlContent }}
                  style={{
                    border: '1px solid #d9d9d9',
                    padding: '16px',
                    background: '#fff',
                    minHeight: '400px',
                  }}
                />
              </div>
            )}

            {!loading && !error && !htmlContent && (
              <div style={{ padding: '24px', textAlign: 'center' }}>
                <Alert
                  message='HTML内容未加载'
                  description='HTML内容为空或未正确设置'
                  type='warning'
                  showIcon
                />
              </div>
            )}
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div
              style={{
                width: '300px',
                borderLeft: '1px solid #f0f0f0',
                background: '#fafafa',
                padding: '16px',
                overflowY: 'auto',
              }}
            >
              <Title level={5}>{t('rndReport.viewer.settings.title')}</Title>
              <Divider />

              <Space
                direction='vertical'
                size='middle'
                style={{ width: '100%' }}
              >
                {/* Report Info */}
                <div>
                  <Text strong>{t('rndReport.viewer.settings.info')}</Text>
                  <div style={{ marginTop: '8px' }}>
                    <Space direction='vertical' size={4}>
                      <Text>
                        <FileTextOutlined /> {report.name}
                      </Text>
                      <Text>
                        <CalendarOutlined />{' '}
                        {DateUtils.getRelativeTimeString(report.uploadDate)}
                      </Text>
                      {report.metadata?.author && (
                        <Text>
                          <UserOutlined /> {report.metadata.author}
                        </Text>
                      )}
                      <Text>
                        <ClockCircleOutlined />{' '}
                        {FileProcessingUtils.formatFileSize(report.fileSize)}
                      </Text>
                    </Space>
                  </div>
                </div>

                <Divider />

                {/* Reading Progress */}
                {readingProgress && (
                  <div>
                    <Text strong>
                      {t('rndReport.viewer.settings.progress')}
                    </Text>
                    <div style={{ marginTop: '8px' }}>
                      <Progress
                        percent={readingProgress.currentPosition}
                        size='small'
                        strokeColor='#666'
                      />
                      <Text type='secondary' style={{ fontSize: '12px' }}>
                        {t('rndReport.viewer.lastRead')}:{' '}
                        {DateUtils.getRelativeTimeString(
                          readingProgress.lastReadAt
                        )}
                      </Text>
                    </div>
                  </div>
                )}

                {/* Bookmarks */}
                {readingProgress?.bookmarks &&
                  readingProgress.bookmarks.length > 0 && (
                    <div>
                      <Text strong>
                        {t('rndReport.viewer.settings.bookmarks')}
                      </Text>
                      <div style={{ marginTop: '8px' }}>
                        {readingProgress.bookmarks.map((bookmark, index) => (
                          <div
                            key={bookmark.id || index}
                            style={{ marginBottom: '8px' }}
                          >
                            <Tag
                              style={{ cursor: 'pointer' }}
                              onClick={() =>
                                handleProgressChange(bookmark.position)
                              }
                            >
                              {bookmark.title ||
                                `${t('rndReport.viewer.bookmark')} ${index + 1}`}
                            </Tag>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Cache Management */}
                <Divider />
                <div>
                  <Text strong>Cache Management</Text>
                  <div style={{ marginTop: '8px' }}>
                    <Space direction='vertical' size={4}>
                      <Button
                        size='small'
                        type='default'
                        onClick={() => {
                          const cacheKey = `rnd-report-processed-${report.id}`;
                          const hashKey = `rnd-report-hash-${report.id}`;

                          localStorage.removeItem(cacheKey);
                          localStorage.removeItem(hashKey);

                          message.success(
                            'Cache cleared. Report will be re-processed on next load.'
                          );
                          console.log(
                            '🗑️ Cache cleared for report:',
                            report.id
                          );
                        }}
                      >
                        Clear Cache
                      </Button>
                      <Text type='secondary' style={{ fontSize: '12px' }}>
                        Clear cached content to force re-processing
                      </Text>
                    </Space>
                  </div>
                </div>
              </Space>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ReportViewer;
