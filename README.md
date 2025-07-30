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
-   **AI分集简介生成**：基于字幕文件智能生成分集简介，支持多种AI模型和写作风格。
-   **执行日志**：详细的任务执行记录和日志查看功能。

### 🎥 影视资讯
-   **即将上线**：获取未来30天将要上线的影视内容，支持多地区数据源。
-   **近期开播**：查看过去30天内刚刚开播的影视动态，及时了解最新内容。
-   **流媒体导航**：全球主流流媒体平台导航，支持分类筛选和自定义排序。
-   **多地区支持**：支持中国大陆、香港、台湾、日本、韩国、美国、英国等多个地区的数据。

### 🖼️ 图像处理
-   **本地视频缩略图提取**：自动识别字幕区域并裁剪图片，支持多张图片同时处理。
-   **智能图片裁切**：支持16:9比例的自动裁切和手动调整，适用于腾讯没有分集图片的情况。
-   **批量处理**：支持多个视频文件的批量缩略图提取和处理。
-   **质量优化**：智能帧选择算法，自动选择最佳质量的缩略图。

### 🔧 集成工具
-   **集成TMDB-Import**：在词条二级页面进行可视化操作，无缝对接外部工具。
-   **TMDB-Import自动更新**：一键下载、安装和更新TMDB-Import工具，支持版本检测和自动备份。
-   **Docker版本管理**：专为Docker部署用户提供的镜像版本管理和自动更新功能。
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
  -p 4949:4949 \
  -v tmdb_data:/app/data \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=your_secure_password \
  -e JWT_SECRET=your_jwt_secret_key \
  ceru007/tmdb-helper:latest
```

部署完成后，通过 `http://your-server-ip:4949` 访问应用。

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


#### 📱 版本管理
Docker 部署用户可以通过内置的版本管理器轻松更新：
1. 访问应用设置页面
2. 在 Docker 版本管理区域查看当前版本
3. 一键更新到最新版本，系统会自动处理容器重启

### 📝 AI 分集简介生成器

为了帮助用户快速创建高质量的分集简介，我们新增了基于 AI 的分集简介生成功能：

#### ✨ 主要特性
- **🤖 多模型支持**: 支持 DeepSeek-V2.5、Qwen2.5 等多种 AI 模型
- **🎨 多样化风格**: 提供官方、文艺、悬疑、幽默等多种写作风格
- **📁 批量处理**: 支持批量上传字幕文件，一键生成多集简介
- **⚙️ 智能配置**: 可调节简介长度、创意程度等生成参数
- **📤 格式导出**: 支持导出为 TMDB-Import 兼容的 CSV 格式
- **✏️ 实时编辑**: 生成后可直接在界面中编辑和优化简介内容

#### ⚠️ 使用提醒
- AI 生成的分集简介仅作**辅助作用**，请务必观看对应视频内容审核修改后再使用
- **禁止直接上传至 TMDB** 等数据库平台，需要人工审核和完善

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
