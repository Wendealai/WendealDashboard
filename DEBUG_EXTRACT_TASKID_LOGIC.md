# 🔍 调试：Extract Task ID 逻辑问题

## 🔴 问题描述

**症状**：

- 工作流1创建了任务，生成了taskId（例如：`task_1761794252181_chn5t4mwa`）
- 前端获得这个taskId并开始轮询
- 工作流3从URL提取taskId，但提取到的值与数据库中的不一致
- 导致Get row(s)查询不到数据
- 形成死循环（一直轮询，永远pending）

## 🎯 需要验证的点

### 1. 工作流1创建的taskId格式是什么？

**检查方法**：

- 在n8n中打开工作流1的执行历史
- 查看"Respond to Webhook"节点的输出
- 确认返回的`taskId`值

**示例**：

```json
{
  "taskId": "task_1761794252181_chn5t4mwa",
  "status": "pending"
}
```

---

### 2. 前端实际发送的查询URL是什么？

**检查方法**：

- 打开浏览器开发者工具 → Network标签
- 查看GET请求到`task-status`的完整URL
- 复制完整的URL

**示例**：

```
https://n8n.wendealai.com/webhook/process-subject-task/task-status/task_1761794252181_chn5t4mwa
```

---

### 3. 工作流3从URL中提取到了什么？

**检查方法**：

- 在n8n中查看工作流3的执行历史
- 点击"Extract Task ID"节点
- 查看输出的taskId值

**可能的问题**：

- 提取到了`:taskId`（字面量）
- 提取到了空字符串
- 提取到了错误的URL段（例如`process-subject-task`）

---

## 🔧 调试版 Extract Task ID 代码

使用这个超详细的调试版本来定位问题：

```javascript
// =================== 调试版 Extract Task ID ===================
// 这个版本会打印所有可能的信息，帮助定位问题

const inputData = $input.first().json;

console.log('='.repeat(80));
console.log('🔍 DEBUG: Extract Task ID - START');
console.log('='.repeat(80));

// 1. 打印完整输入数据
console.log('📥 Full input data:');
console.log(JSON.stringify(inputData, null, 2));

// 2. 打印所有可用的字段
console.log('📊 Available keys:', Object.keys(inputData));

// 3. 逐个检查可能包含taskId的字段
console.log('🔍 Checking all possible locations:');
console.log('  - inputData.webhookUrl:', inputData.webhookUrl);
console.log('  - inputData.path:', inputData.path);
console.log('  - inputData.params:', JSON.stringify(inputData.params));
console.log('  - inputData.query:', JSON.stringify(inputData.query));
console.log('  - inputData.body:', JSON.stringify(inputData.body));

let taskId = '';
let extractMethod = '';

// 方法1: 从webhookUrl提取
if (inputData.webhookUrl) {
  console.log('🔍 Method 1: Extracting from webhookUrl');
  console.log('   Raw URL:', inputData.webhookUrl);

  // 尝试多种解析方式
  const url = inputData.webhookUrl;

  // 方式1a: 分割后取最后一段
  const urlParts = url.split('/').filter(part => part && part !== '');
  console.log('   URL parts (split by /):', urlParts);

  const lastPart = urlParts[urlParts.length - 1];
  console.log('   Last part:', lastPart);

  // 方式1b: 查找task-status后的部分
  const taskStatusIndex = urlParts.findIndex(part => part === 'task-status');
  console.log('   task-status index:', taskStatusIndex);

  if (taskStatusIndex !== -1 && taskStatusIndex < urlParts.length - 1) {
    const afterTaskStatus = urlParts[taskStatusIndex + 1];
    console.log('   Part after task-status:', afterTaskStatus);

    if (afterTaskStatus && afterTaskStatus !== ':taskId') {
      taskId = afterTaskStatus;
      extractMethod = 'webhookUrl (after task-status)';
      console.log('   ✅ Found valid taskId:', taskId);
    }
  }

  // 如果还没找到，尝试用最后一段（如果不是:taskId）
  if (!taskId && lastPart && lastPart !== ':taskId') {
    taskId = lastPart;
    extractMethod = 'webhookUrl (last part)';
    console.log('   ✅ Using last part as taskId:', taskId);
  }
}

// 方法2: 从params提取
if (!taskId && inputData.params && inputData.params.taskId) {
  console.log('🔍 Method 2: Checking params.taskId');
  const paramsTaskId = inputData.params.taskId;
  console.log('   params.taskId:', paramsTaskId);

  if (paramsTaskId !== ':taskId') {
    taskId = paramsTaskId;
    extractMethod = 'params.taskId';
    console.log('   ✅ Using params.taskId:', taskId);
  } else {
    console.log('   ❌ params.taskId is literal ":taskId"');
  }
}

// 方法3: 从path提取
if (!taskId && inputData.path) {
  console.log('🔍 Method 3: Extracting from path');
  console.log('   Raw path:', inputData.path);

  const pathParts = inputData.path.split('/').filter(p => p);
  console.log('   Path parts:', pathParts);

  // 查找task-status后的部分
  const taskStatusIndex = pathParts.findIndex(part => part === 'task-status');
  console.log('   task-status index:', taskStatusIndex);

  if (taskStatusIndex !== -1 && taskStatusIndex < pathParts.length - 1) {
    const afterTaskStatus = pathParts[taskStatusIndex + 1];
    console.log('   Part after task-status:', afterTaskStatus);

    if (afterTaskStatus && afterTaskStatus !== ':taskId') {
      taskId = afterTaskStatus;
      extractMethod = 'path (after task-status)';
      console.log('   ✅ Found valid taskId:', taskId);
    }
  }

  // 如果还没找到，尝试用最后一段
  if (!taskId && pathParts.length > 0) {
    const lastPart = pathParts[pathParts.length - 1];
    console.log('   Last part:', lastPart);

    if (lastPart !== ':taskId') {
      taskId = lastPart;
      extractMethod = 'path (last part)';
      console.log('   ✅ Using last part as taskId:', taskId);
    }
  }
}

// 方法4: 从query参数提取
if (!taskId && inputData.query && inputData.query.taskId) {
  console.log('🔍 Method 4: Checking query.taskId');
  taskId = inputData.query.taskId;
  extractMethod = 'query.taskId';
  console.log('   ✅ Using query.taskId:', taskId);
}

// 最终结果
console.log('='.repeat(80));
console.log('🎯 EXTRACTION RESULT:');
console.log('   taskId:', taskId);
console.log('   Method:', extractMethod);
console.log('   Length:', taskId ? taskId.length : 0);
console.log('   Type:', typeof taskId);
console.log(
  '   Is valid:',
  taskId && taskId !== ':taskId' && taskId.trim() !== ''
);

// 验证
if (!taskId || taskId.trim() === '' || taskId === ':taskId') {
  console.error('='.repeat(80));
  console.error('❌ FAILED TO EXTRACT VALID TASKID');
  console.error('='.repeat(80));
  console.error('Received:', JSON.stringify(taskId));
  console.error('All tried methods failed.');
  console.error('Please check:');
  console.error('  1. The actual URL being called');
  console.error('  2. Webhook path configuration in n8n');
  console.error('  3. Frontend statusUrl format');

  throw new Error(
    'Unable to extract valid taskId from request. ' +
      'Received: "' +
      taskId +
      '". ' +
      'Check console logs for detailed debugging information.'
  );
}

console.log('✅ TaskId extraction successful!');
console.log('='.repeat(80));
console.log('🔍 DEBUG: Extract Task ID - END');
console.log('='.repeat(80));

// 返回结果
return [
  {
    json: {
      taskId: taskId.trim(),
      _debug: {
        extractMethod: extractMethod,
        originalUrl: inputData.webhookUrl,
        originalPath: inputData.path,
      },
    },
  },
];
```

---

## 🧪 使用调试代码的步骤

### 步骤1: 替换Extract Task ID节点代码

1. 打开n8n工作流3
2. 双击"Extract Task ID"节点
3. **完全替换**为上面的调试代码
4. 保存并激活工作流

---

### 步骤2: 触发一次完整流程

1. 在前端提交一个新的subject生成请求
2. 等待2.5分钟后开始轮询
3. 观察n8n工作流3的执行

---

### 步骤3: 查看详细日志

1. 在n8n中，点击"Executions"
2. 选择最新的工作流3执行记录
3. 点击"Extract Task ID"节点
4. 查看"Console Output"（控制台输出）

---

### 步骤4: 分析日志并报告

**请复制完整的控制台输出并发给我**，特别关注：

```
🔍 DEBUG: Extract Task ID - START
📥 Full input data: {...}
📊 Available keys: [...]
🔍 Checking all possible locations:
  - inputData.webhookUrl: ???
  - inputData.path: ???
  - inputData.params: ???
🎯 EXTRACTION RESULT:
   taskId: ???
   Method: ???
```

---

## 🎯 可能的问题和解决方案

### 问题1: webhookUrl包含`:taskId`字面量

**症状**：

```
webhookUrl: "https://n8n.wendealai.com/webhook/process-subject-task/task-status/:taskId"
                                                                                    ↑
                                                                            字面量，不是实际值
```

**原因**：前端访问的URL不正确，或Webhook配置有问题

**解决方案**：检查前端实际发送的URL

---

### 问题2: taskId被URL编码了

**症状**：

```
提取到的taskId: "task_1761794252181_chn5t4mwa%20" (带%20等编码字符)
数据库中的taskId: "task_1761794252181_chn5t4mwa"
```

**解决方案**：添加URL解码

```javascript
taskId = decodeURIComponent(taskId.trim());
```

---

### 问题3: 提取位置错误

**症状**：

```
URL: https://n8n.wendealai.com/webhook/process-subject-task/task-status/ACTUAL_TASK_ID
提取到: "process-subject-task" ❌
应该是: "ACTUAL_TASK_ID" ✅
```

**解决方案**：调整提取逻辑，查找"task-status"后面的部分

---

### 问题4: 数据库中的taskId格式不同

**症状**：

```
前端发送: task_1761794252181_chn5t4mwa
数据库存储: task_1761794252181 (缺少后缀)
```

**解决方案**：检查工作流1创建taskId的逻辑

---

## 🔍 同时检查数据库中的taskId

为了对比，也需要检查数据库中实际存储的taskId：

### 临时查询工作流

创建一个临时测试工作流：

```
1. Manual Trigger
   ↓
2. Data Table - Get All
   - Operation: Get All
   - Table: rednote_subject_tasks
   - Limit: 10
   ↓
3. 查看输出
```

**查看输出中的taskId格式**，例如：

```json
[
  {
    "taskId": "task_1761794252181_chn5t4mwa",
    "status": "completed",
    ...
  }
]
```

---

## 📝 请提供以下信息

为了精准定位问题，请提供：

### 1. 工作流3执行日志

从"Extract Task ID"节点的Console Output复制**完整日志**

### 2. 前端Network请求

浏览器开发者工具 → Network → 找到task-status请求 → 复制**完整URL**

### 3. 数据库中的taskId

执行临时查询工作流，复制**最新任务的taskId**

### 4. 工作流1的输出

查看工作流1执行历史，复制**Respond to Webhook节点的输出**

---

有了这些信息，我就能精准定位问题并提供修复方案！🎯
