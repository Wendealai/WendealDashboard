// 测试MSW修复的脚本
// 在浏览器控制台中运行此代码

async function testMswFix() {
  console.log('🧪 测试MSW修复效果...');

  // 测试1: 清除ServiceWorker缓存
  if ('serviceWorker' in navigator) {
    try {
      console.log('🗑️ 清除ServiceWorker...');
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log('✅ ServiceWorker已注销:', registration.scope);
      }
    } catch (error) {
      console.error('❌ 清除ServiceWorker失败:', error);
    }
  }

  // 测试2: 清除缓存
  if ('caches' in window) {
    try {
      console.log('🗑️ 清除缓存...');
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => {
          console.log('🗑️ 删除缓存:', cacheName);
          return caches.delete(cacheName);
        })
      );
      console.log('✅ 所有缓存已清除');
    } catch (error) {
      console.error('❌ 清除缓存失败:', error);
    }
  }

  // 测试3: 直接测试Notion API（绕过代理）
  try {
    console.log('🔗 直接测试Notion API...');
    const directResponse = await fetch('https://api.notion.com/v1/databases/266efdb673e08067908be152e0be1cdb/query', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_NOTION_API_TOKEN',
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sorts: [{ property: '创建时间', direction: 'descending' }]
      })
    });

    console.log('🔍 直接API调用结果:', directResponse.status, directResponse.statusText);

    if (directResponse.ok) {
      const data = await directResponse.json();
      console.log('📊 成功获取数据:', data.results?.length || 0, '条记录');
      console.log('🎉 Notion API连接正常！');
    } else {
      console.log('❌ 直接API调用失败，可能是CORS或认证问题');
    }
  } catch (error) {
    console.error('❌ 直接API调用出错:', error.message);

    if (error.message.includes('NetworkError') || error.message.includes('CORS')) {
      console.log('💡 这表明CORS限制仍然存在，需要使用代理');
    }
  }

  // 测试4: 测试代理连接
  try {
    console.log('🔗 测试代理连接...');
    const proxyResponse = await fetch('/webhook/notion-fetch/266efdb673e08067908be152e0be1cdb', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sorts: [{ property: '创建时间', direction: 'descending' }]
      })
    });

    console.log('🔗 代理调用结果:', proxyResponse.status, proxyResponse.statusText);

    if (proxyResponse.ok) {
      const data = await proxyResponse.json();
      console.log('📊 代理数据获取成功:', data.results?.length || 0, '条记录');
      console.log('🎉 代理连接正常！MSW修复成功！');
    } else {
      console.log('❌ 代理调用失败');
    }
  } catch (error) {
    console.error('❌ 代理调用出错:', error.message);
  }

  console.log('🎯 测试完成！请查看上方结果。');
}

// 自动运行测试
testMswFix();

// 也可以手动调用
window.testMswFix = testMswFix;
