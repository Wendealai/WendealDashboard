@echo off
echo 🚀 正在启动 Notion Webhook 服务器...
echo.

cd /d %~dp0

REM 检查 Node.js 是否安装
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: Node.js 未安装或不在 PATH 中
    echo 请访问 https://nodejs.org 下载并安装 Node.js
    pause
    exit /b 1
)

REM 检查依赖是否已安装
if not exist "node_modules" (
    echo 📦 正在安装依赖...
    npm install
    if errorlevel 1 (
        echo ❌ 依赖安装失败
        pause
        exit /b 1
    )
)

echo ✅ 依赖检查完成
echo.

REM 启动 webhook 服务器
echo 🚀 启动 Notion Webhook 服务器...
echo 服务器将在 http://localhost:3001 上运行
echo 按 Ctrl+C 停止服务器
echo.

npm run webhook

pause
