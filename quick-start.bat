@echo off
echo 🚀 Quick Start - Wendeal Dashboard
echo ====================================
echo.

echo 检查依赖...
if not exist "node_modules" (
    echo 安装依赖...
    call npm install
)

echo.
echo 启动开发服务器...
call npm run dev




