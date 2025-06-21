@echo off
:: 设置代码页为UTF-8
chcp 65001 > nul
echo ===================================
echo  CSV格式修复工具 - 简化版
echo ===================================
echo 开始时间: %time%

:: 获取脚本和import.csv的完整路径
set SCRIPT_PATH=%~dp0fix-csv-format.js
set CSV_PATH=%~dp0..\import.csv

:: 检查文件是否存在
if not exist "%SCRIPT_PATH%" (
    echo 错误: 未找到修复脚本 %SCRIPT_PATH%
    pause
    exit /b 1
)

if not exist "%CSV_PATH%" (
    echo 错误: 未找到CSV文件 %CSV_PATH%
    pause
    exit /b 1
)

:: 显示文件信息
echo 修复脚本: %SCRIPT_PATH%
echo CSV文件: %CSV_PATH%
echo.

echo 正在修复CSV文件...
echo.

:: 执行Node.js脚本
node "%SCRIPT_PATH%" "%CSV_PATH%"
if %errorlevel% equ 0 (
    echo.
    echo =================================
    echo    CSV文件修复完成!
    echo    完成时间: %time%
    echo =================================
) else (
    echo.
    echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    echo    CSV文件修复失败!
    echo    请检查上方错误信息
    echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

    :: 尝试直接修复
    echo.
    echo 尝试使用PowerShell直接修复文件...
    powershell -Command "$content = Get-Content -Path '%CSV_PATH%' -Raw; $content -replace '(\d+,[^,]+,[^,]+,\d+),https://(.*?),(.*)', '$1,,https://$2$3' | Set-Content -Path '%CSV_PATH%' -Force"
)

echo.
echo 按任意键退出...
pause >nul 