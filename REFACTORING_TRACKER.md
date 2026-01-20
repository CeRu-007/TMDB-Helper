# TMDB-Helper 代码重构跟踪文档

## 项目信息
- **项目名称**: TMDB-Helper
- **重构分支**: `refactor/feature-modularization`
- **开始日期**: 2026-01-20
- **预计完成**: 2026-03-20 (7-10周)
- **负责人**: iFlow CLI

## 重构目标
1. 降低代码复杂度 40%+
2. 降低模块耦合度 30%+
3. 减少构建体积 10%+
4. 提升加载性能 15%+
5. 提升代码可维护性

## 目标架构

```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API 路由
│   ├── (main)/                   # 主应用路由组
│   ├── (auth)/                   # 认证路由组
│   └── (streaming)/              # 流媒体导航
│
├── features/                     # 功能模块
│   ├── media-maintenance/        # 词条维护
│   ├── episode-generation/       # 分集简介生成
│   ├── image-processing/         # 图像处理
│   ├── media-news/               # 影视资讯
│   ├── streaming-nav/            # 流媒体导航
│   ├── scheduled-tasks/          # 定时任务
│   ├── data-management/          # 数据管理
│   ├── tmdb-import/              # TMDB-Import 集成
│   ├── system/                   # 系统设置
│   └── ai/                       # AI 功能
│
├── shared/                       # 共享资源
│   ├── components/ui/            # 基础 UI 组件
│   ├── lib/
│   │   ├── hooks/                # 全局 hooks
│   │   ├── utils/                # 工具函数
│   │   ├── contexts/             # React Context
│   │   └── constants/            # 全局常量
│   └── types/                    # 全局类型
│
└── config/                       # 配置文件
```

## 阶段进度

### 阶段 1: 准备与基础设施 (3-5天)
- [x] 创建重构分支
- [x] 创建新目录结构
- [ ] 设置迁移跟踪文档
- [ ] 建立版本控制策略

**状态**: 进行中 (2026-01-20)

### 阶段 2: 低耦合模块迁移 (5-7天)
- [ ] 迁移 AI 模块
- [ ] 迁移 Media News 模块
- [ ] 迁移 Streaming Nav 模块

**状态**: 待开始

### 阶段 3: 共享资源重组 (7-10天)
- [ ] 分离通用和特定 hooks
- [ ] 分离工具函数
- [ ] 重组类型定义
- [ ] 整理常量定义

**状态**: 待开始

### 阶段 4: Media 模块迁移 (10-15天)
- [ ] 拆分 tmdb-table.tsx
- [ ] 迁移 subtitle-episode-generator
- [ ] 重组 media 相关 API

**状态**: 待开始

### 阶段 5: Scheduled Tasks 迁移 (8-12天)
- [ ] 拆分 global-scheduled-tasks-dialog.tsx
- [ ] 迁移其他任务组件
- [ ] 重组 tasks API

**状态**: 待开始

### 阶段 6: 整合与优化 (5-7天)
- [ ] 迁移 SettingsDialog
- [ ] 整合 data 和 storage API
- [ ] 清理旧代码和路径
- [ ] 性能优化
- [ ] 最终测试和文档

**状态**: 待开始

## 文件迁移状态

### 待迁移文件清单

#### 高优先级文件 (超大文件)
- [ ] `src/components/features/scheduled-tasks/global-scheduled-tasks-dialog.tsx` (2356 行)
- [ ] `src/components/features/media/tmdb-table.tsx` (1716 行)
- [ ] `src/components/features/dialogs/SettingsDialog.tsx` (1063 行)
- [ ] `src/components/features/maintenance/independent-maintenance.tsx` (891 行)
- [ ] `src/app/page.tsx` (521 行)

#### AI 模块 (12 files, 56 KB)
- [ ] `src/components/features/ai/ai-chat.tsx`
- [ ] `src/components/features/ai/chat-sidebar.tsx`
- [ ] `src/components/features/ai/chat-messages.tsx`
- [ ] `src/components/features/ai/chat-input.tsx`
- [ ] `src/components/features/ai/molecules/*` (4 files)
- [ ] `src/components/features/ai/atoms/*` (1 file)

#### Media 模块 (36 files, 676 KB)
- [ ] `src/components/features/media/tmdb-table.tsx`
- [ ] `src/components/features/media/subtitle-episode-generator/*` (20 files)
- [ ] `src/components/features/media/hard-subtitle-extractor/*` (4 files)
- [ ] `src/components/features/media/video-thumbnail-extractor.tsx`
- [ ] `src/components/features/media/image-cropper.tsx`
- [ ] `src/components/features/media/media-card.tsx`
- [ ] `src/components/features/media/new-tmdb-table.tsx`

#### Dialogs 模块 (18 files, 218 KB)
- [ ] `src/components/features/dialogs/SettingsDialog.tsx`
- [ ] `src/components/features/dialogs/settings-dialog/*` (10 files)
- [ ] `src/components/features/dialogs/add-item-dialog.tsx`
- [ ] `src/components/features/dialogs/batch-insert-row-dialog.tsx`
- [ ] `src/components/features/dialogs/config-migration-dialog.tsx`
- [ ] `src/components/features/dialogs/fix-tmdb-import-bug-dialog.tsx`

#### Scheduled Tasks 模块 (3 files, 149 KB)
- [ ] `src/components/features/scheduled-tasks/global-scheduled-tasks-dialog.tsx`
- [ ] `src/components/features/scheduled-tasks/scheduled-task-dialog.tsx`
- [ ] `src/components/features/scheduled-tasks/task-execution-logs-dialog.tsx`

#### Hooks (22 hooks)
- [ ] `src/lib/hooks/use-toast.ts` → `src/shared/lib/hooks/`
- [ ] `src/lib/hooks/use-is-client.ts` → `src/shared/lib/hooks/`
- [ ] `src/lib/hooks/use-async-operation.ts` → `src/shared/lib/hooks/`
- [ ] `src/lib/hooks/use-home-state.ts` → `src/features/media-maintenance/lib/hooks/`
- [ ] `src/lib/hooks/use-media-news.ts` → `src/features/media-news/lib/hooks/`
- [ ] `src/lib/hooks/use-ai-chat-handlers.ts` → `src/features/ai/lib/hooks/`
- [ ] `src/lib/hooks/use-ai-chat-history.ts` → `src/features/ai/lib/hooks/`
- [ ] `src/lib/hooks/use-scheduled-tasks.ts` → `src/features/scheduled-tasks/lib/hooks/`
- [ ] ... (其他 hooks)

#### Utils (多个文件)
- [ ] `src/lib/utils/index.ts` → `src/shared/lib/utils/`
- [ ] `src/lib/utils/date-utils.ts` → `src/shared/lib/utils/`
- [ ] `src/lib/utils/logger.ts` → `src/shared/lib/utils/`
- [ ] `src/lib/utils/ai-chat-helpers.ts` → `src/features/ai/lib/utils/`
- [ ] `src/lib/utils/siliconflow-api.ts` → `src/features/ai/lib/utils/`
- [ ] `src/lib/utils/docker-config.ts` → `src/features/system/lib/utils/`
- [ ] ... (其他 utils)

#### Media Utils
- [ ] `src/lib/media/video-processor.ts` → `src/features/image-processing/lib/`
- [ ] `src/lib/media/image-processor-class.ts` → `src/features/image-processing/lib/`
- [ ] `src/lib/media/platform-data.ts` → `src/features/streaming-nav/lib/`
- [ ] ... (其他 media utils)

#### Data Utils
- [ ] `src/lib/data/storage.ts` → `src/shared/lib/data/`
- [ ] `src/lib/data/task-scheduler/*` → `src/features/scheduled-tasks/lib/`
- [ ] `src/lib/data/csv-processor-client.ts` → `src/features/data-management/lib/`
- [ ] ... (其他 data utils)

## API 路由重组状态

### 待重组 API 路由
- [ ] `/api/ai/*` → `/api/v1/ai/*`
- [ ] `/api/auth/*` → `/api/v1/auth/*`
- [ ] `/api/media/*` → `/api/v1/media/*`
- [ ] `/api/data/*` → `/api/v1/data/*`
- [ ] `/api/tasks/*` → `/api/v1/tasks/*`
- [ ] `/api/system/*` → `/api/v1/system/*`
- [ ] `/api/tmdb/*` → `/api/v1/tmdb/*`
- [ ] `/api/csv/*` → `/api/v1/csv/*`
- [ ] `/api/files/*` → `/api/v1/files/*`
- [ ] `/api/external/*` → `/api/v1/external/*`
- [ ] `/api/commands/*` → `/api/v1/commands/*`
- [ ] `/api/storage/*` → `/api/v1/storage/*`
- [ ] `/api/model-service/*` → `/api/v1/model-service/*`

## 依赖关系映射

### 模块依赖图
```
page.tsx (主页面)
├── home 模块
├── media 模块
│   ├── tmdb-table
│   ├── subtitle-episode-generator
│   └── video-thumbnail-extractor
├── ai 模块
│   ├── ai-chat
│   └── chat-components
├── scheduled-tasks 模块
│   ├── global-scheduled-tasks-dialog
│   └── task-execution-logs
└── dialogs 模块
    └── settings-dialog
```

### 共享依赖
```
shared/lib/
├── hooks/
│   ├── use-toast.ts (全局)
│   ├── use-async-operation.ts (全局)
│   └── ...
├── utils/
│   ├── index.ts (全局)
│   ├── date-utils.ts (全局)
│   ├── logger.ts (全局)
│   └── ...
├── contexts/
│   └── ModelServiceContext.tsx (全局)
└── constants/
    ├── categories.ts (全局)
    └── regions.ts (全局)
```

## 回滚决策点

### 阶段 1 回滚点
- **决策点**: 完成目录结构创建后
- **回滚方式**: 删除新创建的目录,删除分支

### 阶段 2 回滚点
- **决策点**: 完成每个模块迁移后
- **回滚方式**: 恢复到上一阶段提交,删除新文件

### 阶段 3 回滚点
- **决策点**: 完成 hooks 分离后
- **回滚方式**: 恢复文件到原始位置

### 阶段 4 回滚点
- **决策点**: 完成文件拆分后
- **回滚方式**: 恢复原始文件

### 阶段 5 回滚点
- **决策点**: 完成文件拆分后
- **回滚方式**: 恢复原始文件

### 阶段 6 回滚点
- **决策点**: 完成路径更新前
- **回滚方式**: 恢复到阶段 5 状态

## 风险跟踪

### 已识别风险
1. **迁移过程中破坏现有功能** - 高影响,中概率
   - 缓解: 每个阶段完成后进行完整回归测试
   - 状态: 监控中

2. **循环依赖问题** - 中影响,中概率
   - 缓解: 使用依赖分析工具,明确模块边界
   - 状态: 监控中

3. **性能下降** - 中影响,低概率
   - 缓解: 性能基准测试,代码分割优化
   - 状态: 监控中

4. **时间估算不准确** - 中影响,高概率
   - 缓解: 20% 时间缓冲,灵活调整
   - 状态: 监控中

## 测试检查清单

### 每个阶段完成后的测试
- [ ] TypeScript 编译通过
- [ ] 所有单元测试通过
- [ ] 所有集成测试通过
- [ ] 手动功能测试通过
- [ ] 性能基准测试通过
- [ ] 无控制台错误或警告

### 最终测试 (阶段 6)
- [ ] 完整回归测试
- [ ] 跨浏览器测试
- [ ] 性能测试
- [ ] 安全性测试
- [ ] 用户体验测试

## 性能指标跟踪

### 基准指标 (重构前)
- 构建体积: TBD
- 首次加载时间: TBD
- 代码复杂度: TBD
- 模块耦合度: TBD

### 目标指标 (重构后)
- 构建体积: 减少 10%+
- 首次加载时间: 提升 15%+
- 代码复杂度: 降低 40%+
- 模块耦合度: 降低 30%+

### 当前进度
- 构建体积: TBD
- 首次加载时间: TBD
- 代码复杂度: TBD
- 模块耦合度: TBD

## 变更日志

### 2026-01-20
- 创建重构分支 `refactor/feature-modularization`
- 创建新目录结构骨架
- 创建迁移跟踪文档

## 备注

### 重要提醒
- 每个阶段完成后立即提交代码
- 保留详细的提交信息
- 定期备份到远程仓库
- 每周进行进度回顾

### 联系方式
- 如有问题,请查看项目 README 或提交 Issue

---

**最后更新**: 2026-01-20
**文档版本**: 1.0