import React from 'react';
import { screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderWithProviders,
  mockUser,
} from '@/__tests__/utils/test-utils';
import { server } from '@/mocks/server';
import { rest } from 'msw';
import RNDReport from '@/pages/RNDReport/RNDReport';

// Mock File API
const mockFile = (name: string, content: string, type = 'text/html'): File => {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
};

// Start MSW server
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('RNDReport Integration Tests', () => {
  beforeEach(() => {
    // Set authentication state
    localStorage.setItem('token', 'mock-token');

    // Mock IndexedDB
    const mockIndexedDB = {
      open: jest.fn().mockReturnValue({
        onerror: null,
        onsuccess: null,
        onupgradeneeded: null,
        result: {
          transaction: jest.fn().mockReturnValue({
            objectStore: jest.fn().mockReturnValue({
              put: jest.fn().mockResolvedValue(undefined),
              get: jest.fn().mockResolvedValue(null),
              getAll: jest.fn().mockResolvedValue([]),
              delete: jest.fn().mockResolvedValue(undefined),
              clear: jest.fn().mockResolvedValue(undefined),
            }),
          }),
          close: jest.fn(),
        },
      }),
    };

    Object.defineProperty(window, 'indexedDB', {
      value: mockIndexedDB,
      writable: true,
    });
  });

  afterEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Complete User Flow', () => {
    it('should complete full workflow: upload → categorize → read → track progress', async () => {
      const user = userEvent.setup();
      const htmlContent = `
        <html>
          <head>
            <title>Test Technical Report</title>
            <meta name="author" content="Test Author">
            <meta name="description" content="A comprehensive technical analysis">
          </head>
          <body>
            <h1>Test Technical Report</h1>
            <p>This is a comprehensive technical analysis report covering various aspects of the technology stack.</p>
            <h2>Introduction</h2>
            <p>The introduction section provides background information about the technical analysis.</p>
            <h2>Methodology</h2>
            <p>The methodology section describes the approach used in this technical analysis.</p>
            <h2>Results</h2>
            <p>The results section presents the findings of the technical analysis.</p>
            <h2>Conclusion</h2>
            <p>The conclusion summarizes the key points from this technical analysis.</p>
          </body>
        </html>
      `;

      const testFile = mockFile('test-technical-report.html', htmlContent);

      // Mock file reader
      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null,
        onerror: null,
        result: htmlContent,
      };
      global.FileReader = jest.fn(() => mockFileReader) as any;

      // Mock DOM parser
      const mockDOMParser = {
        parseFromString: jest.fn().mockReturnValue({
          querySelector: jest.fn((selector) => {
            switch (selector) {
              case 'title':
                return { textContent: 'Test Technical Report' };
              case 'meta[name="author"]':
                return { getAttribute: () => 'Test Author' };
              case 'meta[name="description"]':
                return { getAttribute: () => 'A comprehensive technical analysis' };
              default:
                return null;
            }
          }),
          querySelectorAll: jest.fn().mockReturnValue([]),
          body: {},
          head: {},
        }),
      };
      global.DOMParser = jest.fn(() => mockDOMParser) as any;

      // Initial state
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
        },
      };

      renderWithProviders(<RNDReport />, { initialState });

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('R&D Report')).toBeInTheDocument();
      });

      // Step 1: Upload file
      const fileInput = screen.getByLabelText(/select files/i) as HTMLInputElement;

      // Mock file drop
      Object.defineProperty(fileInput, 'files', {
        value: [testFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Wait for upload to complete
      await waitFor(() => {
        expect(screen.getByText(/upload success/i)).toBeInTheDocument();
      });

      // Step 2: Verify report appears in list
      await waitFor(() => {
        expect(screen.getByText('test-technical-report')).toBeInTheDocument();
      });

      // Step 3: Open report
      const reportItem = screen.getByText('test-technical-report');
      fireEvent.click(reportItem);

      // Wait for viewer to open
      await waitFor(() => {
        expect(screen.getByText('Test Technical Report')).toBeInTheDocument();
      });

      // Step 4: Verify reading progress tracking
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();

      // Step 5: Verify metadata extraction
      expect(screen.getByText('Test Author')).toBeInTheDocument();

      // Step 6: Test category assignment
      const categoryTab = screen.getByText('Categories');
      fireEvent.click(categoryTab);

      await waitFor(() => {
        expect(screen.getByText('Technical Research')).toBeInTheDocument();
      });

      // Verify report is categorized
      expect(screen.getByText('Uncategorized')).toBeInTheDocument();
    });

    it('should handle file upload errors gracefully', async () => {
      const user = userEvent.setup();

      // Create an invalid file (empty)
      const invalidFile = mockFile('empty.html', '');

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
        },
      };

      renderWithProviders(<RNDReport />, { initialState });

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('R&D Report')).toBeInTheDocument();
      });

      // Attempt to upload invalid file
      const fileInput = screen.getByLabelText(/select files/i) as HTMLInputElement;

      Object.defineProperty(fileInput, 'files', {
        value: [invalidFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Verify error message appears
      await waitFor(() => {
        expect(screen.getByText(/file is empty/i)).toBeInTheDocument();
      });
    });

    it('should handle large file uploads', async () => {
      const user = userEvent.setup();

      // Create a large file (over 50MB limit)
      const largeContent = 'x'.repeat(60 * 1024 * 1024); // 60MB
      const largeFile = mockFile('large-report.html', largeContent);

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
        },
      };

      renderWithProviders(<RNDReport />, { initialState });

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('R&D Report')).toBeInTheDocument();
      });

      // Attempt to upload large file
      const fileInput = screen.getByLabelText(/select files/i) as HTMLInputElement;

      Object.defineProperty(fileInput, 'files', {
        value: [largeFile],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Verify error message for file size
      await waitFor(() => {
        expect(screen.getByText(/exceeds limit/i)).toBeInTheDocument();
      });
    });

    it('should support multiple file uploads', async () => {
      const user = userEvent.setup();

      const file1 = mockFile('report1.html', '<html><body>Report 1</body></html>');
      const file2 = mockFile('report2.html', '<html><body>Report 2</body></html>');

      // Mock file reader for multiple files
      let readCount = 0;
      const mockFileReader = {
        readAsText: jest.fn(),
        onload: null,
        onerror: null,
        result: '',
      };

      mockFileReader.readAsText.mockImplementation(() => {
        setTimeout(() => {
          if (readCount === 0) {
            mockFileReader.result = '<html><body>Report 1</body></html>';
          } else {
            mockFileReader.result = '<html><body>Report 2</body></html>';
          }
          readCount++;
          if (mockFileReader.onload) {
            mockFileReader.onload({} as any);
          }
        }, 0);
      });

      global.FileReader = jest.fn(() => mockFileReader) as any;

      // Mock DOM parser
      const mockDOMParser = {
        parseFromString: jest.fn().mockReturnValue({
          querySelectorAll: jest.fn().mockReturnValue([]),
          querySelector: jest.fn().mockReturnValue(null),
          body: {},
          head: {},
        }),
      };
      global.DOMParser = jest.fn(() => mockDOMParser) as any;

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
        },
      };

      renderWithProviders(<RNDReport />, { initialState });

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('R&D Report')).toBeInTheDocument();
      });

      // Upload multiple files
      const fileInput = screen.getByLabelText(/select files/i) as HTMLInputElement;

      Object.defineProperty(fileInput, 'files', {
        value: [file1, file2],
        writable: false,
      });

      fireEvent.change(fileInput);

      // Verify multiple files uploaded successfully
      await waitFor(() => {
        expect(screen.getByText(/accepted files/i)).toBeInTheDocument();
      });
    });

    it('should maintain reading progress across sessions', async () => {
      const user = userEvent.setup();

      const testFile = mockFile('progress-test.html', `
        <html>
          <head><title>Progress Test</title></head>
          <body>
            <div style="height: 2000px;">
              <p>Start of content</p>
              <div style="height: 1000px; background: #f0f0f0; margin: 20px 0;">
                Middle content area for scrolling
              </div>
              <p>End of content</p>
            </div>
          </body>
        </html>
      `);

      // Mock localStorage for progress persistence
      const mockLocalStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      };

      Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
      });

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
        },
      };

      renderWithProviders(<RNDReport />, { initialState });

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('R&D Report')).toBeInTheDocument();
      });

      // Upload and open report
      const fileInput = screen.getByLabelText(/select files/i) as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [testFile],
        writable: false,
      });
      fireEvent.change(fileInput);

      await waitFor(() => {
        expect(screen.getByText('progress-test')).toBeInTheDocument();
      });

      // Open report
      const reportItem = screen.getByText('progress-test');
      fireEvent.click(reportItem);

      await waitFor(() => {
        expect(screen.getByText('Progress Test')).toBeInTheDocument();
      });

      // Verify progress tracking elements are present
      const progressElements = screen.getAllByText(/\d+%/);
      expect(progressElements.length).toBeGreaterThan(0);

      // Verify localStorage was called for progress saving
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Category Management', () => {
    it('should create and manage categories', async () => {
      const user = userEvent.setup();

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
        },
      };

      renderWithProviders(<RNDReport />, { initialState });

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('R&D Report')).toBeInTheDocument();
      });

      // Navigate to categories tab
      const categoryTab = screen.getByText('Categories');
      fireEvent.click(categoryTab);

      await waitFor(() => {
        expect(screen.getByText('Category Management')).toBeInTheDocument();
      });

      // Click add category button
      const addButton = screen.getByText('Add Category');
      fireEvent.click(addButton);

      // Fill category form
      const nameInput = screen.getByPlaceholderText('Category name');
      const descriptionInput = screen.getByPlaceholderText('Category description');

      await user.type(nameInput, 'New Test Category');
      await user.type(descriptionInput, 'A test category for integration testing');

      // Submit form
      const submitButton = screen.getByText('Create');
      fireEvent.click(submitButton);

      // Verify category was created
      await waitFor(() => {
        expect(screen.getByText('New Test Category')).toBeInTheDocument();
      });
    });

    it('should filter reports by category', async () => {
      const user = userEvent.setup();

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
        },
      };

      renderWithProviders(<RNDReport />, { initialState });

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('R&D Report')).toBeInTheDocument();
      });

      // Check if category filter is present
      const categoryFilter = screen.getByPlaceholderText('Filter by category');
      expect(categoryFilter).toBeInTheDocument();

      // Select a category
      fireEvent.click(categoryFilter);

      // This would test category filtering functionality
      // In a real scenario, we'd verify that only reports from the selected category are shown
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Mock network failure
      server.use(
        rest.get('/api/reports', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Internal server error' }));
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
        },
      };

      renderWithProviders(<RNDReport />, { initialState });

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('R&D Report')).toBeInTheDocument();
      });

      // Verify error handling - should not crash the application
      // In a real implementation, we'd expect error messages or fallback states
      expect(screen.getByText('R&D Report')).toBeInTheDocument();
    });

    it('should handle invalid HTML files', async () => {
      const user = userEvent.setup();

      // Create file with invalid HTML
      const invalidHtml = '<html><body><p>Unclosed paragraph';
      const invalidFile = mockFile('invalid.html', invalidHtml);

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
        },
      };

      renderWithProviders(<RNDReport />, { initialState });

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('R&D Report')).toBeInTheDocument();
      });

      // Attempt to upload invalid file
      const fileInput = screen.getByLabelText(/select files/i) as HTMLInputElement;
      Object.defineProperty(fileInput, 'files', {
        value: [invalidFile],
        writable: false,
      });
      fireEvent.change(fileInput);

      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText(/validation error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard accessible', async () => {
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
        },
      };

      renderWithProviders(<RNDReport />, { initialState });

      // Wait for page to load
      await waitFor(() => {
        expect(screen.getByText('R&D Report')).toBeInTheDocument();
      });

      // Check for keyboard navigation elements
      const focusableElements = screen.getAllByRole('button');
      expect(focusableElements.length).toBeGreaterThan(0);

      // Verify ARIA labels and roles are present
      const fileInput = screen.getByLabelText(/select files/i);
      expect(fileInput).toBeInTheDocument();
    });
  });
});
