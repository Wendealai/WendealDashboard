# 🚀 Notion Webhook 服务使用指南

## 📋 概述

本项目提供了一个专门的 **Notion Webhook 服务**，用于解决前端直接调用 Notion API 的 CORS 问题。该服务作为一个独立的 Express 服务器运行，专门处理 Notion 数据库的数据获取和处理。

## 🏗️ 系统架构

```
前端应用 (React + Vite)
    ↓ HTTP 请求
Notion Webhook 服务器 (Express)
    ↓ API 调用
Notion API
    ↓ 数据返回
前端应用 ← 数据展示
```

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动 Webhook 服务器

**方式一：独立启动**
```bash
npm run webhook
```

**方式二：开发模式（自动重启）**
```bash
npm run webhook:dev
```

**方式三：同时启动前端和webhook**
```bash
npm run dev:with-webhook
```

### 3. 验证服务状态

打开浏览器访问：
- **健康检查**: http://localhost:3001/health
- **连接测试**: http://localhost:3001/webhook/notion/test
- **数据获取**: http://localhost:3001/webhook/notion/data

## 📡 API 接口文档

### 基础信息
- **服务器地址**: `http://localhost:3001`
- **Content-Type**: `application/json`
- **认证**: 无需认证（内部服务）

### 1. 健康检查
```http
GET /health
```

**响应示例**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "notion-webhook-server"
}
```

### 2. 获取 Notion 数据
```http
POST /webhook/notion
```

**请求体**:
```json
{
  "databaseId": "266efdb673e08067908be152e0be1cdb",
  "databaseUrl": "https://www.notion.so/...",
  "sortBy": "创建时间",
  "sortDirection": "descending",
  "pageSize": 50,
  "filter": {
    "property": "状态",
    "select": {
      "equals": "活跃"
    }
  }
}
```

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "id": "record-id",
      "notionId": "record-id",
      "createdTime": "2024-01-15T10:00:00.000Z",
      "lastEditedTime": "2024-01-15T10:30:00.000Z",
      "url": "https://notion.so/...",
      "fields": {
        "标题": "示例标题",
        "内容": "示例内容",
        "平台": "TikTok",
        "播放量": 1000,
        "点赞": 50,
        "分享": 10
      }
    }
  ],
  "pagination": {
    "hasMore": false,
    "nextCursor": null
  },
  "metadata": {
    "totalRecords": 1,
    "databaseId": "266efdb673e08067908be152e0be1cdb",
    "requestTime": "2024-01-15T10:30:00.000Z"
  }
}
```

### 3. 测试连接
```http
GET /webhook/notion/test?databaseId=266efdb673e08067908be152e0be1cdb
```

### 4. 快速获取数据
```http
GET /webhook/notion/data?sortBy=创建时间&limit=50
```

## 🔧 配置说明

### 环境变量
在 `.env` 文件中配置（可选）：
```env
NOTION_API_KEY=YOUR_NOTION_API_TOKEN
WEBHOOK_PORT=3001
```

### 默认配置
- **端口**: 3001
- **CORS**: 允许 `localhost:5173`, `localhost:5182`
- **默认数据库ID**: `266efdb673e08067908be152e0be1cdb`

## 🧪 测试脚本

### 浏览器控制台测试
```javascript
// 测试连接
fetch('http://localhost:3001/webhook/notion/test')
  .then(r => r.json())
  .then(console.log);

// 获取数据
fetch('http://localhost:3001/webhook/notion', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sortBy: '创建时间',
    pageSize: 10
  })
})
.then(r => r.json())
.then(console.log);
```

### cURL 测试
```bash
# 健康检查
curl http://localhost:3001/health

# 测试连接
curl "http://localhost:3001/webhook/notion/test"

# 获取数据
curl -X POST http://localhost:3001/webhook/notion \
  -H "Content-Type: application/json" \
  -d '{"sortBy": "创建时间", "pageSize": 5}'
```

## 📊 数据处理特性

### 自动字段映射
系统自动识别和转换以下 Notion 字段类型：
- **标题 (title)**: 转换为字符串
- **文本 (rich_text)**: 转换为字符串
- **数字 (number)**: 转换为数字
- **选择 (select)**: 转换为选项名称
- **多选 (multi_select)**: 转换为选项名称数组
- **日期 (date)**: 转换为日期字符串
- **复选框 (checkbox)**: 转换为布尔值
- **URL**: 转换为URL字符串

### 智能排序
支持按以下字段排序：
- `创建时间` (默认)
- `标题`
- `更新时间`
- 任何数字字段

### 分页支持
- 最大每页 100 条记录
- 支持游标分页
- 自动处理 `has_more` 和 `next_cursor`

## 🔍 调试和监控

### 日志输出
服务器会在控制台显示详细日志：
```
🚀 Notion Webhook Server started on http://localhost:3001
📡 收到Notion webhook请求: {...}
🔗 调用Notion API: {...}
📡 Notion API响应状态: 200
✅ Notion API响应数据: {...}
✅ Webhook处理完成，耗时: 150ms，返回 25 条记录
```

### 错误处理
- 网络错误自动重试
- API错误详细记录
- 优雅降级处理

## 🛠️ 故障排除

### 常见问题

#### 1. 端口被占用
```bash
# 查看端口占用
netstat -ano | findstr :3001

# 杀死进程（Windows）
taskkill /PID <PID> /F

# 或使用其他端口
WEBHOOK_PORT=3002 npm run webhook
```

#### 2. CORS 错误
确保前端请求包含正确的 Origin：
```javascript
fetch('http://localhost:3001/webhook/notion', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({...})
});
```

#### 3. Notion API 错误
检查：
- API 密钥是否正确
- 数据库权限是否已配置
- 数据库ID是否正确

### 调试步骤

1. **检查服务器状态**
   ```bash
   curl http://localhost:3001/health
   ```

2. **测试连接**
   ```bash
   curl "http://localhost:3001/webhook/notion/test"
   ```

3. **查看详细日志**
   - 服务器控制台输出
   - 浏览器开发者工具 Network 标签

## 📈 性能优化

### 缓存策略
- 短期缓存 API 响应
- 智能缓存数据库结构信息

### 并发控制
- 限制同时请求数量
- 请求队列管理

### 错误恢复
- 自动重试失败请求
- 降级到本地数据

## 🔄 集成说明

### 前端集成
```typescript
// 调用webhook获取数据
const response = await fetch('http://localhost:3001/webhook/notion', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sortBy: '创建时间',
    pageSize: 50
  })
});

const result = await response.json();
if (result.success) {
  console.log('获取到数据:', result.data);
}
```

### 生产部署
1. 配置反向代理
2. 设置环境变量
3. 配置 HTTPS
4. 设置监控和日志

## 📚 相关链接

- [Notion API 文档](https://developers.notion.com/)
- [Express.js 文档](https://expressjs.com/)
- [CORS 说明](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

## 🎯 使用示例

### 基本数据获取
```bash
curl -X POST http://localhost:3001/webhook/notion \
  -H "Content-Type: application/json" \
  -d '{"sortBy": "创建时间", "pageSize": 10}'
```

### 高级查询
```bash
curl -X POST http://localhost:3001/webhook/notion \
  -H "Content-Type: application/json" \
  -d '{
    "sortBy": "播放量",
    "sortDirection": "descending",
    "pageSize": 20,
    "filter": {
      "property": "状态",
      "select": {"equals": "发布"}
    }
  }'
```

**🚀 Notion Webhook 服务已准备就绪，可以开始处理 Notion 数据请求了！**
