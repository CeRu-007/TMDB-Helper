@echo off
:: 设置代码页为UTF-8
chcp 65001 > nul
echo ===================================
echo  CSV快速修复工具 (仅使用PowerShell)
echo ===================================
echo 开始时间: %time%

:: 获取CSV文件路径
set CSV_PATH=%~dp0..\import.csv

:: 检查文件是否存在
if not exist "%CSV_PATH%" (
    echo 错误: 未找到CSV文件 %CSV_PATH%
    pause
    exit /b 1
)

echo CSV文件: %CSV_PATH%
echo.

echo 正在使用PowerShell修复CSV文件...
echo.

:: 直接使用PowerShell执行修复
powershell -Command "$content = Get-Content -Path '%CSV_PATH%' -Raw; $newContent = $content -replace '(\d+,[^,]+,[^,]+,\d+),https://(.*?),(.*)', '$1,,https://$2$3'; if ($newContent -ne $content) { $newContent | Set-Content -Path '%CSV_PATH%' -Force; Write-Host '文件已修复！' -ForegroundColor Green } else { Write-Host '未发现问题，无需修复' -ForegroundColor Cyan }"

echo.
echo =================================
echo    处理完成！
echo    完成时间: %time%
echo =================================
echo.
echo 按任意键退出...
pause >nul 