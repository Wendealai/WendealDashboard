# R&D Report Module Documentation

## Overview

The R&D Report module is a comprehensive HTML document management system designed for research and development teams. It provides drag-and-drop file upload, categorized organization, reading progress tracking, and visual fidelity preservation for technical reports.

### Key Features

- **📁 Drag & Drop Upload**: Intuitive file upload with visual feedback
- **🏷️ Category Management**: Organize reports with customizable categories
- **📖 Reading Progress**: Track reading progress with bookmarks
- **🎨 Visual Fidelity**: Preserve original HTML formatting and styling
- **💾 Local Storage**: Secure local file storage with IndexedDB
- **🔍 Search & Filter**: Advanced search and filtering capabilities
- **📱 Responsive Design**: Works on desktop and mobile devices
- **♿ Accessibility**: WCAG 2.1 AA compliant

### Architecture

The module follows a modular architecture with clear separation of concerns:

```
src/pages/RNDReport/
├── RNDReport.tsx                 # Main container component
├── components/
│   ├── UploadZone.tsx           # File upload component
│   ├── ReportList.tsx           # Report listing and filtering
│   ├── ReportViewer.tsx         # HTML report viewer
│   ├── CategoryManager.tsx      # Category CRUD operations
│   └── ReportSettings.tsx       # Individual report settings
├── __tests__/                   # Unit tests
└── README.md                    # This documentation
```

## Quick Start

### Prerequisites

- React 19+
- TypeScript 5.8+
- Node.js 18+
- Modern browser with IndexedDB support

### Installation

The module is integrated into the WendealDashboard project. No additional installation required.

### Basic Usage

```tsx
import React from 'react';
import RNDReport from '@/pages/RNDReport/RNDReport';

const App: React.FC = () => {
  return <RNDReport />;
};

export default App;
```

## Components

### RNDReport (Main Container)

The main container component that orchestrates all R&D Report functionality.

```tsx
interface RNDReportProps {
  className?: string;
}

<RNDReport className="custom-rnd-report" />
```

**Features:**
- Tabbed interface (All Reports, Categories, Settings)
- Service initialization and state management
- Integration with Redux store

### UploadZone

Handles drag-and-drop file upload with validation and progress tracking.

```tsx
interface UploadZoneProps {
  onFilesAccepted: (files: FileList) => Promise<void>;
  isUploading: boolean;
  progress: number;
  multiple?: boolean;
  maxFiles?: number;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  className?: string;
  style?: React.CSSProperties;
}

<UploadZone
  onFilesAccepted={handleFileUpload}
  isUploading={uploading}
  progress={uploadProgress}
  multiple={true}
  maxFiles={10}
/>
```

**Features:**
- Drag and drop file upload
- File type and size validation
- Upload progress tracking
- Visual feedback for different states
- Multiple file support

### ReportList

Displays reports with filtering, sorting, and search capabilities.

```tsx
interface ReportListProps {
  reports: Report[];
  categories: Category[];
  viewState: ReportListViewState;
  onReportSelect: (reportId: string) => void;
  onCategorySelect: (categoryId: string) => void;
  onViewStateChange: (viewState: ReportListViewState) => void;
  loading?: boolean;
  className?: string;
}

<ReportList
  reports={reports}
  categories={categories}
  viewState={listViewState}
  onReportSelect={handleReportSelect}
  onCategorySelect={handleCategorySelect}
  onViewStateChange={setListViewState}
/>
```

**Features:**
- Search by title, content, and metadata
- Filter by category
- Sort by various criteria (date, size, progress)
- Pagination support
- Category statistics display

### ReportViewer

HTML report viewer with reading progress tracking and bookmarks.

```tsx
interface ReportViewerProps {
  report: Report;
  isOpen: boolean;
  isFullscreen: boolean;
  showSettings: boolean;
  onClose: () => void;
  onFullscreenToggle: () => void;
  onSettingsToggle: () => void;
  onProgressUpdate: (progress: number) => void;
  className?: string;
}

<ReportViewer
  report={currentReport}
  isOpen={viewerOpen}
  isFullscreen={isFullscreen}
  showSettings={showSettings}
  onClose={handleClose}
  onFullscreenToggle={handleFullscreenToggle}
  onSettingsToggle={handleSettingsToggle}
  onProgressUpdate={handleProgressUpdate}
/>
```

**Features:**
- HTML content rendering with iframe-resizer
- Reading progress tracking
- Bookmark support
- Fullscreen mode
- Keyboard shortcuts
- Settings panel

### CategoryManager

Category CRUD operations with statistics and validation.

```tsx
interface CategoryManagerProps {
  categories: Category[];
  categoryStats: Map<string, number>;
  onCategorySelect: (categoryId: string) => void;
  onCategoriesChange: (categories: Category[]) => void;
  service?: RNDReportService;
  className?: string;
}

<CategoryManager
  categories={categories}
  categoryStats={categoryStats}
  onCategorySelect={handleCategorySelect}
  onCategoriesChange={setCategories}
  service={rndService}
/>
```

**Features:**
- Create, read, update, delete categories
- Category statistics display
- Color customization
- Validation for uniqueness
- Bulk operations support

### ReportSettings

Individual report settings and metadata management.

```tsx
interface ReportSettingsProps {
  report: Report;
  categories: Category[];
  visible: boolean;
  onClose: () => void;
  onReportUpdate: (report: Report) => void;
  onReportDelete: (reportId: string) => void;
  service?: RNDReportService;
}

<ReportSettings
  report={selectedReport}
  categories={categories}
  visible={settingsVisible}
  onClose={handleSettingsClose}
  onReportUpdate={handleReportUpdate}
  onReportDelete={handleReportDelete}
  service={rndService}
/>
```

**Features:**
- Edit report name and description
- Change report category
- View reading statistics
- Delete report with confirmation
- Metadata display and editing

## API Reference

### RNDReportService

#### Constructor
```typescript
constructor(config?: Partial<RNDReportConfig>)
```

#### Methods

##### File Operations
```typescript
validateFile(file: File): Promise<FileValidationResult>
uploadFile(file: File, categoryId?: string): Promise<FileProcessingResult>
deleteReport(reportId: string): Promise<void>
getReportContent(reportId: string): Promise<string>
```

##### Report Management
```typescript
getReports(
  filters?: ReportSearchFilters,
  sortOptions?: ReportSortOptions,
  page?: number,
  pageSize?: number
): Promise<ReportListResponse>

getReport(reportId: string): Promise<Report>
updateReport(reportId: string, updates: Partial<Report>): Promise<Report>
searchReports(query: string, filters?: ReportSearchFilters): Promise<ReportListResponse>
```

##### Category Management
```typescript
getCategories(): Promise<CategoryListResponse>
getCategory(categoryId: string): Promise<Category>
createCategory(category: Omit<Category, 'id' | 'createdDate' | 'reportCount'>): Promise<Category>
updateCategory(categoryId: string, updates: Partial<Category>): Promise<Category>
deleteCategory(categoryId: string): Promise<void>
```

##### Reading Progress
```typescript
getReadingProgress(reportId: string): Promise<ReadingProgress>
updateReadingProgress(reportId: string, progress: Partial<ReadingProgress>): Promise<ReadingProgress>
addBookmark(reportId: string, bookmark: Omit<ReadingProgress['bookmarks'][0], 'id' | 'createdAt'>): Promise<ReadingProgress['bookmarks'][0]>
removeBookmark(reportId: string, bookmarkId: string): Promise<void>
```

##### Storage Management
```typescript
getStorageInfo(): Promise<StorageInfo>
cleanupStorage(olderThanDays?: number): Promise<{ deletedCount: number; freedSpace: number }>
exportReports(reportIds: string[], format: 'json' | 'csv'): Promise<string>
```

##### System Methods
```typescript
initialize(config: RNDReportConfig): Promise<void>
healthCheck(): Promise<boolean>
getStats(): Promise<{ totalReports: number; totalCategories: number; totalStorageUsed: number; lastSyncDate?: Date }>
dispose(): Promise<void>
```

## Configuration

### RNDReportConfig

```typescript
interface RNDReportConfig {
  maxFileSize: number;        // Maximum file size in bytes (default: 50MB)
  allowedFileTypes: string[]; // Allowed MIME types (default: ['text/html', 'application/xhtml+xml'])
  storagePath: string;        // Storage path prefix (default: 'rnd-reports')
  autoExtractMetadata: boolean; // Auto-extract HTML metadata (default: true)
  enableReadingProgress: boolean; // Enable reading progress tracking (default: true)
  enableBookmarks: boolean;    // Enable bookmark functionality (default: true)
  enableSearch: boolean;       // Enable search functionality (default: true)
  enableCategories: boolean;   // Enable category functionality (default: true)
  defaultViewMode: 'list' | 'grid' | 'tree'; // Default view mode (default: 'list')
  itemsPerPage: number;        // Items per page for pagination (default: 20)
  enableOfflineMode: boolean;  // Enable offline functionality (default: true)
}
```

### Default Configuration

```typescript
const DEFAULT_RND_REPORT_CONFIG: RNDReportConfig = {
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
```

## Type Definitions

### Core Types

```typescript
interface Report {
  id: string;
  name: string;
  originalName: string;
  filePath: string;
  categoryId: string;
  fileSize: number;
  uploadDate: Date;
  lastReadDate?: Date;
  readingProgress: number;
  metadata: ReportMetadata;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  reportCount: number;
  createdDate: Date;
  updatedDate?: Date;
}

interface ReadingProgress {
  reportId: string;
  currentPosition: number;
  totalPages: number;
  currentPage: number;
  lastReadAt: Date;
  bookmarks: Bookmark[];
}
```

## Usage Examples

### Basic Setup

```tsx
import React, { useState, useEffect } from 'react';
import { RNDReportService } from '@/services/rndReportService';
import RNDReport from '@/pages/RNDReport/RNDReport';

const App: React.FC = () => {
  const [service, setService] = useState<RNDReportService | null>(null);

  useEffect(() => {
    const initializeService = async () => {
      const rndService = new RNDReportService();
      await rndService.initialize({
        maxFileSize: 100 * 1024 * 1024, // 100MB
        enableOfflineMode: true,
      });
      setService(rndService);
    };

    initializeService();
  }, []);

  return (
    <div>
      {service && <RNDReport />}
    </div>
  );
};
```

### Custom File Upload Handler

```tsx
import { useCallback } from 'react';
import { FileProcessingUtils } from '@/utils/rndReportUtils';

const useFileUpload = (service: RNDReportService) => {
  const handleFileUpload = useCallback(async (files: FileList) => {
    const uploadPromises = Array.from(files).map(async (file) => {
      // Validate file
      const validation = await FileProcessingUtils.validateHtmlFile(file);
      if (!validation.isValid) {
        throw new Error(`File validation failed: ${validation.error}`);
      }

      // Upload file
      const result = await service.uploadFile(file, 'tech-research');
      return result;
    });

    return Promise.all(uploadPromises);
  }, [service]);

  return { handleFileUpload };
};
```

### Reading Progress Integration

```tsx
import { useEffect, useState } from 'react';

const useReadingProgress = (service: RNDReportService, reportId: string) => {
  const [progress, setProgress] = useState<ReadingProgress | null>(null);

  useEffect(() => {
    const loadProgress = async () => {
      const readingProgress = await service.getReadingProgress(reportId);
      setProgress(readingProgress);
    };

    loadProgress();
  }, [service, reportId]);

  const updateProgress = async (newProgress: Partial<ReadingProgress>) => {
    const updatedProgress = await service.updateReadingProgress(reportId, newProgress);
    setProgress(updatedProgress);
  };

  const addBookmark = async (bookmark: Omit<Bookmark, 'id' | 'createdAt'>) => {
    const newBookmark = await service.addBookmark(reportId, bookmark);
    setProgress(prev => prev ? {
      ...prev,
      bookmarks: [...prev.bookmarks, newBookmark]
    } : null);
  };

  return { progress, updateProgress, addBookmark };
};
```

## Keyboard Shortcuts

The ReportViewer component supports the following keyboard shortcuts:

- `Escape`: Close viewer
- `F11` or `F`: Toggle fullscreen mode
- `Ctrl+S` / `Cmd+S`: Toggle settings panel
- `Arrow Keys`: Navigate through content (when implemented)

## Browser Support

### Supported Browsers

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Required Browser Features

- IndexedDB API
- File System Access API (optional, falls back to localStorage)
- FileReader API
- Drag and Drop API
- Modern ES2020 features

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: Components are loaded on-demand
2. **Virtual Scrolling**: For large report lists
3. **Debounced Search**: Prevents excessive API calls
4. **Memory Management**: Proper cleanup of resources
5. **Caching**: File content and metadata caching

### Recommended Limits

- Maximum file size: 50MB per HTML file
- Maximum files per upload: 10
- Search debounce delay: 300ms
- Progress save interval: 100ms

## Security Considerations

### File Validation

- HTML files are validated for proper structure
- Malicious scripts are sanitized
- File size limits prevent abuse
- Content validation prevents XSS attacks

### Data Privacy

- All data stored locally in browser
- No external data transmission
- User-controlled file access
- Secure local storage usage

## Error Handling

### Common Error Scenarios

1. **File Upload Errors**
   - Invalid file type or size
   - Network connectivity issues
   - Storage quota exceeded

2. **File Reading Errors**
   - Corrupted HTML files
   - Missing file permissions
   - Unsupported file formats

3. **Storage Errors**
   - IndexedDB unavailable
   - Storage quota exceeded
   - Browser compatibility issues

### Error Recovery

- Graceful degradation to localStorage
- Automatic retry for transient errors
- User-friendly error messages
- Data integrity preservation

## Testing

### Unit Tests

Run unit tests for individual components and utilities:

```bash
npm test -- --testPathPattern=RNDReport
```

### Integration Tests

Run integration tests for complete user flows:

```bash
npm run test:integration
```

### Test Coverage

The module maintains >80% test coverage for:
- Component rendering and interactions
- Service layer functionality
- Error handling scenarios
- User workflow validation

## Development Guidelines

### Code Style

- Follow existing project TypeScript and ESLint rules
- Use functional components with hooks
- Implement proper error boundaries
- Add comprehensive TypeScript types

### Component Patterns

- Use controlled components for forms
- Implement proper loading states
- Handle accessibility requirements
- Follow existing design system

### State Management

- Use Redux for global state
- Implement proper action types
- Handle async operations with thunks
- Maintain immutable state updates

### Performance

- Implement proper memoization
- Avoid unnecessary re-renders
- Optimize bundle size
- Monitor memory usage

## Troubleshooting

### Common Issues

1. **Files not uploading**
   - Check file size limits
   - Verify file type compatibility
   - Ensure browser supports required APIs

2. **Reports not displaying**
   - Check HTML file validity
   - Verify iframe permissions
   - Clear browser cache

3. **Progress not saving**
   - Check IndexedDB availability
   - Verify localStorage permissions
   - Clear corrupted data

### Debug Mode

Enable debug logging by setting:

```javascript
localStorage.setItem('rnd-report-debug', 'true');
```

### Browser Developer Tools

Use browser developer tools to:
- Inspect IndexedDB storage
- Monitor network requests
- Check console for errors
- Profile performance issues

## Contributing

### Development Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Run tests: `npm test`

### Code Review Checklist

- [ ] TypeScript types are properly defined
- [ ] Components follow existing patterns
- [ ] Tests are written and passing
- [ ] Documentation is updated
- [ ] Accessibility requirements met
- [ ] Performance considerations addressed

## License

This module is part of the WendealDashboard project and follows the same license terms.

## Support

For support and questions:
- Check existing documentation
- Review test cases for examples
- Create issues for bugs or feature requests
- Contact the development team

---

**Last Updated:** December 2024
**Version:** 1.0.0
**Maintainer:** WendealDashboard Team
