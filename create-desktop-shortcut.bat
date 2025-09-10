@echo off
echo ===========================================
echo   创建桌面快捷方式 - Wendeal Dashboard
echo ===========================================
echo.

set "DESKTOP=%USERPROFILE%\Desktop"
set "PROJECT_PATH=%~dp0"
set "SCRIPT_NAME=start-project.bat"
set "SHORTCUT_NAME=Wendeal Dashboard.lnk"

echo 正在创建桌面快捷方式...
echo 项目路径: %PROJECT_PATH%
echo 脚本文件: %SCRIPT_NAME%
echo 快捷方式: %DESKTOP%\%SHORTCUT_NAME%
echo.

:: 使用PowerShell创建快捷方式
powershell -Command "
$WshShell = New-Object -comObject WScript.Shell;
$Shortcut = $WshShell.CreateShortcut('%DESKTOP%\%SHORTCUT_NAME%');
$Shortcut.TargetPath = '%PROJECT_PATH%%SCRIPT_NAME%';
$Shortcut.WorkingDirectory = '%PROJECT_PATH%';
$Shortcut.Description = '启动 Wendeal Dashboard 开发服务器';
$Shortcut.IconLocation = '%%SystemRoot%%\System32\SHELL32.dll,13';
$Shortcut.Save();
"

if %errorlevel% equ 0 (
    echo ✅ 桌面快捷方式创建成功！
    echo.
    echo 现在您可以：
    echo 1. 双击桌面上的 "Wendeal Dashboard" 快捷方式
    echo 2. 或者双击项目根目录的 start-project.bat 文件
    echo.
    echo 快捷方式位置: %DESKTOP%\%SHORTCUT_NAME%
) else (
    echo ❌ 快捷方式创建失败
    echo 请手动创建快捷方式指向: %PROJECT_PATH%%SCRIPT_NAME%
)

echo.
pause




