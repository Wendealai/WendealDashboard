# 内容生成异步处理 - 快速开始

## 🚀 5分钟快速实施指南

---

## 📝 第一步：创建数据库表 (1分钟)

在 n8n 中创建新表 `rednote_content_tasks`：

| 字段名          | 类型     | 说明         |
| --------------- | -------- | ------------ |
| `taskId`        | string   | 任务ID       |
| `content`       | string   | 输入内容     |
| `status`        | string   | 状态         |
| `result`        | string   | 结果（JSON） |
| `error`         | string   | 错误信息     |
| `createdAt`     | dateTime | 创建时间     |
| `completedAt`   | dateTime | 完成时间     |
| `duration`      | number   | 处理时长     |
| `contentLength` | number   | 内容长度     |

---

## 🔧 第二步：复制并修改工作流 (2分钟)

### 方法A: 复制现有工作流（推荐）

1. **复制 Subject 工作流**
   - 复制 `RedNote Subject - Submit Task` → 重命名为 `RedNote Content - Submit Task`
   - 复制 `RedNote Subject - Process Task` → 重命名为 `RedNote Content - Process Task`
   - 复制 `RedNote Subject - Query Status` → 重命名为 `RedNote Content - Query Status`

2. **批量替换**（使用 n8n 的导出/导入功能）
   - 导出复制的工作流为 JSON
   - 全局替换以下内容：
     ```
     "rednotesubject"              → "rednotecontent"
     "process-subject-task"        → "process-content-task"
     "task-status"                 → "content-task-status"
     "rednote_subject_tasks"       → "rednote_content_tasks"
     "subject"                     → "content"
     "task_"                       → "content_task_"
     "RedNote Subject"             → "RedNote Content"
     ```
   - 重新导入工作流

3. **激活所有工作流**

---

## 🎯 第三步：关键节点检查 (2分钟)

### Workflow 1: 关键修改

**Code: Generate Task ID**

```javascript
// ✅ 关键修改点
const content = body.content || '';  // ← subject → content
const taskId = `content_task_${Date.now()}_...`; // ← 添加前缀

return [{
  json: {
    taskId: taskId,
    content: content,              // ← subject → content
    contentLength: content.length, // ← 新增
    ...
  }
}];
```

**Execute Workflow**

- Workflow: `RedNote Content - Process Task` ← 更新
- Wait For Completion: ❌ 取消勾选

**Respond to Webhook**

```json
{
  "statusUrl": "https://n8n.wendealai.com/webhook/process-content-task/content-task-status/..."
}
```

### Workflow 2: 关键修改

**Update row(s) 2**

```javascript
{
  "result": "={{ JSON.stringify($json.result) }}"  // ← 必须使用 JSON.stringify
}
```

### Workflow 3: 关键修改

**Webhook Path**

```
/process-content-task/content-task-status/:taskId
```

**Respond to Webhook - Headers**

```json
{
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json"
}
```

---

## 🧪 第四步：测试 (立即)

### 1. 测试 Submit

```bash
curl -X POST https://n8n.wendealai.com/webhook/rednotecontent \
  -H "Content-Type: application/json" \
  -d '{"content":"测试内容","timestamp":"2025-10-30T10:00:00.000Z"}'
```

**预期响应**:

```json
{
  "taskId": "content_task_xxx",
  "status": "pending",
  "statusUrl": "https://n8n.wendealai.com/webhook/process-content-task/content-task-status/content_task_xxx"
}
```

### 2. 检查数据库

打开 n8n → Data Tables → `rednote_content_tasks`

应该看到一条新记录，`status = pending` 或 `processing`

### 3. 测试 Query

使用返回的 `statusUrl`：

```bash
curl https://n8n.wendealai.com/webhook/process-content-task/content-task-status/content_task_xxx
```

---

## 📊 完整修改清单

### ✅ 所有需要修改的地方

| 位置              | 修改前                  | 修改后                         |
| ----------------- | ----------------------- | ------------------------------ |
| **Webhook URL**   | `/rednotesubject`       | `/rednotecontent`              |
| **字段名**        | `subject`               | `content`                      |
| **Task ID**       | `task_xxx`              | `content_task_xxx`             |
| **Database**      | `rednote_subject_tasks` | `rednote_content_tasks`        |
| **Query Path**    | `/task-status/:taskId`  | `/content-task-status/:taskId` |
| **状态 URL 前缀** | `/process-subject-task` | `/process-content-task`        |

---

## 🎨 前端快速修改

只需修改这几个地方：

### 1. Webhook URL

```typescript
// 修改前
const webhookUrl = 'https://n8n.wendealai.com/webhook/rednotesubject';

// 修改后
const webhookUrl = 'https://n8n.wendealai.com/webhook/rednotecontent';
```

### 2. Request Body

```typescript
body: JSON.stringify({
  content: inputContent.trim(), // ← subject → content
  timestamp: new Date().toISOString(),
});
```

### 3. Status URL

```typescript
const statusUrl = `https://n8n.wendealai.com/webhook/process-content-task/content-task-status/${taskId}`;
```

### 4. 添加 useRef

```typescript
const currentTaskRef = useRef<{
  taskId: string | null;
  statusUrl: string | null;
  intervalId: number | null;
}>({
  taskId: null,
  statusUrl: null,
  intervalId: null,
});
```

---

## ⚠️ 必须检查的3个关键点

### 1. Execute Workflow 节点

**⚠️ 必须取消 "Wait For Sub-Workflow Completion"**

否则会导致 524 超时！

### 2. Update row(s) 节点（Workflow 2）

**⚠️ result 字段必须使用 JSON.stringify**

```javascript
"result": "={{ JSON.stringify($json.result) }}"  // ← 关键！
```

否则前端会收到 `parseError: true`

### 3. Respond to Webhook（Workflow 3）

**⚠️ 必须配置 CORS Headers**

```json
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json"
}
```

否则前端无法读取响应

---

## 🎯 预期效果

完成后，您的内容生成将支持：

✅ **异步处理** - 不受 Cloudflare 100秒限制  
✅ **实时进度** - 前端轮询显示进度  
✅ **长时间任务** - 支持数分钟的 AI 生成  
✅ **完整结果** - 结构化的 JSON 结果  
✅ **错误处理** - 完善的错误提示

---

## 📖 详细文档

- **完整配置**: [REDNOTE_CONTENT_ASYNC_SETUP.md](./REDNOTE_CONTENT_ASYNC_SETUP.md)
- **对比参考**: [SUBJECT_VS_CONTENT_QUICK_REFERENCE.md](./SUBJECT_VS_CONTENT_QUICK_REFERENCE.md)
- **参考架构**: [REDNOTE_SUBJECT_ASYNC_IMPLEMENTATION_GUIDE.md](./REDNOTE_SUBJECT_ASYNC_IMPLEMENTATION_GUIDE.md)

---

## 🚨 遇到问题？

### 问题1: 524 超时

**原因**: Execute Workflow 没有取消等待  
**解决**: 取消 "Wait For Sub-Workflow Completion"

### 问题2: parseError: true

**原因**: result 字段没有 JSON.stringify  
**解决**: Update row(s) 节点使用 `JSON.stringify($json.result)`

### 问题3: CORS 错误

**原因**: Workflow 3 缺少 CORS headers  
**解决**: Respond to Webhook 添加 CORS headers

### 问题4: 前端不轮询

**原因**: statusUrl 路径错误  
**解决**: 检查 URL 是否包含 `content-task-status`

---

## ✅ 完成标志

- [ ] 3个工作流都已创建并激活
- [ ] 数据库表创建完成
- [ ] curl 测试成功返回 taskId
- [ ] 数据库能看到任务记录
- [ ] 轮询能查询到状态变化
- [ ] 完成后返回完整结果
- [ ] 前端集成成功

---

**🎉 开始实施吧！参考文档随时查阅！**
