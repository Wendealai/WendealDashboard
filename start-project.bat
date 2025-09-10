@echo off
chcp 65001 >nul 2>&1
color 0A
cls

echo.
echo   ███╗   ██╗███████╗██╗    ██╗███████╗ █████╗ ██╗
echo   ████╗  ██║██╔════╝██║    ██║██╔════╝██╔══██╗██║
echo   ██╔██╗ ██║█████╗  ██║ █╗ ██║█████╗  ███████║██║
echo   ██║╚██╗██║██╔══╝  ██║███╗██║██╔══╝  ██╔══██║██║
echo   ██║ ╚████║███████╗╚███╔███╔╝███████╗██║  ██║███████╗
echo   ╚═╝  ╚═══╝╚══════╝ ╚══╝╚══╝ ╚══════╝╚═╝  ╚═╝╚══════╝
echo.
echo ===========================================
echo      Wendeal Dashboard - 项目启动器
echo ===========================================
echo 项目版本: v1.0.0
echo 技术栈: React + TypeScript + Vite + Ant Design
echo.

echo [1/4] 检查系统环境...
echo.

:: 检查Node.js
echo 正在检查Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：未找到Node.js
    echo.
    echo 请先安装Node.js：
    echo 下载地址：https://nodejs.org/
    echo 推荐版本：Node.js 18.x 或更高版本
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js版本: %NODE_VERSION%

:: 检查npm
echo 正在检查npm...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误：未找到npm
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✅ npm版本: %NPM_VERSION%

echo.
echo [2/4] 检查项目依赖...
if not exist "node_modules" (
    echo 正在安装项目依赖（这可能需要几分钟）...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo ❌ 错误：依赖安装失败
        echo 请检查网络连接或package.json配置
        echo.
        pause
        exit /b 1
    )
    echo.
    echo ✅ 依赖安装完成
) else (
    echo ✅ 项目依赖已存在
)

echo.
echo [3/4] 检查端口占用...
netstat -ano | findstr :5173 >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  警告：端口5173已被占用
    echo 服务器可能已经在运行中
    echo.
    echo 如果需要更换端口，请修改vite.config.ts中的端口配置
    echo 或者终止占用5173端口的进程
    echo.
    timeout /t 3 >nul
)

echo.
echo [4/4] 启动开发服务器...
echo ===========================================
echo 🚀 正在启动 Wendeal Dashboard...
echo.
echo 📱 服务器启动后，请在浏览器中访问：
echo    本地地址: http://localhost:5173/
echo    网络地址: http://192.168.31.222:5173/
echo.
echo ⌨️  快捷键说明：
echo    Ctrl+C: 停止服务器
echo    r: 重新启动服务器
echo    u: 显示服务器URL
echo    o: 在浏览器中打开
echo    c: 清除控制台
echo    q: 退出开发模式
echo.
echo ===========================================
echo.

call npm run dev

echo.
echo ===========================================
echo 服务器已停止
echo 如需重新启动，请再次运行此脚本
echo ===========================================
pause
