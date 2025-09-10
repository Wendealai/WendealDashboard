/**
 * Universal OCR Workflow Type Definitions
 * Defines interfaces and types related to universal OCR processing
 */

/**
 * Universal OCR Workflow Type
 */
export type UniversalOCRWorkflowType = 'universal-ocr';

/**
 * Universal OCR Processing Status
 */
export type UniversalOCRStatus =
  | 'uploading' // File uploading
  | 'processing' // OCR processing
  | 'completed' // Processing completed
  | 'failed' // Processing failed
  | 'cancelled'; // Cancelled

/**
 * Universal OCR Supported File Types
 */
export type UniversalOCRFileType =
  | 'pdf'
  | 'jpg'
  | 'jpeg'
  | 'png'
  | 'tiff'
  | 'bmp'
  | 'gif'
  | 'doc'
  | 'docx'
  | 'txt'
  | 'rtf';

/**
 * Universal OCR Language Support
 */
export type UniversalOCRLanguage =
  | 'zh-CN'
  | 'en-US'
  | 'auto'
  | 'ja-JP'
  | 'ko-KR'
  | 'fr-FR'
  | 'de-DE'
  | 'es-ES'
  | 'it-IT'
  | 'pt-BR'
  | 'ru-RU';

/**
 * Universal OCR Output Format
 */
export type UniversalOCROutputFormat =
  | 'json'
  | 'txt'
  | 'csv'
  | 'excel'
  | 'pdf'
  | 'docx';

/**
 * Universal OCR Workflow Configuration
 */
export interface UniversalOCRWorkflow {
  type: UniversalOCRWorkflowType;
  settings: UniversalOCRSettings;
  statistics: UniversalOCRStatistics;
}

/**
 * Universal OCR Settings Configuration
 */
export interface UniversalOCRSettings {
  /** Supported file types */
  supportedFileTypes: UniversalOCRFileType[];
  /** Maximum file size (MB) */
  maxFileSize: number;
  /** OCR language setting */
  language: UniversalOCRLanguage;
  /** Output format */
  outputFormat: UniversalOCROutputFormat;
  /** Whether to enable automatic language detection */
  enableAutoLanguageDetection: boolean;
  /** Whether to enable data validation */
  enableDataValidation: boolean;
  /** Whether to preserve document formatting */
  preserveFormatting: boolean;
  /** Whether to extract images */
  extractImages: boolean;
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
  /** Advanced OCR settings */
  advanced: {
    /** OCR engine to use */
    ocrEngine: 'tesseract' | 'google-vision' | 'azure-computer-vision' | 'auto';
    /** Preprocessing options */
    preprocessing: {
      deskew: boolean;
      noiseReduction: boolean;
      contrastEnhancement: boolean;
      binarization: boolean;
    };
    /** Post-processing options */
    postprocessing: {
      spellCheck: boolean;
      textCleaning: boolean;
      tableDetection: boolean;
    };
  };
}

/**
 * Universal OCR File Information
 */
export interface UniversalOCRFile {
  /** File ID */
  id: string;
  /** File name */
  name: string;
  /** File size (bytes) */
  size: number;
  /** File type */
  type: UniversalOCRFileType;
  /** Upload time */
  uploadedAt: string;
  /** Processing status */
  status: UniversalOCRStatus;
  /** Processing progress (0-100) */
  progress?: number;
  /** Error message */
  error?: string;
  /** Preview URL */
  previewUrl?: string;
  /** File metadata */
  metadata?: {
    pages?: number;
    language?: string;
    encoding?: string;
    hasImages?: boolean;
  };
}

/**
 * Universal OCR Statistics Information
 */
export interface UniversalOCRStats {
  /** Total files count */
  totalFiles: number;
  /** Processed files count */
  processedFiles: number;
  /** Successfully processed files count */
  successfulFiles: number;
  /** Failed processing files count */
  failedFiles: number;
  /** Total text extracted (characters) */
  totalTextExtracted: number;
  /** Average processing time (seconds) */
  averageProcessingTime: number;
  /** Average confidence score */
  averageConfidence: number;
  /** Total pages processed */
  totalPagesProcessed: number;
}

/**
 * Universal OCR Statistics Information (workflow level)
 */
export interface UniversalOCRStatistics {
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
  /** Most used file types */
  popularFileTypes: Record<UniversalOCRFileType, number>;
  /** Language distribution */
  languageDistribution: Record<UniversalOCRLanguage, number>;
}

/**
 * Universal OCR Processing Result
 */
export interface UniversalOCRResult {
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
    type: UniversalOCRFileType;
    uploadedAt: string;
    metadata?: Record<string, any>;
  };
  /** Processing status */
  status: UniversalOCRStatus;
  /** Processing start time */
  startedAt: string;
  /** Processing completion time */
  completedAt?: string;
  /** Processing duration (seconds) */
  processingDuration?: number;
  /** Extracted data */
  extractedData?: UniversalOCRExtractedData;
  /** Overall confidence score */
  confidence?: number;
  /** Error information */
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  /** Output files */
  outputFiles?: {
    txt?: string; // File path or download link
    json?: string;
    csv?: string;
    excel?: string;
    pdf?: string;
    docx?: string;
  };
  /** Processing metadata */
  metadata?: {
    ocrEngine: string;
    language: string;
    pages: number;
    textLength: number;
    hasTables: boolean;
    hasImages: boolean;
  };
}

/**
 * Universal OCR Extracted Data Structure
 */
export interface UniversalOCRExtractedData {
  /** Full extracted text */
  fullText: string;
  /** Text organized by pages */
  pages: UniversalOCRPageData[];
  /** Detected tables */
  tables?: UniversalOCRTable[];
  /** Extracted images */
  images?: UniversalOCRImage[];
  /** Document structure information */
  structure?: {
    title?: string;
    headings?: string[];
    paragraphs?: string[];
    lists?: string[][];
  };
  /** Language detection results */
  languageDetection?: {
    detected: UniversalOCRLanguage;
    confidence: number;
    alternatives?: Array<{
      language: UniversalOCRLanguage;
      confidence: number;
    }>;
  };
}

/**
 * Universal OCR Page Data
 */
export interface UniversalOCRPageData {
  /** Page number */
  pageNumber: number;
  /** Text content of the page */
  text: string;
  /** Confidence score for this page */
  confidence: number;
  /** Bounding boxes for text elements */
  boundingBoxes?: UniversalOCRBoundingBox[];
  /** Page dimensions */
  dimensions?: {
    width: number;
    height: number;
  };
}

/**
 * Universal OCR Bounding Box
 */
export interface UniversalOCRBoundingBox {
  /** Text content */
  text: string;
  /** Confidence score */
  confidence: number;
  /** Bounding box coordinates */
  bbox: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

/**
 * Universal OCR Table Data
 */
export interface UniversalOCRTable {
  /** Table ID */
  id: string;
  /** Page number where table is located */
  pageNumber: number;
  /** Table rows */
  rows: string[][];
  /** Table headers */
  headers?: string[];
  /** Confidence score */
  confidence: number;
  /** Table bounding box */
  bbox?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
}

/**
 * Universal OCR Image Data
 */
export interface UniversalOCRImage {
  /** Image ID */
  id: string;
  /** Page number where image is located */
  pageNumber: number;
  /** Image data (base64) */
  data: string;
  /** Image format */
  format: string;
  /** Confidence score */
  confidence: number;
  /** Image bounding box */
  bbox?: {
    x0: number;
    y0: number;
    x1: number;
    y1: number;
  };
  /** OCR text found in image */
  extractedText?: string;
}

/**
 * Universal OCR Execution Record
 */
export interface UniversalOCRExecution {
  /** Execution ID */
  id: string;
  /** Workflow ID */
  workflowId: string;
  /** Start time */
  startedAt: string;
  /** Completion time */
  completedAt?: string;
  /** Status */
  status: UniversalOCRStatus;
  /** Files processed */
  files: UniversalOCRFile[];
  /** Results */
  results: UniversalOCRResult[];
  /** Processing statistics */
  processingStats: {
    totalFiles: number;
    processedFiles: number;
    failedFiles: number;
    totalProcessingTime: number;
    averageConfidence: number;
    totalTextExtracted: number;
  };
}

/**
 * Universal OCR Batch Task
 */
export interface UniversalOCRBatchTask {
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
    type: UniversalOCRFileType;
    status: UniversalOCRStatus;
    result?: UniversalOCRResult;
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
  /** Batch processing options */
  options?: UniversalOCRProcessingOptions;
}

/**
 * Universal OCR Processing Options
 */
export interface UniversalOCRProcessingOptions {
  /** Language to use */
  language?: UniversalOCRLanguage;
  /** Output formats */
  outputFormats?: UniversalOCROutputFormat[];
  /** Confidence threshold */
  confidenceThreshold?: number;
  /** Preprocessing options */
  preprocessing?: {
    deskew?: boolean;
    noiseReduction?: boolean;
    contrastEnhancement?: boolean;
  };
  /** Whether to extract tables */
  extractTables?: boolean;
  /** Whether to extract images */
  extractImages?: boolean;
  /** OCR engine preference */
  ocrEngine?: 'tesseract' | 'google-vision' | 'azure-computer-vision' | 'auto';
}

/**
 * Universal OCR Workflow Creation Request
 */
export interface CreateUniversalOCRWorkflowRequest {
  name: string;
  description?: string;
  settings: Partial<UniversalOCRSettings>;
  tags?: string[];
}

/**
 * Universal OCR Workflow Update Request
 */
export interface UpdateUniversalOCRWorkflowRequest {
  name?: string;
  description?: string;
  settings?: Partial<UniversalOCRSettings>;
  tags?: string[];
}

/**
 * Universal OCR File Upload Request
 */
export interface UniversalOCRUploadRequest {
  workflowId: string;
  files: File[];
  batchName?: string;
  processingOptions?: UniversalOCRProcessingOptions;
}

/**
 * Universal OCR API Response Type
 */
export interface UniversalOCRApiResponse<T = any> {
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
 * Universal OCR Paginated Response
 */
export interface UniversalOCRPaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Universal OCR Query Parameters
 */
export interface UniversalOCRQueryParams {
  page?: number;
  pageSize?: number;
  status?: UniversalOCRStatus;
  fileType?: UniversalOCRFileType;
  language?: UniversalOCRLanguage;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: 'createdAt' | 'completedAt' | 'confidence' | 'fileName' | 'fileSize';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Universal OCR Default Settings
 */
export const DEFAULT_UNIVERSAL_OCR_SETTINGS: UniversalOCRSettings = {
  supportedFileTypes: ['pdf', 'jpg', 'jpeg', 'png', 'tiff', 'doc', 'docx', 'txt'],
  maxFileSize: 50, // 50MB
  language: 'auto',
  outputFormat: 'txt',
  enableAutoLanguageDetection: true,
  enableDataValidation: true,
  preserveFormatting: true,
  extractImages: false,
  confidenceThreshold: 0.7,
  batchProcessing: {
    enabled: true,
    maxBatchSize: 20,
    processingTimeout: 600, // 10 minutes
  },
  notifications: {
    onSuccess: true,
    onFailure: true,
  },
  advanced: {
    ocrEngine: 'auto',
    preprocessing: {
      deskew: true,
      noiseReduction: true,
      contrastEnhancement: true,
      binarization: false,
    },
    postprocessing: {
      spellCheck: false,
      textCleaning: true,
      tableDetection: true,
    },
  },
};

/**
 * Supported file type extensions mapping
 */
export const SUPPORTED_FILE_EXTENSIONS: Record<UniversalOCRFileType, string[]> = {
  pdf: ['.pdf'],
  jpg: ['.jpg', '.jpeg'],
  jpeg: ['.jpg', '.jpeg'],
  png: ['.png'],
  tiff: ['.tiff', '.tif'],
  bmp: ['.bmp'],
  gif: ['.gif'],
  doc: ['.doc'],
  docx: ['.docx'],
  txt: ['.txt'],
  rtf: ['.rtf'],
};

/**
 * File type MIME types mapping
 */
export const FILE_TYPE_MIME_TYPES: Record<UniversalOCRFileType, string[]> = {
  pdf: ['application/pdf'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  tiff: ['image/tiff', 'image/tif'],
  bmp: ['image/bmp'],
  gif: ['image/gif'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  txt: ['text/plain'],
  rtf: ['application/rtf', 'text/rtf'],
};
