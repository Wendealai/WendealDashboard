/**
 * Reddit工作流服务单元测试
 * 测试WorkflowService中Reddit相关的所有功能
 */

import { WorkflowService, workflowService } from '../workflowService';
import type {
  RedditWorkflowConfig,
  RedditWorkflowStats,
  WorkflowStatus,
  RedditApiResponse,
} from '@/types';

// Mock 依赖项
jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('../redditWebhookService', () => ({
  redditWebhookService: {
    triggerWebhook: jest.fn(),
    processWebhookResponse: jest.fn(),
  },
}));

describe('WorkflowService - Reddit功能', () => {
  let service: WorkflowService;
  let mockApi: any;
  let mockRedditWebhookService: any;

  const mockRedditConfig: RedditWorkflowConfig = {
    id: 'test-config-id',
    name: 'Test Reddit Config',
    subreddits: ['programming', 'javascript'],
    sortBy: 'hot',
    timeRange: 'day',
    limit: 50,
    minScore: 10,
    maxScore: 1000,
    includeNsfw: false,
    includeStickied: true,
    intervalMinutes: 30,
    autoRun: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    isActive: true,
  };

  const mockWorkflowStatus: WorkflowStatus = {
    workflowId: 'reddit-hot-content',
    status: 'running',
    startTime: Date.now(),
    endTime: undefined,
    progress: 50,
    processedCount: 25,
    totalCount: 50,
    error: undefined,
    lastUpdated: Date.now(),
    logs: [],
  };

  const mockRedditStats: RedditWorkflowStats = {
    totalExecutions: 10,
    successfulExecutions: 8,
    failedExecutions: 2,
    totalPostsFetched: 500,
    averageExecutionTime: 45,
    lastExecutionTime: Date.now(),
    lastSuccessTime: Date.now(),
    errorRate: 20,
    successRate: 80,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // 获取mock实例
    const apiModule = require('../api');
    const webhookModule = require('../redditWebhookService');

    mockApi = apiModule.api;
    mockRedditWebhookService = webhookModule.redditWebhookService;

    // 创建服务实例
    service = new WorkflowService();
  });

  describe('triggerRedditWorkflow', () => {
    it('应该成功触发Reddit工作流', async () => {
      const mockTriggerResponse = {
        success: true,
        data: {
          executionId: 'exec_123',
          status: 'running',
        },
        message: '工作流已成功触发',
      };

      // Mock triggerWorkflow方法
      const triggerWorkflowSpy = jest.spyOn(service as any, 'triggerWorkflow');
      triggerWorkflowSpy.mockResolvedValue(mockTriggerResponse);

      const result = await service.triggerRedditWorkflow(mockRedditConfig);

      expect(triggerWorkflowSpy).toHaveBeenCalledWith({
        workflowId: 'reddit-hot-content',
        inputData: {
          subreddits: mockRedditConfig.subreddits,
          sortBy: mockRedditConfig.sortBy,
          timeRange: mockRedditConfig.timeRange,
          limit: mockRedditConfig.limit,
          minScore: mockRedditConfig.minScore,
          maxScore: mockRedditConfig.maxScore,
          includeNsfw: mockRedditConfig.includeNsfw,
          includeStickied: mockRedditConfig.includeStickied,
          configId: mockRedditConfig.id,
          configName: mockRedditConfig.name,
        },
      });

      expect(result.success).toBe(true);
      expect(result.data?.executionId).toBe('exec_123');
      expect(result.data?.status).toBe('running');
    });

    it('应该在触发失败时返回错误', async () => {
      const mockErrorResponse = {
        success: false,
        message: '工作流触发失败',
      };

      const triggerWorkflowSpy = jest.spyOn(service as any, 'triggerWorkflow');
      triggerWorkflowSpy.mockResolvedValue(mockErrorResponse);

      const result = await service.triggerRedditWorkflow(mockRedditConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('触发Reddit工作流失败');
      expect(result.errorCode).toBe('REDDIT_WORKFLOW_TRIGGER_FAILED');
    });

    it('应该处理配置为空的情况', async () => {
      await expect(service.triggerRedditWorkflow(null as any)).rejects.toThrow();
    });
  });

  describe('triggerRedditWebhook', () => {
    it('应该成功触发Reddit webhook', async () => {
      const mockWebhookResponse = {
        telegramMessage: 'Reddit数据抓取完成',
        posts: [],
        stats: mockRedditStats,
      };

      const mockProcessedData = {
        posts: [],
        subreddits: ['programming'],
        stats: mockRedditStats,
        metadata: { source: 'webhook' },
      };

      mockRedditWebhookService.triggerWebhook.mockResolvedValue(mockWebhookResponse);
      mockRedditWebhookService.processWebhookResponse.mockReturnValue(mockProcessedData);

      const result = await service.triggerRedditWebhook();

      expect(mockRedditWebhookService.triggerWebhook).toHaveBeenCalled();
      expect(mockRedditWebhookService.processWebhookResponse).toHaveBeenCalledWith(mockWebhookResponse);

      expect(result.success).toBe(true);
      expect(result.data?.posts).toEqual([]);
      expect(result.data?.stats).toEqual(mockRedditStats);
    });

    it('应该处理webhook触发失败', async () => {
      const error = new Error('Webhook服务不可用');
      mockRedditWebhookService.triggerWebhook.mockRejectedValue(error);

      const result = await service.triggerRedditWebhook();

      expect(result.success).toBe(false);
      expect(result.error).toContain('触发Reddit webhook失败');
      expect(result.errorCode).toBe('REDDIT_WEBHOOK_TRIGGER_FAILED');
    });

    it('应该支持进度回调', async () => {
      const mockWebhookResponse = { posts: [] };
      const mockProcessedData = { posts: [] };
      const onProgress = jest.fn();

      mockRedditWebhookService.triggerWebhook.mockResolvedValue(mockWebhookResponse);
      mockRedditWebhookService.processWebhookResponse.mockReturnValue(mockProcessedData);

      await service.triggerRedditWebhook(onProgress);

      expect(mockRedditWebhookService.triggerWebhook).toHaveBeenCalledWith(onProgress);
    });
  });

  describe('stopRedditWorkflow', () => {
    it('应该成功停止Reddit工作流', async () => {
      const mockStopResult = { success: true, message: '执行已成功停止' };

      const stopExecutionSpy = jest.spyOn(service as any, 'stopExecution');
      stopExecutionSpy.mockResolvedValue(mockStopResult);

      const result = await service.stopRedditWorkflow('exec_123');

      expect(stopExecutionSpy).toHaveBeenCalledWith('exec_123');
      expect(result.success).toBe(true);
      expect(result.data?.stopped).toBe(true);
    });

    it('应该处理停止失败的情况', async () => {
      const stopExecutionSpy = jest.spyOn(service as any, 'stopExecution');
      stopExecutionSpy.mockRejectedValue(new Error('停止失败'));

      const result = await service.stopRedditWorkflow('exec_123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('停止Reddit工作流失败');
      expect(result.errorCode).toBe('REDDIT_WORKFLOW_STOP_FAILED');
    });
  });

  describe('getRedditWorkflowStatus', () => {
    it('应该获取特定执行的状态', async () => {
      const mockExecution = {
        success: true,
        data: {
          id: 'exec_123',
          workflowId: 'reddit-hot-content',
          status: 'success',
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
          errorMessage: undefined,
          logs: [],
        },
      };

      const getExecutionSpy = jest.spyOn(service as any, 'getExecution');
      getExecutionSpy.mockResolvedValue(mockExecution);

      const result = await service.getRedditWorkflowStatus('exec_123');

      expect(getExecutionSpy).toHaveBeenCalledWith('exec_123');
      expect(result.success).toBe(true);
      expect(result.data?.workflowId).toBe('reddit-hot-content');
      expect(result.data?.status).toBe('completed');
    });

    it('应该获取最新的Reddit工作流执行状态', async () => {
      const mockExecutions = [{
        id: 'exec_123',
        workflowId: 'reddit-hot-content',
        status: 'success',
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
        errorMessage: undefined,
      }];

      const getExecutionsSpy = jest.spyOn(service as any, 'getExecutions');
      getExecutionsSpy.mockResolvedValue(mockExecutions);

      const result = await service.getRedditWorkflowStatus();

      expect(getExecutionsSpy).toHaveBeenCalledWith('reddit-hot-content', { pageSize: 1 });
      expect(result.success).toBe(true);
      expect(result.data?.workflowId).toBe('reddit-hot-content');
    });

    it('应该在没有执行记录时返回空闲状态', async () => {
      const getExecutionsSpy = jest.spyOn(service as any, 'getExecutions');
      getExecutionsSpy.mockResolvedValue([]);

      const result = await service.getRedditWorkflowStatus();

      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('idle');
      expect(result.data?.progress).toBe(0);
    });

    it('应该处理获取状态失败的情况', async () => {
      const getExecutionsSpy = jest.spyOn(service as any, 'getExecutions');
      getExecutionsSpy.mockRejectedValue(new Error('获取失败'));

      const result = await service.getRedditWorkflowStatus();

      expect(result.success).toBe(true); // 返回模拟数据
      expect(result.data?.status).toBe('idle');
    });
  });

  describe('getRedditWorkflowStats', () => {
    it('应该成功获取Reddit工作流统计信息', async () => {
      const mockExecutions = [
        {
          id: 'exec_1',
          status: 'success',
          startedAt: new Date().toISOString(),
          finishedAt: new Date(Date.now() + 45000).toISOString(),
          duration: 45,
        },
        {
          id: 'exec_2',
          status: 'failed',
          startedAt: new Date().toISOString(),
          errorMessage: 'Network error',
        },
      ];

      const getExecutionsSpy = jest.spyOn(service as any, 'getExecutions');
      getExecutionsSpy.mockResolvedValue(mockExecutions);

      const result = await service.getRedditWorkflowStats();

      expect(getExecutionsSpy).toHaveBeenCalledWith('reddit-hot-content', { pageSize: 100 });
      expect(result.success).toBe(true);
      expect(result.data?.totalExecutions).toBe(2);
      expect(result.data?.successfulExecutions).toBe(1);
      expect(result.data?.failedExecutions).toBe(1);
      expect(result.data?.successRate).toBe(50);
      expect(result.data?.errorRate).toBe(50);
    });

    it('应该处理没有执行记录的情况', async () => {
      const getExecutionsSpy = jest.spyOn(service as any, 'getExecutions');
      getExecutionsSpy.mockResolvedValue([]);

      const result = await service.getRedditWorkflowStats();

      expect(result.success).toBe(true);
      expect(result.data?.totalExecutions).toBe(0);
      expect(result.data?.successfulExecutions).toBe(0);
      expect(result.data?.averageExecutionTime).toBe(0);
    });

    it('应该处理获取统计失败的情况', async () => {
      const getExecutionsSpy = jest.spyOn(service as any, 'getExecutions');
      getExecutionsSpy.mockRejectedValue(new Error('数据库连接失败'));

      const result = await service.getRedditWorkflowStats();

      expect(result.success).toBe(true); // 返回模拟数据
      expect(result.data?.totalExecutions).toBe(12);
      expect(result.data?.successfulExecutions).toBe(10);
    });
  });

  describe('executeRedditWorkflowAction', () => {
    describe('start action', () => {
      it('应该成功启动工作流', async () => {
        const mockTriggerResult = {
          success: true,
          data: { executionId: 'exec_123', status: 'running' },
        };

        const triggerRedditWorkflowSpy = jest.spyOn(service, 'triggerRedditWorkflow');
        triggerRedditWorkflowSpy.mockResolvedValue(mockTriggerResult);

        const result = await service.executeRedditWorkflowAction('start', undefined, mockRedditConfig);

        expect(triggerRedditWorkflowSpy).toHaveBeenCalledWith(mockRedditConfig);
        expect(result).toEqual(mockTriggerResult);
      });

      it('应该在没有配置时抛出错误', async () => {
        await expect(
          service.executeRedditWorkflowAction('start')
        ).rejects.toThrow('启动工作流需要提供配置');
      });
    });

    describe('stop action', () => {
      it('应该成功停止工作流', async () => {
        const mockStopResult = {
          success: true,
          data: { stopped: true },
        };

        const stopRedditWorkflowSpy = jest.spyOn(service, 'stopRedditWorkflow');
        stopRedditWorkflowSpy.mockResolvedValue(mockStopResult);

        const result = await service.executeRedditWorkflowAction('stop', 'exec_123');

        expect(stopRedditWorkflowSpy).toHaveBeenCalledWith('exec_123');
        expect(result.success).toBe(true);
        expect(result.data?.status).toBe('stopped');
      });

      it('应该在没有执行ID时抛出错误', async () => {
        await expect(
          service.executeRedditWorkflowAction('stop')
        ).rejects.toThrow('停止工作流需要提供执行ID');
      });
    });

    describe('restart action', () => {
      it('应该成功重启工作流', async () => {
        const mockStopResult = { success: true };
        const mockTriggerResult = {
          success: true,
          data: { executionId: 'exec_456', status: 'running' },
        };

        const stopRedditWorkflowSpy = jest.spyOn(service, 'stopRedditWorkflow');
        const triggerRedditWorkflowSpy = jest.spyOn(service, 'triggerRedditWorkflow');

        stopRedditWorkflowSpy.mockResolvedValue(mockStopResult);
        triggerRedditWorkflowSpy.mockResolvedValue(mockTriggerResult);

        const result = await service.executeRedditWorkflowAction('restart', 'exec_123', mockRedditConfig);

        expect(stopRedditWorkflowSpy).toHaveBeenCalledWith('exec_123');
        expect(triggerRedditWorkflowSpy).toHaveBeenCalledWith(mockRedditConfig);
        expect(result).toEqual(mockTriggerResult);
      });

      it('应该在没有配置时抛出错误', async () => {
        await expect(
          service.executeRedditWorkflowAction('restart', 'exec_123')
        ).rejects.toThrow('重启工作流需要提供配置');
      });
    });

    describe('不支持的操作', () => {
      it('应该拒绝不支持的操作', async () => {
        await expect(
          service.executeRedditWorkflowAction('pause')
        ).rejects.toThrow('操作 \'pause\' 暂不支持');

        await expect(
          service.executeRedditWorkflowAction('resume')
        ).rejects.toThrow('操作 \'resume\' 暂不支持');
      });

      it('应该拒绝未知操作', async () => {
        await expect(
          service.executeRedditWorkflowAction('unknown' as any)
        ).rejects.toThrow('未知的工作流操作');
      });
    });

    it('应该处理操作执行失败', async () => {
      const triggerRedditWorkflowSpy = jest.spyOn(service, 'triggerRedditWorkflow');
      triggerRedditWorkflowSpy.mockRejectedValue(new Error('网络错误'));

      const result = await service.executeRedditWorkflowAction('start', undefined, mockRedditConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('执行工作流操作失败');
      expect(result.errorCode).toBe('REDDIT_WORKFLOW_ACTION_FAILED');
    });
  });

  describe('辅助方法', () => {
    describe('mapExecutionStatusToWorkflowStatus', () => {
      it('应该正确映射执行状态', () => {
        const mapMethod = (service as any).mapExecutionStatusToWorkflowStatus.bind(service);

        expect(mapMethod('running')).toBe('running');
        expect(mapMethod('success')).toBe('completed');
        expect(mapMethod('failed')).toBe('failed');
        expect(mapMethod('waiting')).toBe('running');
        expect(mapMethod('cancelled')).toBe('failed');
        expect(mapMethod('unknown' as any)).toBe('idle');
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理网络错误', async () => {
      const triggerWorkflowSpy = jest.spyOn(service as any, 'triggerWorkflow');
      triggerWorkflowSpy.mockRejectedValue(new Error('网络连接失败'));

      const result = await service.triggerRedditWorkflow(mockRedditConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('触发Reddit工作流失败');
    });

    it('应该处理API超时', async () => {
      mockRedditWebhookService.triggerWebhook.mockImplementation(
        () => new Promise((_, reject) =>
          setTimeout(() => reject(new Error('超时')), 100)
        )
      );

      const result = await service.triggerRedditWebhook();

      expect(result.success).toBe(false);
      expect(result.error).toContain('触发Reddit webhook失败');
    });
  });

  describe('服务实例', () => {
    it('应该导出单例服务实例', () => {
      expect(workflowService).toBeInstanceOf(WorkflowService);
    });

    it('应该可以创建新的服务实例', () => {
      const newService = new WorkflowService();
      expect(newService).toBeInstanceOf(WorkflowService);
      expect(newService).not.toBe(workflowService);
    });
  });
});
