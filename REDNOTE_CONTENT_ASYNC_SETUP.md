# 小红书内容生成 - 异步处理完整配置

## 📝 概要

将主题生成的异步处理架构应用到内容生成模块，实现长时间运行任务的支持。

---

## 🎯 核心修改点

### 1. 数据字段变更

| 字段名       | Subject Generation | Content Generation |
| ------------ | ------------------ | ------------------ |
| **主要字段** | `subject`          | `content`          |
| **字段说明** | 主题（简短文本）   | 内容（长文本）     |
| **典型长度** | 50-200 字符        | 500-3000 字符      |

### 2. Webhook URL 变更

| 工作流      | Subject                                             | Content                                                     |
| ----------- | --------------------------------------------------- | ----------------------------------------------------------- |
| **Submit**  | `/webhook/rednotesubject`                           | `/webhook/rednotecontent`                                   |
| **Process** | `/webhook/process-subject-task`                     | `/webhook/process-content-task`                             |
| **Query**   | `/webhook/process-subject-task/task-status/:taskId` | `/webhook/process-content-task/content-task-status/:taskId` |

### 3. Database Table 变更

- **原表名**: `rednote_subject_tasks`
- **新表名**: `rednote_content_tasks`

### 4. Task ID 格式变更

- **原格式**: `task_1761799560969_aqe5hl4cf`
- **新格式**: `content_task_1761799560969_aqe5hl4cf` ← 添加 `content_` 前缀

---

## 📊 数据库结构

### 创建新的 Table Database

在 n8n 中创建新表 `rednote_content_tasks`：

| 字段名          | 类型     | 说明                                           | 必填 |
| --------------- | -------- | ---------------------------------------------- | ---- |
| `taskId`        | string   | 任务唯一ID                                     | ✅   |
| `content`       | string   | 输入的内容                                     | ✅   |
| `status`        | string   | 任务状态 (pending/processing/completed/failed) | ✅   |
| `result`        | string   | AI生成的结果（JSON字符串）                     | ❌   |
| `error`         | string   | 错误信息                                       | ❌   |
| `createdAt`     | dateTime | 创建时间                                       | ✅   |
| `completedAt`   | dateTime | 完成时间                                       | ❌   |
| `duration`      | number   | 处理时长（秒）                                 | ❌   |
| `contentLength` | number   | 输入内容长度                                   | ❌   |

---

## 🔧 工作流 1: Submit Content Task

### 节点配置

#### 1. Webhook Trigger

- **Node**: `Webhook`
- **Path**: `/rednotecontent`
- **Method**: `POST`
- **Response Mode**: `Immediately`

#### 2. Code: Generate Task ID

```javascript
// 使用标准的 $input.first() 方法访问数据
const inputData = $input.first().json;
const body = inputData.body || {};

// 从 webhook body 中提取数据（改为 content）
const content = body.content || '';
const timestamp = body.timestamp || new Date().toISOString();

// 验证必填字段
if (!content || content.trim() === '') {
  throw new Error('Content is required');
}

// 生成唯一任务ID（添加 content_ 前缀）
const taskId = `content_task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

console.log('✅ Generated Task ID:', taskId);
console.log('📝 Content length:', content.length);

// 返回结构化数据
return [
  {
    json: {
      taskId: taskId,
      content: content, // ← 改为 content
      status: 'pending',
      createdAt: new Date().toISOString(),
      timestamp: timestamp,
      contentLength: content.length, // ← 添加内容长度
      originalData: inputData,
    },
  },
];
```

#### 3. Data Table: Add row

- **Table**: `rednote_content_tasks` (新建)
- **Mapping**:
  - `taskId`: `={{ $json.taskId }}`
  - `content`: `={{ $json.content }}` ← 改为 content
  - `status`: `pending`
  - `createdAt`: `={{ $json.createdAt }}`
  - `contentLength`: `={{ $json.contentLength }}` ← 新增

#### 4. Execute Workflow

- **Workflow**: `RedNote Content - Process Task` (待创建)
- **Wait For Completion**: ❌ **取消勾选**（关键！）

#### 5. Respond to Webhook

```json
{
  "taskId": "={{ $('Code').item.json.taskId }}",
  "status": "pending",
  "message": "Content generation task created and processing in background",
  "statusUrl": "https://n8n.wendealai.com/webhook/process-content-task/content-task-status/={{ $('Code').item.json.taskId }}"
}
```

---

## 🤖 工作流 2: Process Content Task

### 节点配置

#### 1. Execute Workflow Trigger

- **Node**: `When Executed by Another Workflow`

#### 2. Data Table: Update row(s) 1

- **Table**: `rednote_content_tasks`
- **Filter**: `taskId = {{ $json.taskId }}`
- **Update**:
  - `status`: `processing`

#### 3. Data Table: Get row(s) 1

- **Table**: `rednote_content_tasks`
- **Filter**: `taskId = {{ $json.taskId }}`
- **Limit**: `1`

#### 4. AI Agent / OpenAI Node

- **配置**: 根据您现有的内容生成逻辑
- **输入**: `={{ $json.content }}` ← 使用 content 字段
- **Prompt**: 根据内容生成小红书文案

**提示词示例**：

```
你是一个专业的小红书内容创作专家。

用户提供的内容：
{{ $json.content }}

请基于以上内容，生成完整的小红书发布文案，包括：
1. 吸引人的标题（3个选项）
2. 完整的正文内容
3. 实用的建议（3-5条）
4. 推荐标签（5-10个）
5. 发布策略建议

请以 JSON 格式返回：
{
  "title": "主标题",
  "alternativeTitles": ["备选1", "备选2"],
  "content": "完整正文",
  "suggestions": ["建议1", "建议2"],
  "tags": ["标签1", "标签2"],
  "publishingTips": "发布建议"
}
```

#### 5. Code: Parse AI Output

```javascript
// 获取输入数据
const inputData = $input.first().json;

// 从输入中获取 AI 返回的原始输出
let aiOutput = '';

// 处理不同的输入格式
if (Array.isArray(inputData)) {
  aiOutput = inputData[0]?.output || '';
} else if (inputData.output) {
  aiOutput = inputData.output;
} else if (inputData.message?.content) {
  aiOutput = inputData.message.content;
} else if (inputData.text) {
  aiOutput = inputData.text;
} else if (inputData.content) {
  aiOutput = inputData.content;
}

console.log('AI Output length:', aiOutput.length);

// 🔥 修复：从前面的节点获取 taskId
let taskId = null;
let createdAt = null;

// 方法1: 从 Update row(s)1 节点获取（推荐）
try {
  const updateNode = $('Update row(s)1').first().json;
  taskId = updateNode.taskId;
  createdAt = updateNode.createdAt;
  console.log('✅ 从 Update row(s)1 获取到 taskId:', taskId);
} catch (e) {
  console.log('⚠️ 无法从 Update row(s)1 获取数据');
}

// 方法2: 从 Get row(s)1 节点获取（备用）
if (!taskId) {
  try {
    const getNode = $('Get row(s)1').first().json;
    taskId = getNode.taskId;
    createdAt = getNode.createdAt;
    console.log('✅ 从 Get row(s)1 获取到 taskId:', taskId);
  } catch (e) {
    console.log('⚠️ 无法从 Get row(s)1 获取数据');
  }
}

// 如果还是获取不到，抛出错误
if (!taskId) {
  throw new Error('❌ 无法获取 taskId！请检查前面的节点是否正确执行。');
}

if (!createdAt) {
  createdAt = new Date().toISOString();
}

console.log('Task ID:', taskId);
console.log('Created At:', createdAt);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 解析 AI 输出为结构化数据（根据您的实际需求调整）
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let result = {};

// 尝试解析 JSON
try {
  result = JSON.parse(aiOutput);
  console.log('✅ Successfully parsed JSON');
} catch (e) {
  console.log('⚠️ Failed to parse JSON, using raw output');
  result = {
    content: aiOutput,
    parseError: true,
    fullReport: aiOutput,
  };
}

// 计算处理时长
const startTime = new Date(createdAt).getTime();
const duration = Math.floor((Date.now() - startTime) / 1000);

console.log('Duration:', duration, 'seconds');

// 返回数据
return [
  {
    json: {
      taskId: taskId,
      status: 'completed',
      result: result,
      completedAt: new Date().toISOString(),
      duration: duration,
      fullReport: aiOutput,
    },
  },
];
```

#### 6. Data Table: Update row(s) 2

- **Table**: `rednote_content_tasks`
- **Filter**: `taskId = {{ $json.taskId }}`
- **Update**:
  - `status`: `completed`
  - `result`: `={{ JSON.stringify($json.result) }}` ← 关键：使用 JSON.stringify
  - `completedAt`: `={{ $json.completedAt }}`
  - `duration`: `={{ $json.duration }}`

---

## 🔍 工作流 3: Query Content Status

### 节点配置

#### 1. Webhook Trigger

- **Path**: `/process-content-task/content-task-status/:taskId`
- **Method**: `GET`
- **Response Mode**: `Wait for Webhook Response`

#### 2. Code: Extract Task ID

```javascript
const inputData = $input.first().json;

console.log('📥 Input data:', JSON.stringify(inputData, null, 2));

// 从 webhookUrl 中提取 taskId
let taskId = null;

if (inputData.webhookUrl) {
  // URL 格式: .../content-task-status/content_task_xxx
  const urlParts = inputData.webhookUrl.split('/');
  taskId = urlParts[urlParts.length - 1];

  console.log('🔍 Extracted taskId from URL:', taskId);
} else if (
  inputData.params &&
  inputData.params.taskId &&
  inputData.params.taskId !== ':taskId'
) {
  taskId = inputData.params.taskId;
  console.log('🔍 Extracted taskId from params:', taskId);
} else {
  throw new Error('Missing or invalid taskId in URL path');
}

// 验证 taskId
if (!taskId || taskId === ':taskId' || taskId.trim() === '') {
  throw new Error('Invalid taskId extracted from URL');
}

console.log('✅ Valid taskId:', taskId);

return [
  {
    json: {
      taskId: taskId,
    },
  },
];
```

#### 3. Data Table: Get row(s)

- **Table**: `rednote_content_tasks`
- **Filter**: `taskId = {{ $json.taskId }}`
- **Limit**: `1`

#### 4. Code: Normalize Data

```javascript
const inputData = $input.first().json;

// 处理可能的数组格式
let taskData = inputData;

if (Array.isArray(inputData)) {
  if (inputData.length === 0) {
    // 返回 not_found 状态
    return [
      {
        json: {
          status: 'not_found',
          taskId: null,
        },
      },
    ];
  }
  taskData = inputData[0];
}

console.log('📊 Task data:', JSON.stringify(taskData, null, 2));

return [
  {
    json: taskData,
  },
];
```

#### 5. Switch

- **Mode**: Rules
- **Rules**:
  1. `status` equals `pending` → Output 0
  2. `status` equals `processing` → Output 1
  3. `status` equals `completed` → Output 2
  4. `status` equals `failed` → Output 3
- **Fallback**: Output 4 (not_found)

#### 6-9. Code: Format Response (4 个节点)

**Format Response - Pending**:

```javascript
const taskData = $input.first().json;

return [
  {
    json: {
      taskId: taskData.taskId,
      status: 'pending',
      message: 'Content generation task is pending',
      createdAt: taskData.createdAt,
    },
  },
];
```

**Format Response - Processing**:

```javascript
const taskData = $input.first().json;

return [
  {
    json: {
      taskId: taskData.taskId,
      status: 'processing',
      message: 'Content is being generated',
      createdAt: taskData.createdAt,
    },
  },
];
```

**Format Response - Completed**:

```javascript
const taskData = $input.first().json;

// 解析 result（如果是字符串）
let result = taskData.result;
if (typeof result === 'string') {
  try {
    result = JSON.parse(result);
  } catch (e) {
    console.error('Failed to parse result JSON:', e);
    result = {
      parseError: true,
      fullReport: result,
      message: 'Result JSON parse failed, showing raw content',
    };
  }
}

return [
  {
    json: {
      taskId: taskData.taskId,
      status: 'completed',
      result: result,
      completedAt: taskData.completedAt,
      duration: taskData.duration || 0,
      message: 'Content generation completed successfully',
    },
  },
];
```

**Format Response - Failed**:

```javascript
const taskData = $input.first().json;

return [
  {
    json: {
      taskId: taskData.taskId,
      status: 'failed',
      error: taskData.error || 'Unknown error',
      createdAt: taskData.createdAt,
      message: 'Content generation failed',
    },
  },
];
```

**Format Response - Not Found**:

```javascript
const taskData = $input.first().json;

return [
  {
    json: {
      taskId: taskData.taskId,
      status: 'not_found',
      message: 'Task not found',
      error: 'The specified content generation task does not exist',
    },
  },
];
```

#### 10. Respond to Webhook

- **Response Code**: `200`
- **Response Body**: `={{ $json }}`
- **Response Headers**:

```json
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json"
}
```

---

## 🎨 前端修改

### 修改文件

`src/pages/SocialMedia/components/RedNoteContentGenerator.tsx`

### 修改 `handleGenerateContent` 函数

```typescript
const handleGenerateContentAsync = useCallback(async () => {
  if (!inputContent.trim()) {
    antdMessage.warning('Please enter content');
    return;
  }

  // 防止重复提交
  if (loading) {
    console.warn('⚠️ Task is already running, ignoring duplicate request');
    antdMessage.warning('A task is already in progress. Please wait...');
    return;
  }

  setLoading(true);
  setError(null);
  setProgress(10);
  setProgressText('Creating task...');

  try {
    const webhookUrl = 'https://n8n.wendealai.com/webhook/rednotecontent';

    console.log('📤 Submitting async content generation task...');

    // 步骤1: 提交任务，获取任务ID
    const submitResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: inputContent.trim(), // ← 改为 content
        timestamp: new Date().toISOString(),
      }),
      mode: 'cors',
    });

    if (!submitResponse.ok) {
      throw new Error(`Failed to submit task: ${submitResponse.status}`);
    }

    let submitData = await submitResponse.json();

    // 处理数组响应
    if (Array.isArray(submitData) && submitData.length > 0) {
      console.log('⚠️ Response is an array, extracting first item');
      submitData = submitData[0];
    }

    console.log('✅ Parsed submit data:', submitData);

    // 检查是否返回了任务ID
    if (submitData.taskId && submitData.status === 'pending') {
      const taskId = submitData.taskId;

      console.log('✅ Task created:', taskId);

      // 构建状态查询 URL（注意路径变化）
      const statusUrl = `https://n8n.wendealai.com/webhook/process-content-task/content-task-status/${taskId}`;

      console.log('🔍 Constructed statusUrl:', statusUrl);

      // 存储到 ref 中
      currentTaskRef.current = {
        taskId: taskId,
        statusUrl: statusUrl,
        intervalId: null,
      };
      console.log('💾 Saved to ref:', currentTaskRef.current);

      setProgress(20);
      setProgressText(
        `Task created (ID: ${taskId.slice(-8)}). Processing in background...`
      );

      const initialDelay = 120000; // 2 分钟
      const pollInterval = 15000; // 15 秒
      const maxAttempts = 80; // 20 分钟
      let attempts = 0;

      console.log(
        `⏰ Waiting ${initialDelay / 1000}s before first status check...`
      );
      setProgress(25);
      setProgressText(
        `Task submitted. Waiting 2 minutes for content generation...`
      );

      // 等待初始延迟
      await new Promise(resolve => setTimeout(resolve, initialDelay));
      console.log('✅ Initial delay complete, starting status checks...');

      setProgress(30);
      setProgressText('Starting status checks...');

      const checkStatus = async (): Promise<void> => {
        return new Promise((resolve, reject) => {
          const intervalId = setInterval(async () => {
            attempts++;
            console.log(`\n${'='.repeat(60)}`);
            console.log(
              `⏰ Interval fired! Attempt ${attempts}/${maxAttempts}`
            );
            console.log(`${'='.repeat(60)}\n`);

            const progress = Math.min(30 + (attempts / maxAttempts) * 65, 95);
            setProgress(progress);

            const totalElapsedSeconds =
              initialDelay / 1000 + attempts * (pollInterval / 1000);
            const elapsedMinutes = Math.floor(totalElapsedSeconds / 60);
            const remainingSeconds = Math.floor(totalElapsedSeconds % 60);

            setProgressText(
              `Processing... (${elapsedMinutes}m ${remainingSeconds}s elapsed) - Check ${attempts}/${maxAttempts}`
            );

            try {
              const currentTaskId = currentTaskRef.current.taskId;
              const currentStatusUrl = currentTaskRef.current.statusUrl;

              console.log(`🔄 Polling attempt ${attempts}/${maxAttempts}...`);
              console.log(`🔍 Polling URL: ${currentStatusUrl}`);
              console.log(`🔍 TaskId: ${currentTaskId}`);

              if (!currentStatusUrl || !currentTaskId) {
                console.error('❌ Task info missing from ref!');
                throw new Error('Task information lost. Please try again.');
              }

              const statusResponse = await fetch(currentStatusUrl, {
                method: 'GET',
                mode: 'cors',
              });

              if (!statusResponse.ok) {
                if (statusResponse.status === 404) {
                  console.warn('Task not found, will retry...');
                  return;
                }
                throw new Error(
                  `Status check failed: ${statusResponse.status}`
                );
              }

              const statusData = await statusResponse.json();
              console.log('📊 Task status:', statusData);

              if (statusData.status === 'completed') {
                clearInterval(intervalId);
                setProgress(100);
                setProgressText('Content generation complete!');

                console.log('🎉 Task completed!');
                console.log('📄 Result:', statusData.result);

                // 处理生成的内容结果
                setGeneratedResponse({
                  id: `response_${Date.now()}`,
                  requestId: taskId,
                  generatedContent:
                    statusData.result?.content ||
                    JSON.stringify(statusData.result, null, 2),
                  title: statusData.result?.title || 'Generated Content',
                  hashtags: statusData.result?.tags || [],
                  googleSheetUrl: 'https://docs.google.com/spreadsheets/...',
                  status: 'completed',
                  createdAt: statusData.createdAt,
                  completedAt: statusData.completedAt,
                });

                antdMessage.success({
                  content: `Content generated successfully! (${statusData.duration}s)`,
                  duration: 5,
                });
                setLoading(false);
                resolve();
              } else if (statusData.status === 'failed') {
                clearInterval(intervalId);
                console.error('❌ Task failed:', statusData.error);
                reject(new Error(statusData.error || 'Task processing failed'));
              } else if (statusData.status === 'processing') {
                console.log('⏳ Task is processing...');
              } else if (statusData.status === 'pending') {
                console.log('⏰ Task is pending...');
              }
            } catch (pollError: any) {
              console.error('Polling error:', pollError);

              if (attempts > 10 && attempts % 10 === 0) {
                const currentTaskId = currentTaskRef.current.taskId;
                console.warn(`⚠️ Polling failed ${attempts} times.`);
                console.warn(
                  `💡 Check n8n workflow executions or database for taskId: ${currentTaskId}`
                );
              }
            }

            if (attempts >= maxAttempts) {
              clearInterval(intervalId);
              const currentTaskId = currentTaskRef.current.taskId;
              const totalWaitTime =
                (initialDelay + maxAttempts * pollInterval) / 1000;
              const totalMinutes = Math.floor(totalWaitTime / 60);
              reject(
                new Error(
                  `Task timeout: Exceeded maximum wait time (${totalMinutes} minutes).\n` +
                    `Task ID: ${currentTaskId}\n` +
                    `You can check the status manually in n8n or Table Database.`
                )
              );
            }
          }, pollInterval);
        });
      };

      await checkStatus();
      console.log('✅ checkStatus() completed!');
    } else {
      throw new Error(
        'Invalid workflow response: Expected taskId for async processing. ' +
          'Please check workflow configuration.'
      );
    }
  } catch (err: any) {
    console.error('Content generation failed:', err);
    const errorMessage = err.message || 'Content generation failed';
    setError(errorMessage);
    antdMessage.error({
      content: errorMessage,
      duration: 10,
    });
    setProgress(0);
    setProgressText('');
  } finally {
    setLoading(false);
    currentTaskRef.current = {
      taskId: null,
      statusUrl: null,
      intervalId: null,
    };
    console.log('🧹 Cleared task ref');
  }
}, [inputContent]);
```

---

## 📋 部署检查清单

### 步骤1: 创建数据库表

- [ ] 在 n8n 中创建 `rednote_content_tasks` 表
- [ ] 配置所有必需字段（见上方表结构）

### 步骤2: 创建工作流 1（Submit）

- [ ] 创建新工作流：`RedNote Content - Submit Task`
- [ ] 配置 Webhook: `/rednotecontent`
- [ ] 添加 Code 节点：Generate Task ID（使用新代码）
- [ ] 添加 Data Table 节点：Add row (使用 content 字段)
- [ ] 添加 Execute Workflow 节点（取消等待）
- [ ] 添加 Respond to Webhook 节点
- [ ] **激活工作流**

### 步骤3: 创建工作流 2（Process）

- [ ] 创建新工作流：`RedNote Content - Process Task`
- [ ] 添加触发器：When Executed by Another Workflow
- [ ] 添加 Update row(s)1: status → processing
- [ ] 添加 Get row(s)1: 获取任务数据
- [ ] 添加 AI Agent/OpenAI: 生成内容
- [ ] 添加 Code: Parse AI Output（使用新代码）
- [ ] 添加 Update row(s)2: 更新结果（使用 JSON.stringify）
- [ ] **激活工作流**

### 步骤4: 创建工作流 3（Query）

- [ ] 创建新工作流：`RedNote Content - Query Status`
- [ ] 配置 Webhook: `/process-content-task/content-task-status/:taskId`
- [ ] 添加 Code: Extract Task ID（使用新代码）
- [ ] 添加 Data Table: Get row(s)
- [ ] 添加 Code: Normalize Data
- [ ] 添加 Switch 节点（5个分支）
- [ ] 添加 5个 Format Response 节点
- [ ] 添加 Respond to Webhook（配置 CORS）
- [ ] **激活工作流**

### 步骤5: 修改前端

- [ ] 将 `handleGenerateContent` 改为异步版本
- [ ] 修改 webhook URL
- [ ] 修改数据字段（subject → content）
- [ ] 修改状态查询 URL
- [ ] 测试前端轮询逻辑

---

## 🧪 测试流程

### 1. 测试 Workflow 1（Submit）

```bash
curl -X POST https://n8n.wendealai.com/webhook/rednotecontent \
  -H "Content-Type: application/json" \
  -d '{"content":"测试内容生成","timestamp":"2025-10-30T10:00:00.000Z"}'
```

**预期响应**:

```json
{
  "taskId": "content_task_1761799560969_xxx",
  "status": "pending",
  "message": "Content generation task created and processing in background",
  "statusUrl": "https://n8n.wendealai.com/webhook/process-content-task/content-task-status/content_task_1761799560969_xxx"
}
```

### 2. 检查数据库

- 打开 n8n → Data Tables → `rednote_content_tasks`
- 确认任务已创建，status = `pending` 或 `processing`

### 3. 等待处理完成

- 查看 Workflow 2 执行日志
- 确认 AI 生成完成
- 确认数据库 status = `completed`

### 4. 测试 Workflow 3（Query）

```bash
curl https://n8n.wendealai.com/webhook/process-content-task/content-task-status/content_task_1761799560969_xxx
```

**预期响应**:

```json
{
  "taskId": "content_task_1761799560969_xxx",
  "status": "completed",
  "result": {
    "title": "生成的标题",
    "content": "生成的正文",
    "suggestions": [...],
    "tags": [...]
  },
  "completedAt": "2025-10-30T10:05:00.000Z",
  "duration": 300
}
```

### 5. 测试前端集成

1. 在前端输入测试内容
2. 点击 "Generate" 按钮
3. 观察进度条（2分钟等待 + 轮询）
4. 确认结果正确显示

---

## 📝 关键注意事项

### ⚠️ 常见错误

1. **忘记修改字段名**: `subject` → `content`
2. **忘记修改 URL 路径**: 确保所有 URL 都包含 `content`
3. **忘记 JSON.stringify**: Update row(s)2 的 result 字段必须序列化
4. **忘记取消等待**: Execute Workflow 必须取消 "Wait For Completion"
5. **CORS 配置**: Workflow 3 的 Respond to Webhook 必须配置 CORS headers

### ✅ 成功标志

- [ ] 提交任务返回 `taskId` 和 `statusUrl`
- [ ] 数据库记录创建成功
- [ ] Workflow 2 异步执行（不阻塞）
- [ ] 轮询可以查询到状态变化
- [ ] 完成后返回完整的结构化结果
- [ ] 前端显示正确的生成内容

---

## 🎯 下一步

完成配置后，您的内容生成模块将支持：

✅ 长时间运行的 AI 生成任务  
✅ 异步处理，不会超时  
✅ 实时状态查询  
✅ 完整的错误处理  
✅ 与主题生成模块相同的架构

---

**📖 相关文档**:

- [REDNOTE_SUBJECT_ASYNC_IMPLEMENTATION_GUIDE.md](./REDNOTE_SUBJECT_ASYNC_IMPLEMENTATION_GUIDE.md)
- [REDNOTE_WORKFLOW_DEPLOYMENT_GUIDE.md](./REDNOTE_WORKFLOW_DEPLOYMENT_GUIDE.md)
