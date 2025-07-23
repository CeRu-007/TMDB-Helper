# TMDB-Helper
![Logo_设计 (1)](https://github.com/user-attachments/assets/7fabd3b5-dc7d-416f-83f8-ad79d223adc9)

## 简介
本项目完全由AI生成，AI写的过程中产生了些许冗余代码，但目前并未影响使用。
TMDB-Helper 是一个功能强大的桌面应用程序，旨在帮助用户高效地管理和维护 TMDB (The Movie Database) 上的电影和电视剧词条。它提供了一个直观的用户界面，用户可以轻松追踪媒体内容的维护进度，管理多季剧集，并与 TMDB 平台进行无缝集成。

## 主要特性

### 🎬 核心功能
-   **TMDB 集成**：通过 TMDB API 进行搜索导入电影、电视剧信息并跟踪维护状态。
-   **媒体库维护**：跟踪电影和电视剧的维护状态，支持按分类（动漫、电视剧、少儿、综艺、短剧、电影）管理。
-   **智能分类系统**：自动识别和分类不同类型的媒体内容，支持自定义分类标签。
-   **多季剧集管理**：完整的季度和分集信息管理，支持复杂的电视剧结构。

### 📊 数据管理
-   **CSV 管理**：支持导入、编辑和导出 CSV 文件，方便批量处理媒体信息。
-   **数据导入导出**：完整的数据备份和恢复功能，支持 JSON 格式的数据交换。
-   **本地存储优化**：智能的本地数据存储和缓存机制，确保数据安全和访问速度。
-   **数据验证**：导入时自动验证数据完整性和格式正确性。

### 🤖 自动化功能
-   **可定制的计划任务**：设置自动化任务，支持定期同步数据、执行特定操作等。
-   **任务调度器**：内置强大的任务调度系统，支持复杂的定时任务配置。
-   **执行日志**：详细的任务执行记录和日志查看功能。

### 🎥 影视资讯
-   **即将上线**：获取未来30天将要上线的影视内容，支持多地区数据源。
-   **近期开播**：查看过去30天内刚刚开播的影视动态，及时了解最新内容。
-   **多地区支持**：支持中国大陆、香港、台湾、日本、韩国、美国、英国等多个地区的数据。

### 🖼️ 图像处理
-   **本地视频缩略图提取**：自动识别字幕区域并裁剪图片，支持多张图片同时处理。
-   **智能图片裁切**：支持16:9比例的自动裁切和手动调整，适用于腾讯没有分集图片的情况。
-   **批量处理**：支持多个视频文件的批量缩略图提取和处理。
-   **质量优化**：智能帧选择算法，自动选择最佳质量的缩略图。

### 🔧 集成工具
-   **集成TMDB-Import**：在词条二级页面进行可视化操作，无缝对接外部工具。
-   **错误修复工具**：内置的TMDB-Import错误修复和调试功能。
-   **config.ini文件快捷设置**：在设置页面提供界面调节TMDB-Import的设置。

### 🎨 用户界面
-   **双布局模式**：支持传统布局和现代侧边栏布局，满足不同用户习惯。
-   **响应式设计**：完美适配桌面和移动设备，提供一致的用户体验。
-   **深色模式**：支持明暗主题切换，保护用户视力。
-   **直观操作**：简洁明了的用户界面，降低学习成本。


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
  -p 3000:3000 \
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
| `PORT` | `3000` | 应用端口 |
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
      - "3000:3000"
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
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/auth/init"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  tmdb_data:
  tmdb_logs:
```

#### 构建自定义镜像

如果需要自定义构建：

```bash
# 克隆项目
git clone https://github.com/CeRu-007/TMDB-Helper.git
cd TMDB-Helper

# 构建镜像
docker build -t tmdb-helper .

# 运行自定义镜像
docker run -d --name tmdb-helper -p 3000:3000 tmdb-helper
```

#### 发布脚本

项目提供了便捷的发布脚本：

**Linux/Mac:**
```bash
# 给脚本添加执行权限
chmod +x scripts/docker-build-push.sh

# 构建并推送 latest 版本
./scripts/docker-build-push.sh

# 构建并推送指定版本
./scripts/docker-build-push.sh v1.0.0
```

**Windows:**
```cmd
# 构建并推送 latest 版本
scripts\docker-build-push.bat

# 构建并推送指定版本
scripts\docker-build-push.bat v1.0.0
```

### 🚀 本地开发部署

1.  **获取源码**：
    ```bash
    # 方式一：Git 克隆（推荐）
    git clone https://github.com/CeRu-007/TMDB-Helper.git
    cd TMDB-Helper

    # 方式二：下载 ZIP 压缩包
    # 在 GitHub 上点击 Code -> Download ZIP，然后解压
    ```

2.  **安装依赖**：
    ```bash
    # 使用 npm
    npm install

    # 或使用 yarn
    yarn install

    # 或使用 pnpm（推荐，更快）
    pnpm install
    ```

3.  **配置环境**：
    ```bash
    # 复制环境变量模板（如果存在）
    cp .env.example .env.local

    # 编辑 .env.local 文件，添加您的 TMDB API 密钥
    # TMDB_API_KEY=your_api_key_here
    ```

4.  **运行开发服务器**：
    ```bash
    npm run dev
    # 或 yarn dev / pnpm dev
    ```
    启动后访问 `http://localhost:3000` 即可使用 Web 版本。

5.  **构建桌面应用**：
    ```bash
    # 开发模式运行桌面应用
    npm run electron:start

    # 构建生产版本
    npm run electron:build
    ```

### 🔧 高级配置

-   **API 密钥设置**: 首次运行时，应用会引导您设置 TMDB API 密钥
-   **数据存储**: 默认使用本地存储，可在设置中配置文件存储路径
-   **任务调度**: 可在应用内配置自动化任务和定时同步
-   **Docker 数据持久化**: 使用 Docker 卷确保数据在容器重启后保持
-   **健康检查**: 内置健康检查确保服务正常运行


## 📖 使用指南

### 🎯 快速上手
1. **设置 API 密钥**: 首次启动时配置您的 TMDB API 密钥
2. **导入数据**: 使用 CSV 导入功能批量添加媒体项目
3. **管理词条**: 在词条维护页面查看和编辑项目信息
4. **查看资讯**: 在影视资讯页面获取最新的上线和开播信息
5. **处理图片**: 使用缩略图工具提取和裁切视频截图

### 🔧 主要功能使用
-   **词条维护**: 支持按分类筛选，状态管理，批量操作
-   **影视资讯**: 实时获取即将上线和近期开播的内容
-   **图像处理**: 智能提取视频缩略图，支持批量处理
-   **任务调度**: 设置定时任务自动同步和更新数据
-   **数据管理**: 导入导出功能，支持数据备份和迁移

### 💡 使用技巧
-   使用侧边栏布局获得更现代的操作体验
-   启用深色模式保护视力
-   设置定时任务实现数据自动同步
-   使用批量操作提高工作效率

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
