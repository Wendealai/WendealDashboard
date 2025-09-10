// R&D Report Module Type Definitions

export interface Report {
  id: string;
  name: string;
  originalName: string;
  filePath: string;
  categoryId: string;
  fileSize: number;
  uploadDate: Date;
  lastReadDate?: Date;
  readingProgress: number; // 0-100 percentage
  metadata: ReportMetadata;
}

export interface ReportMetadata {
  title?: string;
  description?: string;
  author?: string;
  createdDate?: Date;
  keywords?: string[];
  version?: string;
  lastModified?: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  reportCount: number;
  createdDate: Date;
  updatedDate?: Date;
}

export interface UploadState {
  isUploading: boolean;
  progress: number; // 0-100 percentage
  currentFile?: string;
  error?: string;
  uploadedFiles: string[];
}

// Default categories as per requirements
export const DEFAULT_CATEGORIES: Omit<Category, 'id' | 'createdDate' | 'reportCount'>[] = [
  { name: 'Technical Research', description: 'Technical research reports and analysis' },
  { name: 'Market Research', description: 'Market research and analysis reports' },
  { name: 'Marketing Promotion', description: 'Marketing and promotional materials' },
  { name: 'Strategic Analysis', description: 'Strategic planning and analysis reports' },
  { name: 'Product Documentation', description: 'Product specifications and documentation' },
  { name: 'Uncategorized', description: 'Reports without specific categorization' },
];

// File operation types
export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  fileType?: string;
  fileSize?: number;
}

export interface FileProcessingOptions {
  extractMetadata: boolean;
  validateContent: boolean;
  generateThumbnail?: boolean;
}

export interface FileProcessingResult {
  success: boolean;
  filePath?: string;
  metadata?: Partial<ReportMetadata>;
  error?: string;
}

// Reading progress types
export interface ReadingProgress {
  reportId: string;
  userId?: string;
  currentPosition: number; // percentage 0-100
  totalPages?: number;
  currentPage?: number;
  lastReadAt: Date;
  bookmarks: Bookmark[];
}

export interface Bookmark {
  id: string;
  position: number; // percentage 0-100
  title?: string;
  notes?: string;
  createdAt: Date;
}

// Search and filtering types
export interface ReportSearchFilters {
  query?: string;
  categoryIds?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  fileSizeRange?: {
    min?: number;
    max?: number;
  };
  readingProgressRange?: {
    min?: number;
    max?: number;
  };
  authors?: string[];
  tags?: string[];
}

export interface ReportSortOptions {
  field: 'name' | 'uploadDate' | 'lastReadDate' | 'fileSize' | 'readingProgress';
  direction: 'asc' | 'desc';
}

// UI state types
export interface ReportListViewState {
  selectedCategoryId?: string;
  searchFilters: ReportSearchFilters;
  sortOptions: ReportSortOptions;
  viewMode: 'list' | 'grid' | 'tree';
  expandedCategories: string[];
}

export interface ReportViewerState {
  isOpen: boolean;
  currentReport?: Report;
  readingProgress: ReadingProgress;
  isFullscreen: boolean;
  showSettings: boolean;
}

// Service response types
export interface ReportListResponse {
  reports: Report[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

export interface CategoryListResponse {
  categories: Category[];
  totalCount: number;
}

// Error types
export interface RNDReportError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export type RNDReportErrorCode =
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'FILE_CORRUPTED'
  | 'FILE_NOT_FOUND'
  | 'STORAGE_FULL'
  | 'PERMISSION_DENIED'
  | 'NETWORK_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';

// Utility types
export type ReportStatus = 'uploading' | 'processing' | 'ready' | 'error';
export type CategoryType = 'system' | 'user' | 'default';

// File system types
export interface FileSystemEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt?: Date;
  isDirectory: boolean;
}

export interface StorageInfo {
  totalSpace: number;
  usedSpace: number;
  availableSpace: number;
  reportsCount: number;
  categoriesCount: number;
}

// Event types for real-time updates
export interface ReportEvent {
  type: 'created' | 'updated' | 'deleted' | 'read';
  reportId: string;
  timestamp: Date;
  data?: Partial<Report>;
}

export interface CategoryEvent {
  type: 'created' | 'updated' | 'deleted';
  categoryId: string;
  timestamp: Date;
  data?: Partial<Category>;
}

// Configuration types
export interface RNDReportConfig {
  maxFileSize: number; // in bytes
  allowedFileTypes: string[];
  storagePath: string;
  autoExtractMetadata: boolean;
  enableReadingProgress: boolean;
  enableBookmarks: boolean;
  enableSearch: boolean;
  enableCategories: boolean;
  defaultViewMode: 'list' | 'grid' | 'tree';
  itemsPerPage: number;
  enableOfflineMode: boolean;
}

// Default configuration
export const DEFAULT_RND_REPORT_CONFIG: RNDReportConfig = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedFileTypes: ['text/html', 'application/xhtml+xml'],
  storagePath: 'rnd-reports',
  autoExtractMetadata: true,
  enableReadingProgress: true,
  enableBookmarks: true,
  enableSearch: true,
  enableCategories: true,
  defaultViewMode: 'list',
  itemsPerPage: 20,
  enableOfflineMode: true,
};
