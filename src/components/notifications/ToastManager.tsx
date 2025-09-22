/**
 * Toast Notification Manager
 * Global toast notification system with queue management
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { Notification } from '@/types/notification';
import { NotificationType, NotificationPriority } from '@/types/notification';

interface ToastNotification extends Notification {
  id: string;
  duration?: number;
  position?: ToastPosition;
}

interface ToastManagerProps {
  position?: ToastPosition;
  maxToasts?: number;
  defaultDuration?: number;
  className?: string;
}

type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-center'
  | 'bottom-center';

interface ToastItemProps {
  toast: ToastNotification;
  onClose: (id: string) => void;
  onAction?: (actionId: string, toast: ToastNotification) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onClose, onAction }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Trigger entrance animation
    setIsVisible(true);

    if (toast.duration && toast.duration > 0) {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const remaining = Math.max(
          0,
          ((toast.duration! - elapsed) / toast.duration!) * 100
        );
        setProgress(remaining);

        if (remaining <= 0) {
          clearInterval(interval);
          handleClose();
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, [toast.duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(toast.id), 300); // Wait for exit animation
  };

  const handleAction = (actionId: string) => {
    if (onAction) {
      onAction(actionId, toast);
    }
    handleClose();
  };

  const getToastStyles = () => {
    const baseStyles =
      'relative overflow-hidden rounded-lg shadow-lg border p-4 mb-3 max-w-sm w-full transform transition-all duration-300';

    if (!isVisible) {
      return `${baseStyles} opacity-0 translate-y-2 scale-95`;
    }

    switch (toast.type) {
      case NotificationType.SUCCESS:
        return `${baseStyles} bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200`;
      case NotificationType.ERROR:
        return `${baseStyles} bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200`;
      case NotificationType.WARNING:
        return `${baseStyles} bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200`;
      case NotificationType.INFO:
        return `${baseStyles} bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200`;
      case NotificationType.SYSTEM:
        return `${baseStyles} bg-purple-50 border-purple-200 text-purple-800 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-200`;
      default:
        return `${baseStyles} bg-gray-50 border-gray-200 text-gray-800 dark:bg-gray-900/20 dark:border-gray-800 dark:text-gray-200`;
    }
  };

  const getPriorityIcon = (priority: NotificationPriority) => {
    switch (priority) {
      case NotificationPriority.URGENT:
        return '🚨';
      case NotificationPriority.HIGH:
        return '⚡';
      case NotificationPriority.NORMAL:
        return '📢';
      case NotificationPriority.LOW:
        return '💬';
      default:
        return '📩';
    }
  };

  return (
    <div className={getToastStyles()}>
      {/* Progress Bar */}
      {toast.duration && toast.duration > 0 && (
        <div className='absolute top-0 left-0 right-0 h-1 bg-gray-200 dark:bg-gray-700'>
          <div
            className='h-full bg-current transition-all duration-50 ease-linear'
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className='flex items-start space-x-3'>
        {/* Icon */}
        <div className='flex-shrink-0 text-lg'>
          {toast.metadata.icon || getPriorityIcon(toast.priority)}
        </div>

        {/* Content */}
        <div className='flex-1 min-w-0'>
          <div className='flex items-center justify-between'>
            <h4 className='text-sm font-semibold truncate'>{toast.title}</h4>
            <button
              onClick={handleClose}
              className='flex-shrink-0 ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200'
              aria-label='Close notification'
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
                  d='M6 18L18 6M6 6l12 12'
                />
              </svg>
            </button>
          </div>

          {toast.content && (
            <p className='text-sm mt-1 opacity-90 line-clamp-2'>
              {toast.content}
            </p>
          )}

          {/* Actions */}
          {toast.actions && toast.actions.length > 0 && (
            <div className='flex flex-wrap gap-2 mt-3'>
              {toast.actions.slice(0, 2).map(action => (
                <button
                  key={action.id}
                  onClick={() => handleAction(action.id)}
                  className={`
                    px-3 py-1 text-xs font-medium rounded transition-colors duration-200
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
              {toast.actions.length > 2 && (
                <span className='text-xs text-gray-500 self-center'>
                  +{toast.actions.length - 2} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ToastManager: React.FC<ToastManagerProps> = ({
  position = 'top-right',
  maxToasts = 5,
  defaultDuration = 5000,
  className = '',
}) => {
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Add a new toast
  const addToast = useCallback(
    (
      notification: Notification,
      options?: {
        duration?: number;
        position?: ToastPosition;
      }
    ) => {
      const toast: ToastNotification = {
        ...notification,
        duration: options?.duration ?? defaultDuration,
        position: options?.position ?? position,
      };

      setToasts(prev => {
        const newToasts = [toast, ...prev];
        // Limit the number of toasts
        return newToasts.slice(0, maxToasts);
      });

      // Auto-remove toast after duration
      if (toast.duration && toast.duration > 0) {
        setTimeout(() => {
          removeToast(toast.id);
        }, toast.duration);
      }
    },
    [position, maxToasts, defaultDuration]
  );

  // Remove a toast
  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Handle toast action
  const handleToastAction = useCallback(
    (actionId: string, toast: ToastNotification) => {
      console.log('Toast action:', actionId, toast);
      // Handle specific actions here or emit to parent component
    },
    []
  );

  // Get position styles
  const getPositionStyles = () => {
    const baseStyles = 'fixed z-50 p-4 pointer-events-none';

    switch (position) {
      case 'top-right':
        return `${baseStyles} top-0 right-0`;
      case 'top-left':
        return `${baseStyles} top-0 left-0`;
      case 'bottom-right':
        return `${baseStyles} bottom-0 right-0`;
      case 'bottom-left':
        return `${baseStyles} bottom-0 left-0`;
      case 'top-center':
        return `${baseStyles} top-0 left-1/2 transform -translate-x-1/2`;
      case 'bottom-center':
        return `${baseStyles} bottom-0 left-1/2 transform -translate-x-1/2`;
      default:
        return `${baseStyles} top-0 right-0`;
    }
  };

  // Expose methods globally for easy access
  useEffect(() => {
    // Create global toast function
    (window as any).__toastManager = {
      show: (
        notification: Notification,
        options?: { duration?: number; position?: ToastPosition }
      ) => {
        addToast(notification, options);
      },
      success: (
        title: string,
        content?: string,
        options?: { duration?: number }
      ) => {
        addToast(
          {
            id: `toast_${Date.now()}`,
            type: NotificationType.SUCCESS,
            title,
            content: content || '',
            priority: NotificationPriority.NORMAL,
            status: 'unread',
            category: 'general',
            userId: 'system',
            createdAt: new Date(),
            updatedAt: new Date(),
            source: {
              type: 'system',
              id: 'toast-manager',
              name: 'Toast Manager',
            },
            metadata: { icon: '✅', color: '#10b981' },
            actions: [],
          },
          options
        );
      },
      error: (
        title: string,
        content?: string,
        options?: { duration?: number }
      ) => {
        addToast(
          {
            id: `toast_${Date.now()}`,
            type: NotificationType.ERROR,
            title,
            content: content || '',
            priority: NotificationPriority.HIGH,
            status: 'unread',
            category: 'system',
            userId: 'system',
            createdAt: new Date(),
            updatedAt: new Date(),
            source: {
              type: 'system',
              id: 'toast-manager',
              name: 'Toast Manager',
            },
            metadata: { icon: '❌', color: '#ef4444' },
            actions: [],
          },
          options
        );
      },
      warning: (
        title: string,
        content?: string,
        options?: { duration?: number }
      ) => {
        addToast(
          {
            id: `toast_${Date.now()}`,
            type: NotificationType.WARNING,
            title,
            content: content || '',
            priority: NotificationPriority.NORMAL,
            status: 'unread',
            category: 'general',
            userId: 'system',
            createdAt: new Date(),
            updatedAt: new Date(),
            source: {
              type: 'system',
              id: 'toast-manager',
              name: 'Toast Manager',
            },
            metadata: { icon: '⚠️', color: '#f59e0b' },
            actions: [],
          },
          options
        );
      },
      info: (
        title: string,
        content?: string,
        options?: { duration?: number }
      ) => {
        addToast(
          {
            id: `toast_${Date.now()}`,
            type: NotificationType.INFO,
            title,
            content: content || '',
            priority: NotificationPriority.LOW,
            status: 'unread',
            category: 'general',
            userId: 'system',
            createdAt: new Date(),
            updatedAt: new Date(),
            source: {
              type: 'system',
              id: 'toast-manager',
              name: 'Toast Manager',
            },
            metadata: { icon: 'ℹ️', color: '#3b82f6' },
            actions: [],
          },
          options
        );
      },
    };

    return () => {
      delete (window as any).__toastManager;
    };
  }, [addToast]);

  return (
    <div className={`${getPositionStyles()} ${className}`}>
      <div className='pointer-events-auto'>
        {toasts.map(toast => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onClose={removeToast}
            onAction={handleToastAction}
          />
        ))}
      </div>
    </div>
  );
};

// Export convenience functions
export const toast = {
  show: (
    notification: Notification,
    options?: { duration?: number; position?: ToastPosition }
  ) => {
    if ((window as any).__toastManager) {
      (window as any).__toastManager.show(notification, options);
    }
  },
  success: (
    title: string,
    content?: string,
    options?: { duration?: number }
  ) => {
    if ((window as any).__toastManager) {
      (window as any).__toastManager.success(title, content, options);
    }
  },
  error: (title: string, content?: string, options?: { duration?: number }) => {
    if ((window as any).__toastManager) {
      (window as any).__toastManager.error(title, content, options);
    }
  },
  warning: (
    title: string,
    content?: string,
    options?: { duration?: number }
  ) => {
    if ((window as any).__toastManager) {
      (window as any).__toastManager.warning(title, content, options);
    }
  },
  info: (title: string, content?: string, options?: { duration?: number }) => {
    if ((window as any).__toastManager) {
      (window as any).__toastManager.info(title, content, options);
    }
  },
};

export default ToastManager;
