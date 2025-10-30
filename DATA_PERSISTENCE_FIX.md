# 数据持久化和Use按钮修复方案

## 需求分析

### 1. 数据持久化需求

- 所有生成的结果要保存到 localStorage
- 页面刷新后保持显示上次生成的数据
- Step 1、2、3 的数据都要持久化
- 只有新生成数据时才替换旧数据

### 2. Use按钮修复

- Step 1 的 Use 按钮应该复制 `fullReport` 到 Step 2 输入框
- 而不是复制 `title` 内容
- 确保使用最完整的AI生成内容

## 实现方案

### 1. 添加localStorage工具函数

```typescript
// 数据持久化工具
const STORAGE_KEYS = {
  TITLE_RESPONSE: 'rednote_title_response',
  CONTENT_RESPONSE: 'rednote_content_response',
  IMAGE_RESPONSE: 'rednote_image_response',
};

const saveToStorage = (key: string, data: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save to localStorage:', error);
  }
};

const loadFromStorage = (key: string) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.warn('Failed to load from localStorage:', error);
    return null;
  }
};
```

### 2. 修改use按钮逻辑

```typescript
const handleUseTitle = useCallback(() => {
  if (!titleResponse) {
    antdMessage.warning('No title content to use');
    return;
  }

  // 优先使用 fullReport（最完整的AI生成内容）
  let contentToUse = '';

  if (titleResponse.fullReport) {
    contentToUse = titleResponse.fullReport;
    console.log(
      '📄 Using fullReport for content generation:',
      contentToUse.length,
      'characters'
    );
  } else if (titleResponse.content) {
    contentToUse = titleResponse.content;
    console.log('📝 Using content (fallback)');
  } else if (titleResponse.title) {
    contentToUse = titleResponse.title;
    console.log('📝 Using title (fallback)');
  } else {
    contentToUse = JSON.stringify(titleResponse, null, 2);
    console.log('📝 Using JSON stringify (final fallback)');
  }

  if (!contentToUse || contentToUse.trim().length === 0) {
    antdMessage.warning('No valid content to use');
    return;
  }

  setContentInput(contentToUse);
  antdMessage.success({
    content: `AI generated content (${contentToUse.length} characters) applied to Step 2 input`,
    duration: 3,
  });

  console.log('✅ Full AI content applied to Step 2 input field');
}, [titleResponse]);
```

### 3. 在组件初始化时加载数据

```typescript
// 在组件加载时从localStorage恢复数据
useEffect(() => {
  const savedTitleResponse = loadFromStorage(STORAGE_KEYS.TITLE_RESPONSE);
  const savedContentResponse = loadFromStorage(STORAGE_KEYS.CONTENT_RESPONSE);
  const savedImageResponse = loadFromStorage(STORAGE_KEYS.IMAGE_RESPONSE);

  if (savedTitleResponse) {
    setTitleResponse(savedTitleResponse);
    console.log('🔄 Restored title response from localStorage');
  }

  if (savedContentResponse) {
    setContentResponse(savedContentResponse);
    console.log('🔄 Restored content response from localStorage');
  }

  if (savedImageResponse) {
    setImageResponse(savedImageResponse);
    console.log('🔄 Restored image response from localStorage');
  }
}, []);
```

### 4. 在数据更新时保存到localStorage

```typescript
// 在setTitleResponse后添加保存逻辑
setTitleResponse(result);
saveToStorage(STORAGE_KEYS.TITLE_RESPONSE, result);

// 在setContentResponse后添加保存逻辑
setContentResponse(result);
saveToStorage(STORAGE_KEYS.CONTENT_RESPONSE, result);

// 在setImageResponse后添加保存逻辑
setImageResponse(result);
saveToStorage(STORAGE_KEYS.IMAGE_RESPONSE, result);
```

这样就能确保：

1. 所有生成的数据都会保存到本地存储
2. 页面刷新后会恢复之前的数据
3. Step 1 的 Use 按钮会复制最完整的 fullReport 内容
4. 只有新生成数据时才会替换旧数据
