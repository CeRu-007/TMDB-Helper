# 🎬 TMDB Helper - 电影电视剧数据库管理工具

**一个功能强大的TMDB (The Movie Database) 内容管理和维护平台**

## 📖 项目简介

TMDB Helper 是一个专为影视内容管理者和TMDB贡献者设计的现代化Web应用程序。它提供了完整的电影、电视剧词条管理功能，支持批量数据处理、自动化任务调度和智能图像处理，让TMDB内容维护变得更加高效和便捷。

## ✨ 核心特性

### 🎯 **TMDB集成管理**

- 通过TMDB API进行内容搜索和导入
- 支持电影、电视剧、动漫、综艺等多种媒体类型
- 智能分类系统和自定义标签管理
- 完整的多季剧集和分集信息管理

### 📊 **数据处理能力**

- CSV文件批量导入导出功能
- JSON格式数据备份和恢复
- 数据完整性验证和格式检查
- 本地存储优化和缓存机制

### 🤖 **自动化工具**

- 可定制的计划任务系统
- 强大的任务调度器
- 详细的执行日志和监控
- 定期数据同步和更新

### 🖼️ **图像处理**

- 本地视频缩略图自动提取
- 智能字幕区域识别和裁剪
- 16:9比例自动调整
- 批量图片处理和质量优化

### 🎥 **影视资讯**

- 未来30天即将上线内容预览
- 近期开播影视动态追踪
- 多地区数据源支持（中国、日本、韩国、美国等）

### 🎨 **现代化界面**

- 响应式设计，专为桌面端优化
- 双布局模式（传统/侧边栏）
- 明暗主题切换
- 直观的用户操作体验

## 🚀 快速开始

### 使用Docker运行

```bash
# 拉取镜像
docker pull ceru007/tmdb-helper:latest

# 运行容器（项目已改为“先注册后登录”模式，首次打开登录页会自动显示注册页面）
docker run -d \
  --name tmdb-helper \
  -p 4949:4949 \
  -v tmdb_data:/app/data \
  -e JWT_SECRET=your_jwt_secret_key \
  ceru007/tmdb-helper:latest
```

### 使用Docker Compose

```yaml
version: '3.8'
services:
  tmdb-helper:
    image: ceru007/tmdb-helper:latest
    container_name: tmdb-helper
    ports:
      - '4949:4949'
    environment:
      # JWT_SECRET 必须设置
      # 项目已改为“先注册后登录”模式，不设置管理员变量，首次访问登录页即显示注册页面
      - JWT_SECRET=your_jwt_secret_key
    volumes:
      - tmdb_data:/app/data
    restart: unless-stopped

volumes:
  tmdb_data:
```

## 📦 内置依赖（开箱即用）

镜像已预装 TMDB-Import 所需的全部 Python 依赖，**无需在设置页手动安装**：

- `playwright` 及 Chromium 浏览器二进制
- `python-dateutil`、`Pillow`、`bordercrop`
- `opencc-python-reimplemented`、`requests`

浏览器二进制内置在镜像层（`/opt/playwright`），容器启动时由 `docker-startup.js` 自动软链到数据卷默认路径，因此即使升级 `data` 卷也不会丢失。设置页的「安装依赖」按钮仍保留，可作为升级/排错的兜底手段。

## 🔧 环境变量配置

| 变量名                | 必填   | 说明                                                               |
| --------------------- | ------ | ------------------------------------------------------------------ |
| `JWT_SECRET`          | **是** | JWT密钥，用于加密登录令牌                                          |
| `SESSION_EXPIRY_DAYS` | 否     | 会话有效期（天），默认 `15`                                        |
| `PORT`                | 否     | 应用端口，默认 `4949`                                              |
| `ADMIN_USERNAME`      | 否     | （已弃用）项目已改为注册后登录模式，不再通过环境变量自动创建管理员 |
| `ADMIN_PASSWORD`      | 否     | （已弃用）同上                                                     |

## 📋 系统要求

- **内存**: 最少512MB，推荐1GB
- **存储**: 最少1GB可用空间
- **端口**: 4949（可配置）
- **Docker**: 版本20.10+

## 🔗 相关链接

- **GitHub仓库**: [CeRu-007/TMDB-Helper](https://github.com/CeRu-007/TMDB-Helper)
- **问题反馈**: [GitHub Issues](https://github.com/CeRu-007/TMDB-Helper/issues)
- **文档**: 详见GitHub仓库README

## 📄 许可证

本项目采用 MIT 许可证开源。

## 🏷️ 标签

`tmdb` `movie-database` `tv-shows` `media-management` `nextjs` `docker` `automation` `image-processing` `web-app` `content-management`

---

**访问地址**: 部署后通过 http://your-server-ip:4949 访问应用

**注意**: 生产环境请务必修改默认的管理员密码和JWT密钥！
