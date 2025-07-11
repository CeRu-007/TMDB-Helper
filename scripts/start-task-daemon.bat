@echo off
chcp 65001 >nul
echo 启动定时任务守护进程...
echo.

REM 检查Node.js是否安装
node --version >nul 2>&1
if errorlevel 1 (
    echo 错误: 未找到Node.js，请先安装Node.js
    pause
    exit /b 1
)

REM 获取当前脚本所在目录
set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR%..

echo 项目目录: %PROJECT_DIR%
echo 守护进程脚本: %SCRIPT_DIR%task-scheduler-daemon.js
echo.

REM 切换到项目目录
cd /d "%PROJECT_DIR%"

REM 检查守护进程脚本是否存在
if not exist "%SCRIPT_DIR%task-scheduler-daemon.js" (
    echo 错误: 找不到守护进程脚本文件
    pause
    exit /b 1
)

echo 正在启动定时任务守护进程...
echo 守护进程将每10分钟检查一次错过的任务
echo 按 Ctrl+C 可以停止守护进程
echo.

REM 启动守护进程，默认端口3000，检查间隔600秒(10分钟)
node "%SCRIPT_DIR%task-scheduler-daemon.js" --port=3000 --interval=600

echo.
echo 守护进程已停止
pause
