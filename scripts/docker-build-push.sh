#!/bin/bash

# TMDB Helper Docker 构建和推送脚本
# 用法: ./scripts/docker-build-push.sh [版本标签]
# 示例: ./scripts/docker-build-push.sh v1.0.0
#       ./scripts/docker-build-push.sh latest

set -e  # 遇到错误立即退出

# 配置
DOCKER_USERNAME="ceru007"
IMAGE_NAME="tmdb-helper"
FULL_IMAGE_NAME="${DOCKER_USERNAME}/${IMAGE_NAME}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    echo "TMDB Helper Docker 构建和推送脚本"
    echo ""
    echo "用法:"
    echo "  $0 [版本标签]"
    echo ""
    echo "参数:"
    echo "  版本标签    Docker 镜像的版本标签 (默认: latest)"
    echo ""
    echo "示例:"
    echo "  $0                # 构建并推送 latest 版本"
    echo "  $0 v1.0.0        # 构建并推送 v1.0.0 版本"
    echo "  $0 dev           # 构建并推送 dev 版本"
    echo ""
    echo "环境要求:"
    echo "  - Docker 已安装并运行"
    echo "  - 已登录 Docker Hub (docker login)"
    echo ""
}

# 检查 Docker 是否安装和运行
check_docker() {
    print_info "检查 Docker 环境..."
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker 未运行，请启动 Docker"
        exit 1
    fi
    
    print_success "Docker 环境检查通过"
}

# 检查 Docker 登录状态
check_docker_login() {
    print_info "检查 Docker Hub 登录状态..."
    
    if ! docker info | grep -q "Username"; then
        print_warning "未登录 Docker Hub，请先登录"
        print_info "运行: docker login"
        read -p "是否现在登录? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker login
        else
            print_error "需要登录 Docker Hub 才能推送镜像"
            exit 1
        fi
    fi
    
    print_success "Docker Hub 登录状态检查通过"
}

# 构建 Docker 镜像
build_image() {
    local tag=$1
    local image_tag="${FULL_IMAGE_NAME}:${tag}"
    
    print_info "开始构建 Docker 镜像: ${image_tag}"
    
    # 检查 Dockerfile 是否存在
    if [ ! -f "Dockerfile" ]; then
        print_error "Dockerfile 不存在，请确保在项目根目录运行此脚本"
        exit 1
    fi
    
    # 构建镜像
    if docker build -t "${image_tag}" .; then
        print_success "镜像构建成功: ${image_tag}"
        
        # 如果不是 latest 标签，同时打上 latest 标签
        if [ "${tag}" != "latest" ]; then
            print_info "同时创建 latest 标签..."
            docker tag "${image_tag}" "${FULL_IMAGE_NAME}:latest"
            print_success "latest 标签创建成功"
        fi
    else
        print_error "镜像构建失败"
        exit 1
    fi
}

# 推送 Docker 镜像
push_image() {
    local tag=$1
    local image_tag="${FULL_IMAGE_NAME}:${tag}"
    
    print_info "开始推送 Docker 镜像: ${image_tag}"
    
    if docker push "${image_tag}"; then
        print_success "镜像推送成功: ${image_tag}"
        
        # 如果不是 latest 标签，同时推送 latest 标签
        if [ "${tag}" != "latest" ]; then
            print_info "推送 latest 标签..."
            if docker push "${FULL_IMAGE_NAME}:latest"; then
                print_success "latest 标签推送成功"
            else
                print_error "latest 标签推送失败"
                exit 1
            fi
        fi
    else
        print_error "镜像推送失败"
        exit 1
    fi
}

# 显示镜像信息
show_image_info() {
    local tag=$1
    local image_tag="${FULL_IMAGE_NAME}:${tag}"
    
    print_info "镜像信息:"
    echo "  镜像名称: ${image_tag}"
    echo "  镜像大小: $(docker images --format "table {{.Size}}" ${image_tag} | tail -n 1)"
    echo "  创建时间: $(docker images --format "table {{.CreatedAt}}" ${image_tag} | tail -n 1)"
    echo ""
    print_info "使用方法:"
    echo "  docker pull ${image_tag}"
    echo "  docker run -p 4949:4949 ${image_tag}"
    echo ""
    print_info "Docker Compose 使用:"
    echo "  在 docker-compose.yml 中使用: image: ${image_tag}"
}

# 主函数
main() {
    # 解析命令行参数
    if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
        show_help
        exit 0
    fi
    
    # 获取版本标签，默认为 latest
    TAG=${1:-latest}
    
    print_info "开始 TMDB Helper Docker 构建和推送流程"
    print_info "版本标签: ${TAG}"
    print_info "完整镜像名: ${FULL_IMAGE_NAME}:${TAG}"
    echo ""
    
    # 确认操作
    read -p "是否继续? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "操作已取消"
        exit 0
    fi
    
    # 执行检查和构建流程
    check_docker
    check_docker_login
    build_image "${TAG}"
    push_image "${TAG}"
    show_image_info "${TAG}"
    
    print_success "所有操作完成！"
}

# 错误处理
trap 'print_error "脚本执行过程中发生错误，退出码: $?"' ERR

# 运行主函数
main "$@"
