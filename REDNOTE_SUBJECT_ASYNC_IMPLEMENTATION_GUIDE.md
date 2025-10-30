# RedNote Subject Generation - 异步处理实现指南

## 概述

本指南提供方案2（异步处理模式）的完整实现步骤，彻底解决 Cloudflare 100秒超时问题。

## 架构概览

```
前端提交请求 → n8n 立即返回任务ID → 后台异步处理 → 前端轮询获取结果
```

**优势**：

- ✅ 支持任意长时间的处理（小时级别）
- ✅ 用户体验流畅
- ✅ 可以关闭页面后再回来查看
- ✅ 完全避免超时问题

---

## 第一步：创建 Airtable 任务表

### 1.1 登录 Airtable

访问：https://airtable.com

### 1.2 创建新表

**Base 名称**：`RedNote Subject Tasks`

**Table 名称**：`tasks`

### 1.3 表结构设计

| 字段名      | 类型                    | 说明                   | 示例                                           |
| ----------- | ----------------------- | ---------------------- | ---------------------------------------------- |
| taskId      | Single line text (主键) | 任务唯一标识           | `task_1735516800000_abc123`                    |
| subject     | Long text               | 用户输入的主题         | `隔代育儿冲突的沟通方式`                       |
| status      | Single select           | 任务状态               | `pending`, `processing`, `completed`, `failed` |
| result      | Long text               | 生成的结果（JSON格式） | `{"title":"...", "content":"..."}`             |
| error       | Long text               | 错误信息（如果失败）   | `AI request timeout`                           |
| createdAt   | Date                    | 创建时间               | `2025-01-29 10:00:00`                          |
| startedAt   | Date                    | 开始处理时间           | `2025-01-29 10:00:05`                          |
| completedAt | Date                    | 完成时间               | `2025-01-29 10:02:30`                          |
| duration    | Number                  | 处理耗时（秒）         | `145`                                          |
| retryCount  | Number                  | 重试次数               | `0`                                            |

### 1.4 配置 Status 选项

```
- pending (灰色)
- processing (蓝色)
- completed (绿色)
- failed (红色)
```

### 1.5 创建视图

**视图1：Active Tasks**

- 筛选：status = pending OR processing
- 排序：createdAt (descending)

**视图2：Completed Tasks**

- 筛选：status = completed
- 排序：completedAt (descending)

**视图3：Failed Tasks**

- 筛选：status = failed
- 排序：createdAt (descending)

---

## 第二步：n8n Workflow 实现

### 2.1 Workflow 1: 接收请求并返回任务ID

**Workflow 名称**：`RedNote Subject - Submit Task`

**Webhook 路径**：`/rednotesubject`

#### 节点配置

**节点 1: Webhook (Trigger)**

```json
{
  "path": "rednotesubject",
  "httpMethod": "POST",
  "responseMode": "responseNode",
  "options": {
    "allowedOrigins": "*"
  }
}
```

**节点 2: Generate Task ID (Code)**

```javascript
// 生成唯一任务ID
const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const subject = $json.subject || '';
const timestamp = $json.timestamp || new Date().toISOString();

return {
  taskId: taskId,
  subject: subject,
  timestamp: timestamp,
  status: 'pending',
  createdAt: new Date().toISOString(),
};
```

**节点 3: Create Task in Airtable**

```json
{
  "operation": "create",
  "table": "tasks",
  "options": {},
  "fields": {
    "taskId": "={{ $json.taskId }}",
    "subject": "={{ $json.subject }}",
    "status": "pending",
    "createdAt": "={{ $json.createdAt }}",
    "retryCount": 0
  }
}
```

**节点 4: Respond to Webhook**

```json
{
  "responseMode": "onReceived",
  "responseCode": 200,
  "responseData": {
    "taskId": "={{ $json.taskId }}",
    "status": "pending",
    "message": "Task created successfully. Use taskId to check status.",
    "statusUrl": "https://n8n.wendealai.com/webhook/task-status/{{ $json.taskId }}"
  },
  "responseHeaders": {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  }
}
```

**节点 5: Trigger Processing Workflow (Webhook)**

```json
{
  "method": "POST",
  "url": "https://n8n.wendealai.com/webhook/process-subject-task",
  "sendBody": true,
  "jsonBody": {
    "taskId": "={{ $json.taskId }}",
    "subject": "={{ $json.subject }}"
  },
  "options": {
    "timeout": 5000,
    "redirect": {
      "followRedirects": false
    }
  }
}
```

**注意**：节点4和节点5是并行的，节点4立即返回响应，节点5异步触发处理。

---

### 2.2 Workflow 2: 后台处理任务

**Workflow 名称**：`RedNote Subject - Process Task`

**Webhook 路径**：`/process-subject-task`

#### 节点配置

**节点 1: Webhook (Trigger)**

```json
{
  "path": "process-subject-task",
  "httpMethod": "POST",
  "responseMode": "onReceived"
}
```

**节点 2: Get Task from Airtable**

```json
{
  "operation": "list",
  "table": "tasks",
  "options": {
    "filterByFormula": "taskId = '{{ $json.taskId }}'"
  }
}
```

**节点 3: Update Status to Processing**

```json
{
  "operation": "update",
  "table": "tasks",
  "id": "={{ $json.id }}",
  "fields": {
    "status": "processing",
    "startedAt": "={{ new Date().toISOString() }}"
  }
}
```

**节点 4: OpenAI Chat Model (AI Processing)**

```json
{
  "model": "gpt-3.5-turbo",
  "messages": {
    "messageType": "defineMessages",
    "messages": [
      {
        "role": "system",
        "content": "你是一个专业的小红书内容创作助手。根据用户提供的主题，生成吸引人的内容创意。"
      },
      {
        "role": "user",
        "content": "主题：{{ $json.subject }}\n\n请生成：\n1. 一个吸引人的标题\n2. 详细的内容大纲\n3. 3个创作建议\n\n以JSON格式返回：{\"title\": \"...\", \"content\": \"...\", \"suggestions\": [\"...\", \"...\", \"...\"]}"
      }
    ]
  },
  "options": {
    "temperature": 0.7,
    "maxTokens": 800,
    "timeout": 120000
  }
}
```

**节点 5: Parse AI Response (Code)**

```javascript
try {
  const aiResponse = $json.message?.content || $json.text || '';

  // 尝试解析JSON
  let result;
  try {
    result = JSON.parse(aiResponse);
  } catch (e) {
    // 如果不是JSON，构造一个结果对象
    result = {
      content: aiResponse,
      title: aiResponse.split('\n')[0] || 'Generated Content',
      suggestions: [],
    };
  }

  return {
    taskId: $('Webhook').first().json.taskId,
    status: 'completed',
    result: JSON.stringify(result),
    completedAt: new Date().toISOString(),
    duration: Math.floor(
      (Date.now() -
        new Date(
          $('Get Task from Airtable').first().json.createdAt
        ).getTime()) /
        1000
    ),
  };
} catch (error) {
  return {
    taskId: $('Webhook').first().json.taskId,
    status: 'failed',
    error: error.message,
    completedAt: new Date().toISOString(),
  };
}
```

**节点 6: Update Task with Result**

```json
{
  "operation": "update",
  "table": "tasks",
  "id": "={{ $('Get Task from Airtable').first().json.id }}",
  "fields": {
    "status": "={{ $json.status }}",
    "result": "={{ $json.result }}",
    "completedAt": "={{ $json.completedAt }}",
    "duration": "={{ $json.duration }}"
  }
}
```

**节点 7: Error Handler (IF Node)**

分支条件：`{{ $json.status === 'failed' }}`

**True 分支 - Update Error**:

```json
{
  "operation": "update",
  "table": "tasks",
  "id": "={{ $('Get Task from Airtable').first().json.id }}",
  "fields": {
    "status": "failed",
    "error": "={{ $json.error }}",
    "completedAt": "={{ $json.completedAt }}"
  }
}
```

---

### 2.3 Workflow 3: 查询任务状态

**Workflow 名称**：`RedNote Subject - Get Task Status`

**Webhook 路径**：`/task-status/:taskId`

#### 节点配置

**节点 1: Webhook (Trigger)**

```json
{
  "path": "task-status",
  "httpMethod": "GET",
  "responseMode": "responseNode",
  "options": {
    "allowedOrigins": "*"
  }
}
```

**节点 2: Extract Task ID (Code)**

```javascript
// 从路径参数获取 taskId
const fullPath = $json.path || '';
const taskId = fullPath.split('/').pop();

return {
  taskId: taskId,
};
```

**节点 3: Get Task from Airtable**

```json
{
  "operation": "list",
  "table": "tasks",
  "options": {
    "filterByFormula": "taskId = '{{ $json.taskId }}'"
  }
}
```

**节点 4: Check if Task Found (IF Node)**

分支条件：`{{ $json.length > 0 }}`

**True 分支 - Return Task Status**:

```javascript
// Code Node
const task = $json[0];

let response = {
  taskId: task.taskId,
  status: task.status,
  createdAt: task.createdAt,
};

if (task.status === 'completed') {
  response.result = JSON.parse(task.result || '{}');
  response.completedAt = task.completedAt;
  response.duration = task.duration;
} else if (task.status === 'failed') {
  response.error = task.error;
  response.completedAt = task.completedAt;
} else if (task.status === 'processing') {
  response.startedAt = task.startedAt;
  response.estimatedTimeRemaining = 'Processing...';
}

return response;
```

**False 分支 - Return Not Found**:

```javascript
// Code Node
return {
  error: 'Task not found',
  taskId: $('Extract Task ID').first().json.taskId,
};
```

**节点 5: Respond to Webhook**

```json
{
  "responseMode": "onReceived",
  "responseCode": "={{ $json.error ? 404 : 200 }}",
  "responseData": "={{ $json }}",
  "responseHeaders": {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  }
}
```

---

## 第三步：前端实现

### 3.1 更新组件代码

在 `RedNoteContentGenerator.tsx` 中添加异步处理函数：

```typescript
/**
 * 异步主题生成函数
 */
const handleGenerateSubjectAsync = useCallback(async () => {
  if (!subjectInput.trim()) {
    antdMessage.warning('Please enter subject input');
    return;
  }

  setSubjectLoading(true);
  setSubjectError(null);
  setSubjectProgress(10);
  setSubjectProgressText('Creating task...');

  try {
    const webhookUrl = 'https://n8n.wendealai.com/webhook/rednotesubject';

    console.log('📤 Submitting async task...');

    // 步骤1: 提交任务，获取任务ID
    const submitResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject: subjectInput.trim(),
        timestamp: new Date().toISOString(),
      }),
      mode: 'cors',
    });

    if (!submitResponse.ok) {
      throw new Error(`Failed to submit task: ${submitResponse.status}`);
    }

    const submitData = await submitResponse.json();
    const taskId = submitData.taskId;

    console.log('✅ Task created:', taskId);
    console.log('📍 Status URL:', submitData.statusUrl);

    setSubjectProgress(20);
    setSubjectProgressText(
      `Task created (ID: ${taskId.slice(-8)}). Processing in background...`
    );

    // 步骤2: 轮询任务状态
    const statusUrl = `https://n8n.wendealai.com/webhook/task-status/${taskId}`;
    let attempts = 0;
    const maxAttempts = 240; // 最多轮询 240 次（20 分钟，每 5 秒一次）
    const pollInterval = 5000; // 5 秒

    const checkStatus = async (): Promise<void> => {
      return new Promise((resolve, reject) => {
        const intervalId = setInterval(async () => {
          attempts++;

          // 计算进度（20% -> 95%）
          const progress = Math.min(20 + (attempts / maxAttempts) * 75, 95);
          setSubjectProgress(progress);

          // 更新状态文本
          const elapsedSeconds = attempts * (pollInterval / 1000);
          const elapsedMinutes = Math.floor(elapsedSeconds / 60);
          const remainingSeconds = elapsedSeconds % 60;

          if (elapsedSeconds < 60) {
            setSubjectProgressText(
              `Processing... (${elapsedSeconds}s elapsed)`
            );
          } else {
            setSubjectProgressText(
              `Processing... (${elapsedMinutes}m ${remainingSeconds}s elapsed) - This is taking longer than usual`
            );
          }

          try {
            console.log(`🔄 Polling attempt ${attempts}/${maxAttempts}...`);

            const statusResponse = await fetch(statusUrl, {
              method: 'GET',
              mode: 'cors',
            });

            if (!statusResponse.ok) {
              if (statusResponse.status === 404) {
                console.warn('Task not found, will retry...');
                return; // 继续轮询
              }
              throw new Error(`Status check failed: ${statusResponse.status}`);
            }

            const statusData = await statusResponse.json();
            console.log('📊 Task status:', statusData);

            if (statusData.status === 'completed') {
              // ✅ 任务完成
              clearInterval(intervalId);
              setSubjectProgress(100);
              setSubjectProgressText('Subject generation complete!');

              console.log('🎉 Task completed!');
              console.log('📄 Result:', statusData.result);

              setSubjectResponse(statusData.result);
              antdMessage.success({
                content: `Subject generated successfully! (${statusData.duration}s)`,
                duration: 5,
              });
              setSubjectLoading(false);
              resolve();
            } else if (statusData.status === 'failed') {
              // ❌ 任务失败
              clearInterval(intervalId);
              console.error('❌ Task failed:', statusData.error);
              reject(new Error(statusData.error || 'Task processing failed'));
            } else if (statusData.status === 'processing') {
              // 🔄 处理中
              console.log('⏳ Task is processing...');
            } else if (statusData.status === 'pending') {
              // ⏰ 等待中
              console.log('⏰ Task is pending...');
            }
          } catch (pollError: any) {
            console.error('Polling error:', pollError);
            // 不中断轮询，继续尝试
          }

          // 检查是否超过最大尝试次数
          if (attempts >= maxAttempts) {
            clearInterval(intervalId);
            reject(
              new Error(
                `Task timeout: Exceeded maximum polling time (${(maxAttempts * pollInterval) / 1000}s).\n` +
                  `Task ID: ${taskId}\n` +
                  `You can check the status manually in n8n or Airtable.`
              )
            );
          }
        }, pollInterval);
      });
    };

    // 执行轮询
    await checkStatus();
  } catch (err: any) {
    console.error('Subject generation failed:', err);
    const errorMessage = err.message || 'Subject generation failed';
    setSubjectError(errorMessage);
    antdMessage.error({
      content: errorMessage,
      duration: 10,
    });
    setSubjectProgress(0);
    setSubjectProgressText('');
    setSubjectLoading(false);
  }
}, [subjectInput]);
```

### 3.2 替换原有的生成函数

在 `handleGenerateSubject` 的地方调用新的异步函数：

```typescript
// 在按钮的 onClick 中使用
onClick = { handleGenerateSubjectAsync }; // 替换原来的 handleGenerateSubject
```

或者保留两个函数，添加一个切换开关让用户选择使用同步还是异步模式。

### 3.3 添加任务ID显示（可选）

```typescript
// 在状态中添加
const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

// 在提交任务后保存
setCurrentTaskId(taskId);

// 在UI中显示
{currentTaskId && (
  <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
    Task ID: {currentTaskId}
    <Button
      type="link"
      size="small"
      onClick={() => {
        navigator.clipboard.writeText(currentTaskId);
        antdMessage.success('Task ID copied!');
      }}
    >
      Copy
    </Button>
  </div>
)}
```

---

## 第四步：测试验证

### 4.1 测试 Workflow 1 (提交任务)

```bash
# 使用 curl 测试
curl -X POST https://n8n.wendealai.com/webhook/rednotesubject \
  -H "Content-Type: application/json" \
  -d '{"subject":"测试主题","timestamp":"2025-01-29T10:00:00.000Z"}'

# 预期响应
{
  "taskId": "task_1735516800000_abc123",
  "status": "pending",
  "message": "Task created successfully. Use taskId to check status.",
  "statusUrl": "https://n8n.wendealai.com/webhook/task-status/task_1735516800000_abc123"
}
```

### 4.2 检查 Airtable

1. 打开 Airtable base
2. 查看 `tasks` 表
3. 确认新记录已创建，status 为 `pending`

### 4.3 测试 Workflow 2 (处理任务)

等待几秒后，检查 Airtable：

- status 应该变为 `processing`
- 然后变为 `completed`
- result 字段应该有 JSON 数据

### 4.4 测试 Workflow 3 (查询状态)

```bash
# 使用任务ID查询
curl https://n8n.wendealai.com/webhook/task-status/task_1735516800000_abc123

# 预期响应（completed）
{
  "taskId": "task_1735516800000_abc123",
  "status": "completed",
  "result": {
    "title": "吸引人的标题",
    "content": "详细内容...",
    "suggestions": ["建议1", "建议2", "建议3"]
  },
  "createdAt": "2025-01-29T10:00:00.000Z",
  "completedAt": "2025-01-29T10:02:30.000Z",
  "duration": 150
}
```

### 4.5 前端集成测试

1. 打开应用: `http://localhost:5174/`
2. 输入主题: "测试异步处理"
3. 点击 Generate
4. 观察：
   - ✅ 快速返回任务ID
   - ✅ 进度条显示处理中
   - ✅ 状态文本更新
   - ✅ 最终显示结果

---

## 第五步：优化和监控

### 5.1 添加自动清理

**Workflow 4: 清理旧任务**

定时触发（每天凌晨2点）：

```javascript
// 删除30天前的已完成任务
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

// Airtable Delete Node
{
  "operation": "delete",
  "table": "tasks",
  "options": {
    "filterByFormula": `AND(status = 'completed', completedAt < '${thirtyDaysAgo.toISOString()}')`
  }
}
```

### 5.2 添加失败重试机制

在 Workflow 2 的错误处理中添加：

```javascript
// 检查重试次数
if (task.retryCount < 3) {
  // 更新重试次数
  await updateTask({
    status: 'pending',
    retryCount: task.retryCount + 1,
  });

  // 5分钟后重新触发处理
  setTimeout(() => {
    triggerProcessing(taskId);
  }, 300000);
} else {
  // 超过重试次数，标记为失败
  await updateTask({
    status: 'failed',
    error: 'Max retries exceeded',
  });
}
```

### 5.3 添加性能监控

在 Airtable 中创建视图：

**Performance Dashboard**:

- 平均处理时间
- 成功率
- 失败任务统计
- 重试次数分布

---

## 常见问题

### Q1: 如果 Airtable API 限流怎么办？

**A**: Airtable 免费版每秒限制 5 次请求。解决方案：

- 使用 n8n 的 Rate Limit 节点
- 批量查询和更新
- 考虑升级 Airtable 计划

### Q2: 轮询频率如何设置？

**A**: 推荐：

- 前 30 秒: 每 3 秒轮询一次（快速任务）
- 30-120 秒: 每 5 秒轮询一次
- 超过 120 秒: 每 10 秒轮询一次

### Q3: 如何处理用户关闭页面的情况？

**A**:

- 将 taskId 保存到 localStorage
- 页面重新打开时检查未完成的任务
- 提供"查看历史任务"功能

### Q4: 多个用户同时使用会冲突吗？

**A**: 不会，因为：

- 每个任务有唯一的 taskId
- Airtable 支持并发读写
- n8n workflow 可以并行处理

---

## 部署检查清单

- [ ] Airtable base 已创建
- [ ] Airtable API key 已配置到 n8n
- [ ] Workflow 1 (提交任务) 已创建并激活
- [ ] Workflow 2 (处理任务) 已创建并激活
- [ ] Workflow 3 (查询状态) 已创建并激活
- [ ] CORS 头已正确配置
- [ ] 前端代码已更新
- [ ] 所有 webhooks 可访问
- [ ] 测试用例全部通过
- [ ] 监控和日志已配置

---

## 成功标准

- ✅ 任务提交响应时间 < 2 秒
- ✅ 支持处理时间 > 10 分钟的任务
- ✅ 成功率 > 95%
- ✅ 用户体验流畅
- ✅ 可以处理并发请求

---

## 下一步

1. **立即开始**: 创建 Airtable base
2. **本周完成**: 实现全部 3 个 workflows
3. **测试验证**: 确保所有功能正常
4. **逐步迁移**: 先保留原有同步方式，并行运行
5. **收集反馈**: 观察用户使用情况
6. **完全切换**: 确认稳定后完全使用异步方式

**预计工作量**: 4-8 小时

**难度评级**: ⭐⭐⭐ (中等)

需要我帮您开始实现某个具体步骤吗？
