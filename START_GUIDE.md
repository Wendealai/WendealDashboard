# 🚀 Wendeal Dashboard - 项目启动指南

## 📋 快速开始

### 方法1：完整启动脚本（推荐）
双击运行 `start-project.bat` 文件

**该脚本会自动：**
- ✅ 检查Node.js环境
- ✅ 检查npm环境
- ✅ 自动安装项目依赖
- ✅ 检查端口占用
- ✅ 启动开发服务器
- ✅ 显示访问地址和快捷键说明

### 方法2：快速启动脚本
双击运行 `quick-start.bat` 文件

**适用于：**
- 依赖已安装，只需要启动服务器
- 快速重新启动项目

### 方法3：手动启动
```bash
# 安装依赖（首次运行）
npm install

# 启动开发服务器
npm run dev
```

## 🌐 访问地址

服务器启动成功后，可以通过以下地址访问：

- **本地访问**: http://localhost:5173/
- **网络访问**: http://192.168.31.222:5173/ (同网络段设备可访问)

## ⌨️ 开发服务器快捷键

启动服务器后，可以使用以下快捷键：

| 快捷键 | 功能 |
|--------|------|
| `r` | 重新启动服务器 |
| `u` | 显示服务器URL |
| `o` | 在浏览器中打开 |
| `c` | 清除控制台 |
| `q` | 退出开发模式 |
| `Ctrl+C` | 停止服务器 |

## 📁 项目结构

```
WendealDashboard/
├── src/                    # 源代码目录
│   ├── components/         # React组件
│   ├── pages/             # 页面组件
│   ├── services/          # 服务层
│   ├── types/             # TypeScript类型定义
│   └── utils/             # 工具函数
├── public/                # 静态资源
├── docs/                  # 项目文档
├── start-project.bat      # 完整启动脚本
├── quick-start.bat        # 快速启动脚本
└── package.json           # 项目配置
```

## 🔧 系统要求

- **Node.js**: 18.x 或更高版本
- **npm**: 8.x 或更高版本
- **操作系统**: Windows 10/11

## ⚠️ 常见问题

### 1. 端口5173被占用
```
解决方案：
1. 关闭占用5173端口的其他程序
2. 修改 vite.config.ts 中的端口配置
3. 或者使用不同的端口启动：npm run dev -- --port 3000
```

### 2. Node.js未找到
```
解决方案：
1. 下载并安装Node.js：https://nodejs.org/
2. 确保安装了npm
3. 重启命令行工具
```

### 3. 依赖安装失败
```
解决方案：
1. 检查网络连接
2. 尝试使用国内镜像：npm config set registry https://registry.npmmirror.com
3. 删除 node_modules 文件夹后重新安装
```

## 📊 项目特性

- ✅ **React 18** - 最新的React特性
- ✅ **TypeScript** - 类型安全的开发体验
- ✅ **Vite** - 快速的构建工具
- ✅ **Ant Design** - 美观的UI组件库
- ✅ **Redux Toolkit** - 状态管理
- ✅ **React Testing Library** - 完整的测试套件
- ✅ **ESLint + Prettier** - 代码质量保证

## 🎯 主要功能模块

1. **信息仪表板** - 数据可视化展示
2. **Invoice OCR** - 发票智能识别
3. **Reddit热点内容** - 社交媒体数据聚合
4. **Smart Opportunities** - 商业机会发现
5. **用户管理系统** - 权限和认证管理

## 📞 获取帮助

如果遇到问题，请：

1. 查看 `docs/` 目录下的相关文档
2. 检查控制台错误信息
3. 查看项目的Issues页面
4. 联系开发团队

---

**祝您开发愉快！ 🎉**




