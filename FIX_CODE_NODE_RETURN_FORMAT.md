# ✅ n8n Code 节点返回格式修复

## 🔴 错误原因

n8n Code 节点要求返回**数组格式**，每个元素包含一个 `json` 属性。

### ❌ 错误的返回格式

```javascript
return {
  taskId: taskId,
  status: 'completed',
};
```

**错误信息**：

```
Code doesn't return items properly
Please return an array of objects, one for each item you would like to output.
```

---

### ✅ 正确的返回格式

```javascript
return [
  {
    json: {
      taskId: taskId,
      status: 'completed',
    },
  },
];
```

---

## 📋 修复清单

已修复以下所有 Code 节点：

- [x] **Extract Task ID** - 提取任务ID
- [x] **Normalize Data** - 标准化数据
- [x] **Format Response - Not Found** - 格式化"未找到"响应
- [x] **Format Response - Pending** - 格式化"等待中"响应
- [x] **Format Response - Processing** - 格式化"处理中"响应
- [x] **Format Response - Completed** - 格式化"已完成"响应
- [x] **Format Response - Failed** - 格式化"失败"响应

---

## 🚀 立即部署

### 步骤1: 导入修复后的工作流

1. 打开 n8n 管理界面
2. **删除**当前的 "RedNote Subject - Query Status" 工作流
3. 点击 **"Import from File"**
4. 选择 `workflows/workflow3-query-status-FIXED.json`
5. 点击 **"Import"**
6. 点击右上角的 **"Active"** 开关激活工作流

---

### 步骤2: 验证工作流

在 n8n 中点击 **"Test Workflow"**，应该看到：

- ✅ Webhook URL: `https://n8n.wendealai.com/webhook/task-status/:taskId`
- ✅ 所有节点连接正常
- ✅ 没有配置警告

---

### 步骤3: 测试 API

#### 测试现有任务

```bash
curl "https://n8n.wendealai.com/webhook/task-status/task_1761794252181_chn5t4mwa"
```

**预期结果**：

- ✅ HTTP 200 OK
- ✅ 返回 JSON 数据
- ✅ 包含 CORS 头

**示例响应**：

```json
{
  "taskId": "task_1761794252181_chn5t4mwa",
  "status": "completed",
  "result": {
    "选题标题": "...",
    "标题": "...",
    ...
  },
  "completedAt": "2025-10-30T...",
  "duration": 45
}
```

---

#### 测试不存在的任务

```bash
curl "https://n8n.wendealai.com/webhook/task-status/fake_task_id"
```

**预期结果**：

```json
{
  "taskId": "fake_task_id",
  "status": "not_found",
  "error": "Task not found in database",
  "message": "The task may not exist or was deleted"
}
```

---

## 🎯 修复了什么？

### 问题1: Code 节点返回格式错误 ✅

所有 Code 节点现在返回 `[{ json: {...} }]` 格式。

### 问题2: Get row(s) 数组处理 ✅

`Normalize Data` 节点处理：

- 空数组 `[]`
- 单项数组 `[{...}]`
- 单个对象 `{...}`

### 问题3: JSON 解析错误 ✅

`Format Response - Completed` 节点增强错误处理：

- Try-catch 捕获 JSON 解析错误
- 解析失败时返回包装后的原始字符串
- 空结果时返回有意义的错误消息

### 问题4: 任务未找到处理 ✅

新增 `Format Response - Not Found` 节点和 Switch 分支。

---

## 🧪 前端测试

导入工作流后，前端应该能够正常轮询并显示结果：

```javascript
// 前端轮询代码（已实现）
const statusUrl = `https://n8n.wendealai.com/webhook/task-status/${taskId}`;
const statusResponse = await fetch(statusUrl, {
  method: 'GET',
  mode: 'cors',
});

const statusData = await statusResponse.json();

if (statusData.status === 'completed') {
  setSubjectResponse(statusData.result);
  // ✅ 成功显示 AI 生成的内容
}
```

---

## 📊 工作流节点流程

```
Webhook - Query Status
    ↓
Extract Task ID (返回 [{ json: { taskId: "..." } }])
    ↓
Get row(s) (从 Table Database 查询)
    ↓
Normalize Data (标准化数据，返回 [{ json: { found: true/false, ... } }])
    ↓
Switch (根据 found 和 status 分支)
    ├─→ Format Response - Not Found (返回 [{ json: { status: "not_found", ... } }])
    ├─→ Format Response - Pending (返回 [{ json: { status: "pending", ... } }])
    ├─→ Format Response - Processing (返回 [{ json: { status: "processing", ... } }])
    ├─→ Format Response - Completed (返回 [{ json: { status: "completed", result: {...}, ... } }])
    └─→ Format Response - Failed (返回 [{ json: { status: "failed", ... } }])
    ↓
Respond to Webhook (返回给前端)
```

---

## ✅ 完成后检查

- [ ] n8n 工作流激活成功
- [ ] 测试 API 返回 200 状态码
- [ ] 前端轮询不再报 500 错误
- [ ] 前端能够正常显示 AI 生成的内容

---

## 💡 关键知识点

### n8n Code 节点返回格式规则

1. **必须返回数组**：`[...]`
2. **每个元素必须有 json 属性**：`{ json: {...} }`
3. **可以返回多个项**：`[{ json: {...} }, { json: {...} }]`

### 示例

```javascript
// ✅ 返回单个项
return [{ json: { name: 'Alice' } }];

// ✅ 返回多个项
return [{ json: { name: 'Alice' } }, { json: { name: 'Bob' } }];

// ❌ 错误：直接返回对象
return { name: 'Alice' };

// ❌ 错误：缺少 json 属性
return [{ name: 'Alice' }];
```

---

## 📞 需要帮助？

如果导入后仍有问题：

1. **检查 n8n 执行日志**：点击工作流执行记录查看详细错误
2. **检查节点配置**：确保所有节点的 Code 内容正确
3. **检查 Table Database 连接**：确保 `rednote_subject_tasks` 表可访问
4. **测试 Webhook**：使用 curl 命令直接测试 API

---

**部署时间**：预计 3 分钟
**测试时间**：预计 2 分钟
**总计时间**：5 分钟 ⏱️
