/**
 * Notification Item Component
 * Individual notification display with rich content support
 */

import React from 'react';
import type { Notification } from '@/types/notification';
import {
  NotificationType,
  NotificationPriority,
  NotificationStatus,
} from '@/types/notification';

interface NotificationItemProps {
  notification: Notification;
  onClick?: ((notification: Notification) => void) | undefined;
  onRead?: (notificationId: string) => void;
  onArchive?: (notificationId: string) => void;
  onAction?: (actionId: string, notification: Notification) => void;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onClick,
  onRead,
  onArchive,
  onAction,
  showActions = true,
  compact = false,
  className = '',
}) => {
  const handleClick = () => {
    if (notification.status === NotificationStatus.UNREAD && onRead) {
      onRead(notification.id);
    }
    if (onClick) {
      onClick(notification);
    }
  };

  const handleAction = (actionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAction) {
      onAction(actionId, notification);
    }
  };

  const getPriorityColor = (priority: NotificationPriority) => {
    switch (priority) {
      case NotificationPriority.URGENT:
        return 'border-l-red-500 bg-red-50 dark:bg-red-950/20';
      case NotificationPriority.HIGH:
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20';
      case NotificationPriority.NORMAL:
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20';
      case NotificationPriority.LOW:
        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-950/20';
      default:
        return 'border-l-gray-300 bg-white dark:bg-gray-900';
    }
  };

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.SUCCESS:
        return '✅';
      case NotificationType.ERROR:
        return '❌';
      case NotificationType.WARNING:
        return '⚠️';
      case NotificationType.INFO:
        return 'ℹ️';
      case NotificationType.SYSTEM:
        return '🔧';
      default:
        return '📩';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={`
        relative border-l-4 p-4 cursor-pointer transition-all duration-200 hover:shadow-md
        ${getPriorityColor(notification.priority)}
        ${notification.status === NotificationStatus.UNREAD ? 'font-semibold' : 'font-normal'}
        ${compact ? 'py-2' : 'py-4'}
        ${className}
      `}
      onClick={handleClick}
      role='button'
      tabIndex={0}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
      aria-label={`Notification: ${notification.title}`}
    >
      {/* Status Indicator */}
      {notification.status === NotificationStatus.UNREAD && (
        <div className='absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full' />
      )}

      <div className='flex items-start space-x-3'>
        {/* Icon */}
        <div
          className='flex-shrink-0 text-lg'
          role='img'
          aria-label={notification.type}
        >
          {notification.metadata.icon || getTypeIcon(notification.type)}
        </div>

        {/* Content */}
        <div className='flex-1 min-w-0'>
          <div className='flex items-center justify-between'>
            <h3
              className={`text-sm truncate ${compact ? 'text-xs' : 'text-sm'}`}
            >
              {notification.title}
            </h3>
            <span
              className={`text-xs text-gray-500 ${compact ? 'hidden' : ''}`}
            >
              {formatTime(notification.createdAt)}
            </span>
          </div>

          {!compact && (
            <p className='text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2'>
              {notification.content}
            </p>
          )}

          {/* Metadata */}
          {notification.metadata.tags &&
            notification.metadata.tags.length > 0 && (
              <div className='flex flex-wrap gap-1 mt-2'>
                {notification.metadata.tags.slice(0, 3).map((tag, index) => (
                  <span
                    key={index}
                    className='inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
                  >
                    {tag}
                  </span>
                ))}
                {notification.metadata.tags.length > 3 && (
                  <span className='text-xs text-gray-500'>
                    +{notification.metadata.tags.length - 3} more
                  </span>
                )}
              </div>
            )}

          {/* Actions */}
          {showActions && notification.actions.length > 0 && (
            <div className='flex flex-wrap gap-2 mt-3'>
              {notification.actions.slice(0, compact ? 2 : 3).map(action => (
                <button
                  key={action.id}
                  onClick={e => handleAction(action.id, e)}
                  className={`
                    px-3 py-1 text-xs font-medium rounded-md transition-colors duration-200
                    ${
                      action.type === 'primary'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : action.type === 'danger'
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  {action.label}
                </button>
              ))}
              {notification.actions.length > (compact ? 2 : 3) && (
                <span className='text-xs text-gray-500 self-center'>
                  +{notification.actions.length - (compact ? 2 : 3)} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {showActions && !compact && (
        <div className='absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200'>
          <div className='flex space-x-1'>
            {notification.status === NotificationStatus.UNREAD && onRead && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onRead(notification.id);
                }}
                className='p-1 text-gray-400 hover:text-blue-600 transition-colors duration-200'
                title='Mark as read'
                aria-label='Mark as read'
              >
                <svg
                  className='w-4 h-4'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M5 13l4 4L19 7'
                  />
                </svg>
              </button>
            )}
            {onArchive && (
              <button
                onClick={e => {
                  e.stopPropagation();
                  onArchive(notification.id);
                }}
                className='p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200'
                title='Archive'
                aria-label='Archive notification'
              >
                <svg
                  className='w-4 h-4'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4'
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationItem;
