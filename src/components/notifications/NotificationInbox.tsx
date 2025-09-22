/**
 * Notification Inbox Component
 * Main notification center interface with Novu integration
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { notificationService } from '@/services/notificationService';
import type {
  Notification,
  NotificationFilter,
  NotificationListResponse,
  NotificationObserver,
  NotificationSettings,
} from '@/types/notification';
import {
  NotificationStatus,
  NotificationCategory,
  NotificationPriority,
} from '@/types/notification';
import NotificationItem from './NotificationItem';

interface NotificationInboxProps {
  subscriberId: string;
  applicationIdentifier: string;
  onNotificationClick?: (notification: Notification) => void;
  onNotificationAction?: (actionId: string, notification: Notification) => void;
  theme?: 'light' | 'dark' | 'auto';
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  maxHeight?: number;
  className?: string;
  showHeader?: boolean;
  showFooter?: boolean;
  enableRealTime?: boolean;
}

export const NotificationInbox: React.FC<NotificationInboxProps> = ({
  subscriberId,
  applicationIdentifier,
  onNotificationClick,
  onNotificationAction,
  theme = 'auto',
  position = 'top-right',
  maxHeight = 400,
  className = '',
  showHeader = true,
  showFooter = true,
  enableRealTime = true,
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<
    Notification[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>({});
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState<NotificationSettings | null>(null);

  const inboxRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<NotificationObserver | null>(null);

  // Initialize service and load data
  useEffect(() => {
    const initializeInbox = async () => {
      try {
        setLoading(true);
        setError(null);

        // Set subscriber ID
        notificationService.setSubscriberId(subscriberId);

        // Load initial notifications
        const response = await notificationService.getNotifications(filter);
        setNotifications(response.notifications);
        setFilteredNotifications(response.notifications);
        setHasMore(response.hasMore);
        setUnreadCount(response.unreadCount);

        // Load settings
        const userSettings = await notificationService.getSettings();
        setSettings(userSettings);

        // Set up observer for real-time updates
        if (enableRealTime) {
          setupNotificationObserver();
        }
      } catch (err) {
        console.error('Failed to initialize notification inbox:', err);
        setError('Failed to load notifications');
      } finally {
        setLoading(false);
      }
    };

    initializeInbox();
  }, [subscriberId, filter]);

  // Setup notification observer
  const setupNotificationObserver = useCallback(() => {
    observerRef.current = {
      onNotification: (notification: Notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      },
      onNotificationRead: (notificationId: string) => {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId
              ? { ...n, status: NotificationStatus.READ, readAt: new Date() }
              : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      },
      onNotificationArchived: (notificationId: string) => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      },
      onNotificationDeleted: (notificationId: string) => {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
      },
      onBulkOperation: (operation: string, count: number) => {
        console.log(`Bulk operation: ${operation}, count: ${count}`);
        if (operation === 'clear_all') {
          // Clear all notifications from UI
          setNotifications([]);
          setFilteredNotifications([]);
          setUnreadCount(0);
        }
      },
    };

    notificationService.subscribe(observerRef.current);

    return () => {
      if (observerRef.current) {
        notificationService.unsubscribe(observerRef.current);
      }
    };
  }, []);

  // Handle notification actions
  const handleNotificationAction = useCallback(
    async (actionId: string, notification: Notification) => {
      try {
        switch (actionId) {
          case 'mark_read':
            await notificationService.markAsRead(notification.id);
            break;
          case 'archive':
            await notificationService.archiveNotification(notification.id);
            break;
          case 'delete':
            await notificationService.deleteNotification(notification.id);
            break;
          default:
            if (onNotificationAction) {
              onNotificationAction(actionId, notification);
            }
        }
      } catch (err) {
        console.error('Failed to handle notification action:', err);
      }
    },
    [onNotificationAction]
  );

  // Handle mark all as read
  const handleMarkAllAsRead = useCallback(async () => {
    try {
      const unreadNotifications = notifications.filter(
        n => n.status === NotificationStatus.UNREAD
      );
      await Promise.all(
        unreadNotifications.map(n => notificationService.markAsRead(n.id))
      );
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  }, [notifications]);

  // Handle archive all read
  const handleArchiveAllRead = useCallback(async () => {
    try {
      const readNotifications = notifications.filter(
        n => n.status === NotificationStatus.READ
      );
      await Promise.all(
        readNotifications.map(n =>
          notificationService.archiveNotification(n.id)
        )
      );
    } catch (err) {
      console.error('Failed to archive all read:', err);
    }
  }, [notifications]);

  // Handle clear all notifications
  const handleClearAll = useCallback(async () => {
    try {
      await notificationService.clearAllNotifications();
    } catch (err) {
      console.error('Failed to clear all notifications:', err);
    }
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback(
    (newFilter: Partial<NotificationFilter>) => {
      setFilter(prev => ({ ...prev, ...newFilter }));
    },
    []
  );

  // Handle load more
  const handleLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const response = await notificationService.getNotifications(
        filter,
        Math.ceil(notifications.length / 20) + 1,
        20
      );

      setNotifications(prev => [...prev, ...response.notifications]);
      setHasMore(response.hasMore);
    } catch (err) {
      console.error('Failed to load more notifications:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [filter, notifications.length, hasMore, loadingMore]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inboxRef.current &&
        !inboxRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Get position classes
  const getPositionClasses = () => {
    const baseClasses =
      'fixed z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl';

    switch (position) {
      case 'top-right':
        return `${baseClasses} top-4 right-4`;
      case 'bottom-right':
        return `${baseClasses} bottom-4 right-4`;
      case 'top-left':
        return `${baseClasses} top-4 left-4`;
      case 'bottom-left':
        return `${baseClasses} bottom-4 left-4`;
      default:
        return `${baseClasses} top-4 right-4`;
    }
  };

  if (loading) {
    return (
      <div className={`fixed top-4 right-4 z-50 ${className}`}>
        <div className='bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4'>
          <div className='flex items-center space-x-2'>
            <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600'></div>
            <span className='text-sm text-gray-600 dark:text-gray-300'>
              Loading notifications...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`fixed top-4 right-4 z-50 ${className}`}>
        <div className='bg-white dark:bg-gray-900 border border-red-200 dark:border-red-700 rounded-lg shadow-xl p-4'>
          <div className='flex items-center space-x-2 text-red-600 dark:text-red-400'>
            <span className='text-sm'>⚠️ {error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} ref={inboxRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className='relative p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 transition-colors duration-200'
        aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
      >
        <svg
          className='w-6 h-6'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9'
          />
        </svg>
        {unreadCount > 0 && (
          <span className='absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center'>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <div
          className={getPositionClasses()}
          style={{ maxHeight: `${maxHeight}px` }}
        >
          <div className='w-80 max-w-sm'>
            {/* Header */}
            {showHeader && (
              <div className='flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700'>
                <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                  Notifications
                </h2>
                <div className='flex items-center space-x-2'>
                  {notifications.some(
                    n => n.status === NotificationStatus.UNREAD
                  ) && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className='text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className='text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    aria-label='Close notifications'
                  >
                    <svg
                      className='w-5 h-5'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={2}
                        d='M6 18L18 6M6 6l12 12'
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Filter Tabs */}
            <div className='flex border-b border-gray-200 dark:border-gray-700'>
              <button
                onClick={() =>
                  handleFilterChange({ unreadOnly: !filter.unreadOnly })
                }
                className={`flex-1 py-2 px-4 text-sm font-medium ${
                  filter.unreadOnly
                    ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </button>
              <button
                onClick={() => handleFilterChange({ unreadOnly: false })}
                className={`flex-1 py-2 px-4 text-sm font-medium ${
                  !filter.unreadOnly
                    ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                All
              </button>
            </div>

            {/* Notifications List */}
            <div
              className='overflow-y-auto'
              style={{ maxHeight: `${maxHeight - 120}px` }}
            >
              {filteredNotifications.length === 0 ? (
                <div className='p-8 text-center text-gray-500 dark:text-gray-400'>
                  <div className='text-4xl mb-2'>📭</div>
                  <p className='text-sm'>No notifications</p>
                  <p className='text-xs text-gray-400 mt-1'>
                    {filter.unreadOnly ? 'All caught up!' : "You're all set."}
                  </p>
                </div>
              ) : (
                <div>
                  {filteredNotifications.map(notification => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClick={onNotificationClick || undefined}
                      onAction={handleNotificationAction}
                      compact={false}
                      showActions={true}
                    />
                  ))}

                  {/* Load More */}
                  {hasMore && (
                    <div className='p-4 text-center'>
                      <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className='text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50'
                      >
                        {loadingMore ? 'Loading...' : 'Load more'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {showFooter && filteredNotifications.length > 0 && (
              <div className='border-t border-gray-200 dark:border-gray-700 p-3 space-y-2'>
                <button
                  onClick={handleArchiveAllRead}
                  className='w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                >
                  Archive all read
                </button>
                <button
                  onClick={handleClearAll}
                  className='w-full text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'
                >
                  Clear all notifications
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationInbox;
