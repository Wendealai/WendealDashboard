/**
 * Airtable TK Viral Extract 问题诊断脚本
 * 运行方式: node diagnose-airtable-issues.js
 */

const Airtable = require('airtable');

async function diagnoseIssues() {
  console.log('🔍 Airtable TK Viral Extract 问题诊断\n');

  // 配置信息
  const config = {
    apiKey: 'patvF8O4h3xC5tXjc',
    baseId: 'app6YKTV6RUW80S44',
    tableName: 'shrHW8CR5Ih4PzLCp'
  };

  console.log('📋 配置信息:');
  console.log(`API Key: ${config.apiKey}`);
  console.log(`Base ID: ${config.baseId}`);
  console.log(`Table ID: ${config.tableName}`);
  console.log('');

  // 初始化Airtable
  Airtable.configure({
    apiKey: config.apiKey,
    endpointUrl: 'https://api.airtable.com'
  });

  const base = new Airtable().base(config.baseId);

  console.log('🧪 开始诊断...\n');

  // 测试1: 基础连接测试
  console.log('测试1: 基础API连接');
  try {
    const testTable = base('TestTable');
    await testTable.select({ maxRecords: 1 }).all();
    console.log('✅ 基础连接正常');
  } catch (error) {
    if (error.message.includes('NOT_AUTHORIZED')) {
      console.log('❌ API Key无效或权限不足');
    } else if (error.message.includes('TABLE_NOT_FOUND')) {
      console.log('✅ API Key有效，但表不存在（这是正常的）');
    } else {
      console.log(`❌ 连接错误: ${error.message}`);
    }
  }
  console.log('');

  // 测试2: 目标表连接测试
  console.log('测试2: 目标表连接');
  try {
    const targetTable = base(config.tableName);
    const records = await targetTable.select({ maxRecords: 1 }).all();
    console.log(`✅ 表连接成功！找到 ${records.length} 条记录`);
  } catch (error) {
    console.log(`❌ 表连接失败: ${error.message}`);

    if (error.message.includes('NOT_AUTHORIZED')) {
      console.log('🔐 问题: API Key没有访问此表的权限');
    } else if (error.message.includes('TABLE_NOT_FOUND')) {
      console.log('📋 问题: 表ID不正确或表不存在');
    } else {
      console.log(`🔍 其他错误: ${error.message}`);
    }
  }
  console.log('');

  // 测试3: Base信息获取测试
  console.log('测试3: Base信息获取');
  try {
    const response = await fetch(`https://api.airtable.com/v0/meta/bases/${config.baseId}/tables`, {
      headers: {
        'Authorization': `Bearer ${config.apiKey}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Base访问成功！包含 ${data.tables.length} 个表`);

      // 显示表信息
      console.log('\n📋 Base中的表列表:');
      data.tables.forEach((table, index) => {
        console.log(`${index + 1}. ${table.name} (ID: ${table.id})`);
        if (table.id === config.tableName || table.name === 'TK Viral Extract') {
          console.log('   🎯 这可能是目标表!');
        }
      });
    } else {
      console.log(`❌ Base访问失败: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log(`❌ Base信息获取失败: ${error.message}`);
  }
  console.log('');

  // 诊断结果
  console.log('📊 诊断结果:');
  console.log('1. 如果API Key无效: 请重新生成Personal Access Token');
  console.log('2. 如果表不存在: 请检查Table ID是否正确');
  console.log('3. 如果权限不足: 请在Airtable中添加Base访问权限');
  console.log('');

  // 建议解决方案
  console.log('💡 建议解决方案:');
  console.log('1. 访问: https://airtable.com/developers/web/api/introduction');
  console.log('2. 检查或重新生成Personal Access Token');
  console.log('3. 确保Token有访问 app6YKTV6RUW80S44 的权限');
  console.log('4. 在Scopes中包含: data.records:read, data.records:write, schema.bases:read');
  console.log('5. 如果Table ID错误，请查看上面的表列表找到正确的ID');
}

diagnoseIssues().catch(console.error);
