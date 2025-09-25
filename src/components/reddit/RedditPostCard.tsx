import React from 'react';
import {
  Card,
  Typography,
  Tag,
  Space,
  Button,
  Avatar,
  Tooltip,
  Divider,
} from 'antd';
import {
  LikeOutlined,
  CommentOutlined,
  ShareAltOutlined,
  LinkOutlined,
  UserOutlined,
  ClockCircleOutlined,
  FireOutlined,
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import type { RedditPost } from '../../types/reddit';

const { Title, Text, Paragraph } = Typography;

/**
 * Reddit帖子卡片组件的属性接口
 */
export interface RedditPostCardProps {
  /** Reddit帖子数据 */
  post: RedditPost;
  /** 是否显示完整内容 */
  showFullContent?: boolean;
  /** 点击卡片时的回调函数 */
  onClick?: (post: RedditPost) => void;
  /** 点击外部链接时的回调函数 */
  onExternalLinkClick?: (url: string) => void;
  /** 卡片样式类名 */
  className?: string;
}

/**
 * Reddit帖子卡片组件
 * 用于展示单个Reddit帖子的详细信息，包括标题、内容、作者、统计数据等
 */
const RedditPostCard: React.FC<RedditPostCardProps> = ({
  post,
  showFullContent = false,
  onClick,
  onExternalLinkClick,
  className,
}) => {
  const { t } = useTranslation();
  /**
   * 格式化数字显示（如点赞数、评论数）
   * @param num 要格式化的数字
   * @returns 格式化后的字符串
   */
  const formatNumber = (num: number): string => {
    if (!num || isNaN(num)) {
      return '0';
    }
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  /**
   * 格式化时间显示
   * @param timestamp 时间戳
   * @returns 格式化后的时间字符串
   */
  const formatTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp * 1000;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return t('redditWorkflow.time.daysAgo', { count: days });
    }
    if (hours > 0) {
      return t('redditWorkflow.time.hoursAgo', { count: hours });
    }
    return t('redditWorkflow.time.justNow');
  };

  /**
   * 获取热度标签颜色
   * @param score 帖子分数
   * @returns 标签颜色
   */
  const getHotColor = (score: number): string => {
    if (score >= 10000) return 'red';
    if (score >= 5000) return 'orange';
    if (score >= 1000) return 'gold';
    return 'green';
  };

  /**
   * 处理卡片点击事件
   */
  const handleCardClick = () => {
    if (onClick) {
      onClick(post);
    }
  };

  /**
   * 处理外部链接点击事件
   * @param e 点击事件
   */
  const handleExternalLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onExternalLinkClick && post.url) {
      onExternalLinkClick(post.url);
    } else if (post.url) {
      window.open(post.url, '_blank');
    }
  };

  /**
   * 处理分享按钮点击事件
   * @param e 点击事件
   */
  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `https://reddit.com${post.permalink}`;
    if (navigator.share) {
      navigator.share({
        title: post.title,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      // 这里可以添加一个提示消息
    }
  };

  return (
    <Card
      className={className || ''}
      hoverable
      onClick={handleCardClick}
      style={{ marginBottom: 16, cursor: onClick ? 'pointer' : 'default' }}
      actions={[
        <Tooltip title={t('redditWorkflow.posts.upvotes')} key='upvotes'>
          <Space>
            <LikeOutlined />
            <Text>{formatNumber(post.score)}</Text>
          </Space>
        </Tooltip>,
        <Tooltip title={t('redditWorkflow.posts.comments')} key='comments'>
          <Space>
            <CommentOutlined />
            <Text>{formatNumber(post.numComments)}</Text>
          </Space>
        </Tooltip>,
        <Tooltip title={t('redditWorkflow.actions.share')} key='share'>
          <Button
            type='text'
            icon={<ShareAltOutlined />}
            onClick={handleShareClick}
          />
        </Tooltip>,
        post.url && (
          <Tooltip
            title={t('redditWorkflow.actions.viewOriginal')}
            key='external'
          >
            <Button
              type='text'
              icon={<LinkOutlined />}
              onClick={handleExternalLinkClick}
            />
          </Tooltip>
        ),
      ].filter(Boolean)}
    >
      {/* 帖子头部信息 */}
      <div style={{ marginBottom: 12 }}>
        <Space split={<Divider type='vertical' />}>
          <Space>
            <Avatar size='small' icon={<UserOutlined />} />
            <Text strong>{post.author}</Text>
          </Space>
          <Space>
            <ClockCircleOutlined />
            <Text type='secondary'>{formatTime(post.createdUtc)}</Text>
          </Space>
          <Tag color={getHotColor(post.score)}>
            <FireOutlined /> {formatNumber(post.score)}
          </Tag>
          <Tag color='blue'>r/{post.subreddit}</Tag>
        </Space>
      </div>

      {/* 帖子标题 */}
      <Title level={4} style={{ marginBottom: 12, lineHeight: 1.4 }}>
        {post.title}
      </Title>

      {/* 帖子内容 */}
      {post.content && (
        <Paragraph
          ellipsis={showFullContent ? false : { rows: 3, expandable: true }}
          style={{ marginBottom: 12 }}
        >
          {post.content}
        </Paragraph>
      )}

      {/* 帖子缩略图或媒体 */}
      {post.thumbnail &&
        post.thumbnail !== 'self' &&
        post.thumbnail !== 'default' && (
          <div style={{ marginBottom: 12 }}>
            <img
              src={post.thumbnail}
              alt='Post thumbnail'
              style={{
                maxWidth: '100%',
                maxHeight: 200,
                objectFit: 'cover',
                borderRadius: 4,
              }}
            />
          </div>
        )}

      {/* 帖子标签 */}
      <div style={{ marginTop: 12 }}>
        <Space wrap>
          {post.linkFlairText && <Tag color='purple'>{post.linkFlairText}</Tag>}
          {post.over18 && <Tag color='red'>NSFW</Tag>}
          {post.stickied && (
            <Tag color='green'>{t('redditWorkflow.posts.pinned')}</Tag>
          )}
        </Space>
      </div>
    </Card>
  );
};

export { RedditPostCard as default };
export { RedditPostCard };
