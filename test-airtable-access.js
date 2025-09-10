// 测试Airtable访问权限
console.log('🔧 Testing Airtable Access Permissions...');

try {
  console.log('✅ Testing Airtable access with current configuration');
  console.log('');
  console.log('📋 Current Configuration:');
  console.log('- API Key: patvF8O4h3xC5tXjc.8abec7b543876df039967d9d841b65280c1602f64c079303e88cad4d00284b7e');
  console.log('- Base ID: app6YKTV6RUW80S44');
  console.log('- Table: TK Viral Extract');
  console.log('- View: Grid view');
  console.log('');
  console.log('❌ Current Error: 403 Forbidden (NOT_AUTHORIZED)');
  console.log('');
  console.log('🔍 Possible Causes:');
  console.log('1. API key does not have access to this base');
  console.log('2. Base ID is incorrect');
  console.log('3. API key permissions not configured in Airtable');
  console.log('4. Base sharing settings incorrect');
  console.log('');
  console.log('🛠️ Solutions to try:');
  console.log('');
  console.log('Option 1 - Check API Key Permissions:');
  console.log('1. Go to https://airtable.com/developers/web/api/introduction');
  console.log('2. Select your API key');
  console.log('3. Check if base "app6YKTV6RUW80S44" is accessible');
  console.log('4. Ensure "TK Viral Extract" table is included in scopes');
  console.log('');
  console.log('Option 2 - Verify Base ID:');
  console.log('1. Open your Airtable base in browser');
  console.log('2. Check the URL: https://airtable.com/[BASE_ID]/...');
  console.log('3. Ensure Base ID matches: app6YKTV6RUW80S44');
  console.log('');
  console.log('Option 3 - Create New API Key:');
  console.log('1. Go to https://airtable.com/developers/web/api/introduction');
  console.log('2. Create new Personal Access Token');
  console.log('3. Add your specific base to the token scopes');
  console.log('4. Update the API key in the code');
  console.log('');
  console.log('📝 To update Base ID, modify:');
  console.log('File: src/services/tkViralExtractAirtableService.ts');
  console.log('Line: baseId: \'app6YKTV6RUW80S44\'');
  console.log('');
  console.log('⚠️  Important: 403 Forbidden means authentication works, but authorization fails');
  console.log('   This is different from 401 (authentication failed)');

} catch (error) {
  console.error('❌ Test failed:', error);
}
