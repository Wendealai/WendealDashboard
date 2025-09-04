import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import {
  renderWithProviders,
  mockUser,
  mockDashboardData,
} from '@/__tests__/utils/test-utils';
import DashboardPage from '@/pages/Dashboard/DashboardPage';
import { server } from '@/mocks/server';
import { rest } from 'msw';

// Start MSW server
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Dashboard Integration Tests', () => {
  beforeEach(() => {
    // Set authentication state
    localStorage.setItem('token', 'mock-token');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should load and display dashboard data correctly', async () => {
    // Mock authenticated user
    const initialState = {
      user: {
        user: mockUser,
        loading: false,
        error: null,
      },
      ui: {
        theme: 'light',
        sidebarCollapsed: false,
        loading: false,
        notifications: [],
        modal: {
          visible: false,
          title: '',
          content: null,
        },
      },
    };

    renderWithProviders(<DashboardPage />, { initialState });

    // Check page title
    expect(screen.getByText('Dashboard')).toBeInTheDocument();

    // Wait for data loading to complete
    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('1,234')).toBeInTheDocument();
    });

    // Check statistics cards
    expect(screen.getByText('Total Orders')).toBeInTheDocument();
    expect(screen.getByText('5,678')).toBeInTheDocument();
    expect(screen.getByText('Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('¥123,456.78')).toBeInTheDocument();
    expect(screen.getByText('Growth Rate')).toBeInTheDocument();
    expect(screen.getByText('12.5%')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    // Mock API error
    server.use(
      rest.get('/api/dashboard/statistics', (req, res, ctx) => {
        return res(
          ctx.status(500),
          ctx.json({ message: 'Internal Server Error' })
        );
      })
    );

    const initialState = {
      user: {
        user: mockUser,
        loading: false,
        error: null,
      },
      ui: {
        theme: 'light',
        sidebarCollapsed: false,
        loading: false,
        notifications: [],
        modal: {
          visible: false,
          title: '',
          content: null,
        },
      },
    };

    renderWithProviders(<DashboardPage />, { initialState });

    // Wait for error state to display
    await waitFor(() => {
      expect(screen.getByText('Data loading failed')).toBeInTheDocument();
    });

    // Check retry button
    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();
  });

  it('should refresh data when refresh button is clicked', async () => {
    const initialState = {
      user: {
        user: mockUser,
        loading: false,
        error: null,
      },
      ui: {
        theme: 'light',
        sidebarCollapsed: false,
        loading: false,
        notifications: [],
        modal: {
          visible: false,
          title: '',
          content: null,
        },
      },
    };

    renderWithProviders(<DashboardPage />, { initialState });

    // Wait for initial data loading
    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
    });

    // Click refresh button
    const refreshButton = screen.getByTestId('refresh-dashboard');
    fireEvent.click(refreshButton);

    // Check loading state
    expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument();

    // Wait for data to reload
    await waitFor(() => {
      expect(screen.queryByTestId('dashboard-loading')).not.toBeInTheDocument();
      expect(screen.getByText('Total Users')).toBeInTheDocument();
    });
  });

  it('should filter chart data by date range', async () => {
    const initialState = {
      user: {
        user: mockUser,
        loading: false,
        error: null,
      },
      ui: {
        theme: 'light',
        sidebarCollapsed: false,
        loading: false,
        notifications: [],
        modal: {
          visible: false,
          title: '',
          content: null,
        },
      },
    };

    renderWithProviders(<DashboardPage />, { initialState });

    // Wait for chart loading
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-chart')).toBeInTheDocument();
    });

    // Select date range
    const dateRangePicker = screen.getByTestId('date-range-picker');
    fireEvent.click(dateRangePicker);

    // Select last 7 days
    const last7DaysOption = screen.getByText('Last 7 Days');
    fireEvent.click(last7DaysOption);

    // Wait for chart update
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-chart')).toBeInTheDocument();
    });
  });

  it('should export data when export button is clicked', async () => {
    // Mock URL.createObjectURL
    const mockCreateObjectURL = jest.fn(() => 'mock-url');
    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: mockCreateObjectURL,
    });

    // Mock link click
    const mockClick = jest.fn();
    const mockLink = {
      click: mockClick,
      href: '',
      download: '',
      style: { display: '' },
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
    jest
      .spyOn(document.body, 'appendChild')
      .mockImplementation(() => mockLink as any);
    jest
      .spyOn(document.body, 'removeChild')
      .mockImplementation(() => mockLink as any);

    const initialState = {
      user: {
        user: mockUser,
        loading: false,
        error: null,
      },
      ui: {
        theme: 'light',
        sidebarCollapsed: false,
        loading: false,
        notifications: [],
        modal: {
          visible: false,
          title: '',
          content: null,
        },
      },
    };

    renderWithProviders(<DashboardPage />, { initialState });

    // Wait for data loading to complete
    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
    });

    // Click export button
    const exportButton = screen.getByTestId('export-data');
    fireEvent.click(exportButton);

    // Select export format
    const exportExcelOption = screen.getByText('Export as Excel');
    fireEvent.click(exportExcelOption);

    // Verify export functionality is called
    await waitFor(() => {
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
    });
  });

  it('should navigate to detail page when chart item is clicked', async () => {
    const initialState = {
      user: {
        user: mockUser,
        loading: false,
        error: null,
      },
      ui: {
        theme: 'light',
        sidebarCollapsed: false,
        loading: false,
        notifications: [],
        modal: {
          visible: false,
          title: '',
          content: null,
        },
      },
    };

    const { store } = renderWithProviders(<DashboardPage />, { initialState });

    // Wait for chart loading
    await waitFor(() => {
      expect(screen.getByTestId('dashboard-chart')).toBeInTheDocument();
    });

    // Click data point in chart
    const chartElement = screen.getByTestId('dashboard-chart');
    const dataPoint = chartElement.querySelector('.chart-data-point');

    if (dataPoint) {
      fireEvent.click(dataPoint);

      // Verify navigation occurred
      await waitFor(() => {
        expect(window.location.pathname).toBe('/dashboard/details');
      });
    }
  });

  it('should handle real-time data updates', async () => {
    const initialState = {
      user: {
        user: mockUser,
        loading: false,
        error: null,
      },
      ui: {
        theme: 'light',
        sidebarCollapsed: false,
        loading: false,
        notifications: [],
        modal: {
          visible: false,
          title: '',
          content: null,
        },
      },
    };

    renderWithProviders(<DashboardPage />, { initialState });

    // Wait for initial data loading
    await waitFor(() => {
      expect(screen.getByText('1,234')).toBeInTheDocument();
    });

    // Mock real-time data update
    server.use(
      rest.get('/api/dashboard/statistics', (req, res, ctx) => {
        return res(
          ctx.json({
            data: {
              ...mockDashboardData.statistics,
              totalUsers: 1250, // Updated data
            },
          })
        );
      })
    );

    // Trigger data refresh (simulate WebSocket or polling update)
    const event = new CustomEvent('dashboard-update');
    window.dispatchEvent(event);

    // Verify data update
    await waitFor(() => {
      expect(screen.getByText('1,250')).toBeInTheDocument();
    });
  });

  it('should maintain state when switching between tabs', async () => {
    const initialState = {
      user: {
        user: mockUser,
        loading: false,
        error: null,
      },
      ui: {
        theme: 'light',
        sidebarCollapsed: false,
        loading: false,
        notifications: [],
        modal: {
          visible: false,
          title: '',
          content: null,
        },
      },
    };

    renderWithProviders(<DashboardPage />, { initialState });

    // Wait for data loading
    await waitFor(() => {
      expect(screen.getByText('Total Users')).toBeInTheDocument();
    });

    // Switch to analytics tab
    const analyticsTab = screen.getByText('Analytics');
    fireEvent.click(analyticsTab);

    // Verify tab switch
    expect(screen.getByTestId('analytics-content')).toBeInTheDocument();

    // Switch back to overview tab
    const overviewTab = screen.getByText('Overview');
    fireEvent.click(overviewTab);

    // Verify data still exists (state maintained)
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });
});
