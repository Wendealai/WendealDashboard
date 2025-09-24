/**
 * Notion Webhook Service
 * 处理Notion数据库数据获取的专用服务
 */

export interface NotionWebhookRequest {
  databaseId?: string;
  databaseUrl?: string;
  sortBy?: string;
  sortDirection?: 'ascending' | 'descending';
  filter?: any;
  pageSize?: number;
  startCursor?: string;
}

export interface NotionWebhookResponse {
  success: boolean;
  data?: any[];
  error?: string;
  pagination?: {
    hasMore: boolean;
    nextCursor?: string;
  };
  metadata?: {
    totalRecords?: number;
    databaseId: string;
    requestTime: string;
  };
}

class NotionWebhookService {
  private readonly NOTION_API_KEY =
    process.env.NOTION_API_KEY ?? 'YOUR_NOTION_API_TOKEN';
  private readonly NOTION_API_BASE = 'https://api.notion.com/v1';
  private readonly DEFAULT_DATABASE_ID = '266efdb673e08067908be152e0be1cdb';

  /**
   * 从Notion URL中提取数据库ID
   */
  private extractDatabaseId(url: string): string {
    try {
      // 从Notion分享链接中提取数据库ID
      const match = url.match(/\/([a-f0-9]{32})\?/);
      return match && match[1] ? match[1] : this.DEFAULT_DATABASE_ID;
    } catch (error) {
      console.warn('无法从URL提取数据库ID，使用默认ID:', error);
      return this.DEFAULT_DATABASE_ID;
    }
  }

  /**
   * 构建Notion API请求体
   */
  private buildRequestBody(request: NotionWebhookRequest) {
    const body: any = {};

    // 排序配置
    if (request.sortBy) {
      body.sorts = [
        {
          property: request.sortBy,
          direction: request.sortDirection || 'descending',
        },
      ];
    } else {
      // 默认按创建时间降序排序
      body.sorts = [
        {
          property: '创建时间',
          direction: 'descending',
        },
      ];
    }

    // 过滤器
    if (request.filter) {
      body.filter = request.filter;
    }

    // 分页
    if (request.pageSize) {
      body.page_size = Math.min(request.pageSize, 100); // Notion API最大100条
    }

    if (request.startCursor) {
      body.start_cursor = request.startCursor;
    }

    return body;
  }

  /**
   * 调用Notion API获取数据库数据
   */
  private async callNotionAPI(
    databaseId: string,
    requestBody: any
  ): Promise<any> {
    const url = `${this.NOTION_API_BASE}/databases/${databaseId}/query`;

    console.log('🔗 调用Notion API:', {
      url,
      method: 'POST',
      body: requestBody,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('📡 Notion API响应状态:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Notion API错误:', errorText);
      throw new Error(
        `Notion API请求失败: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    console.log('✅ Notion API响应数据:', {
      hasResults: !!data.results,
      resultCount: data.results?.length || 0,
      hasMore: data.has_more,
      nextCursor: data.next_cursor,
    });

    return data;
  }

  /**
   * 处理和格式化Notion数据
   */
  private processNotionData(rawData: any): any[] {
    if (!rawData.results || !Array.isArray(rawData.results)) {
      console.warn('⚠️ Notion API返回的数据格式异常');
      return [];
    }

    return rawData.results.map((item: any, index: number) => {
      try {
        const properties = item.properties || {};

        // 提取常用字段
        const processedItem: any = {
          id: item.id,
          notionId: item.id,
          createdTime: item.created_time,
          lastEditedTime: item.last_edited_time,
          url: item.url,
          fields: {},
        };

        // 处理各个属性
        Object.keys(properties).forEach(key => {
          const prop = properties[key];

          switch (prop.type) {
            case 'title':
              processedItem.fields[key] = prop.title?.[0]?.plain_text || '';
              break;
            case 'rich_text':
              processedItem.fields[key] = prop.rich_text?.[0]?.plain_text || '';
              break;
            case 'number':
              processedItem.fields[key] = prop.number || 0;
              break;
            case 'select':
              processedItem.fields[key] = prop.select?.name || '';
              break;
            case 'multi_select':
              processedItem.fields[key] =
                prop.multi_select?.map((item: any) => item.name) || [];
              break;
            case 'date':
              processedItem.fields[key] = prop.date?.start || '';
              break;
            case 'checkbox':
              processedItem.fields[key] = prop.checkbox || false;
              break;
            case 'url':
              processedItem.fields[key] = prop.url || '';
              break;
            default:
              processedItem.fields[key] = prop[prop.type] || '';
          }
        });

        return processedItem;
      } catch (error) {
        console.error(`❌ 处理第${index + 1}条数据时出错:`, error);
        return {
          id: item.id || `error-${index}`,
          error: `数据处理失败: ${error instanceof Error ? error.message : '未知错误'}`,
          rawData: item,
        };
      }
    });
  }

  /**
   * 主webhook处理方法
   */
  async handleWebhook(
    request: NotionWebhookRequest
  ): Promise<NotionWebhookResponse> {
    const startTime = Date.now();

    try {
      console.log('🚀 开始处理Notion webhook请求:', request);

      // 确定数据库ID
      const databaseId =
        request.databaseId ||
        (request.databaseUrl
          ? this.extractDatabaseId(request.databaseUrl)
          : null) ||
        this.DEFAULT_DATABASE_ID;

      console.log('📊 使用数据库ID:', databaseId);

      // 构建请求体
      const requestBody = this.buildRequestBody(request);

      // 调用Notion API
      const rawData = await this.callNotionAPI(databaseId, requestBody);

      // 处理数据
      const processedData = this.processNotionData(rawData);

      // 构建响应
      const response: NotionWebhookResponse = {
        success: true,
        data: processedData,
        pagination: {
          hasMore: rawData.has_more || false,
          nextCursor: rawData.next_cursor,
        },
        metadata: {
          totalRecords: processedData.length,
          databaseId,
          requestTime: new Date().toISOString(),
        },
      };

      const processingTime = Date.now() - startTime;
      console.log(
        `✅ Webhook处理完成，耗时: ${processingTime}ms，返回 ${processedData.length} 条记录`
      );

      return response;
    } catch (error) {
      console.error('❌ Webhook处理失败:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
        metadata: {
          databaseId: request.databaseId || this.DEFAULT_DATABASE_ID,
          requestTime: new Date().toISOString(),
        },
      };
    }
  }

  /**
   * 便捷方法：获取默认数据库数据
   */
  async getDefaultDatabaseData(
    sortBy = '创建时间',
    limit = 50
  ): Promise<NotionWebhookResponse> {
    return this.handleWebhook({
      databaseId: this.DEFAULT_DATABASE_ID,
      sortBy,
      sortDirection: 'descending',
      pageSize: limit,
    });
  }

  /**
   * 测试连接
   */
  async testConnection(
    databaseId = this.DEFAULT_DATABASE_ID
  ): Promise<boolean> {
    try {
      console.log('🧪 测试Notion API连接...');

      const response = await fetch(
        `${this.NOTION_API_BASE}/databases/${databaseId}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${this.NOTION_API_KEY}`,
            'Notion-Version': '2022-06-28',
          },
        }
      );

      console.log('🔍 连接测试结果:', response.status, response.statusText);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ 连接成功，数据库信息:', {
          title: data.title?.[0]?.plain_text || '未知',
          id: data.id,
        });
        return true;
      } else {
        console.error('❌ 连接失败:', await response.text());
        return false;
      }
    } catch (error) {
      console.error('❌ 连接测试出错:', error);
      return false;
    }
  }
}

// 创建单例实例
export const notionWebhookService = new NotionWebhookService();

// 导出便捷方法
export const handleNotionWebhook = (request: NotionWebhookRequest) =>
  notionWebhookService.handleWebhook(request);

export const getDefaultNotionData = (sortBy?: string, limit?: number) =>
  notionWebhookService.getDefaultDatabaseData(sortBy, limit);

export const testNotionConnection = (databaseId?: string) =>
  notionWebhookService.testConnection(databaseId);

export default notionWebhookService;
