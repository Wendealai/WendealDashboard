# 主题生成 vs 内容生成 - 快速对比参考

## 🎯 核心差异对照表

| 配置项                    | Subject Generation              | Content Generation              |
| ------------------------- | ------------------------------- | ------------------------------- |
| **Webhook URL (Submit)**  | `/webhook/rednotesubject`       | `/webhook/rednotecontent`       |
| **Webhook URL (Process)** | `/webhook/process-subject-task` | `/webhook/process-content-task` |
| **Webhook URL (Query)**   | `/task-status/:taskId`          | `/content-task-status/:taskId`  |
| **Database Table**        | `rednote_subject_tasks`         | `rednote_content_tasks`         |
| **Task ID 前缀**          | `task_`                         | `content_task_`                 |
| **主要字段**              | `subject`                       | `content`                       |
| **字段说明**              | 主题（简短）                    | 内容（长文本）                  |
| **典型长度**              | 50-200 字符                     | 500-3000 字符                   |

---

## 📝 代码修改对照

### 1. Generate Task ID (Code 节点)

#### Subject Generation

```javascript
const subject = body.subject || '';
const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

return [{
  json: {
    taskId: taskId,
    subject: subject,
    status: 'pending',
    ...
  }
}];
```

#### Content Generation ✨

```javascript
const content = body.content || '';  // ← subject → content
const taskId = `content_task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`; // ← 添加前缀

return [{
  json: {
    taskId: taskId,
    content: content,              // ← subject → content
    contentLength: content.length, // ← 新增字段
    status: 'pending',
    ...
  }
}];
```

---

### 2. Data Table - Add row

#### Subject Generation

```javascript
{
  "taskId": "={{ $json.taskId }}",
  "subject": "={{ $json.subject }}",
  "status": "pending",
  "createdAt": "={{ $json.createdAt }}"
}
```

#### Content Generation ✨

```javascript
{
  "taskId": "={{ $json.taskId }}",
  "content": "={{ $json.content }}",      // ← subject → content
  "contentLength": "={{ $json.contentLength }}", // ← 新增
  "status": "pending",
  "createdAt": "={{ $json.createdAt }}"
}
```

---

### 3. Respond to Webhook (Workflow 1)

#### Subject Generation

```json
{
  "taskId": "={{ $('Code').item.json.taskId }}",
  "status": "pending",
  "statusUrl": "https://n8n.wendealai.com/webhook/process-subject-task/task-status/={{ $('Code').item.json.taskId }}"
}
```

#### Content Generation ✨

```json
{
  "taskId": "={{ $('Code').item.json.taskId }}",
  "status": "pending",
  "statusUrl": "https://n8n.wendealai.com/webhook/process-content-task/content-task-status/={{ $('Code').item.json.taskId }}"
}
```

**变化**:

- `process-subject-task` → `process-content-task`
- `task-status` → `content-task-status`

---

### 4. AI Prompt (Workflow 2)

#### Subject Generation

```
你是小红书内容策划专家。

主题：{{ $json.subject }}

请生成主题分析报告...
```

#### Content Generation ✨

```
你是小红书内容创作专家。

用户提供的内容：
{{ $json.content }}

请基于以上内容，生成完整的小红书文案...
```

---

### 5. 前端 Webhook URL

#### Subject Generation

```typescript
const webhookUrl = 'https://n8n.wendealai.com/webhook/rednotesubject';

body: JSON.stringify({
  subject: subjectInput.trim(),
  timestamp: new Date().toISOString(),
});
```

#### Content Generation ✨

```typescript
const webhookUrl = 'https://n8n.wendealai.com/webhook/rednotecontent';

body: JSON.stringify({
  content: inputContent.trim(), // ← subject → content
  timestamp: new Date().toISOString(),
});
```

---

### 6. 前端状态查询 URL

#### Subject Generation

```typescript
const statusUrl = `https://n8n.wendealai.com/webhook/process-subject-task/task-status/${taskId}`;
```

#### Content Generation ✨

```typescript
const statusUrl = `https://n8n.wendealai.com/webhook/process-content-task/content-task-status/${taskId}`;
```

---

## 🔧 节点名称对照

| 节点类型            | Subject Workflow                 | Content Workflow                 |
| ------------------- | -------------------------------- | -------------------------------- |
| **Workflow 1 名称** | `RedNote Subject - Submit Task`  | `RedNote Content - Submit Task`  |
| **Workflow 2 名称** | `RedNote Subject - Process Task` | `RedNote Content - Process Task` |
| **Workflow 3 名称** | `RedNote Subject - Query Status` | `RedNote Content - Query Status` |
| **Database Table**  | `rednote_subject_tasks`          | `rednote_content_tasks`          |

---

## 📋 快速修改检查清单

### Workflow 1 (Submit)

- [ ] Webhook Path: `/rednotesubject` → `/rednotecontent`
- [ ] Code: `subject` → `content`
- [ ] Code: Task ID 前缀 `task_` → `content_task_`
- [ ] Data Table: 表名改为 `rednote_content_tasks`
- [ ] Data Table: 字段 `subject` → `content`
- [ ] Data Table: 添加 `contentLength` 字段
- [ ] Execute Workflow: 改为 `RedNote Content - Process Task`
- [ ] Respond: statusUrl 路径更新

### Workflow 2 (Process)

- [ ] 工作流名称改为 `RedNote Content - Process Task`
- [ ] Data Table (所有节点): 表名改为 `rednote_content_tasks`
- [ ] AI Prompt: `subject` → `content`
- [ ] Code: 所有 `subject` → `content`

### Workflow 3 (Query)

- [ ] Webhook Path: `/task-status/:taskId` → `/content-task-status/:taskId`
- [ ] Data Table: 表名改为 `rednote_content_tasks`

### 前端

- [ ] Webhook URL: `/rednotesubject` → `/rednotecontent`
- [ ] Request body: `subject` → `content`
- [ ] Status URL: 路径更新
- [ ] 变量名: `subjectInput` → `inputContent`

---

## 🎯 关键要点

### 1. 字段名统一

所有地方的 `subject` 都要改为 `content`：

- ✅ Code 节点
- ✅ Data Table 节点
- ✅ AI Prompt
- ✅ 前端代码

### 2. URL 路径统一

所有 URL 路径都要包含 `content` 标识：

- ✅ `/rednotecontent`
- ✅ `/process-content-task`
- ✅ `/content-task-status`

### 3. Task ID 前缀

内容生成的 Task ID 使用 `content_task_` 前缀，便于区分：

- Subject: `task_1761799560969_xxx`
- Content: `content_task_1761799560969_xxx`

### 4. 数据库表分离

使用独立的数据库表：

- Subject: `rednote_subject_tasks`
- Content: `rednote_content_tasks`

---

## ⚠️ 常见错误

### 错误 1: 忘记修改字段名

```javascript
// ❌ 错误
const subject = body.subject || '';

// ✅ 正确
const content = body.content || '';
```

### 错误 2: 忘记修改 URL 路径

```typescript
// ❌ 错误
const statusUrl = `.../task-status/${taskId}`;

// ✅ 正确
const statusUrl = `.../content-task-status/${taskId}`;
```

### 错误 3: 忘记修改表名

```javascript
// ❌ 错误
Table: 'rednote_subject_tasks';

// ✅ 正确
Table: 'rednote_content_tasks';
```

### 错误 4: 忘记修改 Task ID 前缀

```javascript
// ❌ 错误
const taskId = `task_${Date.now()}_...`;

// ✅ 正确
const taskId = `content_task_${Date.now()}_...`;
```

---

## 🧪 测试命令对比

### Subject Generation

```bash
# Submit
curl -X POST https://n8n.wendealai.com/webhook/rednotesubject \
  -H "Content-Type: application/json" \
  -d '{"subject":"测试主题","timestamp":"2025-10-30T10:00:00.000Z"}'

# Query
curl https://n8n.wendealai.com/webhook/process-subject-task/task-status/task_1761799560969_xxx
```

### Content Generation

```bash
# Submit
curl -X POST https://n8n.wendealai.com/webhook/rednotecontent \
  -H "Content-Type: application/json" \
  -d '{"content":"测试内容生成","timestamp":"2025-10-30T10:00:00.000Z"}'

# Query
curl https://n8n.wendealai.com/webhook/process-content-task/content-task-status/content_task_1761799560969_xxx
```

---

## 📖 相关文档

- [REDNOTE_CONTENT_ASYNC_SETUP.md](./REDNOTE_CONTENT_ASYNC_SETUP.md) - 完整配置指南
- [REDNOTE_SUBJECT_ASYNC_IMPLEMENTATION_GUIDE.md](./REDNOTE_SUBJECT_ASYNC_IMPLEMENTATION_GUIDE.md) - 主题生成参考

---

**🎯 核心原则**：所有 `subject` 相关的都改为 `content`，所有 URL 路径都加上 `content` 标识！
