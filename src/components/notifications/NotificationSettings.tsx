/**
 * Notification Settings Component
 * User preferences and configuration for notifications
 */

import React, { useState, useEffect } from 'react';
import { notificationService } from '@/services/notificationService';
import type { NotificationSettings } from '@/types/notification';
import { NotificationCategory } from '@/types/notification';

interface NotificationSettingsPanelProps {
  userId: string;
  onSettingsChange?: (settings: NotificationSettings) => void;
  className?: string;
}

export const NotificationSettingsPanel: React.FC<
  NotificationSettingsPanelProps
> = ({ userId, onSettingsChange, className = '' }) => {
  const [settings, setSettings] = useState<NotificationSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);
        const userSettings = await notificationService.getSettings();
        setSettings(userSettings);
      } catch (err) {
        console.error('Failed to load notification settings:', err);
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [userId]);

  // Handle setting changes
  const handleSettingChange = async (
    key: keyof NotificationSettings,
    value: any
  ) => {
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);

      const updatedSettings = { ...settings, [key]: value };
      setSettings(updatedSettings);

      await notificationService.updateSettings({ [key]: value });

      if (onSettingsChange) {
        onSettingsChange(updatedSettings);
      }
    } catch (err) {
      console.error('Failed to update setting:', err);
      setError('Failed to save settings');
      // Revert the change on error
      const originalSettings = await notificationService.getSettings();
      setSettings(originalSettings);
    } finally {
      setSaving(false);
    }
  };

  // Handle channel toggle
  const handleChannelToggle = (
    channel: keyof NotificationSettings['channels']
  ) => {
    if (!settings) return;
    handleSettingChange('channels', {
      ...settings.channels,
      [channel]: !settings.channels[channel],
    });
  };

  // Handle category toggle
  const handleCategoryToggle = (category: NotificationCategory) => {
    if (!settings) return;
    handleSettingChange('categories', {
      ...settings.categories,
      [category]: !settings.categories[category],
    });
  };

  // Handle quiet hours toggle
  const handleQuietHoursToggle = () => {
    if (!settings) return;
    handleSettingChange('quietHours', {
      ...settings.quietHours,
      enabled: !settings.quietHours.enabled,
    });
  };

  // Handle digest toggle
  const handleDigestToggle = () => {
    if (!settings) return;
    handleSettingChange('digest', {
      ...settings.digest,
      enabled: !settings.digest.enabled,
    });
  };

  if (loading) {
    return (
      <div
        className={`bg-white dark:bg-gray-900 rounded-lg shadow p-6 ${className}`}
      >
        <div className='flex items-center space-x-2 mb-4'>
          <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600'></div>
          <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Notification Settings
          </h2>
        </div>
        <div className='text-sm text-gray-600 dark:text-gray-300'>
          Loading settings...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`bg-white dark:bg-gray-900 rounded-lg shadow p-6 ${className}`}
      >
        <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4'>
          Notification Settings
        </h2>
        <div className='text-red-600 dark:text-red-400 text-sm'>⚠️ {error}</div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div
        className={`bg-white dark:bg-gray-900 rounded-lg shadow p-6 ${className}`}
      >
        <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4'>
          Notification Settings
        </h2>
        <div className='text-gray-600 dark:text-gray-300 text-sm'>
          No settings available
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-lg shadow p-6 ${className}`}
    >
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
          Notification Settings
        </h2>
        {saving && (
          <div className='flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400'>
            <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600'></div>
            <span>Saving...</span>
          </div>
        )}
      </div>

      {/* Global Settings */}
      <div className='mb-6'>
        <h3 className='text-md font-medium text-gray-900 dark:text-gray-100 mb-3'>
          General
        </h3>
        <div className='space-y-3'>
          <label className='flex items-center'>
            <input
              type='checkbox'
              checked={settings.globalEnabled}
              onChange={e =>
                handleSettingChange('globalEnabled', e.target.checked)
              }
              className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
            />
            <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>
              Enable notifications
            </span>
          </label>

          <label className='flex items-center'>
            <input
              type='checkbox'
              checked={settings.soundEnabled}
              onChange={e =>
                handleSettingChange('soundEnabled', e.target.checked)
              }
              className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
            />
            <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>
              Play notification sounds
            </span>
          </label>

          <label className='flex items-center'>
            <input
              type='checkbox'
              checked={settings.desktopNotifications}
              onChange={e =>
                handleSettingChange('desktopNotifications', e.target.checked)
              }
              className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
            />
            <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>
              Show desktop notifications
            </span>
          </label>
        </div>
      </div>

      {/* Notification Channels */}
      <div className='mb-6'>
        <h3 className='text-md font-medium text-gray-900 dark:text-gray-100 mb-3'>
          Notification Channels
        </h3>
        <div className='space-y-3'>
          <label className='flex items-center'>
            <input
              type='checkbox'
              checked={settings.channels.inApp}
              onChange={() => handleChannelToggle('inApp')}
              disabled={!settings.globalEnabled}
              className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50'
            />
            <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>
              In-app notifications
            </span>
          </label>

          <label className='flex items-center'>
            <input
              type='checkbox'
              checked={settings.channels.email}
              onChange={() => handleChannelToggle('email')}
              disabled={!settings.globalEnabled}
              className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50'
            />
            <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>
              Email notifications
            </span>
          </label>

          <label className='flex items-center'>
            <input
              type='checkbox'
              checked={settings.channels.sms}
              onChange={() => handleChannelToggle('sms')}
              disabled={!settings.globalEnabled}
              className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50'
            />
            <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>
              SMS notifications
            </span>
          </label>

          <label className='flex items-center'>
            <input
              type='checkbox'
              checked={settings.channels.push}
              onChange={() => handleChannelToggle('push')}
              disabled={!settings.globalEnabled}
              className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50'
            />
            <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>
              Push notifications
            </span>
          </label>
        </div>
      </div>

      {/* Notification Categories */}
      <div className='mb-6'>
        <h3 className='text-md font-medium text-gray-900 dark:text-gray-100 mb-3'>
          Notification Categories
        </h3>
        <div className='grid grid-cols-2 gap-3'>
          {Object.entries(settings.categories).map(([category, enabled]) => (
            <label key={category} className='flex items-center'>
              <input
                type='checkbox'
                checked={enabled}
                onChange={() =>
                  handleCategoryToggle(category as NotificationCategory)
                }
                disabled={!settings.globalEnabled}
                className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50'
              />
              <span className='ml-2 text-sm text-gray-700 dark:text-gray-300 capitalize'>
                {category.replace('_', ' ')}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Quiet Hours */}
      <div className='mb-6'>
        <div className='flex items-center justify-between mb-3'>
          <h3 className='text-md font-medium text-gray-900 dark:text-gray-100'>
            Quiet Hours
          </h3>
          <label className='flex items-center'>
            <input
              type='checkbox'
              checked={settings.quietHours.enabled}
              onChange={handleQuietHoursToggle}
              disabled={!settings.globalEnabled}
              className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50'
            />
            <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>
              Enable
            </span>
          </label>
        </div>

        {settings.quietHours.enabled && (
          <div className='space-y-3 pl-6 border-l-2 border-gray-200 dark:border-gray-700'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Start Time
              </label>
              <input
                type='time'
                value={settings.quietHours.startTime}
                onChange={e =>
                  handleSettingChange('quietHours', {
                    ...settings.quietHours,
                    startTime: e.target.value,
                  })
                }
                className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                End Time
              </label>
              <input
                type='time'
                value={settings.quietHours.endTime}
                onChange={e =>
                  handleSettingChange('quietHours', {
                    ...settings.quietHours,
                    endTime: e.target.value,
                  })
                }
                className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm'
              />
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Timezone
              </label>
              <select
                value={settings.quietHours.timezone}
                onChange={e =>
                  handleSettingChange('quietHours', {
                    ...settings.quietHours,
                    timezone: e.target.value,
                  })
                }
                className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm'
              >
                <option value='UTC'>UTC</option>
                <option value='America/New_York'>Eastern Time</option>
                <option value='America/Chicago'>Central Time</option>
                <option value='America/Denver'>Mountain Time</option>
                <option value='America/Los_Angeles'>Pacific Time</option>
                <option value='Europe/London'>London</option>
                <option value='Europe/Paris'>Paris</option>
                <option value='Asia/Tokyo'>Tokyo</option>
                <option value='Asia/Shanghai'>Shanghai</option>
                <option value='Australia/Sydney'>Sydney</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Digest Settings */}
      <div className='mb-6'>
        <div className='flex items-center justify-between mb-3'>
          <h3 className='text-md font-medium text-gray-900 dark:text-gray-100'>
            Daily Digest
          </h3>
          <label className='flex items-center'>
            <input
              type='checkbox'
              checked={settings.digest.enabled}
              onChange={handleDigestToggle}
              disabled={!settings.globalEnabled}
              className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50'
            />
            <span className='ml-2 text-sm text-gray-700 dark:text-gray-300'>
              Enable
            </span>
          </label>
        </div>

        {settings.digest.enabled && (
          <div className='space-y-3 pl-6 border-l-2 border-gray-200 dark:border-gray-700'>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Frequency
              </label>
              <select
                value={settings.digest.frequency}
                onChange={e =>
                  handleSettingChange('digest', {
                    ...settings.digest,
                    frequency: e.target.value as 'daily' | 'weekly' | 'monthly',
                  })
                }
                className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm'
              >
                <option value='daily'>Daily</option>
                <option value='weekly'>Weekly</option>
                <option value='monthly'>Monthly</option>
              </select>
            </div>
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Delivery Time
              </label>
              <input
                type='time'
                value={settings.digest.time}
                onChange={e =>
                  handleSettingChange('digest', {
                    ...settings.digest,
                    time: e.target.value,
                  })
                }
                className='w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm'
              />
            </div>
          </div>
        )}
      </div>

      {/* Reset to Defaults */}
      <div className='pt-4 border-t border-gray-200 dark:border-gray-700'>
        <button
          onClick={async () => {
            try {
              setSaving(true);
              const defaultSettings = await notificationService.updateSettings(
                {}
              );
              setSettings(defaultSettings);
              if (onSettingsChange) {
                onSettingsChange(defaultSettings);
              }
            } catch (err) {
              console.error('Failed to reset settings:', err);
              setError('Failed to reset settings');
            } finally {
              setSaving(false);
            }
          }}
          className='w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors duration-200'
        >
          Reset to defaults
        </button>
      </div>
    </div>
  );
};

export default NotificationSettingsPanel;
