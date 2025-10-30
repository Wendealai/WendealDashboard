// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Generate Task ID - Content Generation Version
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 🔹 使用标准的 $input.first() 方法访问数据
const inputData = $input.first().json;
const body = inputData.body || {};

// 从 webhook body 中提取数据（改为 content）
const content = body.content || '';
const timestamp = body.timestamp || new Date().toISOString();

// 验证必填字段
if (!content || content.trim() === '') {
  throw new Error('Content is required');
}

// 生成唯一任务ID（时间戳 + 随机字符串）
const taskId = `content_task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

console.log('✅ Generated Task ID:', taskId);
console.log('📝 Content length:', content.length);
console.log('📝 Content preview:', content.substring(0, 100) + '...');

// 返回结构化数据
return [{
  json: {
    taskId: taskId,
    content: content,  // ← 改为 content
    status: 'pending',
    createdAt: new Date().toISOString(),
    timestamp: timestamp,
    contentLength: content.length,  // ← 添加内容长度
    // 保留原始 webhook 数据供调试使用
    originalData: inputData
  }
}];

