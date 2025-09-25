/**
 * ReportList Component
 * Displays and organizes R&D reports in a responsive card grid layout with categorization and search functionality
 */

import React, { useState, useMemo } from 'react';
import {
  Card,
  Typography,
  Space,
  Input,
  Button,
  Tag,
  Tooltip,
  Empty,
  Avatar,
  Dropdown,
  App,
  message,
} from 'antd';
import {
  FileTextOutlined,
  SearchOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  EyeOutlined,
  MoreOutlined,
  ClockCircleOutlined,
  UserOutlined,
  DeleteOutlined,
  EditOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';

// Import types
import type {
  Report,
  Category,
  ReportListViewState,
  ReportSortOptions,
} from '../../../types/rndReport';

// Import utilities
import { FileProcessingUtils } from '../../../utils/rndReportUtils';

const { Text, Paragraph } = Typography;

/**
 * ReportList Props Interface
 */
export interface ReportListProps {
  /** Array of reports to display */
  reports: Report[];
  /** Array of available categories */
  categories: Category[];
  /** Current view state */
  viewState: ReportListViewState;
  /** Callback when a report is selected */
  onReportSelect: (reportId: string) => void;
  /** Callback when view state changes */
  onViewStateChange: (viewState: ReportListViewState) => void;
  /** Callback when a report is deleted */
  onReportDelete?: (reportId: string) => Promise<void>;
  /** Callback when a report is renamed */
  onReportRename?: (reportId: string, newName: string) => Promise<void>;
  /** Custom class name */
  className?: string;
  /** Loading state */
  loading?: boolean;
}

/**
 * ReportList Component
 * Comprehensive report listing with categorization, search, and filtering
 */
const ReportList: React.FC<ReportListProps> = ({
  reports,
  categories,
  viewState,
  onReportSelect,
  onViewStateChange,
  onReportDelete,
  onReportRename,
  className,
  loading = false,
}) => {
  const { t } = useTranslation();
  const { modal } = App.useApp();

  // Local state for search input
  const [searchInput, setSearchInput] = useState(
    viewState.searchFilters.query || ''
  );

  // Local state for delete operations
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null);

  // Local state for rename operations
  const [renamingReportId, setRenamingReportId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  /**
   * Get category by ID
   */
  const getCategoryById = (categoryId: string): Category | undefined => {
    return categories.find(cat => cat.id === categoryId);
  };

  /**
   * Get category statistics
   */
  const getCategoryStats = useMemo(() => {
    const stats = new Map<string, number>();

    // Always calculate statistics from all reports to show total counts per category
    reports.forEach(report => {
      const count = stats.get(report.categoryId) || 0;
      stats.set(report.categoryId, count + 1);
    });

    return stats;
  }, [reports]);

  /**
   * Get filtered and sorted reports
   */
  const processedReports = useMemo(() => {
    let filtered = reports;

    // Apply category filter
    if (viewState.selectedCategoryId) {
      filtered = filtered.filter(
        report => report.categoryId === viewState.selectedCategoryId
      );
    }

    // Apply search filter
    if (viewState.searchFilters.query) {
      const query = viewState.searchFilters.query.toLowerCase();
      filtered = filtered.filter(
        report =>
          report.name.toLowerCase().includes(query) ||
          report.metadata?.title?.toLowerCase().includes(query) ||
          report.metadata?.description?.toLowerCase().includes(query) ||
          report.metadata?.author?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (viewState.sortOptions.field) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'uploadDate':
          aValue = a.uploadDate.getTime();
          bValue = b.uploadDate.getTime();
          break;
        case 'lastReadDate':
          aValue = a.lastReadDate?.getTime() || 0;
          bValue = b.lastReadDate?.getTime() || 0;
          break;
        case 'fileSize':
          aValue = a.fileSize;
          bValue = b.fileSize;
          break;
        case 'readingProgress':
          aValue = a.readingProgress;
          bValue = b.readingProgress;
          break;
        default:
          return 0;
      }

      if (aValue < bValue)
        return viewState.sortOptions.direction === 'asc' ? -1 : 1;
      if (aValue > bValue)
        return viewState.sortOptions.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [reports, viewState]);

  /**
   * Handle search input change
   */
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
    onViewStateChange({
      ...viewState,
      searchFilters: {
        ...viewState.searchFilters,
        query: value,
      },
    });
  };

  /**
   * Handle sort option change
   */
  const handleSortChange = (field: ReportSortOptions['field']) => {
    const newDirection =
      viewState.sortOptions.field === field &&
      viewState.sortOptions.direction === 'asc'
        ? 'desc'
        : 'asc';

    onViewStateChange({
      ...viewState,
      sortOptions: {
        field,
        direction: newDirection,
      },
    });
  };

  /**
   * Handle category filter change
   */
  const handleCategoryFilter = (categoryId: string | null) => {
    onViewStateChange({
      ...viewState,
      selectedCategoryId: categoryId || undefined,
    } as ReportListViewState);
  };

  /**
   * Handle report deletion
   */
  const handleReportDelete = async (reportId: string) => {
    console.log('🚀 handleReportDelete called with reportId:', reportId);
    console.log('🔧 onReportDelete available:', !!onReportDelete);

    if (!onReportDelete) {
      console.error('❌ onReportDelete is not available');
      return;
    }

    try {
      console.log('⏳ Setting deletingReportId:', reportId);
      setDeletingReportId(reportId);
      console.log('📡 Calling onReportDelete...');
      await onReportDelete(reportId);
      console.log('✅ onReportDelete completed successfully');
      // Success message will be handled by parent component
    } catch (error) {
      console.error('❌ Failed to delete report:', error);
      // Error message will be handled by parent component
    } finally {
      console.log('🔄 Clearing deletingReportId');
      setDeletingReportId(null);
    }
  };

  /**
   * Handle report rename
   */
  const handleReportRename = async (reportId: string) => {
    if (!onReportRename || !newName.trim()) return;

    try {
      await onReportRename(reportId, newName.trim());
      setRenamingReportId(null);
      setNewName('');
      // Success message will be handled by parent component
    } catch (error) {
      console.error('Failed to rename report:', error);
      // Error message will be handled by parent component
    }
  };

  /**
   * Start renaming a report
   */
  const startRenaming = (reportId: string, currentName: string) => {
    setRenamingReportId(reportId);
    setNewName(currentName);
  };

  /**
   * Cancel renaming
   */
  const cancelRenaming = () => {
    setRenamingReportId(null);
    setNewName('');
  };

  /**
   * Render report card
   */
  const renderReportCard = (report: Report) => {
    const category = getCategoryById(report.categoryId);
    const hasReadingProgress = report.readingProgress >= 0;
    const isRecentlyRead =
      report.lastReadDate &&
      Date.now() - report.lastReadDate.getTime() < 24 * 60 * 60 * 1000;

    // 截断标题，最长20字符
    const truncatedName =
      report.name.length > 20
        ? report.name.substring(0, 20) + '...'
        : report.name;

    /**
     * Handle download report
     */
    const handleDownload = async () => {
      try {
        // 从localStorage获取文件内容
        const content = localStorage.getItem(`rnd-report-content-${report.id}`);
        if (!content) {
          message.error('Report content not found');
          return;
        }

        // 创建blob
        const blob = new Blob([content], { type: 'text/html' });

        // 创建下载链接
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${report.name}.html`;

        // 触发下载
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // 清理URL
        URL.revokeObjectURL(url);

        message.success(`Downloaded ${report.name}.html`);
      } catch (error) {
        console.error('Download failed:', error);
        message.error('Failed to download report');
      }
    };

    const menuItems = [
      {
        key: 'open',
        icon: <EyeOutlined />,
        label: t('rndReport.list.actions.open'),
        onClick: () => onReportSelect(report.id),
      },
      {
        key: 'download',
        icon: <DownloadOutlined />,
        label: 'Download file',
        onClick: handleDownload,
      },
      {
        key: 'rename',
        icon: <EditOutlined />,
        label: t('rndReport.list.actions.rename'),
        onClick: () => startRenaming(report.id, report.name),
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: t('rndReport.list.actions.delete'),
        danger: true,
        disabled: deletingReportId === report.id,
        onClick: () => {
          console.log(
            '🗑️ Delete button clicked for report:',
            report.id,
            report.name
          );
          console.log('🔧 onReportDelete available:', !!onReportDelete);

          modal.confirm({
            title: t('rndReport.list.deleteConfirm.title'),
            content: t('rndReport.list.deleteConfirm.content', {
              name: report.name,
            }),
            okText: t('rndReport.list.deleteConfirm.okText'),
            cancelText: t('rndReport.list.deleteConfirm.cancelText'),
            okType: 'danger',
            onOk: () => {
              console.log('✅ Modal confirmed, calling handleReportDelete');
              handleReportDelete(report.id);
            },
            maskClosable: true,
          });
        },
      },
    ];

    return (
      <Card
        key={report.id}
        size='small'
        hoverable
        style={{
          cursor: 'pointer',
          backgroundColor: 'var(--card-color, #fafafa)',
          border: '1px solid var(--border-color, #e8e8e8)',
          position: 'relative',
          padding: '12px',
          marginBottom: '8px',
        }}
        styles={{
          body: {
            padding: 0,
            backgroundColor: 'transparent',
          },
        }}
        onClick={e => {
          // 只有在非按钮区域点击时才打开报告
          const target = e.target as HTMLElement;
          if (!target.closest('button') && !target.closest('.ant-dropdown')) {
            onReportSelect(report.id);
          }
        }}
      >
        {hasReadingProgress && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              zIndex: 10,
            }}
          >
            <div
              style={{
                backgroundColor:
                  report.readingProgress === 100
                    ? 'var(--color-text-secondary, #666)'
                    : 'var(--color-text-secondary, #999)',
                color: 'white',
                padding: '2px 6px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              {report.readingProgress}%
            </div>
            <Dropdown
              menu={{ items: menuItems }}
              trigger={['click']}
              placement='bottomRight'
            >
              <Button
                type='text'
                icon={<MoreOutlined />}
                onClick={e => e.stopPropagation()}
                style={{
                  border: 'none',
                  boxShadow: 'none',
                  padding: '4px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--color-bg-container, #f0f0f0)',
                }}
              />
            </Dropdown>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <Avatar
            icon={<FileTextOutlined />}
            size='small'
            style={{
              backgroundColor:
                category?.color || 'var(--color-text-secondary, #666)',
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ marginBottom: '4px' }}>
              {renamingReportId === report.id ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexWrap: 'wrap',
                  }}
                >
                  <Input
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onPressEnter={() => handleReportRename(report.id)}
                    onBlur={() => cancelRenaming()}
                    autoFocus
                    size='small'
                    style={{
                      flex: 1,
                      minWidth: '100px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                    }}
                    placeholder={t('rndReport.list.rename.placeholder')}
                  />
                  <Button
                    type='primary'
                    size='small'
                    onClick={() => handleReportRename(report.id)}
                    disabled={!newName.trim()}
                    style={{
                      fontSize: '12px',
                      padding: '0 8px',
                      height: '24px',
                    }}
                  >
                    {t('common.save')}
                  </Button>
                  <Button
                    size='small'
                    onClick={cancelRenaming}
                    style={{
                      fontSize: '12px',
                      padding: '0 8px',
                      height: '24px',
                    }}
                  >
                    {t('common.cancel')}
                  </Button>
                </div>
              ) : (
                <div>
                  <Tooltip
                    title={report.name.length > 20 ? report.name : undefined}
                  >
                    <Text
                      strong
                      style={{
                        fontSize: '14px',
                        display: 'block',
                        marginBottom: '2px',
                      }}
                    >
                      {truncatedName}
                    </Text>
                  </Tooltip>
                  {report.metadata?.title &&
                    report.metadata.title !== report.name && (
                      <Text
                        type='secondary'
                        style={{
                          fontSize: '11px',
                          display: 'block',
                          marginBottom: '2px',
                        }}
                      >
                        {report.metadata.title}
                      </Text>
                    )}
                </div>
              )}
            </div>

            <Space direction='vertical' size={2} style={{ width: '100%' }}>
              <Space size={4} wrap>
                {category && (
                  <Tag
                    color={category.color || 'default'}
                    style={{
                      fontSize: '10px',
                      padding: '0 4px',
                      height: '18px',
                      lineHeight: '16px',
                    }}
                  >
                    {category.name}
                  </Tag>
                )}
                <Text type='secondary' style={{ fontSize: '10px' }}>
                  {(() => {
                    const now = new Date();
                    const diffMs = now.getTime() - report.uploadDate.getTime();
                    const diffMinutes = Math.floor(diffMs / (1000 * 60));
                    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

                    if (diffMinutes < 1) return 'just now';
                    if (diffMinutes < 60) return `${diffMinutes}m ago`;
                    if (diffHours < 24) return `${diffHours}h ago`;
                    if (diffDays < 7) return `${diffDays}d ago`;
                    if (diffDays < 30)
                      return `${Math.floor(diffDays / 7)}w ago`;
                    if (diffDays < 365)
                      return `${Math.floor(diffDays / 30)}mo ago`;
                    return `${Math.floor(diffDays / 365)}y ago`;
                  })()}
                </Text>
                {isRecentlyRead && (
                  <Tag color='success'>
                    <ClockCircleOutlined style={{ marginRight: '2px' }} />
                    {t('rndReport.list.recentlyRead')}
                  </Tag>
                )}
                {report.metadata?.author && (
                  <Text type='secondary' style={{ fontSize: '10px' }}>
                    <UserOutlined
                      style={{ marginRight: '2px', fontSize: '10px' }}
                    />
                    {report.metadata.author}
                  </Text>
                )}
              </Space>

              {report.metadata?.description && (
                <Paragraph
                  ellipsis={{
                    rows: 2,
                    expandable: true,
                    symbol: t('common.more'),
                  }}
                  style={{
                    fontSize: '11px',
                    margin: '4px 0 0 0',
                    color: 'var(--text-color, #666)',
                  }}
                >
                  {report.metadata.description}
                </Paragraph>
              )}
            </Space>
          </div>
        </div>
      </Card>
    );
  };

  /**
   * Get sort button icon
   */
  const getSortIcon = (field: ReportSortOptions['field']) => {
    if (viewState.sortOptions.field !== field) {
      return <SortAscendingOutlined />;
    }
    return viewState.sortOptions.direction === 'asc' ? (
      <SortAscendingOutlined />
    ) : (
      <SortDescendingOutlined />
    );
  };

  return (
    <div className={className}>
      <Space direction='vertical' size='middle' style={{ width: '100%' }}>
        {/* Filters and Search */}
        <Card size='small'>
          <Space style={{ width: '100%', alignItems: 'center' }}>
            {/* Category Tags */}
            <Space wrap size={4} style={{ flex: 1 }}>
              {categories.map(category => {
                const reportCount = getCategoryStats.get(category.id) || 0;
                const isSelected = viewState.selectedCategoryId === category.id;
                return (
                  <Tag.CheckableTag
                    key={category.id}
                    checked={isSelected}
                    onChange={() =>
                      handleCategoryFilter(isSelected ? null : category.id)
                    }
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isSelected
                        ? 'var(--color-text-secondary, #666)'
                        : 'transparent',
                      color: isSelected
                        ? 'var(--color-white, white)'
                        : 'inherit',
                      borderColor: 'var(--color-text-secondary, #666)',
                    }}
                  >
                    {category.name} ({reportCount})
                  </Tag.CheckableTag>
                );
              })}
            </Space>

            {/* Short Search Bar */}
            <div style={{ marginLeft: '24px', marginRight: '24px' }}>
              <Input
                placeholder={t('rndReport.list.search.placeholder')}
                prefix={<SearchOutlined />}
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                onPressEnter={() => handleSearchChange(searchInput)}
                allowClear
                style={{ width: '200px' }}
                size='small'
              />
            </div>

            {/* Sort Dropdown */}
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'name',
                    icon: getSortIcon('name'),
                    label: t('rndReport.list.sort.name'),
                    onClick: () => handleSortChange('name'),
                  },
                  {
                    key: 'uploadDate',
                    icon: getSortIcon('uploadDate'),
                    label: t('rndReport.list.sort.date'),
                    onClick: () => handleSortChange('uploadDate'),
                  },
                  {
                    key: 'readingProgress',
                    icon: getSortIcon('readingProgress'),
                    label: t('rndReport.list.sort.readingProgress'),
                    onClick: () => handleSortChange('readingProgress'),
                  },
                ],
                selectedKeys: [viewState.sortOptions.field],
              }}
              trigger={['click']}
              placement='bottomRight'
            >
              <Button type='default' size='small'>
                <Space>
                  {getSortIcon(viewState.sortOptions.field)}
                  {t('rndReport.list.sort.title')}
                  <SortAscendingOutlined />
                </Space>
              </Button>
            </Dropdown>
          </Space>
        </Card>

        {/* Report Cards Grid */}
        {processedReports.length === 0 ? (
          <Card size='small'>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                viewState.searchFilters.query || viewState.selectedCategoryId
                  ? t('rndReport.list.noResults')
                  : t('rndReport.list.noReports')
              }
            >
              {(viewState.searchFilters.query ||
                viewState.selectedCategoryId) && (
                <Button
                  type='default'
                  onClick={() => {
                    setSearchInput('');
                    onViewStateChange({
                      ...viewState,
                      searchFilters: {},
                    } as ReportListViewState);
                  }}
                  style={{
                    backgroundColor: 'var(--color-text-secondary, #666)',
                    borderColor: 'var(--color-text-secondary, #666)',
                    color: 'var(--color-white, white)',
                  }}
                >
                  {t('rndReport.list.clearFilters')}
                </Button>
              )}
            </Empty>
          </Card>
        ) : (
          <>
            {/* Report Cards Grid */}
            <div style={{ position: 'relative' }}>
              {loading && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background:
                      'var(--color-bg-loading, rgba(255, 255, 255, 0.8))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10,
                  }}
                >
                  <Text>{t('common.loading')}</Text>
                </div>
              )}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                  gap: '16px',
                  width: '100%',
                }}
              >
                {processedReports.map(report => renderReportCard(report))}
              </div>
            </div>

            {/* Results Summary */}
            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <Text type='secondary'>
                {t('rndReport.list.results', {
                  shown: processedReports.length,
                  total: reports.length,
                })}
              </Text>
            </div>
          </>
        )}
      </Space>
    </div>
  );
};

export default ReportList;
