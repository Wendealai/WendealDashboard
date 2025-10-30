# 📊 前端轮询策略更新

## 🎯 修改目标

优化轮询策略，减少前端请求频率，给后端更多处理时间。

---

## 🔄 修改内容

### 修改前（旧策略）

| 参数             | 值      | 说明             |
| ---------------- | ------- | ---------------- |
| **初始延迟**     | 0 秒    | 立即开始轮询     |
| **轮询间隔**     | 5 秒    | 每 5 秒检查一次  |
| **最大尝试次数** | 240 次  |                  |
| **总超时时间**   | 20 分钟 | 240 × 5s = 1200s |

**问题**：

- ❌ 立即轮询可能查不到任务（后端还在处理）
- ❌ 5 秒间隔过于频繁，增加服务器负载
- ❌ 前端可能在后端还没开始处理时就开始查询

---

### 修改后（新策略）⭐

| 参数             | 值                    | 说明                   |
| ---------------- | --------------------- | ---------------------- |
| **初始延迟**     | **2.5 分钟** (150 秒) | 等待后端有充足时间处理 |
| **轮询间隔**     | **15 秒**             | 降低查询频率           |
| **最大尝试次数** | **80 次**             |                        |
| **轮询总时间**   | 20 分钟               | 80 × 15s = 1200s       |
| **总超时时间**   | **22.5 分钟**         | 2.5min + 20min         |

**优势**：

- ✅ 给后端 2.5 分钟时间完成 AI 生成
- ✅ 减少 66% 的查询请求（从每 5s 到每 15s）
- ✅ 降低服务器负载
- ✅ 更友好的用户体验提示

---

## 📝 代码变更详情

### 变更 1: 轮询参数配置

**位置**: `src/pages/SocialMedia/components/RedNoteContentGenerator.tsx` 第 286-289 行

**旧代码**：

```typescript
let attempts = 0;
const maxAttempts = 240; // 最多轮询 240 次（20 分钟，每 5 秒一次）
const pollInterval = 5000; // 5 秒
```

**新代码**：

```typescript
const initialDelay = 150000; // 2.5 分钟 = 150 秒
const pollInterval = 15000; // 15 秒检查一次
const maxAttempts = 80; // 最多轮询 80 次（20 分钟，每 15 秒一次）
let attempts = 0;
```

---

### 变更 2: 添加初始等待逻辑

**位置**: `src/pages/SocialMedia/components/RedNoteContentGenerator.tsx` 第 291-300 行

**新增代码**：

```typescript
console.log(`⏰ Waiting ${initialDelay / 1000}s before first status check...`);
setSubjectProgress(25);
setSubjectProgressText(
  `Task submitted. Waiting 2.5 minutes for AI processing...`
);

// 等待初始延迟
await new Promise(resolve => setTimeout(resolve, initialDelay));

console.log('✅ Initial delay complete, starting status checks...');
setSubjectProgress(30);
setSubjectProgressText('Starting status checks...');
```

---

### 变更 3: 更新进度计算

**位置**: `src/pages/SocialMedia/components/RedNoteContentGenerator.tsx` 第 307-318 行

**旧代码**：

```typescript
// 计算进度（20% -> 95%）
const progress = Math.min(20 + (attempts / maxAttempts) * 75, 95);
setSubjectProgress(progress);

// 更新状态文本
const elapsedSeconds = attempts * (pollInterval / 1000);
const elapsedMinutes = Math.floor(elapsedSeconds / 60);
const remainingSeconds = elapsedSeconds % 60;

if (elapsedSeconds < 60) {
  setSubjectProgressText(`Processing... (${elapsedSeconds}s elapsed)`);
} else {
  setSubjectProgressText(
    `Processing... (${elapsedMinutes}m ${remainingSeconds}s) - Async mode, no timeout`
  );
}
```

**新代码**：

```typescript
// 计算进度（30% -> 95%）
const progress = Math.min(30 + (attempts / maxAttempts) * 65, 95);
setSubjectProgress(progress);

// 更新状态文本（包含初始等待时间）
const totalElapsedSeconds =
  initialDelay / 1000 + attempts * (pollInterval / 1000);
const elapsedMinutes = Math.floor(totalElapsedSeconds / 60);
const remainingSeconds = Math.floor(totalElapsedSeconds % 60);

setSubjectProgressText(
  `Processing... (${elapsedMinutes}m ${remainingSeconds}s elapsed) - Check ${attempts}/${maxAttempts}`
);
```

---

### 变更 4: 更新超时错误消息

**位置**: `src/pages/SocialMedia/components/RedNoteContentGenerator.tsx` 第 380-390 行

**旧代码**：

```typescript
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
```

**新代码**：

```typescript
if (attempts >= maxAttempts) {
  clearInterval(intervalId);
  const totalWaitTime = (initialDelay + maxAttempts * pollInterval) / 1000;
  const totalMinutes = Math.floor(totalWaitTime / 60);
  reject(
    new Error(
      `Task timeout: Exceeded maximum wait time (${totalMinutes} minutes).\n` +
        `Waited ${initialDelay / 1000}s initially, then checked ${maxAttempts} times every ${pollInterval / 1000}s.\n` +
        `Task ID: ${taskId}\n` +
        `You can check the status manually in n8n or Table Database.`
    )
  );
}
```

---

## 🎬 用户体验流程

### 流程图

```
用户点击"生成"
    ↓
[0-20%] 提交任务到后端
    ↓
[20%] ✅ 任务创建成功，获得 taskId
    ↓
[20-25%] 显示 "Task submitted. Waiting 2.5 minutes for AI processing..."
    ↓
⏰ 等待 2.5 分钟（后端 AI 处理时间）
    ↓
[30%] ✅ 开始状态检查
    ↓
[30-95%] 每 15 秒检查一次状态
    ├─ pending → 继续等待
    ├─ processing → 继续等待
    ├─ failed → ❌ 显示错误
    └─ completed → ✅ 显示结果
    ↓
[100%] 完成！
```

---

## 📊 性能对比

### 请求次数对比（20 分钟内）

| 策略       | 间隔  | 请求次数 | 减少比例    |
| ---------- | ----- | -------- | ----------- |
| **旧策略** | 5 秒  | 240 次   | -           |
| **新策略** | 15 秒 | 80 次    | **↓ 66.7%** |

### 时间线对比

**旧策略**：

```
0s ────────────────────────────────────────────────> 1200s (20min)
   轮询 240 次（每 5 秒）
```

**新策略**：

```
0s ─────────> 150s ────────────────────────────────> 1350s (22.5min)
   等待 AI 处理    轮询 80 次（每 15 秒）
```

---

## 🧪 测试建议

### 测试场景 1: 快速完成的任务（< 2.5 分钟）

**预期行为**：

1. 任务在 2.5 分钟内完成
2. 前端等待 2.5 分钟后第一次查询
3. 立即获得 completed 状态
4. 总用时 ≈ 2.5 分钟（无需额外轮询）

---

### 测试场景 2: 正常任务（2.5 - 5 分钟）

**预期行为**：

1. 前端等待 2.5 分钟
2. 开始轮询，每 15 秒一次
3. 2-10 次轮询后获得结果
4. 总用时 ≈ 3-5 分钟

---

### 测试场景 3: 慢速任务（> 10 分钟）

**预期行为**：

1. 前端等待 2.5 分钟
2. 持续轮询，显示进度和已用时间
3. 任务完成时显示结果
4. 如果超过 22.5 分钟，显示超时错误

---

## 🔍 调试和监控

### 控制台日志示例

**任务提交阶段**：

```
📤 Submitting async task...
✅ Task created: task_1761794252181_chn5t4mwa
📍 Status URL: https://...
⏰ Waiting 150s before first status check...
```

**等待阶段**（前端静默 2.5 分钟）：

```
(无日志输出，用户看到进度条和提示文本)
```

**轮询阶段**：

```
✅ Initial delay complete, starting status checks...
🔄 Polling attempt 1/80...
📊 Task status: {status: "processing"}
⏳ Task is processing...
🔄 Polling attempt 2/80...
📊 Task status: {status: "completed", result: {...}}
🎉 Task completed!
📄 Result: {...}
```

---

## ⚙️ 可调参数

如果需要进一步调整，可以修改这些参数：

### 在 `RedNoteContentGenerator.tsx` 中

```typescript
// 第 286-288 行
const initialDelay = 150000; // 初始等待时间（毫秒）
const pollInterval = 15000; // 轮询间隔（毫秒）
const maxAttempts = 80; // 最大轮询次数
```

### 建议的参数组合

| 场景         | initialDelay  | pollInterval | maxAttempts | 总时间    |
| ------------ | ------------- | ------------ | ----------- | --------- |
| **快速测试** | 30s           | 5s           | 100         | 8.5 分钟  |
| **当前配置** | 150s (2.5min) | 15s          | 80          | 22.5 分钟 |
| **超长任务** | 180s (3min)   | 30s          | 60          | 33 分钟   |

---

## ✅ 部署检查清单

- [x] **前端代码已更新**
  - `initialDelay` = 150000ms (2.5分钟)
  - `pollInterval` = 15000ms (15秒)
  - `maxAttempts` = 80

- [ ] **重启开发服务器**

  ```bash
  npm run dev
  ```

- [ ] **测试用户体验**
  - 提交任务后看到"等待 2.5 分钟"提示
  - 2.5 分钟后开始看到轮询日志
  - 进度条和时间显示正确

- [ ] **监控性能**
  - 检查 n8n 服务器负载
  - 确认请求频率降低
  - 验证用户体验流畅

---

## 📞 常见问题

### Q1: 为什么要等待 2.5 分钟才开始查询？

**A**: AI 生成内容通常需要 1-3 分钟。立即查询会得到 `pending` 或 `processing` 状态，浪费请求。等待 2.5 分钟后，大多数任务已经完成，可以立即获得结果。

---

### Q2: 如果任务在 1 分钟内就完成了怎么办？

**A**: 用户仍需等待 2.5 分钟才能看到结果。这是权衡后的选择：

- **优点**：减少 66% 的服务器请求
- **缺点**：快速任务的用户需要多等待 1.5 分钟

如果大部分任务都在 1 分钟内完成，可以将 `initialDelay` 调整为 60000 (1 分钟)。

---

### Q3: 15 秒的间隔会不会太长？

**A**: 对于异步 AI 任务，15 秒是合理的：

- AI 生成通常需要 30 秒以上
- 用户能接受等待（有进度提示）
- 大幅降低服务器负载

如果需要更快的反馈，可以改为 10 秒。

---

### Q4: 如何临时禁用初始延迟（用于测试）？

**A**: 修改 `initialDelay` 为 0：

```typescript
const initialDelay = 0; // 禁用初始延迟，立即开始轮询
```

---

## 🎯 预期效果总结

### 服务器端

- ✅ 请求次数减少 66%
- ✅ 服务器负载降低
- ✅ 更少的并发查询

### 用户端

- ✅ 清晰的等待时间提示
- ✅ 准确的进度和时间显示
- ✅ 更流畅的体验（减少无效轮询）

---

**修改完成时间**: 2025-10-30
**预计部署时间**: < 5 分钟
**影响范围**: 前端轮询逻辑
