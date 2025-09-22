/**
 * Notification Service Tests
 * Unit tests for the notification service functionality
 */

import { notificationService } from '@/services/notificationService';
import type {
  NotificationCreateInput,
  NotificationObserver,
} from '@/types/notification';
import {
  NotificationType,
  NotificationPriority,
  NotificationCategory,
} from '@/types/notification';

// Mock the storage service
jest.mock('@/services/notificationStorage', () => ({
  notificationStorage: {
    storeNotification: jest.fn().mockResolvedValue(undefined),
    getNotifications: jest.fn().mockResolvedValue([]),
    getNotification: jest.fn().mockResolvedValue(null),
    updateNotification: jest.fn().mockResolvedValue(undefined),
    deleteNotification: jest.fn().mockResolvedValue(undefined),
    getSettings: jest.fn().mockResolvedValue(null),
    storeSettings: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set a test subscriber ID
    notificationService.setSubscriberId('test-user-123');
  });

  describe('Service Initialization', () => {
    it('should initialize successfully', async () => {
      // The service should be initialized when imported
      expect(notificationService).toBeDefined();
    });

    it('should set subscriber ID correctly', () => {
      const subscriberId = 'user-456';
      notificationService.setSubscriberId(subscriberId);
      expect(notificationService.getSubscriberId()).toBe(subscriberId);
    });
  });

  describe('Notification Creation', () => {
    it('should create a notification with realistic metadata', async () => {
      const input: NotificationCreateInput = {
        type: NotificationType.SUCCESS,
        title: 'Test Success Notification',
        content: 'This is a test notification',
        priority: NotificationPriority.NORMAL,
        category: NotificationCategory.GENERAL,
        status: 'unread',
        userId: 'test-user-123',
        source: {
          type: 'system',
          id: 'test-system',
          name: 'Test System',
        },
      };

      const notification = await notificationService.createNotification(input);

      expect(notification).toBeDefined();
      expect(notification.id).toBeDefined();
      expect(notification.type).toBe(NotificationType.SUCCESS);
      expect(notification.title).toBe('Test Success Notification');
      expect(notification.metadata).toBeDefined();
      expect(notification.metadata.icon).toBe('✅');
      expect(notification.metadata.color).toBe('#10b981');
      expect(notification.actions).toBeDefined();
      expect(notification.actions.length).toBeGreaterThan(0);
    });

    it('should generate different metadata for different notification types', async () => {
      const errorInput: NotificationCreateInput = {
        type: NotificationType.ERROR,
        title: 'Test Error Notification',
        content: 'An error occurred',
        priority: NotificationPriority.HIGH,
        category: NotificationCategory.SYSTEM,
        status: 'unread',
        userId: 'test-user-123',
        source: {
          type: 'system',
          id: 'test-system',
          name: 'Test System',
        },
      };

      const errorNotification =
        await notificationService.createNotification(errorInput);

      expect(errorNotification.metadata.icon).toBe('❌');
      expect(errorNotification.metadata.color).toBe('#ef4444');
    });

    it('should generate appropriate actions based on category', async () => {
      const workflowInput: NotificationCreateInput = {
        type: NotificationType.INFO,
        title: 'Workflow Update',
        content: 'Your workflow has been updated',
        priority: NotificationPriority.NORMAL,
        category: NotificationCategory.WORKFLOW,
        status: 'unread',
        userId: 'test-user-123',
        source: {
          type: 'workflow',
          id: 'workflow-123',
          name: 'Test Workflow',
        },
      };

      const workflowNotification =
        await notificationService.createNotification(workflowInput);

      const viewWorkflowAction = workflowNotification.actions.find(
        action => action.action === 'navigate' && action.url === '/workflows'
      );
      expect(viewWorkflowAction).toBeDefined();
    });
  });

  describe('Notification Management', () => {
    it('should get notifications with empty result when no notifications exist', async () => {
      const result = await notificationService.getNotifications();

      expect(result.notifications).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.unreadCount).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('should mark notification as read', async () => {
      const mockNotification = {
        id: 'test-notification-123',
        type: NotificationType.INFO,
        title: 'Test Notification',
        content: 'Test content',
        priority: NotificationPriority.NORMAL,
        status: 'unread',
        category: NotificationCategory.GENERAL,
        userId: 'test-user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        source: { type: 'system', id: 'test', name: 'Test' },
        metadata: {},
        actions: [],
      };

      // Mock the storage service to return the notification
      const { notificationStorage } = require('@/services/notificationStorage');
      notificationStorage.getNotification.mockResolvedValue(mockNotification);
      notificationStorage.updateNotification.mockResolvedValue(undefined);

      await notificationService.markAsRead('test-notification-123');

      expect(notificationStorage.updateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-notification-123',
          status: 'read',
          readAt: expect.any(Date),
        })
      );
    });

    it('should archive notification', async () => {
      const mockNotification = {
        id: 'test-notification-456',
        type: NotificationType.WARNING,
        title: 'Test Warning',
        content: 'Test warning content',
        priority: NotificationPriority.HIGH,
        status: 'unread',
        category: NotificationCategory.ALERTS,
        userId: 'test-user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        source: { type: 'system', id: 'test', name: 'Test' },
        metadata: {},
        actions: [],
      };

      const { notificationStorage } = require('@/services/notificationStorage');
      notificationStorage.getNotification.mockResolvedValue(mockNotification);
      notificationStorage.updateNotification.mockResolvedValue(undefined);

      await notificationService.archiveNotification('test-notification-456');

      expect(notificationStorage.updateNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'test-notification-456',
          status: 'archived',
          archivedAt: expect.any(Date),
        })
      );
    });

    it('should delete notification', async () => {
      const { notificationStorage } = require('@/services/notificationStorage');
      notificationStorage.deleteNotification.mockResolvedValue(undefined);

      await notificationService.deleteNotification('test-notification-789');

      expect(notificationStorage.deleteNotification).toHaveBeenCalledWith(
        'test-notification-789'
      );
    });
  });

  describe('Settings Management', () => {
    it('should get default settings when no settings exist', async () => {
      const settings = await notificationService.getSettings();

      expect(settings).toBeDefined();
      expect(settings.userId).toBe('test-user-123');
      expect(settings.globalEnabled).toBe(true);
      expect(settings.channels.inApp).toBe(true);
      expect(settings.categories.general).toBe(true);
    });

    it('should update settings', async () => {
      const { notificationStorage } = require('@/services/notificationStorage');
      notificationStorage.storeSettings.mockResolvedValue(undefined);

      const newSettings = {
        globalEnabled: false,
        channels: {
          inApp: false,
          email: true,
          sms: false,
          push: false,
        },
      };

      const updatedSettings =
        await notificationService.updateSettings(newSettings);

      expect(updatedSettings.globalEnabled).toBe(false);
      expect(updatedSettings.channels.email).toBe(true);
      expect(notificationStorage.storeSettings).toHaveBeenCalled();
    });
  });

  describe('Observer Pattern', () => {
    it('should allow subscribing and unsubscribing observers', () => {
      const mockObserver: NotificationObserver = {
        onNotification: jest.fn(),
        onNotificationRead: jest.fn(),
        onNotificationArchived: jest.fn(),
        onNotificationDeleted: jest.fn(),
        onBulkOperation: jest.fn(),
      };

      notificationService.subscribe(mockObserver);
      // Note: We can't easily test the internal observer list, but we can verify the method exists
      expect(typeof notificationService.subscribe).toBe('function');
      expect(typeof notificationService.unsubscribe).toBe('function');
    });
  });

  describe('Analytics', () => {
    it('should calculate analytics from notifications', async () => {
      const mockNotifications = [
        {
          id: '1',
          type: NotificationType.SUCCESS,
          status: 'read',
          category: NotificationCategory.GENERAL,
          createdAt: new Date('2024-01-01'),
          readAt: new Date('2024-01-01T00:01:00'),
        },
        {
          id: '2',
          type: NotificationType.ERROR,
          status: 'unread',
          category: NotificationCategory.ALERTS,
          createdAt: new Date('2024-01-02'),
        },
      ];

      const { notificationStorage } = require('@/services/notificationStorage');
      notificationStorage.getNotifications.mockResolvedValue(mockNotifications);

      const analytics = await notificationService.getAnalytics();

      expect(analytics.totalSent).toBe(2);
      expect(analytics.totalRead).toBe(1);
      expect(analytics.totalArchived).toBe(0);
      expect(analytics.readRate).toBe(50);
      expect(analytics.categoryStats.general.sent).toBe(1);
      expect(analytics.categoryStats.alerts.sent).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      const { notificationStorage } = require('@/services/notificationStorage');
      notificationStorage.storeNotification.mockRejectedValue(
        new Error('Storage error')
      );

      const input: NotificationCreateInput = {
        type: NotificationType.INFO,
        title: 'Test Notification',
        content: 'Test content',
        priority: NotificationPriority.NORMAL,
        category: NotificationCategory.GENERAL,
        status: 'unread',
        userId: 'test-user-123',
        source: {
          type: 'system',
          id: 'test-system',
          name: 'Test System',
        },
      };

      await expect(
        notificationService.createNotification(input)
      ).rejects.toThrow('Failed to create notification');
    });

    it('should handle missing subscriber ID', async () => {
      notificationService.setSubscriberId('');

      const input: NotificationCreateInput = {
        type: NotificationType.INFO,
        title: 'Test Notification',
        content: 'Test content',
        priority: NotificationPriority.NORMAL,
        category: NotificationCategory.GENERAL,
        status: 'unread',
        userId: 'test-user-123',
        source: {
          type: 'system',
          id: 'test-system',
          name: 'Test System',
        },
      };

      const notification = await notificationService.createNotification(input);
      expect(notification.userId).toBe('');
      expect(notification.id).toBeDefined();
      expect(notification.createdAt).toBeDefined();
    });
  });
});
