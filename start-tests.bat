@echo off
setlocal enabledelayedexpansion
title WendealDashboard - Test Runner

:: Change to script directory
cd /d "%~dp0"

:: Enable error handling
set "ERROR_OCCURRED=0"

echo.
echo ============================================
echo     WendealDashboard Test Runner
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
echo [1/3] Checking Node.js...
node --version >nul 2>&1
if !errorlevel! neq 0 (
    call :handle_error "Node.js not found. Please visit https://nodejs.org to download and install Node.js"
)
for /f "tokens=*" %%i in ('node --version 2^>nul') do set "NODE_VERSION=%%i"
echo Node.js: !NODE_VERSION!

:: Check npm
echo [2/3] Checking npm...
call npm --version >nul 2>&1
if !errorlevel! neq 0 (
    call :handle_error "npm not found. Please reinstall Node.js"
)
for /f "tokens=*" %%i in ('call npm --version 2^>nul') do set "NPM_VERSION=%%i"
echo npm: !NPM_VERSION!

:: Check and install dependencies
echo [3/3] Checking project dependencies...
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

:menu
echo.
echo ============================================
echo     Test Options Menu
echo ============================================
echo.
echo Please select a test option:
echo.
echo 1. Run all tests
echo 2. Run unit tests only
echo 3. Run integration tests
echo 4. Run E2E tests
echo 5. Generate coverage report
echo 6. Run tests in watch mode
echo 7. Update test snapshots
echo 8. Run specific test file
echo 9. Exit
echo.
set /p "choice=Enter your choice (1-9): "

:: Validate input
if "!choice!"=="" goto invalid_choice
if "!choice!"=="1" goto run_all_tests
if "!choice!"=="2" goto run_unit_tests
if "!choice!"=="3" goto run_integration_tests
if "!choice!"=="4" goto run_e2e_tests
if "!choice!"=="5" goto run_coverage
if "!choice!"=="6" goto run_watch
if "!choice!"=="7" goto update_snapshots
if "!choice!"=="8" goto run_specific_test
if "!choice!"=="9" goto exit_script

:invalid_choice
echo.
echo Invalid choice. Please enter a number between 1-9.
echo.
pause
goto menu

:run_all_tests
echo.
echo ============================================
echo     Running All Tests
echo ============================================
echo.
call npm test
set "TEST_EXIT_CODE=!errorlevel!"
goto test_completed

:run_unit_tests
echo.
echo ============================================
echo     Running Unit Tests
echo ============================================
echo.
call npm run test:unit
set "TEST_EXIT_CODE=!errorlevel!"
goto test_completed

:run_integration_tests
echo.
echo ============================================
echo     Running Integration Tests
echo ============================================
echo.
call npm run test:integration
set "TEST_EXIT_CODE=!errorlevel!"
goto test_completed

:run_e2e_tests
echo.
echo ============================================
echo     Running E2E Tests
echo ============================================
echo.
call npm run test:e2e
set "TEST_EXIT_CODE=!errorlevel!"
goto test_completed

:run_coverage
echo.
echo ============================================
echo     Generating Coverage Report
echo ============================================
echo.
call npm run test:coverage
set "TEST_EXIT_CODE=!errorlevel!"
if !TEST_EXIT_CODE! equ 0 (
    echo.
    echo Coverage report generated successfully!
    if exist "coverage\index.html" (
        echo Coverage report location: %CD%\coverage\index.html
        echo You can open this file in your browser to view the report.
    )
)
goto test_completed

:run_watch
echo.
echo ============================================
echo     Running Tests in Watch Mode
echo ============================================
echo.
echo Tests will re-run automatically when files change.
echo Press 'q' to quit watch mode.
echo.
call npm run test:watch
set "TEST_EXIT_CODE=!errorlevel!"
goto test_completed

:update_snapshots
echo.
echo ============================================
echo     Updating Test Snapshots
echo ============================================
echo.
echo This will update all test snapshots.
set /p "confirm=Are you sure? (y/N): "
if /i "!confirm!" neq "y" (
    echo Snapshot update cancelled.
    goto menu
)
call npm run test:update-snapshots
set "TEST_EXIT_CODE=!errorlevel!"
goto test_completed

:run_specific_test
echo.
echo ============================================
echo     Run Specific Test File
echo ============================================
echo.
echo Enter the test file path (relative to project root):
echo Example: src/components/Button.test.tsx
echo.
set /p "test_file=Test file path: "
if "!test_file!"=="" (
    echo No test file specified.
    goto menu
)
echo.
echo Running test file: !test_file!
echo.
call npm test -- "!test_file!"
set "TEST_EXIT_CODE=!errorlevel!"
goto test_completed

:test_completed
echo.
echo ============================================
echo     Test Execution Completed
echo ============================================
echo Exit code: !TEST_EXIT_CODE!

if !TEST_EXIT_CODE! neq 0 (
    echo.
    echo Tests completed with errors or failures.
    echo Check the output above for details.
    echo.
    echo Common solutions:
    echo - Fix failing test cases
    echo - Update test dependencies
    echo - Check test configuration
    echo - Verify test environment setup
    echo.
) else (
    echo.
    echo All tests passed successfully!
    echo.
)

echo.
set /p "continue=Do you want to run more tests? (y/N): "
if /i "!continue!"=="y" goto menu

:exit_script
echo.
echo Exiting test runner...
echo.
echo Press any key to exit...
pause >nul
exit /b 0