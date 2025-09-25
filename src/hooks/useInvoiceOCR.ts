/**
 * Custom Hook for Invoice OCR Functionality
 *
 * A comprehensive React hook that provides all the necessary functionality
 * for Invoice OCR operations including workflow management, file processing,
 * and result handling.
 *
 * This hook integrates with Redux store for state management and provides
 * a clean API for components to interact with Invoice OCR features.
 *
 * Features:
 * - Workflow CRUD operations
 * - File upload and processing
 * - Real-time progress tracking
 * - Error handling and notifications
 * - Auto-refresh capabilities
 * - Batch processing support
 *
 * @example
 * ```tsx
 * const {
 *   workflows,
 *   uploadFiles,
 *   loading,
 *   error
 * } = useInvoiceOCR({
 *   autoLoad: true,
 *   showSuccessMessages: true,
 *   autoRefreshInterval: 5000
 * });
 *
 * // Upload files for processing
 * const handleUpload = async (files: File[]) => {
 *   const result = await uploadFiles({
 *     workflowId: 'workflow-1',
 *     files,
 *     processingOptions: { language: 'auto' }
 *   });
 * };
 * ```
 *
 * @param options - Configuration options for the hook
 * @returns Object containing state, loading states, and action functions
 *
 * @see {@link UseInvoiceOCROptions} - Configuration options type
 * @see {@link UseInvoiceOCRReturn} - Return type definition
 * @see {@link invoiceOCRService} - Underlying service layer
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from './redux';
import {
  fetchInvoiceOCRWorkflows,
  createInvoiceOCRWorkflow,
  updateInvoiceOCRWorkflow,
  deleteInvoiceOCRWorkflow,
  uploadAndProcessFiles,
  fetchInvoiceOCRResults,
  fetchInvoiceOCRStatistics,
  fetchInvoiceOCRExecutions,
  setSelectedWorkflow,
  setCurrentResult,
  setCurrentBatchTask,
  clearError as clearInvoiceOCRError,
  resetInvoiceOCRState,
  selectInvoiceOCRWorkflows,
  selectInvoiceOCRResults,
  selectInvoiceOCRStatistics,
  selectInvoiceOCRExecutions,
  selectInvoiceOCRLoading,
  selectInvoiceOCRError,
  selectActiveWorkflow,
  selectCurrentResult,
  selectCurrentBatchTask,
  selectUploadProgress,
} from '../store';
import type {
  InvoiceOCRWorkflow,
  InvoiceOCRResult,
  InvoiceOCRBatchTask,
  InvoiceOCRStatistics,
  InvoiceOCRExecution,
  CreateInvoiceOCRWorkflowRequest,
  UpdateInvoiceOCRWorkflowRequest,
} from '../pages/InformationDashboard/types/invoiceOCR';

// Define missing types
interface UploadAndProcessFilesRequest {
  workflowId: string;
  files: File[];
  processingOptions?: any;
}

export interface UseInvoiceOCROptions {
  /** Auto-load workflows on mount */
  autoLoad?: boolean;
  /** Show success messages */
  showSuccessMessages?: boolean;
  /** Show error messages */
  showErrorMessages?: boolean;
  /** Auto-refresh interval (ms) */
  autoRefreshInterval?: number;
  /** Message API instance for notifications */
  messageApi?: {
    success: (content: string) => void;
    error: (content: string) => void;
  };
}

export interface UseInvoiceOCRReturn {
  // State
  workflows: InvoiceOCRWorkflow[];
  results: InvoiceOCRResult[];
  statistics: InvoiceOCRStatistics | null;
  executions: InvoiceOCRExecution[];
  activeWorkflow: InvoiceOCRWorkflow | null;
  currentResult: InvoiceOCRResult | null;
  currentBatchTask: InvoiceOCRBatchTask | null;
  uploadProgress: Record<string, number>;

  // Loading states
  loading: {
    workflow: boolean;
    results: boolean;
    executions: boolean;
    statistics: boolean;
    upload: boolean;
  };

  // Error state
  error: any;

  // Actions
  loadWorkflows: () => Promise<void>;
  createWorkflow: (
    data: CreateInvoiceOCRWorkflowRequest
  ) => Promise<InvoiceOCRWorkflow | null>;
  updateWorkflow: (
    id: string,
    data: UpdateInvoiceOCRWorkflowRequest
  ) => Promise<InvoiceOCRWorkflow | null>;
  deleteWorkflow: (id: string) => Promise<boolean>;
  uploadFiles: (
    data: UploadAndProcessFilesRequest
  ) => Promise<InvoiceOCRBatchTask | null>;
  loadResults: () => Promise<void>;
  loadStatistics: (workflowId?: string) => Promise<void>;
  loadExecutions: () => Promise<void>;

  // Workflow management
  selectWorkflow: (workflow: InvoiceOCRWorkflow | null) => void;
  selectResult: (result: InvoiceOCRResult | null) => void;
  selectBatchTask: (task: InvoiceOCRBatchTask | null) => void;

  // Utility functions
  clearError: () => void;
  resetState: () => void;
  refreshData: () => Promise<void>;

  // Computed values
  hasActiveWorkflow: boolean;
  hasResults: boolean;
  isProcessing: boolean;
  totalProcessedFiles: number;
  successRate: number;
}

/**
 * Custom hook for managing Invoice OCR functionality
 * Provides centralized state management with loading states and error handling
 */
export const useInvoiceOCR = ({
  autoLoad = true,
  showSuccessMessages = true,
  showErrorMessages = true,
  autoRefreshInterval = 30000, // 30 seconds
  messageApi,
}: UseInvoiceOCROptions = {}): UseInvoiceOCRReturn => {
  const dispatch = useAppDispatch();

  // Redux state selectors
  const workflows = useAppSelector(selectInvoiceOCRWorkflows);
  const results = useAppSelector(selectInvoiceOCRResults);
  const statistics = useAppSelector(selectInvoiceOCRStatistics);
  const executions = useAppSelector(selectInvoiceOCRExecutions);
  const loading = useAppSelector(selectInvoiceOCRLoading);
  const error = useAppSelector(selectInvoiceOCRError);
  const activeWorkflow = useAppSelector(selectActiveWorkflow);
  const currentResult = useAppSelector(selectCurrentResult);
  const currentBatchTask = useAppSelector(selectCurrentBatchTask);
  const uploadProgress = useAppSelector(selectUploadProgress);

  // Local state for auto-refresh
  const [autoRefreshTimer, setAutoRefreshTimer] =
    useState<NodeJS.Timeout | null>(null);

  /**
   * Show success message
   */
  const showSuccess = useCallback(
    (msg: string) => {
      if (showSuccessMessages && messageApi) {
        messageApi.success(msg);
      }
    },
    [showSuccessMessages, messageApi]
  );

  /**
   * Show error message
   */
  const showError = useCallback(
    (msg: string) => {
      if (showErrorMessages && messageApi) {
        messageApi.error(msg);
      }
    },
    [showErrorMessages, messageApi]
  );

  /**
   * Load workflows from API
   */
  const loadWorkflows = useCallback(async () => {
    try {
      await dispatch(fetchInvoiceOCRWorkflows()).unwrap();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to load workflows';
      showError(errorMsg);
    }
  }, [dispatch, showError]);

  /**
   * Create new workflow
   */
  const createWorkflow = useCallback(
    async (
      data: CreateInvoiceOCRWorkflowRequest
    ): Promise<InvoiceOCRWorkflow | null> => {
      try {
        const result = await dispatch(createInvoiceOCRWorkflow(data)).unwrap();
        showSuccess('Workflow created successfully');
        return result;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to create workflow';
        showError(errorMsg);
        return null;
      }
    },
    [dispatch, showSuccess, showError]
  );

  /**
   * Update existing workflow
   */
  const updateWorkflow = useCallback(
    async (
      id: string,
      data: UpdateInvoiceOCRWorkflowRequest
    ): Promise<InvoiceOCRWorkflow | null> => {
      try {
        const result = await dispatch(
          updateInvoiceOCRWorkflow({ id, request: data })
        ).unwrap();
        showSuccess('Workflow updated successfully');
        // The result should be the updated workflow, but if it's not, return null
        return result as unknown as InvoiceOCRWorkflow;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to update workflow';
        showError(errorMsg);
        return null;
      }
    },
    [dispatch, showSuccess, showError]
  );

  /**
   * Delete workflow
   */
  const deleteWorkflow = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        await dispatch(deleteInvoiceOCRWorkflow(id)).unwrap();
        showSuccess('Workflow deleted successfully');
        return true;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to delete workflow';
        showError(errorMsg);
        return false;
      }
    },
    [dispatch, showSuccess, showError]
  );

  /**
   * Upload and process files
   */
  const uploadFiles = useCallback(
    async (
      data: UploadAndProcessFilesRequest
    ): Promise<InvoiceOCRBatchTask | null> => {
      try {
        const result = await dispatch(uploadAndProcessFiles(data)).unwrap();
        showSuccess('Files uploaded and processing started');
        return result;
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to upload files';
        showError(errorMsg);
        return null;
      }
    },
    [dispatch, showSuccess, showError]
  );

  /**
   * Load results
   */
  const loadResults = useCallback(async () => {
    try {
      await dispatch(fetchInvoiceOCRResults({})).unwrap();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to load results';
      showError(errorMsg);
    }
  }, [dispatch, showError]);

  /**
   * Load statistics
   */
  const loadStatistics = useCallback(
    async (workflowId?: string) => {
      try {
        await dispatch(fetchInvoiceOCRStatistics(workflowId || '')).unwrap();
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to load statistics';
        showError(errorMsg);
      }
    },
    [dispatch, showError]
  );

  /**
   * Load executions
   */
  const loadExecutions = useCallback(async () => {
    try {
      await dispatch(fetchInvoiceOCRExecutions({})).unwrap();
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Failed to load executions';
      showError(errorMsg);
    }
  }, [dispatch, showError]);

  /**
   * Select active workflow
   */
  const selectWorkflow = useCallback(
    (workflow: InvoiceOCRWorkflow | null) => {
      dispatch(setSelectedWorkflow(workflow?.id || null));
    },
    [dispatch]
  );

  /**
   * Select current result
   */
  const selectResult = useCallback(
    (result: InvoiceOCRResult | null) => {
      dispatch(setCurrentResult(result));
    },
    [dispatch]
  );

  /**
   * Select current batch task
   */
  const selectBatchTask = useCallback(
    (task: InvoiceOCRBatchTask | null) => {
      dispatch(setCurrentBatchTask(task));
    },
    [dispatch]
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    dispatch(clearInvoiceOCRError());
  }, [dispatch]);

  /**
   * Reset entire state
   */
  const resetState = useCallback(() => {
    dispatch(resetInvoiceOCRState());
  }, [dispatch]);

  /**
   * Refresh all data
   */
  const refreshData = useCallback(async () => {
    await Promise.all([
      loadWorkflows(),
      loadResults(),
      loadStatistics(activeWorkflow?.id),
      loadExecutions(),
    ]);
  }, [
    loadWorkflows,
    loadResults,
    loadStatistics,
    loadExecutions,
    activeWorkflow?.id,
  ]);

  // Computed values
  const hasActiveWorkflow = useMemo(() => {
    return activeWorkflow !== null;
  }, [activeWorkflow]);

  const hasResults = useMemo(() => {
    return results.length > 0;
  }, [results]);

  const isProcessing = useMemo(() => {
    return loading.upload || currentBatchTask?.status === 'processing';
  }, [loading.upload, currentBatchTask?.status]);

  const totalProcessedFiles = useMemo(() => {
    return results.length;
  }, [results]);

  const successRate = useMemo(() => {
    if (!statistics) return 0;
    const total = statistics.totalProcessed;
    const successful = statistics.successCount;
    return total > 0 ? (successful / total) * 100 : 0;
  }, [statistics]);

  // Auto-load data on mount
  useEffect(() => {
    if (autoLoad) {
      loadWorkflows();
    }
  }, [autoLoad, loadWorkflows]);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefreshInterval > 0 && hasActiveWorkflow) {
      const timer = setInterval(() => {
        refreshData();
      }, autoRefreshInterval);

      setAutoRefreshTimer(timer);

      return () => {
        clearInterval(timer);
        setAutoRefreshTimer(null);
      };
    }
    return undefined;
  }, [autoRefreshInterval, hasActiveWorkflow, refreshData]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
      }
    };
  }, [autoRefreshTimer]);

  return {
    // State
    workflows,
    results,
    statistics,
    executions,
    activeWorkflow,
    currentResult,
    currentBatchTask,
    uploadProgress,

    // Loading states
    loading,

    // Error state
    error,

    // Actions
    loadWorkflows,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    uploadFiles,
    loadResults,
    loadStatistics,
    loadExecutions,

    // Workflow management
    selectWorkflow,
    selectResult,
    selectBatchTask,

    // Utility functions
    clearError,
    resetState,
    refreshData,

    // Computed values
    hasActiveWorkflow,
    hasResults,
    isProcessing,
    totalProcessedFiles,
    successRate,
  };
};

export default useInvoiceOCR;
