/**
 * Airtable Service for Smart Opportunities
 * 基于Airtable.js库的数据访问服务
 */

import Airtable from 'airtable';
import type {
  AirtableConfig,
  OpportunityRecord,
} from '@/types/smartOpportunities';

/**
 * Airtable服务类
 * 提供与Airtable API的交互功能
 */
export class AirtableService {
  private base: any;
  private config: AirtableConfig;

  /**
   * 构造函数
   * @param config Airtable配置
   */
  constructor(config: AirtableConfig) {
    this.config = config;

    // 初始化Airtable连接 (开发环境使用代理路径解决CORS问题)
    const isDev = process.env.NODE_ENV === 'development';
    (Airtable as any).configure({
      apiKey: config.apiKey,
      endpointUrl: isDev ? '/airtable' : 'https://api.airtable.com',
      requestTimeout: 30000, // 30 seconds
    });

    this.base = new (Airtable as any)().base(config.baseId);
  }

  /**
   * 获取所有记录
   * 支持自动分页处理
   * @param options 查询选项
   * @returns 记录数组
   */
  async getAllRecords(
    options: {
      filterByFormula?: string;
      sort?: Array<{ field: string; direction: 'asc' | 'desc' }>;
      fields?: string[];
      maxRecords?: number;
    } = {}
  ): Promise<OpportunityRecord[]> {
    try {
      const records: OpportunityRecord[] = [];
      let offset: string | undefined;

      do {
        const params: any = {
          pageSize: 100, // Airtable默认最大值
        };

        // 添加筛选条件
        if (options.filterByFormula) {
          params.filterByFormula = options.filterByFormula;
        }

        // 添加排序
        if (options.sort && options.sort.length > 0) {
          params.sort = options.sort.map(sortRule => ({
            field: sortRule.field,
            direction: sortRule.direction,
          }));
        }

        // 添加字段选择
        if (options.fields && options.fields.length > 0) {
          params.fields = options.fields;
        }

        // 添加分页偏移量
        if (offset) {
          params.offset = offset;
        }

        // 添加最大记录数限制
        if (options.maxRecords) {
          params.maxRecords = Math.min(
            options.maxRecords - records.length,
            100
          );
        }

        // 获取记录
        const result = await this.base(this.config.tableName)
          .select(params)
          .all();

        // 转换记录格式
        const convertedRecords = result.map((record: any) => ({
          id: record.id,
          fields: record.fields as OpportunityRecord['fields'],
          createdTime: record._rawJson.createdTime,
        }));

        records.push(...convertedRecords);

        // 获取下一页的offset - Airtable会在响应中返回offset用于分页
        offset = (result as any).offset;

        // 如果设置了最大记录数且已达到限制，则停止
        if (options.maxRecords && records.length >= options.maxRecords) {
          records.splice(options.maxRecords);
          offset = undefined;
        }
      } while (offset);

      return records;
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch records from Airtable');
    }
  }

  /**
   * 根据ID获取单个记录
   * @param recordId 记录ID
   * @returns 记录对象或null
   */
  async getRecord(recordId: string): Promise<OpportunityRecord | null> {
    try {
      const record = await this.base(this.config.tableName).find(recordId);

      return {
        id: record.id,
        fields: record.fields as OpportunityRecord['fields'],
        createdTime: record._rawJson.createdTime,
      };
    } catch (error) {
      // 如果记录不存在，返回null而不是抛出错误
      if (error instanceof Error && error.message.includes('NOT_FOUND')) {
        return null;
      }
      throw this.handleError(error, `Failed to fetch record ${recordId}`);
    }
  }

  /**
   * 创建新记录
   * @param fields 记录字段
   * @returns 创建的记录
   */
  async createRecord(
    fields: OpportunityRecord['fields'] | Record<string, any>
  ): Promise<OpportunityRecord> {
    try {
      console.log(
        'Creating record with fields:',
        JSON.stringify(fields, null, 2)
      );
      const record = await this.base(this.config.tableName).create(fields);
      console.log('Record created successfully:', record.id);

      return {
        id: record.id,
        fields: record.fields as OpportunityRecord['fields'],
        createdTime: record._rawJson.createdTime,
      };
    } catch (error) {
      console.error('Airtable create record error details:');
      if (error instanceof Error) {
        console.error('- Error message:', error.message);
      }
      const errorObj = error as any;
      console.error('- Error status:', errorObj?.status);
      console.error('- Error statusText:', errorObj?.statusText);
      console.error('- Fields being sent:', JSON.stringify(fields, null, 2));

      // 如果是422错误，提供更具体的错误信息
      if (errorObj?.status === 422) {
        console.error('422 Unprocessable Entity - Possible causes:');
        console.error('1. Field names do not match Airtable schema');
        console.error('2. Required fields are missing');
        console.error('3. Field data types are incorrect');
        console.error('4. Field values exceed Airtable limits');
      }

      throw this.handleError(error, 'Failed to create record in Airtable');
    }
  }

  /**
   * 更新记录
   * @param recordId 记录ID
   * @param fields 要更新的字段
   * @returns 更新后的记录
   */
  async updateRecord(
    recordId: string,
    fields: Partial<OpportunityRecord['fields']>
  ): Promise<OpportunityRecord> {
    try {
      const record = await this.base(this.config.tableName).update(
        recordId,
        fields
      );

      return {
        id: record.id,
        fields: record.fields as OpportunityRecord['fields'],
        createdTime: record._rawJson.createdTime,
      };
    } catch (error) {
      throw this.handleError(error, `Failed to update record ${recordId}`);
    }
  }

  /**
   * 删除记录
   * @param recordId 记录ID
   * @returns 删除是否成功
   */
  async deleteRecord(recordId: string): Promise<boolean> {
    try {
      await this.base(this.config.tableName).destroy(recordId);
      return true;
    } catch (error) {
      throw this.handleError(error, `Failed to delete record ${recordId}`);
    }
  }

  /**
   * 批量创建记录
   * @param records 记录数组
   * @returns 创建的记录数组
   */
  async createRecords(
    records: OpportunityRecord['fields'][]
  ): Promise<OpportunityRecord[]> {
    try {
      const createdRecords = await this.base(this.config.tableName).create(
        records
      );

      return createdRecords.map((record: any) => ({
        id: record.id,
        fields: record.fields as OpportunityRecord['fields'],
        createdTime: record._rawJson.createdTime,
      }));
    } catch (error) {
      throw this.handleError(error, 'Failed to create records in Airtable');
    }
  }

  /**
   * 根据条件搜索记录
   * @param searchCriteria 搜索条件
   * @returns 匹配的记录数组
   */
  async searchRecords(searchCriteria: {
    industry?: string;
    city?: string;
    country?: string;
    limit?: number;
  }): Promise<OpportunityRecord[]> {
    try {
      // 构建筛选公式
      const conditions: string[] = [];

      if (searchCriteria.industry) {
        conditions.push(`FIND("${searchCriteria.industry}", {industry})`);
      }

      if (searchCriteria.city) {
        conditions.push(`FIND("${searchCriteria.city}", {city})`);
      }

      if (searchCriteria.country) {
        conditions.push(`FIND("${searchCriteria.country}", {country})`);
      }

      const filterByFormula =
        conditions.length > 0 ? `AND(${conditions.join(', ')})` : undefined;

      const options: Parameters<typeof this.getAllRecords>[0] = {};
      if (filterByFormula) {
        options.filterByFormula = filterByFormula;
      }
      if (searchCriteria.limit) {
        options.maxRecords = searchCriteria.limit;
      }

      return await this.getAllRecords(options);
    } catch (error) {
      throw this.handleError(error, 'Failed to search records');
    }
  }

  /**
   * 获取表信息
   * @returns 表的基本信息
   */
  async getTableInfo(): Promise<{
    name: string;
    records: number;
  }> {
    try {
      // 获取第一页记录来获取表的基本信息
      const result = await this.base(this.config.tableName)
        .select({ pageSize: 1 })
        .all();

      return {
        name: this.config.tableName,
        records: result.length, // 这只是第一页的数量，不是总数
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to get table information');
    }
  }

  /**
   * 错误处理方法
   * @param error 原始错误
   * @param message 错误消息
   * @returns 格式化的错误
   */
  private handleError(error: any, message: string): Error {
    console.error('Airtable Service Error:', error);

    let errorMessage = message;

    if (error instanceof Error) {
      // 网络错误
      if (
        error.message.includes('fetch') ||
        error.message.includes('network')
      ) {
        errorMessage = '网络连接失败，请检查网络连接后重试';
      }
      // 认证错误
      else if (
        error.message.includes('401') ||
        error.message.includes('Unauthorized') ||
        error.message.includes('403')
      ) {
        errorMessage = 'API密钥无效、无权限或已过期';
      }
      // 参数验证错误
      else if (
        error.message.includes('400') ||
        error.message.includes('Bad Request')
      ) {
        errorMessage = '请求参数无效，请检查输入数据';
      }
      // 数据解析错误
      else if (
        error.message.includes('parsing') ||
        error.message.includes('JSON')
      ) {
        errorMessage = '数据解析失败，请联系技术支持';
      }
    }

    const enhancedError = new Error(
      `${errorMessage}: ${error?.message || 'Unknown error'}`
    );
    enhancedError.name = 'AirtableServiceError';

    // 添加额外信息
    (enhancedError as any).status = error?.status;
    (enhancedError as any).statusText = error?.statusText;
    (enhancedError as any).originalError = error;

    return enhancedError;
  }
}

/**
 * 创建Airtable服务实例的工厂函数
 * @param config Airtable配置
 * @returns AirtableService实例
 */
export function createAirtableService(config: AirtableConfig): AirtableService {
  return new AirtableService(config);
}

/**
 * 默认的Airtable配置
 * 注意：生产环境中应该从环境变量读取
 */
// 临时配置 - 使用Smart Opportunities的配置进行测试
export const defaultAirtableConfig: AirtableConfig = {
  apiKey:
    'patvF8O4h3xC5tXjc.8abec7b543876df039967d9d841b65280c1602f64c079303e88cad4d00284b7e',
  baseId: 'appU7ykK2mZQZv444', // 临时使用Smart Opportunities的base ID进行测试
  tableName: 'tblcpSWi522RM6jHa', // 使用Table ID而不是表名
};

// 用户的TK Viral Extract配置 (需要配置权限后使用)
// export const tkViralExtractConfig: AirtableConfig = {
//   apiKey: 'patvF8O4h3xC5tXjc.8abec7b543876df039967d9d841b65280c1602f64c079303e88cad4d00284b7e',
//   baseId: 'app6YKTV6RUW80S44',
//   tableName: 'TK Viral Extract',
// };
