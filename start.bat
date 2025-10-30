@echo off
title WendealDashboard - Development Environment
cd /d "%~dp0"

echo.
echo ============================================
echo     WendealDashboard Development Launcher
echo ============================================
echo Current Directory: %CD%
echo.

:: Check Node.js
echo [1/4] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: Node.js not found
    echo Please visit https://nodejs.org to download and install Node.js
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo Node.js: %%i
echo Node.js is available

:: Check npm
echo [2/4] Checking npm...
call npm --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo ERROR: npm not found
    echo Please reinstall Node.js
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('call npm --version') do echo npm: %%i
echo npm is available

:: Check and install dependencies
echo [3/4] Checking project dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    echo This may take a few minutes...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo ERROR: Dependency installation failed
        echo Check your internet connection and try again
        echo.
        pause
        exit /b 1
    )
    echo Dependencies installed successfully
) else (
    echo Dependencies already exist
)

:: Check package.json
if not exist "package.json" (
    echo.
    echo ERROR: package.json not found
    echo Make sure you're in the correct project directory
    echo.
    pause
    exit /b 1
)

:: Check environment file
echo [4/4] Checking environment configuration...
if not exist ".env" (
    if exist ".env.example" (
        echo Copying environment template...
        copy ".env.example" ".env" >nul
        echo .env file created successfully
    ) else (
        echo Warning: .env.example not found
    )
) else (
    echo Environment configuration file exists
)

echo.
echo ============================================
echo     Starting Development Server
echo ============================================
echo.
echo Development server will start at: http://localhost:5173
echo.
echo Press Ctrl+C to stop the server
echo.

:: Start development server
call npm run dev

echo.
echo ============================================
echo     Development Server Stopped
echo ============================================
echo.
pause