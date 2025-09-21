# 🔧 Notion API 连接调试指南

## 📋 问题诊断

### 当前错误

```
⚠️ Notion API fetch failed: TypeError: NetworkError when attempting to fetch resource.
```

### 问题分析

1. **CORS 限制**: 浏览器直接调用外部API受跨域限制
2. **代理配置**: Vite代理可能未正确转发请求
3. **API密钥**: 可能存在认证问题

## 🔍 Spec-Workflow 调试步骤

### 步骤 1: 检查代理配置

```typescript
// vite.config.ts 中的配置
'/webhook/notion-fetch': {
  target: 'https://api.notion.com',
  changeOrigin: true,
  secure: true,
  rewrite: (path) => '/v1/databases/' + path.replace('/webhook/notion-fetch/', '') + '/query',
  configure: (proxy, options) => {
    proxy.on('proxyReq', (proxyReq, req, res) => {
      proxyReq.setHeader('Authorization', `Bearer YOUR_NOTION_API_TOKEN`);
      proxyReq.setHeader('Notion-Version', '2022-06-28');
      proxyReq.setHeader('Content-Type', 'application/json');
    });
  }
}
```

### 步骤 2: 检查前端请求

```typescript
// 前端调用代码
const response = await fetch(`/webhook/notion-fetch/${databaseId}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    sorts: [{ property: '创建时间', direction: 'descending' }],
  }),
});
```

### 步骤 3: 调试信息输出

系统已添加详细的调试日志：

- 数据库ID提取
- 代理请求URL
- 响应状态码
- 响应头信息
- 错误详细信息

## 🛠️ 解决方案

### 方案 A: 使用代理 (推荐)

1. ✅ 确保 Vite 代理配置正确
2. ✅ 验证 API 密钥有效性
3. ✅ 检查数据库权限设置

### 方案 B: 直接 API 调用 (开发调试用)

如果代理不工作，可以临时使用直接调用：

```typescript
const response = await fetch(
  `https://api.notion.com/v1/databases/${databaseId}/query`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer YOUR_NOTION_API_TOKEN`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sorts: [{ property: '创建时间', direction: 'descending' }],
    }),
  }
);
```

### 方案 C: 服务器端代理

如果前端代理仍然有问题，可以考虑：

1. 创建后端 API 端点
2. 在服务器端调用 Notion API
3. 前端调用自己的后端 API

## 🔍 故障排除

### 1. 检查控制台输出

运行应用后，查看浏览器控制台的调试信息：

```
🔗 Making request to proxy: /webhook/notion-fetch/266efdb673e08067908be152e0be1cdb
📊 Database ID extracted: 266efdb673e08067908be152e0be1cdb
📡 Proxy response status: [状态码]
```

### 2. 测试 API 密钥

在浏览器控制台直接测试：

```javascript
fetch('https://api.notion.com/v1/databases/266efdb673e08067908be152e0be1cdb', {
  headers: {
    Authorization: 'Bearer YOUR_NOTION_API_TOKEN',
    'Notion-Version': '2022-06-28',
  },
}).then(r => console.log(r.status, r.statusText));
```

### 3. 检查数据库权限

1. 访问 Notion 数据库页面
2. 点击右上角 "Share"
3. 确认 Integration 有 "Read content" 权限

## 📊 调试结果

### 预期正常输出

```
🔗 Making request to proxy: /webhook/notion-fetch/266efdb673e08067908be152e0be1cdb
📊 Database ID extracted: 266efdb673e08067908be152e0be1cdb
📡 Proxy response status: 200
✅ Notion API response: { results: [...] }
```

### 常见错误及解决方案

#### 错误: `NetworkError`

**原因**: CORS 限制或代理配置问题
**解决**: 检查 Vite 代理配置，确保开发服务器正在运行

#### 错误: `401 Unauthorized`

**原因**: API 密钥无效或过期
**解决**: 重新生成 Notion API 密钥并更新配置

#### 错误: `403 Forbidden`

**原因**: 数据库权限不足
**解决**: 在 Notion 中重新配置 Integration 权限

#### 错误: `404 Not Found`

**原因**: 数据库ID错误或数据库不存在
**解决**: 验证数据库ID是否正确

## 🚀 快速测试

### 步骤 1: 重启开发服务器

```bash
npm run dev
# 或
yarn dev
```

### 步骤 2: 打开浏览器控制台

1. 访问应用页面
2. 打开开发者工具 (F12)
3. 查看 Console 标签页

### 步骤 3: 测试功能

1. 点击"🔄 刷新Notion数据"按钮
2. 观察控制台输出
3. 检查是否有错误信息

## 📈 监控指标

- **响应时间**: 理想 < 2秒
- **成功率**: 目标 > 95%
- **错误类型**: 主要监控 CORS 和认证错误

## 📚 相关链接

- [Notion API 文档](https://developers.notion.com/)
- [Vite 代理配置](https://vitejs.dev/config/server-options.html#server-proxy)
- [CORS 问题解决方案](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

**Spec-Workflow 调试状态**: 🔄 进行中
**问题严重程度**: 中等 (影响功能但不阻断)
**预计解决时间**: 30分钟
**优先级**: 高
