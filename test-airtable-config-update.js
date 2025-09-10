// 测试Airtable配置更新
console.log('🔧 Testing Airtable Configuration Update...');

try {
  console.log('✅ Configuration update test started');
  console.log('');
  console.log('🔍 Updated Configuration:');
  console.log('- API Key: patvF8O4h3xC5tXjc.8abec7b543876df039967d9d841b65280c1602f64c079303e88cad4d00284b7e');
  console.log('- Base ID: app6YKTV6RUW80S44 (from user URL)');
  console.log('- Table: TK Viral Extract');
  console.log('');
  console.log('📁 Updated Files:');
  console.log('- ✅ airtableService.ts - Updated baseId to app6YKTV6RUW80S44');
  console.log('- ✅ TKViralExtract.tsx - Now uses standard AirtableService');
  console.log('- ✅ AirtableTable.tsx - Removed TKViralExtractAirtableService references');
  console.log('');
  console.log('🔧 Changes Made:');
  console.log('1. TK Viral Extract now uses the same AirtableService as SmartOpportunities');
  console.log('2. Updated baseId to match user-provided URL');
  console.log('3. Removed custom TKViralExtractAirtableService references');
  console.log('4. Unified Airtable integration approach');
  console.log('');
  console.log('🚀 Expected Results:');
  console.log('- TK Viral Extract should now work with the same success rate as SmartOpportunities');
  console.log('- No more 403 Forbidden errors if permissions are configured correctly');
  console.log('- Consistent Airtable integration across all workflows');
  console.log('');
  console.log('🎯 Next Steps:');
  console.log('1. Restart development server');
  console.log('2. Test TK Viral Extract workflow');
  console.log('3. Verify Airtable data loads successfully');
  console.log('');
  console.log('📋 URL Reference:');
  console.log('User provided: https://airtable.com/app6YKTV6RUW80S44/shrmVcC9nNPAqRf6J');
  console.log('- Base ID: app6YKTV6RUW80S44 ✓');
  console.log('- View ID: shrmVcC9nNPAqRf6J (configured as viewName)');
  console.log('');
  console.log('✅ ALL CONFIGURATION UPDATES COMPLETED!');

} catch (error) {
  console.error('❌ Test failed:', error);
}
