# Rednote轮询延迟时间更新

## 更新说明

将工作流的初始轮询延迟时间从2分钟调整为4.5分钟。

## 修改详情

### 文件位置

`src/pages/SocialMedia/components/RedNoteContentGenerator.tsx`

### 具体变更

#### Step 1: Generate Title (第298行)

**修改前:**

```javascript
const initialDelay = 120000; // 2 分钟
// ...
setTitleProgressText(
  `Task submitted. Waiting 2 minutes for title generation...`
);
```

**修改后:**

```javascript
const initialDelay = 270000; // 4.5 分钟
// ...
setTitleProgressText(
  `Task submitted. Waiting 4.5 minutes for title generation...`
);
```

#### Step 2: Generate Content (第652行)

**修改前:**

```javascript
const initialDelay = 120000; // 2 分钟
// ...
setContentProgressText(
  `Task submitted. Waiting 2 minutes for content generation...`
);
```

**修改后:**

```javascript
const initialDelay = 270000; // 4.5 分钟
// ...
setContentProgressText(
  `Task submitted. Waiting 4.5 minutes for content generation...`
);
```

## 技术参数

### 时间配置

- **初始延迟**: 4.5分钟 (270秒)
- **轮询间隔**: 15秒 (保持不变)
- **最大尝试次数**: 80次 (保持不变)
- **总最大等待时间**: 4.5分钟 + 80次 × 15秒 = 24.5分钟

### 影响范围

1. **Step 1**: 标题生成任务的轮询延迟
2. **Step 2**: 内容生成任务的轮询延迟

## 用户体验影响

### 等待时间延长

- **增加时间**: 2.5分钟 (150秒)
- **目的**: 给AI处理更多时间，减少过早轮询导致的资源消耗

### 进度显示更新

- 进度条25%阶段的提示文字会显示"Waiting 4.5 minutes"
- 用户界面会反映更长的等待时间

## 部署建议

### 测试验证

1. **功能测试**: 确认4.5分钟后轮询正常启动
2. **用户体验**: 验证进度显示信息准确
3. **性能测试**: 检查延迟轮询是否减少系统负载

### 监控要点

- 轮询启动时间是否符合4.5分钟延迟
- 用户反馈等待时间体验
- 系统资源使用情况

---

**更新时间**: 2025-11-01 12:48
**修改类型**: 参数调整
**影响范围**: Step 1 & Step 2 异步处理
**向后兼容**: 是 (仅影响时间参数)
