# 🚨 修复：工作流3 返回 500 错误

## 🔴 问题现象

**错误信息**：

```
Status code: 500
CORS header 'Access-Control-Allow-Origin' missing
NetworkError when attempting to fetch resource
```

**发生位置**：前端轮询查询任务状态时
**URL**：`https://n8n.wendealai.com/webhook/task-status/{taskId}`

---

## 🔍 问题原因

工作流3（查询状态）执行时**内部错误**，可能原因：

1. ❌ Extract Task ID 节点提取 taskId 失败
2. ❌ Get row(s) 节点查询数据库失败
3. ❌ Format Response 节点解析 result 失败
4. ❌ 数据库中的数据格式不符合预期

---

## ⚡ 快速排查步骤

### 步骤 1：查看 n8n 执行日志（最重要）

1. 访问：`https://n8n.wendealai.com`
2. 找到工作流：**查询状态工作流**（包含 `task-status` webhook）
3. 点击右侧 **"Executions"** 标签
4. 找到**红色的失败执行记录**
5. 点击查看，找到**出错的节点**（红色标记）
6. 查看错误信息

---

### 步骤 2：常见错误及修复

#### 错误 A：`Cannot read property 'taskId' of undefined`

**位置**：Extract Task ID 节点

**原因**：URL 参数提取失败

**修复**：检查代码

```javascript
// 确保代码是这样的
const params = $input.first().json.params || {};
const taskId = params.taskId || '';

console.log('📥 Received params:', params);
console.log('🔑 Extracted taskId:', taskId);

if (!taskId) {
  throw new Error('Missing taskId in URL path');
}

return {
  taskId: taskId,
};
```

**同时检查**：Webhook 节点的 path 必须是 `task-status/:taskId`（注意冒号）

---

#### 错误 B：`JSON.parse: unexpected character`

**位置**：Format Response - Completed 节点

**原因**：数据库中的 `result` 字段不是有效的 JSON 字符串

**修复**：增强错误处理

```javascript
// 格式化 completed 状态响应
const taskData = $input.first().json;

console.log('📊 Task data:', taskData);

let result = taskData.result;

// 如果 result 是 JSON 字符串，尝试解析
if (typeof result === 'string' && result.trim()) {
  try {
    result = JSON.parse(result);
    console.log('✅ Parsed result successfully');
  } catch (e) {
    console.error('❌ JSON parse error:', e.message);
    console.error('Raw result:', result.substring(0, 200));
    // 解析失败，使用原始字符串包装
    result = {
      error: 'Failed to parse result JSON',
      fullReport: result,
    };
  }
}

// 确保 result 存在
if (!result) {
  console.warn('⚠️ No result found in task data');
  result = {
    error: 'No result available',
    message: 'Task completed but result is empty',
  };
}

return {
  taskId: taskData.taskId,
  status: 'completed',
  result: result,
  completedAt: taskData.completedAt || new Date().toISOString(),
  duration: taskData.duration || 0,
};
```

---

#### 错误 C：`No data found`

**位置**：Get row(s) 节点

**原因**：数据库中没有找到对应的 taskId

**排查**：

1. 检查数据库表 `rednote_subject_tasks`
2. 搜索 taskId：`task_1761794252181_chn5t4mwa`
3. 确认记录是否存在

**可能情况**：

- 工作流1未成功保存数据
- taskId 拼写错误
- 数据库配置错误

**修复**：在 Get row(s) 后添加 If 节点检查

```javascript
// 新增一个 Code 节点检查数据
const data = $input.first().json;

console.log('🔍 Query result:', data);

if (!data || Object.keys(data).length === 0) {
  throw new Error('Task not found in database');
}

return data;
```

---

#### 错误 D：`Referenced node doesn't exist`

**位置**：任何引用其他节点的地方

**原因**：使用了 `$('NodeName')` 但节点名称不匹配

**修复**：统一使用 `$input.first().json` 访问上游数据

---

### 步骤 3：测试工作流3

#### 方法1：在 n8n 中手动测试

1. 打开工作流3
2. 点击 **"Test Workflow"**
3. 点击 Webhook 节点，复制 Test URL
4. 在新标签页访问：`{Test URL}/task_1761794252181_chn5t4mwa`
5. 查看执行结果和每个节点的输出

---

#### 方法2：使用 curl 测试

```bash
# 测试实际的查询 API
curl -v "https://n8n.wendealai.com/webhook/task-status/task_1761794252181_chn5t4mwa"
```

**分析响应**：

- `200 OK` → 工作流正常，检查返回内容
- `404 Not Found` → taskId 不存在或工作流未激活
- `500 Internal Server Error` → 工作流执行出错（查看日志）

---

## 🔧 完整的修复方案

### 修复工作流3的所有节点

#### 1. Webhook 节点

```json
{
  "httpMethod": "GET",
  "path": "task-status/:taskId",
  "options": {
    "allowedOrigins": "*"
  }
}
```

#### 2. Extract Task ID 节点（增强版）

```javascript
// 从 URL 路径参数中提取 taskId
const inputJson = $input.first().json;
console.log('📥 Full input:', JSON.stringify(inputJson, null, 2));

const params = inputJson.params || {};
const taskId = params.taskId || '';

console.log('🔑 Extracted taskId:', taskId);

if (!taskId || taskId.trim() === '') {
  throw new Error(
    'Missing taskId in URL path. Please check URL format: /task-status/{taskId}'
  );
}

return {
  taskId: taskId.trim(),
};
```

#### 3. Get row(s) 节点

```json
{
  "operation": "get",
  "dataTableId": "rednote_subject_tasks",
  "filters": {
    "conditions": [
      {
        "keyName": "taskId",
        "keyValue": "={{ $json.taskId }}"
      }
    ]
  }
}
```

#### 4. 新增：Check Data 节点（在 Get row(s) 之后）

```javascript
const data = $input.first().json;

console.log('🔍 Query result:', data);

// 检查是否有数据
if (!data || Object.keys(data).length === 0) {
  return {
    error: true,
    message: 'Task not found',
    taskId: $('Extract Task ID').first().json.taskId,
  };
}

// 数据存在，继续传递
return data;
```

#### 5. Switch 节点（修改条件）

添加第5个分支处理"未找到"的情况：

- **Rule 1**: `status = "pending"`
- **Rule 2**: `status = "processing"`
- **Rule 3**: `status = "completed"`
- **Rule 4**: `status = "failed"`
- **Rule 5**: `error = true` （新增）

#### 6. Format Response - Not Found（新增）

```javascript
const data = $input.first().json;

return {
  taskId: data.taskId || 'unknown',
  status: 'not_found',
  error: 'Task not found in database',
  message: 'The task may not exist or was deleted',
};
```

#### 7. Format Response - Completed（增强版）

```javascript
const taskData = $input.first().json;

console.log('📊 Task data keys:', Object.keys(taskData));
console.log('📄 Result type:', typeof taskData.result);

let result = taskData.result;

// 处理 JSON 字符串
if (typeof result === 'string' && result.trim()) {
  try {
    result = JSON.parse(result);
    console.log('✅ Successfully parsed result JSON');
  } catch (e) {
    console.error('❌ JSON parse error:', e.message);
    // 解析失败，包装原始字符串
    result = {
      parseError: true,
      fullReport: result,
      message: 'Result JSON parse failed, showing raw content',
    };
  }
}

// 处理空结果
if (!result) {
  console.warn('⚠️ Result is empty');
  result = {
    empty: true,
    message: 'Task completed but result is empty',
    taskData: taskData,
  };
}

return {
  taskId: taskData.taskId,
  status: 'completed',
  result: result,
  completedAt: taskData.completedAt || new Date().toISOString(),
  duration: taskData.duration || 0,
};
```

---

## 🧪 验证修复

### 测试1：查询已知的 taskId

```bash
curl -X GET "https://n8n.wendealai.com/webhook/task-status/task_1761794252181_chn5t4mwa"
```

**预期响应**：

- 200 OK
- 包含 JSON 数据
- 有 CORS 头

---

### 测试2：查询不存在的 taskId

```bash
curl -X GET "https://n8n.wendealai.com/webhook/task-status/fake_task_id"
```

**预期响应**：

```json
{
  "taskId": "fake_task_id",
  "status": "not_found",
  "error": "Task not found in database"
}
```

---

### 测试3：前端测试

刷新浏览器，观察 Console：

- ✅ 看到轮询日志
- ✅ 无 500 错误
- ✅ 最终获取到结果

---

## 📊 调试检查清单

### n8n 工作流3

- [ ] 工作流已激活
- [ ] Webhook path 正确：`task-status/:taskId`
- [ ] CORS 配置：`allowedOrigins: "*"`
- [ ] Extract Task ID 有日志输出
- [ ] Get row(s) 筛选条件正确
- [ ] Format 节点有错误处理
- [ ] 所有节点都连接正确

### 数据库

- [ ] 表 `rednote_subject_tasks` 存在
- [ ] taskId 记录存在
- [ ] status 字段有值
- [ ] result 字段不为空
- [ ] result 是有效的 JSON（如果是字符串）

### 前端

- [ ] 查询 URL 格式正确
- [ ] 有错误日志输出
- [ ] 轮询持续运行

---

## 🆘 仍然失败？

### 最后的调试方法

在工作流3的**每个节点后**添加 Code 节点输出日志：

```javascript
const data = $input.first().json;
console.log('✅ Node completed. Data:', JSON.stringify(data, null, 2));
return data;
```

然后在 n8n 执行日志中查看每个节点的输出，找到出错的位置。

---

## 💡 临时获取结果的方法

如果急需获取结果：

### 方法1：直接查看 n8n 执行日志

1. 打开主处理工作流（RedNote Subject - Main workflow）
2. Executions → 找到对应 taskId 的执行
3. 查看最后一个节点的输出
4. 复制 result 内容

### 方法2：查询数据库

```sql
SELECT result, status, completedAt
FROM rednote_subject_tasks
WHERE taskId = 'task_1761794252181_chn5t4mwa';
```

---

**关键**：先查看 n8n 的执行日志，找到具体的错误信息！这是最快的排查方法。
