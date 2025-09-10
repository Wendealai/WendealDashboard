/**
 * TK Webhook服务 - 遵循spec-workflow规范
 * 处理TK Viral Extract的webhook调用
 */

import type { WorkflowParameters } from '@/pages/SocialMedia/types';

export interface WebhookResponse {
  success: boolean;
  message: string;
  data?: any;
  executionId?: string;
  workflowId?: string;
}

export interface SpecWorkflowWebhookPayload {
  // 工作流规范字段
  workflowId: string;
  executionId: string;
  trigger: 'manual';
  timestamp: string;

  // 业务参数
  parameters: {
    keyword: string;
    offset?: string;
    count?: string;
    sortMethod?: string;
    timeRange?: string;
  };

  // 元数据
  metadata: {
    source: 'tk-viral-extract';
    version: '1.0.0';
    userAgent: string;
  };
}

export class TKWebhookService {
  private readonly webhookUrl = '/webhook/tkextract'; // 使用代理路径
  private readonly timeout = 60000; // 60秒超时（增加超时时间）
  private readonly workflowId = 'tk-viral-extract-workflow';
  private readonly retryAttempts = 3;
  private readonly retryDelay = 1000; // 1秒重试延迟

  /**
   * 发送参数到webhook（遵循spec-workflow规范）
   */
  async sendParameters(params: WorkflowParameters): Promise<WebhookResponse> {
    const executionId = `tk-exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    console.log('🔄 发送参数到webhook (Spec-Workflow规范):', {
      executionId,
      params
    });

    // 构建规范化的payload
    const payload: SpecWorkflowWebhookPayload = {
      workflowId: this.workflowId,
      executionId,
      trigger: 'manual',
      timestamp: new Date().toISOString(),

      parameters: {
        keyword: params.keyword.trim(),
        offset: params.offset || '0',
        count: params.count || '20',
        sortMethod: params.sortMethod || '0',
        timeRange: params.timeRange || '7'
      },

      metadata: {
        source: 'tk-viral-extract',
        version: '1.0.0',
        userAgent: navigator.userAgent
      }
    };

    // 重试逻辑
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        console.log(`📡 Webhook调用尝试 ${attempt}/${this.retryAttempts}`);

        const response = await this.makeWebhookRequest(payload);

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Webhook响应成功:', result);

          return {
            success: true,
            message: '工作流已成功触发',
            data: result,
            executionId,
            workflowId: this.workflowId
          };
        } else {
          const errorText = await response.text();
          console.warn(`⚠️ Webhook调用失败 (${response.status}):`, errorText);

          // 如果是最后一次尝试，抛出错误
          if (attempt === this.retryAttempts) {
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }
        }

      } catch (error) {
        console.error(`❌ Webhook调用异常 (尝试 ${attempt}):`, error);

        // 如果是最后一次尝试，返回失败结果
        if (attempt === this.retryAttempts) {
          let errorMessage = '网络请求失败';
          if (error instanceof Error) {
            if (error.name === 'AbortError') {
              errorMessage = '请求超时，请稍后重试';
            } else if (error.message.includes('Failed to fetch')) {
              errorMessage = '网络连接失败，请检查网络设置';
            } else {
              errorMessage = error.message;
            }
          }

          return {
            success: false,
            message: errorMessage,
            data: null,
            executionId,
            workflowId: this.workflowId
          };
        }

        // 等待重试
        if (attempt < this.retryAttempts) {
          console.log(`⏳ 等待 ${this.retryDelay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }

    // 这行代码不会执行到，但为了类型安全
    return {
      success: false,
      message: '所有重试都失败了',
      data: null,
      executionId,
      workflowId: this.workflowId
    };
  }

  /**
   * 实际执行webhook请求
   */
  private async makeWebhookRequest(payload: SpecWorkflowWebhookPayload): Promise<Response> {
    return fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Workflow-ID': payload.workflowId,
        'X-Execution-ID': payload.executionId,
        'X-Source': 'tk-viral-extract-dashboard',
        'X-Version': '1.0.0'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeout),
    });
  }

  /**
   * 测试webhook连接
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 测试webhook连接...');

      const response = await fetch(this.webhookUrl, {
        method: 'HEAD',
        headers: {
          'X-Test-Connection': 'true'
        },
        signal: AbortSignal.timeout(10000) // 10秒超时
      });

      const isConnected = response.status < 500;
      console.log(`📡 Webhook连接测试: ${isConnected ? '成功' : '失败'} (${response.status})`);

      return isConnected;
    } catch (error) {
      console.error('❌ Webhook连接测试失败:', error);
      return false;
    }
  }
}

export const tkWebhookService = new TKWebhookService();
