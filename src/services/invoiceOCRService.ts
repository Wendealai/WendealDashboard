import { api } from './api';
import type {
  InvoiceOCRWorkflow,
  InvoiceOCRSettings,
  InvoiceOCRResult,
  InvoiceOCRExecution,
  InvoiceOCRBatchTask,
  CreateInvoiceOCRWorkflowRequest,
  UpdateInvoiceOCRWorkflowRequest,
  InvoiceOCRUploadRequest,
  InvoiceOCRApiResponse,
  InvoiceOCRPaginatedResponse,
  InvoiceOCRQueryParams,
  // InvoiceOCRStatus,
  InvoiceOCROutputFormat,
} from '../pages/InformationDashboard/types/invoiceOCR';
import type {
  EnhancedWebhookResponse,
  InvoiceProcessingSummary,
  FinancialSummary,
  ProcessingDetails,
  QualityMetrics,
} from '../types/workflow';
import { DEFAULT_INVOICE_OCR_SETTINGS } from '../pages/InformationDashboard/types/invoiceOCR';

type SupabaseRuntimeConfig = typeof globalThis & {
  __WENDEAL_SUPABASE_CONFIG__?: {
    url?: string;
    anonKey?: string;
  };
};

export interface InvoiceOcrResultSyncCheckResult {
  reachable: boolean;
  checkedAt: string;
  latencyMs: number;
  resultCount?: number;
  totalCount?: number;
  httpStatus?: number;
  errorMessage?: string;
}

export interface InvoiceOcrSupabaseCheckResult {
  reachable: boolean;
  configured: boolean;
  checkedAt: string;
  latencyMs: number;
  requestUrl?: string;
  httpStatus?: number;
  statusText?: string;
  errorMessage?: string;
}

export interface InvoiceOcrClientHealthSnapshot {
  capturedAt: string;
  webhook?: {
    reachable: boolean;
    checkedAt: string;
    latencyMs: number;
    status?: number;
    statusText?: string;
    errorMessage?: string;
    requestUrl?: string;
  } | null;
  resultSync?: InvoiceOcrResultSyncCheckResult | null;
  supabase?: InvoiceOcrSupabaseCheckResult | null;
}

export interface InvoiceOcrSupplierTemplateRule {
  supplierName: string;
  industry?: string;
  defaultTags?: string[];
  fieldMappings: Record<string, string>;
  updatedAt: string;
}

/**
 * Invoice OCR Service Class
 *
 * Comprehensive service layer for Invoice OCR functionality, providing
 * a complete API for managing OCR workflows, file processing, and result handling.
 *
 * This service acts as the data access layer between the frontend application
 * and backend OCR processing systems, handling all CRUD operations for
 * workflows, file uploads, processing requests, and result retrieval.
 *
 * Key Responsibilities:
 * - Workflow lifecycle management (create, read, update, delete)
 * - File upload coordination with backend services
 * - OCR processing status tracking and updates
 * - Result data retrieval and formatting
 * - Error handling and retry mechanisms
 * - Integration with n8n webhook system
 *
 * Architecture:
 * - Uses centralized API client for HTTP requests
 * - Implements consistent error handling patterns
 * - Provides typed interfaces for all operations
 * - Supports both individual and batch operations
 *
 * @class
 * @example
 * ```typescript
 * const service = new InvoiceOCRService();
 *
 * // Create a new workflow
 * const workflow = await service.createWorkflow({
 *   name: 'Monthly Invoices',
 *   description: 'Process monthly vendor invoices'
 * });
 *
 * // Upload files for processing
 * const result = await service.uploadFiles(workflow.id, files);
 * ```
 *
 * @see {@link InvoiceOCRWorkflow} - Workflow data structure
 * @see {@link InvoiceOCRResult} - Processing result structure
 * @see {@link api} - Base API client
 */
export class InvoiceOCRService {
  private readonly baseUrl = '/invoice-ocr';
  private readonly defaultHealthCheckTimeoutMs = 8000;
  private readonly supplierTemplateStorageKey = 'invoiceOCR_supplier_templates';
  private readonly manualCorrectionStoragePrefix =
    'invoiceOCR_manual_corrections';

  // ==================== Workflow Management ====================

  /**
   * Create Invoice OCR workflow
   * @param request Creation request parameters
   * @returns Created workflow information
   */
  async createWorkflow(
    request: CreateInvoiceOCRWorkflowRequest
  ): Promise<InvoiceOCRWorkflow> {
    try {
      const response = await api.post<
        InvoiceOCRApiResponse<InvoiceOCRWorkflow>
      >(this.baseUrl, {
        ...request,
        settings: {
          ...DEFAULT_INVOICE_OCR_SETTINGS,
          ...request.settings,
        },
      });
      return response.data.data!;
    } catch (error) {
      console.error('Failed to create Invoice OCR workflow:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to create Invoice OCR workflow'
      );
    }
  }

  /**
   * Update Invoice OCR workflow
   * @param workflowId Workflow ID
   * @param request Update request parameters
   * @returns Updated workflow information
   */
  async updateWorkflow(
    workflowId: string,
    request: UpdateInvoiceOCRWorkflowRequest
  ): Promise<InvoiceOCRWorkflow> {
    try {
      const response = await api.put<InvoiceOCRApiResponse<InvoiceOCRWorkflow>>(
        `${this.baseUrl}/${workflowId}`,
        request
      );
      return response.data.data!;
    } catch (error) {
      console.error('Failed to update Invoice OCR workflow:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to update Invoice OCR workflow'
      );
    }
  }

  /**
   * Get Invoice OCR workflow details
   * @param workflowId Workflow ID
   * @returns Workflow details
   */
  async getWorkflow(workflowId: string): Promise<InvoiceOCRWorkflow> {
    try {
      const response = await api.get<InvoiceOCRApiResponse<InvoiceOCRWorkflow>>(
        `${this.baseUrl}/${workflowId}`
      );
      return response.data.data!;
    } catch (error) {
      console.error('Failed to get Invoice OCR workflow:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to get Invoice OCR workflow'
      );
    }
  }

  /**
   * Get Invoice OCR workflow list
   * @param params Query parameters
   * @returns Workflow list
   */
  async getWorkflows(
    params: InvoiceOCRQueryParams = {}
  ): Promise<InvoiceOCRPaginatedResponse<InvoiceOCRWorkflow>> {
    try {
      const response = await api.get<
        InvoiceOCRApiResponse<InvoiceOCRPaginatedResponse<InvoiceOCRWorkflow>>
      >(this.baseUrl, {
        params,
      });
      return response.data.data!;
    } catch (error) {
      console.error('Failed to get Invoice OCR workflow list:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to get Invoice OCR workflow list'
      );
    }
  }

  /**
   * Delete Invoice OCR workflow
   * @param workflowId Workflow ID
   * @returns Deletion result
   */
  async deleteWorkflow(workflowId: string): Promise<void> {
    try {
      await api.delete<InvoiceOCRApiResponse<void>>(
        `${this.baseUrl}/${workflowId}`
      );
    } catch (error) {
      console.error('Failed to delete Invoice OCR workflow:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to delete Invoice OCR workflow'
      );
    }
  }

  /**
   * Enable/disable workflow
   * @param workflowId Workflow ID
   * @param enabled Whether to enable
   * @returns Updated workflow information
   */
  async toggleWorkflow(
    workflowId: string,
    enabled: boolean
  ): Promise<InvoiceOCRWorkflow> {
    try {
      const response = await api.patch<
        InvoiceOCRApiResponse<InvoiceOCRWorkflow>
      >(`${this.baseUrl}/${workflowId}/toggle`, { enabled });
      return response.data.data!;
    } catch (error) {
      console.error('Failed to toggle workflow status:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to toggle workflow status'
      );
    }
  }

  // ==================== File Processing ====================

  /**
   * Process files for OCR recognition
   * @param fileIds File ID list
   * @param webhookUrl Webhook URL
   * @returns Processing result
   */
  async processFiles(
    fileIds: string[],
    webhookUrl: string
  ): Promise<{ results: InvoiceOCRResult[]; stats: any }> {
    try {
      const response = await api.post<
        InvoiceOCRApiResponse<{ results: InvoiceOCRResult[]; stats: any }>
      >(`${this.baseUrl}/process`, {
        fileIds,
        webhookUrl,
      });
      return response.data.data!;
    } catch (error) {
      console.error('OCR recognition processing failed:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'OCR recognition processing failed'
      );
    }
  }

  /**
   * Upload files for Invoice OCR processing
   * @param request Upload request parameters
   * @returns Batch task information
   */
  async uploadFiles(
    request: InvoiceOCRUploadRequest
  ): Promise<InvoiceOCRBatchTask> {
    try {
      const formData = new FormData();

      // Add files
      request.files.forEach(file => {
        formData.append('files', file);
      });

      // Add other parameters
      formData.append('workflowId', request.workflowId);
      if (request.batchName) {
        formData.append('batchName', request.batchName);
      }
      if (request.processingOptions) {
        formData.append(
          'processingOptions',
          JSON.stringify(request.processingOptions)
        );
      }

      const response = await api.post<
        InvoiceOCRApiResponse<InvoiceOCRBatchTask>
      >(`${this.baseUrl}/${request.workflowId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // File upload timeout set to 60 seconds
      });
      return response.data.data!;
    } catch (error) {
      console.error('Failed to upload Invoice files:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to upload Invoice files'
      );
    }
  }

  /**
   * Single file upload processing
   * @param workflowId Workflow ID
   * @param file File
   * @param options Processing options
   * @returns Processing result
   */
  async uploadSingleFile(
    workflowId: string,
    file: File,
    options?: Partial<InvoiceOCRSettings>
  ): Promise<InvoiceOCRResult> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('workflowId', workflowId);

      if (options) {
        formData.append('processingOptions', JSON.stringify(options));
      }

      const response = await api.post<InvoiceOCRApiResponse<InvoiceOCRResult>>(
        `${this.baseUrl}/${workflowId}/upload-single`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000,
        }
      );
      return response.data.data!;
    } catch (error) {
      console.error('Single file upload processing failed:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Single file upload processing failed'
      );
    }
  }

  // ==================== Result Management ====================

  /**
   * Get Invoice OCR processing result
   * @param workflowId Workflow ID
   * @param resultId Result ID
   * @returns Processing result
   */
  async getResult(
    workflowId: string,
    resultId: string
  ): Promise<InvoiceOCRResult> {
    try {
      const response = await api.get<InvoiceOCRApiResponse<InvoiceOCRResult>>(
        `${this.baseUrl}/${workflowId}/results/${resultId}`
      );
      return response.data.data!;
    } catch (error) {
      console.error('Failed to get Invoice OCR result:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to get Invoice OCR result'
      );
    }
  }

  /**
   * Get Invoice OCR processing result list
   * @param workflowId Workflow ID
   * @param params Query parameters
   * @returns Result list
   */
  async getResults(
    workflowId: string,
    params: InvoiceOCRQueryParams = {}
  ): Promise<InvoiceOCRPaginatedResponse<InvoiceOCRResult>> {
    try {
      const response = await api.get<
        InvoiceOCRApiResponse<InvoiceOCRPaginatedResponse<InvoiceOCRResult>>
      >(`${this.baseUrl}/${workflowId}/results`, {
        params,
      });
      return response.data.data!;
    } catch (error) {
      console.error('Failed to get Invoice OCR result list:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to get Invoice OCR result list'
      );
    }
  }

  /**
   * Delete processing result
   * @param workflowId Workflow ID
   * @param resultId Result ID
   * @returns Deletion result
   */
  async deleteResult(workflowId: string, resultId: string): Promise<void> {
    try {
      await api.delete<InvoiceOCRApiResponse<void>>(
        `${this.baseUrl}/${workflowId}/results/${resultId}`
      );
    } catch (error) {
      console.error('Failed to delete Invoice OCR result:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to delete Invoice OCR result'
      );
    }
  }

  /**
   * Batch delete processing results
   * @param workflowId Workflow ID
   * @param resultIds Result ID list
   * @returns Deletion result
   */
  async deleteResults(workflowId: string, resultIds: string[]): Promise<void> {
    try {
      await api.delete<InvoiceOCRApiResponse<void>>(
        `${this.baseUrl}/${workflowId}/results/batch`,
        {
          data: { resultIds },
        }
      );
    } catch (error) {
      console.error('Failed to batch delete Invoice OCR results:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to batch delete Invoice OCR results'
      );
    }
  }

  // ==================== Batch Task Management ====================

  /**
   * Get batch task status
   * @param workflowId Workflow ID
   * @param batchId Batch ID
   * @returns Batch task information
   */
  async getBatchTask(
    workflowId: string,
    batchId: string
  ): Promise<InvoiceOCRBatchTask> {
    try {
      const response = await api.get<
        InvoiceOCRApiResponse<InvoiceOCRBatchTask>
      >(`${this.baseUrl}/${workflowId}/batches/${batchId}`);
      return response.data.data!;
    } catch (error) {
      console.error('Failed to get batch task status:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to get batch task status'
      );
    }
  }

  /**
   * Get batch task list
   * @param workflowId Workflow ID
   * @param params Query parameters
   * @returns Batch task list
   */
  async getBatchTasks(
    workflowId: string,
    params: InvoiceOCRQueryParams = {}
  ): Promise<InvoiceOCRPaginatedResponse<InvoiceOCRBatchTask>> {
    try {
      const response = await api.get<
        InvoiceOCRApiResponse<InvoiceOCRPaginatedResponse<InvoiceOCRBatchTask>>
      >(`${this.baseUrl}/${workflowId}/batches`, {
        params,
      });
      return response.data.data!;
    } catch (error) {
      console.error('Failed to get batch task list:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to get batch task list'
      );
    }
  }

  /**
   * Cancel batch task
   * @param workflowId Workflow ID
   * @param batchId Batch ID
   * @returns Cancellation result
   */
  async cancelBatchTask(workflowId: string, batchId: string): Promise<void> {
    try {
      await api.post<InvoiceOCRApiResponse<void>>(
        `${this.baseUrl}/${workflowId}/batches/${batchId}/cancel`
      );
    } catch (error) {
      console.error('Failed to cancel batch task:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to cancel batch task'
      );
    }
  }

  /**
   * Retry batch task
   * @param workflowId Workflow ID
   * @param batchId Batch ID
   * @returns Retry result
   */
  async retryBatchTask(
    workflowId: string,
    batchId: string
  ): Promise<InvoiceOCRBatchTask> {
    try {
      const response = await api.post<
        InvoiceOCRApiResponse<InvoiceOCRBatchTask>
      >(`${this.baseUrl}/${workflowId}/batches/${batchId}/retry`);
      return response.data.data!;
    } catch (error) {
      console.error('Failed to retry batch task:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to retry batch task'
      );
    }
  }

  // ==================== File Download ====================

  /**
   * Download Invoice OCR result file
   * @param workflowId Workflow ID
   * @param resultId Result ID
   * @param format File format
   * @returns File download link
   */
  async downloadResult(
    workflowId: string,
    resultId: string,
    format: InvoiceOCROutputFormat = 'json'
  ): Promise<string> {
    try {
      const response = await api.get(
        `${this.baseUrl}/${workflowId}/results/${resultId}/download`,
        {
          params: { format },
          responseType: 'blob',
        }
      );

      // Create download link
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      return downloadUrl;
    } catch (error) {
      console.error('Failed to download Invoice OCR result:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to download Invoice OCR result'
      );
    }
  }

  /**
   * Batch download result files
   * @param workflowId Workflow ID
   * @param resultIds Result ID list
   * @param format File format
   * @returns Compressed file download link
   */
  async downloadResults(
    workflowId: string,
    resultIds: string[],
    format: InvoiceOCROutputFormat = 'json'
  ): Promise<string> {
    try {
      const response = await api.post(
        `${this.baseUrl}/${workflowId}/results/download-batch`,
        {
          resultIds,
          format,
        },
        {
          responseType: 'blob',
        }
      );

      // Create download link
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      return downloadUrl;
    } catch (error) {
      console.error('Failed to batch download Invoice OCR results:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to batch download Invoice OCR results'
      );
    }
  }

  // ==================== Execution History ====================

  /**
   * Get Invoice OCR workflow execution history
   * @param workflowId Workflow ID
   * @param params Query parameters
   * @returns Execution history list
   */
  async getExecutions(
    workflowId: string,
    params: InvoiceOCRQueryParams = {}
  ): Promise<InvoiceOCRPaginatedResponse<InvoiceOCRExecution>> {
    try {
      const response = await api.get<
        InvoiceOCRApiResponse<InvoiceOCRPaginatedResponse<InvoiceOCRExecution>>
      >(`${this.baseUrl}/${workflowId}/executions`, {
        params,
      });
      return response.data.data!;
    } catch (error) {
      console.error('Failed to get Invoice OCR execution history:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to get Invoice OCR execution history'
      );
    }
  }

  /**
   * Get execution details
   * @param workflowId Workflow ID
   * @param executionId Execution ID
   * @returns Execution details
   */
  async getExecution(
    workflowId: string,
    executionId: string
  ): Promise<InvoiceOCRExecution> {
    try {
      const response = await api.get<
        InvoiceOCRApiResponse<InvoiceOCRExecution>
      >(`${this.baseUrl}/${workflowId}/executions/${executionId}`);
      return response.data.data!;
    } catch (error) {
      console.error('Failed to get Invoice OCR execution details:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : 'Failed to get Invoice OCR execution details'
      );
    }
  }

  // ==================== Statistics ====================

  /**
   * Get workflow statistics
   * @param workflowId Workflow ID
   * @param timeRange Time range
   * @returns Statistics
   */
  async getStatistics(
    workflowId: string,
    timeRange: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<any> {
    try {
      const response = await api.get(
        `${this.baseUrl}/${workflowId}/statistics`,
        {
          params: { timeRange },
        }
      );
      return response.data.data;
    } catch (error) {
      console.error('Failed to get statistics:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to get statistics'
      );
    }
  }

  /**
   * Get statistics (compatibility method)
   * @param workflowId Workflow ID (optional, uses default if not provided)
   * @param timeRange Time range
   * @returns Statistics information
   */
  async getStats(
    workflowId?: string,
    timeRange: 'day' | 'week' | 'month' | 'year' = 'month'
  ): Promise<any> {
    // If no workflowId provided, return default statistics
    if (!workflowId) {
      return {
        totalFiles: 0,
        processedFiles: 0,
        successfulFiles: 0,
        failedFiles: 0,
        totalAmount: 0,
        averageProcessingTime: 0,
      };
    }

    return this.getStatistics(workflowId, timeRange);
  }

  /**
   * Get results list (compatibility method)
   * @param workflowId Workflow ID (optional)
   * @param params Query parameters
   * @returns Results list
   */
  async getResultsList(
    workflowId?: string,
    params: InvoiceOCRQueryParams = {}
  ): Promise<InvoiceOCRResult[]> {
    // If no workflowId provided, return empty array
    if (!workflowId) {
      return [];
    }

    const response = await this.getResults(workflowId, params);
    return response.items || [];
  }

  async getResultsListWithRetry(
    workflowId: string,
    params: InvoiceOCRQueryParams = {},
    options?: { maxAttempts?: number; baseDelayMs?: number }
  ): Promise<InvoiceOCRResult[]> {
    const maxAttempts = Math.max(1, options?.maxAttempts || 3);
    const baseDelayMs = Math.max(100, options?.baseDelayMs || 250);
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.getResultsList(workflowId, params);
      } catch (error) {
        lastError = error;
        const knownError = error as {
          response?: { status?: number };
          message?: string;
        };
        const httpStatus = knownError.response?.status;
        const message =
          typeof knownError.message === 'string'
            ? knownError.message.toLowerCase()
            : '';
        const retryableStatus =
          typeof httpStatus === 'number' &&
          (httpStatus === 408 ||
            httpStatus === 425 ||
            httpStatus === 429 ||
            httpStatus >= 500);
        const retryableNetwork =
          message.includes('network') ||
          message.includes('failed to fetch') ||
          message.includes('timeout');

        if (attempt >= maxAttempts || (!retryableStatus && !retryableNetwork)) {
          break;
        }

        const delay = this.buildBackoffDelay(attempt, baseDelayMs);
        await this.sleep(delay);
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error('Failed to load OCR results after retries');
  }

  // ==================== Configuration & Testing ====================

  /**
   * Get Invoice OCR configuration
   * @returns Configuration object
   */
  async getConfig(): Promise<any> {
    try {
      // Try to get from localStorage first
      const savedConfig = localStorage.getItem('invoiceOCR_config');
      if (savedConfig) {
        return JSON.parse(savedConfig);
      }

      // Return default configuration if no saved config
      return {
        workflowName: 'Invoice OCR Workflow',
        webhookUrl: 'https://n8n.wendealai.com/webhook/invoiceOCR',
        timeout: 30,
        retryAttempts: 3,
        enableNotifications: true,
        outputFormat: 'json',
      };
    } catch (error) {
      console.error('Failed to get config:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to get config'
      );
    }
  }

  /**
   * Save Invoice OCR configuration
   * @param config Configuration object to save
   * @returns Save result
   */
  async saveConfig(config: any): Promise<void> {
    try {
      // Save to localStorage
      localStorage.setItem('invoiceOCR_config', JSON.stringify(config));
      console.log('Invoice OCR config saved successfully:', config);
    } catch (error) {
      console.error('Failed to save config:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to save config'
      );
    }
  }

  /**
   * Test webhook connection
   * @param webhookUrl Webhook URL to test
   * @returns Test result
   */
  async testWebhook(
    webhookUrl: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post<
        InvoiceOCRApiResponse<{ success: boolean; message: string }>
      >(`${this.baseUrl}/test-webhook`, { webhookUrl });
      return response.data.data!;
    } catch (error) {
      console.error('Failed to test webhook:', error);
      throw new Error(
        error instanceof Error ? error.message : 'Failed to test webhook'
      );
    }
  }

  /**
   * Test result sync API connection (Invoice OCR result list endpoint)
   * @param workflowId Workflow ID
   * @returns Connectivity status
   */
  async testResultSyncConnection(
    workflowId: string
  ): Promise<InvoiceOcrResultSyncCheckResult> {
    const checkedAt = new Date().toISOString();
    const startedAt = Date.now();

    try {
      const response = await this.getResults(workflowId, {
        page: 1,
        pageSize: 1,
      });
      const totalCount =
        typeof response.pagination?.total === 'number'
          ? response.pagination.total
          : undefined;
      return {
        reachable: true,
        checkedAt,
        latencyMs: Date.now() - startedAt,
        resultCount: Array.isArray(response.items) ? response.items.length : 0,
        ...(typeof totalCount === 'number' ? { totalCount } : {}),
      };
    } catch (error) {
      const knownError = error as {
        response?: { status?: number; data?: { message?: string } };
        message?: string;
      };
      return {
        reachable: false,
        checkedAt,
        latencyMs: Date.now() - startedAt,
        ...(typeof knownError.response?.status === 'number'
          ? { httpStatus: knownError.response.status }
          : {}),
        errorMessage:
          knownError.response?.data?.message ||
          knownError.message ||
          'result_sync_check_failed',
      };
    }
  }

  /**
   * Test direct Supabase REST connection
   * @returns Connectivity status
   */
  async testSupabaseConnection(): Promise<InvoiceOcrSupabaseCheckResult> {
    const checkedAt = new Date().toISOString();
    const startedAt = Date.now();
    const runtime = globalThis as SupabaseRuntimeConfig;

    const supabaseUrl = runtime.__WENDEAL_SUPABASE_CONFIG__?.url?.trim() || '';
    const supabaseAnonKey =
      runtime.__WENDEAL_SUPABASE_CONFIG__?.anonKey?.trim() || '';

    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        reachable: false,
        configured: false,
        checkedAt,
        latencyMs: Date.now() - startedAt,
        errorMessage: 'Supabase configuration is missing',
      };
    }

    const requestUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/`;
    try {
      const requestSignal =
        typeof AbortSignal !== 'undefined' &&
        typeof AbortSignal.timeout === 'function'
          ? AbortSignal.timeout(this.defaultHealthCheckTimeoutMs)
          : undefined;
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        ...(requestSignal ? { signal: requestSignal } : {}),
      });

      return {
        reachable: response.ok || response.status < 500,
        configured: true,
        checkedAt,
        latencyMs: Date.now() - startedAt,
        requestUrl,
        httpStatus: response.status,
        statusText: response.statusText,
      };
    } catch (error) {
      return {
        reachable: false,
        configured: true,
        checkedAt,
        latencyMs: Date.now() - startedAt,
        requestUrl,
        errorMessage:
          error instanceof Error ? error.message : 'supabase_check_failed',
      };
    }
  }

  /**
   * Process enhanced webhook response
   * @param webhookResponse Enhanced webhook response data
   * @returns Processed result data
   */
  processEnhancedWebhookResponse(webhookResponse: EnhancedWebhookResponse): {
    summary: InvoiceProcessingSummary;
    financialSummary: FinancialSummary;
    processingDetails: ProcessingDetails;
    qualityMetrics: QualityMetrics;
    recommendations: string[];
  } | null {
    try {
      if (!webhookResponse.results || webhookResponse.results.length === 0) {
        console.warn('No enhanced data found in webhook response');
        return null;
      }

      // 取第一个结果作为主要数据源
      const primaryResult = webhookResponse.results?.[0];

      if (
        !primaryResult ||
        !primaryResult.summary ||
        !primaryResult.financialSummary ||
        !primaryResult.processingDetails ||
        !primaryResult.qualityMetrics ||
        !Array.isArray(primaryResult.recommendations)
      ) {
        console.warn('No primary result found in webhook response');
        return null;
      }

      // At this point, primaryResult is guaranteed to be non-null
      const result = primaryResult!;

      return {
        summary: result.summary,
        financialSummary: result.financialSummary,
        processingDetails: result.processingDetails,
        qualityMetrics: result.qualityMetrics,
        recommendations: result.recommendations,
      };
    } catch (error) {
      console.error('Failed to process enhanced webhook response:', error);
      return null;
    }
  }

  /**
   * Validate enhanced webhook response structure
   * @param response Webhook response to validate
   * @returns Whether the response has valid enhanced data structure
   */
  validateEnhancedResponse(response: any): response is EnhancedWebhookResponse {
    try {
      return (
        response &&
        Array.isArray(response.results) &&
        response.results.length > 0 &&
        response.results[0].summary &&
        response.results[0].financialSummary &&
        response.results[0].processingDetails &&
        response.results[0].qualityMetrics &&
        Array.isArray(response.results[0].recommendations)
      );
    } catch (error) {
      console.error('Error validating enhanced response:', error);
      return false;
    }
  }

  /**
   * Extract processing statistics from enhanced data
   * @param enhancedData Enhanced webhook response data
   * @returns Processing statistics
   */
  extractProcessingStats(enhancedData: any): {
    totalFiles: number;
    processedFiles: number;
    successfulFiles: number;
    failedFiles: number;
    totalAmount: number;
    averageProcessingTime: number;
  } {
    try {
      // 适配新的数据结构：直接包含 summary 和 financialSummary 字段
      let summary, financialSummary;

      if (enhancedData.results && enhancedData.results.length > 0) {
        // 旧的数据结构：包含 results 数组
        const result = enhancedData.results[0];
        summary = result.summary;
        financialSummary = result.financialSummary;
      } else if (enhancedData.summary && enhancedData.financialSummary) {
        // 新的数据结构：直接包含字段
        summary = enhancedData.summary;
        financialSummary = enhancedData.financialSummary;
      } else {
        console.warn('无法从 enhancedData 中提取统计信息，数据结构不匹配');
        return {
          totalFiles: 0,
          processedFiles: 0,
          successfulFiles: 0,
          failedFiles: 0,
          totalAmount: 0,
          averageProcessingTime: 0,
        };
      }

      return {
        totalFiles: summary.totalItems || 0,
        processedFiles: summary.ocrDocuments || 0,
        successfulFiles: summary.successfulExtractions || 0,
        failedFiles: summary.failedExtractions || 0,
        totalAmount:
          parseFloat(
            financialSummary.totalAmount?.replace(/[^\d.-]/g, '') || '0'
          ) || 0,
        averageProcessingTime: 0, // 可以从其他地方获取或计算
      };
    } catch (error) {
      console.error('Error extracting processing stats:', error);
      return {
        totalFiles: 0,
        processedFiles: 0,
        successfulFiles: 0,
        failedFiles: 0,
        totalAmount: 0,
        averageProcessingTime: 0,
      };
    }
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise(resolve => {
      globalThis.setTimeout(resolve, ms);
    });
  }

  private buildBackoffDelay(attempt: number, baseDelayMs: number): number {
    const safeAttempt = Math.max(1, attempt);
    const exponential = baseDelayMs * 2 ** (safeAttempt - 1);
    const jitter = Math.floor(Math.random() * 120);
    return Math.min(5000, exponential + jitter);
  }

  // ==================== Utility Methods ====================

  /**
   * Validate file type
   * @param file File object
   * @returns Whether it's a supported file type
   */
  validateFileType(file: File): boolean {
    const supportedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/tiff',
      'image/bmp',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.ms-excel',
    ];
    return supportedTypes.includes(file.type);
  }

  /**
   * Validate file size
   * @param file File object
   * @param maxSizeMB Maximum file size (MB)
   * @returns Whether it meets size limit
   */
  validateFileSize(file: File, maxSizeMB: number = 10): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return file.size <= maxSizeBytes;
  }

  /**
   * Format file size
   * @param bytes Number of bytes
   * @returns Formatted file size string
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generate unique batch name
   * @param prefix Prefix
   * @returns Unique batch name
   */
  generateBatchName(prefix: string = 'batch'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}-${timestamp}-${random}`;
  }

  getSupplierTemplateRules(): InvoiceOcrSupplierTemplateRule[] {
    try {
      const raw = localStorage.getItem(this.supplierTemplateStorageKey);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as InvoiceOcrSupplierTemplateRule[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Failed to load supplier template rules:', error);
      return [];
    }
  }

  saveSupplierTemplateRule(
    rule: Omit<InvoiceOcrSupplierTemplateRule, 'updatedAt'>
  ): InvoiceOcrSupplierTemplateRule[] {
    const nextRule: InvoiceOcrSupplierTemplateRule = {
      ...rule,
      updatedAt: new Date().toISOString(),
    };
    const existing = this.getSupplierTemplateRules();
    const deduped = existing.filter(
      item =>
        item.supplierName.trim().toLowerCase() !==
        nextRule.supplierName.trim().toLowerCase()
    );
    const next = [nextRule, ...deduped];
    localStorage.setItem(this.supplierTemplateStorageKey, JSON.stringify(next));
    return next;
  }

  applySupplierTemplateRule(
    supplierName: string,
    extractedData: Record<string, unknown>
  ): Record<string, unknown> {
    const normalizedSupplier = supplierName.trim().toLowerCase();
    const matchedRule = this.getSupplierTemplateRules().find(
      rule => rule.supplierName.trim().toLowerCase() === normalizedSupplier
    );
    if (!matchedRule) {
      return extractedData;
    }

    const output: Record<string, unknown> = { ...extractedData };
    for (const [fromKey, toKey] of Object.entries(matchedRule.fieldMappings)) {
      if (!toKey || typeof output[fromKey] === 'undefined') {
        continue;
      }
      output[toKey] = output[fromKey];
    }

    const currentTags = Array.isArray(output.tags)
      ? (output.tags as unknown[]).filter(tag => typeof tag === 'string')
      : [];
    const ruleTags = Array.isArray(matchedRule.defaultTags)
      ? matchedRule.defaultTags
      : [];
    output.tags = Array.from(new Set([...currentTags, ...ruleTags]));
    if (matchedRule.industry) {
      output.industry = matchedRule.industry;
    }
    return output;
  }

  inferInvoiceIndustryTags(extractedData: Record<string, unknown>): string[] {
    const sourceText = JSON.stringify(extractedData).toLowerCase();
    const tags = new Set<string>();

    if (sourceText.includes('logistics') || sourceText.includes('freight')) {
      tags.add('物流');
    }
    if (
      sourceText.includes('consulting') ||
      sourceText.includes('service fee')
    ) {
      tags.add('咨询服务');
    }
    if (sourceText.includes('software') || sourceText.includes('saas')) {
      tags.add('软件订阅');
    }
    if (
      sourceText.includes('construction') ||
      sourceText.includes('contractor')
    ) {
      tags.add('工程');
    }
    if (
      sourceText.includes('medical') ||
      sourceText.includes('clinic') ||
      sourceText.includes('pharma')
    ) {
      tags.add('医疗');
    }
    return Array.from(tags);
  }

  saveManualCorrection(
    workflowId: string,
    resultId: string,
    patch: Record<string, unknown>
  ): void {
    const key = `${this.manualCorrectionStoragePrefix}:${workflowId}`;
    const raw = localStorage.getItem(key);
    const store = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    store[resultId] = {
      patch,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(key, JSON.stringify(store));
  }

  getManualCorrection(
    workflowId: string,
    resultId: string
  ): Record<string, unknown> | null {
    try {
      const key = `${this.manualCorrectionStoragePrefix}:${workflowId}`;
      const raw = localStorage.getItem(key);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const entry = parsed[resultId];
      return typeof entry === 'object' && entry !== null
        ? (entry as Record<string, unknown>)
        : null;
    } catch (error) {
      console.error('Failed to get manual correction:', error);
      return null;
    }
  }
}

// Create service instance
export const invoiceOCRService = new InvoiceOCRService();

// Default export
export default invoiceOCRService;
