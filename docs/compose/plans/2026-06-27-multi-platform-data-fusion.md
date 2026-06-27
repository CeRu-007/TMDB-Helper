> [!NOTE]
> This document may not reflect the current implementation.
> See the final report for up-to-date state:
> [Final Report](../reports/multi-platform-data-fusion.md)

# Multi-Platform Data Fusion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use compose:subagent (recommended) or compose:execute to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在ScheduleTab中支持多平台数据来源：串行抓取多个平台CSV，按字段保留配置合并，最终产出统一import.csv

**Architecture:** 扩展现有ScheduleTask类型，新增platformConfigs字段存储多平台配置。Executor检测多平台模式时串行抓取各平台，按keepFields配置保留字段，合并后进入现有cleanCSV管线。

**Tech Stack:** TypeScript, React, SQLite (better-sqlite3), Node.js

## Global Constraints

- Node 22 required, `--experimental-sqlite` flag for dev
- pnpm required (not npm/yarn)
- `tsc --noEmit` must pass (strict mode, exactOptionalPropertyTypes)
- External TMDB-Import tool不可修改，CSV通过复制保留
- 6语言i18n: zh-CN, en-US, zh-TW, zh-HK, ja-JP, ko-KR
- After editing locale JSON, delete `.next/` directory
- `sonner` for toasts (not react-hot-toast)
- Zustand for state management
- shadcn/ui + Radix UI + Tailwind CSS

---

### Task 1: Type Definitions

**Covers:** [S3]

**Files:**
- Modify: `src/types/schedule.ts`

**Interfaces:**
- Produces: `PlatformSourceConfig`, extended `ScheduleTask`, extended `ScheduleTaskRow`, updated conversion functions

- [ ] **Step 1: Add PlatformSourceConfig type**

```typescript
// Add to src/types/schedule.ts after FieldCleanup interface

export interface PlatformSourceConfig {
  url: string;           // 平台URL（从item.platformUrls继承，不可编辑）
  enabled: boolean;      // 是否启用该平台
  keepFields: FieldCleanup;  // 保留哪些字段（true=保留，false=跳过）
}
```

- [ ] **Step 2: Extend ScheduleTask interface**

```typescript
// Add to ScheduleTask interface in src/types/schedule.ts

export interface ScheduleTask {
  // ... existing fields
  platformConfigs?: PlatformSourceConfig[];
}
```

- [ ] **Step 3: Extend ScheduleTaskRow interface**

```typescript
// Add to ScheduleTaskRow interface in src/types/schedule.ts

export interface ScheduleTaskRow {
  // ... existing fields
  platformConfigs: string | null;  // JSON
}
```

- [ ] **Step 4: Update scheduleTaskRowToScheduleTask**

```typescript
// Update function in src/types/schedule.ts

export function scheduleTaskRowToScheduleTask(row: ScheduleTaskRow): ScheduleTask {
  return {
    // ... existing fields
    platformConfigs: row.platformConfigs ? JSON.parse(row.platformConfigs) : undefined,
  };
}
```

- [ ] **Step 5: Update scheduleTaskToRow**

```typescript
// Update function in src/types/schedule.ts

export function scheduleTaskToRow(task: ScheduleTask): ScheduleTaskRow {
  return {
    // ... existing fields
    platformConfigs: task.platformConfigs ? JSON.stringify(task.platformConfigs) : null,
  };
}
```

- [ ] **Step 6: Update CreateScheduleTaskInput and UpdateScheduleTaskInput**

```typescript
// Add to both interfaces in src/types/schedule.ts

export interface CreateScheduleTaskInput {
  // ... existing fields
  platformConfigs?: PlatformSourceConfig[];
}

export interface UpdateScheduleTaskInput {
  // ... existing fields
  platformConfigs?: PlatformSourceConfig[];
}
```

- [ ] **Step 7: Run typecheck**

```bash
pnpm exec tsc --noEmit
```
Expected: PASS (or only pre-existing errors)

- [ ] **Step 8: Commit**

```bash
git add src/types/schedule.ts
git commit -m "feat(schedule): add PlatformSourceConfig type for multi-platform support"
```

---

### Task 2: Database Migration

**Covers:** [S4]

**Files:**
- Modify: `src/lib/database/schema.ts`
- Create: `src/lib/database/migrations/018-add-platform-configs.ts`

**Interfaces:**
- Consumes: `PlatformSourceConfig` from Task 1
- Produces: Updated `schedule_tasks` table with `platformConfigs` column

- [ ] **Step 1: Increment SCHEMA_VERSION**

```typescript
// In src/lib/database/schema.ts, find SCHEMA_VERSION and increment by 1
export const SCHEMA_VERSION = 18; // was 17
```

- [ ] **Step 2: Add column to CREATE TABLE**

```sql
-- In src/lib/database/schema.ts, add to schedule_tasks table definition
-- After checkMetadataCompleteness column

platformConfigs TEXT DEFAULT '[]',
```

- [ ] **Step 3: Create migration file**

```typescript
// Create src/lib/database/migrations/018-add-platform-configs.ts

import { getDatabase } from '@/lib/database/connection';
import { logger } from '@/lib/utils/logger';

export function migrate018(db: ReturnType<typeof getDatabase>): void {
  logger.info('[Migration 018] Adding platformConfigs to schedule_tasks');
  
  // Check if column already exists
  const tableInfo = db.prepare("PRAGMA table_info(schedule_tasks)").all();
  const hasColumn = Array.from(tableInfo).some((col: any) => col.name === 'platformConfigs');
  
  if (!hasColumn) {
    db.exec(`ALTER TABLE schedule_tasks ADD COLUMN platformConfigs TEXT DEFAULT '[]'`);
    logger.info('[Migration 018] platformConfigs column added');
  } else {
    logger.info('[Migration 018] platformConfigs column already exists');
  }
}
```

- [ ] **Step 4: Register migration in schema.ts**

```typescript
// In src/lib/database/schema.ts, find where migrations are called and add:
import { migrate018 } from '@/lib/database/migrations/018-add-platform-configs';

// In the migration function, add:
migrate018(db);
```

- [ ] **Step 5: Run typecheck**

```bash
pnpm exec tsc --noEmit
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/database/schema.ts src/lib/database/migrations/018-add-platform-configs.ts
git commit -m "feat(db): add platformConfigs column to schedule_tasks table"
```

---

### Task 3: CSV Merge Logic

**Covers:** [S7]

**Files:**
- Modify: `src/lib/scheduler/csv-cleaner.ts`

**Interfaces:**
- Consumes: `PlatformSourceConfig`, `FieldCleanup` from Task 1
- Produces: `mergeMultiPlatformCSVs()` function

- [ ] **Step 1: Add PlatformCSVResult interface**

```typescript
// Add to src/lib/scheduler/csv-cleaner.ts

export interface PlatformCSVResult {
  url: string;
  csvContent: string;
  keptFields: FieldCleanup;
}
```

- [ ] **Step 2: Add mergeMultiPlatformCSVs function**

```typescript
// Add to src/lib/scheduler/csv-cleaner.ts

export function mergeMultiPlatformCSVs(results: PlatformCSVResult[]): string {
  if (results.length === 0) return '';
  if (results.length === 1) return results[0].csvContent;

  // Parse all CSVs
  const parsedResults = results.map(r => ({
    url: r.url,
    data: parseCSV(r.csvContent),
    keptFields: r.keptFields,
  }));

  // Use first platform as base
  const base = parsedResults[0];
  const baseHeaders = base.data.headers;
  const baseRows = base.data.rows;

  // Build episode index for other platforms
  const otherPlatforms = parsedResults.slice(1);
  const otherByEpisode = otherPlatforms.map(platform => {
    const byEpisode = new Map<number, CSVRow>();
    for (const row of platform.data.rows) {
      const epNum = parseInt(row['episode_number'], 10);
      if (!isNaN(epNum)) {
        byEpisode.set(epNum, row);
      }
    }
    return { url: platform.url, keptFields: platform.keptFields, byEpisode };
  });

  // Merge rows
  const mergedRows: CSVRow[] = [];
  for (const baseRow of baseRows) {
    const mergedRow = { ...baseRow };
    const epNum = parseInt(baseRow['episode_number'], 10);

    if (!isNaN(epNum)) {
      // For each other platform, fill empty fields
      for (const platform of otherPlatforms) {
        const platformRow = otherByEpisode.find(p => p.url === platform.url)?.byEpisode.get(epNum);
        if (!platformRow) continue;

        const keptFields = platform.keptFields;
        for (const field of ['name', 'air_date', 'runtime', 'overview', 'backdrop'] as const) {
          if (keptFields[field] && (!mergedRow[field] || mergedRow[field].trim() === '')) {
            mergedRow[field] = platformRow[field] || '';
          }
        }
      }
    }

    mergedRows.push(mergedRow);
  }

  // Serialize back to CSV
  return [
    baseHeaders.join(','),
    ...mergedRows.map(row => 
      baseHeaders.map(h => escapeCSVValue(row[h] || '')).join(',')
    )
  ].join('\n');
}
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm exec tsc --noEmit
```
Expected: PASS

- [ ] **Step 4: Write test**

```typescript
// Create src/lib/scheduler/__tests__/csv-merger.test.ts

import { describe, it, expect } from 'vitest';
import { mergeMultiPlatformCSVs, PlatformCSVResult } from '../csv-cleaner';

describe('mergeMultiPlatformCSVs', () => {
  const baseCSV = `episode_number,name,air_date,overview
1,Episode 1,2024-01-01,Overview from platform A
2,Episode 2,2024-01-08,Overview from platform A
3,,2024-01-15,`;

  const otherCSV = `episode_number,name,air_date,overview
1,Episode 1 Title,2024-01-01,Overview from platform B
2,Episode 2 Title,2024-01-08,Overview from platform B
3,Episode 3 Title,2024-01-15,Overview from platform B`;

  it('should merge CSVs filling empty fields from other platforms', () => {
    const results: PlatformCSVResult[] = [
      {
        url: 'https://platform-a.com',
        csvContent: baseCSV,
        keptFields: { name: true, air_date: true, runtime: true, overview: true, backdrop: true },
      },
      {
        url: 'https://platform-b.com',
        csvContent: otherCSV,
        keptFields: { name: false, air_date: false, runtime: false, overview: true, backdrop: false },
      },
    ];

    const merged = mergeMultiPlatformCSVs(results);
    const lines = merged.split('\n');
    
    // Episode 3 should have overview from platform B
    expect(lines[3]).toContain('Overview from platform B');
    // Episode 3 name should remain empty (not kept from platform B)
    expect(lines[3].split(',')[1]).toBe('');
  });

  it('should return single CSV unchanged when only one result', () => {
    const results: PlatformCSVResult[] = [
      {
        url: 'https://platform-a.com',
        csvContent: baseCSV,
        keptFields: { name: true, air_date: true, runtime: true, overview: true, backdrop: true },
      },
    ];

    const merged = mergeMultiPlatformCSVs(results);
    expect(merged).toBe(baseCSV);
  });

  it('should return empty string for empty results', () => {
    expect(mergeMultiPlatformCSVs([])).toBe('');
  });
});
```

- [ ] **Step 5: Run test**

```bash
pnpm run test:run src/lib/scheduler/__tests__/csv-merger.test.ts
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/scheduler/csv-cleaner.ts src/lib/scheduler/__tests__/csv-merger.test.ts
git commit -m "feat(scheduler): add mergeMultiPlatformCSVs for cross-platform CSV merging"
```

---

### Task 4: Executor Multi-Platform Logic

**Covers:** [S8]

**Files:**
- Modify: `src/lib/scheduler/schedule-executor.ts`

**Interfaces:**
- Consumes: `PlatformSourceConfig` from Task 1, `mergeMultiPlatformCSVs` from Task 3
- Produces: `executeMultiPlatformTask()` function, updated `executeScheduleTask()` routing

- [ ] **Step 1: Add executeMultiPlatformTask function**

```typescript
// Add to src/lib/scheduler/schedule-executor.ts

async function executeMultiPlatformTask(
  item: NonNullable<ReturnType<typeof itemsRepository.findByIdWithRelations>>,
  task: NonNullable<ReturnType<typeof scheduleRepository.findById>>,
  logs: LogEntry[]
): Promise<ExecuteResult> {
  const addLog = (type: 'stdout' | 'stderr' | 'info', message: string) => {
    logs.push({ type, message })
  }

  const tmdbImportPath = await getServerConfigValue('tmdb_import_path')
  if (!tmdbImportPath) {
    return { success: false, message: '请先在设置中配置TMDB-Import工具路径' }
  }

  const csvPath = path.join(tmdbImportPath, 'import.csv')
  const enabledPlatforms = task.platformConfigs?.filter(s => s.enabled) || []
  
  if (enabledPlatforms.length === 0) {
    return { success: false, message: '没有启用的数据来源平台' }
  }

  addLog('info', `开始多平台抓取: ${enabledPlatforms.length}个平台`)
  const headlessFlag = task.headless ? '--headless' : ''

  // 串行抓取各平台
  const platformResults: Array<{ url: string; csvContent: string; keptFields: FieldCleanup }> = []

  for (const source of enabledPlatforms) {
    addLog('info', `开始抓取: ${source.url}`)
    const command = `python -m tmdb-import ${headlessFlag} "${source.url}"`
    
    const result = await executeExternalCommand(command, tmdbImportPath, addLog)
    
    if (result.success && fs.existsSync(csvPath)) {
      const csvContent = fs.readFileSync(csvPath, 'utf-8')
      if (csvContent && csvContent.length > 10) {
        platformResults.push({
          url: source.url,
          csvContent,
          keptFields: source.keepFields,
        })
        addLog('info', `抓取完成: ${source.url} (${csvContent.length} bytes)`)
      } else {
        addLog('stderr', `抓取结果为空: ${source.url}`)
      }
    } else {
      addLog('stderr', `抓取失败: ${source.url}`)
    }
  }

  if (platformResults.length === 0) {
    return { success: false, message: '所有平台抓取失败' }
  }

  // 合并CSV
  addLog('info', `开始合并 ${platformResults.length} 个平台的CSV`)
  const mergedCSV = mergeMultiPlatformCSVs(platformResults)

  // 计算当前最大集数
  const currentMaxEpisode = item.seasons?.reduce(
    (max, season) => Math.max(max, season.currentEpisode || 0), 0
  ) || 0

  // 元数据完整性检查
  let metadataAnalysis = analyzeCSVMetadata(mergedCSV)
  let effectiveEpisodeCount: number | undefined

  if (task.checkMetadataCompleteness) {
    effectiveEpisodeCount = metadataAnalysis.effectiveEpisodeCount
    addLog('info', `元数据完整性检查: 原始${metadataAnalysis.rawEpisodeCount}集, 有效${metadataAnalysis.effectiveEpisodeCount}集`)
  }

  // 增量阈值
  const incrementalThreshold = task.checkMetadataCompleteness && effectiveEpisodeCount !== undefined
    ? Math.min(currentMaxEpisode, effectiveEpisodeCount)
    : currentMaxEpisode

  // 清理CSV
  const cleanedCSV = cleanCSV(mergedCSV, task.fieldCleanup, incrementalThreshold, task.incremental)
  const episodeCount = task.checkMetadataCompleteness ? metadataAnalysis.effectiveEpisodeCount : extractEpisodeCount(cleanedCSV)

  // 保存CSV
  fs.writeFileSync(csvPath, cleanedCSV, 'utf-8')
  addLog('info', `CSV已保存: ${cleanedCSV.length} bytes`)

  // 可选：自动导入TMDB
  if (task.autoImport && item.tmdbId) {
    const tmdbSeason = task.tmdbSeason || 1
    const tmdbLanguage = task.tmdbLanguage || 'zh-CN'
    const tmdbAutoResponse = task.tmdbAutoResponse || 'w'
    addLog('info', `执行TMDB导入: 第${tmdbSeason}季, 语言=${tmdbLanguage}`)

    const tmdbUrl = `https://www.themoviedb.org/tv/${item.tmdbId}/season/${tmdbSeason}?language=${tmdbLanguage}`
    const tmdbCommand = `python -m tmdb-import ${headlessFlag} "${tmdbUrl}"`
    
    const tmdbResult = await executeInteractiveCommand(tmdbCommand, tmdbImportPath, addLog, tmdbAutoResponse)
    if (!tmdbResult.success) {
      addLog('stderr', `TMDB导入失败: ${tmdbResult.error}`)
    }
  }

  const finalMessage = task.checkMetadataCompleteness && metadataAnalysis.incompleteEpisodes.length > 0
    ? `有效更新至第${episodeCount}集（${platformResults.length}个平台合并，第${metadataAnalysis.incompleteEpisodes.join(',')}集元数据不完整）`
    : `成功更新至第${episodeCount}集（${platformResults.length}个平台合并）`

  return {
    success: true,
    message: finalMessage,
    episodeCount,
    rawEpisodeCount: task.checkMetadataCompleteness ? metadataAnalysis.rawEpisodeCount : undefined,
    incompleteEpisodes: task.checkMetadataCompleteness ? metadataAnalysis.incompleteEpisodes : undefined,
    details: JSON.stringify({
      platformCount: platformResults.length,
      platforms: platformResults.map(p => p.url),
      mergedLength: mergedCSV.length,
      cleanedLength: cleanedCSV.length,
      episodeCount,
      autoImport: task.autoImport,
    }),
  }
}
```

- [ ] **Step 2: Update executeScheduleTask routing**

```typescript
// In src/lib/scheduler/schedule-executor.ts, update executeScheduleTask function

export async function executeScheduleTask(
  item: NonNullable<ReturnType<typeof itemsRepository.findByIdWithRelations>>,
  task: NonNullable<ReturnType<typeof scheduleRepository.findById>>,
  logs: LogEntry[]
): Promise<ExecuteResult> {
  // Check for multi-platform mode
  const enabledPlatforms = task.platformConfigs?.filter(s => s.enabled) || []
  if (enabledPlatforms.length > 1) {
    return executeMultiPlatformTask(item, task, logs)
  }

  // Existing single-platform logic...
  // (keep the rest of the existing function unchanged)
}
```

- [ ] **Step 3: Rename existing logic for clarity**

```typescript
// In src/lib/scheduler/schedule-executor.ts, rename the existing main logic to:

async function executeSinglePlatformTask(
  item: NonNullable<ReturnType<typeof itemsRepository.findByIdWithRelations>>,
  task: NonNullable<ReturnType<typeof scheduleRepository.findById>>,
  logs: LogEntry[]
): Promise<ExecuteResult> {
  // Move existing executeScheduleTask logic here (except the routing check)
  // ... existing code ...
}
```

- [ ] **Step 4: Run typecheck**

```bash
pnpm exec tsc --noEmit
```
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/scheduler/schedule-executor.ts
git commit -m "feat(scheduler): add multi-platform execution support"
```

---

### Task 5: API Route Updates

**Covers:** [S9]

**Files:**
- Modify: `src/app/api/schedule/tasks/route.ts`
- Modify: `src/app/api/schedule/execute/route.ts`

**Interfaces:**
- Consumes: `PlatformSourceConfig` from Task 1
- Produces: Updated API endpoints accepting `platformConfigs`

- [ ] **Step 1: Update POST handler in tasks/route.ts**

```typescript
// In src/app/api/schedule/tasks/route.ts, update POST handler

// Find the body destructuring and add:
const { 
  itemId, cron, enabled, headless, incremental, autoImport, 
  tmdbSeason, tmdbLanguage, tmdbAutoResponse, fieldCleanup, 
  checkMetadataCompleteness, platformUrl, platformConfigs 
} = await request.json()

// Add to the scheduleRepository.create call:
const result = scheduleRepository.create({
  itemId,
  cron,
  enabled: enabled ?? true,
  headless: headless ?? true,
  incremental: incremental ?? true,
  autoImport: autoImport ?? false,
  tmdbSeason: tmdbSeason ?? 1,
  tmdbLanguage: tmdbLanguage ?? 'zh-CN',
  tmdbAutoResponse: tmdbAutoResponse ?? 'w',
  fieldCleanup: fieldCleanup ?? { name: false, air_date: false, runtime: false, overview: false, backdrop: false },
  checkMetadataCompleteness: checkMetadataCompleteness ?? false,
  platformUrl: platformUrl ?? null,
  platformConfigs: platformConfigs ?? [],
})
```

- [ ] **Step 2: Update PUT handler in tasks/route.ts**

```typescript
// In src/app/api/schedule/tasks/route.ts, update PUT handler

// Find the body destructuring and add platformConfigs:
const { 
  id, cron, enabled, headless, incremental, autoImport, 
  tmdbSeason, tmdbLanguage, tmdbAutoResponse, fieldCleanup, 
  checkMetadataCompleteness, platformUrl, platformConfigs 
} = await request.json()

// Add to the scheduleRepository.update call:
const result = scheduleRepository.update(id, {
  cron,
  enabled,
  headless,
  incremental,
  autoImport,
  tmdbSeason,
  tmdbLanguage,
  tmdbAutoResponse,
  fieldCleanup,
  checkMetadataCompleteness,
  platformUrl,
  platformConfigs,
})
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm exec tsc --noEmit
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/app/api/schedule/tasks/route.ts
git commit -m "feat(api): accept platformConfigs in schedule tasks API"
```

---

### Task 6: ScheduleTab UI - Mode Selection

**Covers:** [S5.1], [S5.2]

**Files:**
- Modify: `src/features/media-maintenance/components/item-detail/components/ScheduleTab.tsx`

**Interfaces:**
- Consumes: `PlatformSourceConfig` from Task 1
- Produces: Mode selection UI (single/multi platform)

- [ ] **Step 1: Add state for multi-platform mode**

```typescript
// In ScheduleTab.tsx, add new state variables

const [multiPlatformMode, setMultiPlatformMode] = useState(false)
const [platformConfigs, setPlatformConfigs] = useState<PlatformSourceConfig[]>([])
```

- [ ] **Step 2: Initialize platformConfigs from task**

```typescript
// In ScheduleTab.tsx, update loadTask function

// After setting other task fields, add:
if (data.data.platformConfigs && data.data.platformConfigs.length > 0) {
  setPlatformConfigs(data.data.platformConfigs)
  setMultiPlatformMode(true)
} else {
  // Initialize from item.platformUrls
  const initialConfigs: PlatformSourceConfig[] = (item.platformUrls || []).map((url, idx) => ({
    url,
    enabled: true,
    keepFields: { name: true, air_date: true, runtime: true, overview: true, backdrop: true },
  }))
  setPlatformConfigs(initialConfigs)
  setMultiPlatformMode(false)
}
```

- [ ] **Step 3: Add mode selection UI**

```tsx
// In ScheduleTab.tsx, add before the platform URL section

{/* 数据来源模式 */}
{item.platformUrls && item.platformUrls.length > 1 && (
  <div className="space-y-2">
    <div className="flex items-center space-x-2">
      <Label>{t("dataSourceMode")}</Label>
      <HelpInfoButton 
        content={<p>{t("dataSourceModeHelp")}</p>} 
        side="left"
      />
    </div>
    <div className="flex gap-2">
      <Button
        type="button"
        variant={!multiPlatformMode ? "default" : "outline"}
        size="sm"
        onClick={() => setMultiPlatformMode(false)}
        className={`flex-1 h-7 text-xs ${!multiPlatformMode ? "bg-green-600 hover:bg-green-700" : ""}`}
      >
        {t("singlePlatformMode")}
      </Button>
      <Button
        type="button"
        variant={multiPlatformMode ? "default" : "outline"}
        size="sm"
        onClick={() => setMultiPlatformMode(true)}
        className={`flex-1 h-7 text-xs ${multiPlatformMode ? "bg-blue-600 hover:bg-blue-700" : ""}`}
      >
        {t("multiPlatformMode")}
      </Button>
    </div>
    <p className="text-[10px] text-muted-foreground">
      {multiPlatformMode ? t("multiPlatformModeDesc") : t("singlePlatformModeDesc")}
    </p>
  </div>
)}
```

- [ ] **Step 4: Conditionally render platform URL selector**

```tsx
// In ScheduleTab.tsx, wrap existing platform URL section with condition

{/* 播出平台 URL 选择 - 仅单平台模式 */}
{!multiPlatformMode && item.platformUrls && item.platformUrls.length > 0 && (
  // ... existing platform URL selector code ...
)}
```

- [ ] **Step 5: Run typecheck**

```bash
pnpm exec tsc --noEmit
```
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/media-maintenance/components/item-detail/components/ScheduleTab.tsx
git commit -m "feat(ui): add platform mode selection to ScheduleTab"
```

---

### Task 7: ScheduleTab UI - Multi-Platform Config

**Covers:** [S5.3], [S5.4]

**Files:**
- Modify: `src/features/media-maintenance/components/item-detail/components/ScheduleTab.tsx`

**Interfaces:**
- Consumes: `PlatformSourceConfig` from Task 1
- Produces: Multi-platform configuration UI

- [ ] **Step 1: Add multi-platform config UI**

```tsx
// In ScheduleTab.tsx, add after mode selection

{/* 多平台配置 */}
{multiPlatformMode && platformConfigs.length > 0 && (
  <div className="space-y-2">
    <div className="flex items-center space-x-2">
      <Label>{t("platformSources")}</Label>
      <HelpInfoButton 
        content={<p>{t("platformSourcesHelp")}</p>} 
        side="left"
      />
    </div>
    
    <div className="space-y-3">
      {platformConfigs.map((config, idx) => (
        <div key={config.url} className="border rounded-md p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={`platform-${idx}`}
                checked={config.enabled}
                onCheckedChange={(checked) => {
                  const newConfigs = [...platformConfigs]
                  newConfigs[idx] = { ...config, enabled: checked === true }
                  setPlatformConfigs(newConfigs)
                }}
              />
              <Label htmlFor={`platform-${idx}`} className="text-xs font-mono break-all">
                {config.url}
              </Label>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {idx === 0 ? t("primarySource") : `${t("source")} ${idx + 1}`}
            </span>
          </div>
          
          {/* 保留字段配置 */}
          {config.enabled && (
            <div className="pl-6 space-y-1">
              <Label className="text-[10px] text-muted-foreground">{t("keepFields")}</Label>
              <div className="flex flex-wrap gap-2">
                {(['name', 'air_date', 'runtime', 'overview', 'backdrop'] as const).map(field => (
                  <div key={field} className="flex items-center space-x-1">
                    <Checkbox
                      id={`field-${idx}-${field}`}
                      checked={config.keepFields[field]}
                      onCheckedChange={(checked) => {
                        const newConfigs = [...platformConfigs]
                        newConfigs[idx] = {
                          ...config,
                          keepFields: { ...config.keepFields, [field]: checked === true },
                        }
                        setPlatformConfigs(newConfigs)
                      }}
                    />
                    <Label htmlFor={`field-${idx}-${field}`} className="text-[10px]">
                      {field}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 2: Update handleSave to include platformConfigs**

```typescript
// In ScheduleTab.tsx, update handleSave function

const handleSave = async () => {
  if (!isValidCron) return

  setSaving(true)
  try {
    const method = task ? "PUT" : "POST"
    const body = task
      ? { 
          id: task.id, 
          cron: cronInput, 
          enabled, 
          headless, 
          incremental, 
          autoImport, 
          tmdbSeason, 
          tmdbLanguage, 
          tmdbAutoResponse, 
          fieldCleanup, 
          checkMetadataCompleteness, 
          platformUrl: multiPlatformMode ? platformConfigs[0]?.url : platformUrl,
          platformConfigs: multiPlatformMode ? platformConfigs : [],
        }
      : { 
          itemId: item.id, 
          cron: cronInput, 
          enabled, 
          headless, 
          incremental, 
          autoImport, 
          tmdbSeason, 
          tmdbLanguage, 
          tmdbAutoResponse, 
          fieldCleanup, 
          checkMetadataCompleteness, 
          platformUrl: multiPlatformMode ? platformConfigs[0]?.url : platformUrl,
          platformConfigs: multiPlatformMode ? platformConfigs : [],
        }

    // ... rest of save logic unchanged
  }
}
```

- [ ] **Step 3: Run typecheck**

```bash
pnpm exec tsc --noEmit
```
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/features/media-maintenance/components/item-detail/components/ScheduleTab.tsx
git commit -m "feat(ui): add multi-platform configuration panel to ScheduleTab"
```

---

### Task 8: i18n Keys

**Covers:** [S10], [S11]

**Files:**
- Modify: `src/lib/i18n/locales/zh-CN/schedule.json`
- Modify: `src/lib/i18n/locales/en-US/schedule.json`
- Modify: `src/lib/i18n/locales/zh-TW/schedule.json`
- Modify: `src/lib/i18n/locales/zh-HK/schedule.json`
- Modify: `src/lib/i18n/locales/ja-JP/schedule.json`
- Modify: `src/lib/i18n/locales/ko-KR/schedule.json`

**Interfaces:**
- Produces: i18n keys for multi-platform UI

- [ ] **Step 1: Add zh-CN keys**

```json
// In src/lib/i18n/locales/zh-CN/schedule.json, add:

"dataSourceMode": "数据来源模式",
"singlePlatformMode": "单平台模式",
"multiPlatformMode": "多平台模式",
"singlePlatformModeDesc": "使用单一平台URL抓取",
"multiPlatformModeDesc": "串行抓取多个平台并合并",
"platformSources": "数据来源平台",
"keepFields": "保留字段",
"primarySource": "主源",
"source": "来源",
"dataSourceModeHelp": "单平台模式使用现有逻辑，多平台模式串行抓取多个平台并按字段合并",
"platformSourcesHelp": "URL从词条继承，可配置各平台保留的字段"
```

- [ ] **Step 2: Add en-US keys**

```json
// In src/lib/i18n/locales/en-US/schedule.json, add:

"dataSourceMode": "Data Source Mode",
"singlePlatformMode": "Single Platform",
"multiPlatformMode": "Multi Platform",
"singlePlatformModeDesc": "Scrape using a single platform URL",
"multiPlatformModeDesc": "Serially scrape multiple platforms and merge",
"platformSources": "Data Sources",
"keepFields": "Keep Fields",
"primarySource": "Primary",
"source": "Source",
"dataSourceModeHelp": "Single platform uses existing logic, multi platform serially scrapes multiple platforms and merges by field",
"platformSourcesHelp": "URLs inherited from item, configure which fields to keep from each platform"
```

- [ ] **Step 3: Add zh-TW keys**

```json
// In src/lib/i18n/locales/zh-TW/schedule.json, add:

"dataSourceMode": "資料來源模式",
"singlePlatformMode": "單平台模式",
"multiPlatformMode": "多平台模式",
"singlePlatformModeDesc": "使用單一平台URL抓取",
"multiPlatformModeDesc": "串行抓取多個平台並合併",
"platformSources": "資料來源平台",
"keepFields": "保留欄位",
"primarySource": "主源",
"source": "來源",
"dataSourceModeHelp": "單平台模式使用現有邏輯，多平台模式串行抓取多個平台並按欄位合併",
"platformSourcesHelp": "URL從詞條繼承，可配置各平台保留的欄位"
```

- [ ] **Step 4: Add zh-HK keys**

```json
// In src/lib/i18n/locales/zh-HK/schedule.json, add:

"dataSourceMode": "資料來源模式",
"singlePlatformMode": "單平台模式",
"multiPlatformMode": "多平台模式",
"singlePlatformModeDesc": "使用單一平台URL抓取",
"multiPlatformModeDesc": "串行抓取多個平台並合併",
"platformSources": "資料來源平台",
"keepFields": "保留欄位",
"primarySource": "主源",
"source": "來源",
"dataSourceModeHelp": "單平台模式使用現有邏輯，多平台模式串行抓取多個平台並按欄位合併",
"platformSourcesHelp": "URL從詞條繼承，可配置各平台保留的欄位"
```

- [ ] **Step 5: Add ja-JP keys**

```json
// In src/lib/i18n/locales/ja-JP/schedule.json, add:

"dataSourceMode": "データソースモード",
"singlePlatformMode": "シングルプラットフォーム",
"multiPlatformMode": "マルチプラットフォーム",
"singlePlatformModeDesc": "単一プラットフォームURLでスクレイピング",
"multiPlatformModeDesc": "複数プラットフォームをシリアルにスクレイピングして統合",
"platformSources": "データソース",
"keepFields": "保持フィールド",
"primarySource": "プライマリ",
"source": "ソース",
"dataSourceModeHelp": "シングルは既存のロジック、マルチは複数プラットフォームをシリアルにスクレイピングしフィールド単位で統合",
"platformSourcesHelp": "URLはアイテムから継承、各プラットフォームの保持フィールドを設定可能"
```

- [ ] **Step 6: Add ko-KR keys**

```json
// In src/lib/i18n/locales/ko-KR/schedule.json, add:

"dataSourceMode": "데이터 소스 모드",
"singlePlatformMode": "단일 플랫폼",
"multiPlatformMode": "다중 플랫폼",
"singlePlatformModeDesc": "단일 플랫폼 URL로 스크래핑",
"multiPlatformModeDesc": "여러 플랫폼을 순차적으로 스크래핑하여 병합",
"platformSources": "데이터 소스",
"keepFields": "유지 필드",
"primarySource": "기본",
"source": "소스",
"dataSourceModeHelp": "단일은 기존 로직, 다중은 여러 플랫폼을 순차적으로 스크래핑하여 필드 단위로 병합",
"platformSourcesHelp": "URL은 아이템에서 상속, 각 플랫폼의 유지 필드를 설정 가능"
```

- [ ] **Step 7: Delete .next directory**

```bash
rm -rf .next
```

- [ ] **Step 8: Run typecheck**

```bash
pnpm exec tsc --noEmit
```
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/lib/i18n/locales/
git commit -m "feat(i18n): add multi-platform keys for 6 languages"
```

---

### Task 9: Integration Test

**Covers:** [S13]

**Files:**
- Create: `src/features/media-maintenance/components/item-detail/components/__tests__/ScheduleTab.multi-platform.test.tsx`

**Interfaces:**
- Consumes: All previous tasks
- Produces: Integration test for multi-platform configuration

- [ ] **Step 1: Write integration test**

```typescript
// Create src/features/media-maintenance/components/item-detail/components/__tests__/ScheduleTab.multi-platform.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ScheduleTab } from '../ScheduleTab';
import { TMDBItem } from '@/types/tmdb-item';

// Mock fetch
global.fetch = vi.fn();

describe('ScheduleTab Multi-Platform', () => {
  const mockItem: TMDBItem = {
    id: 'test-item-1',
    tmdbId: 12345,
    title: 'Test Show',
    platformUrls: [
      'https://www.mgtv.com/123.html',
      'https://tv.cctv.com/456.html',
      'https://www.viu.com/789.html',
    ],
    defaultPlatformUrl: 'https://www.mgtv.com/123.html',
    // ... other required fields
  } as TMDBItem;

  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, data: null }),
    });
  });

  it('should show mode selection when multiple platformUrls exist', () => {
    render(<ScheduleTab item={mockItem} />);
    
    expect(screen.getByText('数据来源模式')).toBeTruthy();
    expect(screen.getByText('单平台模式')).toBeTruthy();
    expect(screen.getByText('多平台模式')).toBeTruthy();
  });

  it('should show platform config when multi-platform mode is selected', async () => {
    render(<ScheduleTab item={mockItem} />);
    
    fireEvent.click(screen.getByText('多平台模式'));
    
    await waitFor(() => {
      expect(screen.getByText('数据来源平台')).toBeTruthy();
      expect(screen.getByText('https://www.mgtv.com/123.html')).toBeTruthy();
      expect(screen.getByText('https://tv.cctv.com/456.html')).toBeTruthy();
      expect(screen.getByText('https://www.viu.com/789.html')).toBeTruthy();
    });
  });

  it('should save platformConfigs when saving task', async () => {
    render(<ScheduleTab item={mockItem} />);
    
    fireEvent.click(screen.getByText('多平台模式'));
    
    await waitFor(() => {
      expect(screen.getByText('数据来源平台')).toBeTruthy();
    });
    
    // Click save button
    fireEvent.click(screen.getByText('保存配置'));
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/schedule/tasks',
        expect.objectContaining({
          body: expect.stringContaining('platformConfigs'),
        })
      );
    });
  });
});
```

- [ ] **Step 2: Run test**

```bash
pnpm run test:run src/features/media-maintenance/components/item-detail/components/__tests__/ScheduleTab.multi-platform.test.tsx
```
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/features/media-maintenance/components/item-detail/components/__tests__/ScheduleTab.multi-platform.test.tsx
git commit -m "test(ui): add integration test for multi-platform ScheduleTab"
```

---

### Task 10: Final Verification

**Covers:** All sections

**Files:** None (verification only)

**Interfaces:** None

- [ ] **Step 1: Run full typecheck**

```bash
pnpm exec tsc --noEmit
```
Expected: PASS

- [ ] **Step 2: Run lint**

```bash
pnpm run lint
```
Expected: PASS

- [ ] **Step 3: Run format check**

```bash
pnpm run format:check
```
Expected: PASS

- [ ] **Step 4: Run all tests**

```bash
pnpm run test:run
```
Expected: PASS

- [ ] **Step 5: Manual verification checklist**

- [ ] ScheduleTab shows mode selection when item has multiple platformUrls
- [ ] Single platform mode works as before (backward compatible)
- [ ] Multi-platform mode shows platform config panel
- [ ] Platform configs can be enabled/disabled
- [ ] Keep fields can be configured per platform
- [ ] Task saves with platformConfigs
- [ ] Manual execution works in multi-platform mode
- [ ] CSV is properly merged from multiple platforms

- [ ] **Step 6: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address review feedback for multi-platform data fusion"
```
