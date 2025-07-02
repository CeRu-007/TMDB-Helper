# TMDB-Helper
![Logo_设计 (1)](https://github.com/user-attachments/assets/7fabd3b5-dc7d-416f-83f8-ad79d223adc9)

## 简介
TMDB-Helper 是一个功能强大的桌面应用程序，旨在帮助用户高效地管理和维护 TMDB (The Movie Database) 上的电影和电视剧词条。它提供了一个直观的用户界面，用户可以轻松追踪媒体内容的维护进度，管理多季剧集，并与 TMDB 平台进行无缝集成。

## 主要特性

-   **TMDB 集成**：直接从 TMDB 导入和更新电影、电视剧信息。
-   **高级元数据提取**：从各种来源（如文件名、文件夹结构）智能提取媒体元数据。
-   **CSV 管理**：支持导入、编辑和导出 CSV 文件，方便批量处理媒体信息。
-   **媒体库维护**：跟踪电影和电视剧的维护状态，确保数据准确和完整。
-   **多季剧集管理**：优化多季电视剧集的管理流程，包括剧集信息和封面。
-   **可定制的计划任务**：设置自动化任务，例如定期同步数据或执行特定操作。
-   **桌面应用支持**：基于 Electron 构建，提供原生桌面应用体验。
-   **现代化用户界面**：采用 Shadcn UI 组件库，提供美观且响应迅速的用户体验。

## 技术栈

TMDB-Helper 构建于以下领先技术之上：

-   **前端**：
    -   Next.js (React Framework)
    -   TypeScript
    -   Shadcn UI (基于 Radix UI 和 Tailwind CSS 的可复用组件库)
-   **后端**：
    -   Node.js
    -   Next.js API Routes
-   **桌面应用**：
    -   Electron
-   **数据处理**：
    -   CSV 解析与验证
    -   文件系统操作

## 安装与运行

要本地运行 TMDB-Helper，请按照以下步骤操作：

1.  **克隆仓库**：
    ```bash
    git clone https://github.com/CeRu-007/TMDB-Helper.git
    cd TMDB-Helper
    ```

2.  **安装依赖**：
    ```bash
    npm install # 或者 yarn install / pnpm install
    ```

3.  **运行开发服务器**：
    ```bash
    npm run dev
    ```
    这将启动 Next.js 开发服务器，您可以通过浏览器访问 `http://localhost:3000`。

4.  **构建和运行 Electron 桌面应用**：
    ```bash
    npm run electron:start
    ```
    这将构建并启动桌面应用程序。

## 使用指南

-   **导入数据**：通过 CSV 文件导入现有的媒体库数据。
-   **搜索与编辑**：使用内置搜索功能查找媒体条目，并直接在界面中编辑其信息。
-   **运行计划任务**：在设置中配置并运行自动化任务。
-   **导出数据**：将处理后的数据导出为 CSV 格式。

## 贡献

我们欢迎并鼓励社区对 TMDB-Helper 项目做出贡献。如果您有任何改进建议、功能请求或 Bug 报告，请随时提交 Pull Request 或 Issue。

## 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。
