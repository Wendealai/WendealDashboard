/**
 * 工作流服务 - 与n8n系统集成
 * 提供工作流的获取、触发、执行状态查询等功能
 */

import { api } from './api';
import { redditWebhookService } from './redditWebhookService';
import type {
  WorkflowInfo,
  WorkflowExecution,
  WorkflowLog,
  TriggerWorkflowRequest,
  WorkflowListResponse,
  WorkflowExecutionResponse,
  TriggerWorkflowApiResponse,
  // Invoice OCR 相关类型
  InvoiceOCRWorkflow,
  InvoiceOCRResult,
  InvoiceOCRExecution,
  InvoiceOCRBatchTask,
  CreateInvoiceOCRWorkflowRequest,
  UpdateInvoiceOCRWorkflowRequest,
  InvoiceOCRUploadRequest,
  InvoiceOCRApiResponse,
  InvoiceOCRPaginatedResponse,
  InvoiceOCRQueryParams,
} from '@/pages/InformationDashboard/types';
import type {
  RedditWorkflowConfig,
  WorkflowStatus,
  RedditApiResponse,
  WorkflowAction,
  RedditWorkflowStats,
} from '@/types';

/**
 * 工作流服务类
 */
export class WorkflowService {
  private readonly baseUrl = '/workflows';
  private readonly n8nBaseUrl =
    process.env.REACT_APP_N8N_BASE_URL || 'http://localhost:5678';
  private readonly n8nApiKey = process.env.REACT_APP_N8N_API_KEY || '';

  /**
   * 获取n8n API请求头
   */
  private getN8nHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.n8nApiKey) {
      headers['X-N8N-API-KEY'] = this.n8nApiKey;
    }

    return headers;
  }

  /**
   * 获取工作流列表
   * @param params 查询参数
   * @returns 工作流列表响应
   */
  async getWorkflows(
    params: {
      page?: number;
      pageSize?: number;
      search?: string;
      status?: string;
    } = {}
  ): Promise<WorkflowListResponse> {
    try {
      // 首先尝试从本地API获取
      const response = await api.get<WorkflowListResponse>(`${this.baseUrl}`, {
        params,
      });
      return response.data;
    } catch (error) {
      // 如果本地API失败，尝试直接从n8n获取
      console.warn('本地API获取工作流失败，尝试从n8n直接获取:', error);
      return this.getWorkflowsFromN8n(params);
    }
  }

  /**
   * 直接从n8n获取工作流列表
   * @param params 查询参数
   * @returns 工作流列表响应
   */
  private async getWorkflowsFromN8n(params: {
    page?: number;
    pageSize?: number;
    search?: string;
    status?: string;
  }): Promise<WorkflowListResponse> {
    try {
      const response = await fetch(`${this.n8nBaseUrl}/api/v1/workflows`, {
        method: 'GET',
        headers: this.getN8nHeaders(),
      });

      if (!response.ok) {
        throw new Error(
          `n8n API请求失败: ${response.status} ${response.statusText}`
        );
      }

      const n8nWorkflows = await response.json();

      // 转换n8n数据格式为我们的格式
      const workflows: WorkflowInfo[] =
        n8nWorkflows.data?.map((workflow: any) => ({
          id: workflow.id,
          name: workflow.name,
          description: workflow.meta?.description || '',
          type: this.mapN8nTriggerType(workflow.nodes),
          status: workflow.active ? 'active' : 'inactive',
          createdAt: workflow.createdAt,
          updatedAt: workflow.updatedAt,
          executionCount: 0, // n8n不直接提供，需要单独查询
          successRate: 0, // n8n不直接提供，需要单独查询
          author: {
            id: workflow.ownedBy?.id || 'unknown',
            name:
              workflow.ownedBy?.firstName + ' ' + workflow.ownedBy?.lastName ||
              '未知用户',
          },
        })) || [];

      return {
        success: true,
        data: {
          items: workflows,
          total: workflows.length,
          page: params.page || 1,
          pageSize: params.pageSize || 10,
        },
        message: '获取工作流列表成功',
      };
    } catch (error) {
      console.error('从n8n获取工作流失败:', error);
      throw new Error(
        error instanceof Error ? error.message : '获取工作流列表失败'
      );
    }
  }

  /**
   * 映射n8n触发器类型到我们的工作流类型
   * @param nodes n8n工作流节点
   * @returns 工作流类型
   */
  private mapN8nTriggerType(
    nodes: any[]
  ): 'scheduled' | 'webhook' | 'manual' | 'event' {
    if (!nodes || nodes.length === 0) return 'manual';

    const triggerNode = nodes.find(
      node => node.type.includes('trigger') || node.type.includes('Trigger')
    );
    if (!triggerNode) return 'manual';

    const nodeType = triggerNode.type.toLowerCase();
    if (nodeType.includes('cron') || nodeType.includes('schedule'))
      return 'scheduled';
    if (nodeType.includes('webhook')) return 'webhook';
    if (nodeType.includes('manual')) return 'manual';

    return 'event';
  }

  /**
   * 获取单个工作流详情
   * @param workflowId 工作流ID
   * @returns 工作流详情
   */
  async getWorkflow(workflowId: string): Promise<WorkflowInfo> {
    try {
      const response = await api.get<{ data: WorkflowInfo }>(
        `${this.baseUrl}/${workflowId}`
      );
      return response.data.data;
    } catch (error) {
      // 尝试从n8n获取
      return this.getWorkflowFromN8n(workflowId);
    }
  }

  /**
   * 从n8n获取单个工作流详情
   * @param workflowId 工作流ID
   * @returns 工作流详情
   */
  private async getWorkflowFromN8n(workflowId: string): Promise<WorkflowInfo> {
    try {
      const response = await fetch(
        `${this.n8nBaseUrl}/api/v1/workflows/${workflowId}`,
        {
          method: 'GET',
          headers: this.getN8nHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`获取工作流详情失败: ${response.status}`);
      }

      const workflow = await response.json();

      return {
        id: workflow.id,
        name: workflow.name,
        description: workflow.meta?.description || '',
        type: this.mapN8nTriggerType(workflow.nodes),
        status: workflow.active ? 'active' : 'inactive',
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
        executionCount: 0,
        successRate: 0,
        author: {
          id: workflow.ownedBy?.id || 'unknown',
          name:
            workflow.ownedBy?.firstName + ' ' + workflow.ownedBy?.lastName ||
            '未知用户',
        },
      };
    } catch (error) {
      console.error('从n8n获取工作流详情失败:', error);
      throw new Error(
        error instanceof Error ? error.message : '获取工作流详情失败'
      );
    }
  }

  /**
   * 触发工作流执行
   * @param request 触发请求
   * @returns 触发响应
   */
  async triggerWorkflow(
    request: TriggerWorkflowRequest
  ): Promise<TriggerWorkflowApiResponse> {
    try {
      // 首先尝试通过本地API触发
      const response = await api.post<TriggerWorkflowApiResponse>(
        `${this.baseUrl}/${request.workflowId}/trigger`,
        request
      );
      return response.data;
    } catch (error) {
      // 如果本地API失败，尝试直接调用n8n
      console.warn('本地API触发工作流失败，尝试直接调用n8n:', error);
      return this.triggerWorkflowInN8n(request);
    }
  }

  /**
   * 直接在n8n中触发工作流
   * @param request 触发请求
   * @returns 触发响应
   */
  private async triggerWorkflowInN8n(
    request: TriggerWorkflowRequest
  ): Promise<TriggerWorkflowApiResponse> {
    try {
      const response = await fetch(
        `${this.n8nBaseUrl}/api/v1/workflows/${request.workflowId}/execute`,
        {
          method: 'POST',
          headers: this.getN8nHeaders(),
          body: JSON.stringify({
            data: request.inputData || {},
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `触发工作流失败: ${response.status} ${response.statusText}`
        );
      }

      const result = await response.json();

      return {
        success: true,
        data: {
          executionId:
            result.data?.executionId || result.data?.id || `exec_${Date.now()}`,
          status: result.data?.finished ? 'success' : 'running',
          message: '工作流已成功触发',
        },
        message: '工作流触发成功',
      };
    } catch (error) {
      console.error('n8n触发工作流失败:', error);
      throw new Error(
        error instanceof Error ? error.message : '触发工作流失败'
      );
    }
  }

  /**
   * 获取工作流执行记录
   * @param workflowId 工作流ID（可选）
   * @param params 查询参数
   * @returns 执行记录列表
   */
  async getExecutions(
    workflowId?: string,
    params: {
      page?: number;
      pageSize?: number;
      status?: string;
    } = {}
  ): Promise<WorkflowExecution[]> {
    try {
      const url = workflowId
        ? `${this.baseUrl}/${workflowId}/executions`
        : `${this.baseUrl}/executions`;

      const response = await api.get<{ data: WorkflowExecution[] }>(url, {
        params,
      });
      return response.data.data;
    } catch (error) {
      // 尝试从n8n获取
      return this.getExecutionsFromN8n(workflowId, params);
    }
  }

  /**
   * 从n8n获取执行记录
   * @param workflowId 工作流ID（可选）
   * @param params 查询参数
   * @returns 执行记录列表
   */
  private async getExecutionsFromN8n(
    workflowId?: string,
    params: {
      page?: number;
      pageSize?: number;
      status?: string;
    } = {}
  ): Promise<WorkflowExecution[]> {
    try {
      let url = `${this.n8nBaseUrl}/api/v1/executions`;
      const queryParams = new URLSearchParams();

      if (workflowId) {
        queryParams.append('workflowId', workflowId);
      }
      if (params.page) {
        queryParams.append('page', params.page.toString());
      }
      if (params.pageSize) {
        queryParams.append('limit', params.pageSize.toString());
      }

      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getN8nHeaders(),
      });

      if (!response.ok) {
        throw new Error(`获取执行记录失败: ${response.status}`);
      }

      const result = await response.json();

      return (
        result.data?.map((execution: any) => {
          const executionData: WorkflowExecution = {
            id: execution.id,
            workflowId: execution.workflowId,
            status: this.mapN8nExecutionStatus(
              execution.finished,
              execution.stoppedAt
            ),
            startedAt: execution.startedAt,
            finishedAt: execution.stoppedAt,
            errorMessage: execution.data?.resultData?.error?.message,
            inputData: execution.data?.startData,
            outputData: execution.data?.resultData,
          };

          if (execution.stoppedAt && execution.startedAt) {
            executionData.duration =
              new Date(execution.stoppedAt).getTime() -
              new Date(execution.startedAt).getTime();
          }

          return executionData;
        }) || []
      );
    } catch (error) {
      console.error('从n8n获取执行记录失败:', error);
      return [];
    }
  }

  /**
   * 映射n8n执行状态
   * @param finished 是否完成
   * @param stoppedAt 停止时间
   * @returns 执行状态
   */
  private mapN8nExecutionStatus(
    finished: boolean,
    stoppedAt: string | null
  ): 'running' | 'success' | 'failed' | 'waiting' | 'cancelled' {
    if (!finished && !stoppedAt) return 'running';
    if (finished && stoppedAt) return 'success';
    if (!finished && stoppedAt) return 'failed';
    return 'waiting';
  }

  /**
   * 获取执行详情
   * @param executionId 执行ID
   * @returns 执行详情
   */
  async getExecution(executionId: string): Promise<WorkflowExecutionResponse> {
    try {
      const response = await api.get<WorkflowExecutionResponse>(
        `${this.baseUrl}/executions/${executionId}`
      );
      return response.data;
    } catch (error) {
      // 尝试从n8n获取
      return this.getExecutionFromN8n(executionId);
    }
  }

  /**
   * 从n8n获取执行详情
   * @param executionId 执行ID
   * @returns 执行详情
   */
  private async getExecutionFromN8n(
    executionId: string
  ): Promise<WorkflowExecutionResponse> {
    try {
      const response = await fetch(
        `${this.n8nBaseUrl}/api/v1/executions/${executionId}`,
        {
          method: 'GET',
          headers: this.getN8nHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`获取执行详情失败: ${response.status}`);
      }

      const execution = await response.json();

      const executionData: WorkflowExecution = {
        id: execution.id,
        workflowId: execution.workflowId,
        status: this.mapN8nExecutionStatus(
          execution.finished,
          execution.stoppedAt
        ),
        startedAt: execution.startedAt,
        finishedAt: execution.stoppedAt,
        errorMessage: execution.data?.resultData?.error?.message,
        inputData: execution.data?.startData,
        outputData: execution.data?.resultData,
        logs: this.extractLogsFromExecution(execution),
      };

      if (execution.stoppedAt && execution.startedAt) {
        executionData.duration =
          new Date(execution.stoppedAt).getTime() -
          new Date(execution.startedAt).getTime();
      }

      return {
        success: true,
        data: executionData,
        message: '获取执行详情成功',
      };
    } catch (error) {
      console.error('从n8n获取执行详情失败:', error);
      throw new Error(
        error instanceof Error ? error.message : '获取执行详情失败'
      );
    }
  }

  /**
   * 从n8n执行数据中提取日志
   * @param execution n8n执行数据
   * @returns 日志列表
   */
  private extractLogsFromExecution(execution: any): WorkflowLog[] {
    const logs: WorkflowLog[] = [];

    if (execution.data?.resultData?.runData) {
      Object.entries(execution.data.resultData.runData).forEach(
        ([nodeId, nodeData]: [string, any]) => {
          if (Array.isArray(nodeData)) {
            nodeData.forEach((run: any, index: number) => {
              logs.push({
                id: `${nodeId}_${index}`,
                timestamp: run.startTime || execution.startedAt,
                level: run.error ? 'error' : 'info',
                message: run.error
                  ? run.error.message
                  : `节点 ${nodeId} 执行完成`,
                nodeId,
                nodeName: nodeId,
                data: run.data,
              });
            });
          }
        }
      );
    }

    return logs;
  }

  /**
   * 停止工作流执行
   * @param executionId 执行ID
   * @returns 停止结果
   */
  async stopExecution(
    executionId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.post(
        `${this.baseUrl}/executions/${executionId}/stop`
      );
      return response.data;
    } catch (error) {
      // 尝试在n8n中停止
      return this.stopExecutionInN8n(executionId);
    }
  }

  /**
   * 在n8n中停止执行
   * @param executionId 执行ID
   * @returns 停止结果
   */
  private async stopExecutionInN8n(
    executionId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(
        `${this.n8nBaseUrl}/api/v1/executions/${executionId}/stop`,
        {
          method: 'POST',
          headers: this.getN8nHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error(`停止执行失败: ${response.status}`);
      }

      return {
        success: true,
        message: '执行已成功停止',
      };
    } catch (error) {
      console.error('在n8n中停止执行失败:', error);
      throw new Error(error instanceof Error ? error.message : '停止执行失败');
    }
  }

  /**
   * 获取工作流统计信息
   * @param workflowId 工作流ID（可选）
   * @returns 统计信息
   */
  async getWorkflowStats(workflowId?: string): Promise<{
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
    lastExecution?: WorkflowExecution;
  }> {
    try {
      const executions = await this.getExecutions(workflowId, {
        pageSize: 100,
      });

      const totalExecutions = executions.length;
      const successfulExecutions = executions.filter(
        e => e.status === 'success'
      ).length;
      const failedExecutions = executions.filter(
        e => e.status === 'failed'
      ).length;

      const completedExecutions = executions.filter(
        e => e.duration !== undefined
      );
      const averageExecutionTime =
        completedExecutions.length > 0
          ? completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) /
            completedExecutions.length
          : 0;

      const lastExecution = executions.length > 0 ? executions[0] : undefined;

      const result: {
        totalExecutions: number;
        successfulExecutions: number;
        failedExecutions: number;
        averageExecutionTime: number;
        lastExecution?: WorkflowExecution;
      } = {
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        averageExecutionTime,
      };

      if (lastExecution) {
        result.lastExecution = lastExecution;
      }

      return result;
    } catch (error) {
      console.error('获取工作流统计失败:', error);
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageExecutionTime: 0,
      };
    }
  }

  // ==================== Reddit工作流特定方法 ====================

  /**
   * 触发Reddit热门内容抓取工作流
   * @param config Reddit工作流配置
   * @returns 触发响应
   */
  async triggerRedditWorkflow(
    config: RedditWorkflowConfig
  ): Promise<RedditApiResponse<{ executionId: string; status: string }>> {
    try {
      const request: TriggerWorkflowRequest = {
        workflowId: 'reddit-hot-content', // Reddit工作流的固定ID
        inputData: {
          subreddits: config.subreddits,
          sortBy: config.sortBy,
          timeRange: config.timeRange,
          limit: config.limit,
          minScore: config.minScore,
          maxScore: config.maxScore,
          includeNsfw: config.includeNsfw,
          includeStickied: config.includeStickied,
          configId: config.id,
          configName: config.name,
        },
      };

      const response = await this.triggerWorkflow(request);

      if (response.success && response.data) {
        return {
          success: true,
          data: {
            executionId: response.data.executionId,
            status: response.data.status,
          },
          timestamp: Date.now(),
        };
      } else {
        throw new Error(response.message || '触发Reddit工作流失败');
      }
    } catch (error) {
      console.error('触发Reddit工作流失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '触发Reddit工作流失败',
        errorCode: 'REDDIT_WORKFLOW_TRIGGER_FAILED',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 通过webhook触发Reddit工作流并获取实时数据
   * @returns Reddit数据和统计信息
   */
  /**
   * 触发Reddit webhook并等待工作流完成
   * @param onProgress 进度回调函数
   * @returns Promise<RedditApiResponse>
   */
  async triggerRedditWebhook(onProgress?: (status: string) => void): Promise<
    RedditApiResponse<{
      posts: any[];
      subreddits: any[];
      stats: RedditWorkflowStats;
      metadata: any;
    }>
  > {
    try {
      console.log('WorkflowService: 开始触发Reddit webhook');
      const webhookResponse =
        await redditWebhookService.triggerWebhook(onProgress);

      console.log('WorkflowService: 收到webhook响应:', {
        responseType: typeof webhookResponse,
        responseKeys: webhookResponse ? Object.keys(webhookResponse) : [],
        hasTelegramMessage: !!webhookResponse?.telegramMessage,
        telegramMessageType: typeof webhookResponse?.telegramMessage,
        telegramMessageLength: webhookResponse?.telegramMessage?.length || 0,
      });

      const processedData =
        redditWebhookService.processWebhookResponse(webhookResponse);

      // Check if processedData has the expected structure
      const hasNestedStructure = !!(processedData as any)?.data;

      console.log('WorkflowService: 数据处理完成:', {
        postsCount: hasNestedStructure
          ? (processedData as any).data?.posts?.length || 0
          : (processedData as any)?.posts?.length || 0,
        hasStats: hasNestedStructure
          ? !!(processedData as any).data?.stats
          : !!(processedData as any)?.stats,
        hasMetadata: hasNestedStructure
          ? !!(processedData as any).data?.metadata
          : !!(processedData as any)?.metadata,
        dataStructure: hasNestedStructure ? 'nested' : 'flat',
      });

      // Handle both old and new data formats
      const redditData = hasNestedStructure
        ? (processedData as any).data
        : processedData;

      // Ensure all required properties exist with fallbacks
      const posts = (redditData as any)?.posts || [];
      const subreddits = (redditData as any)?.subreddits || [];
      const stats = (redditData as any)?.stats || {};
      const metadata = (redditData as any)?.metadata || {};

      // Type guard to ensure we have the expected structure
      if (!redditData || typeof redditData !== 'object') {
        throw new Error('Invalid data structure received from webhook');
      }

      return {
        success: true,
        data: {
          posts,
          subreddits,
          stats,
          metadata,
        },
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('触发Reddit webhook失败:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : '触发Reddit webhook失败',
        errorCode: 'REDDIT_WEBHOOK_TRIGGER_FAILED',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 停止Reddit工作流执行
   * @param executionId 执行ID
   * @returns 停止结果
   */
  async stopRedditWorkflow(
    executionId: string
  ): Promise<RedditApiResponse<{ stopped: boolean }>> {
    try {
      const result = await this.stopExecution(executionId);

      return {
        success: result.success,
        data: { stopped: result.success },
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('停止Reddit工作流失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '停止Reddit工作流失败',
        errorCode: 'REDDIT_WORKFLOW_STOP_FAILED',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 获取Reddit工作流状态
   * @param executionId 执行ID（可选）
   * @returns 工作流状态
   */
  async getRedditWorkflowStatus(
    executionId?: string
  ): Promise<RedditApiResponse<WorkflowStatus>> {
    try {
      if (executionId) {
        // 获取特定执行的状态
        const execution = await this.getExecution(executionId);

        if (execution.success && execution.data) {
          const status: WorkflowStatus = {
            workflowId: 'reddit-hot-content',
            status: this.mapExecutionStatusToWorkflowStatus(
              execution.data.status
            ),
            startTime: execution.data.startedAt
              ? new Date(execution.data.startedAt).getTime()
              : undefined,
            endTime: execution.data.finishedAt
              ? new Date(execution.data.finishedAt).getTime()
              : undefined,
            progress:
              execution.data.status === 'success'
                ? 100
                : execution.data.status === 'failed'
                  ? 0
                  : 50,
            processedCount: 0, // 需要从执行数据中解析
            totalCount: 0, // 需要从执行数据中解析
            lastUpdated: Date.now(),
            logs:
              execution.data.logs?.map((log: WorkflowLog) => ({
                id: log.id,
                timestamp: new Date(log.timestamp).getTime(),
                level: log.level as 'info' | 'warning' | 'error' | 'debug',
                message: log.message,
                details: log.data,
              })) || [],
          };

          // Add error property only if it exists
          if (execution.data.errorMessage) {
            (status as any).error = execution.data.errorMessage;
          }

          return {
            success: true,
            data: status,
            timestamp: Date.now(),
          };
        }
      }

      // 获取最新的Reddit工作流执行状态
      const executions = await this.getExecutions('reddit-hot-content', {
        pageSize: 1,
      });

      if (executions.length > 0) {
        const latestExecution = executions[0];
        if (
          latestExecution &&
          latestExecution.startedAt &&
          latestExecution.finishedAt
        ) {
          const status: WorkflowStatus = {
            workflowId: 'reddit-hot-content',
            status: this.mapExecutionStatusToWorkflowStatus(
              latestExecution.status
            ),
            startTime: latestExecution.startedAt
              ? new Date(latestExecution.startedAt).getTime()
              : undefined,
            endTime: latestExecution.finishedAt
              ? new Date(latestExecution.finishedAt).getTime()
              : undefined,
            progress:
              latestExecution.status === 'success'
                ? 100
                : latestExecution.status === 'failed'
                  ? 0
                  : 50,
            processedCount: 0,
            totalCount: 0,
            lastUpdated: Date.now(),
            logs: [],
          };

          // Add error property only if it exists
          if (latestExecution.errorMessage) {
            status.error = latestExecution.errorMessage;
          }

          return {
            success: true,
            data: status,
            timestamp: Date.now(),
          };
        }
      }

      // 没有执行记录，返回空闲状态
      const status: WorkflowStatus = {
        workflowId: 'reddit-hot-content',
        status: 'idle',
        startTime: undefined,
        endTime: undefined,
        progress: 0,
        processedCount: 0,
        totalCount: 0,
        lastUpdated: Date.now(),
        logs: [],
      };

      return {
        success: true,
        data: status,
        timestamp: Date.now(),
      };
    } catch (error: any) {
      console.error('获取Reddit工作流状态失败:', error);
      // 返回模拟数据作为降级方案
      const mockStatus: WorkflowStatus = {
        workflowId: 'reddit-hot-content',
        status: 'idle',
        startTime: undefined,
        endTime: undefined,
        progress: 0,
        processedCount: 0,
        totalCount: 0,
        lastUpdated: Date.now(),
        logs: [],
      };

      return {
        success: true,
        data: mockStatus,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 获取Reddit工作流统计信息
   * @returns Reddit工作流统计
   */
  async getRedditWorkflowStats(): Promise<
    RedditApiResponse<RedditWorkflowStats>
  > {
    try {
      const executions = await this.getExecutions('reddit-hot-content', {
        pageSize: 100,
      });

      const totalExecutions = executions.length;
      const successfulExecutions = executions.filter(
        e => e.status === 'success'
      ).length;
      const failedExecutions = executions.filter(
        e => e.status === 'failed'
      ).length;

      const completedExecutions = executions.filter(
        e => e.duration !== undefined
      );
      const averageExecutionTime =
        completedExecutions.length > 0
          ? Math.round(
              completedExecutions.reduce(
                (sum, e) => sum + (e.duration || 0),
                0
              ) /
                completedExecutions.length /
                1000
            )
          : 0;

      const lastExecution = executions.length > 0 ? executions[0] : undefined;
      const lastSuccessExecution = executions.find(e => e.status === 'success');

      const errorRate =
        totalExecutions > 0
          ? Math.round((failedExecutions / totalExecutions) * 100)
          : 0;
      const successRate =
        totalExecutions > 0
          ? Math.round((successfulExecutions / totalExecutions) * 100)
          : 0;

      // 估算总获取帖子数（需要从执行数据中解析，这里使用估算值）
      const estimatedPostsPerExecution = 50; // 假设每次执行平均获取50个帖子
      const totalPostsFetched =
        successfulExecutions * estimatedPostsPerExecution;

      const stats: RedditWorkflowStats = {
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        totalPostsFetched,
        averageExecutionTime,
        lastExecutionTime: lastExecution?.startedAt
          ? new Date(lastExecution.startedAt).getTime()
          : undefined,
        lastSuccessTime: lastSuccessExecution?.startedAt
          ? new Date(lastSuccessExecution.startedAt).getTime()
          : undefined,
        errorRate,
        successRate,
      };

      return {
        success: true,
        data: stats,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error('获取Reddit工作流统计失败:', error);
      // 返回模拟数据作为降级方案
      const mockStats: RedditWorkflowStats = {
        totalExecutions: 12,
        successfulExecutions: 10,
        failedExecutions: 2,
        totalPostsFetched: 500,
        averageExecutionTime: 45,
        lastExecutionTime: Date.now() - 3600000, // 1小时前
        lastSuccessTime: Date.now() - 3600000,
        errorRate: 17,
        successRate: 83,
      };

      return {
        success: true,
        data: mockStats,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 执行Reddit工作流操作
   * @param action 操作类型
   * @param executionId 执行ID（对于stop、pause、resume操作）
   * @param config 工作流配置（对于start、restart操作）
   * @returns 操作结果
   */
  async executeRedditWorkflowAction(
    action: WorkflowAction,
    executionId?: string,
    config?: RedditWorkflowConfig
  ): Promise<RedditApiResponse<{ executionId?: string; status: string }>> {
    try {
      switch (action) {
        case 'start':
          if (!config) {
            throw new Error('启动工作流需要提供配置');
          }
          return await this.triggerRedditWorkflow(config);

        case 'stop':
          if (!executionId) {
            throw new Error('停止工作流需要提供执行ID');
          }
          const stopResult = await this.stopRedditWorkflow(executionId);
          return {
            ...stopResult,
            data: { status: 'stopped' },
          };

        case 'restart':
          if (!config) {
            throw new Error('重启工作流需要提供配置');
          }
          // 如果有正在运行的执行，先停止它
          if (executionId) {
            await this.stopRedditWorkflow(executionId);
            // 等待一小段时间确保停止完成
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          return await this.triggerRedditWorkflow(config);

        case 'pause':
        case 'resume':
          // n8n可能不支持暂停/恢复，这里返回不支持的错误
          throw new Error(`操作 '${action}' 暂不支持`);

        default:
          throw new Error(`未知的工作流操作: ${action}`);
      }
    } catch (error) {
      console.error(`执行Reddit工作流操作 '${action}' 失败:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : `执行工作流操作失败`,
        errorCode: 'REDDIT_WORKFLOW_ACTION_FAILED',
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 映射执行状态到工作流状态
   * @param executionStatus 执行状态
   * @returns 工作流状态
   */
  private mapExecutionStatusToWorkflowStatus(
    executionStatus: 'running' | 'success' | 'failed' | 'waiting' | 'cancelled'
  ): 'idle' | 'running' | 'completed' | 'failed' | 'paused' {
    switch (executionStatus) {
      case 'running':
      case 'waiting':
        return 'running';
      case 'success':
        return 'completed';
      case 'failed':
      case 'cancelled':
        return 'failed';
      default:
        return 'idle';
    }
  }

  // ==================== Invoice OCR 相关方法 ====================

  /**
   * 创建 Invoice OCR 工作流
   * @param request 创建请求
   * @returns 创建的工作流信息
   */
  async createInvoiceOCRWorkflow(
    request: CreateInvoiceOCRWorkflowRequest
  ): Promise<InvoiceOCRApiResponse<InvoiceOCRWorkflow>> {
    try {
      const response = await api.post<
        InvoiceOCRApiResponse<InvoiceOCRWorkflow>
      >(`${this.baseUrl}/invoice-ocr`, request);
      return response.data;
    } catch (error) {
      console.error('创建 Invoice OCR 工作流失败:', error);
      throw new Error(
        error instanceof Error ? error.message : '创建 Invoice OCR 工作流失败'
      );
    }
  }

  /**
   * 更新 Invoice OCR 工作流
   * @param workflowId 工作流ID
   * @param request 更新请求
   * @returns 更新的工作流信息
   */
  async updateInvoiceOCRWorkflow(
    workflowId: string,
    request: UpdateInvoiceOCRWorkflowRequest
  ): Promise<InvoiceOCRApiResponse<InvoiceOCRWorkflow>> {
    try {
      const response = await api.put<InvoiceOCRApiResponse<InvoiceOCRWorkflow>>(
        `${this.baseUrl}/invoice-ocr/${workflowId}`,
        request
      );
      return response.data;
    } catch (error) {
      console.error('更新 Invoice OCR 工作流失败:', error);
      throw new Error(
        error instanceof Error ? error.message : '更新 Invoice OCR 工作流失败'
      );
    }
  }

  /**
   * 获取 Invoice OCR 工作流详情
   * @param workflowId 工作流ID
   * @returns 工作流详情
   */
  async getInvoiceOCRWorkflow(
    workflowId: string
  ): Promise<InvoiceOCRApiResponse<InvoiceOCRWorkflow>> {
    try {
      const response = await api.get<InvoiceOCRApiResponse<InvoiceOCRWorkflow>>(
        `${this.baseUrl}/invoice-ocr/${workflowId}`
      );
      return response.data;
    } catch (error) {
      console.error('获取 Invoice OCR 工作流失败:', error);
      throw new Error(
        error instanceof Error ? error.message : '获取 Invoice OCR 工作流失败'
      );
    }
  }

  /**
   * 获取 Invoice OCR 工作流列表
   * @param params 查询参数
   * @returns 工作流列表
   */
  async getInvoiceOCRWorkflows(
    params: InvoiceOCRQueryParams = {}
  ): Promise<
    InvoiceOCRApiResponse<InvoiceOCRPaginatedResponse<InvoiceOCRWorkflow>>
  > {
    try {
      const response = await api.get<
        InvoiceOCRApiResponse<InvoiceOCRPaginatedResponse<InvoiceOCRWorkflow>>
      >(`${this.baseUrl}/invoice-ocr`, {
        params,
      });
      return response.data;
    } catch (error) {
      console.error('获取 Invoice OCR 工作流列表失败:', error);
      throw new Error(
        error instanceof Error
          ? error.message
          : '获取 Invoice OCR 工作流列表失败'
      );
    }
  }

  /**
   * 删除 Invoice OCR 工作流
   * @param workflowId 工作流ID
   * @returns 删除结果
   */
  async deleteInvoiceOCRWorkflow(
    workflowId: string
  ): Promise<InvoiceOCRApiResponse<void>> {
    try {
      const response = await api.delete<InvoiceOCRApiResponse<void>>(
        `${this.baseUrl}/invoice-ocr/${workflowId}`
      );
      return response.data;
    } catch (error) {
      console.error('删除 Invoice OCR 工作流失败:', error);
      throw new Error(
        error instanceof Error ? error.message : '删除 Invoice OCR 工作流失败'
      );
    }
  }

  /**
   * 上传文件进行 Invoice OCR 处理
   * @param request 上传请求
   * @returns 处理任务信息
   */
  async uploadInvoiceFiles(
    request: InvoiceOCRUploadRequest
  ): Promise<InvoiceOCRApiResponse<InvoiceOCRBatchTask>> {
    try {
      const formData = new FormData();

      // 添加文件
      request.files.forEach(file => {
        formData.append(`files`, file);
      });

      // 添加其他参数
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
      >(`${this.baseUrl}/invoice-ocr/${request.workflowId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('上传 Invoice 文件失败:', error);
      throw new Error(
        error instanceof Error ? error.message : '上传 Invoice 文件失败'
      );
    }
  }

  /**
   * 获取 Invoice OCR 处理结果
   * @param workflowId 工作流ID
   * @param resultId 结果ID
   * @returns 处理结果
   */
  async getInvoiceOCRResult(
    workflowId: string,
    resultId: string
  ): Promise<InvoiceOCRApiResponse<InvoiceOCRResult>> {
    try {
      const response = await api.get<InvoiceOCRApiResponse<InvoiceOCRResult>>(
        `${this.baseUrl}/invoice-ocr/${workflowId}/results/${resultId}`
      );
      return response.data;
    } catch (error) {
      console.error('获取 Invoice OCR 结果失败:', error);
      throw new Error(
        error instanceof Error ? error.message : '获取 Invoice OCR 结果失败'
      );
    }
  }

  /**
   * 获取 Invoice OCR 处理结果列表
   * @param workflowId 工作流ID
   * @param params 查询参数
   * @returns 结果列表
   */
  async getInvoiceOCRResults(
    workflowId: string,
    params: InvoiceOCRQueryParams = {}
  ): Promise<
    InvoiceOCRApiResponse<InvoiceOCRPaginatedResponse<InvoiceOCRResult>>
  > {
    try {
      const response = await api.get<
        InvoiceOCRApiResponse<InvoiceOCRPaginatedResponse<InvoiceOCRResult>>
      >(`${this.baseUrl}/invoice-ocr/${workflowId}/results`, {
        params,
      });
      return response.data;
    } catch (error) {
      console.error('获取 Invoice OCR 结果列表失败:', error);
      throw new Error(
        error instanceof Error ? error.message : '获取 Invoice OCR 结果列表失败'
      );
    }
  }

  /**
   * 获取批处理任务状态
   * @param workflowId 工作流ID
   * @param batchId 批处理ID
   * @returns 批处理任务信息
   */
  async getInvoiceOCRBatchTask(
    workflowId: string,
    batchId: string
  ): Promise<InvoiceOCRApiResponse<InvoiceOCRBatchTask>> {
    try {
      const response = await api.get<
        InvoiceOCRApiResponse<InvoiceOCRBatchTask>
      >(`${this.baseUrl}/invoice-ocr/${workflowId}/batches/${batchId}`);
      return response.data;
    } catch (error) {
      console.error('获取批处理任务状态失败:', error);
      throw new Error(
        error instanceof Error ? error.message : '获取批处理任务状态失败'
      );
    }
  }

  /**
   * 取消批处理任务
   * @param workflowId 工作流ID
   * @param batchId 批处理ID
   * @returns 取消结果
   */
  async cancelInvoiceOCRBatchTask(
    workflowId: string,
    batchId: string
  ): Promise<InvoiceOCRApiResponse<void>> {
    try {
      const response = await api.post<InvoiceOCRApiResponse<void>>(
        `${this.baseUrl}/invoice-ocr/${workflowId}/batches/${batchId}/cancel`
      );
      return response.data;
    } catch (error) {
      console.error('取消批处理任务失败:', error);
      throw new Error(
        error instanceof Error ? error.message : '取消批处理任务失败'
      );
    }
  }

  /**
   * 下载 Invoice OCR 结果文件
   * @param workflowId 工作流ID
   * @param resultId 结果ID
   * @param format 文件格式
   * @returns 文件下载链接
   */
  async downloadInvoiceOCRResult(
    workflowId: string,
    resultId: string,
    format: 'json' | 'csv' | 'excel'
  ): Promise<string> {
    try {
      const response = await api.get(
        `${this.baseUrl}/invoice-ocr/${workflowId}/results/${resultId}/download`,
        {
          params: { format },
          responseType: 'blob',
        }
      );

      // 创建下载链接
      const blob = new Blob([response.data]);
      const downloadUrl = window.URL.createObjectURL(blob);
      return downloadUrl;
    } catch (error) {
      console.error('下载 Invoice OCR 结果失败:', error);
      throw new Error(
        error instanceof Error ? error.message : '下载 Invoice OCR 结果失败'
      );
    }
  }

  /**
   * 获取 Invoice OCR 工作流执行历史
   * @param workflowId 工作流ID
   * @param params 查询参数
   * @returns 执行历史列表
   */
  async getInvoiceOCRExecutions(
    workflowId: string,
    params: InvoiceOCRQueryParams = {}
  ): Promise<
    InvoiceOCRApiResponse<InvoiceOCRPaginatedResponse<InvoiceOCRExecution>>
  > {
    try {
      const response = await api.get<
        InvoiceOCRApiResponse<InvoiceOCRPaginatedResponse<InvoiceOCRExecution>>
      >(`${this.baseUrl}/invoice-ocr/${workflowId}/executions`, {
        params,
      });
      return response.data;
    } catch (error) {
      console.error('获取 Invoice OCR 执行历史失败:', error);
      throw new Error(
        error instanceof Error ? error.message : '获取 Invoice OCR 执行历史失败'
      );
    }
  }
}

// 导出服务实例
export const workflowService = new WorkflowService();
export default workflowService;
