<img src="https://github.com/user-attachments/assets/7fabd3b5-dc7d-416f-83f8-ad79d223adc9" alt="TMDB-Helper Logo" width="300">

[![Version](https://img.shields.io/badge/version-0.4.0-blue.svg)](https://github.com/CeRu-007/TMDB-Helper)
[![Docker](https://img.shields.io/badge/docker-supported-brightgreen.svg)](https://hub.docker.com/r/ceru007/tmdb-helper)
[![TMDB-Import](https://img.shields.io/badge/dependency-TMDB--Import-blue.svg)](https://github.com/fzlins/TMDB-Import)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

## 简介
本项目完全由AI生成，AI写的过程中产生了些许冗余代码，但目前并未影响使用。
TMDB-Helper 旨在帮助用户高效地管理和维护 TMDB (The Movie Database) 上的电视剧词条。它提供了一个直观的用户界面，用户可以轻松追踪媒体内容的维护进度。

<img width="2489" height="1367" alt="image" src="https://github.com/user-attachments/assets/7dae1a8f-b7a8-4549-b944-fe1324accb92" />


## 主要特性

### 🎬 核心功能
-   **词条维护**：通过 TMDB API 进行搜索导入连载影视信息并跟踪维护状态。
-   **独立维护**：适用于维护已完结但未跟踪的连载影视。
-   **定时任务**：设置自动化任务，支持定期同步一周单更、一周双更、日更的影视。

### 🎥 影视资讯
-   **即将上线**：查看未来30天将要上线的影视内容，支持多地区数据源。
-   **近期开播**：查看过去30天内刚刚开播的影视动态，及时了解最新内容。
-   **流媒体导航**：全球主流流媒体平台导航，支持分类筛选和自定义排序。

### 🖼️ 图像处理
-   **本地视频缩略图提取**：自动识别并排除字幕区域进行裁剪出缩略图。
-   **智能图片裁切**：支持16:9比例的自动裁切和手动调整。

### 🔧 集成工具
-   **集成TMDB-Import**：在词条详情页面进行可视化操作。
-   **TMDB-Import更新**：一键下载、安装和更新TMDB-Import工具。
-   **config.ini文件快捷设置**：在设置页面提供界面调节TMDB-Import的设置。

### 📝 AI 分集简介生成器

- **🤖 多模型支持**: 支持 DeepSeek-R1、Qwen2.5 等多种 AI 模型。
- **🎨 多样化风格**: 提供Netflix、CR、官方、文艺、悬疑、幽默、模仿等多种写作风格。
- **📁 批量处理**: 支持批量上传字幕文件，一键生成多集简介。
- **📤 格式导出**: 支持导出为 TMDB-Import 兼容的 CSV 格式。
- **✏️ 实时编辑**: 生成后可直接在界面中编辑和优化简介内容。

#### ⚠️ 使用提醒
- AI 生成的分集简介仅作**辅助作用**，请务必观看对应视频内容审核修改后再使用。
- **禁止直接上传至 TMDB** 等数据库平台，需要人工审核和完善

#### ⚠️ AI常见错误
- AI单纯从字幕中有时很难分辨主语，需要人工进行核对。
- AI生成后出现语句不通顺、卡词、读起来拗口的情况。
- AI理解出错，导致剧情衔接错乱，例如先发生的事件出现在后文。后发生的事件出现在开头。


## 核心依赖

本项目在部分核心功能上依赖于外部开源项目 [fzlins/TMDB-Import](https://github.com/fzlins/TMDB-Import)。该项目是一个强大的 Python 脚本，用于从各种网站抓取剧集数据、导入到 TMDB 以及进行图片裁剪，极大地增强了 TMDB-Helper 在数据处理和 TMDB 交互方面的能力。

## 安装与运行

### 🐳 Docker 部署（推荐）

#### 快速部署

使用 Docker Compose 一键部署：

```bash
# 下载 docker-compose.yml 文件
curl -O https://raw.githubusercontent.com/CeRu-007/TMDB-Helper/main/docker-compose.yml

# 启动服务
docker-compose up -d
```

或者直接使用 Docker 运行：

```bash
# 从 Docker Hub 拉取镜像
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

部署完成后，通过 `http://your-server-ip:4949` 访问应用。

#### 配置存储说明

**配置文件位置：**
- **容器内**: `/app/data/server-config.json`
- **开发环境**: `D:\.background\tmdb-helper\data\server-config.json`
- **Docker绑定挂载**: `./data/server-config.json`（相对于docker-compose.yml）

**存储方式：**
1. **Docker命名卷**（推荐）：由Docker管理，自动处理权限
2. **绑定挂载**：直接映射到宿主机目录，便于访问配置文件

**自动迁移：**
应用启动时会自动从localStorage迁移配置到服务端存储，确保升级平滑。

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
| `TMDB_API_KEY` | - | TMDB API 密钥（可选） |

#### Docker Compose 配置

创建 `docker-compose.yml` 文件：

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




## 🤝 贡献

我们欢迎并鼓励社区对 TMDB-Helper 项目做出贡献！

### 贡献方式
-   🐛 **Bug 报告**: 发现问题请提交 Issue
-   💡 **功能建议**: 有好的想法请分享给我们
-   🔧 **代码贡献**: 提交 Pull Request 改进项目
-   📖 **文档完善**: 帮助改进文档和使用指南

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 🙏 致谢

-   感谢 [fzlins/TMDB-Import](https://github.com/fzlins/TMDB-Import) 项目的支持
