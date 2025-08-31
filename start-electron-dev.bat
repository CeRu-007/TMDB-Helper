@echo off
echo 🚀 启动TMDB Helper桌面应用（开发模式）
echo.

REM 设置环境变量
set NODE_ENV=development
set ELECTRON_IS_DEV=1

echo 📋 环境变量设置:
echo NODE_ENV=%NODE_ENV%
echo ELECTRON_IS_DEV=%ELECTRON_IS_DEV%
echo.

echo 🌐 启动Next.js开发服务器...
start /B pnpm run dev

echo ⏳ 等待服务器启动...
timeout /t 3 /nobreak >nul

echo 🖥️ 启动Electron应用...
pnpm run electron:dev

pause