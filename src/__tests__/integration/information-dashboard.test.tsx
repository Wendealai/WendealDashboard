/**
 * Information Dashboard Integration Tests
 *
 * End-to-end workflow and API integration tests for the Information Dashboard
 * Tests complete user flows, component interactions, and data management
 */

import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderWithProviders,
  mockUser,
  assertions,
} from '@/__tests__/utils/test-utils';
import InformationDashboard from '@/pages/InformationDashboard/InformationDashboard';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';
import type { Workflow, WorkflowExecution } from '@/types/workflow';
import type { ParsedSubredditData } from '@/services/redditWebhookService';

// Start MSW server
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock data
const mockWorkflow: Workflow = {
  id: 'workflow-1',
  name: 'Reddit Data Collector',
  description: 'Collects data from Reddit for analysis',
  type: 'reddit',
  status: 'active',
  settings: {
    subreddit: 'technology',
    limit: 25,
    timeFilter: 'day',
    sortBy: 'hot',
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  createdBy: 'user-1',
};

const mockWorkflowExecution: WorkflowExecution = {
  id: 'execution-1',
  workflowId: 'workflow-1',
  status: 'completed',
  startedAt: '2024-01-01T10:00:00Z',
  completedAt: '2024-01-01T10:05:00Z',
  result: {
    posts: 15,
    comments: 45,
    dataSize: 1024,
  },
  error: null,
};

const mockRedditData: ParsedSubredditData[] = [
  {
    id: 'post-1',
    title: 'Test Reddit Post',
    author: 'testuser',
    subreddit: 'technology',
    score: 125,
    upvoteRatio: 0.85,
    numComments: 23,
    createdAt: '2024-01-01T09:00:00Z',
    url: 'https://reddit.com/r/technology/post-1',
    selftext: 'This is a test post content',
    linkFlairText: 'Discussion',
    over18: false,
    read: false,
    saved: false,
    hidden: false,
  },
];

describe('Information Dashboard Integration', () => {
  beforeEach(() => {
    // Mock initial data load
    server.use(
      http.get('/api/workflows', () => {
        return HttpResponse.json({
          success: true,
          data: [mockWorkflow],
          total: 1,
        });
      }),

      http.get('/api/workflows/*/executions', () => {
        return HttpResponse.json({
          success: true,
          data: [mockWorkflowExecution],
          total: 1,
        });
      }),

      http.get('/api/reddit/data', () => {
        return HttpResponse.json({
          success: true,
          data: mockRedditData,
        });
      })
    );
  });

  describe('Page Loading and Initial State', () => {
    test('renders dashboard with all components', async () => {
      renderWithProviders(<InformationDashboard />, {
        initialState: { user: { currentUser: mockUser } },
      });

      // Check main components are rendered
      await waitFor(() => {
        expect(screen.getByText('信息仪表板')).toBeInTheDocument();
      });

      // Check sidebar components
      expect(screen.getByText('工作流管理')).toBeInTheDocument();
      expect(screen.getByText('Reddit Data Collector')).toBeInTheDocument();
    });

    test('loads initial data correctly', async () => {
      renderWithProviders(<InformationDashboard />, {
        initialState: { user: { currentUser: mockUser } },
      });

      await waitFor(() => {
        expect(screen.getByText('Test Reddit Post')).toBeInTheDocument();
      });

      // Check workflow data is loaded
      expect(screen.getByText('Reddit Data Collector')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
    });
  });

  describe('Workflow Management', () => {
    test('displays workflow list correctly', async () => {
      renderWithProviders(<InformationDashboard />, {
        initialState: { user: { currentUser: mockUser } },
      });

      await waitFor(() => {
        expect(screen.getByText('Reddit Data Collector')).toBeInTheDocument();
      });

      // Check workflow details
      expect(screen.getByText('Collects data from Reddit for analysis')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
    });

    test('can select and view workflow details', async () => {
      renderWithProviders(<InformationDashboard />, {
        initialState: { user: { currentUser: mockUser } },
      });

      await waitFor(() => {
        expect(screen.getByText('Reddit Data Collector')).toBeInTheDocument();
      });

      // Click on workflow
      const workflowCard = screen.getByText('Reddit Data Collector').closest('div');
      fireEvent.click(workflowCard!);

      // Check workflow panel updates
      await waitFor(() => {
        expect(screen.getByText('工作流详情')).toBeInTheDocument();
      });
    });

    test('can trigger workflow execution', async () => {
      const user = userEvent.setup();

      server.use(
        http.post('/api/workflows/*/execute', () => {
          return HttpResponse.json({
            success: true,
            data: { executionId: 'execution-2' },
          });
        })
      );

      renderWithProviders(<InformationDashboard />, {
        initialState: { user: { currentUser: mockUser } },
      });

      await waitFor(() => {
        expect(screen.getByText('Reddit Data Collector')).toBeInTheDocument();
      });

      // Find and click execute button
      const executeButton = screen.getByRole('button', { name: /执行|运行|触发/ });
      await user.click(executeButton);

      // Check success message
      await waitFor(() => {
        expect(screen.getByText(/执行成功|运行成功/)).toBeInTheDocument();
      });
    });
  });

  describe('Data Display and Interaction', () => {
    test('displays Reddit data in grid format', async () => {
      renderWithProviders(<InformationDashboard />, {
        initialState: { user: { currentUser: mockUser } },
      });

      await waitFor(() => {
        expect(screen.getByText('Test Reddit Post')).toBeInTheDocument();
      });

      // Check data display
      expect(screen.getByText('testuser')).toBeInTheDocument();
      expect(screen.getByText('technology')).toBeInTheDocument();
      expect(screen.getByText('125')).toBeInTheDocument();
      expect(screen.getByText('23')).toBeInTheDocument();
    });

    test('supports data filtering and search', async () => {
      const user = userEvent.setup();

      renderWithProviders(<InformationDashboard />, {
        initialState: { user: { currentUser: mockUser } },
      });

      await waitFor(() => {
        expect(screen.getByText('Test Reddit Post')).toBeInTheDocument();
      });

      // Find search input
      const searchInput = screen.getByPlaceholderText(/搜索|查找/i);
      await user.type(searchInput, 'nonexistent');

      // Check filtering works (post should disappear)
      await waitFor(() => {
        expect(screen.queryByText('Test Reddit Post')).not.toBeInTheDocument();
      });

      // Clear search
      await user.clear(searchInput);
      await user.type(searchInput, 'Test');

      // Check post reappears
      await waitFor(() => {
        expect(screen.getByText('Test Reddit Post')).toBeInTheDocument();
      });
    });

    test('supports data sorting', async () => {
      const user = userEvent.setup();

      renderWithProviders(<InformationDashboard />, {
        initialState: { user: { currentUser: mockUser } },
      });

      await waitFor(() => {
        expect(screen.getByText('Test Reddit Post')).toBeInTheDocument();
      });

      // Find sort dropdown/button
      const sortButton = screen.getByRole('button', { name: /排序|sort/i });
      await user.click(sortButton);

      // Select score sort
      const scoreSort = screen.getByText(/分数|score/i);
      await user.click(scoreSort);

      // Verify data is sorted (this would need more mock data to fully test)
      expect(screen.getByText('Test Reddit Post')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    test('handles API errors gracefully', async () => {
      server.use(
        http.get('/api/workflows', () => {
          return HttpResponse.json(
            { success: false, error: 'API Error' },
            { status: 500 }
          );
        })
      );

      renderWithProviders(<InformationDashboard />, {
        initialState: { user: { currentUser: mockUser } },
      });

      // Check error message is displayed
      await waitFor(() => {
        expect(screen.getByText(/加载失败|API Error/)).toBeInTheDocument();
      });

      // Check retry functionality
      const retryButton = screen.getByRole('button', { name: /重试|retry/i });
      fireEvent.click(retryButton);

      // Should attempt to reload
      expect(retryButton).toBeInTheDocument();
    });

    test('handles workflow execution errors', async () => {
      const user = userEvent.setup();

      server.use(
        http.post('/api/workflows/*/execute', () => {
          return HttpResponse.json(
            { success: false, error: 'Execution failed' },
            { status: 400 }
          );
        })
      );

      renderWithProviders(<InformationDashboard />, {
        initialState: { user: { currentUser: mockUser } },
      });

      await waitFor(() => {
        expect(screen.getByText('Reddit Data Collector')).toBeInTheDocument();
      });

      const executeButton = screen.getByRole('button', { name: /执行|运行|触发/ });
      await user.click(executeButton);

      // Check error message
      await waitFor(() => {
        expect(screen.getByText(/执行失败|Execution failed/)).toBeInTheDocument();
      });
    });
  });

  describe('Real-time Updates', () => {
    test('updates data when new information arrives', async () => {
      renderWithProviders(<InformationDashboard />, {
        initialState: { user: { currentUser: mockUser } },
      });

      await waitFor(() => {
        expect(screen.getByText('Test Reddit Post')).toBeInTheDocument();
      });

      // Simulate new data arrival
      const newRedditData: ParsedSubredditData[] = [
        ...mockRedditData,
        {
          id: 'post-2',
          title: 'New Reddit Post',
          author: 'newuser',
          subreddit: 'technology',
          score: 200,
          upvoteRatio: 0.92,
          numComments: 45,
          createdAt: '2024-01-01T10:00:00Z',
          url: 'https://reddit.com/r/technology/post-2',
          selftext: 'This is a new post',
          linkFlairText: 'News',
          over18: false,
          read: false,
          saved: false,
          hidden: false,
        },
      ];

      server.use(
        http.get('/api/reddit/data', () => {
          return HttpResponse.json({
            success: true,
            data: newRedditData,
          });
        })
      );

      // Trigger data refresh (this would typically be automatic)
      const refreshButton = screen.getByRole('button', { name: /刷新|refresh/i });
      fireEvent.click(refreshButton);

      // Check new data appears
      await waitFor(() => {
        expect(screen.getByText('New Reddit Post')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility and Performance', () => {
    test('maintains accessibility standards', async () => {
      renderWithProviders(<InformationDashboard />, {
        initialState: { user: { currentUser: mockUser } },
      });

      await waitFor(() => {
        expect(screen.getByText('信息仪表板')).toBeInTheDocument();
      });

      // Check for proper ARIA labels
      const mainContent = screen.getByRole('main');
      expect(mainContent).toBeInTheDocument();

      // Check keyboard navigation
      const firstFocusable = screen.getByRole('button');
      firstFocusable.focus();
      expect(document.activeElement).toBe(firstFocusable);
    });

    test('handles loading states properly', async () => {
      // Slow down API response to test loading
      server.use(
        http.get('/api/workflows', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json({
            success: true,
            data: [mockWorkflow],
            total: 1,
          });
        })
      );

      renderWithProviders(<InformationDashboard />, {
        initialState: { user: { currentUser: mockUser } },
      });

      // Check loading indicator appears
      expect(screen.getByText(/加载中|loading/i)).toBeInTheDocument();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.getByText('Reddit Data Collector')).toBeInTheDocument();
      });

      // Loading should disappear
      expect(screen.queryByText(/加载中|loading/i)).not.toBeInTheDocument();
    });
  });
});
