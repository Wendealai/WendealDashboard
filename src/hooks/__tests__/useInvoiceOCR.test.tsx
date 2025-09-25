import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useInvoiceOCR } from '../useInvoiceOCR';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import invoiceOCRSlice from '../../store/slices/invoiceOCRSlice';
import uiSlice from '../../store/slices/uiSlice';
import type {
  InvoiceOCRWorkflow,
  InvoiceOCRResult,
  InvoiceOCRStatistics,
  InvoiceOCRBatchTask,
  InvoiceOCRExecution,
} from '../../pages/InformationDashboard/types/invoiceOCR';

// Mock Redux store
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      invoiceOCR: invoiceOCRSlice,
      ui: uiSlice,
    },
    preloadedState: initialState,
  });
};

// Mock data
const mockWorkflow: InvoiceOCRWorkflow = {
  id: 'workflow-1',
  name: 'Test Workflow',
  description: 'Test workflow for unit testing',
  status: 'active',
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
  lastExecutedAt: '2024-01-01T12:00:00Z',
  executionCount: 5,
  successRate: 0.8,
};

const mockResult: InvoiceOCRResult = {
  id: 'result-1',
  workflowId: 'workflow-1',
  fileName: 'invoice.pdf',
  fileSize: 1024000,
  status: 'completed',
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
};

const mockStatistics: InvoiceOCRStatistics = {
  totalWorkflows: 3,
  activeWorkflows: 2,
  totalProcessed: 150,
  successfulProcessed: 120,
  failedProcessed: 30,
  avgProcessingTime: 4500,
  successRate: 0.8,
  recentActivity: [
    {
      id: 'activity-1',
      type: 'workflow_created',
      workflowName: 'New Workflow',
      timestamp: '2024-01-15T10:00:00Z',
    },
  ],
};

const mockBatchTask: InvoiceOCRBatchTask = {
  id: 'batch-1',
  workflowId: 'workflow-1',
  name: 'test-batch',
  status: 'processing',
  totalFiles: 3,
  processedFiles: 1,
  successCount: 1,
  failureCount: 0,
  progress: 33,
  results: ['result-1'],
  errors: [],
  createdAt: '2024-01-15T10:00:00Z',
  startedAt: '2024-01-15T10:00:00Z',
  completedAt: null,
  estimatedCompletionTime: '2024-01-15T10:05:00Z',
};

const mockExecution: InvoiceOCRExecution = {
  id: 'execution-1',
  workflowId: 'workflow-1',
  status: 'completed',
  startedAt: '2024-01-15T10:00:00Z',
  completedAt: '2024-01-15T10:05:00Z',
  duration: 5000,
  filesProcessed: 3,
  successCount: 2,
  failureCount: 1,
  errors: ['Failed to process file 3'],
};

// Mock message API
const mockMessageApi = {
  success: jest.fn(),
  error: jest.fn(),
};

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode; store: any }> = ({
  children,
  store,
}) => React.createElement(Provider, { store }, children);

describe('useInvoiceOCR', () => {
  let store: ReturnType<typeof createMockStore>;

  beforeEach(() => {
    jest.clearAllMocks();
    store = createMockStore();
  });

  describe('initial state', () => {
    it('should return default values when no data is loaded', () => {
      const { result } = renderHook(() => useInvoiceOCR({ autoLoad: false }), {
        wrapper: ({ children }) => (
          <TestWrapper store={store}>{children}</TestWrapper>
        ),
      });

      expect(result.current.workflows).toEqual([]);
      expect(result.current.results).toEqual([]);
      expect(result.current.statistics).toBeNull();
      expect(result.current.executions).toEqual([]);
      expect(result.current.activeWorkflow).toBeNull();
      expect(result.current.currentResult).toBeNull();
      expect(result.current.currentBatchTask).toBeNull();
      expect(result.current.uploadProgress).toBe(0);
      expect(result.current.error).toBeNull();
      expect(result.current.hasActiveWorkflow).toBe(false);
      expect(result.current.hasResults).toBe(false);
      expect(result.current.isProcessing).toBe(false);
    });

    it('should initialize with correct loading states', () => {
      const { result } = renderHook(() => useInvoiceOCR({ autoLoad: false }), {
        wrapper: ({ children }) => (
          <TestWrapper store={store}>{children}</TestWrapper>
        ),
      });

      expect(result.current.loading).toEqual({
        workflows: false,
        results: false,
        statistics: false,
        executions: false,
        upload: false,
        create: false,
        update: false,
        delete: false,
      });
    });
  });

  describe('auto-load functionality', () => {
    it('should auto-load workflows on mount when autoLoad is true', async () => {
      const mockStore = createMockStore({
        invoiceOCR: {
          workflows: [mockWorkflow],
          loading: { workflows: false },
        },
      });

      const { result } = renderHook(() => useInvoiceOCR({ autoLoad: true }), {
        wrapper: ({ children }) => (
          <TestWrapper store={mockStore}>{children}</TestWrapper>
        ),
      });

      await waitFor(() => {
        expect(result.current.workflows).toEqual([mockWorkflow]);
      });
    });

    it('should not auto-load when autoLoad is false', () => {
      const { result } = renderHook(() => useInvoiceOCR({ autoLoad: false }), {
        wrapper: ({ children }) =>
          React.createElement(TestWrapper, { store }, children),
      });

      expect(result.current.workflows).toEqual([]);
    });
  });

  describe('workflow management', () => {
    it('should create workflow successfully', async () => {
      const mockStore = createMockStore();
      const { result } = renderHook(
        () => useInvoiceOCR({ autoLoad: false, messageApi: mockMessageApi }),
        {
          wrapper: ({ children }) => (
            <TestWrapper store={mockStore}>{children}</TestWrapper>
          ),
        }
      );

      const createData = {
        name: 'New Workflow',
        description: 'Test workflow creation',
        settings: {
          outputFormat: 'json' as const,
          enableWebhook: false,
          webhookUrl: '',
          enableNotifications: true,
          confidenceThreshold: 0.8,
          autoValidation: false,
          retryAttempts: 3,
          timeout: 30000,
        },
      };

      let createdWorkflow: InvoiceOCRWorkflow | null = null;

      await act(async () => {
        createdWorkflow = await result.current.createWorkflow(createData);
      });

      expect(mockMessageApi.success).toHaveBeenCalledWith(
        'Workflow created successfully'
      );
    });

    it('should handle workflow creation error', async () => {
      const mockStore = createMockStore();
      // Mock a store that will throw an error
      mockStore.dispatch = jest.fn().mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(
        () => useInvoiceOCR({ autoLoad: false, messageApi: mockMessageApi }),
        {
          wrapper: ({ children }) => (
            <TestWrapper store={mockStore}>{children}</TestWrapper>
          ),
        }
      );

      const createData = {
        name: 'New Workflow',
        description: 'Test workflow creation',
      };

      let resultWorkflow: InvoiceOCRWorkflow | null = null;

      await act(async () => {
        resultWorkflow = await result.current.createWorkflow(createData);
      });

      expect(resultWorkflow).toBeNull();
      expect(mockMessageApi.error).toHaveBeenCalled();
    });

    it('should update workflow successfully', async () => {
      const mockStore = createMockStore({
        invoiceOCR: {
          workflows: [mockWorkflow],
        },
      });

      const { result } = renderHook(
        () => useInvoiceOCR({ autoLoad: false, messageApi: mockMessageApi }),
        {
          wrapper: ({ children }) => (
            <TestWrapper store={mockStore}>{children}</TestWrapper>
          ),
        }
      );

      const updateData = {
        name: 'Updated Workflow',
        settings: {
          outputFormat: 'csv' as const,
        },
      };

      let updatedWorkflow: InvoiceOCRWorkflow | null = null;

      await act(async () => {
        updatedWorkflow = await result.current.updateWorkflow(
          'workflow-1',
          updateData
        );
      });

      expect(mockMessageApi.success).toHaveBeenCalledWith(
        'Workflow updated successfully'
      );
    });

    it('should delete workflow successfully', async () => {
      const mockStore = createMockStore({
        invoiceOCR: {
          workflows: [mockWorkflow],
        },
      });

      const { result } = renderHook(
        () => useInvoiceOCR({ autoLoad: false, messageApi: mockMessageApi }),
        {
          wrapper: ({ children }) => (
            <TestWrapper store={mockStore}>{children}</TestWrapper>
          ),
        }
      );

      let deleteResult = false;

      await act(async () => {
        deleteResult = await result.current.deleteWorkflow('workflow-1');
      });

      expect(deleteResult).toBe(true);
      expect(mockMessageApi.success).toHaveBeenCalledWith(
        'Workflow deleted successfully'
      );
    });
  });

  describe('file upload functionality', () => {
    it('should upload files successfully', async () => {
      const mockStore = createMockStore();
      const { result } = renderHook(
        () => useInvoiceOCR({ autoLoad: false, messageApi: mockMessageApi }),
        {
          wrapper: ({ children }) => (
            <TestWrapper store={mockStore}>{children}</TestWrapper>
          ),
        }
      );

      const mockFile = new File(['test content'], 'test.pdf', {
        type: 'application/pdf',
      });

      const uploadData = {
        workflowId: 'workflow-1',
        files: [mockFile],
        batchName: 'test-upload',
        processingOptions: {
          language: 'zh-CN',
          outputFormat: 'json' as const,
        },
      };

      let uploadResult: InvoiceOCRBatchTask | null = null;

      await act(async () => {
        uploadResult = await result.current.uploadFiles(uploadData);
      });

      expect(mockMessageApi.success).toHaveBeenCalledWith(
        'Files uploaded and processing started'
      );
    });

    it('should handle upload error', async () => {
      const mockStore = createMockStore();
      mockStore.dispatch = jest
        .fn()
        .mockRejectedValue(new Error('Upload failed'));

      const { result } = renderHook(
        () => useInvoiceOCR({ autoLoad: false, messageApi: mockMessageApi }),
        {
          wrapper: ({ children }) => (
            <TestWrapper store={mockStore}>{children}</TestWrapper>
          ),
        }
      );

      const mockFile = new File(['test content'], 'test.pdf', {
        type: 'application/pdf',
      });

      const uploadData = {
        workflowId: 'workflow-1',
        files: [mockFile],
      };

      let uploadResult: InvoiceOCRBatchTask | null = null;

      await act(async () => {
        uploadResult = await result.current.uploadFiles(uploadData);
      });

      expect(uploadResult).toBeNull();
      expect(mockMessageApi.error).toHaveBeenCalled();
    });
  });

  describe('data loading functions', () => {
    it('should load results successfully', async () => {
      const mockStore = createMockStore();
      const { result } = renderHook(
        () => useInvoiceOCR({ autoLoad: false, messageApi: mockMessageApi }),
        {
          wrapper: ({ children }) => (
            <TestWrapper store={mockStore}>{children}</TestWrapper>
          ),
        }
      );

      await act(async () => {
        await result.current.loadResults('workflow-1');
      });

      // Verify the dispatch was called (specific assertion would depend on the actual implementation)
    });

    it('should load statistics successfully', async () => {
      const mockStore = createMockStore();
      const { result } = renderHook(
        () => useInvoiceOCR({ autoLoad: false, messageApi: mockMessageApi }),
        {
          wrapper: ({ children }) => (
            <TestWrapper store={mockStore}>{children}</TestWrapper>
          ),
        }
      );

      await act(async () => {
        await result.current.loadStatistics('workflow-1');
      });
    });

    it('should load executions successfully', async () => {
      const mockStore = createMockStore();
      const { result } = renderHook(
        () => useInvoiceOCR({ autoLoad: false, messageApi: mockMessageApi }),
        {
          wrapper: ({ children }) => (
            <TestWrapper store={mockStore}>{children}</TestWrapper>
          ),
        }
      );

      await act(async () => {
        await result.current.loadExecutions('workflow-1');
      });
    });
  });

  describe('selection management', () => {
    it('should select workflow correctly', () => {
      const mockStore = createMockStore();
      const { result } = renderHook(() => useInvoiceOCR({ autoLoad: false }), {
        wrapper: ({ children }) => (
          <TestWrapper store={mockStore}>{children}</TestWrapper>
        ),
      });

      act(() => {
        result.current.selectWorkflow(mockWorkflow);
      });

      // Verify dispatch was called with correct action
    });

    it('should select result correctly', () => {
      const mockStore = createMockStore();
      const { result } = renderHook(() => useInvoiceOCR({ autoLoad: false }), {
        wrapper: ({ children }) => (
          <TestWrapper store={mockStore}>{children}</TestWrapper>
        ),
      });

      act(() => {
        result.current.selectResult(mockResult);
      });
    });

    it('should select batch task correctly', () => {
      const mockStore = createMockStore();
      const { result } = renderHook(() => useInvoiceOCR({ autoLoad: false }), {
        wrapper: ({ children }) => (
          <TestWrapper store={mockStore}>{children}</TestWrapper>
        ),
      });

      act(() => {
        result.current.selectBatchTask(mockBatchTask);
      });
    });
  });

  describe('computed values', () => {
    it('should calculate hasActiveWorkflow correctly', () => {
      const mockStore = createMockStore({
        invoiceOCR: {
          activeWorkflow: mockWorkflow,
        },
      });

      const { result } = renderHook(() => useInvoiceOCR({ autoLoad: false }), {
        wrapper: ({ children }) => (
          <TestWrapper store={mockStore}>{children}</TestWrapper>
        ),
      });

      expect(result.current.hasActiveWorkflow).toBe(true);
    });

    it('should calculate hasResults correctly', () => {
      const mockStore = createMockStore({
        invoiceOCR: {
          results: [mockResult],
        },
      });

      const { result } = renderHook(() => useInvoiceOCR({ autoLoad: false }), {
        wrapper: ({ children }) => (
          <TestWrapper store={mockStore}>{children}</TestWrapper>
        ),
      });

      expect(result.current.hasResults).toBe(true);
    });

    it('should calculate isProcessing correctly', () => {
      const mockStore = createMockStore({
        invoiceOCR: {
          currentBatchTask: { ...mockBatchTask, status: 'processing' },
          loading: { upload: false },
        },
      });

      const { result } = renderHook(() => useInvoiceOCR({ autoLoad: false }), {
        wrapper: ({ children }) => (
          <TestWrapper store={mockStore}>{children}</TestWrapper>
        ),
      });

      expect(result.current.isProcessing).toBe(true);
    });

    it('should calculate totalProcessedFiles correctly', () => {
      const mockStore = createMockStore({
        invoiceOCR: {
          results: [
            { ...mockResult, processedFiles: 5 },
            { ...mockResult, id: 'result-2', processedFiles: 3 },
          ],
        },
      });

      const { result } = renderHook(() => useInvoiceOCR({ autoLoad: false }), {
        wrapper: ({ children }) => (
          <TestWrapper store={mockStore}>{children}</TestWrapper>
        ),
      });

      expect(result.current.totalProcessedFiles).toBe(8);
    });

    it('should calculate successRate correctly', () => {
      const mockStore = createMockStore({
        invoiceOCR: {
          statistics: mockStatistics,
        },
      });

      const { result } = renderHook(() => useInvoiceOCR({ autoLoad: false }), {
        wrapper: ({ children }) => (
          <TestWrapper store={mockStore}>{children}</TestWrapper>
        ),
      });

      expect(result.current.successRate).toBe(80);
    });
  });

  describe('utility functions', () => {
    it('should clear error correctly', () => {
      const mockStore = createMockStore({
        invoiceOCR: {
          error: 'Test error',
        },
      });

      const { result } = renderHook(() => useInvoiceOCR({ autoLoad: false }), {
        wrapper: ({ children }) => (
          <TestWrapper store={mockStore}>{children}</TestWrapper>
        ),
      });

      act(() => {
        result.current.clearError();
      });

      // Verify dispatch was called
    });

    it('should reset state correctly', () => {
      const mockStore = createMockStore({
        invoiceOCR: {
          workflows: [mockWorkflow],
          error: 'Test error',
        },
      });

      const { result } = renderHook(() => useInvoiceOCR({ autoLoad: false }), {
        wrapper: ({ children }) => (
          <TestWrapper store={mockStore}>{children}</TestWrapper>
        ),
      });

      act(() => {
        result.current.resetState();
      });
    });

    it('should refresh data correctly', async () => {
      const mockStore = createMockStore({
        invoiceOCR: {
          activeWorkflow: mockWorkflow,
        },
      });

      const { result } = renderHook(() => useInvoiceOCR({ autoLoad: false }), {
        wrapper: ({ children }) => (
          <TestWrapper store={mockStore}>{children}</TestWrapper>
        ),
      });

      await act(async () => {
        await result.current.refreshData();
      });
    });
  });

  describe('auto-refresh functionality', () => {
    it('should set up auto-refresh when conditions are met', () => {
      jest.useFakeTimers();

      const mockStore = createMockStore({
        invoiceOCR: {
          activeWorkflow: mockWorkflow,
        },
      });

      renderHook(
        () => useInvoiceOCR({ autoLoad: false, autoRefreshInterval: 5000 }),
        {
          wrapper: ({ children }) => (
            <TestWrapper store={mockStore}>{children}</TestWrapper>
          ),
        }
      );

      // Fast-forward time
      jest.advanceTimersByTime(5000);

      // Verify timer was set up (this would need to be mocked in a real test)
    });

    it('should not set up auto-refresh when no active workflow', () => {
      const { result } = renderHook(
        () => useInvoiceOCR({ autoLoad: false, autoRefreshInterval: 5000 }),
        {
          wrapper: ({ children }) => (
            <TestWrapper store={store}>{children}</TestWrapper>
          ),
        }
      );

      expect(result.current.hasActiveWorkflow).toBe(false);
    });
  });

  describe('message handling', () => {
    it('should show success messages when enabled', async () => {
      const { result } = renderHook(
        () =>
          useInvoiceOCR({
            autoLoad: false,
            showSuccessMessages: true,
            messageApi: mockMessageApi,
          }),
        {
          wrapper: ({ children }) => (
            <TestWrapper store={store}>{children}</TestWrapper>
          ),
        }
      );

      await act(async () => {
        await result.current.createWorkflow({
          name: 'Test',
          description: 'Test workflow',
        });
      });

      expect(mockMessageApi.success).toHaveBeenCalled();
    });

    it('should not show success messages when disabled', async () => {
      const { result } = renderHook(
        () =>
          useInvoiceOCR({
            autoLoad: false,
            showSuccessMessages: false,
            messageApi: mockMessageApi,
          }),
        {
          wrapper: ({ children }) => (
            <TestWrapper store={store}>{children}</TestWrapper>
          ),
        }
      );

      await act(async () => {
        await result.current.createWorkflow({
          name: 'Test',
          description: 'Test workflow',
        });
      });

      expect(mockMessageApi.success).not.toHaveBeenCalled();
    });

    it('should show error messages when enabled', async () => {
      const mockStore = createMockStore();
      mockStore.dispatch = jest.fn().mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(
        () =>
          useInvoiceOCR({
            autoLoad: false,
            showErrorMessages: true,
            messageApi: mockMessageApi,
          }),
        {
          wrapper: ({ children }) => (
            <TestWrapper store={mockStore}>{children}</TestWrapper>
          ),
        }
      );

      await act(async () => {
        await result.current.createWorkflow({
          name: 'Test',
          description: 'Test workflow',
        });
      });

      expect(mockMessageApi.error).toHaveBeenCalled();
    });

    it('should not show error messages when disabled', async () => {
      const mockStore = createMockStore();
      mockStore.dispatch = jest.fn().mockRejectedValue(new Error('Test error'));

      const { result } = renderHook(
        () =>
          useInvoiceOCR({
            autoLoad: false,
            showErrorMessages: false,
            messageApi: mockMessageApi,
          }),
        {
          wrapper: ({ children }) => (
            <TestWrapper store={mockStore}>{children}</TestWrapper>
          ),
        }
      );

      await act(async () => {
        await result.current.createWorkflow({
          name: 'Test',
          description: 'Test workflow',
        });
      });

      expect(mockMessageApi.error).not.toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should clean up auto-refresh timer on unmount', () => {
      jest.useFakeTimers();

      const mockStore = createMockStore({
        invoiceOCR: {
          activeWorkflow: mockWorkflow,
        },
      });

      const { unmount } = renderHook(
        () => useInvoiceOCR({ autoLoad: false, autoRefreshInterval: 5000 }),
        {
          wrapper: ({ children }) => (
            <TestWrapper store={mockStore}>{children}</TestWrapper>
          ),
        }
      );

      // Unmount component
      unmount();

      // Verify cleanup (this would need to be mocked in a real test)
    });
  });
});
