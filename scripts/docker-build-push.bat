@echo off
setlocal enabledelayedexpansion

REM TMDB Helper Docker 构建和推送脚本 (Windows)
REM 用法: scripts\docker-build-push.bat [版本标签]
REM 示例: scripts\docker-build-push.bat v1.0.0
REM       scripts\docker-build-push.bat latest

REM 配置
set DOCKER_USERNAME=ceru007
set IMAGE_NAME=tmdb-helper
set FULL_IMAGE_NAME=%DOCKER_USERNAME%/%IMAGE_NAME%

REM 获取版本标签，默认为 latest
if "%1"=="" (
    set TAG=latest
) else if "%1"=="-h" (
    goto :show_help
) else if "%1"=="--help" (
    goto :show_help
) else (
    set TAG=%1
)

echo.
echo [INFO] 开始 TMDB Helper Docker 构建和推送流程
echo [INFO] 版本标签: %TAG%
echo [INFO] 完整镜像名: %FULL_IMAGE_NAME%:%TAG%
echo.

REM 确认操作
set /p confirm="是否继续? (y/N): "
if /i not "%confirm%"=="y" (
    echo [INFO] 操作已取消
    exit /b 0
)

REM 检查 Docker 环境
call :check_docker
if errorlevel 1 exit /b 1

REM 检查 Docker 登录状态
call :check_docker_login
if errorlevel 1 exit /b 1

REM 构建镜像
call :build_image %TAG%
if errorlevel 1 exit /b 1

REM 推送镜像
call :push_image %TAG%
if errorlevel 1 exit /b 1

REM 显示镜像信息
call :show_image_info %TAG%

echo.
echo [SUCCESS] 所有操作完成！
exit /b 0

REM ==================== 函数定义 ====================

:show_help
echo TMDB Helper Docker 构建和推送脚本 (Windows)
echo.
echo 用法:
echo   %~nx0 [版本标签]
echo.
echo 参数:
echo   版本标签    Docker 镜像的版本标签 (默认: latest)
echo.
echo 示例:
echo   %~nx0                # 构建并推送 latest 版本
echo   %~nx0 v1.0.0        # 构建并推送 v1.0.0 版本
echo   %~nx0 dev           # 构建并推送 dev 版本
echo.
echo 环境要求:
echo   - Docker Desktop 已安装并运行
echo   - 已登录 Docker Hub (docker login)
echo.
exit /b 0

:check_docker
echo [INFO] 检查 Docker 环境...

REM 检查 Docker 是否安装
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker 未安装，请先安装 Docker Desktop
    exit /b 1
)

REM 检查 Docker 是否运行
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker 未运行，请启动 Docker Desktop
    exit /b 1
)

echo [SUCCESS] Docker 环境检查通过
exit /b 0

:check_docker_login
echo [INFO] 检查 Docker Hub 登录状态...

REM 简单检查是否能访问 Docker Hub
docker info | findstr /C:"Username" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] 未登录 Docker Hub，请先登录
    echo [INFO] 运行: docker login
    set /p login_now="是否现在登录? (y/N): "
    if /i "!login_now!"=="y" (
        docker login
        if errorlevel 1 (
            echo [ERROR] Docker Hub 登录失败
            exit /b 1
        )
    ) else (
        echo [ERROR] 需要登录 Docker Hub 才能推送镜像
        exit /b 1
    )
)

echo [SUCCESS] Docker Hub 登录状态检查通过
exit /b 0

:build_image
set build_tag=%1
set image_tag=%FULL_IMAGE_NAME%:%build_tag%

echo [INFO] 开始构建 Docker 镜像: %image_tag%

REM 检查 Dockerfile 是否存在
if not exist "Dockerfile" (
    echo [ERROR] Dockerfile 不存在，请确保在项目根目录运行此脚本
    exit /b 1
)

REM 构建镜像
docker build -t "%image_tag%" .
if errorlevel 1 (
    echo [ERROR] 镜像构建失败
    exit /b 1
)

echo [SUCCESS] 镜像构建成功: %image_tag%

REM 如果不是 latest 标签，同时打上 latest 标签
if not "%build_tag%"=="latest" (
    echo [INFO] 同时创建 latest 标签...
    docker tag "%image_tag%" "%FULL_IMAGE_NAME%:latest"
    if errorlevel 1 (
        echo [ERROR] latest 标签创建失败
        exit /b 1
    )
    echo [SUCCESS] latest 标签创建成功
)

exit /b 0

:push_image
set push_tag=%1
set image_tag=%FULL_IMAGE_NAME%:%push_tag%

echo [INFO] 开始推送 Docker 镜像: %image_tag%

docker push "%image_tag%"
if errorlevel 1 (
    echo [ERROR] 镜像推送失败
    exit /b 1
)

echo [SUCCESS] 镜像推送成功: %image_tag%

REM 如果不是 latest 标签，同时推送 latest 标签
if not "%push_tag%"=="latest" (
    echo [INFO] 推送 latest 标签...
    docker push "%FULL_IMAGE_NAME%:latest"
    if errorlevel 1 (
        echo [ERROR] latest 标签推送失败
        exit /b 1
    )
    echo [SUCCESS] latest 标签推送成功
)

exit /b 0

:show_image_info
set info_tag=%1
set image_tag=%FULL_IMAGE_NAME%:%info_tag%

echo.
echo [INFO] 镜像信息:
echo   镜像名称: %image_tag%

REM 获取镜像大小和创建时间
for /f "tokens=*" %%i in ('docker images --format "{{.Size}}" %image_tag%') do set image_size=%%i
for /f "tokens=*" %%i in ('docker images --format "{{.CreatedAt}}" %image_tag%') do set image_created=%%i

echo   镜像大小: %image_size%
echo   创建时间: %image_created%
echo.
echo [INFO] 使用方法:
echo   docker pull %image_tag%
echo   docker run -p 4949:4949 %image_tag%
echo.
echo [INFO] Docker Compose 使用:
echo   在 docker-compose.yml 中使用: image: %image_tag%
echo.

exit /b 0
