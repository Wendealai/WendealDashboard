import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import {
  renderWithProviders,
  mockNotifications,
  testUtils,
} from '@/__tests__/utils/test-utils';
import NotificationCenter from '@/components/Notification/NotificationCenter';
import type { NotificationItem } from '@/types/ui';

// Mock the notification service
jest.mock('@/services/notification', () => ({
  NotificationService: {
    getNotifications: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
    clearAll: jest.fn(),
  },
}));

const mockNotificationService =
  require('@/services/notification').NotificationService;

describe('NotificationCenter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders notification center correctly', () => {
    renderWithProviders(<NotificationCenter />);

    expect(screen.getByText('Notification Center')).toBeInTheDocument();
    expect(screen.getByText('Mark All as Read')).toBeInTheDocument();
    expect(screen.getByText('清空所有')).toBeInTheDocument();
  });

  it('displays notifications when loaded', async () => {
    mockNotificationService.getNotifications.mockResolvedValue({
      data: mockNotifications,
      total: mockNotifications.length,
    });

    renderWithProviders(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByText('Test Notification')).toBeInTheDocument();
      expect(
        screen.getByText('This is a test notification')
      ).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    mockNotificationService.getNotifications.mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    );

    renderWithProviders(<NotificationCenter />);

    expect(screen.getByTestId('notification-loading')).toBeInTheDocument();
  });

  it('handles empty notifications state', async () => {
    mockNotificationService.getNotifications.mockResolvedValue({
      data: [],
      total: 0,
    });

    renderWithProviders(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByText('暂无通知')).toBeInTheDocument();
    });
  });

  it('marks notification as read when clicked', async () => {
    const unreadNotification: NotificationItem = {
      ...mockNotifications[0],
      status: 'unread',
    };

    mockNotificationService.getNotifications.mockResolvedValue({
      data: [unreadNotification],
      total: 1,
    });
    mockNotificationService.markAsRead.mockResolvedValue({ success: true });

    renderWithProviders(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByText('Test Notification')).toBeInTheDocument();
    });

    const notificationItem = screen.getByTestId(
      `notification-${unreadNotification.id}`
    );
    fireEvent.click(notificationItem);

    await waitFor(() => {
      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith(
        unreadNotification.id
      );
    });
  });

  it('marks all notifications as read', async () => {
    mockNotificationService.getNotifications.mockResolvedValue({
      data: mockNotifications,
      total: mockNotifications.length,
    });
    mockNotificationService.markAllAsRead.mockResolvedValue({ success: true });

    renderWithProviders(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByText('全部标记为已读')).toBeInTheDocument();
    });

    const markAllButton = screen.getByText('全部标记为已读');
    fireEvent.click(markAllButton);

    await waitFor(() => {
      expect(mockNotificationService.markAllAsRead).toHaveBeenCalled();
    });
  });

  it('clears all notifications', async () => {
    mockNotificationService.getNotifications.mockResolvedValue({
      data: mockNotifications,
      total: mockNotifications.length,
    });
    mockNotificationService.clearAll.mockResolvedValue({ success: true });

    renderWithProviders(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByText('清空所有')).toBeInTheDocument();
    });

    const clearAllButton = screen.getByText('清空所有');
    fireEvent.click(clearAllButton);

    await waitFor(() => {
      expect(mockNotificationService.clearAll).toHaveBeenCalled();
    });
  });

  it('deletes individual notification', async () => {
    mockNotificationService.getNotifications.mockResolvedValue({
      data: mockNotifications,
      total: mockNotifications.length,
    });
    mockNotificationService.deleteNotification.mockResolvedValue({
      success: true,
    });

    renderWithProviders(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByText('Test Notification')).toBeInTheDocument();
    });

    const deleteButton = screen.getByTestId(
      `delete-notification-${mockNotifications[0].id}`
    );
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockNotificationService.deleteNotification).toHaveBeenCalledWith(
        mockNotifications[0].id
      );
    });
  });

  it('handles API errors gracefully', async () => {
    mockNotificationService.getNotifications.mockRejectedValue(
      new Error('Failed to fetch notifications')
    );

    renderWithProviders(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByText('加载通知失败')).toBeInTheDocument();
    });
  });

  it('filters notifications by type', async () => {
    const notifications = [
      { ...mockNotifications[0], type: 'info' },
      {
        ...mockNotifications[0],
        id: '2',
        type: 'warning',
        title: 'Warning Notification',
      },
      {
        ...mockNotifications[0],
        id: '3',
        type: 'error',
        title: 'Error Notification',
      },
    ];

    mockNotificationService.getNotifications.mockResolvedValue({
      data: notifications,
      total: notifications.length,
    });

    renderWithProviders(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByText('Test Notification')).toBeInTheDocument();
      expect(screen.getByText('Warning Notification')).toBeInTheDocument();
      expect(screen.getByText('Error Notification')).toBeInTheDocument();
    });

    // Filter by warning type
    const warningFilter = screen.getByTestId('filter-warning');
    fireEvent.click(warningFilter);

    await waitFor(() => {
      expect(screen.getByText('Warning Notification')).toBeInTheDocument();
      expect(screen.queryByText('Test Notification')).not.toBeInTheDocument();
      expect(screen.queryByText('Error Notification')).not.toBeInTheDocument();
    });
  });

  it('supports pagination', async () => {
    const manyNotifications = Array.from({ length: 25 }, (_, i) => ({
      ...mockNotifications[0],
      id: `notification-${i}`,
      title: `Notification ${i + 1}`,
    }));

    mockNotificationService.getNotifications.mockResolvedValue({
      data: manyNotifications.slice(0, 10),
      total: manyNotifications.length,
    });

    renderWithProviders(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByText('Notification 1')).toBeInTheDocument();
      expect(screen.getByText('Notification 10')).toBeInTheDocument();
    });

    // Check pagination controls
    expect(screen.getByRole('navigation')).toBeInTheDocument();
  });

  it('refreshes notifications when refresh button is clicked', async () => {
    mockNotificationService.getNotifications.mockResolvedValue({
      data: mockNotifications,
      total: mockNotifications.length,
    });

    renderWithProviders(<NotificationCenter />);

    await waitFor(() => {
      expect(screen.getByText('Test Notification')).toBeInTheDocument();
    });

    const refreshButton = screen.getByTestId('refresh-notifications');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(mockNotificationService.getNotifications).toHaveBeenCalledTimes(2);
    });
  });
});
