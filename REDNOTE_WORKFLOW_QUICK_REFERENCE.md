# 小红书主题生成工作流 - 快速参考卡

## 🎯 核心改进

| 之前的问题                | 现在的解决方案                                      |
| ------------------------- | --------------------------------------------------- |
| ❌ 所有职责混在一个工作流 | ✅ 拆分成3个独立工作流                              |
| ❌ AI Agent 阻塞主流程    | ✅ 使用 Execute Workflow 异步触发                   |
| ❌ 无法按 taskId 查询     | ✅ 从 URL 提取 taskId，精确查询                     |
| ❌ 初始状态为 processing  | ✅ 正确的状态流转：pending → processing → completed |
| ❌ 缺少错误处理           | ✅ 失败自动标记为 failed 状态                       |

---

## 📋 三个工作流职责

### 1️⃣ 工作流 1：提交任务 (`workflow1-submit-task.json`)

- **职责**：接收前端请求，立即返回 taskId
- **关键节点**：
  - Webhook (POST `/rednotesubject`)
  - Generate Task ID
  - Insert Task to Database (status: `pending`)
  - Execute Workflow (异步触发工作流 2)
  - Respond to Webhook
- **响应时间**：< 1秒

---

### 2️⃣ 工作流 2：处理任务 (`workflow2-process-task.json`)

- **职责**：后台执行 AI 生成，更新任务状态
- **关键节点**：
  - Execute Workflow Trigger (被工作流 1 触发)
  - Update Status to Processing
  - AI Agent + 模型 + 搜索工具
  - Parse AI Output
  - Update Status to Completed / Failed
- **处理时间**：30-180秒（取决于 AI 模型）

---

### 3️⃣ 工作流 3：查询状态 (`workflow3-query-status.json`)

- **职责**：根据 taskId 返回任务状态和结果
- **关键节点**：
  - Webhook (GET `/task-status/:taskId`)
  - Extract Task ID
  - Get Task from Database
  - Switch by Status (4个分支)
  - Format Response
  - Respond to Webhook
- **响应时间**：< 0.5秒

---

## 🔄 状态流转

```
pending → processing → completed ✅
                    ↘ failed ❌
```

| 状态         | 含义        | 返回数据                                      |
| ------------ | ----------- | --------------------------------------------- |
| `pending`    | 等待处理    | taskId, status, message, createdAt            |
| `processing` | AI 正在生成 | taskId, status, message, elapsedTime          |
| `completed`  | 生成完成    | taskId, status, result, completedAt, duration |
| `failed`     | 生成失败    | taskId, status, error, completedAt            |

---

## 🚀 部署顺序

```
1. 导入工作流 2（处理任务）
   ↓
2. 复制工作流 2 的 ID
   ↓
3. 修改工作流 1 的 JSON 文件（填入工作流 2 的 ID）
   ↓
4. 导入工作流 1（提交任务）
   ↓
5. 导入工作流 3（查询状态）
   ↓
6. 激活所有工作流
   ↓
7. 测试验证
```

---

## 🔗 API 端点

### 提交任务

```bash
POST https://n8n.wendealai.com/webhook/rednotesubject
Content-Type: application/json

{
  "subject": "隔代育儿冲突时的正确沟通方式",
  "timestamp": "2025-10-30T10:00:00Z"
}
```

### 查询状态

```bash
GET https://n8n.wendealai.com/webhook/task-status/{taskId}
```

---

## 🗄️ 数据库字段

**表名**：`rednote_subject_tasks`

| 字段          | 类型     | 必需 | 说明                                |
| ------------- | -------- | ---- | ----------------------------------- |
| `taskId`      | String   | ✅   | 唯一标识                            |
| `subject`     | String   | ✅   | 用户输入                            |
| `status`      | String   | ✅   | pending/processing/completed/failed |
| `result`      | String   | ❌   | JSON 字符串                         |
| `error`       | String   | ❌   | 错误信息                            |
| `createdAt`   | DateTime | ✅   | 创建时间                            |
| `startedAt`   | DateTime | ❌   | 开始时间                            |
| `completedAt` | DateTime | ❌   | 完成时间                            |
| `duration`    | Number   | ❌   | 耗时（秒）                          |

---

## 🧪 测试命令

### 1. 提交任务

```bash
curl -X POST https://n8n.wendealai.com/webhook/rednotesubject \
  -H "Content-Type: application/json" \
  -d '{"subject":"测试主题","timestamp":"2025-10-30T10:00:00Z"}'
```

### 2. 查询状态

```bash
curl -X GET https://n8n.wendealai.com/webhook/task-status/task_1730275200000_abc123
```

---

## 🔧 前端配置修改

在 `RedNoteContentGenerator.tsx` 中：

### 修改 1：提交任务 webhook URL（保持不变）

```typescript
const webhookUrl = 'https://n8n.wendealai.com/webhook/rednotesubject';
```

### 修改 2：查询状态 URL

```typescript
const statusUrl = `https://n8n.wendealai.com/webhook/task-status/${taskId}`;
```

### 修改 3：轮询间隔建议

```typescript
const pollInterval = 5000; // 5秒（推荐）
const maxAttempts = 240; // 最多 20 分钟
```

---

## ⚡ 性能指标

| 指标         | 目标值   | 说明                   |
| ------------ | -------- | ---------------------- |
| 提交响应时间 | < 1秒    | 立即返回 taskId        |
| AI 处理时间  | 30-180秒 | 取决于模型和搜索深度   |
| 查询响应时间 | < 0.5秒  | 数据库查询             |
| 轮询间隔     | 5秒      | 平衡实时性和服务器负载 |
| 最大等待时间 | 20分钟   | 防止无限轮询           |

---

## 🐛 快速调试

### 问题：状态一直是 pending

**检查**：

1. 工作流 2 是否激活？
2. 工作流 1 的 Execute Workflow 节点是否配置正确？
3. 查看工作流 2 的执行日志

### 问题：查询返回 404

**检查**：

1. 工作流 3 是否激活？
2. URL 格式是否正确：`/webhook/task-status/{taskId}`
3. Webhook 节点的 path 配置是否为 `task-status/:taskId`

### 问题：AI 生成失败

**检查**：

1. AI 模型的 API 凭据是否有效？
2. Tavily Search 的 API key 是否有效？
3. 查看工作流 2 的错误日志
4. 数据库中该任务的 status 是否为 `failed`

---

## 📚 文件清单

| 文件                                    | 说明               |
| --------------------------------------- | ------------------ |
| `workflows/workflow1-submit-task.json`  | 工作流 1：提交任务 |
| `workflows/workflow2-process-task.json` | 工作流 2：处理任务 |
| `workflows/workflow3-query-status.json` | 工作流 3：查询状态 |
| `REDNOTE_WORKFLOW_REFACTOR_GUIDE.md`    | 详细重构指南       |
| `REDNOTE_WORKFLOW_DEPLOYMENT_GUIDE.md`  | 部署步骤和测试     |
| `REDNOTE_WORKFLOW_QUICK_REFERENCE.md`   | 快速参考（本文件） |

---

## 🎓 关键概念

### Execute Workflow 节点

- **作用**：异步触发另一个工作流
- **优势**：
  - 主工作流立即完成
  - 子工作流独立执行
  - 不会互相阻塞
- **配置**：
  - `workflowId`: 目标工作流的 ID
  - `waitForSubWorkflow`: false（异步模式）

### Switch 节点

- **作用**：根据条件分支
- **用途**：根据任务状态返回不同格式的响应
- **分支**：pending, processing, completed, failed

### n8n Table Database

- **优势**：
  - 内置存储，无需外部数据库
  - 支持 CRUD 操作
  - 支持筛选和条件查询
- **限制**：
  - 不适合大规模数据（> 10万条）
  - 不支持复杂的 JOIN 查询

---

## 💡 最佳实践

1. **日志记录**：在 Code 节点中使用 `console.log()` 输出关键信息
2. **错误处理**：所有可能失败的节点都应有错误分支
3. **超时配置**：为 AI 节点设置合理的超时时间
4. **数据清理**：定期清理旧的已完成任务（> 30天）
5. **监控告警**：配置失败任务的邮件/Slack 通知

---

## 🔄 更新日志

### v2.0.0 (2025-10-30)

- ✅ 拆分成 3 个独立工作流
- ✅ 实现真正的异步处理
- ✅ 添加按 taskId 查询功能
- ✅ 完善错误处理和状态流转
- ✅ 优化响应数据结构

### v1.0.0 (之前版本)

- ❌ 所有功能混在一个工作流
- ❌ 同步处理，响应慢
- ❌ 无法按 taskId 查询

---

**版本**：2.0.0  
**最后更新**：2025-10-30  
**作者**：AI Assistant
