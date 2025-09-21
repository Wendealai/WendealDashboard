// Notion API 连接测试脚本
// 在浏览器控制台中运行此代码来测试连接

const NOTION_API_KEY = 'YOUR_NOTION_API_TOKEN';
const DATABASE_ID = '266efdb673e08067908be152e0be1cdb';

async function testNotionConnection() {
  console.log('🧪 开始测试 Notion API 连接...');

  try {
    // 测试 1: 直接调用 Notion API (可能因 CORS 失败)
    console.log('📡 测试 1: 直接调用 Notion API');
    const directResponse = await fetch(`https://api.notion.com/v1/databases/${DATABASE_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sorts: [{ property: '创建时间', direction: 'descending' }]
      })
    });

    console.log('✅ 直接调用结果:', directResponse.status, directResponse.statusText);

    if (directResponse.ok) {
      const data = await directResponse.json();
      console.log('📊 数据获取成功:', data.results?.length || 0, '条记录');
    } else {
      console.log('❌ 直接调用失败，可能因 CORS 限制');
    }
  } catch (error) {
    console.log('❌ 直接调用出错:', error.message);
  }

  try {
    // 测试 2: 通过代理调用
    console.log('🔗 测试 2: 通过代理调用');
    const proxyResponse = await fetch(`/webhook/notion-fetch/${DATABASE_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sorts: [{ property: '创建时间', direction: 'descending' }]
      })
    });

    console.log('✅ 代理调用结果:', proxyResponse.status, proxyResponse.statusText);

    if (proxyResponse.ok) {
      const data = await proxyResponse.json();
      console.log('📊 代理数据获取成功:', data.results?.length || 0, '条记录');

      // 显示前几条记录的基本信息
      if (data.results && data.results.length > 0) {
        console.log('📋 前3条记录:');
        data.results.slice(0, 3).forEach((record, index) => {
          const title = record.properties?.标题?.title?.[0]?.plain_text ||
                       record.properties?.Title?.title?.[0]?.plain_text ||
                       '无标题';
          console.log(`  ${index + 1}. ${title}`);
        });
      }
    } else {
      const errorText = await proxyResponse.text();
      console.log('❌ 代理调用失败:', errorText);
    }
  } catch (error) {
    console.log('❌ 代理调用出错:', error.message);
  }

  console.log('🎯 测试完成！请查看上方结果。');
}

// 自动运行测试
testNotionConnection();

// 也可以手动调用
window.testNotionConnection = testNotionConnection;
