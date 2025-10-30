@echo off
setlocal enabledelayedexpansion
title WendealDashboard - Production Build

:: Change to script directory
cd /d "%~dp0"

:: Enable error handling
set "ERROR_OCCURRED=0"

echo.
echo ============================================
echo     WendealDashboard Production Builder
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
echo [1/5] Checking Node.js...
node --version >nul 2>&1
if !errorlevel! neq 0 (
    call :handle_error "Node.js not found. Please visit https://nodejs.org to download and install Node.js"
)
for /f "tokens=*" %%i in ('node --version 2^>nul') do set "NODE_VERSION=%%i"
echo Node.js: !NODE_VERSION!

:: Check npm
echo [2/5] Checking npm...
call npm --version >nul 2>&1
if !errorlevel! neq 0 (
    call :handle_error "npm not found. Please reinstall Node.js"
)
for /f "tokens=*" %%i in ('call npm --version 2^>nul') do set "NPM_VERSION=%%i"
echo npm: !NPM_VERSION!

:: Check and install dependencies
echo [3/5] Checking project dependencies...
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

:: Run code quality checks
echo [4/5] Running code quality checks...
echo Running ESLint...
call npm run lint
set "LINT_EXIT_CODE=!errorlevel!"
if !LINT_EXIT_CODE! neq 0 (
    echo.
    echo ESLint found issues in your code.
    echo.
    set /p "CONTINUE=Do you want to continue with the build anyway? (y/N): "
    if /i "!CONTINUE!" neq "y" (
        echo Build cancelled by user.
        echo.
        echo Press any key to exit...
        pause >nul
        exit /b 1
    )
    echo Continuing with build despite linting warnings...
)

:: Clean up old build files
echo [5/5] Preparing build environment...
if exist "dist" (
    echo Cleaning up old build files...
    rmdir /s /q "dist" 2>nul
    if exist "dist" (
        echo Warning: Could not completely clean old build files
    ) else (
        echo Old build files cleaned successfully
    )
)

echo.
echo ============================================
echo     Building Production Version
echo ============================================
echo.
echo This may take a few minutes...
echo.

:: Build the project
echo Starting production build...
call npm run build
set "BUILD_EXIT_CODE=!errorlevel!"

if !BUILD_EXIT_CODE! neq 0 (
    echo.
    echo ============================================
    echo     Build Failed
    echo ============================================
    echo.
    echo Build process failed with exit code: !BUILD_EXIT_CODE!
    echo Check the error messages above for details.
    echo.
    echo Common solutions:
    echo - Fix any TypeScript compilation errors
    echo - Resolve missing dependencies
    echo - Check your project configuration
    echo.
    echo Press any key to exit...
    pause >nul
    exit /b !BUILD_EXIT_CODE!
)

echo.
echo ============================================
echo     Build Completed Successfully
echo ============================================
echo.

:: Check if dist folder was created
if not exist "dist" (
    call :handle_error "Build completed but dist folder was not created. Check build configuration."
)

echo Build files location: %CD%\dist
echo.
echo Starting preview server...
echo.
echo Preview server: http://localhost:4173
echo Network access: http://[your-ip]:4173
echo.
echo Press Ctrl+C to stop the preview server
echo To close this window, stop the server first
echo.
echo ============================================
echo.

:: Start preview server
call npm run preview
set "PREVIEW_EXIT_CODE=!errorlevel!"

echo.
echo ============================================
echo     Preview Server Stopped
echo ============================================
echo Exit code: !PREVIEW_EXIT_CODE!

if !PREVIEW_EXIT_CODE! neq 0 (
    echo.
    echo Preview server stopped with an error.
    echo Check the error messages above for details.
    echo.
    echo Common solutions:
    echo - Make sure port 4173 is not already in use
    echo - Verify the build files in dist folder
    echo - Check preview server configuration
    echo.
)

echo.
echo Build files are available in: %CD%\dist
echo You can deploy these files to your web server.
echo.
echo Press any key to exit...
pause >nul