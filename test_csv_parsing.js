// 测试CSV解析逻辑
const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // 转义的引号
        current += '"';
        i += 2;
        continue;
      } else {
        // 切换引号状态
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // 字段分隔符
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }

    i++;
  }

  // 添加最后一个字段
  result.push(current.trim());
  return result;
};

// 从用户日志中提取的实际CSV行
const testLine = '"Athletix Gym Brisbane: Strength & Conditioning","Gym","brisbane","42 Baxter St"," Fortitude Valley QLD 4006","https://www.athletix.com.au/","","4.9","59","SEO audit and optimization; Website redesign and modernization; Website speed and mobile optimization; Conversion rate optimization; Professional email setup and automation; Customer relationship management (CRM) system; Member management and billing system; Online class booking and scheduling"';

console.log('Original CSV line:');
console.log(testLine);
console.log('\nParsed fields:');

const parsed = parseCSVLine(testLine);
parsed.forEach((field, index) => {
  console.log(`${index + 1}: '${field}'`);
});

console.log('\nField mapping result:');
const headers = ['Business Name', 'Category', 'City', 'Address', 'Phone', 'Website', 'Rating', 'Reviews', 'Opportunities', 'Lead Score', 'Created Time'];

const record = {};
headers.forEach((header, index) => {
  const fieldMapping = {
    'Business Name': 'Business Name',
    'Category': 'Category',
    'City': 'City',
    'Address': 'Address',
    'Website': 'Website',
    'Opportunities': 'Opportunities'
  };

  const airtableFieldName = fieldMapping[header] || header;
  record[airtableFieldName] = parsed[index] || '';
});

console.log(JSON.stringify(record, null, 2));

