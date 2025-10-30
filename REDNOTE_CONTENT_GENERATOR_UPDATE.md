# Rednote Content Generator 更新说明

## 修改日期

2025-01-29

## 修改概述

将 Rednote Content Generator 工作流的布局从左右结构改为上下结构，并简化输入字段，只保留文案输入框。

## 具体修改内容

### 1. 布局结构变更

- **原布局**: 左右两栏布局（输入区域在左侧，输出区域在右侧）
- **新布局**: 上下布局（输入区域在上方，输出区域在下方）
- 参考了 Rednote Img Generator 的布局风格

### 2. 移除的输入字段

删除了以下所有输入字段，只保留文案输入框：

- ❌ 内容类型（Content Type）
- ❌ 语调风格（Tone Style）
- ❌ 爆款文案常用技巧（Writing Techniques）
- ❌ 成功要素（Success Factors）
- ❌ 目标受众（Target Audience - Optional）
- ❌ 关键词标签（Keywords Tags - Optional）

保留的字段：

- ✅ 文案输入框（Content Input）

### 3. Webhook URL 更新

- **旧URL**: `https://n8n.wendealai.com/webhook/rednote`
- **新URL**: `https://n8n.wendealai.com/webhook/Rednotecontent`

### 4. 按钮文本更新

- **生成按钮**: "Generate Rednote Content" (英文)
- **重置按钮**: "Reset" (英文)
- **复制按钮**: "Copy" (英文)

### 5. 代码优化

- 简化了状态管理，移除了不再使用的状态变量
- 移除了 `RedNoteContentRequest` 类型导入
- 简化了请求数据结构，只发送 `content` 和 `timestamp`
- 优化了错误处理和进度显示
- 更新了所有UI文本为英文

### 6. 组件结构

```typescript
// 新的组件结构
<div className="rednote-content-generator">
  {/* Error Alert */}
  {error && <Alert />}

  {/* Input Area - 输入区域 */}
  <Card title="Input Content">
    <TextArea /> {/* 文案输入 */}
    <Button>Generate Rednote Content</Button>
  </Card>

  {/* Output Area - 输出区域 */}
  <Card title="Generated Result">
    {/* 空状态 / 加载状态 / 结果显示 */}
  </Card>
</div>
```

## 文件修改列表

1. `src/pages/SocialMedia/components/RedNoteContentGenerator.tsx` - 主要修改
   - 简化导入
   - 移除不需要的状态变量
   - 更新 handleGenerateContent 函数
   - 重构UI布局为上下结构
   - 更新webhook URL
   - 导入CSS样式文件

2. `src/pages/SocialMedia/components/RedNoteContentGenerator.css` - 新增
   - 确保输入框显示足够高度（288px，约12行）
   - 使用 `!important` 防止样式被覆盖
   - 设置行高为24px
   - 允许垂直调整大小
   - 响应式布局优化（移动端200px）

## 功能保持不变

- ✅ 内容生成功能
- ✅ 结果显示（包括统计数据、发布格式、运营管理数据）
- ✅ 复制到剪贴板
- ✅ 查看Google Sheet
- ✅ 进度显示
- ✅ 错误处理

## 测试建议

1. 测试文案输入和生成功能
2. 验证新的webhook URL是否正常工作
3. 检查响应数据解析是否正确
4. 验证所有按钮功能（生成、重置、复制）
5. 测试空状态、加载状态和结果显示状态
6. 验证移动端响应式布局

## 兼容性说明

- 后端需要更新webhook endpoint为 `/webhook/Rednotecontent`
- 请求格式已简化为：

```json
{
  "content": "用户输入的文案内容",
  "timestamp": "2025-01-29T10:00:00.000Z"
}
```

## CSS样式说明

为确保输入框正确显示，创建了专门的CSS文件：

### 关键样式设置

```css
.rednote-content-generator textarea.ant-input {
  min-height: 288px !important; /* 12行 × 24px行高 */
  line-height: 24px !important;
  resize: vertical !important;
}
```

### 为什么使用 `!important`

- Ant Design的默认样式优先级较高
- 需要确保输入框在所有情况下都能正确显示高度
- 参考了同项目中RednoteImgGenerator的实现方式

### 响应式设计

- 桌面端：288px（约12行）
- 移动端：200px（约8行）

## 注意事项

- CSS内联样式警告可以忽略，这是与Ant Design组件集成的标准做法
- 保持了与原有响应数据结构的兼容性
- 保留了所有原有的结果显示功能
- 输入框高度已通过专门的CSS文件确保，可以正确显示至少12行内容（远超4行要求）
