/**
 * Notification Storage Service
 * IndexedDB-based storage for notifications with offline support
 */

import type {
  Notification,
  NotificationSettings,
  NotificationStorage,
} from '@/types/notification';

export class NotificationStorageService {
  private dbName = 'NotificationDB';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  constructor() {
    this.initializeDB();
  }

  /**
   * Initialize IndexedDB database
   */
  private async initializeDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('Notification storage initialized successfully');
        resolve();
      };

      request.onupgradeneeded = event => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create notifications store
        if (!db.objectStoreNames.contains('notifications')) {
          const notificationsStore = db.createObjectStore('notifications', {
            keyPath: 'id',
          });
          notificationsStore.createIndex('userId', 'userId', { unique: false });
          notificationsStore.createIndex('status', 'status', { unique: false });
          notificationsStore.createIndex('category', 'category', {
            unique: false,
          });
          notificationsStore.createIndex('createdAt', 'createdAt', {
            unique: false,
          });
        }

        // Create settings store
        if (!db.objectStoreNames.contains('settings')) {
          const settingsStore = db.createObjectStore('settings', {
            keyPath: 'userId',
          });
        }

        // Create storage metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          const metadataStore = db.createObjectStore('metadata', {
            keyPath: 'key',
          });
        }
      };
    });
  }

  /**
   * Ensure database is ready
   */
  private async ensureDB(): Promise<void> {
    if (!this.db) {
      await this.initializeDB();
    }
  }

  /**
   * Store a notification
   */
  async storeNotification(notification: Notification): Promise<void> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['notifications'], 'readwrite');
      const store = transaction.objectStore('notifications');
      const request = store.put(notification);

      request.onsuccess = () => {
        console.log('Notification stored:', notification.id);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to store notification:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all notifications for a user
   */
  async getNotifications(userId: string): Promise<Notification[]> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['notifications'], 'readonly');
      const store = transaction.objectStore('notifications');
      const index = store.index('userId');
      const request = index.getAll(userId);

      request.onsuccess = () => {
        const notifications = request.result.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        resolve(notifications);
      };

      request.onerror = () => {
        console.error('Failed to get notifications:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get a specific notification
   */
  async getNotification(id: string): Promise<Notification | null> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['notifications'], 'readonly');
      const store = transaction.objectStore('notifications');
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('Failed to get notification:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Update a notification
   */
  async updateNotification(notification: Notification): Promise<void> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['notifications'], 'readwrite');
      const store = transaction.objectStore('notifications');
      const request = store.put(notification);

      request.onsuccess = () => {
        console.log('Notification updated:', notification.id);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to update notification:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id: string): Promise<void> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['notifications'], 'readwrite');
      const store = transaction.objectStore('notifications');
      const request = store.delete(id);

      request.onsuccess = () => {
        console.log('Notification deleted:', id);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to delete notification:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get notifications with filtering
   */
  async getNotificationsWithFilter(
    userId: string,
    filter?: {
      status?: string[];
      category?: string[];
      limit?: number;
      offset?: number;
    }
  ): Promise<Notification[]> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['notifications'], 'readonly');
      const store = transaction.objectStore('notifications');
      const index = store.index('userId');
      const request = index.openCursor(userId);

      const notifications: Notification[] = [];
      let count = 0;

      request.onsuccess = () => {
        const cursor = request.result;
        if (
          cursor &&
          (!filter?.limit || count < (filter.offset || 0) + filter.limit)
        ) {
          const notification = cursor.value;

          // Apply filters
          if (this.matchesFilter(notification, filter)) {
            if (!filter?.offset || count >= (filter.offset || 0)) {
              notifications.push(notification);
            }
            count++;
          }

          cursor.continue();
        } else {
          // Sort by creation date (newest first)
          notifications.sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          resolve(notifications);
        }
      };

      request.onerror = () => {
        console.error('Failed to get filtered notifications:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Check if notification matches filter criteria
   */
  private matchesFilter(notification: Notification, filter?: any): boolean {
    if (!filter) return true;

    if (filter.status && !filter.status.includes(notification.status)) {
      return false;
    }

    if (filter.category && !filter.category.includes(notification.category)) {
      return false;
    }

    return true;
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    read: number;
    archived: number;
  }> {
    const notifications = await this.getNotifications(userId);

    return {
      total: notifications.length,
      unread: notifications.filter(n => n.status === 'unread').length,
      read: notifications.filter(n => n.status === 'read').length,
      archived: notifications.filter(n => n.status === 'archived').length,
    };
  }

  /**
   * Store user settings
   */
  async storeSettings(settings: NotificationSettings): Promise<void> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');
      const request = store.put(settings);

      request.onsuccess = () => {
        console.log('Settings stored for user:', settings.userId);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to store settings:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get user settings
   */
  async getSettings(userId: string): Promise<NotificationSettings | null> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get(userId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('Failed to get settings:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Store metadata
   */
  async storeMetadata(key: string, value: any): Promise<void> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      const request = store.put({ key, value, updatedAt: new Date() });

      request.onsuccess = () => {
        console.log('Metadata stored:', key);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to store metadata:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get metadata
   */
  async getMetadata(key: string): Promise<any> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result?.value || null);
      };

      request.onerror = () => {
        console.error('Failed to get metadata:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear all data for a user
   */
  async clearUserData(userId: string): Promise<void> {
    await this.ensureDB();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(
        ['notifications', 'settings'],
        'readwrite'
      );

      // Clear notifications
      const notificationsStore = transaction.objectStore('notifications');
      const notificationsRequest = notificationsStore.openCursor();

      notificationsRequest.onsuccess = () => {
        const cursor = notificationsRequest.result;
        if (cursor) {
          if (cursor.value.userId === userId) {
            cursor.delete();
          }
          cursor.continue();
        }
      };

      // Clear settings
      const settingsStore = transaction.objectStore('settings');
      settingsStore.delete(userId);

      transaction.oncomplete = () => {
        console.log('User data cleared:', userId);
        resolve();
      };

      transaction.onerror = () => {
        console.error('Failed to clear user data:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  /**
   * Export all data for backup
   */
  async exportData(userId: string): Promise<NotificationStorage> {
    const [notifications, settings] = await Promise.all([
      this.getNotifications(userId),
      this.getSettings(userId),
    ]);

    return {
      id: `backup_${userId}_${Date.now()}`,
      userId,
      notifications,
      settings: settings || {
        userId,
        globalEnabled: true,
        channels: { inApp: true, email: false, sms: false, push: true },
        categories: {
          general: true,
          security: true,
          system: true,
          workflow: true,
          analytics: true,
          social: false,
          reports: true,
          alerts: true,
        },
        quietHours: {
          enabled: false,
          startTime: '22:00',
          endTime: '08:00',
          timezone: 'UTC',
        },
        digest: { enabled: true, frequency: 'daily', time: '09:00' },
        soundEnabled: true,
        desktopNotifications: true,
      },
      lastSync: new Date(),
      version: 1,
    };
  }

  /**
   * Import data from backup
   */
  async importData(data: NotificationStorage): Promise<void> {
    await this.ensureDB();

    const transaction = this.db!.transaction(
      ['notifications', 'settings'],
      'readwrite'
    );

    return new Promise((resolve, reject) => {
      let completed = 0;
      const total = data.notifications.length + 1; // +1 for settings

      // Import notifications
      data.notifications.forEach(notification => {
        const request = transaction
          .objectStore('notifications')
          .put(notification);
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });

      // Import settings
      const settingsRequest = transaction
        .objectStore('settings')
        .put(data.settings);
      settingsRequest.onsuccess = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };
      settingsRequest.onerror = () => reject(settingsRequest.error);
    });
  }

  /**
   * Clean up old notifications
   */
  async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    await this.ensureDB();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(['notifications'], 'readwrite');
      const store = transaction.objectStore('notifications');
      const request = store.openCursor();

      let deletedCount = 0;

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const notification = cursor.value;
          if (
            new Date(notification.createdAt) < cutoffDate &&
            (notification.status === 'read' ||
              notification.status === 'archived')
          ) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          console.log(`Cleaned up ${deletedCount} old notifications`);
          resolve(deletedCount);
        }
      };

      request.onerror = () => {
        console.error('Failed to cleanup old notifications:', request.error);
        reject(request.error);
      };
    });
  }
}

// Export singleton instance
export const notificationStorage = new NotificationStorageService();
