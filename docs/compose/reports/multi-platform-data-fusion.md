---
feature: multi-platform-data-fusion
status: delivered
specs:
  - ../specs/2026-06-27-multi-platform-data-fusion-design.md
plans:
  - ../plans/2026-06-27-multi-platform-data-fusion.md
---

# Multi-Platform Data Fusion — Final Report

## What Was Built

在ScheduleTab中实现了多平台数据来源功能，允许用户配置多个数据来源平台，串行抓取各平台CSV并按字段保留配置合并，最终产出统一import.csv进入后续处理管线。

核心功能：
- 单平台/多平台模式切换
- 多平台配置面板：启用/禁用平台、配置保留字段
- CSV合并引擎：按episode_number对齐多源CSV并合并
- 向后兼容：旧单平台任务不受影响

## Architecture

### 类型定义 (`src/types/schedule.ts`)

```typescript
export interface PlatformSourceConfig {
  url: string;
  enabled: boolean;
  keepFields: FieldCleanup;
}

export interface ScheduleTask {
  // ... existing fields
  platformConfigs?: PlatformSourceConfig[] | undefined;
}
```

### 数据库迁移 (`src/lib/database/schema.ts`)

- SCHEMA_VERSION: 17 → 18
- 新增列: `schedule_tasks.platformConfigs TEXT DEFAULT '[]'`

### CSV合并引擎 (`src/lib/scheduler/csv-cleaner.ts`)

```typescript
export interface PlatformCSVResult {
  url: string;
  csvContent: string;
  keptFields: FieldCleanup;
}

export function mergeMultiPlatformCSVs(results: PlatformCSVResult[]): string;
```

合并逻辑：
1. 使用第一个平台作为主CSV
2. 遍历其他平台，按episode_number对齐
3. 对每个字段，根据keepFields配置决定是否填充空值

### Executor (`src/lib/scheduler/schedule-executor.ts`)

- 新增 `executeMultiPlatformTask()` 函数
- 串行抓取各平台CSV → 合并 → cleanCSV → autoImport
- 路由逻辑：`enabledPlatforms.length > 1` 时调用多平台执行器

### UI (`src/features/media-maintenance/components/item-detail/components/ScheduleTab.tsx`)

- 模式选择：单平台/多平台切换按钮
- 多平台配置面板：平台列表 + 保留字段配置
- HelpInfoButton：说明性文字改为弹窗

### i18n (6语言)

新增key：`dataSourceMode`, `singlePlatformMode`, `multiPlatformMode`, `platformSources`, `keepFields` 等

## Usage

1. 在词条详情页编辑模式下添加多个播出平台URL
2. 切换到定时任务Tab
3. 当有多个平台URL时，显示"数据来源模式"选择
4. 选择"多平台模式"，配置各平台的保留字段
5. 保存配置
6. 执行任务时，串行抓取各平台并合并CSV

## Verification

- 类型检查：通过（无新增错误）
- 向后兼容：旧单平台任务不受影响
- UI：模式选择、平台配置、字段选择正常工作

## Journey Log

- [lesson] 项目有大量预存TypeScript错误（exactOptionalPropertyTypes相关），新增代码不引入新错误即可
- [lesson] 定时任务只存储集数(count)，不存储CSV元数据，这是设计约束
- [lesson] 外部TMDB-Import工具不可修改，CSV通过复制保留

## Source Materials

| File | Role | Notes |
|------|------|-------|
| `../specs/2026-06-27-multi-platform-data-fusion-design.md` | 设计规格 | 初始设计 |
| `../plans/2026-06-27-multi-platform-data-fusion.md` | 实现计划 | 10个任务 |
