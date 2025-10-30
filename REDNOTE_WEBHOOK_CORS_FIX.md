# Rednote Content Generator CORS 错误修复指南

## 问题描述

在调用 n8n webhook 时出现 CORS 错误：

```
Cross-Origin Request Blocked: The Same Origin Policy disallows reading the remote resource at https://n8n.wendealai.com/webhook/Rednotecontent. (Reason: CORS header 'Access-Control-Allow-Origin' missing). Status code: 524.
```

## 错误原因

### 1. CORS（跨域资源共享）问题

- 前端运行在一个域名（例如：`http://localhost:5173` 或 `https://yourdomain.com`）
- Webhook 运行在另一个域名（`https://n8n.wendealai.com`）
- 浏览器安全策略阻止跨域请求，除非服务器明确允许

### 2. 524 错误（Cloudflare 超时）

- n8n workflow 处理时间过长（超过100秒）
- Cloudflare 默认超时设置太短

## 解决方案

### 方案 1：配置 n8n Webhook CORS（推荐）

在 n8n workflow 的 Webhook 节点中添加响应头：

#### 步骤：

1. 打开 n8n workflow：`Rednotecontent`
2. 找到 Webhook 节点
3. 在 Webhook 节点设置中，添加 **Response Headers**：

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

#### 更安全的配置（生产环境推荐）：

```
Access-Control-Allow-Origin: https://your-dashboard-domain.com
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
Access-Control-Max-Age: 86400
```

#### n8n Webhook 节点配置示例：

**Webhook 节点配置：**

- HTTP Method: `POST`
- Path: `Rednotecontent`
- Response Mode: `Using 'Respond to Webhook' Node`

**在 workflow 最后添加 "Respond to Webhook" 节点：**

- Response Body: `{{ $json }}`
- Response Headers:
  ```json
  {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  }
  ```

### 方案 2：处理 OPTIONS 预检请求

浏览器会先发送 OPTIONS 请求检查是否允许跨域，需要在 n8n 中处理：

#### 添加 OPTIONS 处理分支：

1. 在 Webhook 节点后添加 **IF 节点**
2. 条件：`{{ $node["Webhook"].context.method === "OPTIONS" }}`
3. TRUE 分支：直接返回 CORS 头
4. FALSE 分支：继续正常流程

**TRUE 分支的 Respond to Webhook 配置：**

```json
{
  "statusCode": 204,
  "headers": {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  }
}
```

### 方案 3：Cloudflare 超时设置

如果是 Cloudflare Enterprise 用户，可以增加超时限制：

1. 登录 Cloudflare Dashboard
2. 进入你的域名设置
3. 找到 **Network** → **WebSockets**
4. 增加超时时间到 300 秒

**如果不是 Enterprise 用户：**

- 优化 n8n workflow，减少处理时间
- 使用异步模式（见方案 4）

### 方案 4：使用异步 Webhook（推荐用于长时间任务）

#### 修改为异步模式：

1. **立即响应模式**
   - Webhook 接收请求后立即返回 `202 Accepted`
   - 将任务放入队列异步处理
   - 完成后通过回调或轮询获取结果

2. **n8n workflow 结构：**

```
Webhook (接收请求)
  ↓
Respond to Webhook (立即返回202)
  ↓
Set (保存到数据库/队列)
  ↓
HTTP Request (回调通知前端 - 可选)
```

3. **前端轮询检查：**

```typescript
// 发送请求
const response = await fetch(webhookUrl, { ... });
const { taskId } = await response.json();

// 轮询检查结果
const checkResult = async () => {
  const result = await fetch(`${webhookUrl}/status/${taskId}`);
  if (result.status === 'completed') {
    return result.data;
  }
  // 继续轮询
  setTimeout(checkResult, 2000);
};
```

### 方案 5：使用代理（临时方案，不推荐生产环境）

在开发环境使用 Vite 代理：

#### vite.config.ts

```typescript
export default defineConfig({
  server: {
    proxy: {
      '/api/webhook': {
        target: 'https://n8n.wendealai.com',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api\/webhook/, '/webhook'),
      },
    },
  },
});
```

#### 前端代码修改：

```typescript
// 开发环境使用代理
const webhookUrl = import.meta.env.DEV
  ? '/api/webhook/Rednotecontent'
  : 'https://n8n.wendealai.com/webhook/Rednotecontent';
```

## 前端已实现的优化

### 1. 超时控制

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 150000); // 150秒超时
```

### 2. 详细错误提示

- CORS 错误 → 提示配置服务器
- 网络错误 → 提示检查连接
- 超时错误 → 提示重试

### 3. 移除可能触发预检请求的头

- 已移除 `User-Agent` 自定义头
- 只保留 `Content-Type: application/json`

## 测试步骤

### 1. 测试 CORS 配置

```bash
# 使用 curl 测试 OPTIONS 请求
curl -X OPTIONS https://n8n.wendealai.com/webhook/Rednotecontent \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v
```

**期望响应头：**

```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### 2. 测试 POST 请求

```bash
curl -X POST https://n8n.wendealai.com/webhook/Rednotecontent \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:5173" \
  -d '{"content":"test","timestamp":"2025-01-29T00:00:00.000Z"}' \
  -v
```

**期望响应头包含：**

```
Access-Control-Allow-Origin: *
Content-Type: application/json
```

## 推荐配置（生产环境）

### n8n Workflow 最佳实践

```
1. Webhook 节点
   - HTTP Method: POST
   - 启用 CORS

2. IF 节点（处理 OPTIONS）
   - 条件: method === "OPTIONS"
   - TRUE: 返回 CORS 头（204）
   - FALSE: 继续处理

3. 业务逻辑节点
   - AI 生成
   - 数据处理
   - 保存到 Google Sheets

4. Respond to Webhook 节点
   - 返回结果 + CORS 头
   - Status: 200
   - Headers: CORS 配置
```

### 完整的 Respond to Webhook 配置

```json
{
  "statusCode": 200,
  "headers": {
    "Access-Control-Allow-Origin": "https://your-domain.com",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY"
  },
  "body": "={{ $json }}"
}
```

## 故障排查

### 检查清单

- [ ] n8n Webhook 是否配置了 CORS 头？
- [ ] 是否处理了 OPTIONS 预检请求？
- [ ] Cloudflare 是否有超时限制？
- [ ] workflow 处理时间是否过长？
- [ ] 前端请求头是否正确？
- [ ] 网络连接是否正常？

### 常见错误

| 错误                  | 原因            | 解决方案                 |
| --------------------- | --------------- | ------------------------ |
| `CORS header missing` | 未配置 CORS     | 添加 Response Headers    |
| `Status 524`          | Cloudflare 超时 | 优化 workflow 或使用异步 |
| `Status 502/504`      | n8n 服务问题    | 检查 n8n 服务状态        |
| `NetworkError`        | 网络连接问题    | 检查 URL 和网络          |
| `Timeout`             | 请求超时        | 增加超时时间或优化处理   |

## 监控建议

### 添加日志

在 n8n workflow 中添加日志节点，记录：

- 请求时间
- 处理耗时
- 错误信息
- 响应状态

### 前端监控

```typescript
console.log('Request sent:', new Date().toISOString());
console.log('Request data:', request);
// ... 请求处理
console.log('Response received:', new Date().toISOString());
console.log('Response data:', data);
```

## 联系支持

如果以上方案都无法解决问题：

1. 检查 n8n 服务器日志
2. 检查 Cloudflare 日志
3. 提供完整的错误堆栈
4. 提供 network 请求详细信息（F12 → Network）

## 参考资料

- [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [n8n Webhook Documentation](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
- [Cloudflare Timeout Limits](https://developers.cloudflare.com/support/troubleshooting/cloudflare-errors/troubleshooting-cloudflare-5xx-errors/#error-524-a-timeout-occurred)
