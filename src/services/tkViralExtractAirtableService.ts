/**
 * TK Viral Extract Airtable Service
 * 专门为TK Viral Extract工作流设计的Airtable数据服务
 * 基于Smart Opportunities的架构，适配TK Viral Extract的数据结构
 */

import Airtable from 'airtable';
import type { ViralContentRecord } from '@/pages/SocialMedia/types';

/**
 * TK Viral Extract Airtable配置
 */
export interface TKViralExtractAirtableConfig {
  apiKey: string;
  baseId: string;
  tableName: string;
  viewName?: string | undefined;
}

/**
 * TK Viral Extract Airtable服务类
 * 提供与Airtable API的交互功能，专门处理病毒内容数据
 */
export class TKViralExtractAirtableService {
  private base: Airtable.Base;
  private config: TKViralExtractAirtableConfig;
  private retryCount = 3;
  private retryDelay = 1000; // 1 second

  /**
   * 构造函数
   * @param config Airtable配置
   */
  constructor(config: TKViralExtractAirtableConfig) {
    this.config = config;

    // 初始化Airtable连接 (开发环境使用代理路径解决CORS问题)
    const isDev = process.env.NODE_ENV === 'development';
    Airtable.configure({
      apiKey: config.apiKey,
      endpointUrl: isDev ? '/airtable' : 'https://api.airtable.com',
      requestTimeout: 30000, // 30 seconds
    });

    this.base = new Airtable().base(config.baseId);
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
      maxRecords?: number;
      view?: string;
    } = {}
  ): Promise<ViralContentRecord[]> {
    const { filterByFormula, sort, maxRecords } = options;

    return new Promise((resolve, reject) => {
      const records: ViralContentRecord[] = [];

      const selectParams: any = {
        // 移除view参数，与Smart Opportunities保持一致
      };

      // 只在参数不为undefined且不为空字符串时才添加
      if (filterByFormula !== undefined && filterByFormula !== '') {
        selectParams.filterByFormula = filterByFormula;
      }
      if (sort !== undefined && sort.length > 0) {
        selectParams.sort = sort;
      }
      if (maxRecords !== undefined) {
        selectParams.maxRecords = maxRecords;
      }

      this.base(this.config.tableName)
        .select(selectParams)
        .eachPage(
          (pageRecords, fetchNextPage) => {
            // 处理当前页的记录
            pageRecords.forEach(record => {
              records.push(this.convertAirtableRecord(record));
            });

            // 获取下一页
            fetchNextPage();
          },
          err => {
            if (err) {
              console.error('Airtable API error:', err);
              reject(err);
            } else {
              console.log(
                `Successfully fetched ${records.length} records from Airtable`
              );
              resolve(records);
            }
          }
        );
    });
  }

  /**
   * 根据ID获取单个记录
   * @param recordId 记录ID
   * @returns 记录数据
   */
  async getRecordById(recordId: string): Promise<ViralContentRecord | null> {
    try {
      const record = await this.base(this.config.tableName).find(recordId);
      return this.convertAirtableRecord(record);
    } catch (error) {
      console.error('Failed to get record by ID:', error);
      return null;
    }
  }

  /**
   * 创建新记录
   * @param fields 记录字段
   * @returns 创建的记录
   */
  async createRecord(fields: Record<string, any>): Promise<ViralContentRecord> {
    try {
      const record = await this.base(this.config.tableName).create(fields);
      console.log('Record created successfully:', record.id);
      return this.convertAirtableRecord(record);
    } catch (error) {
      console.error('Failed to create record:', error);
      throw error;
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
    fields: Record<string, any>
  ): Promise<ViralContentRecord> {
    try {
      const record = await this.base(this.config.tableName).update(
        recordId,
        fields
      );
      console.log('Record updated successfully:', recordId);
      return this.convertAirtableRecord(record);
    } catch (error) {
      console.error('Failed to update record:', error);
      throw error;
    }
  }

  /**
   * 删除记录
   * @param recordId 记录ID
   * @returns 删除结果
   */
  async deleteRecord(recordId: string): Promise<boolean> {
    try {
      await this.base(this.config.tableName).destroy(recordId);
      console.log('Record deleted successfully:', recordId);
      return true;
    } catch (error) {
      console.error('Failed to delete record:', error);
      return false;
    }
  }

  /**
   * 批量更新记录
   * @param updates 更新数组
   * @returns 更新结果
   */
  async batchUpdateRecords(
    updates: Array<{ id: string; fields: Record<string, any> }>
  ): Promise<ViralContentRecord[]> {
    try {
      const records = await this.base(this.config.tableName).update(updates);
      console.log(`Batch updated ${records.length} records`);
      return records.map(record => this.convertAirtableRecord(record));
    } catch (error) {
      console.error('Failed to batch update records:', error);
      throw error;
    }
  }

  /**
   * 根据关键词搜索记录
   * @param keyword 搜索关键词
   * @param fields 要搜索的字段数组
   * @param maxRecords 最大返回记录数
   * @returns 搜索结果
   */
  async searchRecords(
    keyword: string,
    fields: string[] = ['title', 'content', 'platform', 'creator'],
    maxRecords: number = 100
  ): Promise<ViralContentRecord[]> {
    if (!keyword.trim()) {
      return this.getAllRecords({ maxRecords });
    }

    // 构建搜索公式
    const searchConditions = fields.map(
      field => `FIND("${keyword.toLowerCase()}", LOWER({${field}}))`
    );

    const filterByFormula = `OR(${searchConditions.join(', ')})`;

    return this.getAllRecords({
      filterByFormula,
      maxRecords,
      // 移除createdTime排序，因为字段已被删除
    });
  }

  /**
   * 获取记录统计信息
   * @returns 统计数据
   */
  async getStatistics(): Promise<{
    totalRecords: number;
    platformStats: Record<string, number>;
    recentRecords: number;
  }> {
    try {
      const allRecords = await this.getAllRecords();

      // 平台统计
      const platformStats: Record<string, number> = {};
      allRecords.forEach(record => {
        const platform = record.fields?.platform || '未知';
        platformStats[platform] = (platformStats[platform] || 0) + 1;
      });

      // 最近7天记录数
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentRecords = allRecords.filter(record => {
        const recordDate = new Date(record.createdTime || 0);
        return recordDate >= sevenDaysAgo;
      }).length;

      return {
        totalRecords: allRecords.length,
        platformStats,
        recentRecords,
      };
    } catch (error) {
      console.error('Failed to get statistics:', error);
      return {
        totalRecords: 0,
        platformStats: {},
        recentRecords: 0,
      };
    }
  }

  /**
   * 转换Airtable记录为ViralContentRecord格式
   * @param record Airtable记录
   * @returns 转换后的记录
   */
  private convertAirtableRecord(record: any): ViralContentRecord {
    return {
      id: record.id,
      fields: {
        title:
          record.fields['标题'] ||
          record.fields['Title'] ||
          record.fields['Name'] ||
          '',
        content:
          record.fields['内容'] ||
          record.fields['Content'] ||
          record.fields['Description'] ||
          '',
        platform: record.fields['平台'] || record.fields['Platform'] || '未知',
        views:
          record.fields['播放量'] ||
          record.fields['观看量'] ||
          record.fields['Views'] ||
          0,
        likes: record.fields['点赞'] || record.fields['Likes'] || 0,
        shares: record.fields['分享'] || record.fields['Shares'] || 0,
        creator:
          record.fields['创作者'] ||
          record.fields['Creator'] ||
          record.fields['Author'] ||
          '',
        viralScore:
          record.fields['病毒得分'] || record.fields['Viral Score'] || 0,
        url:
          record.fields['链接'] ||
          record.fields['URL'] ||
          record.fields['Link'] ||
          '',
        contactInfo:
          record.fields['联系方式'] || record.fields['Contact'] || '',
      },
      createdTime: record._rawJson.createdTime || new Date().toISOString(),
    };
  }
}

/**
 * 创建TK Viral Extract Airtable服务实例
 * @param config 配置对象
 * @returns 服务实例
 */
export const createTKViralExtractAirtableService = (
  config: TKViralExtractAirtableConfig
): TKViralExtractAirtableService => {
  return new TKViralExtractAirtableService(config);
};

/**
 * 默认TK Viral Extract Airtable配置
 */
// TK Viral Extract Airtable配置 - 复制Smart Opportunities的API Key
export const defaultTKViralExtractAirtableConfig: TKViralExtractAirtableConfig =
  {
    apiKey:
      'patvF8O4h3xC5tXjc.8abec7b543876df039967d9d841b65280c1602f64c079303e88cad4d00284b7e', // 复制Smart Opportunities的完整API Key
    baseId: 'app6YKTV6RUW80S44', // Base ID from new URL
    tableName: 'shrxS5YLNuAycKmQP', // 从新URL提取的标识符，尝试作为Table ID
    // viewName: undefined, // 移除view参数，与Smart Opportunities保持一致
  };

// ✅ CONFIGURATION UPDATED - 使用新URL: https://airtable.com/app6YKTV6RUW80S44/shrxS5YLNuAycKmQP
//
// 📋 当前状态：
// - Base ID: app6YKTV6RUW80S44 ✅
// - Table ID: shrxS5YLNuAycKmQP ✅ (从新URL提取)
// - API Key: patvF8O4h3xC5tXjc.8abec7b543876df039967d9d841b65280c1602f64c079303e88cad4d00284b7e ✅ (Smart Opportunities的完整token)
// - View参数: 已移除 ✅
//
// 🔐 API权限配置（基于Airtable API文档）：
// 如果仍然遇到403错误，需要在Airtable中配置Token权限：
// 1. 访问: https://airtable.com/developers/web/api/introduction
// 2. 找到Personal Access Token: patvF8O4h3xC5tXjc...
// 3. 在"Bases"部分添加: app6YKTV6RUW80S44
// 4. 在"Scopes"部分确保包含:
//    - data.records:read (读取记录)
//    - data.records:write (写入记录)
//    - schema.bases:read (读取base结构)
//
// 📖 API文档参考:
// - Base API文档: https://airtable.com/app6YKTV6RUW80S44/api/docs
// - 认证文档: https://airtable.com/app6YKTV6RUW80S44/api/docs#curl/authentication
// - Personal Access Tokens: https://airtable.com/developers/web/api/introduction
//
// 🧪 测试连接：
// 1. 点击界面上的"🔍 调试连接"按钮
// 2. 应该看到连接成功的消息
//
// 🔍 调试工具:
// - node find-table-id.mjs (现在使用相同的完整API key)

/**
 * 调试函数 - 检查API连接状态
 */
export const debugAirtableConnection = async () => {
  console.log('🔍 Airtable Connection Debug Info:');
  console.log(
    'API Key (first 10 chars):',
    defaultTKViralExtractAirtableConfig.apiKey.substring(0, 10) + '...'
  );
  console.log('Base ID:', defaultTKViralExtractAirtableConfig.baseId);
  console.log('Table Name:', defaultTKViralExtractAirtableConfig.tableName);
  console.log('View Name:', defaultTKViralExtractAirtableConfig.viewName);

  const service = createTKViralExtractAirtableService(
    defaultTKViralExtractAirtableConfig
  );

  try {
    console.log('🧪 Testing connection...');
    const records = await service.getAllRecords({ maxRecords: 1 });
    console.log('✅ Connection successful! Records found:', records.length);
    return { success: true, records: records.length };
  } catch (error) {
    console.error('❌ Connection failed:', error);
    return { success: false, error };
  }
};

/**
 * 默认服务实例
 */
export const defaultTKViralExtractAirtableService =
  createTKViralExtractAirtableService(defaultTKViralExtractAirtableConfig);

export default TKViralExtractAirtableService;
