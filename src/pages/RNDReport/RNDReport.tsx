/**
 * R&D Report Main Page Component
 * Comprehensive HTML document management system for research reports
 */

import React, { useState, useEffect, useCallback } from 'react';

// Add custom styles for gray tabs
const grayTabStyles = `
<style>
.gray-tabs .ant-tabs-tab.ant-tabs-tab-active {
  background-color: #f5f5f5 !important;
  border-color: #d9d9d9 !important;
  color: #666 !important;
}

.gray-tabs .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
  color: #666 !important;
}

.gray-tabs .ant-tabs-ink-bar {
  background-color: #666 !important;
}

.gray-tabs .ant-tabs-tab:hover {
  color: #666 !important;
}

.gray-tabs .ant-tabs-tab.ant-tabs-tab-active:hover {
  color: #666 !important;
}
</style>
`;
import { Tabs, Card, Typography, Space, Button, Badge, Tooltip } from 'antd';
import {
  FileTextOutlined,
  UploadOutlined,
  FolderOutlined,
  SettingOutlined,
  BarChartOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useMessage } from '@/hooks/useMessage';

// Import R&D Report components (will be created in subsequent tasks)
import UploadZone from './components/UploadZone';
import ReportList from './components/ReportList';
import CategoryManager from './components/CategoryManager';
import ReportViewer from './components/ReportViewer';

// Import types and services
import type {
  Report,
  Category,
  UploadState,
  ReportListViewState,
  ReportViewerState,
} from '../../types/rndReport';
import { RNDReportService } from '../../services/rndReportService';
import { FileProcessingUtils } from '../../utils/rndReportUtils';

// Import hooks and utilities

const { Title, Text } = Typography;
const { TabPane } = Tabs;

/**
 * R&D Report Main Page Component
 * Provides comprehensive HTML document management interface
 */
const RNDReport: React.FC = () => {
  const { t } = useTranslation();
  const messageApi = useMessage();

  // Component state
  const [activeTab, setActiveTab] = useState('all-reports');
  const [service, setService] = useState<RNDReportService | null>(null);
  const [isServiceReady, setIsServiceReady] = useState(false);

  // UI state
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    uploadedFiles: [],
  });

  const [listViewState, setListViewState] = useState<ReportListViewState>({
    searchFilters: {},
    sortOptions: {
      field: 'uploadDate',
      direction: 'desc',
    },
    viewMode: 'list',
    expandedCategories: [],
  });

  const [viewerState, setViewerState] = useState<ReportViewerState>({
    isOpen: false,
    readingProgress: {
      reportId: '',
      currentPosition: 0,
      lastReadAt: new Date(),
      bookmarks: [],
    },
    isFullscreen: false,
    showSettings: false,
  });

  // Data state
  const [reports, setReports] = useState<Report[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentReport, setCurrentReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  /**
   * Initialize R&D Report service
   */
  useEffect(() => {
    const initializeService = async () => {
      try {
        console.log('🚀 Initializing R&D Report service...');

        const rndService = new RNDReportService();
        await rndService.initialize({
          maxFileSize: 50 * 1024 * 1024, // 50MB
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

        console.log('✅ R&D Report service initialized');
        setService(rndService);
        setIsServiceReady(true);

        // Load initial data
        await loadInitialData(rndService);
        console.log('✅ R&D Report initialization completed successfully');
      } catch (error) {
        console.error('❌ Failed to initialize R&D Report service:', error);
        messageApi.error(t('rndReport.errors.initializationFailed'));
      } finally {
        setLoading(false);
      }
    };

    initializeService();
  }, []);

  /**
   * Load initial data
   */
  const loadInitialData = async (rndService: RNDReportService) => {
    try {
      console.log('🔄 Loading initial data...');

      // Load reports
      const reportsResponse = await rndService.getReports();

      // 为每个报告同步阅读进度
      const reportsWithProgress = await Promise.all(
        reportsResponse.reports.map(async report => {
          try {
            const readingProgress = await rndService.getReadingProgress(
              report.id
            );
            return {
              ...report,
              readingProgress: readingProgress.currentPosition || 0,
            };
          } catch (error) {
            // 如果获取失败，使用现有的readingProgress
            console.warn(
              `Failed to load reading progress for report ${report.id}:`,
              error
            );
            return report;
          }
        })
      );

      setReports(reportsWithProgress);
      console.log(
        '📋 Reports loaded with progress:',
        reportsWithProgress.length
      );

      // Load categories
      const categoriesResponse = await rndService.getCategories();
      setCategories(categoriesResponse.categories);
      console.log(
        '📂 Categories loaded:',
        categoriesResponse.categories.length
      );

      console.log('✅ Initial data loading completed');
      console.log('📊 Current state:', {
        reports: reportsResponse.reports.length,
        categories: categoriesResponse.categories.length,
      });

      // Check data consistency and run repair if needed
      const localStorageCount = Object.keys(localStorage).filter(key =>
        key.startsWith('rnd-report-content-')
      ).length;

      if (reportsResponse.reports.length === 0 && localStorageCount > 0) {
        console.warn(
          '⚠️ Potential data inconsistency: No reports loaded but files exist in localStorage'
        );
        // Attempt to repair data consistency
        try {
          const consistencyResult =
            await rndService.checkAndRepairDataConsistency();
          if (consistencyResult.issuesFixed.length > 0) {
            console.log(
              '🔧 Data consistency issues fixed:',
              consistencyResult.issuesFixed
            );
            // Reload data after repair
            await loadInitialData(rndService);
          }
        } catch (repairError) {
          console.error('❌ Failed to repair data consistency:', repairError);
        }
      } else if (
        reportsResponse.reports.length > 0 &&
        localStorageCount === 0
      ) {
        console.warn(
          '⚠️ Potential data inconsistency: Reports exist but no files in localStorage'
        );
        // Attempt to repair data consistency
        try {
          const consistencyResult =
            await rndService.checkAndRepairDataConsistency();
          if (consistencyResult.issuesFixed.length > 0) {
            console.log(
              '🔧 Data consistency issues fixed:',
              consistencyResult.issuesFixed
            );
            // Reload data after repair
            await loadInitialData(rndService);
          }
        } catch (repairError) {
          console.error('❌ Failed to repair data consistency:', repairError);
        }
      }
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
      messageApi.error(t('rndReport.errors.loadDataFailed'));
    }
  };

  /**
   * Handle file upload with individual category selection
   */
  const handleFileUpload = useCallback(
    async (files: File[], fileCategories?: Map<string, string>) => {
      if (!service || !isServiceReady) {
        messageApi.error(t('rndReport.errors.serviceNotReady'));
        return;
      }

      setUploadState(prev => ({ ...prev, isUploading: true, progress: 0 }));

      try {
        const uploadPromises = files.map(async (file, index) => {
          // Get category for this file
          const categoryId = fileCategories?.get(file.name) || '';

          // Upload file with its specific category
          const result = await service.uploadFile(file, categoryId);

          // Update progress
          setUploadState(prev => ({
            ...prev,
            progress: Math.round(((index + 1) / files.length) * 100),
            uploadedFiles: [...prev.uploadedFiles, file.name],
          }));

          return result;
        });

        await Promise.all(uploadPromises);

        // Reload data
        console.log('🔄 Reloading data after upload...');
        await loadInitialData(service);

        messageApi.success(
          t('rndReport.messages.uploadSuccess', { count: files.length })
        );

        setUploadState({
          isUploading: false,
          progress: 100,
          uploadedFiles: [],
        });
      } catch (error) {
        console.error('Upload failed:', error);
        messageApi.error(t('rndReport.errors.uploadFailed'));

        setUploadState(prev => ({
          ...prev,
          isUploading: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    },
    [service, isServiceReady, messageApi, t]
  );

  /**
   * Handle report selection
   */
  const handleReportSelect = useCallback(
    async (reportId: string) => {
      if (!service) return;

      try {
        const report = await service.getReport(reportId);
        setCurrentReport(report);
        setViewerState(prev => ({ ...prev, isOpen: true }));
      } catch (error) {
        console.error('Failed to load report:', error);
        messageApi.error(t('rndReport.errors.loadReportFailed'));
      }
    },
    [service, messageApi, t]
  );

  /**
   * Handle category selection
   */
  const _handleCategorySelect = useCallback((categoryId: string) => {
    setListViewState(prev => ({
      ...prev,
      selectedCategoryId:
        categoryId === prev.selectedCategoryId ? '' : categoryId,
    }));
  }, []);

  /**
   * Handle tab change
   */
  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key);
  }, []);

  /**
   * Get filtered reports based on current filters
   */
  const getFilteredReports = useCallback(() => {
    let filtered = reports;

    // Category filter
    if (listViewState.selectedCategoryId) {
      filtered = filtered.filter(
        report => report.categoryId === listViewState.selectedCategoryId
      );
    }

    // Search filter
    if (listViewState.searchFilters.query) {
      const query = listViewState.searchFilters.query.toLowerCase();
      filtered = filtered.filter(
        report =>
          report.name.toLowerCase().includes(query) ||
          report.metadata?.title?.toLowerCase().includes(query) ||
          report.metadata?.description?.toLowerCase().includes(query) ||
          report.metadata?.author?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [reports, listViewState]);

  /**
   * Get category statistics
   */
  const getCategoryStats = useCallback(() => {
    const stats = new Map<string, number>();

    reports.forEach(report => {
      const count = stats.get(report.categoryId) || 0;
      stats.set(report.categoryId, count + 1);
    });

    return stats;
  }, [reports]);

  /**
   * Handle report deletion
   */
  const handleReportDelete = useCallback(
    async (reportId: string) => {
      console.log(
        '🚀 RNDReport handleReportDelete called with reportId:',
        reportId
      );
      console.log('🔧 Service available:', !!service);
      console.log('🔧 Service ready:', isServiceReady);

      if (!service || !isServiceReady) {
        console.error('❌ Service not ready');
        messageApi.error(t('rndReport.errors.serviceNotReady'));
        return;
      }

      try {
        console.log('🗑️ Starting report deletion process:', reportId);
        const reportName =
          reports.find(r => r.id === reportId)?.name || 'Report';
        console.log('📋 Report name:', reportName);

        // Delete the report
        console.log('📡 Calling service.deleteReport...');
        await service.deleteReport(reportId);
        console.log('✅ service.deleteReport completed');

        // Update local state by removing the deleted report
        console.log('🔄 Updating local state...');
        setReports(prevReports => {
          const filtered = prevReports.filter(report => report.id !== reportId);
          console.log('📊 Reports count after filter:', filtered.length);
          return filtered;
        });

        console.log('✅ Showing success message');
        messageApi.success(
          t('rndReport.messages.deleteSuccess', { name: reportName })
        );

        console.log('✅ Report deleted successfully:', reportId);
      } catch (error) {
        console.error('❌ Failed to delete report:', error);
        messageApi.error(
          t('rndReport.errors.deleteFailed', {
            name: reports.find(r => r.id === reportId)?.name || 'Report',
          })
        );
      }
    },
    [service, isServiceReady, reports, messageApi, t]
  );

  /**
   * Handle report rename
   */
  const handleReportRename = useCallback(
    async (reportId: string, newName: string) => {
      if (!service || !isServiceReady) {
        messageApi.error(t('rndReport.errors.serviceNotReady'));
        return;
      }

      if (!newName.trim()) {
        messageApi.error(
          t('rndReport.errors.renameFailed', { name: 'Report' })
        );
        return;
      }

      try {
        console.log('✏️ Renaming report:', reportId, 'to:', newName);
        const oldName = reports.find(r => r.id === reportId)?.name || 'Report';

        // Update the report name
        await service.updateReport(reportId, { name: newName.trim() });

        // Update local state
        setReports(prevReports =>
          prevReports.map(report =>
            report.id === reportId
              ? { ...report, name: newName.trim() }
              : report
          )
        );

        messageApi.success(
          t('rndReport.messages.renameSuccess', {
            oldName,
            newName: newName.trim(),
          })
        );

        console.log('✅ Report renamed successfully:', reportId);
      } catch (error) {
        console.error('❌ Failed to rename report:', error);
        messageApi.error(
          t('rndReport.errors.renameFailed', {
            name: reports.find(r => r.id === reportId)?.name || 'Report',
          })
        );
      }
    },
    [service, isServiceReady, reports, messageApi, t]
  );

  /**
   * Test report deletion and rename functionality
   */
  const testReportOperations = useCallback(async () => {
    if (reports.length === 0) {
      console.log('⚠️ No reports available for testing');
      return;
    }

    const testReport = reports[0];
    if (!testReport) {
      console.log('⚠️ Test report is undefined');
      return;
    }

    console.log('🧪 Testing report operations with:', testReport.name);

    // Test 1: Rename operation
    try {
      console.log('✏️ Testing rename operation...');
      const newName = `Test_${testReport.name}_${Date.now()}`;
      await handleReportRename(testReport.id, newName);
      console.log('✅ Rename test completed');

      // Test 2: Delete operation (commented out to avoid actual deletion)
      // console.log('🗑️ Testing delete operation...');
      // await handleReportDelete(testReport.id);
      // console.log('✅ Delete test completed');
    } catch (error) {
      console.error('❌ Test operation failed:', error);
    }
  }, [reports, handleReportRename, handleReportDelete]);

  /**
   * Debug function to test report list functionality
   */
  const debugReportList = useCallback(() => {
    console.log('🔍 Debug Report List Functionality:');
    console.log('📊 Total reports:', reports.length);
    console.log('📂 Categories:', categories.length);
    console.log('🔍 Current filters:', listViewState);
    console.log(
      '📋 Reports data:',
      reports.map(r => ({
        id: r.id,
        name: r.name,
        categoryId: r.categoryId,
        fileSize: r.fileSize,
        uploadDate: r.uploadDate,
        readingProgress: r.readingProgress,
      }))
    );

    const filtered = getFilteredReports();
    console.log('🎯 Filtered reports:', filtered.length);

    // Test search functionality
    if (reports.length > 0 && reports[0]) {
      const testQuery = reports[0].name.substring(0, 3);
      console.log('🧪 Testing search with query:', testQuery);
      const searchResults = reports.filter(report =>
        report.name.toLowerCase().includes(testQuery.toLowerCase())
      );
      console.log('🔍 Search results:', searchResults.length);
    }

    // Test category filtering
    if (categories.length > 0 && categories[0]) {
      const categoryTest = categories[0];
      console.log('🧪 Testing category filter:', categoryTest.name);
      const categoryResults = reports.filter(
        report => report.categoryId === categoryTest.id
      );
      console.log('📂 Category results:', categoryResults.length);
    }
  }, [reports, categories, listViewState, getFilteredReports]);

  /**
   * Test reading progress functionality
   */
  const testReadingProgress = useCallback(async () => {
    if (reports.length === 0) {
      console.log('⚠️ No reports available for testing reading progress');
      return;
    }

    const testReport = reports[0];
    if (!testReport) {
      console.log('⚠️ Test report is undefined');
      return;
    }

    console.log(
      '📖 Testing reading progress functionality with:',
      testReport.name
    );

    try {
      // Test 1: Get current reading progress
      console.log('📖 Getting current reading progress...');
      const progress = await service?.getReadingProgress(testReport.id);
      console.log('📊 Current progress:', progress);

      // Test 2: Update reading progress
      console.log('📝 Updating reading progress to 50%...');
      const updatedProgress = await service?.updateReadingProgress(
        testReport.id,
        {
          currentPosition: 50,
          totalPages: 10,
          currentPage: 5,
        }
      );
      console.log('✅ Updated progress:', updatedProgress);

      // Test 3: Verify progress was saved
      console.log('🔍 Verifying progress was saved...');
      const verifiedProgress = await service?.getReadingProgress(testReport.id);
      console.log('✅ Verified progress:', verifiedProgress);
    } catch (error) {
      console.error('❌ Reading progress test failed:', error);
    }
  }, [reports, service]);

  /**
   * Handle data consistency check and repair
   */
  const handleDataConsistencyCheck = useCallback(async () => {
    if (!service || !isServiceReady) {
      messageApi.error(t('rndReport.errors.serviceNotReady'));
      return;
    }

    try {
      console.log('🔍 Starting data consistency check...');
      messageApi.info(t('rndReport.messages.consistencyCheckStarted'));

      const consistencyResult = await service.checkAndRepairDataConsistency();

      console.log('✅ Data consistency check completed:', consistencyResult);

      if (consistencyResult.issuesFixed.length > 0) {
        messageApi.success(
          t('rndReport.messages.consistencyCheckSuccess', {
            count: consistencyResult.issuesFixed.length,
          })
        );

        // Reload data after repair
        await loadInitialData(service);
      } else {
        messageApi.info(t('rndReport.messages.consistencyCheckNoIssues'));
      }

      // Show detailed results in console
      console.log('📊 Consistency Check Results:');
      console.log('- Issues Found:', consistencyResult.issuesFound);
      console.log('- Issues Fixed:', consistencyResult.issuesFixed);
      console.log('- Orphaned Content:', consistencyResult.orphanedContent);
      console.log('- Missing Content:', consistencyResult.missingContent);
      console.log('- Cache Issues:', consistencyResult.cacheIssues);
    } catch (error) {
      console.error('❌ Data consistency check failed:', error);
      messageApi.error(t('rndReport.errors.consistencyCheckFailed'));
    }
  }, [service, isServiceReady, messageApi, t]);

  /**
   * Handle cache clearing
   */
  const handleClearCache = useCallback(async () => {
    if (!service || !isServiceReady) {
      messageApi.error(t('rndReport.errors.serviceNotReady'));
      return;
    }

    try {
      console.log('🧹 Starting cache clearing...');
      messageApi.info(t('rndReport.messages.cacheClearStarted'));

      // Clear processed content cache
      const cacheKeys = Object.keys(localStorage).filter(key =>
        key.startsWith('rnd-report-processed-')
      );

      cacheKeys.forEach(key => {
        localStorage.removeItem(key);
      });

      console.log('✅ Cache cleared:', cacheKeys.length, 'entries removed');

      if (cacheKeys.length > 0) {
        messageApi.success(
          t('rndReport.messages.cacheClearSuccess', {
            count: cacheKeys.length,
          })
        );
      } else {
        messageApi.info(t('rndReport.messages.cacheClearNoEntries'));
      }
    } catch (error) {
      console.error('❌ Cache clearing failed:', error);
      messageApi.error(t('rndReport.errors.cacheClearFailed'));
    }
  }, [service, isServiceReady, messageApi, t]);

  /**
   * Comprehensive test function for all R&D Report functionality
   */
  const runComprehensiveTest = useCallback(async () => {
    console.log('🚀 Starting comprehensive R&D Report system test...');

    // Test 1: Data consistency check
    console.log('🔍 Test 1: Data consistency check');
    try {
      const consistencyResult = await service?.checkAndRepairDataConsistency();
      console.log('✅ Data consistency check completed:', consistencyResult);
    } catch (error) {
      console.error('❌ Data consistency check failed:', error);
    }

    // Test 2: Report list functionality
    console.log('📋 Test 2: Report list functionality');
    debugReportList();

    // Test 3: Reading progress functionality
    console.log('📖 Test 3: Reading progress functionality');
    await testReadingProgress();

    // Test 4: Report operations
    console.log('🧪 Test 4: Report operations');
    await testReportOperations();

    console.log('🎉 Comprehensive test completed!');
  }, [service, debugReportList, testReadingProgress, testReportOperations]);

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Text>{t('rndReport.loading')}</Text>
      </div>
    );
  }

  const filteredReports = getFilteredReports();
  const categoryStats = getCategoryStats();

  return (
    <div style={{ padding: '24px', height: '100%' }}>
      <div dangerouslySetInnerHTML={{ __html: grayTabStyles }} />
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Space direction='vertical' size='small' style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Title level={4} style={{ margin: 0 }}>
              <FileTextOutlined style={{ marginRight: '8px' }} />
              {t('rndReport.title')}
            </Title>
            <Tooltip title={t('rndReport.description')}>
              <InfoCircleOutlined style={{ color: '#666', cursor: 'help' }} />
            </Tooltip>
          </div>
        </Space>
      </div>

      {/* Main Content */}
      <Card style={{ height: 'calc(100vh - 200px)' }}>
        <Tabs
          activeKey={activeTab}
          onChange={handleTabChange}
          type='card'
          size='small'
          tabBarStyle={{
            color: '#666',
          }}
          style={
            {
              '--ant-tabs-card-active-color': '#666',
              '--ant-tabs-card-head-background': '#f5f5f5',
              '--ant-tabs-card-tab-active-border-color': '#d9d9d9',
            } as React.CSSProperties
          }
          tabBarExtraContent={null}
          className='gray-tabs'
        >
          {/* All Reports Tab - 主内容展示 */}
          <TabPane
            tab={
              <span>
                <FileTextOutlined style={{ marginRight: '8px' }} />
                {t('rndReport.tabs.allReports')}
                <Text
                  type='secondary'
                  style={{ marginLeft: '8px', fontSize: '12px' }}
                >
                  ({filteredReports.length})
                </Text>
              </span>
            }
            key='all-reports'
          >
            <Space direction='vertical' size='large' style={{ width: '100%' }}>
              {/* Report List - 优先展示 */}
              <Card
                size='small'
                title={
                  <Space>
                    <span>{t('rndReport.list.title')}</span>
                    <Text type='secondary' style={{ fontSize: '11px' }}>
                      Total: {reports.length} Reports, {categories.length}{' '}
                      Categories
                    </Text>
                  </Space>
                }
              >
                <ReportList
                  reports={reports}
                  categories={categories}
                  viewState={listViewState}
                  onReportSelect={handleReportSelect}
                  onViewStateChange={setListViewState}
                  onReportDelete={handleReportDelete}
                  onReportRename={handleReportRename}
                />
              </Card>
            </Space>
          </TabPane>

          {/* Upload Tab */}
          <TabPane
            tab={
              <span>
                <UploadOutlined style={{ marginRight: '8px' }} />
                {t('rndReport.upload.title')}
              </span>
            }
            key='upload'
          >
            <Space direction='vertical' size='large' style={{ width: '100%' }}>
              <Card size='small'>
                <UploadZone
                  onFilesConfirmed={(files, categoryId, fileCategories) =>
                    handleFileUpload(files, fileCategories)
                  }
                  categories={categories}
                  isUploading={uploadState.isUploading}
                  progress={uploadState.progress}
                  multiple={true}
                />
              </Card>
            </Space>
          </TabPane>

          {/* Categories Tab */}
          <TabPane
            tab={
              <span>
                <FolderOutlined style={{ marginRight: '8px' }} />
                {t('rndReport.tabs.categories')}
              </span>
            }
            key='categories'
          >
            <CategoryManager
              categories={categories}
              categoryStats={categoryStats}
              onCategorySelect={_handleCategorySelect}
              onCategoriesChange={setCategories}
            />
          </TabPane>

          {/* Settings Tab */}
          <TabPane
            tab={
              <span>
                <SettingOutlined style={{ marginRight: '8px' }} />
                {t('rndReport.tabs.settings')}
              </span>
            }
            key='settings'
          >
            <Card title={t('rndReport.settings.title')} size='small'>
              <Space
                direction='vertical'
                size='large'
                style={{ width: '100%' }}
              >
                <Text>{t('rndReport.settings.description')}</Text>

                {/* Service Status */}
                <Card
                  size='small'
                  title={t('rndReport.settings.serviceStatus')}
                >
                  <Space direction='vertical'>
                    <Text>
                      <Text strong>
                        {t('rndReport.settings.serviceReady')}:
                      </Text>
                      <Badge
                        status={isServiceReady ? 'success' : 'error'}
                        text={isServiceReady ? t('common.yes') : t('common.no')}
                      />
                    </Text>
                    <Text>
                      <Text strong>
                        {t('rndReport.settings.totalStorage')}:
                      </Text>
                      {FileProcessingUtils.formatFileSize(
                        reports.reduce(
                          (sum, report) => sum + report.fileSize,
                          0
                        )
                      )}
                    </Text>
                  </Space>
                </Card>

                {/* Data Management */}
                <Card
                  size='small'
                  title={t('rndReport.settings.dataManagement')}
                >
                  <Space
                    direction='vertical'
                    size='middle'
                    style={{ width: '100%' }}
                  >
                    <Text>
                      {t('rndReport.settings.dataManagementDescription')}
                    </Text>

                    <Space
                      direction='vertical'
                      size='small'
                      style={{ width: '100%' }}
                    >
                      {/* Data Consistency Check */}
                      <Card size='small' type='inner'>
                        <Space
                          direction='vertical'
                          size='small'
                          style={{ width: '100%' }}
                        >
                          <Text strong>
                            {t('rndReport.settings.consistencyCheck')}
                          </Text>
                          <Text type='secondary' style={{ fontSize: '12px' }}>
                            {t(
                              'rndReport.settings.consistencyCheckDescription'
                            )}
                          </Text>
                          <Button
                            type='primary'
                            size='small'
                            onClick={handleDataConsistencyCheck}
                            loading={false}
                            icon={<BarChartOutlined />}
                          >
                            {t('rndReport.settings.runConsistencyCheck')}
                          </Button>
                        </Space>
                      </Card>

                      {/* Cache Management */}
                      <Card size='small' type='inner'>
                        <Space
                          direction='vertical'
                          size='small'
                          style={{ width: '100%' }}
                        >
                          <Text strong>
                            {t('rndReport.settings.cacheManagement')}
                          </Text>
                          <Text type='secondary' style={{ fontSize: '12px' }}>
                            {t('rndReport.settings.cacheManagementDescription')}
                          </Text>
                          <Button
                            type='default'
                            size='small'
                            onClick={handleClearCache}
                            loading={false}
                            icon={<FolderOutlined />}
                          >
                            {t('rndReport.settings.clearCache')}
                          </Button>
                        </Space>
                      </Card>
                    </Space>
                  </Space>
                </Card>

                {/* Debug Tools */}
                <Card size='small' title={t('rndReport.settings.debugTools')}>
                  <Space
                    direction='vertical'
                    size='middle'
                    style={{ width: '100%' }}
                  >
                    <Text>{t('rndReport.settings.debugToolsDescription')}</Text>

                    <Space
                      direction='vertical'
                      size='small'
                      style={{ width: '100%' }}
                    >
                      <Button
                        type='dashed'
                        size='small'
                        onClick={runComprehensiveTest}
                        loading={false}
                        icon={<InfoCircleOutlined />}
                      >
                        {t('rndReport.settings.runComprehensiveTest')}
                      </Button>
                    </Space>
                  </Space>
                </Card>
              </Space>
            </Card>
          </TabPane>
        </Tabs>
      </Card>

      {/* Report Viewer Modal */}
      {viewerState.isOpen && currentReport && (
        <ReportViewer
          report={currentReport}
          isOpen={viewerState.isOpen}
          isFullscreen={viewerState.isFullscreen}
          showSettings={viewerState.showSettings}
          onClose={() => setViewerState(prev => ({ ...prev, isOpen: false }))}
          onFullscreenToggle={() =>
            setViewerState(prev => ({
              ...prev,
              isFullscreen: !prev.isFullscreen,
            }))
          }
          onSettingsToggle={() =>
            setViewerState(prev => ({
              ...prev,
              showSettings: !prev.showSettings,
            }))
          }
          onProgressUpdate={async progress => {
            if (service) {
              // 更新阅读进度到服务
              await service.updateReadingProgress(currentReport.id, {
                currentPosition: progress,
              });

              // 同时更新Report对象的readingProgress字段
              setCurrentReport(prev =>
                prev ? { ...prev, readingProgress: progress } : null
              );

              // 更新reports列表中的对应报告
              setReports(prevReports =>
                prevReports.map(report =>
                  report.id === currentReport.id
                    ? { ...report, readingProgress: progress }
                    : report
                )
              );
            }
          }}
        />
      )}
    </div>
  );
};

export default RNDReport;
