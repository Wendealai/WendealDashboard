@echo off
setlocal enabledelayedexpansion
title WendealDashboard - Development with Webhook

:: Change to script directory
cd /d "%~dp0"

:: Enable error handling
set "ERROR_OCCURRED=0"

echo.
echo ============================================
echo   WendealDashboard Development + Webhook
echo ============================================
echo Current Directory: %CD%
echo.

:: Function to handle errors
:handle_error
set "ERROR_OCCURRED=1"
echo.
echo *** ERROR OCCURRED ***
echo %~1
echo.
echo Press any key to exit...
pause >nul
exit /b 1

:: Check Node.js
echo [1/4] Checking Node.js...
node --version >nul 2>&1
if !errorlevel! neq 0 (
    call :handle_error "Node.js not found. Please visit https://nodejs.org to download and install Node.js"
)
for /f "tokens=*" %%i in ('node --version 2^>nul') do set "NODE_VERSION=%%i"
echo Node.js: !NODE_VERSION!

:: Check npm
echo [2/4] Checking npm...
call npm --version >nul 2>&1
if !errorlevel! neq 0 (
    call :handle_error "npm not found. Please reinstall Node.js"
)
for /f "tokens=*" %%i in ('call npm --version 2^>nul') do set "NPM_VERSION=%%i"
echo npm: !NPM_VERSION!

:: Check and install dependencies
echo [3/4] Checking project dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    echo This may take a few minutes...
    echo.
    call npm install
    if !errorlevel! neq 0 (
        call :handle_error "Dependency installation failed. Check your internet connection and try again."
    )
    echo Dependencies installed successfully
) else (
    echo Dependencies already exist
)

:: Check package.json
if not exist "package.json" (
    call :handle_error "package.json not found. Make sure you're in the correct project directory."
)

:: Check environment file
echo [4/4] Checking environment configuration...
if not exist ".env" (
    if exist ".env.example" (
        echo Copying environment template...
        copy ".env.example" ".env" >nul 2>&1
        if !errorlevel! equ 0 (
            echo .env file created successfully
            echo Please modify configuration as needed
        ) else (
            echo Warning: Could not create .env file
        )
    ) else (
        echo Warning: .env.example not found
        echo Some features may not work properly
    )
) else (
    echo Environment configuration file exists
)

echo.
echo ============================================
echo     Starting Development + Webhook Services
echo ============================================
echo.
echo This will start both services:
echo - Development server: http://localhost:5173
echo - Webhook server: http://localhost:3001
echo.
echo Network access:
echo - Development: http://[your-ip]:5173
echo - Webhook: http://[your-ip]:3001
echo.
echo Press Ctrl+C to stop both servers
echo To close this window, stop the servers first
echo.
echo ============================================
echo.

:: Check if dev:with-webhook script exists
call npm run dev:with-webhook --silent >nul 2>&1
if !errorlevel! neq 0 (
    echo Warning: dev:with-webhook script not found in package.json
    echo.
    echo Available alternatives:
    echo 1. Start development server only (npm run dev)
    echo 2. Start webhook server only (npm run webhook)
    echo.
    set /p "CHOICE=Choose option (1 or 2), or press Enter to exit: "
    
    if "!CHOICE!"=="1" (
        echo Starting development server only...
        call npm run dev
    ) else if "!CHOICE!"=="2" (
        echo Starting webhook server only...
        call npm run webhook
    ) else (
        echo Exiting...
        echo.
        echo Press any key to exit...
        pause >nul
        exit /b 0
    )
) else (
    :: Start both development server and webhook
    echo Starting development server with webhook...
    call npm run dev:with-webhook
)

set "DEV_EXIT_CODE=!errorlevel!"

echo.
echo ============================================
echo     Services Stopped
echo ============================================
echo Exit code: !DEV_EXIT_CODE!

if !DEV_EXIT_CODE! neq 0 (
    echo.
    echo Services stopped with an error.
    echo Check the error messages above for details.
    echo.
    echo Common solutions:
    echo - Make sure ports 5173 and 3001 are not already in use
    echo - Check if all dependencies are properly installed
    echo - Verify your project configuration
    echo - Check webhook configuration in .env file
    echo.
)

echo.
echo Press any key to exit...
pause >nul