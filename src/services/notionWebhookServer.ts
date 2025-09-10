/**
 * Notion Webhook Server
 * 独立的Express服务器处理Notion数据请求
 */

import express from 'express';
import cors from 'cors';
import { handleNotionWebhook, testNotionConnection, NotionWebhookRequest } from './notionWebhookService';

export class NotionWebhookServer {
  private app: express.Application;
  private port: number;

  constructor(port = 3001) {
    this.port = port;
    this.app = express();

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * 设置中间件
   */
  private setupMiddleware() {
    // CORS配置
    this.app.use(cors({
      origin: ['http://localhost:5173', 'http://localhost:5182', 'http://127.0.0.1:5173', 'http://127.0.0.1:5182'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true
    }));

    // JSON解析
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // 请求日志
    this.app.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
      next();
    });
  }

  /**
   * 设置路由
   */
  private setupRoutes() {
    // 健康检查
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'notion-webhook-server'
      });
    });

    // Notion数据获取webhook
    this.app.post('/webhook/notion', async (req, res) => {
      try {
        console.log('📡 收到Notion webhook请求:', req.body);

        const request: NotionWebhookRequest = {
          databaseId: req.body.databaseId,
          databaseUrl: req.body.databaseUrl,
          sortBy: req.body.sortBy,
          sortDirection: req.body.sortDirection,
          filter: req.body.filter,
          pageSize: req.body.pageSize,
          startCursor: req.body.startCursor
        };

        const response = await handleNotionWebhook(request);

        res.json(response);

      } catch (error) {
        console.error('❌ Webhook处理错误:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : '未知错误',
          timestamp: new Date().toISOString()
        });
      }
    });

    // 测试连接
    this.app.get('/webhook/notion/test', async (req, res) => {
      try {
        const databaseId = req.query.databaseId as string;
        const isConnected = await testNotionConnection(databaseId);

        res.json({
          success: true,
          connected: isConnected,
          databaseId: databaseId || 'default',
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('❌ 连接测试错误:', error);
        res.status(500).json({
          success: false,
          connected: false,
          error: error instanceof Error ? error.message : '未知错误',
          timestamp: new Date().toISOString()
        });
      }
    });

    // 获取默认数据库数据
    this.app.get('/webhook/notion/data', async (req, res) => {
      try {
        const sortBy = req.query.sortBy as string || '创建时间';
        const limit = parseInt(req.query.limit as string) || 50;

        const response = await handleNotionWebhook({
          sortBy,
          pageSize: limit
        });

        res.json(response);

      } catch (error) {
        console.error('❌ 数据获取错误:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : '未知错误',
          timestamp: new Date().toISOString()
        });
      }
    });

    // 404处理
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint not found',
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });
    });

    // 错误处理中间件
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('❌ 服务器错误:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * 启动服务器
   */
  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.app.listen(this.port, '0.0.0.0', () => {
          console.log(`🚀 Notion Webhook Server started on http://localhost:${this.port}`);
          console.log(`📡 Webhook endpoint: http://localhost:${this.port}/webhook/notion`);
          console.log(`🔍 Test endpoint: http://localhost:${this.port}/webhook/notion/test`);
          console.log(`📊 Data endpoint: http://localhost:${this.port}/webhook/notion/data`);
          console.log(`💚 Health check: http://localhost:${this.port}/health`);
          resolve();
        }).on('error', (error) => {
          console.error('❌ 服务器启动失败:', error);
          reject(error);
        });
      } catch (error) {
        console.error('❌ 服务器启动异常:', error);
        reject(error);
      }
    });
  }

  /**
   * 停止服务器
   */
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      console.log('🛑 正在停止Notion Webhook Server...');
      // Express没有直接的close方法，这里简化处理
      resolve();
    });
  }

  /**
   * 获取服务器实例（用于测试）
   */
  getApp(): express.Application {
    return this.app;
  }
}

// 创建服务器实例
export const notionWebhookServer = new NotionWebhookServer();

// 如果直接运行此文件，则启动服务器
if (require.main === module) {
  notionWebhookServer.start().catch((error) => {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  });

  // 优雅关闭
  process.on('SIGINT', async () => {
    console.log('\n📴 接收到SIGINT，正在关闭服务器...');
    await notionWebhookServer.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n📴 接收到SIGTERM，正在关闭服务器...');
    await notionWebhookServer.stop();
    process.exit(0);
  });
}

export default notionWebhookServer;
