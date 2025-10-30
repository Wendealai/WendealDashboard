# ✅ Code 节点返回格式修复

## 🔧 问题

**错误信息**:

```
Code doesn't return a single object [item 0]
An array of objects was returned.
If you need to output multiple items, please use the 'Run Once for All Items' mode instead.
```

## 🎯 原因

在 **"Run Once for Each Item"** 模式下，代码应该返回**单个对象**，而不是数组。

---

## ✅ 修复方案

### 修改前 ❌

```javascript
return [{  // ← 数组格式
  json: {
    taskId: taskId,
    status: 'completed',
    result: result,
    ...
  }
}];
```

### 修改后 ✅

```javascript
return {  // ← 单个对象
  json: {
    taskId: taskId,
    status: 'completed',
    result: result,
    ...
  }
};
```

---

## 📝 修改的位置

### 1. 错误处理 - 无法找到 JSON (第 127-135 行)

```javascript
if (!cleanedJson) {
  return {  // ← 改为单个对象
    json: {
      taskId: taskId,
      status: 'completed',
      result: { parseError: true, ... }
    }
  };
}
```

### 2. 错误处理 - JSON 解析失败 (第 156-164 行)

```javascript
catch (error) {
  return {  // ← 改为单个对象
    json: {
      taskId: taskId,
      status: 'completed',
      result: { parseError: true, ... }
    }
  };
}
```

### 3. 正常返回 (第 286-298 行)

```javascript
return {  // ← 改为单个对象
  json: {
    taskId: taskId,
    status: 'completed',
    result: result,
    completedAt: ...,
    duration: ...
  }
};
```

---

## 🔄 n8n 模式对比

| 模式                       | 返回格式            | 用途           |
| -------------------------- | ------------------- | -------------- |
| **Run Once for Each Item** | `{ json: {...} }`   | 处理单个 item  |
| **Run Once for All Items** | `[{ json: {...} }]` | 处理所有 items |

---

## ✅ 修复完成

### 文件

- `workflows/content-workflow2-code-parse-ai-output.js`

### 状态

- ✅ 已修复所有返回语句（3处）
- ✅ 保留所有原有功能
- ✅ 适配 "Run Once for Each Item" 模式

---

## 🧪 测试

### 1. 在 n8n 中重新测试

粘贴修复后的代码到 Code 节点

### 2. 确认模式

Mode: `Run Once for Each Item`

### 3. 预期结果

- ✅ 不再出现 "doesn't return a single object" 错误
- ✅ 正常返回处理结果
- ✅ Update row(s)2 节点能正确接收数据

---

## 📖 相关文档

- **代码文件**: [workflows/content-workflow2-code-parse-ai-output.js](./workflows/content-workflow2-code-parse-ai-output.js)
- **详细说明**: [CONTENT_CODE_NODE_MODIFICATIONS.md](./CONTENT_CODE_NODE_MODIFICATIONS.md)

---

## 🎉 完成！

**所有返回语句已修复为单个对象格式！** 🚀

现在可以在 n8n 中使用了！
