import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderWithProviders,
  mockUser,
  createMockFile,
  assertions,
} from '@/__tests__/utils/test-utils';
import InvoiceOCRPage from '@/pages/InformationDashboard/InvoiceOCRPage';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';
import type {
  InvoiceOCRWorkflow,
  InvoiceOCRResult,
  InvoiceOCRSettings,
  InvoiceOCRStatus,
} from '@/pages/InformationDashboard/types/invoiceOCR';

// Start MSW server
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Mock data
const mockWorkflow: InvoiceOCRWorkflow = {
  id: 'workflow-1',
  name: 'Test Workflow',
  description: 'Invoice OCR workflow for testing',
  status: 'active' as InvoiceOCRStatus,
  settings: {
    outputFormat: 'json',
    enableWebhook: false,
    webhookUrl: '',
    enableNotifications: true,
    confidenceThreshold: 0.8,
    autoValidation: false,
    retryAttempts: 3,
    timeout: 30000,
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  createdBy: 'user-1',
  lastExecutedAt: null,
  executionCount: 0,
  successRate: 0,
};

const mockResults: InvoiceOCRResult[] = [
  {
    id: 'result-1',
    workflowId: 'workflow-1',
    fileName: 'invoice-001.pdf',
    fileSize: 1024000,
    status: 'completed' as InvoiceOCRStatus,
    confidence: 0.95,
    extractedData: {
      invoiceNumber: 'INV-001',
      date: '2024-01-15',
      vendor: 'Test Vendor',
      amount: 1500.0,
      currency: 'CNY',
      items: [
        {
          description: 'Test Product',
          quantity: 2,
          unitPrice: 750.0,
          total: 1500.0,
        },
      ],
    },
    processingTime: 5000,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:05Z',
    downloadUrl: '/api/invoice-ocr/results/result-1/download',
  },
  {
    id: 'result-2',
    workflowId: 'workflow-1',
    fileName: 'invoice-002.pdf',
    fileSize: 2048000,
    status: 'failed' as InvoiceOCRStatus,
    confidence: 0.45,
    error: 'File format not supported',
    processingTime: 2000,
    createdAt: '2024-01-15T11:00:00Z',
    updatedAt: '2024-01-15T11:00:02Z',
  },
];

// MSW handlers
const invoiceOCRHandlers = [
  // Get workflow list
  http.get('/api/invoice-ocr', () => {
    return HttpResponse.json({
      success: true,
      data: [mockWorkflow],
      total: 1,
      page: 1,
      pageSize: 10,
    });
  }),

  // Create workflow
  http.post('/api/invoice-ocr', async ({ request }) => {
    const body = (await request.json()) as any;
    const newWorkflow = {
      ...mockWorkflow,
      id: 'workflow-new',
      name: body.name,
      description: body.description,
    };
    return HttpResponse.json({
      success: true,
      data: newWorkflow,
    });
  }),

  // Update workflow
  http.put('/api/invoice-ocr/:workflowId', async ({ params, request }) => {
    const body = (await request.json()) as any;
    const updatedWorkflow = {
      ...mockWorkflow,
      id: params.workflowId,
      ...body,
      updatedAt: new Date().toISOString(),
    };
    return HttpResponse.json({
      success: true,
      data: updatedWorkflow,
    });
  }),

  // Delete workflow
  http.delete('/api/invoice-ocr/:workflowId', () => {
    return HttpResponse.json({
      success: true,
      message: 'Workflow deleted successfully',
    });
  }),

  // Upload file
  http.post('/api/invoice-ocr/:workflowId/upload', () => {
    return HttpResponse.json({
      success: true,
      data: {
        taskId: 'task-1',
        status: 'processing',
        message: 'File uploaded successfully, processing started',
      },
    });
  }),

  // Get results list
  http.get('/api/invoice-ocr/:workflowId/results', () => {
    return HttpResponse.json({
      success: true,
      data: mockResults,
      total: 2,
      page: 1,
      pageSize: 10,
    });
  }),

  // Download result
  http.get('/api/invoice-ocr/results/:resultId/download', () => {
    return HttpResponse.json({
      success: true,
      data: {
        downloadUrl: 'https://example.com/download/result-1.json',
      },
    });
  }),

  // Delete result
  http.delete('/api/invoice-ocr/results/:resultId', () => {
    return HttpResponse.json({
      success: true,
      message: 'Result deleted successfully',
    });
  }),

  // Retry processing
  http.post('/api/invoice-ocr/results/:resultId/retry', () => {
    return HttpResponse.json({
      success: true,
      data: {
        taskId: 'task-retry-1',
        status: 'processing',
        message: 'Reprocessing started',
      },
    });
  }),

  // Test Webhook connection
  http.post('/api/invoice-ocr/test-webhook', () => {
    return HttpResponse.json({
      success: true,
      message: 'Webhook connection test successful',
    });
  }),

  // Get workflow statistics
  http.get('/api/invoice-ocr/statistics', () => {
    return HttpResponse.json({
      success: true,
      data: {
        totalWorkflows: 5,
        activeWorkflows: 3,
        totalProcessed: 150,
        successRate: 0.92,
        avgProcessingTime: 4500,
        recentActivity: [
          {
            id: 'activity-1',
            type: 'workflow_created',
            workflowName: 'New Workflow',
            timestamp: '2024-01-15T10:00:00Z',
          },
          {
            id: 'activity-2',
            type: 'file_processed',
            fileName: 'invoice-001.pdf',
            status: 'completed',
            timestamp: '2024-01-15T09:30:00Z',
          },
        ],
      },
    });
  }),
];

describe('Invoice OCR Integration Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    // Set authentication state
    localStorage.setItem('token', 'mock-token');

    // Add Invoice OCR related MSW handlers
    server.use(...invoiceOCRHandlers);
  });

  afterEach(() => {
    localStorage.clear();
  });

  const renderInvoiceOCRPage = (initialState = {}) => {
    const defaultState = {
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
      invoiceOCR: {
        workflows: [],
        currentWorkflow: null,
        results: [],
        settings: null,
        statistics: null,
        loading: false,
        error: null,
      },
      ...initialState,
    };

    return renderWithProviders(<InvoiceOCRPage />, {
      initialState: defaultState,
    });
  };

  describe('Page initialization and data loading', () => {
    it('should correctly load and display Invoice OCR page', async () => {
      renderInvoiceOCRPage();

      // Check page title
      expect(screen.getByText('Invoice OCR')).toBeInTheDocument();

      // Wait for workflow list to load
      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument();
      });

      // Check workflow card information
      expect(
        screen.getByText('Invoice OCR workflow for testing')
      ).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should correctly handle API errors', async () => {
      // Mock API error
      server.use(
        http.get('/api/invoice-ocr', () => {
          return HttpResponse.json(
            { success: false, message: 'Server error' },
            { status: 500 }
          );
        })
      );

      renderInvoiceOCRPage();

      // Wait for error state to display
      await waitFor(() => {
        expect(screen.getByText(/Load failed/)).toBeInTheDocument();
      });

      // Check retry button
      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();
    });

    it('should display loading state', async () => {
      // Delay API response
      server.use(
        http.get('/api/invoice-ocr', async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return HttpResponse.json({
            success: true,
            data: [mockWorkflow],
          });
        })
      );

      renderInvoiceOCRPage();

      // Check loading state
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
        expect(screen.getByText('Test Workflow')).toBeInTheDocument();
      });
    });
  });

  describe('Workflow management', () => {
    it('should be able to create new workflow', async () => {
      renderInvoiceOCRPage();

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('Invoice OCR')).toBeInTheDocument();
      });

      // Click create workflow button
      const createButton = screen.getByText('Create Workflow');
      await user.click(createButton);

      // Check if modal is open
      await waitFor(() => {
        expect(
          screen.getByText('Create Invoice OCR Workflow')
        ).toBeInTheDocument();
      });

      // Fill form
      const nameInput = screen.getByLabelText('Workflow Name');
      const descInput = screen.getByLabelText('Description');

      await user.type(nameInput, 'New Test Workflow');
      await user.type(descInput, 'This is a new test workflow');

      // Submit form
      const submitButton = screen.getByText('Create');
      await user.click(submitButton);

      // Wait for creation success
      await waitFor(() => {
        expect(
          screen.getByText('Workflow created successfully')
        ).toBeInTheDocument();
      });

      // Check if new workflow appears in list
      await waitFor(() => {
        expect(screen.getByText('New Test Workflow')).toBeInTheDocument();
      });
    });

    it('should be able to edit workflow settings', async () => {
      renderInvoiceOCRPage();

      // Wait for workflow list to load
      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument();
      });

      // Click settings button
      const settingsButton = screen.getByTestId('workflow-settings-workflow-1');
      await user.click(settingsButton);

      // Check if settings panel is open
      await waitFor(() => {
        expect(screen.getByText('Workflow Settings')).toBeInTheDocument();
      });

      // Modify settings
      const webhookToggle = screen.getByLabelText(
        'Enable Webhook Notifications'
      );
      await user.click(webhookToggle);

      const webhookUrlInput = screen.getByLabelText('Webhook URL');
      await user.type(webhookUrlInput, 'https://example.com/webhook');

      // Save settings
      const saveButton = screen.getByText('Save Settings');
      await user.click(saveButton);

      // Wait for save success
      await waitFor(() => {
        expect(
          screen.getByText('Settings saved successfully')
        ).toBeInTheDocument();
      });
    });

    it('should be able to delete workflow', async () => {
      renderInvoiceOCRPage();

      // Wait for workflow list to load
      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument();
      });

      // Click delete button
      const deleteButton = screen.getByTestId('workflow-delete-workflow-1');
      await user.click(deleteButton);

      // Confirm deletion
      await waitFor(() => {
        expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Confirm');
      await user.click(confirmButton);

      // Wait for deletion success
      await waitFor(() => {
        expect(
          screen.getByText('Workflow deleted successfully')
        ).toBeInTheDocument();
      });
    });
  });

  describe('File upload and processing', () => {
    it('should be able to upload file and start processing', async () => {
      renderInvoiceOCRPage();

      // Wait for workflow list to load
      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument();
      });

      // Select workflow
      const workflowCard = screen.getByTestId('workflow-card-workflow-1');
      await user.click(workflowCard);

      // Wait for file upload area to display
      await waitFor(() => {
        expect(
          screen.getByText('Drag files here or click to upload')
        ).toBeInTheDocument();
      });

      // Create mock file
      const file = createMockFile(
        'invoice-test.pdf',
        1024000,
        'application/pdf'
      );

      // Mock file upload
      const uploadInput = screen.getByTestId('file-upload-input');
      await user.upload(uploadInput, file);

      // Wait for upload success
      await waitFor(() => {
        expect(
          screen.getByText('File uploaded successfully')
        ).toBeInTheDocument();
      });

      // Check processing status
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('should be able to handle multiple file upload', async () => {
      renderInvoiceOCRPage();

      // Wait for workflow selection
      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument();
      });

      const workflowCard = screen.getByTestId('workflow-card-workflow-1');
      await user.click(workflowCard);

      // Create multiple mock files
      const files = [
        createMockFile('invoice-1.pdf', 1024000, 'application/pdf'),
        createMockFile('invoice-2.pdf', 2048000, 'application/pdf'),
        createMockFile('invoice-3.pdf', 1536000, 'application/pdf'),
      ];

      // Upload multiple files
      const uploadInput = screen.getByTestId('file-upload-input');
      await user.upload(uploadInput, files);

      // Wait for all files to upload
      await waitFor(() => {
        expect(
          screen.getByText('3 files uploaded successfully')
        ).toBeInTheDocument();
      });

      // Check file list
      files.forEach(file => {
        expect(screen.getByText(file.name)).toBeInTheDocument();
      });
    });

    it('should be able to handle file upload errors', async () => {
      // Mock upload failure
      server.use(
        http.post('/api/invoice-ocr/:workflowId/upload', () => {
          return HttpResponse.json(
            { success: false, message: 'File format not supported' },
            { status: 400 }
          );
        })
      );

      renderInvoiceOCRPage();

      // Select workflow and upload file
      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument();
      });

      const workflowCard = screen.getByTestId('workflow-card-workflow-1');
      await user.click(workflowCard);

      const file = createMockFile('invalid-file.txt', 1024, 'text/plain');
      const uploadInput = screen.getByTestId('file-upload-input');
      await user.upload(uploadInput, file);

      // Wait for error message to display
      await waitFor(() => {
        expect(
          screen.getByText('File format not supported')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Result viewing and management', () => {
    it('should be able to view processing results list', async () => {
      renderInvoiceOCRPage();

      // Select workflow
      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument();
      });

      const workflowCard = screen.getByTestId('workflow-card-workflow-1');
      await user.click(workflowCard);

      // Switch to results panel
      const resultsTab = screen.getByText('Processing Results');
      await user.click(resultsTab);

      // Wait for results list to load
      await waitFor(() => {
        expect(screen.getByText('invoice-001.pdf')).toBeInTheDocument();
        expect(screen.getByText('invoice-002.pdf')).toBeInTheDocument();
      });

      // Check result status
      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Processing Failed')).toBeInTheDocument();

      // Check confidence display
      expect(screen.getByText('95%')).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument();
    });

    it('should be able to view result details', async () => {
      renderInvoiceOCRPage();

      // Navigate to results list
      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument();
      });

      const workflowCard = screen.getByTestId('workflow-card-workflow-1');
      await user.click(workflowCard);

      const resultsTab = screen.getByText('Processing Results');
      await user.click(resultsTab);

      // Wait for results to load and click view details
      await waitFor(() => {
        expect(screen.getByText('invoice-001.pdf')).toBeInTheDocument();
      });

      const viewDetailsButton = screen.getByTestId('view-details-result-1');
      await user.click(viewDetailsButton);

      // Check details panel
      await waitFor(() => {
        expect(
          screen.getByText('Extraction Result Details')
        ).toBeInTheDocument();
        expect(screen.getByText('INV-001')).toBeInTheDocument();
        expect(screen.getByText('Test Vendor')).toBeInTheDocument();
        expect(screen.getByText('¥1,500.00')).toBeInTheDocument();
      });
    });

    it('should be able to download processing results', async () => {
      // Mock window.open
      const mockOpen = jest.fn();
      Object.defineProperty(window, 'open', {
        writable: true,
        value: mockOpen,
      });

      renderInvoiceOCRPage();

      // Navigate to results list
      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument();
      });

      const workflowCard = screen.getByTestId('workflow-card-workflow-1');
      await user.click(workflowCard);

      const resultsTab = screen.getByText('Processing Results');
      await user.click(resultsTab);

      // Click download button
      await waitFor(() => {
        expect(screen.getByText('invoice-001.pdf')).toBeInTheDocument();
      });

      const downloadButton = screen.getByTestId('download-result-1');
      await user.click(downloadButton);

      // Wait for download to start
      await waitFor(() => {
        expect(screen.getByText('Download started')).toBeInTheDocument();
      });
    });

    it('should be able to retry failed processing', async () => {
      renderInvoiceOCRPage();

      // Navigate to results list
      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument();
      });

      const workflowCard = screen.getByTestId('workflow-card-workflow-1');
      await user.click(workflowCard);

      const resultsTab = screen.getByText('Processing Results');
      await user.click(resultsTab);

      // Find failed result and click retry
      await waitFor(() => {
        expect(screen.getByText('invoice-002.pdf')).toBeInTheDocument();
      });

      const retryButton = screen.getByTestId('retry-result-2');
      await user.click(retryButton);

      // Wait for retry to start
      await waitFor(() => {
        expect(screen.getByText('Reprocessing started')).toBeInTheDocument();
      });
    });

    it('should be able to delete processing results', async () => {
      renderInvoiceOCRPage();

      // Navigate to results list
      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument();
      });

      const workflowCard = screen.getByTestId('workflow-card-workflow-1');
      await user.click(workflowCard);

      const resultsTab = screen.getByText('Processing Results');
      await user.click(resultsTab);

      // Delete result
      await waitFor(() => {
        expect(screen.getByText('invoice-001.pdf')).toBeInTheDocument();
      });

      const deleteButton = screen.getByTestId('delete-result-1');
      await user.click(deleteButton);

      // Confirm deletion
      await waitFor(() => {
        expect(screen.getByText('Confirm Deletion')).toBeInTheDocument();
      });

      const confirmButton = screen.getByText('Confirm');
      await user.click(confirmButton);

      // Wait for deletion success
      await waitFor(() => {
        expect(
          screen.getByText('Result deleted successfully')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Search and Filter Features', () => {
    it('should be able to search workflows', async () => {
      renderInvoiceOCRPage();

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument();
      });

      // Use search functionality
      const searchInput = screen.getByPlaceholderText('Search workflows...');
      await user.type(searchInput, 'test');

      // Check search results
      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument();
      });

      // Search for non-existent workflow
      await user.clear(searchInput);
      await user.type(searchInput, 'non-existent workflow');

      await waitFor(() => {
        expect(screen.queryByText('Test Workflow')).not.toBeInTheDocument();
        expect(
          screen.getByText('No matching workflows found')
        ).toBeInTheDocument();
      });
    });

    it('should be able to filter results by status', async () => {
      renderInvoiceOCRPage();

      // Navigate to results list
      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument();
      });

      const workflowCard = screen.getByTestId('workflow-card-workflow-1');
      await user.click(workflowCard);

      const resultsTab = screen.getByText('Processing Results');
      await user.click(resultsTab);

      // Wait for results to load
      await waitFor(() => {
        expect(screen.getByText('invoice-001.pdf')).toBeInTheDocument();
        expect(screen.getByText('invoice-002.pdf')).toBeInTheDocument();
      });

      // Filter by status
      const statusFilter = screen.getByTestId('status-filter');
      await user.selectOptions(statusFilter, 'completed');

      // Check filtered results
      await waitFor(() => {
        expect(screen.getByText('invoice-001.pdf')).toBeInTheDocument();
        expect(screen.queryByText('invoice-002.pdf')).not.toBeInTheDocument();
      });
    });

    it('should be able to search result files', async () => {
      renderInvoiceOCRPage();

      // Navigate to results list
      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument();
      });

      const workflowCard = screen.getByTestId('workflow-card-workflow-1');
      await user.click(workflowCard);

      const resultsTab = screen.getByText('Processing Results');
      await user.click(resultsTab);

      // Search result files
      await waitFor(() => {
        expect(screen.getByText('invoice-001.pdf')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search result files...');
      await user.type(searchInput, 'invoice-001');

      // Check search results
      await waitFor(() => {
        expect(screen.getByText('invoice-001.pdf')).toBeInTheDocument();
        expect(screen.queryByText('invoice-002.pdf')).not.toBeInTheDocument();
      });
    });
  });

  describe('Statistics and Dashboard', () => {
    it('should display statistics information', async () => {
      renderInvoiceOCRPage();

      // Wait for statistics to load
      await waitFor(() => {
        expect(screen.getByText('Total Workflows')).toBeInTheDocument();
        expect(screen.getByText('5')).toBeInTheDocument();
        expect(screen.getByText('Active Workflows')).toBeInTheDocument();
        expect(screen.getByText('3')).toBeInTheDocument();
        expect(screen.getByText('Total Processed')).toBeInTheDocument();
        expect(screen.getByText('150')).toBeInTheDocument();
        expect(screen.getByText('Success Rate')).toBeInTheDocument();
        expect(screen.getByText('92%')).toBeInTheDocument();
      });
    });

    it('should display recent activities', async () => {
      renderInvoiceOCRPage();

      // Wait for activity list to load
      await waitFor(() => {
        expect(screen.getByText('Recent Activities')).toBeInTheDocument();
        expect(screen.getByText('New Workflow')).toBeInTheDocument();
        expect(screen.getByText('invoice-001.pdf')).toBeInTheDocument();
      });
    });

    it('should be able to refresh statistics data', async () => {
      renderInvoiceOCRPage();

      // Wait for statistics to load
      await waitFor(() => {
        expect(screen.getByText('Total Workflows')).toBeInTheDocument();
      });

      // Click refresh button
      const refreshButton = screen.getByTestId('refresh-statistics');
      await user.click(refreshButton);

      // Check loading state
      expect(screen.getByTestId('statistics-loading')).toBeInTheDocument();

      // Wait for refresh to complete
      await waitFor(() => {
        expect(
          screen.queryByTestId('statistics-loading')
        ).not.toBeInTheDocument();
        expect(screen.getByText('Total Workflows')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Layout and User Experience', () => {
    it('should display correctly on mobile devices', async () => {
      // Simulate mobile device viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      renderInvoiceOCRPage();

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('Invoice OCR')).toBeInTheDocument();
      });

      // Check mobile layout
      const mobileLayout = screen.getByTestId('mobile-layout');
      expect(mobileLayout).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      renderInvoiceOCRPage();

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('Test Workflow')).toBeInTheDocument();
      });

      // Use Tab key navigation
      const workflowCard = screen.getByTestId('workflow-card-workflow-1');
      workflowCard.focus();

      // Use Enter key to select
      fireEvent.keyDown(workflowCard, { key: 'Enter', code: 'Enter' });

      // Check if workflow is selected
      await waitFor(() => {
        expect(workflowCard).toHaveClass('selected');
      });
    });

    it('should display appropriate loading states', async () => {
      renderInvoiceOCRPage();

      // Check initial loading state
      expect(screen.getByTestId('page-loading')).toBeInTheDocument();

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByTestId('page-loading')).not.toBeInTheDocument();
        expect(screen.getByText('Invoice OCR')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network connection errors', async () => {
      // Simulate network error
      server.use(
        http.get('/api/invoice-ocr', () => {
          return HttpResponse.error();
        })
      );

      renderInvoiceOCRPage();

      // Wait for error state to display
      await waitFor(() => {
        expect(
          screen.getByText('Network connection error')
        ).toBeInTheDocument();
      });

      // Check retry button
      const retryButton = screen.getByText('Retry');
      expect(retryButton).toBeInTheDocument();
    });

    it('should handle empty data state', async () => {
      // Simulate empty data response
      server.use(
        http.get('/api/invoice-ocr', () => {
          return HttpResponse.json({
            success: true,
            data: [],
            total: 0,
          });
        })
      );

      renderInvoiceOCRPage();

      // Wait for empty state to display
      await waitFor(() => {
        expect(screen.getByText('No workflows yet')).toBeInTheDocument();
        expect(
          screen.getByText('Create your first Invoice OCR workflow')
        ).toBeInTheDocument();
      });

      // Check create button
      const createButton = screen.getByText('Create Now');
      expect(createButton).toBeInTheDocument();
    });

    it('should handle permission errors', async () => {
      // Simulate permission error
      server.use(
        http.get('/api/invoice-ocr', () => {
          return HttpResponse.json(
            { success: false, message: 'Insufficient permissions' },
            { status: 403 }
          );
        })
      );

      renderInvoiceOCRPage();

      // Wait for permission error to display
      await waitFor(() => {
        expect(
          screen.getByText('Insufficient permissions')
        ).toBeInTheDocument();
        expect(
          screen.getByText(
            'Please contact administrator for access permissions'
          )
        ).toBeInTheDocument();
      });
    });
  });
});
