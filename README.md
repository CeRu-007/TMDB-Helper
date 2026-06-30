<div align="center">

<img src="https://github.com/user-attachments/assets/7fabd3b5-dc7d-416f-83f8-ad79d223adc9" alt="TMDB-Helper Logo" width="200">

# TMDB-Helper

**一个 TMDB 媒体维护工具**

[![Version](https://img.shields.io/badge/version-0.7.5-blue.svg)](https://github.com/CeRu-007/TMDB-Helper/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/docker-supported-brightgreen.svg)](https://hub.docker.com/r/ceru007/tmdb-helper)

[English](README-EN.md) · [快速开始](#快速开始) · [部署](#部署) · [文档](https://github.com/CeRu-007/TMDB-Helper/wiki) · [Releases](https://github.com/CeRu-007/TMDB-Helper/releases)

<img width="2489" height="1352" alt="image" src="https://github.com/user-attachments/assets/7a599a85-3a42-4d31-a4a8-6ba0569d2093" />

</div>

---

## 功能

> 本项目完全由 AI 辅助开发（AI Vibe Coding），懂得不多，请见谅

- 词条管理 - 维护列表、卡片/表格视图、批量编辑
- 定时任务 - 自动抓取并导入 TMDB
- 集成工具 - TMDB-Import 可视化操作、CSV 编辑器
- AI 分集简介 - 字幕生成标题和剧情摘要
- 硬字幕提取 - 从视频中提取嵌入字幕
- 视频截图 - 提取关键帧图片
- 图片裁切 - 裁切成 TMDB 规范比例
- 影视资讯 - 即将上线、近期开播
- 追剧时间表 - 聚合 B站/爱奇艺/腾讯视频日程
- 流媒体导航 - 全球主流平台快速访问
- 影视识别 - 上传图片识别影视作品
- AI 对话 - 多轮对话助手
- 数据导入导出 - JSON/CSV 格式
- 多主题 - 15+ 预设主题
- 多语言 - 中文、英文、日文、韩文等

## 部署

### Docker（推荐）

```bash
docker-compose up -d
```

或手动运行：

```bash
docker run -d \
  --name tmdb-helper \
  -p 4949:4949 \
  -v tmdb_data:/app/data \
  -e JWT_SECRET=your_jwt_secret_key \
  ceru007/tmdb-helper:latest
```

### 桌面端

从 [GitHub Releases](https://github.com/CeRu-007/TMDB-Helper/releases) 下载安装包。

### Web

```bash
git clone https://github.com/CeRu-007/TMDB-Helper.git
cd TMDB-Helper
pnpm install
pnpm dev
```

需要 Node.js 22+。

## 环境变量

| 变量                    | 默认值    | 说明                   |
| --------------------- | ------ | -------------------- |
| `JWT_SECRET`          | -      | JWT 密钥（**生产环境必须修改**） |
| `SESSION_EXPIRY_DAYS` | `7`    | 会话有效期（天）             |
| `PORT`                | `4949` | 应用端口                 |

## 文档

详细使用说明请查看 [Wiki](https://github.com/CeRu-007/TMDB-Helper/wiki)。

## 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/xxx`)
3. 提交更改 (`git commit -m 'Add xxx'`)
4. 推送到分支 (`git push origin feature/xxx`)
5. 开启 Pull Request

## 许可证

[MIT](LICENSE)

## 致谢

- [fzlins/TMDB-Import](https://github.com/fzlins/TMDB-Import) - TMDB 数据导入工具
