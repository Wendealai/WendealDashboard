# 🛠️ 工作流3 - 手动修复指南（逐步操作）

## 📋 总览

需要修改 **7 个 Code 节点** + **添加 1 个新节点**

修改时间：约 10-15 分钟

---

## 🎯 修改规则（重要！）

### ❌ 错误的返回格式

```javascript
return {
  taskId: 'xxx',
  status: 'completed',
};
```

### ✅ 正确的返回格式

```javascript
return [
  {
    json: {
      taskId: 'xxx',
      status: 'completed',
    },
  },
];
```

**关键点**：

1. 外层必须是**数组** `[...]`
2. 数组内每个元素必须有 **`json` 属性**
3. 你的数据放在 `json` 对象里面

---

## 🔧 修改步骤

### 步骤 1: 修改 "Extract Task ID" 节点

#### 1.1 打开节点

在 n8n 工作流中，双击 **"Extract Task ID"** 节点

#### 1.2 找到 return 语句（最后几行）

```javascript
// 原代码（错误）❌
return {
  taskId: taskId.trim(),
};
```

#### 1.3 替换为

```javascript
// 新代码（正确）✅
return [
  {
    json: {
      taskId: taskId.trim(),
    },
  },
];
```

#### 1.4 完整代码（如果需要全部替换）

```javascript
// 从 URL 路径参数中提取 taskId（增强版）
const inputJson = $input.first().json;
console.log('📥 Full input:', JSON.stringify(inputJson, null, 2));

const params = inputJson.params || {};
const taskId = params.taskId || '';

console.log('🔑 Extracted taskId:', taskId);

if (!taskId || taskId.trim() === '') {
  throw new Error('Missing taskId in URL path');
}

// n8n Code 节点必须返回数组格式
return [
  {
    json: {
      taskId: taskId.trim(),
    },
  },
];
```

#### 1.5 保存

点击 **"Execute Node"** 测试 → 点击 **"Save"**

---

### 步骤 2: 添加新节点 "Normalize Data"（重要！）

#### 2.1 在 "Get row(s)" 和 "Switch" 之间添加节点

1. **删除** "Get row(s)" 到 "Switch" 的连接线
2. 点击左侧的 **"+"** 按钮
3. 搜索 **"Code"**
4. 选择 **"Code"** 节点
5. 命名为 **"Normalize Data"**

#### 2.2 连接节点

- "Get row(s)" → "Normalize Data"
- "Normalize Data" → "Switch"

#### 2.3 粘贴完整代码

```javascript
// 处理 Get row(s) 的返回结果（关键修复！）
let data = $input.first().json;

console.log('🔍 Query result type:', typeof data);
console.log('🔍 Query result:', JSON.stringify(data, null, 2));

// 处理数组响应
if (Array.isArray(data)) {
  console.log('⚠️ Result is an array with', data.length, 'items');
  if (data.length === 0) {
    // 空数组 = 未找到
    return [
      {
        json: {
          found: false,
          taskId: $('Extract Task ID').first().json.taskId,
        },
      },
    ];
  }
  // 提取第一个元素
  data = data[0];
}

// 检查是否有数据
if (!data || Object.keys(data).length === 0 || !data.taskId) {
  console.log('❌ Task not found');
  return [
    {
      json: {
        found: false,
        taskId: $('Extract Task ID').first().json.taskId,
      },
    },
  ];
}

console.log('✅ Task found with status:', data.status);

// 返回标准化的数据
return [
  {
    json: {
      found: true,
      taskId: data.taskId,
      status: data.status || 'unknown',
      subject: data.subject,
      result: data.result,
      error: data.error,
      createdAt: data.createdAt,
      startedAt: data.startedAt,
      completedAt: data.completedAt,
      duration: data.duration,
    },
  },
];
```

#### 2.4 保存

点击 **"Execute Node"** 测试 → 点击 **"Save"**

---

### 步骤 3: 修改 Switch 节点（添加第 5 个规则）

#### 3.1 打开 Switch 节点

双击 **"Switch"** 节点

#### 3.2 添加新规则（Rule 0）

1. 点击 **"Add Routing Rule"**
2. 将新规则**拖到最顶部**（Rule 0）
3. 设置条件：
   - **Left Value**: `{{ $json.found }}`
   - **Operation**: `equals`
   - **Right Value**: `false` (布尔值)

#### 3.3 确认所有规则顺序

- **Rule 0**: `found = false` → Not Found
- **Rule 1**: `status = "pending"` → Pending
- **Rule 2**: `status = "processing"` → Processing
- **Rule 3**: `status = "completed"` → Completed
- **Rule 4**: `status = "failed"` → Failed

#### 3.4 保存

点击 **"Save"**

---

### 步骤 4: 添加 "Format Response - Not Found" 节点

#### 4.1 创建节点

1. 从 Switch 的 **Output 0** (Rule 0) 拉一条线
2. 添加 **"Code"** 节点
3. 命名为 **"Format Response - Not Found"**

#### 4.2 粘贴代码

```javascript
// 格式化"未找到"响应
const data = $input.first().json;

return [
  {
    json: {
      taskId: data.taskId || 'unknown',
      status: 'not_found',
      error: 'Task not found in database',
      message: 'The task may not exist or was deleted',
    },
  },
];
```

#### 4.3 连接到 "Respond to Webhook"

"Format Response - Not Found" → "Respond to Webhook"

#### 4.4 保存

---

### 步骤 5: 修改 "Format Response - Pending" 节点

#### 5.1 打开节点

双击 **"Format Response - Pending"** 节点

#### 5.2 找到 return 语句

```javascript
// 原代码（错误）❌
return {
  taskId: taskData.taskId,
  status: 'pending',
  message: 'Task is waiting to be processed',
  createdAt: taskData.createdAt,
};
```

#### 5.3 替换为

```javascript
// 新代码（正确）✅
return [
  {
    json: {
      taskId: taskData.taskId,
      status: 'pending',
      message: 'Task is waiting to be processed',
      createdAt: taskData.createdAt,
    },
  },
];
```

#### 5.4 保存

---

### 步骤 6: 修改 "Format Response - Processing" 节点

#### 6.1 打开节点

双击 **"Format Response - Processing"** 节点

#### 6.2 找到 return 语句

```javascript
// 原代码（错误）❌
return {
  taskId: taskData.taskId,
  status: 'processing',
  message: 'Task is being processed by AI',
  elapsedTime: `${elapsed}s`,
  createdAt: taskData.createdAt,
};
```

#### 6.3 替换为

```javascript
// 新代码（正确）✅
return [
  {
    json: {
      taskId: taskData.taskId,
      status: 'processing',
      message: 'Task is being processed by AI',
      elapsedTime: `${elapsed}s`,
      createdAt: taskData.createdAt,
    },
  },
];
```

#### 6.4 保存

---

### 步骤 7: 修改 "Format Response - Completed" 节点

#### 7.1 打开节点

双击 **"Format Response - Completed"** 节点

#### 7.2 找到 return 语句（最后几行）

```javascript
// 原代码（错误）❌
return {
  taskId: taskData.taskId,
  status: 'completed',
  result: result,
  completedAt: taskData.completedAt || new Date().toISOString(),
  duration: taskData.duration || 0,
};
```

#### 7.3 替换为

```javascript
// 新代码（正确）✅
return [
  {
    json: {
      taskId: taskData.taskId,
      status: 'completed',
      result: result,
      completedAt: taskData.completedAt || new Date().toISOString(),
      duration: taskData.duration || 0,
    },
  },
];
```

#### 7.4 完整代码（包含增强的错误处理）

```javascript
// 格式化 completed 状态响应（增强错误处理）
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
    console.error('Raw result (first 200 chars):', result.substring(0, 200));
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
  console.warn('⚠️ Result is empty or undefined');
  result = {
    empty: true,
    message: 'Task completed but result is empty',
  };
}

return [
  {
    json: {
      taskId: taskData.taskId,
      status: 'completed',
      result: result,
      completedAt: taskData.completedAt || new Date().toISOString(),
      duration: taskData.duration || 0,
    },
  },
];
```

#### 7.5 保存

---

### 步骤 8: 修改 "Format Response - Failed" 节点

#### 8.1 打开节点

双击 **"Format Response - Failed"** 节点

#### 8.2 找到 return 语句

```javascript
// 原代码（错误）❌
return {
  taskId: taskData.taskId,
  status: 'failed',
  error: taskData.error || 'Unknown error',
  completedAt: taskData.completedAt,
};
```

#### 8.3 替换为

```javascript
// 新代码（正确）✅
return [
  {
    json: {
      taskId: taskData.taskId,
      status: 'failed',
      error: taskData.error || 'Unknown error',
      completedAt: taskData.completedAt || new Date().toISOString(),
    },
  },
];
```

#### 8.4 保存

---

## ✅ 修改完成检查清单

完成所有修改后，请检查：

### 节点连接检查

- [ ] Webhook → Extract Task ID
- [ ] Extract Task ID → Get row(s)
- [ ] Get row(s) → **Normalize Data** (新增！)
- [ ] Normalize Data → Switch
- [ ] Switch 有 **5 个输出分支**

### Switch 输出连接检查

- [ ] Output 0 (found=false) → Format Response - Not Found (新增！)
- [ ] Output 1 (pending) → Format Response - Pending
- [ ] Output 2 (processing) → Format Response - Processing
- [ ] Output 3 (completed) → Format Response - Completed
- [ ] Output 4 (failed) → Format Response - Failed

### 所有格式化节点连接检查

- [ ] Format Response - Not Found → Respond to Webhook
- [ ] Format Response - Pending → Respond to Webhook
- [ ] Format Response - Processing → Respond to Webhook
- [ ] Format Response - Completed → Respond to Webhook
- [ ] Format Response - Failed → Respond to Webhook

### 代码格式检查

- [ ] 所有 Code 节点的 return 语句都是 `return [{ json: {...} }];` 格式
- [ ] 没有任何节点是 `return {...};` 格式

---

## 🧪 测试工作流

### 1. 在 n8n 中测试

1. 点击右上角的 **"Test Workflow"** 按钮
2. 点击 **"Listen for Test Event"**
3. 复制 Webhook URL（应该类似于 `https://n8n.wendealai.com/webhook/task-status/:taskId`）
4. 在浏览器或 Postman 中访问：
   ```
   https://n8n.wendealai.com/webhook/task-status/test_123
   ```

### 2. 检查执行结果

在 n8n 执行历史中，应该看到：

- ✅ 所有节点成功执行（绿色勾号）
- ✅ 没有红色错误标记
- ✅ "Respond to Webhook" 节点有返回数据

### 3. 使用 curl 测试

```bash
# 测试真实的 taskId
curl "https://n8n.wendealai.com/webhook/task-status/task_1761794252181_chn5t4mwa"
```

**预期结果**：

- HTTP 200 OK
- 返回 JSON 数据
- 有 CORS 头

---

## 🚀 激活工作流

所有修改和测试完成后：

1. 点击右上角的 **"Active"** 开关
2. 确认工作流状态为 **绿色"Active"**
3. 刷新前端页面，测试完整流程

---

## 🎯 预期结果

修改完成后：

- ✅ 前端轮询不再报 500 错误
- ✅ 前端能正常获取任务状态
- ✅ AI 生成的内容能正确显示在界面上
- ✅ 控制台不再有 CORS 错误

---

## 💡 常见问题

### Q1: 修改后还是报错 "Code doesn't return items properly"

**A**: 检查是否有遗漏的节点，确保**所有** Code 节点的 return 语句都是 `[{ json: {...} }]` 格式。

### Q2: Switch 节点没有生效

**A**: 确认 Switch 规则的顺序，Rule 0 必须是 `found = false`。

### Q3: 找不到 "Normalize Data" 节点的插入位置

**A**: 删除 "Get row(s)" 到 "Switch" 的连接线，在两者之间添加新的 Code 节点。

### Q4: "Format Response - Not Found" 连接不上

**A**: 确认 Switch 节点有 5 个输出，Output 0 应该连接到这个新节点。

---

## 📞 需要帮助？

如果遇到问题：

1. **检查节点执行日志**：点击节点查看详细输出
2. **查看工作流执行历史**：检查哪个节点报错
3. **对比 JSON 文件**：参考 `workflows/workflow3-query-status-FIXED.json`

---

**预计修改时间**：10-15 分钟 ⏱️
**难度**：⭐⭐☆☆☆ (中等)
