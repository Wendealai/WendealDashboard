# 小红书主题生成工作流重构指南

## 问题分析

当前工作流将三个职责混合在一起，导致无法实现真正的异步处理：

1. ❌ AI Agent 仍在主执行流中
2. ❌ 查询工作流无法根据 taskId 查询
3. ❌ 缺少错误处理

---

## 正确架构：3个独立工作流

### 📥 工作流1：提交任务 (`rednotesubject`)

**目标**：立即返回 taskId，异步触发处理

#### 节点配置

1. **Webhook** (保持不变)

   ```json
   {
     "httpMethod": "POST",
     "path": "rednotesubject",
     "options": {
       "allowedOrigins": "*"
     }
   }
   ```

2. **Generate Task ID** (保持不变)

   ```javascript
   const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
   const subject = $json.body.subject || '';
   const timestamp = $json.body.timestamp || new Date().toISOString();

   return {
     taskId: taskId,
     subject: subject,
     status: 'pending', // ✅ 修改为 pending
     createdAt: new Date().toISOString(),
     timestamp: timestamp,
   };
   ```

3. **Insert row** - 修改状态为 `pending`

   ```json
   {
     "dataTableId": "nH5s5LqseTNTWPxT",
     "columns": {
       "mappingMode": "defineBelow",
       "value": {
         "taskId": "={{ $json.taskId }}",
         "subject": "={{ $json.subject }}",
         "status": "pending", // ✅ 改为 pending
         "createdAt": "={{ $json.createdAt }}"
       }
     }
   }
   ```

4. **✨ Execute Workflow** (新增) - 异步触发处理工作流

   ```json
   {
     "workflowId": "<工作流2的ID>",
     "source": {
       "taskId": "={{ $json.taskId }}",
       "subject": "={{ $json.subject }}"
     }
   }
   ```

5. **Respond to Webhook** (保持不变)
   ```json
   {
     "respondWith": "allIncomingItems",
     "options": {}
   }
   ```

#### 连接关系

```
Webhook → Generate Task ID → Insert row → Execute Workflow
                                                ↓
                                          Respond to Webhook
```

---

### ⚙️ 工作流2：处理任务 (`process-subject-task`)

**目标**：后台执行AI生成，更新任务状态

#### 节点配置

1. **✨ Execute Workflow Trigger** (新增 - 替换 Webhook Trigger)
   - 类型：`n8n-nodes-base.executeWorkflowTrigger`
   - 说明：接收来自工作流1的触发

2. **✨ Set Variables** (新增) - 从触发数据提取变量

   ```javascript
   const taskId = $json.taskId;
   const subject = $json.subject;

   return {
     taskId: taskId,
     subject: subject,
   };
   ```

3. **Update Status to Processing** (新增)

   ```json
   {
     "operation": "update",
     "dataTableId": "nH5s5LqseTNTWPxT",
     "filters": {
       "conditions": [
         {
           "keyName": "taskId",
           "keyValue": "={{ $json.taskId }}"
         }
       ]
     },
     "columns": {
       "value": {
         "status": "processing",
         "startedAt": "={{ $now.toISO() }}"
       }
     }
   }
   ```

4. **AI Agent** (保持不变，但修改输入)
   - 输入改为：`={{ $json.subject }}`

5. **Code in JavaScript** (保持不变)

6. **❌ If Node** (新增) - 错误处理分支

   ```json
   {
     "conditions": {
       "boolean": [
         {
           "value1": "={{ $json.status }}",
           "operation": "equal",
           "value2": "completed"
         }
       ]
     }
   }
   ```

7. **Update row(s) - Success** (保持不变)

   ```json
   {
     "operation": "update",
     "filters": {
       "conditions": [
         {
           "keyName": "taskId",
           "keyValue": "={{ $json.taskId }}"
         }
       ]
     },
     "columns": {
       "value": {
         "status": "completed",
         "result": "={{ JSON.stringify($json.result) }}",
         "completedAt": "={{ $json.completedAt }}",
         "duration": "={{ $json.duration }}"
       }
     }
   }
   ```

8. **✨ Update row(s) - Error** (新增)
   ```json
   {
     "operation": "update",
     "filters": {
       "conditions": [
         {
           "keyName": "taskId",
           "keyValue": "={{ $json.taskId }}"
         }
       ]
     },
     "columns": {
       "value": {
         "status": "failed",
         "error": "={{ $json.error || 'AI processing failed' }}",
         "completedAt": "={{ $now.toISO() }}"
       }
     }
   }
   ```

#### 连接关系

```
Execute Workflow Trigger → Set Variables → Update Status (processing)
                                                ↓
                                            AI Agent
                                                ↓
                                          Code (Parse)
                                                ↓
                                            If Node
                                          ↙         ↘
                              Update (completed)  Update (failed)
```

---

### 🔍 工作流3：查询状态 (`task-status`)

**目标**：根据 taskId 返回任务状态和结果

#### 节点配置

1. **Webhook** (修改 - 支持 GET 请求)

   ```json
   {
     "httpMethod": "GET",
     "path": "task-status/={{ $parameter.taskId }}",
     "options": {
       "allowedOrigins": "*"
     }
   }
   ```

2. **✨ Extract Task ID** (新增)

   ```javascript
   // 从 URL 路径提取 taskId
   const path = $input.first().json.path || '';
   const taskId = path.split('/').pop();

   console.log('Extracted taskId:', taskId);

   return {
     taskId: taskId,
   };
   ```

3. **Get row(s)** - 修改筛选条件

   ```json
   {
     "operation": "get",
     "dataTableId": "nH5s5LqseTNTWPxT",
     "filters": {
       "conditions": [
         {
           "keyName": "taskId",
           "keyValue": "={{ $json.taskId }}" // ✅ 根据 taskId 查询
         }
       ]
     }
   }
   ```

4. **✨ Switch Node** (新增) - 根据状态分支

   ```json
   {
     "mode": "rules",
     "rules": [
       {
         "conditions": [
           {
             "value1": "={{ $json.status }}",
             "operation": "equals",
             "value2": "pending"
           }
         ],
         "output": 0
       },
       {
         "conditions": [
           {
             "value1": "={{ $json.status }}",
             "operation": "equals",
             "value2": "processing"
           }
         ],
         "output": 1
       },
       {
         "conditions": [
           {
             "value1": "={{ $json.status }}",
             "operation": "equals",
             "value2": "completed"
           }
         ],
         "output": 2
       },
       {
         "conditions": [
           {
             "value1": "={{ $json.status }}",
             "operation": "equals",
             "value2": "failed"
           }
         ],
         "output": 3
       }
     ]
   }
   ```

5. **✨ Format Response - Pending** (新增)

   ```javascript
   return {
     taskId: $json.taskId,
     status: 'pending',
     message: 'Task is waiting to be processed',
     createdAt: $json.createdAt,
   };
   ```

6. **✨ Format Response - Processing** (新增)

   ```javascript
   const startTime = new Date($json.startedAt || $json.createdAt).getTime();
   const elapsed = Math.floor((Date.now() - startTime) / 1000);

   return {
     taskId: $json.taskId,
     status: 'processing',
     message: 'Task is being processed by AI',
     elapsedTime: `${elapsed}s`,
     createdAt: $json.createdAt,
   };
   ```

7. **✨ Format Response - Completed** (新增)

   ```javascript
   let result = $json.result;

   // 如果 result 是 JSON 字符串，解析它
   if (typeof result === 'string') {
     try {
       result = JSON.parse(result);
     } catch (e) {
       result = { fullReport: result };
     }
   }

   return {
     taskId: $json.taskId,
     status: 'completed',
     result: result,
     completedAt: $json.completedAt,
     duration: $json.duration || 0,
   };
   ```

8. **✨ Format Response - Failed** (新增)

   ```javascript
   return {
     taskId: $json.taskId,
     status: 'failed',
     error: $json.error || 'Unknown error',
     completedAt: $json.completedAt,
   };
   ```

9. **Respond to Webhook** (合并所有输出)
   ```json
   {
     "respondWith": "firstIncomingItem",
     "options": {}
   }
   ```

#### 连接关系

```
Webhook → Extract Task ID → Get row(s) → Switch Node
                                          ↓
                      ┌──────────┬────────┼────────┬──────────┐
                      ▼          ▼        ▼        ▼          ▼
                   Pending  Processing  Completed  Failed   Not Found
                      ↓          ↓        ↓        ↓          ↓
                      └──────────┴────────┴────────┴──────────┘
                                      ↓
                              Respond to Webhook
```

---

## 🔧 实施步骤

### 1. 创建工作流2（处理任务）

- 新建空白工作流
- 添加 `Execute Workflow Trigger` 节点
- 按照上述配置添加其他节点
- **保存并记录工作流ID**

### 2. 修改工作流1（提交任务）

- 删除 `AI Agent` 及相关节点（它们应该在工作流2）
- 删除 `Webhook Trigger1`（查询功能移到工作流3）
- 修改 `Insert row` 的 status 为 `pending`
- 添加 `Execute Workflow` 节点，填入工作流2的ID
- 调整节点连接关系

### 3. 创建工作流3（查询状态）

- 新建空白工作流
- 按照上述配置添加节点
- 测试 URL 路径提取逻辑

### 4. 更新前端代码

前端无需修改，因为：

- 提交任务：仍然是 `POST https://n8n.wendealai.com/webhook/rednotesubject`
- 查询状态：修改为 `GET https://n8n.wendealai.com/webhook/task-status/<taskId>`

---

## ✅ 验证清单

- [ ] 工作流1 能立即返回 taskId（<1秒）
- [ ] 工作流2 被异步触发，不阻塞工作流1
- [ ] 工作流3 能正确查询不同状态的任务
- [ ] 数据库状态流转正确：`pending` → `processing` → `completed`/`failed`
- [ ] 错误情况能正确更新为 `failed` 状态
- [ ] 前端轮询能获取到正确的状态和结果

---

## 🎯 关键优势

1. **真正异步**：AI处理不阻塞提交响应
2. **职责分离**：每个工作流职责单一，易维护
3. **容错性强**：错误不会影响其他工作流
4. **可扩展**：可独立优化每个工作流
5. **易调试**：可单独测试每个工作流

---

## 📝 测试命令

### 测试提交任务

```bash
curl -X POST https://n8n.wendealai.com/webhook/rednotesubject \
  -H "Content-Type: application/json" \
  -d '{"subject":"测试主题","timestamp":"2025-10-30T10:00:00Z"}'
```

### 测试查询状态

```bash
curl -X GET https://n8n.wendealai.com/webhook/task-status/<taskId>
```

---

## 🚨 常见错误

1. **Execute Workflow 无法触发**
   - 检查工作流2的ID是否正确
   - 确保工作流2已激活

2. **查询返回空数据**
   - 检查 taskId 提取逻辑
   - 确认数据库中有对应记录

3. **状态一直是 pending**
   - 检查工作流2是否被触发
   - 查看工作流2的执行日志
