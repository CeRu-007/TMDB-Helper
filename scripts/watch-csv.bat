@echo off
:: 设置代码页为UTF-8
chcp 65001 > nul
echo ===================================
echo  CSV文件监视工具 - 简化版
echo ===================================

:: 获取脚本和import.csv的完整路径
set SCRIPT_PATH=%~dp0fix-csv-format.js
set CSV_PATH=%~dp0..\import.csv

:: 检查文件是否存在
if not exist "%SCRIPT_PATH%" (
    echo 错误: 未找到修复脚本 %SCRIPT_PATH%
    pause
    exit /b 1
)

echo 监视文件: %CSV_PATH%
echo 开始时间: %time%
echo.
echo === 监视已启动 ===
echo 文件变化将自动修复
echo 按Ctrl+C停止
echo.

:: 执行Node.js脚本，监视模式
node "%SCRIPT_PATH%" "%CSV_PATH%" --watch

:: 如果脚本意外退出
echo 监视已结束
pause 