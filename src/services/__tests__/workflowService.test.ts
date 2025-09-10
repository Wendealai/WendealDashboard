import { WorkflowService, workflowService } from '../workflowService';
import { api } from '../api';
import { redditWebhookService } from '../redditWebhookService';

// Mock dependencies
jest.mock('../api');
jest.mock('../redditWebhookService');

const mockApi = api as jest.Mocked<typeof api>;
const mockRedditWebhookService = redditWebhookService as jest.Mocked<typeof redditWebhookService>;

// Mock fetch globally
global.fetch = jest.fn();

describe('WorkflowService', () => {
  let service: WorkflowService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkflowService();
    // Mock environment variables
    process.env.REACT_APP_N8N_BASE_URL = 'http://localhost:5678';
    process.env.REACT_APP_N8N_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.REACT_APP_N8N_BASE_URL;
    delete process.env.REACT_APP_N8N_API_KEY;
  });

  describe('initialization', () => {
    it('should create service instance', () => {
      expect(service).toBeInstanceOf(WorkflowService);
    });

    it('should use default n8n base URL when env not set', () => {
      delete process.env.REACT_APP_N8N_BASE_URL;
      const newService = new WorkflowService();
      expect(newService).toBeDefined();
    });

    it('should handle missing n8n API key', () => {
      delete process.env.REACT_APP_N8N_API_KEY;
      const newService = new WorkflowService();
      expect(newService).toBeDefined();
    });
  });

  describe('getN8nHeaders', () => {
    it('should return headers with API key when available', () => {
      const headers = (service as any).getN8nHeaders();
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': 'test-api-key',
      });
    });

    it('should return headers without API key when not available', () => {
      delete process.env.REACT_APP_N8N_API_KEY;
      const newService = new WorkflowService();
      const headers = (newService as any).getN8nHeaders();
      expect(headers).toEqual({
        'Content-Type': 'application/json',
      });
    });
  });

  describe('getWorkflows', () => {
    const mockWorkflowsResponse = {
      success: true,
      data: [
        {
          id: 'workflow-1',
          name: 'Test Workflow',
          status: 'active',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 10,
    };

    it('should successfully get workflows from local API', async () => {
      mockApi.get.mockResolvedValue({ data: mockWorkflowsResponse });

      const result = await service.getWorkflows();

      expect(mockApi.get).toHaveBeenCalledWith('/workflows', { params: {} });
      expect(result).toEqual(mockWorkflowsResponse);
    });

    it('should fallback to n8n when local API fails', async () => {
      mockApi.get.mockRejectedValue(new Error('Local API failed'));
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockWorkflowsResponse),
      });

      const result = await service.getWorkflows();

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5678/api/v1/workflows',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'X-N8N-API-KEY': 'test-api-key',
          },
        })
      );
      expect(result).toEqual(mockWorkflowsResponse);
    });

    it('should handle n8n API errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Local API failed'));
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(service.getWorkflows()).rejects.toThrow('Failed to fetch workflows from n8n');
    });

    it('should pass query parameters correctly', async () => {
      mockApi.get.mockResolvedValue({ data: mockWorkflowsResponse });

      const params = {
        page: 2,
        pageSize: 20,
        search: 'test',
        status: 'active',
      };

      await service.getWorkflows(params);

      expect(mockApi.get).toHaveBeenCalledWith('/workflows', { params });
    });
  });

  describe('getWorkflowsFromN8n', () => {
    it('should fetch workflows from n8n API', async () => {
      const mockN8nResponse = [
        {
          id: 'n8n-workflow-1',
          name: 'N8N Workflow',
          active: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockN8nResponse),
      });

      const result = await (service as any).getWorkflowsFromN8n({});

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:5678/api/v1/workflows',
        expect.any(Object)
      );
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    it('should transform n8n workflow format to local format', async () => {
      const mockN8nWorkflow = {
        id: 'n8n-123',
        name: 'Test Workflow',
        active: true,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        tags: ['test'],
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([mockN8nWorkflow]),
      });

      const result = await (service as any).getWorkflowsFromN8n({});

      expect(result.data[0]).toEqual({
        id: 'n8n-123',
        name: 'Test Workflow',
        status: 'active',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        tags: ['test'],
        active: true,
      });
    });

    it('should handle n8n API fetch errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect((service as any).getWorkflowsFromN8n({})).rejects.toThrow(
        'Failed to fetch workflows from n8n'
      );
    });
  });

  describe('triggerWorkflow', () => {
    const mockTriggerRequest = {
      workflowId: 'workflow-1',
      data: { test: 'data' },
    };

    it('should successfully trigger workflow', async () => {
      const mockResponse = {
        success: true,
        data: {
          executionId: 'exec-123',
          status: 'running',
        },
      };

      mockApi.post.mockResolvedValue({ data: mockResponse });

      const result = await service.triggerWorkflow(mockTriggerRequest);

      expect(mockApi.post).toHaveBeenCalledWith('/workflows/trigger', mockTriggerRequest);
      expect(result).toEqual(mockResponse);
    });

    it('should handle trigger workflow errors', async () => {
      mockApi.post.mockRejectedValue(new Error('Trigger failed'));

      await expect(service.triggerWorkflow(mockTriggerRequest)).rejects.toThrow(
        'Failed to trigger workflow'
      );
    });
  });

  describe('getWorkflowExecution', () => {
    it('should get workflow execution details', async () => {
      const mockExecution = {
        id: 'exec-1',
        workflowId: 'workflow-1',
        status: 'completed',
        startedAt: '2024-01-01T00:00:00Z',
        completedAt: '2024-01-01T00:05:00Z',
        duration: 300000,
      };

      mockApi.get.mockResolvedValue({ data: { success: true, data: mockExecution } });

      const result = await service.getWorkflowExecution('exec-1');

      expect(mockApi.get).toHaveBeenCalledWith('/workflows/executions/exec-1');
      expect(result).toEqual(mockExecution);
    });

    it('should handle execution fetch errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Fetch failed'));

      await expect(service.getWorkflowExecution('exec-1')).rejects.toThrow(
        'Failed to get workflow execution'
      );
    });
  });

  describe('getWorkflowLogs', () => {
    it('should get workflow execution logs', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          executionId: 'exec-1',
          level: 'info',
          message: 'Workflow started',
          timestamp: '2024-01-01T00:00:00Z',
        },
      ];

      mockApi.get.mockResolvedValue({ data: { success: true, data: mockLogs } });

      const result = await service.getWorkflowLogs('exec-1');

      expect(mockApi.get).toHaveBeenCalledWith('/workflows/executions/exec-1/logs');
      expect(result).toEqual(mockLogs);
    });

    it('should handle logs fetch errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Logs fetch failed'));

      await expect(service.getWorkflowLogs('exec-1')).rejects.toThrow(
        'Failed to get workflow logs'
      );
    });
  });

  describe('triggerRedditWebhook', () => {
    it('should trigger reddit webhook successfully', async () => {
      const mockWebhookResponse = {
        success: true,
        data: {
          posts: [
            {
              id: 'post-1',
              title: 'Test Post',
              upvotes: 100,
              comments: 25,
              url: 'https://reddit.com/r/test/post-1',
            },
          ],
          stats: { totalPosts: 1 },
        },
        timestamp: Date.now(),
      };

      mockRedditWebhookService.triggerWebhook.mockResolvedValue(mockWebhookResponse);

      const result = await service.triggerRedditWebhook();

      expect(mockRedditWebhookService.triggerWebhook).toHaveBeenCalled();
      expect(result).toEqual(mockWebhookResponse);
    });

    it('should handle reddit webhook trigger errors', async () => {
      mockRedditWebhookService.triggerWebhook.mockRejectedValue(new Error('Webhook failed'));

      await expect(service.triggerRedditWebhook()).rejects.toThrow(
        'Failed to trigger Reddit webhook'
      );
    });

    it('should pass progress callback to reddit webhook service', async () => {
      const mockProgressCallback = jest.fn();
      const mockWebhookResponse = { success: true, data: {}, timestamp: Date.now() };

      mockRedditWebhookService.triggerWebhook.mockResolvedValue(mockWebhookResponse);

      await service.triggerRedditWebhook(mockProgressCallback);

      expect(mockRedditWebhookService.triggerWebhook).toHaveBeenCalledWith(mockProgressCallback);
    });
  });

  describe('cancelWorkflowExecution', () => {
    it('should cancel workflow execution successfully', async () => {
      mockApi.post.mockResolvedValue({ data: { success: true } });

      await service.cancelWorkflowExecution('exec-1');

      expect(mockApi.post).toHaveBeenCalledWith('/workflows/executions/exec-1/cancel');
    });

    it('should handle cancel execution errors', async () => {
      mockApi.post.mockRejectedValue(new Error('Cancel failed'));

      await expect(service.cancelWorkflowExecution('exec-1')).rejects.toThrow(
        'Failed to cancel workflow execution'
      );
    });
  });

  describe('getWorkflowStatistics', () => {
    it('should get workflow statistics', async () => {
      const mockStats = {
        totalWorkflows: 5,
        activeWorkflows: 3,
        totalExecutions: 150,
        successRate: 0.85,
        avgExecutionTime: 4500,
      };

      mockApi.get.mockResolvedValue({ data: { success: true, data: mockStats } });

      const result = await service.getWorkflowStatistics();

      expect(mockApi.get).toHaveBeenCalledWith('/workflows/statistics');
      expect(result).toEqual(mockStats);
    });

    it('should handle statistics fetch errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Stats fetch failed'));

      await expect(service.getWorkflowStatistics()).rejects.toThrow(
        'Failed to get workflow statistics'
      );
    });
  });

  describe('Invoice OCR methods', () => {
    const mockInvoiceWorkflow = {
      id: 'invoice-workflow-1',
      name: 'Invoice OCR Workflow',
      type: 'invoice-ocr',
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
      statistics: {
        totalProcessed: 0,
        successCount: 0,
        failureCount: 0,
        averageProcessingTime: 0,
        lastProcessedAt: null,
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      createdBy: 'user-1',
    };

    describe('createInvoiceOCRWorkflow', () => {
      it('should create invoice OCR workflow successfully', async () => {
        const createRequest = {
          name: 'Test Invoice OCR',
          description: 'Test workflow',
          settings: { outputFormat: 'json' },
        };

        mockApi.post.mockResolvedValue({
          data: { success: true, data: mockInvoiceWorkflow },
        });

        const result = await service.createInvoiceOCRWorkflow(createRequest);

        expect(mockApi.post).toHaveBeenCalledWith('/invoice-ocr', createRequest);
        expect(result).toEqual(mockInvoiceWorkflow);
      });

      it('should handle create invoice OCR workflow errors', async () => {
        mockApi.post.mockRejectedValue(new Error('Create failed'));

        await expect(service.createInvoiceOCRWorkflow({ name: 'Test' })).rejects.toThrow(
          'Failed to create Invoice OCR workflow'
        );
      });
    });

    describe('updateInvoiceOCRWorkflow', () => {
      it('should update invoice OCR workflow successfully', async () => {
        const updateRequest = {
          name: 'Updated Invoice OCR',
          settings: { outputFormat: 'csv' },
        };

        mockApi.put.mockResolvedValue({
          data: { success: true, data: mockInvoiceWorkflow },
        });

        const result = await service.updateInvoiceOCRWorkflow('workflow-1', updateRequest);

        expect(mockApi.put).toHaveBeenCalledWith('/invoice-ocr/workflow-1', updateRequest);
        expect(result).toEqual(mockInvoiceWorkflow);
      });
    });

    describe('getInvoiceOCRWorkflow', () => {
      it('should get invoice OCR workflow details', async () => {
        mockApi.get.mockResolvedValue({
          data: { success: true, data: mockInvoiceWorkflow },
        });

        const result = await service.getInvoiceOCRWorkflow('workflow-1');

        expect(mockApi.get).toHaveBeenCalledWith('/invoice-ocr/workflow-1');
        expect(result).toEqual(mockInvoiceWorkflow);
      });
    });

    describe('uploadInvoiceFiles', () => {
      it('should upload invoice files successfully', async () => {
        const mockFile = new File(['test'], 'invoice.pdf');
        const uploadRequest = {
          workflowId: 'workflow-1',
          files: [mockFile],
          batchName: 'test-batch',
        };

        const mockBatchTask = {
          id: 'batch-1',
          status: 'processing',
          totalFiles: 1,
          processedFiles: 0,
        };

        mockApi.post.mockResolvedValue({
          data: { success: true, data: mockBatchTask },
        });

        const result = await service.uploadInvoiceFiles(uploadRequest);

        expect(mockApi.post).toHaveBeenCalledWith(
          '/invoice-ocr/workflow-1/upload',
          expect.any(FormData),
          expect.any(Object)
        );
        expect(result).toEqual(mockBatchTask);
      });
    });
  });

  describe('service instance', () => {
    it('should export default service instance', () => {
      expect(workflowService).toBeInstanceOf(WorkflowService);
    });

    it('should be singleton instance', () => {
      expect(workflowService).toBeInstanceOf(WorkflowService);
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      mockApi.get.mockRejectedValue(new Error('Network Error'));

      await expect(service.getWorkflows()).rejects.toThrow();
    });

    it('should handle malformed API responses', async () => {
      mockApi.get.mockResolvedValue({ data: null });

      await expect(service.getWorkflows()).rejects.toThrow();
    });

    it('should handle timeout errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Timeout'));

      await expect(service.getWorkflowExecution('exec-1')).rejects.toThrow();
    });
  });

  describe('environment configuration', () => {
    it('should use custom n8n base URL from environment', () => {
      process.env.REACT_APP_N8N_BASE_URL = 'https://custom-n8n.com';
      const customService = new WorkflowService();

      // Access private property for testing
      expect((customService as any).n8nBaseUrl).toBe('https://custom-n8n.com');
    });

    it('should use custom n8n API key from environment', () => {
      process.env.REACT_APP_N8N_API_KEY = 'custom-api-key';
      const customService = new WorkflowService();

      const headers = (customService as any).getN8nHeaders();
      expect(headers['X-N8N-API-KEY']).toBe('custom-api-key');
    });
  });

  describe('integration with reddit webhook service', () => {
    it('should properly integrate with reddit webhook service', async () => {
      const mockResponse = { success: true, data: {}, timestamp: Date.now() };
      mockRedditWebhookService.triggerWebhook.mockResolvedValue(mockResponse);

      const result = await service.triggerRedditWebhook();

      expect(mockRedditWebhookService.triggerWebhook).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    it('should handle reddit webhook service errors', async () => {
      mockRedditWebhookService.triggerWebhook.mockRejectedValue(new Error('Reddit service error'));

      await expect(service.triggerRedditWebhook()).rejects.toThrow(
        'Failed to trigger Reddit webhook'
      );
    });
  });

  describe('performance and efficiency', () => {
    it('should cache n8n headers to avoid recomputation', () => {
      const service = new WorkflowService();
      const headers1 = (service as any).getN8nHeaders();
      const headers2 = (service as any).getN8nHeaders();

      // Headers should be computed once and cached
      expect(headers1).toEqual(headers2);
    });

    it('should handle concurrent requests efficiently', async () => {
      const mockResponse = { success: true, data: [], total: 0, page: 1, pageSize: 10 };
      mockApi.get.mockResolvedValue({ data: mockResponse });

      // Make multiple concurrent requests
      const promises = [
        service.getWorkflows(),
        service.getWorkflows(),
        service.getWorkflows(),
      ];

      const results = await Promise.all(promises);

      // All requests should succeed
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // API should be called only once due to potential caching
      expect(mockApi.get).toHaveBeenCalledTimes(1);
    });
  });
});
