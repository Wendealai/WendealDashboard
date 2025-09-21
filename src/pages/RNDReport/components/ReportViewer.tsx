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
  EyeOutlined,
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
   * Load report content
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
      const content = localStorage.getItem(`rnd-report-content-${report.id}`);
      console.log('📦 从localStorage获取内容:', {
        key: `rnd-report-content-${report.id}`,
        hasContent: !!content,
        contentLength: content?.length || 0,
        contentPreview: content?.substring(0, 200) + '...' || 'null',
      });

      if (!content) {
        throw new Error('Report content not found');
      }

      // Validate and repair HTML content
      let validatedContent = content;

      // Check for common corruption issues
      if (content.includes('�') || content.includes('���')) {
        console.warn(
          '🚨 HTML content contains encoding errors, attempting to fix...'
        );
        validatedContent = content.replace(/�+/g, '');
      }

      // Check for truncated content
      if (content.length < 100 && !content.includes('</html>')) {
        console.warn('🚨 HTML content appears to be truncated');
        validatedContent = `<html><head><title>${report.name}</title></head><body><div style="padding: 20px; color: #666;">Content appears to be truncated or corrupted. Please re-upload the report.</div></body></html>`;
      }

      // Analyze HTML content for debugging
      const analysis = analyzeHtmlContent(validatedContent);
      console.log(
        '📊 HTML Content Analysis for report:',
        report.name,
        analysis
      );

      // Simplified HTML processing - try to handle common issues
      let processedContent = validatedContent;

      // Check if content needs basic HTML structure
      const needsHtmlWrapper =
        !validatedContent.includes('<html') &&
        !validatedContent.includes('<HTML');
      const needsBodyWrapper =
        !validatedContent.includes('<body') &&
        !validatedContent.includes('<BODY');

      if (needsHtmlWrapper || needsBodyWrapper) {
        console.log('🔧 Content needs HTML structure, wrapping...');
        if (needsHtmlWrapper) {
          processedContent = `<html><head><title>${report.name}</title></head><body>${processedContent}</body></html>`;
        } else if (needsBodyWrapper) {
          processedContent = processedContent
            .replace('</head>', '</head><body>')
            .replace('</html>', '</body></html>');
        }
      } else {
        console.log('✅ HTML structure looks good, using original content');
      }

      // Basic fixes for common display issues
      processedContent = processedContent
        .replace(/display:\s*none\s*;?/gi, 'display: block !important;')
        .replace(
          /visibility:\s*hidden\s*;?/gi,
          'visibility: visible !important;'
        )
        .replace(/opacity:\s*0\s*;?/gi, 'opacity: 1 !important;');

      // Sanitize HTML content for security
      const sanitizedContent =
        FileProcessingUtils.sanitizeHtmlContent(processedContent);
      console.log('🧹 内容清理后长度:', sanitizedContent.length);

      // Create complete HTML document
      const fullHtml = createHtmlDocument(sanitizedContent);
      console.log('📄 完整HTML文档长度:', fullHtml.length);
      console.log('📄 HTML文档预览:', fullHtml.substring(0, 500) + '...');

      // Validate HTML content before setting
      if (!fullHtml || fullHtml.length === 0) {
        console.warn('⚠️ Generated HTML content is empty, trying fallback...');
        // Fallback: try to use validated content with minimal processing
        const fallbackHtml = createHtmlDocument(validatedContent);
        if (fallbackHtml && fallbackHtml.length > 0) {
          console.log('🔄 使用验证后的内容作为fallback');
          setHtmlContent(fallbackHtml);
          return;
        }
        throw new Error('Generated HTML content is empty');
      }

      setHtmlContent(fullHtml);
      console.log('✅ HTML内容已设置到状态');

      // Load reading progress from service
      if (serviceRef.current) {
        try {
          const progress = await serviceRef.current.getReadingProgress(
            report.id
          );
          setReadingProgress(progress);
          // Set currentScrollTop to percentage value for restoration
          setCurrentScrollTop(progress.currentPosition || 0);
          console.log('📖 Loaded reading progress:', progress);
        } catch (progressError) {
          console.warn('Failed to load reading progress:', progressError);
          // Fallback to localStorage
          const savedProgress = localStorage.getItem(
            `rnd-report-progress-${report.id}`
          );
          if (savedProgress) {
            const progress = JSON.parse(savedProgress);
            setReadingProgress(progress);
            // Set currentScrollTop to percentage value for restoration
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
   * Create complete HTML document
   */
  const createHtmlDocument = (content: string): string => {
    const baseStyles = `
      <style>
        /* Minimal intervention styles - only fix critical visibility issues */

        /* Base document setup */
        html, body {
          margin: 0;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
        }

        /* CRITICAL FIXES - Only for elements that are completely hidden */
        /* Only override if element is explicitly hidden, preserve original styles */
        [style*="display: none"]:not([data-original-display]) {
          display: block !important;
          background: inherit !important;
          color: inherit !important;
        }

        [hidden]:not([data-original-hidden]) {
          display: block !important;
          background: inherit !important;
          color: inherit !important;
        }

        [style*="visibility: hidden"]:not([data-original-visibility]) {
          visibility: visible !important;
        }

        [style*="opacity: 0"]:not([data-original-opacity]) {
          opacity: 1 !important;
        }

        /* Fix iframe-specific issues without breaking original styles */
        body {
          /* Only ensure minimum visibility, don't override colors/backgrounds */
          min-height: 100px; /* Prevent empty appearance */
        }

        /* Ensure images load properly */
        img {
          max-width: 100%;
          height: auto;
        }

        /* Fix any potential layout issues that prevent content from showing */
        .container, .content, .main, .wrapper {
          /* Only fix if these elements are causing content to be hidden */
          min-width: 0;
        }

        /* Preserve original styles by not overriding them unless absolutely necessary */
        /* Only add minimal fixes for known issues */

        /* Fix for common frameworks that hide content */
        .markdown-body:not([data-original-display]) {
          display: block;
        }

        /* Ensure table content is visible */
        table {
          border-collapse: collapse;
        }

        /* Prevent content from being pushed outside viewport */
        [style*="position: fixed"][style*="top: -9999px"],
        [style*="position: absolute"][style*="left: -9999px"] {
          position: static !important;
        }

        /* Fix elements that might be positioned off-screen */
        [style*="margin-left: -9999px"],
        [style*="margin-top: -9999px"] {
          margin: 0 !important;
        }

        /* Emergency fix for completely invisible content */
        [style*="color: transparent"],
        [style*="background: transparent"][style*="color: transparent"] {
          color: inherit !important;
          background: inherit !important;
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
   * Analyze HTML content for debugging
   */
  const analyzeHtmlContent = useCallback((htmlContent: string) => {
    console.log('🔍 开始分析HTML内容...');

    // More precise checks
    const analysis = {
      hasHead: htmlContent.includes('<head>') || htmlContent.includes('<head '),
      hasBody: htmlContent.includes('<body>') || htmlContent.includes('<body '),
      hasDoctype:
        htmlContent.includes('<!DOCTYPE') || htmlContent.includes('<!doctype'),
      hasExternalCss:
        htmlContent.includes('<link') && htmlContent.includes('stylesheet'),
      hasInlineCss: htmlContent.includes('<style'),
      hasScript: htmlContent.includes('<script'),
      hasImages: htmlContent.includes('<img'),
      contentLength: htmlContent.length,
      structure: 'unknown' as 'full' | 'minimal' | 'fragment',
      potentialIssues: [] as string[],
    };

    console.log('📊 基础分析结果:', {
      hasHead: analysis.hasHead,
      hasBody: analysis.hasBody,
      hasDoctype: analysis.hasDoctype,
      contentLength: analysis.contentLength,
    });

    // Determine HTML structure
    if (
      htmlContent.includes('<html') &&
      htmlContent.includes('<head') &&
      htmlContent.includes('<body')
    ) {
      analysis.structure = 'full';
    } else if (htmlContent.includes('<html') || htmlContent.includes('<body')) {
      analysis.structure = 'minimal';
    } else {
      analysis.structure = 'fragment';
    }

    // Check for potential issues
    if (analysis.hasExternalCss && analysis.structure === 'full') {
      analysis.potentialIssues.push(
        'Contains external CSS links that may not load in iframe'
      );
    }

    if (analysis.hasScript) {
      analysis.potentialIssues.push(
        'Contains scripts that may be restricted by iframe sandbox'
      );
    }

    // Check for problematic patterns
    if (
      htmlContent.includes('display: none') ||
      htmlContent.includes('visibility: hidden')
    ) {
      analysis.potentialIssues.push(
        'Contains elements that may be intentionally hidden'
      );
    }

    if (
      htmlContent.includes('position: fixed') ||
      htmlContent.includes('position: absolute')
    ) {
      analysis.potentialIssues.push(
        'Contains positioned elements that might cause layout issues'
      );
    }

    // Check for source map references that may cause iframe errors
    if (
      htmlContent.includes('sourceMappingURL') ||
      htmlContent.includes('sourceURL')
    ) {
      analysis.potentialIssues.push(
        'Contains source map references that may cause iframe errors'
      );
    }

    console.log('🔍 HTML Content Analysis:', {
      structure: analysis.structure,
      length: `${analysis.contentLength} chars`,
      hasExternalResources: analysis.hasExternalCss || analysis.hasScript,
      hasSourceMaps:
        htmlContent.includes('sourceMappingURL') ||
        htmlContent.includes('sourceURL'),
      potentialIssues: analysis.potentialIssues.length,
      issues: analysis.potentialIssues,
    });

    return analysis;
  }, []);

  /**
   * Enhanced HTML processing for iframe compatibility
   */
  const processHtmlContent = useCallback(
    (originalContent: string, reportId: string) => {
      let content = originalContent;

      console.log('🔧 开始处理HTML内容，原始长度:', content.length);

      // Only remove DOCTYPE if present (we'll add our own)
      content = content.replace(/<!DOCTYPE[^>]*>/gi, '');

      // Remove source map references to prevent iframe errors
      const contentBeforeProcessing = content;
      content = content.replace(/\/\/#\s*sourceMappingURL\s*=\s*[^\s]*/gi, '');
      content = content.replace(
        /\/\*#\s*sourceMappingURL\s*=\s*[^\s]*\*\//gi,
        ''
      );
      content = content.replace(
        /<!--#\s*sourceMappingURL\s*=\s*[^\s]*-->/gi,
        ''
      );

      // Remove sourceURL references
      content = content.replace(/\/\/#\s*sourceURL\s*=\s*[^\s]*/gi, '');

      // Log if source maps were removed
      if (contentBeforeProcessing !== content) {
        const removedSourceMaps =
          contentBeforeProcessing.length - content.length;
        console.log(`🧹 已清理 ${removedSourceMaps} 个字符的source map引用`);
      }

      // Handle external CSS links - convert to comments to prevent 404 errors
      const linkRegex =
        /<link[^>]*rel=["']stylesheet["'][^>]*href=["'][^"']*["'][^>]*>/gi;
      const originalLinkCount = (content.match(linkRegex) || []).length;
      content = content.replace(linkRegex, match => {
        console.log('🔗 注释掉外部CSS链接:', match.substring(0, 100) + '...');
        return `<!-- Commented out external CSS: ${match} -->`;
      });

      if (originalLinkCount > 0) {
        console.log(`🎨 已注释掉 ${originalLinkCount} 个外部CSS链接`);
      }

      // Handle scripts - add try-catch and defer to prevent blocking
      const scriptRegex = /<script[^>]*>([\s\S]*?)<\/script>/gi;
      content = content.replace(scriptRegex, (match, scriptContent) => {
        console.log('📜 处理JavaScript脚本');
        return `<script>
        try {
          ${scriptContent}
        } catch (error) {
          console.warn('Script execution failed in iframe:', error.message);
        }
      </script>`;
      });

      // If the content already has html/head/body structure, preserve it
      if (
        content.includes('<html') &&
        content.includes('<head') &&
        content.includes('<body')
      ) {
        console.log('✅ HTML结构完整，使用原始结构');
        return content;
      }

      // For simple HTML content without full structure, wrap it minimally
      console.log('🔄 HTML结构不完整，进行包装');
      return `<html><head><title>Report</title></head><body>${content}</body></html>`;
    },
    []
  );

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
   * Handle iframe load
   */
  const handleIframeLoad = useCallback(() => {
    if (!iframeRef.current) return;

    try {
      console.log('📄 Iframe loaded, setting up content...');

      // Set up scroll tracking (simplified without iframe-resizer)
      const iframeDocument =
        iframeRef.current.contentDocument ||
        iframeRef.current.contentWindow?.document;

      if (!iframeDocument) {
        console.error('❌ Cannot access iframe document');
        setError('Cannot access iframe content');
        return;
      }

      // Check if content loaded successfully
      const bodyElement = iframeDocument.body;
      if (!bodyElement) {
        console.error('❌ Iframe body not found');
        setError('Iframe content failed to load');
        return;
      }

      console.log('✅ Iframe body found:', {
        childNodes: bodyElement.childNodes.length,
        innerHTML: bodyElement.innerHTML.substring(0, 200) + '...',
        computedStyle: window.getComputedStyle(bodyElement),
      });

      // Basic debugging
      console.log('🔍 Iframe loaded:', {
        title: iframeDocument.title,
        bodyChildren: bodyElement.children.length,
        bodyText: bodyElement.textContent?.substring(0, 50) + '...',
      });

      // Simple visibility check
      try {
        const hiddenElements = iframeDocument.querySelectorAll(
          '[style*="display: none"], [hidden]'
        );
        if (hiddenElements.length > 0) {
          console.warn(
            `🚨 Found ${hiddenElements.length} hidden elements, applying basic fixes`
          );
          hiddenElements.forEach((el, index) => {
            if (index < 5 && !el.hasAttribute('data-fixed')) {
              (el as HTMLElement).style.display = 'block';
              el.setAttribute('data-fixed', 'true');
              console.log('✅ Fixed hidden element:', el.tagName);
            }
          });
        }
      } catch (error) {
        console.warn('Visibility check failed:', error);
      }

      // Minimal intervention - only fix if body is completely empty or hidden
      const computedStyle =
        iframeDocument.defaultView?.getComputedStyle(bodyElement) ||
        window.getComputedStyle(bodyElement);

      // Only intervene if the body has no visible content at all
      if (
        bodyElement.childNodes.length === 0 ||
        (computedStyle.display === 'none' &&
          !bodyElement.hasAttribute('data-original-display'))
      ) {
        console.warn(
          '⚠️ Body appears to be empty or hidden, applying minimal fix'
        );
        bodyElement.style.display = 'block';
        bodyElement.style.minHeight = '100px';
      }

      // Basic content validation
      if (
        !bodyElement.textContent?.trim() &&
        bodyElement.children.length === 0
      ) {
        console.warn('⚠️ Body appears empty, setting basic content');
        bodyElement.innerHTML =
          '<div style="padding: 20px; text-align: center; color: #666;">内容加载中...</div>';
      }

      if (iframeDocument) {
        const handleScroll = () => {
          if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
          }

          scrollTimeoutRef.current = setTimeout(async () => {
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

              // Update currentScrollTop with percentage for consistency
              const currentPercentage =
                scrollHeight <= clientHeight
                  ? 100
                  : Math.min(
                      100,
                      Math.max(
                        0,
                        Math.round(
                          (scrollTop / (scrollHeight - clientHeight)) * 100
                        )
                      )
                    );
              setCurrentScrollTop(currentPercentage);

              // Update progress
              onProgressUpdate(progress);

              // Save progress to service
              if (serviceRef.current && serviceReady) {
                try {
                  const maxScrollTop = scrollHeight - clientHeight;
                  const progressPercentage =
                    scrollHeight <= clientHeight
                      ? 100
                      : Math.min(
                          100,
                          Math.max(
                            0,
                            Math.round((scrollTop / maxScrollTop) * 100)
                          )
                        );

                  const progressData: Partial<ReadingProgress> = {
                    currentPosition: progressPercentage,
                    totalPages: Math.ceil(scrollHeight / clientHeight),
                    currentPage: Math.ceil(scrollTop / clientHeight) + 1,
                  };

                  const updatedProgress =
                    await serviceRef.current.updateReadingProgress(
                      report.id,
                      progressData
                    );
                  setReadingProgress(updatedProgress);
                  console.log('💾 Auto-saved reading progress:', progressData);
                } catch (saveError) {
                  console.error('Failed to save reading progress:', saveError);
                  // Fallback to localStorage
                  const maxScrollTop = scrollHeight - clientHeight;
                  const progressPercentage =
                    scrollHeight <= clientHeight
                      ? 100
                      : Math.min(
                          100,
                          Math.max(
                            0,
                            Math.round((scrollTop / maxScrollTop) * 100)
                          )
                        );

                  const progressData: ReadingProgress = {
                    reportId: report.id,
                    currentPosition: progressPercentage,
                    totalPages: Math.ceil(scrollHeight / clientHeight),
                    currentPage: Math.ceil(scrollTop / clientHeight) + 1,
                    lastReadAt: new Date(),
                    bookmarks: readingProgress?.bookmarks || [],
                  };
                  localStorage.setItem(
                    `rnd-report-progress-${report.id}`,
                    JSON.stringify(progressData)
                  );
                  setReadingProgress(progressData);
                }
              } else {
                // Fallback to localStorage if service not ready
                const maxScrollTop = scrollHeight - clientHeight;
                const progressPercentage =
                  scrollHeight <= clientHeight
                    ? 100
                    : Math.min(
                        100,
                        Math.max(
                          0,
                          Math.round((scrollTop / maxScrollTop) * 100)
                        )
                      );

                const progressData: ReadingProgress = {
                  reportId: report.id,
                  currentPosition: progressPercentage,
                  totalPages: Math.ceil(scrollHeight / clientHeight),
                  currentPage: Math.ceil(scrollTop / clientHeight) + 1,
                  lastReadAt: new Date(),
                  bookmarks: readingProgress?.bookmarks || [],
                };
                localStorage.setItem(
                  `rnd-report-progress-${report.id}`,
                  JSON.stringify(progressData)
                );
                setReadingProgress(progressData);
              }
            }
          }, 100);
        };

        // Add scroll event listener
        iframeDocument.addEventListener('scroll', handleScroll, {
          passive: true,
        });

        // Restore scroll position if available
        if (currentScrollTop > 0 && readingProgress) {
          setTimeout(() => {
            // Convert percentage to actual scroll position
            const scrollHeight = iframeDocument.documentElement.scrollHeight;
            const clientHeight = iframeRef.current?.clientHeight || 600;
            const maxScrollTop = scrollHeight - clientHeight;

            // If currentScrollTop is percentage (0-100), convert it
            let targetScrollTop = currentScrollTop;
            if (currentScrollTop <= 100) {
              targetScrollTop = (currentScrollTop / 100) * maxScrollTop;
            }

            iframeDocument.documentElement.scrollTop = targetScrollTop;
            console.log(
              '📖 Restored scroll position:',
              targetScrollTop,
              'from percentage:',
              currentScrollTop
            );
          }, 500);
        }

        // Cleanup function
        return () => {
          iframeDocument.removeEventListener('scroll', handleScroll);
        };
      }
    } catch (err) {
      console.error('Failed to initialize iframe:', err);
      setError('Failed to initialize report viewer');
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
                  onLoad={e => {
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
                  onError={e => {
                    console.error('❌ Iframe failed to load:', e);
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
              </Space>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ReportViewer;
