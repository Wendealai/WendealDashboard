// Airtable权限诊断脚本
console.log('🔍 Airtable Permissions Diagnostic Tool');
console.log('=======================================');

console.log('\n📋 Current Configuration:');
console.log('- Base ID: app6YKTV6RUW80S44');
console.log('- Table: TK Viral Extract');
console.log('- API Key: patvF8O4h3xC5tXjc...8cad4d00284b7e');
console.log('- Status: 403 Forbidden (NOT_AUTHORIZED)');

console.log('\n❌ Problem: API key lacks access to base app6YKTV6RUW80S44');

console.log('\n🛠️ SOLUTION STEPS:');
console.log('=======================================');

console.log('\n1️⃣ 访问Airtable开发者控制台:');
console.log('   https://airtable.com/developers/web/api/introduction');

console.log('\n2️⃣ 选择您的Personal Access Token:');
console.log('   查找: patvF8O4h3xC5tXjc...8cad4d00284b7e');

console.log('\n3️⃣ 检查"Scopes"权限:');
console.log('   ✅ data.records:read (必需)');
console.log('   ✅ data.records:write (如果需要编辑)');
console.log('   ✅ schema.bases:read (推荐)');

console.log('\n4️⃣ 检查"Bases"访问权限:');
console.log('   🔍 查找: app6YKTV6RUW80S44');
console.log('   📝 确认包含: "TK Viral Extract" 表');
console.log('   🔗 关联URL: https://airtable.com/app6YKTV6RUW80S44/shrmVcC9nNPAqRf6J');

console.log('\n5️⃣ 如果base不在列表中:');
console.log('   ➕ 点击"Add a base"');
console.log('   🔍 搜索或输入: app6YKTV6RUW80S44');
console.log('   ✅ 选择相关的表权限');

console.log('\n6️⃣ 保存更改后:');
console.log('   💾 点击"Save"保存token配置');
console.log('   🔄 刷新浏览器页面');
console.log('   ✅ TK Viral Extract应该可以正常加载数据');

console.log('\n📞 如果问题仍然存在:');
console.log('   1. 检查base ID是否正确');
console.log('   2. 确认表名"TK Viral Extract"存在');
console.log('   3. 验证API key没有过期');
console.log('   4. 尝试创建一个新的Personal Access Token');

console.log('\n🎯 重要提醒:');
console.log('- 403 Forbidden = 认证成功但授权失败');
console.log('- 这与401 (认证失败) 不同');
console.log('- 问题在于base访问权限配置');

console.log('\n📊 对比测试:');
console.log('- Smart Opportunities: ✅ 200 OK (base: appU7ykK2mZQZv444)');
console.log('- TK Viral Extract: ❌ 403 Forbidden (base: app6YKTV6RUW80S44)');

console.log('\n🔧 技术解决方案已完成，等待权限配置...');
