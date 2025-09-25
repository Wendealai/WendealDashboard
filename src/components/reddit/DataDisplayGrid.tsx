import React, { useState, useEffect, useMemo } from 'react';
import {
  Table,
  Card,
  Space,
  Button,
  Input,
  Select,
  DatePicker,
  Tag,
  Avatar,
  Tooltip,
  Typography,
  Row,
  Col,
  Statistic,
  Badge,
  Dropdown,
  Menu,
  Modal,
  Alert,
  Result,
} from 'antd';
import { useTranslation } from 'react-i18next';
import type { ColumnsType, TableProps } from 'antd/es/table';
import {
  FilterOutlined,
  ExportOutlined,
  ReloadOutlined,
  EyeOutlined,
  LinkOutlined,
  HeartOutlined,
  MessageOutlined,
  ShareAltOutlined,
  MoreOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchRedditPosts,
  searchRedditPosts,
  setDataFilters,
  setDataSort,
  setCurrentPage,
  setPageSize,
  clearDataError,
  selectRedditWorkflow,
} from '../../store';
import type {
  RedditPost,
  RedditDataFilter,
  RedditDataSort,
} from '../../types/reddit';
import { useNotifications } from '../../hooks/useNotifications';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { Text, Link } = Typography;

export interface DataDisplayGridProps {
  /** 是否显示统计信息 */
  showStats?: boolean;
  /** 是否显示操作按钮 */
  showActions?: boolean;
  /** 自定义高度 */
  height?: number;
}

/**
 * Reddit数据展示网格组件
 * 提供Reddit帖子的表格展示、排序、筛选、分页等功能
 */
const DataDisplayGrid: React.FC<DataDisplayGridProps> = ({
  showStats = true,
  showActions = true,
  height,
}) => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const {
    data: { posts, filters, sort, pagination, loading, error },
  } = useAppSelector(selectRedditWorkflow);
  const { current, pageSize, total } = pagination;
  const filter = filters;

  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedPost, setSelectedPost] = useState<RedditPost | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  // 使用通知系统
  const { addNotification } = useNotifications();

  // 组件挂载时获取数据
  useEffect(() => {
    handleFetchData();
  }, [dispatch, current, pageSize, filter, sort]);

  // 监听错误状态变化
  useEffect(() => {
    if (error && error !== lastError) {
      setLastError(error);
      addNotification({
        type: 'error',
        title: t('reddit.errors.fetchFailed'),
        content: error,
        read: false,
        category: 'error',
        priority: 'high',
      });
    }
  }, [error, lastError, addNotification, t]);

  /**
   * 获取数据的统一方法
   * 包含错误处理和重试逻辑
   */
  const handleFetchData = async () => {
    try {
      const result = await dispatch(
        fetchRedditPosts({ page: current, pageSize, filter, sort })
      );

      if (fetchRedditPosts.fulfilled.match(result)) {
        // 成功获取数据
        setRetryCount(0);
        if (lastError) {
          setLastError(null);
          addNotification({
            type: 'success',
            title: t('reddit.messages.dataRefreshed'),
            message: t('reddit.messages.dataFetchSuccess'),
            duration: 3000,
          });
        }
      } else if (fetchRedditPosts.rejected.match(result)) {
        // 处理获取失败
        const errorMessage =
          (result.payload as string) || t('reddit.errors.unknownError');
        setLastError(errorMessage);

        // 自动重试逻辑（最多3次）
        if (retryCount < 3) {
          setTimeout(
            () => {
              setRetryCount(prev => prev + 1);
              handleFetchData();
            },
            2000 * (retryCount + 1)
          ); // 递增延迟

          addNotification({
            type: 'warning',
            title: t('reddit.errors.retrying'),
            message: t('reddit.messages.autoRetry', { count: retryCount + 1 }),
            duration: 3000,
          });
        }
      }
    } catch (err) {
      console.error('Unexpected error in handleFetchData:', err);
      setLastError(t('reddit.errors.unexpectedError'));
    }
  };

  /**
   * 处理搜索
   * @param value 搜索关键词
   */
  const handleSearch = async (value: string) => {
    try {
      let result;
      if (value.trim()) {
        result = await dispatch(
          searchRedditPosts({ query: value, filter, sort })
        );

        if (searchRedditPosts.fulfilled.match(result)) {
          addNotification({
            type: 'info',
            title: t('reddit.messages.searchCompleted'),
            message: t('reddit.messages.searchResults', {
              count: result.payload.total,
              query: value,
            }),
            duration: 3000,
          });
        }
      } else {
        result = await dispatch(
          fetchRedditPosts({ page: 1, pageSize, filter, sort })
        );
      }

      if (result.type.endsWith('/rejected')) {
        const errorMessage =
          (result.payload as string) || t('reddit.errors.searchFailed');
        addNotification({
          type: 'error',
          title: t('reddit.errors.searchFailed'),
          message: errorMessage,
          duration: 5000,
        });
      }
    } catch (err) {
      console.error('Search error:', err);
      addNotification({
        type: 'error',
        title: t('reddit.errors.searchFailed'),
        message: t('reddit.errors.unexpectedError'),
        duration: 5000,
      });
    }
  };

  /**
   * 处理筛选变更
   * @param key 筛选字段
   * @param value 筛选值
   */
  const handleFilterChange = (key: keyof RedditDataFilter, value: any) => {
    const newFilter = { ...filter, [key]: value };
    dispatch(setDataFilters(newFilter));
  };

  /**
   * 处理排序变更
   * @param field 排序字段
   * @param order 排序方向
   */
  const handleSortChange = (
    field: keyof RedditDataSort,
    order: 'asc' | 'desc'
  ) => {
    const newSort = { ...sort, [field]: order };
    dispatch(setDataSort(newSort));
  };

  /**
   * 处理分页变更
   * @param page 页码
   * @param size 页面大小
   */
  const handlePaginationChange = (page: number, size?: number) => {
    dispatch(setCurrentPage(page));
    if (size && size !== pageSize) {
      dispatch(setPageSize(size));
    }
  };

  /**
   * 刷新数据
   */
  const handleRefresh = () => {
    // 清除之前的错误状态
    if (error) {
      dispatch(clearDataError());
      setLastError(null);
    }
    setRetryCount(0);

    addNotification({
      type: 'info',
      title: t('reddit.messages.refreshing'),
      message: t('reddit.messages.refreshingData'),
      duration: 2000,
    });

    handleFetchData();
  };

  /**
   * 手动重试
   */
  const handleRetry = () => {
    setRetryCount(0);
    if (error) {
      dispatch(clearDataError());
      setLastError(null);
    }
    handleFetchData();
  };

  /**
   * 查看帖子详情
   * @param post Reddit帖子
   */
  const handleViewDetail = (post: RedditPost) => {
    setSelectedPost(post);
    setDetailModalVisible(true);
  };

  /**
   * 打开Reddit链接
   * @param url Reddit链接
   */
  const handleOpenRedditLink = (url: string) => {
    try {
      window.open(url, '_blank');
      addNotification({
        type: 'success',
        title: t('reddit.messages.linkOpened'),
        message: t('reddit.messages.redirectingToReddit'),
        duration: 2000,
      });
    } catch (err) {
      addNotification({
        type: 'error',
        title: t('reddit.errors.linkOpenFailed'),
        message: t('reddit.errors.browserBlocked'),
        duration: 4000,
      });
    }
  };

  /**
   * 导出数据
   */
  const handleExport = async () => {
    try {
      addNotification({
        type: 'info',
        title: t('reddit.messages.exportStarted'),
        message: t('reddit.messages.exportInProgress'),
        duration: 3000,
      });

      // TODO: 实现数据导出功能
      // 模拟导出过程
      await new Promise(resolve => setTimeout(resolve, 1000));

      addNotification({
        type: 'warning',
        title: t('reddit.messages.exportInDevelopment'),
        message: t('reddit.messages.featureComingSoon'),
        duration: 4000,
      });
    } catch (err) {
      addNotification({
        type: 'error',
        title: t('reddit.errors.exportFailed'),
        message: t('reddit.errors.unexpectedError'),
        duration: 5000,
      });
    }
  };

  /**
   * 格式化数字显示
   * @param num 数字
   * @returns 格式化后的字符串
   */
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  /**
   * 获取subreddit颜色
   * @param subreddit subreddit名称
   * @returns 颜色值
   */
  const getSubredditColor = (subreddit: string): string => {
    const colors = ['blue', 'green', 'orange', 'red', 'purple', 'cyan'];
    const index = subreddit.length % colors.length;
    return colors[index] || 'blue';
  };

  // 表格列定义
  const columns: ColumnsType<RedditPost> = [
    {
      title: t('reddit.posts.title'),
      dataIndex: 'title',
      key: 'title',
      width: 300,
      ellipsis: {
        showTitle: false,
      },
      render: (title: string, record: RedditPost) => (
        <Tooltip title={title}>
          <div>
            <Link
              onClick={() => handleViewDetail(record)}
              style={{ fontWeight: 500 }}
            >
              {title}
            </Link>
            {record.stickied && (
              <Tag color='gold' style={{ marginLeft: 8 }}>
                {t('reddit.posts.pinned')}
              </Tag>
            )}
            {record.nsfw && (
              <Tag color='red' style={{ marginLeft: 4 }}>
                NSFW
              </Tag>
            )}
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Subreddit',
      dataIndex: 'subreddit',
      key: 'subreddit',
      width: 120,
      render: (subreddit: string) => (
        <Tag color={getSubredditColor(subreddit)}>r/{subreddit}</Tag>
      ),
      filters: [
        { text: 'popular', value: 'popular' },
        { text: 'programming', value: 'programming' },
        { text: 'technology', value: 'technology' },
        { text: 'news', value: 'news' },
      ],
      onFilter: (value, record) => record.subreddit === value,
    },
    {
      title: t('reddit.posts.author'),
      dataIndex: 'author',
      key: 'author',
      width: 120,
      render: (author: string) => (
        <Space>
          <Avatar size='small'>{author.charAt(0).toUpperCase()}</Avatar>
          <Text>{author}</Text>
        </Space>
      ),
    },
    {
      title: t('reddit.posts.score'),
      dataIndex: 'score',
      key: 'score',
      width: 80,
      align: 'center',
      sorter: true,
      render: (score: number) => (
        <Badge
          count={formatNumber(score)}
          style={{
            backgroundColor: score > 1000 ? '#52c41a' : '#1890ff',
          }}
        />
      ),
    },
    {
      title: t('reddit.posts.comments'),
      dataIndex: 'numComments',
      key: 'numComments',
      width: 80,
      align: 'center',
      sorter: true,
      render: (numComments: number) => (
        <Space>
          <MessageOutlined />
          <Text>{formatNumber(numComments)}</Text>
        </Space>
      ),
    },
    {
      title: t('reddit.posts.created'),
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      sorter: true,
      render: (createdAt: string) => (
        <Tooltip title={dayjs(createdAt).format('YYYY-MM-DD HH:mm:ss')}>
          <Text>{dayjs(createdAt).fromNow()}</Text>
        </Tooltip>
      ),
    },
    {
      title: t('reddit.actions.title'),
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record: RedditPost) => (
        <Space>
          <Tooltip title={t('reddit.actions.viewDetail')}>
            <Button
              type='text'
              icon={<EyeOutlined />}
              onClick={() => handleViewDetail(record)}
            />
          </Tooltip>
          <Tooltip title={t('reddit.actions.openRedditLink')}>
            <Button
              type='text'
              icon={<LinkOutlined />}
              onClick={() => handleOpenRedditLink(record.url)}
            />
          </Tooltip>
          <Dropdown
            overlay={
              <Menu>
                <Menu.Item key='share' icon={<ShareAltOutlined />}>
                  {t('reddit.actions.share')}
                </Menu.Item>
                <Menu.Item key='favorite' icon={<HeartOutlined />}>
                  {t('reddit.actions.favorite')}
                </Menu.Item>
              </Menu>
            }
          >
            <Button type='text' icon={<MoreOutlined />} />
          </Dropdown>
        </Space>
      ),
    },
  ];

  // 行选择配置
  const rowSelection: TableProps<RedditPost>['rowSelection'] = {
    selectedRowKeys,
    onChange: setSelectedRowKeys,
    selections: [
      Table.SELECTION_ALL,
      Table.SELECTION_INVERT,
      Table.SELECTION_NONE,
    ],
  };

  // 统计数据
  const stats = useMemo(() => {
    const totalScore = posts.reduce((sum, post) => sum + post.score, 0);
    const totalComments = posts.reduce(
      (sum, post) => sum + post.numComments,
      0
    );
    const avgScore =
      posts.length > 0 ? Math.round(totalScore / posts.length) : 0;
    const subreddits = new Set(posts.map(post => post.subreddit)).size;

    return {
      totalPosts: posts.length,
      totalScore,
      totalComments,
      avgScore,
      subreddits,
    };
  }, [posts]);

  return (
    <div>
      {/* 错误状态显示 */}
      {error && (
        <Alert
          message={t('reddit.errors.dataLoadError')}
          description={
            <div>
              <div style={{ marginBottom: 8 }}>{error}</div>
              <Space>
                <Button
                  size='small'
                  type='primary'
                  icon={<ReloadOutlined />}
                  onClick={handleRetry}
                  loading={loading}
                >
                  {t('reddit.actions.retry')}
                </Button>
                <Button
                  size='small'
                  onClick={() => {
                    dispatch(clearDataError());
                    setLastError(null);
                  }}
                >
                  {t('reddit.actions.dismiss')}
                </Button>
              </Space>
            </div>
          }
          type='error'
          showIcon
          closable
          onClose={() => {
            dispatch(clearDataError());
            setLastError(null);
          }}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 重试状态显示 */}
      {retryCount > 0 && !error && (
        <Alert
          message={t('reddit.messages.retrying')}
          description={t('reddit.messages.autoRetryInProgress', {
            count: retryCount,
          })}
          type='warning'
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 统计信息 */}
      {showStats && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={4}>
            <Card size='small'>
              <Statistic
                title={t('reddit.overview.totalPosts')}
                value={stats.totalPosts}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size='small'>
              <Statistic
                title={t('reddit.overview.totalScore')}
                value={formatNumber(stats.totalScore)}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size='small'>
              <Statistic
                title={t('reddit.overview.totalComments')}
                value={formatNumber(stats.totalComments)}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size='small'>
              <Statistic
                title={t('reddit.overview.avgScore')}
                value={stats.avgScore}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size='small'>
              <Statistic
                title={t('reddit.overview.subreddits')}
                value={stats.subreddits}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card size='small'>
              <Statistic
                title={t('reddit.overview.selected')}
                value={selectedRowKeys.length}
                suffix={`/ ${posts.length}`}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 操作栏 */}
      {showActions && (
        <Card size='small' style={{ marginBottom: 16 }}>
          <Row gutter={16} align='middle'>
            <Col flex='auto'>
              <Space>
                <Search
                  placeholder={t('reddit.search.placeholder')}
                  allowClear
                  onSearch={handleSearch}
                  style={{ width: 300 }}
                />
                <Select
                  placeholder={t('reddit.filters.selectSubreddit')}
                  allowClear
                  style={{ width: 150 }}
                  onChange={value =>
                    handleFilterChange('subreddits', value ? [value] : [])
                  }
                >
                  <Option value='popular'>popular</Option>
                  <Option value='programming'>programming</Option>
                  <Option value='technology'>technology</Option>
                  <Option value='news'>news</Option>
                </Select>
                <Select
                  placeholder={t('reddit.filters.sortBy')}
                  defaultValue='score'
                  style={{ width: 120 }}
                  onChange={value =>
                    handleSortChange(
                      'field' as keyof RedditDataSort,
                      value as 'asc' | 'desc'
                    )
                  }
                >
                  <Option value='score'>{t('reddit.posts.score')}</Option>
                  <Option value='numComments'>
                    {t('reddit.posts.comments')}
                  </Option>
                  <Option value='createdAt'>{t('reddit.posts.created')}</Option>
                </Select>
                <RangePicker
                  placeholder={[
                    t('reddit.filters.startTime'),
                    t('reddit.filters.endTime'),
                  ]}
                  onChange={dates => {
                    if (dates) {
                      handleFilterChange('dateRange', [
                        dates[0]?.toISOString(),
                        dates[1]?.toISOString(),
                      ]);
                    } else {
                      handleFilterChange('dateRange', undefined);
                    }
                  }}
                />
              </Space>
            </Col>
            <Col>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleRefresh}
                  loading={loading}
                >
                  {t('reddit.actions.refresh')}
                </Button>
                <Button
                  icon={<FilterOutlined />}
                  disabled={selectedRowKeys.length === 0}
                >
                  {t('reddit.actions.batchOperation')}
                </Button>
                <Button icon={<ExportOutlined />} onClick={handleExport}>
                  {t('reddit.actions.export')}
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* 数据表格 */}
      <Card>
        {/* 空状态或错误状态 */}
        {!loading && !error && posts.length === 0 && (
          <Result
            icon={<ExclamationCircleOutlined />}
            title={t('reddit.messages.noData')}
            subTitle={t('reddit.messages.noDataDescription')}
            extra={
              <Button
                type='primary'
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
              >
                {t('reddit.actions.refresh')}
              </Button>
            }
          />
        )}

        {/* 严重错误状态 */}
        {error && posts.length === 0 && (
          <Result
            status='error'
            title={t('reddit.errors.loadFailed')}
            subTitle={error}
            extra={[
              <Button
                type='primary'
                icon={<ReloadOutlined />}
                onClick={handleRetry}
                key='retry'
              >
                {t('reddit.actions.retry')}
              </Button>,
              <Button onClick={handleRefresh} key='refresh'>
                {t('reddit.actions.refresh')}
              </Button>,
            ]}
          />
        )}

        {/* 正常数据表格 */}
        {(posts.length > 0 || loading) && (
          <Table<RedditPost>
            columns={columns}
            dataSource={posts}
            rowKey='id'
            rowSelection={rowSelection}
            loading={{
              spinning: loading,
              tip:
                retryCount > 0
                  ? t('reddit.messages.retryingData', { count: retryCount })
                  : t('reddit.messages.loadingData'),
            }}
            scroll={{ x: 1200, y: height || 400 }}
            pagination={{
              current,
              pageSize,
              total,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                t('reddit.pagination.showTotal', {
                  start: range[0],
                  end: range[1],
                  total,
                }),
              onChange: handlePaginationChange,
              onShowSizeChange: handlePaginationChange,
            }}
            onChange={(_, __, sorter) => {
              // 处理表格排序
              if (sorter && !Array.isArray(sorter) && sorter.order) {
                const field = sorter.field as keyof RedditDataSort;
                const order = sorter.order === 'ascend' ? 'asc' : 'desc';
                handleSortChange(field, order);
              }
            }}
            locale={{
              emptyText: (
                <div style={{ padding: '20px 0' }}>
                  <ExclamationCircleOutlined
                    style={{ fontSize: 24, color: '#d9d9d9', marginBottom: 8 }}
                  />
                  <div>{t('reddit.messages.noDataFound')}</div>
                </div>
              ),
            }}
          />
        )}
      </Card>

      {/* 详情模态框 */}
      <Modal
        title={t('reddit.modal.postDetail')}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key='close' onClick={() => setDetailModalVisible(false)}>
            {t('reddit.actions.close')}
          </Button>,
          <Button
            key='reddit'
            type='primary'
            icon={<LinkOutlined />}
            onClick={() =>
              selectedPost && handleOpenRedditLink(selectedPost.url)
            }
          >
            {t('reddit.actions.viewOnReddit')}
          </Button>,
        ]}
        width={800}
      >
        {selectedPost && (
          <div>
            <Space direction='vertical' size='middle' style={{ width: '100%' }}>
              <div>
                <Text strong>{t('reddit.posts.title')}：</Text>
                <Text>{selectedPost.title}</Text>
              </div>
              <div>
                <Text strong>{t('reddit.posts.author')}：</Text>
                <Space>
                  <Avatar size='small'>
                    {selectedPost.author.charAt(0).toUpperCase()}
                  </Avatar>
                  <Text>{selectedPost.author}</Text>
                </Space>
              </div>
              <div>
                <Text strong>Subreddit：</Text>
                <Tag color={getSubredditColor(selectedPost.subreddit)}>
                  r/{selectedPost.subreddit}
                </Tag>
              </div>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title={t('reddit.posts.score')}
                    value={selectedPost.score}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={t('reddit.posts.comments')}
                    value={selectedPost.numComments}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={t('reddit.posts.created')}
                    value={dayjs(selectedPost.createdAt).format('MM-DD HH:mm')}
                  />
                </Col>
              </Row>
              {selectedPost.content && (
                <div>
                  <Text strong>{t('reddit.modal.content')}：</Text>
                  <div
                    style={{
                      marginTop: 8,
                      padding: 12,
                      backgroundColor: '#f5f5f5',
                      borderRadius: 4,
                      maxHeight: 300,
                      overflowY: 'auto',
                    }}
                  >
                    <Text>{selectedPost.content}</Text>
                  </div>
                </div>
              )}
              {selectedPost.thumbnail && (
                <div>
                  <Text strong>{t('reddit.modal.thumbnail')}：</Text>
                  <div style={{ marginTop: 8 }}>
                    <img
                      src={selectedPost.thumbnail}
                      alt='thumbnail'
                      style={{ maxWidth: '100%', maxHeight: 200 }}
                    />
                  </div>
                </div>
              )}
            </Space>
          </div>
        )}
      </Modal>
    </div>
  );
};

export { DataDisplayGrid as default };
export { DataDisplayGrid };
