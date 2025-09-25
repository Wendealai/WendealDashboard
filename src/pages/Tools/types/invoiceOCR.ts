/**
 * Invoice OCR Workflow Type Definitions
 * Defines interfaces and types related to invoice OCR recognition
 */

import type {
  WorkflowInfo,
  WorkflowExecution,
} from '../../../pages/InformationDashboard/types';

/**
 * Invoice OCR Workflow Type
 */
export type InvoiceOCRWorkflowType = 'invoice-ocr';

/**
 * Invoice OCR Processing Status
 */
export type InvoiceOCRStatus =
  | 'uploading' // File uploading
  | 'processing' // OCR processing
  | 'completed' // Processing completed
  | 'failed' // Processing failed
  | 'cancelled'; // Cancelled

/**
 * Invoice OCR File Type
 */
export type InvoiceFileType = 'pdf' | 'jpg' | 'jpeg' | 'png' | 'tiff';

/**
 * Invoice OCR Language Support
 */
export type InvoiceOCRLanguage = 'zh-CN' | 'en-US' | 'auto';

/**
 * Invoice OCR Output Format
 */
export type InvoiceOCROutputFormat = 'json' | 'csv' | 'excel';

/**
 * Invoice OCR Workflow Configuration
 */
export interface InvoiceOCRWorkflow extends Omit<WorkflowInfo, 'type'> {
  type: InvoiceOCRWorkflowType;
  settings: InvoiceOCRSettings;
  statistics: InvoiceOCRStatistics;
}

/**
 * Invoice OCR Settings Configuration
 */
export interface InvoiceOCRSettings {
  /** Supported file types */
  supportedFileTypes: InvoiceFileType[];
  /** Maximum file size (MB) */
  maxFileSize: number;
  /** OCR language setting */
  language: InvoiceOCRLanguage;
  /** Output format */
  outputFormat: InvoiceOCROutputFormat;
  /** Whether to enable automatic classification */
  enableAutoClassification: boolean;
  /** Whether to enable data validation */
  enableDataValidation: boolean;
  /** Confidence threshold */
  confidenceThreshold: number;
  /** Batch processing settings */
  batchProcessing: {
    enabled: boolean;
    maxBatchSize: number;
    processingTimeout: number; // seconds
  };
  /** Notification settings */
  notifications: {
    onSuccess: boolean;
    onFailure: boolean;
    email?: string;
  };
}

/**
 * Invoice OCR File Information
 */
export interface InvoiceOCRFile {
  /** File ID */
  id: string;
  /** File name */
  name: string;
  /** File size (bytes) */
  size: number;
  /** File type */
  type: InvoiceFileType;
  /** Upload time */
  uploadedAt: string;
  /** Processing status */
  status: InvoiceOCRStatus;
  /** Processing progress (0-100) */
  progress?: number;
  /** Error message */
  error?: string;
  /** Preview URL */
  previewUrl?: string;
}

/**
 * Invoice OCR Statistics Information (for page usage)
 */
export interface InvoiceOCRStats {
  /** Total files count */
  totalFiles: number;
  /** Processed files count */
  processedFiles: number;
  /** Successfully processed files count */
  successfulFiles: number;
  /** Failed processing files count */
  failedFiles: number;
  /** Total amount */
  totalAmount: number;
  /** Average processing time (seconds) */
  averageProcessingTime: number;
}

/**
 * Invoice OCR Statistics Information (workflow level)
 */
export interface InvoiceOCRStatistics {
  /** Total processed files count */
  totalProcessed: number;
  /** Success count */
  successCount: number;
  /** Failure count */
  failureCount: number;
  /** Average processing time (seconds) */
  averageProcessingTime: number;
  /** Average confidence */
  averageConfidence: number;
  /** Monthly processed count */
  monthlyProcessed: number;
  /** Storage used (MB) */
  storageUsed: number;
}

/**
 * Invoice OCR Processing Result
 */
export interface InvoiceOCRResult {
  /** Result ID */
  id: string;
  /** Workflow ID */
  workflowId: string;
  /** Execution ID */
  executionId: string;
  /** Original file information */
  originalFile: {
    name: string;
    size: number;
    type: InvoiceFileType;
    uploadedAt: string;
  };
  /** Processing status */
  status: InvoiceOCRStatus;
  /** Processing start time */
  startedAt: string;
  /** Processing completion time */
  completedAt?: string;
  /** Processing duration (seconds) */
  processingDuration?: number;
  /** Extracted invoice data */
  extractedData?: InvoiceData;
  /** Confidence score */
  confidence?: number;
  /** Error information */
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  /** Output files */
  outputFiles?: {
    json?: string; // File path or download link
    csv?: string;
    excel?: string;
  };
}

/**
 * Extracted Invoice Data Structure
 */
export interface InvoiceData {
  /** Invoice basic information */
  basic: {
    invoiceNumber: string;
    invoiceDate: string;
    dueDate?: string;
    currency: string;
    totalAmount: number;
    taxAmount?: number;
    subtotalAmount?: number;
  };
  /** Vendor information */
  vendor: {
    name: string;
    address?: string;
    taxId?: string;
    phone?: string;
    email?: string;
  };
  /** Customer information */
  customer: {
    name: string;
    address?: string;
    taxId?: string;
    phone?: string;
    email?: string;
  };
  /** Invoice line items */
  lineItems: InvoiceLineItem[];
  /** Tax details */
  taxDetails?: {
    taxRate: number;
    taxType: string;
    taxAmount: number;
  }[];
  /** Payment information */
  paymentInfo?: {
    method?: string;
    terms?: string;
    bankAccount?: string;
  };
  /** Additional fields */
  additionalFields?: Record<string, any>;
}

/**
 * Invoice Line Item
 */
export interface InvoiceLineItem {
  /** Item description */
  description: string;
  /** Quantity */
  quantity: number;
  /** Unit price */
  unitPrice: number;
  /** Total price */
  totalPrice: number;
  /** Tax rate */
  taxRate?: number;
  /** Product code */
  productCode?: string;
  /** Unit */
  unit?: string;
}

/**
 * Invoice OCR Execution Record (extends base execution record)
 */
export interface InvoiceOCRExecution extends WorkflowExecution {
  /** Processed file information */
  fileInfo: {
    originalName: string;
    size: number;
    type: InvoiceFileType;
  };
  /** OCR result */
  ocrResult?: InvoiceOCRResult;
  /** Processing statistics */
  processingStats: {
    confidence: number;
    processingTime: number;
    extractedFieldsCount: number;
  };
}

/**
 * Invoice OCR Batch Task
 */
export interface InvoiceOCRBatchTask {
  /** Batch ID */
  id: string;
  /** Workflow ID */
  workflowId: string;
  /** Batch name */
  name: string;
  /** File list */
  files: {
    id: string;
    name: string;
    size: number;
    type: InvoiceFileType;
    status: InvoiceOCRStatus;
    result?: InvoiceOCRResult;
  }[];
  /** Batch status */
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  /** Creation time */
  createdAt: string;
  /** Start time */
  startedAt?: string;
  /** Completion time */
  completedAt?: string;
  /** Progress information */
  progress: {
    total: number;
    completed: number;
    failed: number;
    percentage: number;
  };
}

/**
 * Invoice OCR Workflow Creation Request
 */
export interface CreateInvoiceOCRWorkflowRequest {
  name: string;
  description?: string;
  settings: Partial<InvoiceOCRSettings>;
  tags?: string[];
}

/**
 * Invoice OCR Workflow Update Request
 */
export interface UpdateInvoiceOCRWorkflowRequest {
  name?: string;
  description?: string;
  settings?: Partial<InvoiceOCRSettings>;
  tags?: string[];
}

/**
 * Invoice OCR File Upload Request
 */
export interface InvoiceOCRUploadRequest {
  workflowId: string;
  files: File[];
  batchName?: string;
  processingOptions?: {
    language?: InvoiceOCRLanguage;
    outputFormat?: InvoiceOCROutputFormat;
    confidenceThreshold?: number;
  };
}

/**
 * Invoice OCR API Response Type
 */
export interface InvoiceOCRApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: string;
}

/**
 * Invoice OCR Paginated Response
 */
export interface InvoiceOCRPaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Invoice OCR Query Parameters
 */
export interface InvoiceOCRQueryParams {
  page?: number;
  pageSize?: number;
  status?: InvoiceOCRStatus;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: 'createdAt' | 'completedAt' | 'confidence' | 'fileName';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Invoice OCR Default Settings
 */
export const DEFAULT_INVOICE_OCR_SETTINGS: InvoiceOCRSettings = {
  supportedFileTypes: ['pdf', 'jpg', 'jpeg', 'png'],
  maxFileSize: 10, // 10MB
  language: 'auto',
  outputFormat: 'json',
  enableAutoClassification: true,
  enableDataValidation: true,
  confidenceThreshold: 0.8,
  batchProcessing: {
    enabled: true,
    maxBatchSize: 50,
    processingTimeout: 300, // 5 minutes
  },
  notifications: {
    onSuccess: true,
    onFailure: true,
  },
};
