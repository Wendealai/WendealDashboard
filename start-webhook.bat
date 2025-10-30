@echo off
chcp 65001 >nul
title WendealDashboard - Webhook 服务器
cd /d "%~dp0"

echo.
echo ============================================
echo     🚀 Notion Webhook 服务器启动器
echo ============================================
echo.

:: 检查Node.js
echo [1/3] 检查 Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：未找到 Node.js
    echo 请访问 https://nodejs.org 下载并安装 Node.js
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js: %NODE_VERSION%

:: 检查npm
echo [2/3] 检查 npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：未找到 npm
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✅ npm: %NPM_VERSION%

:: 检查并安装依赖
echo [3/3] 检查项目依赖...
if not exist "node_modules" (
    echo 📦 正在安装依赖...
    echo.
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 依赖安装失败
        echo.
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
) else (
    echo ✅ 依赖已存在
)

echo.
echo ============================================
echo     🎉 启动 Notion Webhook 服务器
echo ============================================
echo.
echo 🌐 服务器地址: http://localhost:3001
echo 📡 Webhook 端点: http://localhost:3001/webhook/notion
echo.
echo 🛑 按 Ctrl+C 停止服务器
echo.
echo ============================================
echo.

npm run webhook

echo.
echo ============================================
echo     👋 Webhook 服务器已停止
echo ============================================
echo.
pause