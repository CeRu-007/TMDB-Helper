<div align="center">

  <img src="https://github.com/user-attachments/assets/7fabd3b5-dc7d-416f-83f8-ad79d223adc9" alt="TMDB-Helper Logo" width="200">

  # TMDB-Helper

  **功能强大的 TMDB 媒体维护助手 - 支持 Web、Electron 桌面端和 Docker 部署**

  [![Version](https://img.shields.io/badge/version 0.6.9-blue.svg)](https://github.com/CeRu-007/TMDB-Helper)
  [![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
  [![Docker](https://img.shields.io/badge/docker-supported-brightgreen.svg)](https://hub.docker.com/r/ceru007/tmdb-helper)
  [![Next.js](https://img.shields.io/badge/Next.js-15.2.6-black.svg)](https://nextjs.org/)
  [![Electron](https://img.shields.io/badge/Electron-33.4.11-9FEAF9.svg)](https://www.electronjs.org/)

  [功能特性](#-功能特性) · [快速开始](#-快速开始) · [部署指南](#-部署指南) · [贡献指南](#-贡献指南)
<img width="2489" height="1352" alt="image" src="https://github.com/user-attachments/assets/7a599a85-3a42-4d31-a4a8-6ba0569d2093" />

</div>

---

## 📖 目录

- [项目简介](#-项目简介)
- [功能特性](#-功能特性)
- [快速开始](#-快速开始)
- [部署指南](#-部署指南)
- [贡献指南](#-贡献指南)
- [许可证](#-许可证)
- [致谢](#-致谢)

---

## 🎯 项目简介

TMDB-Helper 是一个功能强大的 TMDB (The Movie Database) 维护助手，旨在帮助用户高效地管理和维护 TMDB 上的电视节目类词条。

> **注意**: 本项目完全由 AI 生成，开发过程中产生了一些冗余代码，但不影响正常使用。

---

## 🌟 功能特性

### 🎬 词条管理

- **智能导入**: 通过 TMDB API 搜索并导入连载影视信息
- **状态跟踪**: 实时追踪媒体内容的维护进度
- **独立维护**: 适用于维护已完结但未跟踪的连载影视
- **定时任务**: 自动化同步支持（一周单更、一周双更、日更）

### 🎥 影视资讯

- **即将上线**: 查看未来30天将要上线的影视内容，支持多地区数据源
- **近期开播**: 查看过去30天内刚刚开播的影视动态
- **流媒体导航**: 全球主流流媒体平台导航，支持分类筛选和自定义排序

### 🖼️ 图像处理

- **海报背景裁切**: 自动将背景图和海报裁切成符合TMDB规则的比例
- **视频缩略图提取**: 基于 AI 模型从视频文件中自动提取关键帧图片，自动排除模糊、字幕干扰等质量问题。用于快速生成分集图片，以补充TMDB-Import工具抓取不到的分集图片

### 📝 AI 分集简介生成器

- **🎨 多样化风格**: 提供 Netflix、CR、模仿等多种写作风格
- **📁 批量处理**: 支持批量上传字幕文件，一键生成多集简介
- **📤 格式导出**: 支持导出为 TMDB-Import 兼容的 CSV 格式
- **✏️ 实时编辑**: 生成后可直接在界面中编辑和优化简介内容
- **🎤 音频转写**: 从视频文件或视频URL中提取音频转写字幕生成分集简介，支持Emby、Jellyfin、Plex等服务器

> ⚠️ **使用提醒**
> - AI 生成的分集简介仅作**辅助作用**，请务必观看对应视频内容审核修改后再使用
> - **禁止直接上传至 TMDB** 等数据库平台，需要人工审核和完善
> - 常见 AI 错误包括：主语分辨困难、语句不通顺、剧情衔接错乱等，需要人工核对和修正


### 🔊 硬字幕提取

支持上传视频文件或视频URL，通过 API 调用图像识别模型提取硬字幕，并自动跳转分集简介生成器一键生成分集简介。

一集20分钟的动漫，大约消耗5次 API 调用

### 🔧 集成工具

- **TMDB-Import 集成**: 在词条详情页面进行可视化操作
- **一键更新**: 便捷的 TMDB-Import 下载、安装和更新功能
- **配置管理**: 在设置页面提供界面调节 TMDB-Import 的设置
- **CSV 编辑器**: 强大的 CSV 文件编辑和管理功能

### 🤖 模型服务

统一的 AI 模型管理系统，支持多提供商配置，为不同功能场景（分集生成、音频转写、AI 聊天、字幕 OCR 等）配置专属模型，支持自动切换和参数调整。

### 🔗 核心依赖

本项目在部分核心功能上依赖于外部开源项目 [fzlins/TMDB-Import](https://github.com/fzlins/TMDB-Import)。该项目是一个强大的 Python 脚本，用于从各种网站抓取剧集数据、导入到 TMDB 以及进行图片裁剪，极大地增强了 TMDB-Helper 在数据处理和 TMDB 交互方面的能力。

---

## 🚀 快速开始

### 一键启动（Web 版）

```bash
# 1. 下载项目源代码
git clone https://github.com/CeRu-007/TMDB-Helper.git
cd TMDB-Helper

# 2. 双击运行启动脚本
start-production.bat
```

### 桌面端下载

适合想要使用桌面应用的用户：

访问 [GitHub Releases](https://github.com/CeRu-007/TMDB-Helper/releases) 下载最新版本的安装包

---

## 📦 部署指南

### 🐳 Docker 部署（推荐）

#### 快速部署

```bash
# 使用 Docker Compose 一键部署
git clone https://github.com/CeRu-007/TMDB-Helper.git
cd TMDB-Helper
docker-compose up -d
```

#### 直接使用 Docker

```bash
# 拉取镜像
docker pull ceru007/tmdb-helper:latest

# 运行容器
docker run -d \
  --name tmdb-helper \
  -p 4949:4949 \
  -v tmdb_data:/app/data \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=your_secure_password \
  -e JWT_SECRET=your_jwt_secret_key \
  ceru007/tmdb-helper:latest
```

#### 环境变量配置

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `ADMIN_USERNAME` | `admin` | 管理员用户名 |
| `ADMIN_PASSWORD` | `change_this_password` | 管理员密码（**生产环境必须修改**） |
| `JWT_SECRET` | `your_jwt_secret_key_here_change_in_production` | JWT 密钥（**生产环境必须修改**） |
| `SESSION_EXPIRY_DAYS` | `7` | 会话有效期（天） |
| `NODE_ENV` | `production` | Node.js 环境 |
| `PORT` | `4949` | 应用端口 |
| `HOSTNAME` | `0.0.0.0` | 绑定主机 |

#### Docker Compose 配置示例

```yaml
version: '3.8'

services:
  tmdb-helper:
    image: ceru007/tmdb-helper:latest
    container_name: tmdb-helper
    ports:
      - "4949:4949"
    environment:
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=your_secure_password
      - JWT_SECRET=your_jwt_secret_key
      - SESSION_EXPIRY_DAYS=7
      - NODE_ENV=production
    volumes:
      - tmdb_data:/app/data
      - tmdb_logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4949/api/auth/init"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  tmdb_data:
  tmdb_logs:
```

### 📁 配置存储说明

**配置文件位置：**
- **容器内**: `/app/data/server-config.json`
- **开发环境**: `./data/server-config.json`
- **Docker 绑定挂载**: `./data/server-config.json`（相对于 docker-compose.yml）

**存储方式：**
1. **Docker 命名卷**（推荐）：由 Docker 管理，自动处理权限
2. **绑定挂载**：直接映射到宿主机目录，便于访问配置文件

**自动迁移：**
应用启动时会自动从 localStorage 迁移配置到服务端存储，确保升级平滑。

---

## 🤝 贡献指南

我们欢迎并鼓励社区对 TMDB-Helper 项目做出贡献！

### 如何贡献

1. **Fork** 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 **Pull Request**

### 贡献方式

- 🐛 **Bug 报告**: 发现问题请提交 Issue
- 💡 **功能建议**: 有好的想法请分享给我们
- 🔧 **代码贡献**: 提交 Pull Request 改进项目
- 📖 **文档完善**: 帮助改进文档和使用指南

---

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

---

## 🙏 致谢

感谢 [fzlins/TMDB-Import](https://github.com/fzlins/TMDB-Import) 项目的支持
