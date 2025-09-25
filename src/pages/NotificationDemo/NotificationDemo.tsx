/**
 * Notification System Demo Page
 * Demonstration of the complete notification system with realistic data
 */

import React, { useState, useEffect } from 'react';
import {
  NotificationInbox,
  NotificationSettingsPanel,
  ToastManager,
  toast,
} from '@/components/notifications';
import { notificationService } from '@/services/notificationService';
import type { Notification } from '@/types/notification';
import {
  NotificationType,
  NotificationPriority,
  NotificationCategory,
  NotificationStatus,
} from '@/types/notification';
import { useTranslation } from 'react-i18next';

const NotificationDemo: React.FC = () => {
  const { t } = useTranslation();
  const [currentUser] = useState('demo-user-123');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Initialize demo data
  useEffect(() => {
    initializeDemoData();
  }, []);

  const initializeDemoData = async () => {
    // Set up demo user
    notificationService.setSubscriberId(currentUser);

    // Create some sample notifications
    const sampleNotifications = [
      {
        id: 'demo-1',
        type: NotificationType.SUCCESS,
        title: 'Report Generated Successfully',
        content:
          'Your monthly analytics report has been generated and is ready for download.',
        priority: NotificationPriority.NORMAL,
        status: NotificationStatus.UNREAD,
        category: NotificationCategory.REPORTS,
        userId: currentUser,
        createdAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        updatedAt: new Date(),
        source: {
          type: 'system' as const,
          id: 'report-generator',
          name: 'Report Generator',
        },
        metadata: {
          icon: '📊',
          color: '#10b981',
          tags: ['report', 'analytics', 'monthly'],
        },
        actions: [
          {
            id: 'download',
            label: 'Download Report',
            type: 'primary' as const,
            action: 'download',
          },
          {
            id: 'view',
            label: 'View Details',
            type: 'secondary' as const,
            action: 'view',
          },
        ],
      },
      {
        id: 'demo-2',
        type: NotificationType.WARNING,
        title: 'High Memory Usage Detected',
        content:
          'System memory usage has exceeded 85%. Please review running processes.',
        priority: NotificationPriority.HIGH,
        status: 'unread' as const,
        category: NotificationCategory.ALERTS,
        userId: currentUser,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
        updatedAt: new Date(),
        source: {
          type: 'system' as const,
          id: 'monitoring',
          name: 'System Monitor',
        },
        metadata: {
          icon: '⚠️',
          color: '#f59e0b',
          tags: ['memory', 'alert', 'system'],
        },
        actions: [
          {
            id: 'acknowledge',
            label: 'Acknowledge',
            type: 'primary' as const,
            action: 'acknowledge',
          },
          {
            id: 'investigate',
            label: 'Investigate',
            type: 'secondary' as const,
            action: 'investigate',
          },
        ],
      },
      {
        id: 'demo-3',
        type: NotificationType.INFO,
        title: 'New Team Member Added',
        content: 'John Doe has been added to the development team.',
        priority: NotificationPriority.LOW,
        status: NotificationStatus.READ,
        category: NotificationCategory.SOCIAL,
        userId: currentUser,
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
        updatedAt: new Date(),
        readAt: new Date(Date.now() - 1000 * 60 * 60 * 12), // Read 12 hours ago
        source: {
          type: 'user' as const,
          id: 'hr-system',
          name: 'HR System',
        },
        metadata: {
          icon: '👥',
          color: '#3b82f6',
          tags: ['team', 'hr', 'new-member'],
        },
        actions: [
          {
            id: 'view_profile',
            label: 'View Profile',
            type: 'primary' as const,
            action: 'view_profile',
          },
        ],
      },
      {
        id: 'demo-4',
        type: NotificationType.ERROR,
        title: 'Database Connection Failed',
        content:
          'Unable to connect to the main database. Service will be unavailable.',
        priority: NotificationPriority.URGENT,
        status: NotificationStatus.UNREAD,
        category: NotificationCategory.SYSTEM,
        userId: currentUser,
        createdAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        updatedAt: new Date(),
        source: {
          type: 'system' as const,
          id: 'database-monitor',
          name: 'Database Monitor',
        },
        metadata: {
          icon: '🚨',
          color: '#ef4444',
          tags: ['database', 'error', 'urgent'],
        },
        actions: [
          {
            id: 'retry',
            label: 'Retry Connection',
            type: 'primary' as const,
            action: 'retry',
          },
          {
            id: 'check_status',
            label: 'Check Status',
            type: 'secondary' as const,
            action: 'check_status',
          },
        ],
      },
    ];

    // Store sample notifications
    for (const notification of sampleNotifications) {
      await notificationService.createNotification(notification);
    }

    // Load notifications
    const response = await notificationService.getNotifications();
    setNotifications(response.notifications);

    // Load settings (not used in component)
    await notificationService.getSettings();
  };

  // Handle notification actions
  const handleNotificationClick = (notification: Notification) => {
    console.log('Notification clicked:', notification);
    toast.info('Notification Clicked', `You clicked: ${notification.title}`);
  };

  const handleNotificationAction = (
    actionId: string,
    notification: Notification
  ) => {
    console.log('Notification action:', actionId, notification);
    toast.success(
      'Action Executed',
      `Action "${actionId}" executed for: ${notification.title}`
    );
  };

  // Handle settings change
  const handleSettingsChange = () => {
    // Settings are handled by the service, no local state needed
    toast.success(
      'Settings Updated',
      'Your notification preferences have been saved.'
    );
  };

  // Generate test notifications
  const generateTestNotification = (type: NotificationType) => {
    const templates = {
      [NotificationType.SUCCESS]: {
        title: 'Operation Completed Successfully',
        content: 'Your requested operation has been completed without errors.',
        category: NotificationCategory.WORKFLOW,
        priority: NotificationPriority.NORMAL,
      },
      [NotificationType.ERROR]: {
        title: 'Critical System Error',
        content: 'A critical error has occurred. Immediate attention required.',
        category: NotificationCategory.ALERTS,
        priority: NotificationPriority.URGENT,
      },
      [NotificationType.WARNING]: {
        title: 'Performance Warning',
        content:
          'System performance is below optimal levels. Please investigate.',
        category: NotificationCategory.SYSTEM,
        priority: NotificationPriority.HIGH,
      },
      [NotificationType.INFO]: {
        title: 'System Maintenance Scheduled',
        content:
          'Scheduled maintenance will occur tonight from 2:00 AM to 4:00 AM EST.',
        category: NotificationCategory.GENERAL,
        priority: NotificationPriority.LOW,
      },
      [NotificationType.SYSTEM]: {
        title: 'New Feature Available',
        content:
          'A new feature has been deployed to the system. Check the changelog for details.',
        category: NotificationCategory.SYSTEM,
        priority: NotificationPriority.NORMAL,
      },
    };

    const template = templates[type];
    notificationService.createNotification({
      type,
      title: template.title,
      content: template.content,
      priority: template.priority,
      category: template.category,
      status: NotificationStatus.UNREAD,
      userId: currentUser,
      source: {
        type: 'system' as const,
        id: 'demo-generator',
        name: 'Demo Generator',
      },
      metadata: {
        icon: '🔔',
        color: '#3b82f6',
        tags: ['demo', 'test'],
      },
      actions: [
        {
          id: 'view',
          label: 'View Details',
          type: 'primary' as const,
          action: 'view',
        },
      ],
    });
  };

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 py-8'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
        {/* Header */}
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2'>
            {t('notificationDemo.title')}
          </h1>
          <p className='text-gray-600 dark:text-gray-300'>
            {t('notificationDemo.subtitle')}
          </p>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
          {/* Left Column - Controls */}
          <div className='lg:col-span-1 space-y-6'>
            {/* Test Controls */}
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4'>
                {t('notificationDemo.testControls.title')}
              </h2>
              <div className='space-y-3'>
                <button
                  onClick={() =>
                    generateTestNotification(NotificationType.SUCCESS)
                  }
                  className='w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200'
                >
                  {t('notificationDemo.testControls.successButton')}
                </button>
                <button
                  onClick={() =>
                    generateTestNotification(NotificationType.ERROR)
                  }
                  className='w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200'
                >
                  {t('notificationDemo.testControls.errorButton')}
                </button>
                <button
                  onClick={() =>
                    generateTestNotification(NotificationType.WARNING)
                  }
                  className='w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors duration-200'
                >
                  {t('notificationDemo.testControls.warningButton')}
                </button>
                <button
                  onClick={() =>
                    generateTestNotification(NotificationType.INFO)
                  }
                  className='w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200'
                >
                  {t('notificationDemo.testControls.infoButton')}
                </button>
                <button
                  onClick={() =>
                    generateTestNotification(NotificationType.SYSTEM)
                  }
                  className='w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors duration-200'
                >
                  {t('notificationDemo.testControls.systemButton')}
                </button>
              </div>
            </div>

            {/* Toast Test */}
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4'>
                {t('notificationDemo.toastTest.title')}
              </h2>
              <div className='space-y-3'>
                <button
                  onClick={() =>
                    toast.success(
                      t('notificationDemo.toastTest.successTitle'),
                      t('notificationDemo.toastTest.successMessage')
                    )
                  }
                  className='w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors duration-200'
                >
                  {t('notificationDemo.toastTest.successButton')}
                </button>
                <button
                  onClick={() =>
                    toast.error(
                      t('notificationDemo.toastTest.errorTitle'),
                      t('notificationDemo.toastTest.errorMessage')
                    )
                  }
                  className='w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200'
                >
                  {t('notificationDemo.toastTest.errorButton')}
                </button>
                <button
                  onClick={() =>
                    toast.warning(
                      t('notificationDemo.toastTest.warningTitle'),
                      t('notificationDemo.toastTest.warningMessage')
                    )
                  }
                  className='w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors duration-200'
                >
                  {t('notificationDemo.toastTest.warningButton')}
                </button>
                <button
                  onClick={() =>
                    toast.info(
                      t('notificationDemo.toastTest.infoTitle'),
                      t('notificationDemo.toastTest.infoMessage')
                    )
                  }
                  className='w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200'
                >
                  {t('notificationDemo.toastTest.infoButton')}
                </button>
              </div>
            </div>

            {/* Statistics */}
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4'>
                {t('notificationDemo.statistics.title')}
              </h2>
              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-300'>
                    {t('notificationDemo.statistics.total')}:
                  </span>
                  <span className='font-medium'>{notifications.length}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-300'>
                    {t('notificationDemo.statistics.unread')}:
                  </span>
                  <span className='font-medium text-blue-600'>
                    {notifications.filter(n => n.status === 'unread').length}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-300'>
                    {t('notificationDemo.statistics.read')}:
                  </span>
                  <span className='font-medium text-green-600'>
                    {notifications.filter(n => n.status === 'read').length}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600 dark:text-gray-300'>
                    {t('notificationDemo.statistics.archived')}:
                  </span>
                  <span className='font-medium text-gray-600'>
                    {notifications.filter(n => n.status === 'archived').length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Middle Column - Notification Inbox */}
          <div className='lg:col-span-1'>
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4'>
                {t('notificationDemo.inbox.title')}
              </h2>
              <div className='relative'>
                <NotificationInbox
                  subscriberId={currentUser}
                  applicationIdentifier='demo-app'
                  onNotificationClick={handleNotificationClick}
                  onNotificationAction={handleNotificationAction}
                  position='top-right'
                  maxHeight={500}
                  showHeader={true}
                  showFooter={true}
                  enableRealTime={true}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Settings */}
          <div className='lg:col-span-1'>
            <div className='bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4'>
                {t('notificationDemo.settings.title')}
              </h2>
              <div className='max-h-96 overflow-y-auto'>
                <NotificationSettingsPanel
                  userId={currentUser}
                  onSettingsChange={handleSettingsChange}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Features Overview */}
        <div className='mt-12 bg-white dark:bg-gray-800 rounded-lg shadow p-6'>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4'>
            {t('notificationDemo.features.title')}
          </h2>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm'>
            <div className='flex items-start space-x-2'>
              <span className='text-green-500'>✅</span>
              <div>
                <div className='font-medium text-gray-900 dark:text-gray-100'>
                  {t('notificationDemo.features.realisticData.title')}
                </div>
                <div className='text-gray-600 dark:text-gray-300'>
                  {t('notificationDemo.features.realisticData.description')}
                </div>
              </div>
            </div>
            <div className='flex items-start space-x-2'>
              <span className='text-green-500'>✅</span>
              <div>
                <div className='font-medium text-gray-900 dark:text-gray-100'>
                  {t('notificationDemo.features.localization.title')}
                </div>
                <div className='text-gray-600 dark:text-gray-300'>
                  {t('notificationDemo.features.localization.description')}
                </div>
              </div>
            </div>
            <div className='flex items-start space-x-2'>
              <span className='text-green-500'>✅</span>
              <div>
                <div className='font-medium text-gray-900 dark:text-gray-100'>
                  {t('notificationDemo.features.realtime.title')}
                </div>
                <div className='text-gray-600 dark:text-gray-300'>
                  {t('notificationDemo.features.realtime.description')}
                </div>
              </div>
            </div>
            <div className='flex items-start space-x-2'>
              <span className='text-green-500'>✅</span>
              <div>
                <div className='font-medium text-gray-900 dark:text-gray-100'>
                  {t('notificationDemo.features.components.title')}
                </div>
                <div className='text-gray-600 dark:text-gray-300'>
                  {t('notificationDemo.features.components.description')}
                </div>
              </div>
            </div>
            <div className='flex items-start space-x-2'>
              <span className='text-green-500'>✅</span>
              <div>
                <div className='font-medium text-gray-900 dark:text-gray-100'>
                  {t('notificationDemo.features.offline.title')}
                </div>
                <div className='text-gray-600 dark:text-gray-300'>
                  {t('notificationDemo.features.offline.description')}
                </div>
              </div>
            </div>
            <div className='flex items-start space-x-2'>
              <span className='text-green-500'>✅</span>
              <div>
                <div className='font-medium text-gray-900 dark:text-gray-100'>
                  {t('notificationDemo.features.typesafety.title')}
                </div>
                <div className='text-gray-600 dark:text-gray-300'>
                  {t('notificationDemo.features.typesafety.description')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Toast Manager */}
      <ToastManager
        position='bottom-right'
        maxToasts={5}
        defaultDuration={5000}
      />
    </div>
  );
};

export default NotificationDemo;
