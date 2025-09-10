/**
 * 查找TK Viral Extract的正确Table ID
 * 运行方式: node find-table-id.js
 */

const Airtable = require('airtable');

async function findTableId() {
  console.log('🔍 查找TK Viral Extract的Table ID...\n');

  // 配置
  const config = {
    apiKey: 'patvF8O4h3xC5tXjc.8abec7b543876df039967d9d841b65280c1602f64c079303e88cad4d00284b7e',
    baseId: 'app6YKTV6RUW80S44'
  };

  // 初始化Airtable
  Airtable.configure({
    apiKey: config.apiKey,
    endpointUrl: 'https://api.airtable.com'
  });

  const base = new Airtable().base(config.baseId);

  try {
    console.log('📋 尝试获取表信息...\n');

    // 尝试直接从一个已知的表获取信息来验证连接
    console.log('🔗 测试连接到base...');

    // 先尝试获取一个表的记录，看看能否获取表ID
    // 我们可以从错误信息中推断出表ID
    const testTable = base('TK Viral Extract');

    // 设置一个简单的查询，只获取一条记录
    const records = await testTable.select({
      maxRecords: 1,
      view: 'shrmVcC9nNPAqRf6J'
    }).all();

    console.log('✅ 连接成功！');
    console.log('- 找到记录数量:', records.length);

    if (records.length > 0) {
      console.log('- 第一条记录ID:', records[0].id);
      console.log('- 表结构正常');
    }

    // 现在我们需要找到正确的Table ID
    // 通常Table ID以"tbl"开头，让我们尝试一些常见的模式
    console.log('\n🔍 尝试推断Table ID...');

    // 从URL格式和已知信息来看，Table ID通常在base URL中
    // 让我们检查一些可能的Table ID格式
    const possibleTableIds = [
      'tbl1234567890abc', // 通用格式
      'tblTKViralExtract', // 基于表名的格式
      'tblXXXXXXXXXXXXXXX', // 占位符
    ];

    console.log('💡 提示: 请检查你的Airtable URL格式');
    console.log('   通常是: https://airtable.com/{baseId}/{tableId}/{viewId}');
    console.log('   你的URL: https://airtable.com/app6YKTV6RUW80S44/shrmVcC9nNPAqRf6J');
    console.log('   - baseId: app6YKTV6RUW80S44');
    console.log('   - viewId: shrmVcC9nNPAqRf6J');
    console.log('   - tableId: 需要从Airtable界面或API响应中获取');

    console.log('\n🔧 手动查找Table ID的方法:');
    console.log('1. 打开Airtable网页: https://airtable.com/app6YKTV6RUW80S44/shrmVcC9nNPAqRf6J');
    console.log('2. 点击浏览器地址栏，查看完整URL');
    console.log('3. URL格式应该是: https://airtable.com/app6YKTV6RUW80S44/{tableId}/shrmVcC9nNPAqRf6J');
    console.log('4. {tableId}就是我们需要的Table ID（通常以"tbl"开头）');

  } catch (error) {
    console.error('❌ 连接失败:');

    if (error.message.includes('NOT_AUTHORIZED')) {
      console.log('🔐 权限问题 - 请检查:');
      console.log('1. API key是否正确');
      console.log('2. API key是否已添加到base权限中');
      console.log('3. 权限范围是否包含数据读取');
    } else if (error.message.includes('TABLE_NOT_FOUND')) {
      console.log('📋 表未找到 - 可能的原因:');
      console.log('1. 表名不正确');
      console.log('2. 应该使用Table ID而不是表名');
    } else {
      console.log('错误详情:', error.message);
    }

    console.log('\n🔧 建议解决方案:');
    console.log('1. 访问: https://airtable.com/app6YKTV6RUW80S44/shrmVcC9nNPAqRf6J');
    console.log('2. 在浏览器中查看完整的URL路径');
    console.log('3. 找到Table ID（URL中的第三部分）');
    console.log('4. 更新配置文件中的tableName');
  }
}

findTableId();
