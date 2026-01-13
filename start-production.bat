@echo off
chcp 65001 >nul

echo Starting TMDB Helper...

if not exist "node_modules" (
    echo Installing dependencies...
    call pnpm install
    echo Installation completed.
)

set NEED_BUILD=0

if not exist ".next" (
    set NEED_BUILD=1
) else (
    if not exist ".next\BUILD_ID" (
        set NEED_BUILD=1
    ) else (
        for /f "tokens=1,2" %%a in ('forfiles /p ".next" /m "BUILD_ID" /c "cmd /c echo @fdate @ftime" 2^>nul') do (
            set NEXT_DATE=%%a
            set NEXT_TIME=%%b
        )
        
        for /f "tokens=1,2" %%a in ('forfiles /p "src" /s /m "*.ts" /c "cmd /c echo @fdate @ftime" 2^>nul ^| sort /r') do (
            if not defined SRC_DATE (
                set SRC_DATE=%%a
                set SRC_TIME=%%b
            )
        )
        
        if defined SRC_DATE if defined NEXT_DATE (
            if "%SRC_DATE% %SRC_TIME%" gtr "%NEXT_DATE% %NEXT_TIME%" (
                set NEED_BUILD=1
            )
        )
    )
)

if "%NEED_BUILD%"=="1" (
    echo Code changes detected, rebuilding application...
    call pnpm run build
    if errorlevel 1 (
        echo Build failed! Please check errors above.
        pause
        exit /b 1
    )
    echo Build completed.
) else (
    echo No code changes detected, skipping build.
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