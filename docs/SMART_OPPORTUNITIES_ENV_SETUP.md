# Smart Opportunities 环境配置指南

本文档介绍如何为Smart Opportunities功能配置环境变量。

## 环境变量配置

### 1. 创建环境配置文件

在项目根目录创建 `.env.local` 文件（此文件已被 `.gitignore` 排除，不会提交到版本控制）：

```bash
# Smart Opportunities Airtable Configuration
# 这些配置用于连接Airtable数据库来获取商业机会数据

# Airtable API Key
# 从 https://airtable.com/developers/web/api/introduction 获取
VITE_AIRTABLE_API_KEY=your_airtable_api_key_here

# Airtable Base ID
# 你的Airtable base的ID，可以从URL中获取
VITE_AIRTABLE_BASE_ID=your_base_id_here

# Airtable Table Name
# 存储商业机会数据的表名
VITE_AIRTABLE_TABLE_NAME=Opportunities

# Airtable View Name (可选)
# 如果你想使用特定的视图，可以指定视图名称
VITE_AIRTABLE_VIEW_NAME=All Opportunities

# Smart Opportunities Configuration
# 工作流相关的配置

# 默认查询参数
VITE_SMART_OPPORTUNITIES_DEFAULT_INDUSTRY=Technology
VITE_SMART_OPPORTUNITIES_DEFAULT_CITY=San Francisco
VITE_SMART_OPPORTUNITIES_DEFAULT_COUNTRY=United States

# 性能配置
VITE_SMART_OPPORTUNITIES_MAX_RESULTS=100
VITE_SMART_OPPORTUNITIES_CACHE_DURATION=300000

# 自动刷新间隔（毫秒）
VITE_SMART_OPPORTUNITIES_AUTO_REFRESH_INTERVAL=600000

# 启用调试模式
VITE_SMART_OPPORTUNITIES_DEBUG=false
```

### 2. 获取Airtable API Key

1. 访问 [Airtable API Documentation](https://airtable.com/developers/web/api/introduction)
2. 点击 "Generate API key" 生成新的API密钥
3. 复制生成的API密钥并设置到 `VITE_AIRTABLE_API_KEY`

### 3. 获取Airtable Base ID

1. 打开你的Airtable base
2. 查看浏览器URL，格式类似：`https://airtable.com/appXXXXXXXXXXXXXX/tblYYYYYYYYYYYYYY/viwZZZZZZZZZZZZZZ`
3. `appXXXXXXXXXXXXXX` 部分就是Base ID
4. 设置到 `VITE_AIRTABLE_BASE_ID`

### 4. 配置数据表结构

确保你的Airtable表包含以下字段：

#### 必需字段：
- **Company Name** (单行文本) - 公司名称
- **Industry** (单行文本) - 行业
- **Location** (单行文本) - 位置（格式："城市, 州"）
- **Description** (多行文本) - 公司描述

#### 可选字段：
- **Contact Person** (单行文本) - 联系人
- **Email** (邮箱) - 邮箱地址
- **Phone** (电话号码) - 电话号码
- **Website** (URL) - 公司网站

### 5. 验证配置

配置完成后，重启开发服务器：

```bash
npm run dev
```

访问 Smart Opportunities 页面，测试配置是否正确工作。

## 故障排除

### 常见问题

1. **API Key错误**
   ```
   错误: INVALID_API_KEY
   解决: 检查 VITE_AIRTABLE_API_KEY 是否正确
   ```

2. **Base ID错误**
   ```
   错误: NOT_FOUND
   解决: 检查 VITE_AIRTABLE_BASE_ID 是否正确
   ```

3. **权限错误**
   ```
   错误: INSUFFICIENT_PERMISSIONS
   解决: 确保API Key有访问该Base的权限
   ```

4. **表不存在**
   ```
   错误: TABLE_NOT_FOUND
   解决: 检查 VITE_AIRTABLE_TABLE_NAME 是否正确
   ```

### 调试模式

启用调试模式来查看详细日志：

```bash
VITE_SMART_OPPORTUNITIES_DEBUG=true
```

这将在浏览器控制台输出详细的API请求和响应信息。

## 安全注意事项

1. 永远不要将 `.env.local` 文件提交到版本控制系统
2. 定期轮换API密钥
3. 只给API密钥必要的最小权限
4. 在生产环境中使用环境变量而不是硬编码值




