@echo off
title WendealDashboard - 启动器
cd /d "%~dp0"

echo 正在启动 Wendeal Dashboard...
echo.

:: 检查Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误：未找到Node.js，请先安装 Node.js
    echo 下载地址：https://nodejs.org/
    pause
    exit
)

:: 检查npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误：未找到npm
    pause
    exit
)

:: 安装依赖（如果需要）
if not exist "node_modules" (
    echo 正在安装依赖...
    npm install
    if %errorlevel% neq 0 (
        echo 依赖安装失败
        pause
        exit
    )
)

echo 启动开发服务器...
echo 浏览器访问: http://localhost:5173
echo 按 Ctrl+C 停止服务器
echo.

npm run dev

pause