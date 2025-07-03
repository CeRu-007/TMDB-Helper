# TMDB-Helper
![Logo_设计 (1)](https://github.com/user-attachments/assets/7fabd3b5-dc7d-416f-83f8-ad79d223adc9)

## 简介
本项目完全由AI生成，AI写的过程中产生了些许冗余代码，但目前并未影响使用。
TMDB-Helper 是一个功能强大的桌面应用程序，旨在帮助用户高效地管理和维护 TMDB (The Movie Database) 上的电影和电视剧词条。它提供了一个直观的用户界面，用户可以轻松追踪媒体内容的维护进度，管理多季剧集，并与 TMDB 平台进行无缝集成。

## 主要特性

-   **TMDB 集成**：通过 TMDB api 进行搜索导入电影、电视剧信息并跟踪维护。
-   **CSV 管理**：支持导入、编辑和导出 CSV 文件，方便批量处理媒体信息。
-   **媒体库维护**：跟踪电影和电视剧的维护状态，确保数据准确和完整。
-   **可定制的计划任务**：设置自动化任务，例如定期同步数据或执行特定操作。
-   **集成TMDB-Import**：在词条二级页面进行可视化操作。
-   **本地视频缩略图提取**：自动识别字幕区域并裁剪图片，支持多张图片同时处理，适用于腾讯没有分集图片的情况。

## 核心依赖

本项目在部分核心功能上依赖于外部开源项目 [fzlins/TMDB-Import](https://github.com/fzlins/TMDB-Import)。该项目是一个强大的 Python 脚本，用于从各种网站抓取剧集数据、导入到 TMDB 以及进行图片裁剪，极大地增强了 TMDB-Helper 在数据处理和 TMDB 交互方面的能力。

## 安装与运行

要本地运行 TMDB-Helper，请按照以下步骤操作：

1.  **下载源码**：
    ```bash
    在GitHub上点击Code，进行下载zip压缩包源码
    ```

2.  **安装依赖**：
    ```bash
    npm install # 或者 yarn install / pnpm install
    ```

3.  **运行开发服务器**：
    ```bash
    npm run dev
    ```
    这将启动 Next.js 开发服务器，您可以通过浏览器访问本项目 `http://localhost:3000`。

4.  **构建和运行 Electron 桌面应用**：
    ```bash
    npm run electron:start
    ```
    这将构建并启动桌面应用程序。


## 贡献

我们欢迎并鼓励社区对 TMDB-Helper 项目做出贡献。如果您有任何改进建议、功能请求或 Bug 报告，请随时提交 Pull Request 或 Issue。

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。
