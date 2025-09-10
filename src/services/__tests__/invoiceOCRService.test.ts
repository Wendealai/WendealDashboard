import { InvoiceOCRService, invoiceOCRService } from '../invoiceOCRService';
import { api } from '../api';
import type {
  InvoiceOCRWorkflow,
  InvoiceOCRResult,
  InvoiceOCRBatchTask,
  InvoiceOCRExecution,
  CreateInvoiceOCRWorkflowRequest,
  UpdateInvoiceOCRWorkflowRequest,
  InvoiceOCRUploadRequest,
  InvoiceOCRStatus,
  InvoiceOCROutputFormat,
} from '../../pages/InformationDashboard/types/invoiceOCR';
import { DEFAULT_INVOICE_OCR_SETTINGS } from '../../pages/InformationDashboard/types/invoiceOCR';

// Mock API
jest.mock('../api');
const mockApi = api as jest.Mocked<typeof api>;

// Mock window.URL.createObjectURL
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: jest.fn(() => 'mock-blob-url'),
    revokeObjectURL: jest.fn(),
  },
});

// Mock FormData
global.FormData = jest.fn(() => ({
  append: jest.fn(),
})) as any;

// Mock File
global.File = jest.fn((chunks, filename, options) => ({
  name: filename,
  size: chunks.reduce((acc: number, chunk: any) => acc + chunk.length, 0),
  type: options?.type || 'application/octet-stream',
})) as any;

// Mock Blob
global.Blob = jest.fn((chunks, options) => ({
  size: chunks.reduce((acc: number, chunk: any) => acc + chunk.length, 0),
  type: options?.type || 'application/octet-stream',
})) as any;

describe('InvoiceOCRService', () => {
  let service: InvoiceOCRService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new InvoiceOCRService();
  });

  describe('工作流管理', () => {
    describe('createWorkflow', () => {
      it('应该成功创建 Invoice OCR 工作流', async () => {
        const request: CreateInvoiceOCRWorkflowRequest = {
          name: 'Test Invoice OCR',
          description: 'Test workflow for invoice processing',
          settings: {
            language: 'zh-CN',
            outputFormat: 'json',
            extractTables: true,
            extractLineItems: true,
            validateData: true,
          },
        };

        const mockWorkflow: InvoiceOCRWorkflow = {
          id: 'workflow-1',
          name: 'Test Invoice OCR',
          description: 'Test workflow for invoice processing',
          type: 'invoice-ocr',
          status: 'active',
          enabled: true,
          settings: {
            ...DEFAULT_INVOICE_OCR_SETTINGS,
            ...request.settings,
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

        const mockResponse = {
          data: {
            success: true,
            data: mockWorkflow,
          },
        };

        mockApi.post.mockResolvedValue(mockResponse);

        const result = await service.createWorkflow(request);

        expect(mockApi.post).toHaveBeenCalledWith('/invoice-ocr', {
          ...request,
          settings: {
            ...DEFAULT_INVOICE_OCR_SETTINGS,
            ...request.settings,
          },
        });
        expect(result).toEqual(mockWorkflow);
      });

      it('应该处理创建工作流失败的情况', async () => {
        const request: CreateInvoiceOCRWorkflowRequest = {
          name: 'Test Invoice OCR',
          description: 'Test workflow',
        };

        const mockError = new Error('创建工作流失败');
        mockApi.post.mockRejectedValue(mockError);

        await expect(service.createWorkflow(request)).rejects.toThrow(
          '创建工作流失败'
        );
      });
    });

    describe('updateWorkflow', () => {
      it('应该成功更新 Invoice OCR 工作流', async () => {
        const workflowId = 'workflow-1';
        const request: UpdateInvoiceOCRWorkflowRequest = {
          name: 'Updated Invoice OCR',
          settings: {
            language: 'en-US',
            outputFormat: 'csv',
          },
        };

        const mockWorkflow: InvoiceOCRWorkflow = {
          id: workflowId,
          name: 'Updated Invoice OCR',
          description: 'Test workflow',
          type: 'invoice-ocr',
          status: 'active',
          enabled: true,
          settings: {
            ...DEFAULT_INVOICE_OCR_SETTINGS,
            ...request.settings,
          },
          statistics: {
            totalProcessed: 5,
            successCount: 4,
            failureCount: 1,
            averageProcessingTime: 2500,
            lastProcessedAt: '2024-01-01T12:00:00Z',
          },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T12:00:00Z',
          createdBy: 'user-1',
        };

        const mockResponse = {
          data: {
            success: true,
            data: mockWorkflow,
          },
        };

        mockApi.put.mockResolvedValue(mockResponse);

        const result = await service.updateWorkflow(workflowId, request);

        expect(mockApi.put).toHaveBeenCalledWith(
          `/invoice-ocr/${workflowId}`,
          request
        );
        expect(result).toEqual(mockWorkflow);
      });
    });

    describe('getWorkflow', () => {
      it('应该成功获取工作流详情', async () => {
        const workflowId = 'workflow-1';
        const mockWorkflow: InvoiceOCRWorkflow = {
          id: workflowId,
          name: 'Test Invoice OCR',
          description: 'Test workflow',
          type: 'invoice-ocr',
          status: 'active',
          enabled: true,
          settings: DEFAULT_INVOICE_OCR_SETTINGS,
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

        const mockResponse = {
          data: {
            success: true,
            data: mockWorkflow,
          },
        };

        mockApi.get.mockResolvedValue(mockResponse);

        const result = await service.getWorkflow(workflowId);

        expect(mockApi.get).toHaveBeenCalledWith(
          `/invoice-ocr/${workflowId}`
        );
        expect(result).toEqual(mockWorkflow);
      });
    });

    describe('deleteWorkflow', () => {
      it('应该成功删除工作流', async () => {
        const workflowId = 'workflow-1';
        const mockResponse = {
          data: {
            success: true,
          },
        };

        mockApi.delete.mockResolvedValue(mockResponse);

        await service.deleteWorkflow(workflowId);

        expect(mockApi.delete).toHaveBeenCalledWith(
          `/invoice-ocr/${workflowId}`
        );
      });
    });

    describe('toggleWorkflow', () => {
      it('应该成功切换工作流状态', async () => {
        const workflowId = 'workflow-1';
        const enabled = false;
        const mockWorkflow: InvoiceOCRWorkflow = {
          id: workflowId,
          name: 'Test Invoice OCR',
          description: 'Test workflow',
          type: 'invoice-ocr',
          status: 'inactive',
          enabled: false,
          settings: DEFAULT_INVOICE_OCR_SETTINGS,
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

        const mockResponse = {
          data: {
            success: true,
            data: mockWorkflow,
          },
        };

        mockApi.patch.mockResolvedValue(mockResponse);

        const result = await service.toggleWorkflow(workflowId, enabled);

        expect(mockApi.patch).toHaveBeenCalledWith(
          `/invoice-ocr/${workflowId}/toggle`,
          { enabled }
        );
        expect(result).toEqual(mockWorkflow);
      });
    });
  });

  describe('文件处理', () => {
    describe('uploadFiles', () => {
      it('应该成功上传文件进行批处理', async () => {
        const mockFiles = [
          new File(['file1 content'], 'invoice1.pdf', {
            type: 'application/pdf',
          }),
          new File(['file2 content'], 'invoice2.pdf', {
            type: 'application/pdf',
          }),
        ];

        const request: InvoiceOCRUploadRequest = {
          workflowId: 'workflow-1',
          files: mockFiles,
          batchName: 'test-batch',
          processingOptions: {
            language: 'zh-CN',
            outputFormat: 'json',
          },
        };

        const mockBatchTask: InvoiceOCRBatchTask = {
          id: 'batch-1',
          workflowId: 'workflow-1',
          name: 'test-batch',
          status: 'processing',
          totalFiles: 2,
          processedFiles: 0,
          successCount: 0,
          failureCount: 0,
          progress: 0,
          results: [],
          errors: [],
          createdAt: '2024-01-01T00:00:00Z',
          startedAt: '2024-01-01T00:00:00Z',
          completedAt: null,
          estimatedCompletionTime: null,
        };

        const mockResponse = {
          data: {
            success: true,
            data: mockBatchTask,
          },
        };

        mockApi.post.mockResolvedValue(mockResponse);

        const result = await service.uploadFiles(request);

        expect(mockApi.post).toHaveBeenCalledWith(
          `/invoice-ocr/${request.workflowId}/upload`,
          expect.any(FormData),
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            timeout: 60000,
          }
        );
        expect(result).toEqual(mockBatchTask);
      });
    });

    describe('uploadSingleFile', () => {
      it('应该成功上传单个文件进行处理', async () => {
        const workflowId = 'workflow-1';
        const mockFile = new File(['file content'], 'invoice.pdf', {
          type: 'application/pdf',
        });
        const options = {
          language: 'zh-CN' as const,
          outputFormat: 'json' as const,
        };

        const mockResult: InvoiceOCRResult = {
          id: 'result-1',
          workflowId,
          batchId: null,
          fileName: 'invoice.pdf',
          fileSize: 12,
          fileType: 'pdf',
          status: 'completed',
          processingTime: 2500,
          extractedData: {
            invoiceNumber: 'INV-001',
            date: '2024-01-01',
            dueDate: '2024-01-31',
            vendor: {
              name: 'Test Vendor',
              address: 'Test Address',
              taxId: '123456789',
            },
            customer: {
              name: 'Test Customer',
              address: 'Customer Address',
              taxId: '987654321',
            },
            totalAmount: 1000,
            taxAmount: 100,
            currency: 'CNY',
            lineItems: [],
            paymentTerms: '30 days',
            notes: '',
          },
          confidence: 0.95,
          errors: [],
          warnings: [],
          createdAt: '2024-01-01T00:00:00Z',
          completedAt: '2024-01-01T00:02:30Z',
        };

        const mockResponse = {
          data: {
            success: true,
            data: mockResult,
          },
        };

        mockApi.post.mockResolvedValue(mockResponse);

        const result = await service.uploadSingleFile(
          workflowId,
          mockFile,
          options
        );

        expect(mockApi.post).toHaveBeenCalledWith(
          `/invoice-ocr/${workflowId}/upload-single`,
          expect.any(FormData),
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
            timeout: 60000,
          }
        );
        expect(result).toEqual(mockResult);
      });
    });
  });

  describe('结果管理', () => {
    describe('getResult', () => {
      it('应该成功获取处理结果', async () => {
        const workflowId = 'workflow-1';
        const resultId = 'result-1';
        const mockResult: InvoiceOCRResult = {
          id: resultId,
          workflowId,
          batchId: 'batch-1',
          fileName: 'invoice.pdf',
          fileSize: 1024,
          fileType: 'pdf',
          status: 'completed',
          processingTime: 2500,
          extractedData: {
            invoiceNumber: 'INV-001',
            date: '2024-01-01',
            dueDate: '2024-01-31',
            vendor: {
              name: 'Test Vendor',
              address: 'Test Address',
              taxId: '123456789',
            },
            customer: {
              name: 'Test Customer',
              address: 'Customer Address',
              taxId: '987654321',
            },
            totalAmount: 1000,
            taxAmount: 100,
            currency: 'CNY',
            lineItems: [],
            paymentTerms: '30 days',
            notes: '',
          },
          confidence: 0.95,
          errors: [],
          warnings: [],
          createdAt: '2024-01-01T00:00:00Z',
          completedAt: '2024-01-01T00:02:30Z',
        };

        const mockResponse = {
          data: {
            success: true,
            data: mockResult,
          },
        };

        mockApi.get.mockResolvedValue(mockResponse);

        const result = await service.getResult(workflowId, resultId);

        expect(mockApi.get).toHaveBeenCalledWith(
          `/invoice-ocr/${workflowId}/results/${resultId}`
        );
        expect(result).toEqual(mockResult);
      });
    });

    describe('deleteResult', () => {
      it('应该成功删除处理结果', async () => {
        const workflowId = 'workflow-1';
        const resultId = 'result-1';
        const mockResponse = {
          data: {
            success: true,
          },
        };

        mockApi.delete.mockResolvedValue(mockResponse);

        await service.deleteResult(workflowId, resultId);

        expect(mockApi.delete).toHaveBeenCalledWith(
          `/invoice-ocr/${workflowId}/results/${resultId}`
        );
      });
    });

    describe('deleteResults', () => {
      it('应该成功批量删除处理结果', async () => {
        const workflowId = 'workflow-1';
        const resultIds = ['result-1', 'result-2', 'result-3'];
        const mockResponse = {
          data: {
            success: true,
          },
        };

        mockApi.delete.mockResolvedValue(mockResponse);

        await service.deleteResults(workflowId, resultIds);

        expect(mockApi.delete).toHaveBeenCalledWith(
          `/invoice-ocr/${workflowId}/results/batch`,
          {
            data: { resultIds },
          }
        );
      });
    });
  });

  describe('批处理任务管理', () => {
    describe('getBatchTask', () => {
      it('应该成功获取批处理任务状态', async () => {
        const workflowId = 'workflow-1';
        const batchId = 'batch-1';
        const mockBatchTask: InvoiceOCRBatchTask = {
          id: batchId,
          workflowId,
          name: 'test-batch',
          status: 'completed',
          totalFiles: 3,
          processedFiles: 3,
          successCount: 2,
          failureCount: 1,
          progress: 100,
          results: ['result-1', 'result-2'],
          errors: ['Error processing file 3'],
          createdAt: '2024-01-01T00:00:00Z',
          startedAt: '2024-01-01T00:00:00Z',
          completedAt: '2024-01-01T00:05:00Z',
          estimatedCompletionTime: null,
        };

        const mockResponse = {
          data: {
            success: true,
            data: mockBatchTask,
          },
        };

        mockApi.get.mockResolvedValue(mockResponse);

        const result = await service.getBatchTask(workflowId, batchId);

        expect(mockApi.get).toHaveBeenCalledWith(
          `/invoice-ocr/${workflowId}/batches/${batchId}`
        );
        expect(result).toEqual(mockBatchTask);
      });
    });

    describe('cancelBatchTask', () => {
      it('应该成功取消批处理任务', async () => {
        const workflowId = 'workflow-1';
        const batchId = 'batch-1';
        const mockResponse = {
          data: {
            success: true,
          },
        };

        mockApi.post.mockResolvedValue(mockResponse);

        await service.cancelBatchTask(workflowId, batchId);

        expect(mockApi.post).toHaveBeenCalledWith(
          `/invoice-ocr/${workflowId}/batches/${batchId}/cancel`
        );
      });
    });

    describe('retryBatchTask', () => {
      it('应该成功重试批处理任务', async () => {
        const workflowId = 'workflow-1';
        const batchId = 'batch-1';
        const mockBatchTask: InvoiceOCRBatchTask = {
          id: batchId,
          workflowId,
          name: 'test-batch-retry',
          status: 'processing',
          totalFiles: 3,
          processedFiles: 0,
          successCount: 0,
          failureCount: 0,
          progress: 0,
          results: [],
          errors: [],
          createdAt: '2024-01-01T00:00:00Z',
          startedAt: '2024-01-01T01:00:00Z',
          completedAt: null,
          estimatedCompletionTime: '2024-01-01T01:05:00Z',
        };

        const mockResponse = {
          data: {
            success: true,
            data: mockBatchTask,
          },
        };

        mockApi.post.mockResolvedValue(mockResponse);

        const result = await service.retryBatchTask(workflowId, batchId);

        expect(mockApi.post).toHaveBeenCalledWith(
          `/invoice-ocr/${workflowId}/batches/${batchId}/retry`
        );
        expect(result).toEqual(mockBatchTask);
      });
    });
  });

  describe('文件下载', () => {
    describe('downloadResult', () => {
      it('应该成功下载处理结果文件', async () => {
        const workflowId = 'workflow-1';
        const resultId = 'result-1';
        const format: InvoiceOCROutputFormat = 'json';
        const mockBlob = new Blob(['mock file content']);

        const mockResponse = {
          data: mockBlob,
        };

        mockApi.get.mockResolvedValue(mockResponse);

        const result = await service.downloadResult(
          workflowId,
          resultId,
          format
        );

        expect(mockApi.get).toHaveBeenCalledWith(
          `/invoice-ocr/${workflowId}/results/${resultId}/download`,
          {
            params: { format },
            responseType: 'blob',
          }
        );
        expect(result).toBe('mock-blob-url');
        expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      });
    });

    describe('downloadResults', () => {
      it('应该成功批量下载结果文件', async () => {
        const workflowId = 'workflow-1';
        const resultIds = ['result-1', 'result-2'];
        const format: InvoiceOCROutputFormat = 'csv';
        const mockBlob = new Blob(['mock zip content']);

        const mockResponse = {
          data: mockBlob,
        };

        mockApi.post.mockResolvedValue(mockResponse);

        const result = await service.downloadResults(
          workflowId,
          resultIds,
          format
        );

        expect(mockApi.post).toHaveBeenCalledWith(
          `/invoice-ocr/${workflowId}/results/download-batch`,
          {
            resultIds,
            format,
          },
          {
            responseType: 'blob',
          }
        );
        expect(result).toBe('mock-blob-url');
        expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      });
    });
  });

  describe('工具方法', () => {
    describe('validateFileType', () => {
      it('应该验证支持的文件类型', () => {
        const pdfFile = new File(['content'], 'test.pdf', {
          type: 'application/pdf',
        });
        const jpgFile = new File(['content'], 'test.jpg', {
          type: 'image/jpeg',
        });
        const pngFile = new File(['content'], 'test.png', {
          type: 'image/png',
        });
        const txtFile = new File(['content'], 'test.txt', {
          type: 'text/plain',
        });

        expect(service.validateFileType(pdfFile)).toBe(true);
        expect(service.validateFileType(jpgFile)).toBe(true);
        expect(service.validateFileType(pngFile)).toBe(true);
        expect(service.validateFileType(txtFile)).toBe(false);
      });
    });

    describe('validateFileSize', () => {
      it('应该验证文件大小限制', () => {
        const smallFile = new File(['small content'], 'small.pdf', {
          type: 'application/pdf',
        });
        const largeFile = new File(
          [new Array(11 * 1024 * 1024).fill('x').join('')],
          'large.pdf',
          {
            type: 'application/pdf',
          }
        );

        expect(service.validateFileSize(smallFile, 10)).toBe(true);
        expect(service.validateFileSize(largeFile, 10)).toBe(false);
      });
    });

    describe('formatFileSize', () => {
      it('应该正确格式化文件大小', () => {
        expect(service.formatFileSize(0)).toBe('0 Bytes');
        expect(service.formatFileSize(1024)).toBe('1 KB');
        expect(service.formatFileSize(1024 * 1024)).toBe('1 MB');
        expect(service.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
        expect(service.formatFileSize(1536)).toBe('1.5 KB');
      });
    });

    describe('generateBatchName', () => {
      it('应该生成唯一的批处理名称', () => {
        const name1 = service.generateBatchName('test');
        const name2 = service.generateBatchName('test');

        expect(name1).toMatch(
          /^test-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-z0-9]{6}$/
        );
        expect(name2).toMatch(
          /^test-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-z0-9]{6}$/
        );
        expect(name1).not.toBe(name2);
      });

      it('应该使用默认前缀', () => {
        const name = service.generateBatchName();
        expect(name).toMatch(
          /^batch-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z-[a-z0-9]{6}$/
        );
      });
    });
  });

  describe('错误处理', () => {
    it('应该正确处理网络错误', async () => {
      const networkError = new Error('Network Error');
      mockApi.get.mockRejectedValue(networkError);

      await expect(service.getWorkflow('workflow-1')).rejects.toThrow(
        'Network Error'
      );
    });

    it('应该正确处理 API 错误响应', async () => {
      const apiError = {
        response: {
          data: {
            success: false,
            message: 'Workflow not found',
          },
        },
      };
      mockApi.get.mockRejectedValue(apiError);

      await expect(service.getWorkflow('non-existent')).rejects.toThrow(
        '获取 Invoice OCR 工作流失败'
      );
    });
  });

  describe('服务实例', () => {
    it('应该导出默认服务实例', () => {
      expect(invoiceOCRService).toBeInstanceOf(InvoiceOCRService);
    });
  });
});
