/**
 * Airtable Personal Access Token权限配置指南
 * 运行方式: node airtable-permission-setup.js
 */

console.log('🚀 Airtable TK Viral Extract权限配置指南\n');

// 当前配置信息
console.log('📋 当前配置状态:');
console.log('API Key: patvF8O4h3xC5tXjc.8abec7b543876df039967d9d841b65280c1602f64c079303e88cad4d00284b7e (Smart Opportunities的完整token)');
console.log('✅ 已有Base: appU7ykK2mZQZv444 (Smart Opportunities)');
console.log('❌ 需要Base: app6YKTV6RUW80S44 (TK Viral Extract)');
console.log('📊 新Table ID: shrxS5YLNuAycKmQP (从新URL提取)');
console.log('🌐 新URL: https://airtable.com/app6YKTV6RUW80S44/shrxS5YLNuAycKmQP');
console.log('');

console.log('🔧 权限配置步骤:\n');

console.log('步骤1: 访问Airtable开发者页面');
console.log('🌐 https://airtable.com/developers/web/api/introduction\n');

console.log('步骤2: 编辑Personal Access Token');
console.log('🔍 查找Token: patvF8O4h3xC5tXjc... (Smart Opportunities使用的token)');
console.log('📝 完整Token: patvF8O4h3xC5tXjc.8abec7b543876df039967d9d841b65280c1602f64c079303e88cad4d00284b7e\n');

console.log('步骤3: 添加TK Viral Extract Base');
console.log('🏠 当前已有: appU7ykK2mZQZv444 ✅');
console.log('🏠 需要添加: app6YKTV6RUW80S44 ❌');
console.log('📊 新Table ID: shrxS5YLNuAycKmQP');
console.log('📋 TK Viral Extract Base URL: https://airtable.com/app6YKTV6RUW80S44/shrxS5YLNuAycKmQP\n');

console.log('步骤4: 确认权限范围 (Scopes)');
console.log('✅ data.records:read - 读取记录');
console.log('✅ data.records:write - 写入记录');
console.log('✅ schema.bases:read - 读取base结构\n');

console.log('步骤5: 保存更改');
console.log('💾 点击"Save changes"保存设置\n');

console.log('步骤6: 测试连接');
console.log('🧪 返回应用，点击"🔍 调试连接"按钮');
console.log('✅ 应该看到: "连接成功！找到 X 条记录"\n');

console.log('📖 相关文档链接:');
console.log('🔗 Base API文档: https://airtable.com/app6YKTV6RUW80S44/api/docs');
console.log('🔗 认证文档: https://airtable.com/app6YKTV6RUW80S44/api/docs#curl/authentication');
console.log('🔗 Personal Access Tokens: https://airtable.com/developers/web/api/introduction\n');

console.log('⚠️  重要提醒:');
console.log('🔐 确保Token已添加到 app6YKTV6RUW80S44 base的访问权限中');
console.log('🔄 如果仍然失败，请检查Token是否已保存更改');
console.log('📞 如有问题，请查看Airtable开发者文档获取更多帮助\n');

console.log('🎯 完成这些步骤后，TK Viral Extract就能正常工作了！');
