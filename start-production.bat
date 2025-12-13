@echo off
chcp 65001 >nul

echo Starting TMDB Helper...

if not exist "node_modules" (
    echo Installing dependencies...
    call pnpm install
    echo Installation completed.
)

if not exist ".next" (
    echo Building application...
    call pnpm run build
    echo Build completed.
)

echo Starting server...
echo Server logs will appear below:
echo.

start http://localhost:3000
echo Browser opened.
echo.
echo Press Ctrl+C to stop the server, or close this window.
echo.

call pnpm run start

echo.
echo Server stopped.
pause