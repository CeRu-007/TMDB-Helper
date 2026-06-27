> [!NOTE]
> This document may not reflect the current implementation.
> See the final report for up-to-date state:
> [Final Report](../reports/multi-platform-data-fusion.md)

# [S1] Problem

用户反馈：同一部剧在不同平台的数据不一定一样，比如可以从一个平台获取首播日期，从另一个平台获取简介、时长。Viu的日期通常是上传日期而非首播日期，且经常晚一天。用户希望实现"标题图片用芒果的，剧情用CCTV"这样的跨平台数据融合。

当前架构限制：
- 定时任务只存储集数(count)，不存储CSV中的标题/简介/图片等元数据
- 每个定时任务绑定单一平台URL
- 词条已有platformUrls多平台URL支持，但定时任务未利用

# [S2] Solution overview

在ScheduleTab中支持多平台数据来源：
1. 显示词条的播出平台URL（从词条编辑模式继承）
2. 用户可选择单平台模式（现有逻辑）或多平台模式
3. 多平台模式下：串行抓取各平台CSV，按字段保留配置合并，最终产出统一import.csv
4. 后续处理管线不变

执行流程（串行）：
```
平台1抓取 → 备份保留字段 → 平台2抓取 → 备份保留字段 → ... → 合并为import.csv → cleanCSV → autoImport
```

# [S3] Type definitions

新增类型（`src/types/schedule.ts`）：

```typescript
export interface PlatformSourceConfig {
  url: string;           // 平台URL（从item.platformUrls继承，不可编辑）
  enabled: boolean;      // 是否启用该平台
  keepFields: FieldCleanup;  // 保留哪些字段（true=保留，false=跳过）
}

// 复用现有FieldCleanup类型
// export interface FieldCleanup {
//   name: boolean;
//   air_date: boolean;
//   runtime: boolean;
//   overview: boolean;
//   backdrop: boolean;
// }
```

字段保留逻辑：
- `keepFields.name = true` → 保留该平台的name字段
- `keepFields.name = false` → 跳过该平台的name字段（从其他平台取）

# [S4] Database migration

新增列到 `schedule_tasks` 表：

```sql
ALTER TABLE schedule_tasks ADD COLUMN platformConfigs TEXT DEFAULT '[]';
```

迁移版本：SCHEMA_VERSION + 1

向后兼容：
- 已有单源任务通过 `platformUrl` 或 `item.platformUrls` 做数据源降级兼容
- 新字段默认值 `[]` 保证旧任务不受影响

# [S5] ScheduleTab UI changes

## [S5.1] 运行模式选择

在现有配置区顶部添加模式切换：

```
┌─────────────────────────────────────────────┐
│ 数据来源模式                    [?帮助按钮] │
├─────────────────────────────────────────────┤
│ ● 单平台模式 - 使用单一平台URL抓取          │
│ ○ 多平台模式 - 串行抓取多个平台并合并        │
└─────────────────────────────────────────────┘
```

默认：单平台模式（向后兼容）

## [S5.2] 单平台模式（现有逻辑）

保持现有UI不变：
- 显示平台URL下拉选择器
- 使用现有 `platformUrl` 字段

## [S5.3] 多平台模式

当选择多平台模式且 `item.platformUrls.length > 1` 时显示：

```
┌─────────────────────────────────────────────┐
│ 数据来源平台                    [?帮助按钮] │
├─────────────────────────────────────────────┤
│ ☑ https://www.mgtv.com/...    保留字段: [全部]
│   ☑ name  ☑ air_date  ☑ runtime  ☑ overview  ☑ backdrop
│                                                   [展开]
│ ☑ https://tv.cctv.com/...     保留字段: [全部]
│   ☑ name  ☑ air_date  ☑ runtime  ☑ overview  ☑ backdrop
│                                                   [展开]
│ ☐ https://www.viu.com/...     保留字段: [全部]
│   ☐ name  ☐ air_date  ☐ runtime  ☐ overview  ☐ backdrop
└─────────────────────────────────────────────┘
```

功能：
- 从 `item.platformUrls` 自动生成 `PlatformSourceConfig[]`
- 每个平台一行：启用开关 + URL显示 + 保留字段配置
- 默认全部启用，保留全部字段
- 用户可展开配置各平台的保留字段
- 串行执行顺序：按列表顺序

## [S5.4] HelpInfoButton使用

说明性文字改为 `HelpInfoButton`（?图标）：
- 数据来源模式：说明单平台/多平台的区别
- 数据来源平台：说明URL从词条继承，可配置保留字段

# [S6] Backend: ScheduleTask type extension

扩展 `ScheduleTask` 接口：

```typescript
export interface ScheduleTask {
  // ... existing fields
  platformConfigs?: PlatformSourceConfig[];
}
```

扩展 `ScheduleTaskRow`：

```typescript
export interface ScheduleTaskRow {
  // ... existing fields
  platformConfigs: string | null;  // JSON
}
```

更新转换函数：
- `scheduleTaskRowToScheduleTask`: 解析JSON字段
- `scheduleTaskToRow`: 序列化JSON字段

# [S7] Backend: CSV merge logic

新增合并逻辑到 `src/lib/scheduler/csv-cleaner.ts`：

```typescript
export interface PlatformCSVResult {
  url: string;
  csvContent: string;
  keptFields: FieldCleanup;
}

export function mergeMultiPlatformCSVs(
  results: PlatformCSVResult[]
): string;
```

合并逻辑：
1. 解析第一个平台的CSV为主CSV（base）
2. 遍历后续平台CSV：
   - 按 `episode_number` 对齐
   - 对每个字段，检查该平台的 `keepFields`
   - 如果该平台保留此字段，且主CSV该字段为空，则用该平台的值填充
3. 返回合并后的CSV字符串

# [S8] Backend: Executor changes

修改 `src/lib/scheduler/schedule-executor.ts`：

```typescript
export async function executeScheduleTask(
  item: TMDBItem,
  task: ScheduleTask,
  logs: LogEntry[]
): Promise<ExecuteResult> {
  // 1. 检查是否有 platformConfigs 且有多个启用的平台
  const enabledPlatforms = task.platformConfigs?.filter(s => s.enabled) || [];
  if (enabledPlatforms.length > 1) {
    return executeMultiPlatformTask(item, task, logs);
  }
  
  // 2. 向后兼容：单平台模式（现有逻辑）
  return executeSinglePlatformTask(item, task, logs);
}

async function executeMultiPlatformTask(
  item: TMDBItem,
  task: ScheduleTask,
  logs: LogEntry[]
): Promise<ExecuteResult> {
  const tmdbImportPath = await getServerConfigValue('tmdb_import_path');
  const csvPath = path.join(tmdbImportPath, 'import.csv');
  const enabledPlatforms = task.platformConfigs!.filter(s => s.enabled);
  
  // 串行抓取各平台
  const platformResults: PlatformCSVResult[] = [];
  
  for (const source of enabledPlatforms) {
    addLog('info', `开始抓取: ${source.url}`);
    
    const headlessFlag = task.headless ? '--headless' : '';
    const command = `python -m tmdb-import ${headlessFlag} "${source.url}"`;
    const result = await executeExternalCommand(command, tmdbImportPath, addLog);
    
    if (result.success && fs.existsSync(csvPath)) {
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      platformResults.push({
        url: source.url,
        csvContent,
        keptFields: source.keepFields,
      });
      addLog('info', `抓取完成: ${source.url}`);
    } else {
      addLog('stderr', `抓取失败: ${source.url}`);
    }
  }
  
  if (platformResults.length === 0) {
    return { success: false, message: '所有平台抓取失败' };
  }
  
  // 合并CSV
  const mergedCSV = mergeMultiPlatformCSVs(platformResults);
  
  // 清理+保存
  const currentMaxEpisode = item.seasons?.reduce(
    (max, season) => Math.max(max, season.currentEpisode || 0), 0
  ) || 0;
  
  const cleanedCSV = cleanCSV(mergedCSV, task.fieldCleanup, currentMaxEpisode, task.incremental);
  fs.writeFileSync(csvPath, cleanedCSV, 'utf-8');
  
  // 计算集数
  const episodeCount = extractEpisodeCount(cleanedCSV);
  
  // 可选：自动导入TMDB
  if (task.autoImport && item.tmdbId) {
    const tmdbUrl = `https://www.themoviedb.org/tv/${item.tmdbId}/season/${task.tmdbSeason || 1}?language=${task.tmdbLanguage || 'zh-CN'}`;
    const tmdbCommand = `python -m tmdb-import ${headlessFlag} "${tmdbUrl}"`;
    await executeInteractiveCommand(tmdbCommand, tmdbImportPath, addLog, task.tmdbAutoResponse || 'w');
  }
  
  return {
    success: true,
    message: `成功更新至第${episodeCount}集（${platformResults.length}个平台合并）`,
    episodeCount,
  };
}
```

# [S9] API route changes

修改 `src/app/api/schedule/tasks/route.ts`：

- POST/PUT 接收新字段：`platformConfigs`
- 验证逻辑：`platformConfigs` 为数组格式

修改 `src/app/api/schedule/execute/route.ts`：

- 手动执行时同样支持多平台模式

# [S10] i18n keys

新增key（6语言）：

```json
{
  "dataSourceMode": "数据来源模式",
  "singlePlatformMode": "单平台模式",
  "multiPlatformMode": "多平台模式",
  "singlePlatformModeDesc": "使用单一平台URL抓取",
  "multiPlatformModeDesc": "串行抓取多个平台并合并",
  "platformSources": "数据来源平台",
  "keepFields": "保留字段",
  "dataSourceModeHelp": "单平台模式使用现有逻辑，多平台模式串行抓取多个平台并按字段合并",
  "platformSourcesHelp": "URL从词条继承，可配置各平台保留的字段"
}
```

# [S11] HelpInfoButton content

```tsx
<HelpInfoButton 
  content={<p>{t("dataSourceModeHelp")}</p>} 
  side="left"
/>
```

# [S12] Error handling

- 某个平台抓取失败：记录日志，继续处理其他平台
- 所有平台都失败：返回错误，不更新DB
- platformConfigs为空：降级到单平台模式

# [S13] Testing

单元测试：
- `csv-cleaner.test.ts`: 测试 `mergeMultiPlatformCSVs` 合并逻辑

集成测试：
- ScheduleTab多平台配置保存/加载
- 手动执行多平台任务

# [S14] Implementation order

1. 类型定义（PlatformSourceConfig）
2. DB迁移（新增platformConfigs列）
3. ScheduleTask类型扩展
4. CSV合并逻辑（mergeMultiPlatformCSVs）
5. Executor多平台逻辑
6. API route更新
7. ScheduleTab UI（模式选择+多平台配置）
8. i18n keys
9. 测试

# [S15] Backward compatibility

- 已有单源任务通过 `platformUrl` 或 `item.platformUrls` 做数据源降级兼容
- 新字段默认值 `[]` 保证旧任务不受影响
- UI：无 `platformConfigs` 时显示原有单平台模式
