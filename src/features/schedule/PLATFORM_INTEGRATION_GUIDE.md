# 时间表平台API集成指南

本文档描述如何为时间表功能集成新的视频平台API，以及实现过程中遇到的问题和解决方案。

## 目录结构

```
src/features/schedule/
├── components/           # UI组件
│   ├── schedule-view.tsx
│   ├── schedule-week-view.tsx
│   ├── schedule-day-column.tsx
│   ├── schedule-episode-card.tsx
│   └── schedule-image.tsx
├── lib/
│   ├── adapters/         # 平台适配器
│   │   ├── bilibili-adapter.ts
│   │   └── iqiyi-adapter.ts
│   ├── platform-config.ts
│   └── platform-manager.ts
└── types/
    └── schedule.ts       # 类型定义
```

## 分类筛选功能

### 功能概述

时间表支持四种分类筛选：

- **全部**：显示所有内容
- **动漫**：只显示动漫内容
- **影剧**：只显示影剧（电视剧）内容
- **已追**：只显示用户已追的剧集

### 实现原理

#### 1. contentType 字段

在 `ScheduleEpisode` 接口中添加了 `contentType` 字段，用于标识内容类型：

```typescript
export interface ScheduleEpisode {
  // ... 其他字段
  contentType?: 'anime' | 'domestic';
}
```

#### 2. 适配器中设置 contentType

每个平台适配器需要在 `transformEpisode` 方法中设置 `contentType` 字段：

**动漫平台（如 B站、爱奇艺）：**

```typescript
private transformEpisode(episode: any): ScheduleEpisode {
  return {
    // ... 其他字段
    contentType: 'anime'
  }
}
```

**影剧平台（如腾讯视频、优酷）：**

```typescript
private transformEpisode(episode: any): ScheduleEpisode {
  return {
    // ... 其他字段
    contentType: 'domestic'
  }
}
```

#### 3. 筛选逻辑

在 `schedule-view.tsx` 中实现了 `filterEpisodesByCategory` 函数：

```typescript
function filterEpisodesByCategory(
  weekData: ScheduleDay[],
  category: CategoryType,
  followingIds: Set<string>
): ScheduleDay[] {
  // 全部：返回所有数据
  if (category === 'all') {
    return weekData;
  }

  // 已追：只显示已追的剧集
  if (category === 'following') {
    return weekData.map((day) => ({
      ...day,
      episodes: day.episodes.filter((ep) => followingIds.has(ep.id)),
    }));
  }

  // 动漫：筛选 contentType 为 'anime' 的剧集
  if (category === 'anime') {
    return weekData.map((day) => ({
      ...day,
      episodes: day.episodes.filter((ep) => ep.contentType === 'anime'),
    }));
  }

  // 影剧：筛选 contentType 为 'domestic' 的剧集
  if (category === 'domestic') {
    return weekData.map((day) => ({
      ...day,
      episodes: day.episodes.filter((ep) => ep.contentType === 'domestic'),
    }));
  }

  return weekData;
}
```

#### 4. 空状态提示

当选择某个分类但该分类没有数据时，会显示友好的空状态提示：

**周视图和日视图中的空状态：**

- **影剧分类无数据**：显示"暂无影剧数据，功能开发中，敬请期待~"
- **其他分类无数据**：显示"暂无更新"或"本日暂无更新"

**实现位置：**

- `schedule-day-column.tsx` - 周视图的日列
- `schedule-day-view.tsx` - 日视图

```typescript
{day.episodes.length === 0 && (
  <div className="text-center py-8 text-gray-400">
    {selectedCategory === 'domestic' ? (
      <>
        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-xs">暂无影剧数据</p>
        <p className="text-[10px] mt-1 opacity-70">功能开发中，敬请期待~</p>
      </>
    ) : (
      <>
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-xs">暂无更新</p>
      </>
    )}
  </div>
)}
```

### 集成新平台时的注意事项

在实现新的平台适配器时，必须设置 `contentType` 字段：

```typescript
class YourPlatformAdapter implements PlatformScheduleAdapter {
  private transformEpisode(episode: any): ScheduleEpisode {
    return {
      id: episode.id,
      title: episode.title,
      cover: episode.cover,
      pubTime: episode.pubTime,
      pubIndex: episode.pubIndex,
      published: episode.published,
      url: episode.url,
      platform: '平台名称',
      // ⚠️ 重要：必须设置 contentType 字段
      contentType: 'anime', // 或 'domestic'
    };
  }
}
```

### 分类规则

| 平台类型 | contentType      | 示例                                           |
| -------- | ---------------- | ---------------------------------------------- |
| 动漫平台 | `'anime'`        | B站、爱奇艺动漫、腾讯动漫                      |
| 影剧平台 | `'domestic'`     | 腾讯视频、优酷、芒果TV                         |
| 混合平台 | 根据剧集类型设置 | 如某平台既有动漫又有影剧，需要根据具体剧集设置 |

### 测试建议

1. **测试筛选功能**：
   - 切换不同分类，验证是否正确筛选
   - 检查空状态提示是否正确显示

2. **测试多平台数据**：
   - 确保动漫平台和影剧平台的数据能正确筛选
   - 验证"全部"分类显示所有内容

3. **测试边界情况**：
   - 测试没有数据时的空状态
   - 测试单个平台的数据筛选

### 常见问题

#### Q1: 为什么我的平台数据没有显示？

**可能原因：**

- 没有设置 `contentType` 字段
- `contentType` 值设置错误

**解决方法：**

```typescript
// 检查适配器中是否设置了 contentType
console.log('[Debug] Content type:', episode.contentType);
// 应该显示: 'anime' 或 'domestic'
```

#### Q2: 如何判断一个平台应该设置什么 contentType？

**判断标准：**

- **动漫平台**：主要提供动漫、番剧、国创等动画内容
- **影剧平台**：主要提供电视剧、电影等真人影视内容

**如果平台既有动漫又有影剧：**

- 根据每个剧集的具体类型设置 `contentType`
- 或者在适配器中根据剧集的标签/类型字段进行判断

#### Q3: 可以添加更多分类吗？

**可以扩展，但需要：**

1. 修改 `CategoryType` 类型定义：

   ```typescript
   type CategoryType = 'all' | 'anime' | 'domestic' | 'following' | 'movie';
   ```

2. 更新 `CATEGORIES` 数组：

   ```typescript
   const CATEGORIES = [
     { id: 'all', label: '全部', color: 'bg-gray-500' },
     { id: 'anime', label: '动漫', color: 'bg-blue-500' },
     { id: 'domestic', label: '影剧', color: 'bg-amber-500' },
     { id: 'following', label: '已追', color: 'bg-rose-500' },
     { id: 'movie', label: '电影', color: 'bg-purple-500' },
   ];
   ```

3. 在 `filterEpisodesByCategory` 中添加对应的筛选逻辑

### 未来扩展

1. **智能分类**：基于剧集的标签、标题等信息自动判断内容类型
2. **自定义分类**：允许用户自定义分类规则
3. **多维度筛选**：支持按平台、类型、状态等多维度筛选

## 集成新平台API的步骤

### 1. 创建适配器类

在 `lib/adapters/` 目录下创建新的适配器文件，实现 `PlatformScheduleAdapter` 接口：

```typescript
import {
  PlatformScheduleAdapter,
  ScheduleResponse,
  ScheduleDay,
  ScheduleEpisode,
} from '../types/schedule';

class YourPlatformAdapter implements PlatformScheduleAdapter {
  name = '平台名称';
  platformId = 'platform-id';
  color = 'from-color-500 to-color-600';
  icon = '🎬';

  async fetchSchedule(): Promise<ScheduleResponse> {
    // 实现获取时间表数据的逻辑
    const response = await fetch('/api/schedule/your-platform/endpoint', {
      headers: {
        Accept: 'application/json',
        'Cache-Control': 'no-cache',
      },
      cache: 'no-store',
    });

    const data = await response.json();
    return this.transformResponse(data);
  }

  private transformResponse(data: any): ScheduleResponse {
    // 将平台API返回的数据转换为标准格式
    return {
      code: 0,
      message: 'success',
      result: { list: transformedDays },
    };
  }

  private transformDay(day: any): ScheduleDay {
    return {
      date: day.date, // 格式: YYYY-MM-DD
      dayOfWeek: day.dayOfWeek, // 1-7 (周一为1)
      isToday: day.isToday, // boolean
      episodes: day.episodes.map((ep) => this.transformEpisode(ep)),
    };
  }

  private transformEpisode(episode: any): ScheduleEpisode {
    return {
      id: episode.id,
      title: episode.title,
      cover: episode.cover, // 图片URL
      pubTime: episode.pubTime, // 播出时间 (HH:MM)
      pubIndex: episode.pubIndex, // 更新集数
      published: episode.published, // 是否已发布
      url: episode.url, // 播放页面URL
      contentType: 'anime', // ⚠️ 必须设置：'anime'（动漫）或 'domestic'（影剧）
    };
  }
}

export const yourPlatformAdapter = new YourPlatformAdapter();
```

### 2. 注册适配器

在 `lib/platform-manager.ts` 中注册新适配器：

```typescript
import { yourPlatformAdapter } from './adapters/your-platform-adapter';

class SchedulePlatformManager {
  constructor() {
    this.registerAdapter(bilibiliAdapter);
    this.registerAdapter(iqiyiAdapter);
    this.registerAdapter(yourPlatformAdapter); // 添加新适配器
  }
}
```

### 3. 创建后端API路由

在 `src/app/api/schedule/your-platform/` 目录下创建API路由文件：

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const response = await fetch('YOUR_PLATFORM_API_URL', {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 ...',
        Accept: 'application/json',
        Referer: 'YOUR_PLATFORM_REFERER',
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({
      code: -1,
      message: 'Failed to fetch data',
      result: { list: [] },
    });
  }
}
```

### 4. 配置平台信息

在 `lib/platform-config.ts` 中添加平台配置：

```typescript
export const PLATFORM_CONFIG = {
  yourPlatform: {
    id: 'your-platform',
    name: '平台名称',
    color: 'from-color-500 to-color-600',
    icon: '🎬',
  },
};
```

### 5. 图片代理配置（如果需要）

如果平台图片有防盗链，需要在 `src/app/api/schedule/image-proxy/route.ts` 中添加域名白名单：

```typescript
const ALLOWED_HOSTS = [
  'bilibili.com',
  'iqiyipic.com',
  'your-platform.com', // 添加新平台的图片域名
];
```

## 实现爱奇艺API时遇到的问题

### 问题1: API返回500错误

**问题描述**: 初始实现时，爱奇艺API返回500 Internal Server Error。

**原因**: 后端API路由缺少错误处理，当爱奇艺API返回非200状态码时，未捕获异常直接抛出。

**解决方案**: 在所有API路由中添加 try-catch 错误处理：

```typescript
try {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return NextResponse.json(await response.json());
} catch (error) {
  console.error('Error:', error);
  return NextResponse.json(
    {
      code: -1,
      message: 'Failed to fetch data',
      error: error instanceof Error ? error.message : 'Unknown error',
    },
    { status: 500 }
  );
}
```

### 问题2: 日期计算错误导致年份错误

**问题描述**: 爱奇艺API返回的日期格式为 `MM-DD`（如 `01-29`），需要补全年份。初始实现中，2月2日的日期被错误计算为2025年，而不是2026年。

**原因**: 日期计算逻辑存在缺陷，使用简单的月份/日期比较来判断年份，在某些情况下会出错。

**解决方案**: 采用智能的基准年份计算方法：

```typescript
// 找到时间表中最接近今天的日期
let closestDate: IqiyiDateTab | null = null;
let minDistance = Infinity;

for (const tab of dateTabs) {
  const [month, day] = tab.date.split('-').map(Number);
  const targetDate = new Date(currentYear, month - 1, day);
  const distance = Math.abs(targetDate.getTime() - today.getTime());

  if (distance < minDistance) {
    minDistance = distance;
    closestDate = tab;
  }
}

// 根据最接近的日期确定年份
let year = currentYear;
if (closestDate) {
  const [month, day] = closestDate.date.split('-').map(Number);
  const targetDate = new Date(currentYear, month - 1, day);
  if (targetDate > today) {
    year = currentYear - 1;
  }
}
```

### 问题3: 爱奇艺数据不显示

**问题描述**: 爱奇艺API返回了26条数据，但前端只显示B站的数据。

**原因**: 前端在合并多平台数据时，只选择每个星期几的第一个匹配日期，导致爱奇艺的数据被B站的数据覆盖。

**解决方案**: 修改合并逻辑，合并所有相同星期几的数据：

```typescript
const weekData = WEEKDAYS.map((_, dayIndex) => {
  const sameDayOfWeek = scheduleData.filter((day) => day.dayOfWeek === dayIndex + 1);

  if (sameDayOfWeek.length === 0) {
    return {
      date: '',
      dayOfWeek: dayIndex + 1,
      isToday: false,
      episodes: [],
    };
  }

  const todayEntry = sameDayOfWeek.find((d) => d.isToday) || sameDayOfWeek[0];
  const allEpisodes = sameDayOfWeek.flatMap((day) => day.episodes);

  return {
    date: todayEntry.date,
    dayOfWeek: dayIndex + 1,
    isToday: todayEntry.isToday,
    episodes: allEpisodes,
  };
});
```

### 问题4: 海报图片不显示

**问题描述**: 爱奇艺的海报图片无法加载。

**原因**:

1. 图片格式为 `.avif`，代码尝试将其转换为 `.jpg`，但服务器不支持这种简单的文件名替换
2. 爱奇艺图片有防盗链保护，需要通过代理加载

**解决方案**:

1. 移除图片格式转换，保持原始的 `.avif` 格式（现代浏览器都支持）
2. 将爱奇艺的图片域名添加到图片代理白名单：

```typescript
const IQIYI_IMAGE_DOMAINS = [
  'pic0.iqiyipic.com',
  'pic1.iqiyipic.com',
  // ... pic9.iqiyipic.com
];

const isIqiyiImage = IQIYI_IMAGE_DOMAINS.some((domain) => processed.toLowerCase().includes(domain));

if (isIqiyiImage) {
  processed = `/api/schedule/image-proxy?url=${encodeURIComponent(processed)}`;
}
```

### 问题5: 海报图片模糊

**问题描述**: 爱奇艺的海报图片显示模糊。

**原因**: 爱奇艺API返回的图片URL包含尺寸参数 `120_160`，这是小尺寸图片（120x160像素）。

**解决方案**: 将图片URL中的尺寸参数替换为更大的尺寸：

```typescript
if (cover && cover.includes('_120_160')) {
  cover = cover.replace('_120_160', '_480_640');
}
```

### 问题6: 剧集标题包含类型标签

**问题描述**: 爱奇艺的剧集标题后面附加了类型标签（如"医神-玄幻"），导致标题显示不纯粹。

**原因**: 代码错误地将 `tag.gray` 字段的内容附加到标题后面。

**解决方案**: 直接使用标题，不附加标签：

```typescript
const title = titleMeta?.text || '未知标题';
// 不再添加: title: tagText ? `${title} ${tagText}` : title
title: title;
```

### 问题7: 更新集数显示错误

**问题描述**: 爱奇艺的剧集显示"更新至更新中"，因为爱奇艺API不返回具体集数，只返回"更新中"。

**原因**: 前端硬编码了"更新至"前缀，对所有平台都适用。

**解决方案**: 根据pubIndex内容动态决定是否添加"更新至"前缀：

```typescript
{
  episode.pubIndex.startsWith('更新') ? episode.pubIndex : `更新至${episode.pubIndex}`;
}
```

### 问题8: 点击播放跳转错误

**问题描述**: 点击爱奇艺剧集的播放按钮，跳转到404页面或爱奇艺主页。

**原因**:

1. 爱奇艺的播放页面URL格式为 `https://www.iqiyi.com/v_{字符串ID}.html`（如 `v_xs7i0ed0n8.html`）
2. 但时间表API只返回数字ID（如 `3784317657367801`），无法直接构建播放URL
3. 专辑页面URL `https://www.iqiyi.com/lib/{数字ID}.html` 会重定向到主页

**解决方案**: 使用搜索URL作为临时方案：

```typescript
const url = `https://so.iqiyi.com/so/q_${encodeURIComponent(title)}`;
```

**注意**: 要获得直接的播放URL，需要调用爱奇艺的详情API获取字符串ID，但目前找到的详情API端点返回404，可能需要找到正确的API接口。

### 问题9: 缺少播出时间和更新集数信息

**问题描述**: 爱奇艺API的时间表数据不包含播出时间和更新集数。

**原因**: 爱奇艺的 `daily_hot_content` 接口只提供时间表的基础信息，不包含详细的播出时间和更新进度。

**解决方案**: 使用默认值：

```typescript
const pubTime = pubTimeMeta?.text || '00:00';
const pubIndex = pubIndexMeta?.text || '更新中';
```

**注意**: 要获取这些信息，可能需要调用爱奇艺的剧集详情API。

## 最佳实践

### 1. 错误处理

- 所有API调用都应该有 try-catch
- 返回统一格式的错误响应
- 记录详细的错误日志

### 2. 数据验证

- 验证API返回的数据结构
- 提供默认值防止空值导致的错误
- 使用TypeScript类型确保数据正确性

### 3. 图片处理

- 使用图片代理解决防盗链问题
- 适当提高图片尺寸以获得更好的显示效果
- 保持原始图片格式（如avif），现代浏览器都支持

### 4. 日期处理

- 统一使用 ISO 格式 `YYYY-MM-DD`
- 正确计算年份，考虑跨年情况
- 使用 `dayOfWeek` 字段（1-7，周一为1）

### 5. URL处理

- 检查URL是否需要代理
- 验证URL格式是否正确
- 考虑使用搜索URL作为备选方案

### 6. 性能优化

- 使用 `cache: 'no-store'` 避免缓存过期数据
- 并行请求多个日期的数据
- 合理设置缓存时长

## 测试建议

### 1. 单元测试

- 测试数据转换逻辑
- 测试日期计算逻辑
- 测试错误处理

### 2. 集成测试

- 测试完整的API调用流程
- 测试多平台数据合并
- 测试图片加载

### 3. 端到端测试

- 测试用户界面显示
- 测试点击跳转功能
- 测试不同平台的数据一致性

## 注意事项

1. **API稳定性**: 第三方API可能随时变化，需要做好错误处理和降级方案
2. **数据一致性**: 不同平台的数据格式可能不同，需要统一转换
3. **性能考虑**: 避免过多的API请求，考虑使用缓存
4. **用户体验**: 对于暂时无法获取的数据（如播放URL），提供清晰的替代方案
5. **维护性**: 保持代码清晰，添加必要的注释

## 后续优化建议

1. **获取爱奇艺字符串ID**: 找到正确的爱奇艺详情API，获取字符串ID以构建直接的播放URL
2. **添加缓存机制**: 实现智能缓存，减少API请求次数
3. **支持更多平台**: 参考本文档，继续集成更多视频平台
4. **数据持久化**: 考虑将历史数据持久化存储
5. **用户偏好**: 允许用户选择显示哪些平台的数据

## 不同平台API数据的差异性

集成多个视频平台时，最关键的挑战是**每个平台的API数据结构都不相同**，无法使用统一的数据处理逻辑。以下是具体的差异分析：

### 1. API响应结构差异

**哔哩哔哩 API:**

```json
{
  "code": 0,
  "result": {
    "data": [
      {
        "date": "2026-02-01",
        "day_of_week": 7,
        "is_today": 1,
        "episodes": [
          {
            "season_id": 12345,
            "episode_id": 67890,
            "title": "番剧标题",
            "cover": "https://image.url/cover.jpg",
            "pub_time": "18:00",
            "pub_index_show": "第12话",
            "published": 1,
            "url": "https://www.bilibili.com/bangumi/play/..."
          }
        ]
      }
    ]
  }
}
```

**特点**: 结构化清晰，数据完整，包含播出时间、集数等详细信息。

**爱奇艺 API:**

```json
{
  "code": 0,
  "cards": [
    {
      "blocks": [
        {
          "block_id": "3784317657367801",
          "images": [
            {
              "name": "poster",
              "url": "https://pic2.iqiyipic.com/..._120_160.avif"
            }
          ],
          "metas": [
            { "name": "title", "text": "都市古仙医" },
            { "name": "tag.gray", "text": "医神-玄幻" }
          ],
          "actions": {
            "click_event": {
              "data": {
                "tv_id": "5873959692828900",
                "album_id": "3784317657367801"
              }
            }
          }
        }
      ]
    }
  ]
}
```

**特点**: 嵌套结构复杂，数据分散在不同字段中，缺少播出时间和集数信息。

### 2. 字段名称差异

| 数据项   | 哔哩哔哩         | 爱奇艺                              | 示例             |
| -------- | ---------------- | ----------------------------------- | ---------------- |
| 剧名     | `title`          | `metas[0].text` (name="title")      | 需要过滤元数据   |
| 封面     | `cover`          | `images[0].url` (name="poster")     | 需要按name筛选   |
| 播出时间 | `pub_time`       | ❌ 不提供                           | 爱奇艺没有此字段 |
| 更新集数 | `pub_index_show` | ❌ 不提供                           | 爱奇艺没有此字段 |
| 专辑ID   | `season_id`      | `actions.click_event.data.album_id` | 路径完全不同     |
| 播放URL  | `url`            | ❌ 不提供                           | 需要额外构建     |
| 星期几   | `day_of_week`    | ❌ 需要自己计算                     | 需要从日期计算   |

### 3. 日期格式差异

**哔哩哔哩:**

- 格式: `YYYY-MM-DD` (完整日期)
- 示例: `2026-02-01`
- 处理: 直接使用，无需额外处理

**爱奇艺:**

- 格式: `MM-DD` (缺少年份)
- 示例: `02-01`
- 处理: 需要补全年份，需要复杂的日期计算逻辑

**示例代码对比:**

```typescript
// 哔哩哔哩 - 直接使用
const date = day.date; // 2026-02-01

// 爱奇艺 - 需要补全年份
const [month, day] = tab.date.split('-').map(Number);
const year = calculateBaseYear(dateTabs, today);
const date = `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
```

### 4. 数据完整性差异

**哔哩哔哩:** ✅ 数据完整

- ✅ 播出时间 (`pub_time`)
- ✅ 更新集数 (`pub_index_show`)
- ✅ 播放URL (`url`)
- ✅ 完整日期 (`date`)

**爱奇艺:** ⚠️ 数据不完整

- ❌ 播出时间 - 不提供
- ❌ 更新集数 - 不提供
- ❌ 播放URL - 不提供，只有数字ID
- ⚠️ 日期 - 缺少年份
- ⚠️ 封面 - 小尺寸，需要手动放大

**处理策略:**

```typescript
// 哔哩哔哩 - 直接使用API返回的数据
return {
  pubTime: episode.pub_time, // "18:00"
  pubIndex: episode.pub_index_show, // "第12话"
  url: episode.url, // 完整URL
};

// 爱奇艺 - 使用默认值
return {
  pubTime: '00:00', // API不提供
  pubIndex: '更新中', // API不提供
  url: `https://so.iqiyi.com/so/q_${encodeURIComponent(title)}`, // 搜索URL
};
```

### 5. 图片处理差异

**哔哩哔哩:**

- 格式: JPG/PNG
- 尺寸: 合适的尺寸
- 防盗链: 需要，通过代理处理

**爱奇艺:**

- 格式: AVIF (现代格式)
- 尺寸: 小尺寸 (120x160)，需要手动放大
- 防盗链: 需要，通过代理处理

**处理代码:**

```typescript
// 哔哩哔哩
let cover = episode.cover; // 直接使用

// 爱奇艺
let cover = images.find((img) => img.name === 'poster')?.url || '';
// 1. 需要按name筛选
if (cover && cover.includes('_120_160')) {
  // 2. 需要手动放大尺寸
  cover = cover.replace('_120_160', '_480_640');
}
```

### 6. 为什么每个平台需要单独处理

1. **数据结构不同**: 每个平台的API响应结构完全不同，无法用统一的解析逻辑
2. **字段命名不同**: 相同含义的字段在不同平台有不同的名称
3. **数据完整性不同**: 有的平台数据完整，有的平台数据缺失
4. **业务逻辑不同**: 有的平台需要补全年份，有的需要计算星期几
5. **特殊处理需求**:
   - 爱奇艺需要处理avif格式图片
   - 爱奇艺需要放大图片尺寸
   - 爱奇艺需要使用搜索URL代替播放URL
   - B站需要处理图片防盗链

### 7. 适配器模式的必要性

正是因为上述差异，必须为每个平台创建独立的适配器类：

```typescript
// 每个平台都有自己的适配器
class BilibiliAdapter implements PlatformScheduleAdapter {
  private transformResponse(data: any): ScheduleResponse {
    // 专门处理B站的API数据结构
  }
}

class IqiyiAdapter implements PlatformScheduleAdapter {
  private transformResponse(data: any): ScheduleResponse {
    // 专门处理爱奇艺的API数据结构
  }
}

// 平台管理器统一调用
class PlatformManager {
  async fetchSchedule(platformId: string) {
    const adapter = this.adapters.get(platformId);
    return adapter.fetchSchedule(); // 每个适配器有自己的处理逻辑
  }
}
```

### 8. 集成新平台时的注意事项

1. **先研究API文档**: 仔细阅读平台的API文档，了解数据结构
2. **创建独立的适配器**: 不要复用其他平台的适配器
3. **编写数据转换逻辑**: 将平台特定的数据结构转换为标准格式
4. **处理缺失数据**: 为缺失的字段提供合理的默认值
5. **测试边界情况**: 测试API返回异常数据时的处理
6. **添加日志记录**: 记录API响应数据，便于调试
7. **考虑性能**: 优化API请求，避免不必要的调用

### 9. 标准数据格式

为了统一不同平台的数据，需要定义标准的数据格式：

```typescript
interface ScheduleDay {
  date: string; // YYYY-MM-DD 格式
  dayOfWeek: number; // 1-7 (周一为1)
  isToday: boolean; // 是否是今天
  episodes: ScheduleEpisode[];
}

interface ScheduleEpisode {
  id: string; // 唯一标识
  title: string; // 剧集标题
  cover: string; // 封面图片URL
  pubTime: string; // 播出时间 (HH:MM)
  pubIndex: string; // 更新集数
  published: boolean; // 是否已发布
  url: string; // 播放页面URL
  contentType?: 'anime' | 'domestic'; // 内容类型：动漫或影剧
}
```

每个平台的适配器都必须将平台特定的数据转换为此标准格式。

### 10. 实际案例对比

**获取剧集标题:**

```typescript
// 哔哩哔哩 - 直接获取
const title = episode.title;

// 爱奇艺 - 从元数据中提取
const titleMeta = block.metas?.find((meta) => meta.name === 'title');
const title = titleMeta?.text || '未知标题';
```

**获取封面图片:**

```typescript
// 哔哩哔哩 - 直接使用
const cover = episode.cover;

// 爱奇艺 - 需要筛选和放大
const images = block.images || [];
let cover = images.find((img) => img.name === 'poster')?.url || '';
if (cover && cover.includes('_120_160')) {
  cover = cover.replace('_120_160', '_480_640');
}
```

**获取播放URL:**

```typescript
// 哔哩哔哩 - API直接提供
const url = episode.url;

// 爱奇艺 - 需要构建搜索URL
const url = `https://so.iqiyi.com/so/q_${encodeURIComponent(title)}`;
```

### 11. 总结

不同平台的API数据差异性巨大，主要体现在：

1. **结构差异**: 嵌套层级、字段位置完全不同
2. **命名差异**: 字段名称不统一
3. **完整性差异**: 有的字段某些平台没有
4. **格式差异**: 日期、图片等格式不同
5. **业务差异**: 每个平台有自己独特的业务逻辑

因此，**每个平台必须创建独立的适配器**，实现自己的数据解析和转换逻辑。虽然工作量大，但这是保证数据正确性和系统可维护性的唯一方式。

---

## 多平台合并显示功能

### 功能概述

当同一剧集在多个平台同时播出时（如《名侦探柯南》在爱奇艺和B站都有），系统会自动合并显示为一个条目，而不是重复显示。这样可以避免数据冗余，同时利用不同平台的数据优势提供更完整的信息。

### 实现原理

#### 1. 数据结构扩展

在 `ScheduleEpisode` 接口中添加了多平台支持字段：

```typescript
export interface ScheduleEpisode {
  id: string;
  title: string;
  cover: string;
  pubTime: string;
  pubIndex: string;
  published: boolean;
  url?: string; // 原有字段，保持向后兼容
  duration?: number;
  types?: string[];
  platform?: string; // 原有字段，单个平台名称
  platforms?: string[]; // 新增：所有平台名称数组
  platformUrls?: Record<string, string>; // 新增：平台名称到URL的映射
  contentType?: 'anime' | 'domestic'; // 新增：内容类型（动漫/影剧）
}
```

#### 2. 标题标准化

为了识别同一剧集在不同平台的名称差异，实现了标题标准化函数：

```typescript
normalizeTitle(title: string): string {
  return title
    .trim()                                          // 去除首尾空格
    .toLowerCase()                                   // 转小写
    .replace(/[\s\u3000-\u303F\uFF00-\uFFEF]+/g, ' ')  // 规范化空格（包括全角空格）
    .replace(/['"()（）\[\]【】]/g, '')               // 去除标点符号
}
```

**示例：**

```typescript
normalizeTitle('名侦探柯南'); // → "名侦探柯南"
normalizeTitle('名侦探柯南 (2026)'); // → "名侦探柯南"
normalizeTitle('名侦探柯南【国语】'); // → "名侦探柯南"
```

#### 3. 剧集分组和合并

在 `platform-manager.ts` 中实现了合并逻辑：

```typescript
mergeEpisodes(episodes: ScheduleEpisode[]): ScheduleEpisode[] {
  const grouped = new Map<string, ScheduleEpisode[]>()

  // 1. 按标准化后的标题分组
  episodes.forEach(ep => {
    const key = this.normalizeTitle(ep.title)
    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(ep)
  })

  // 2. 合并每组数据
  return Array.from(grouped.values()).map(group => this.mergeEpisodeGroup(group))
}

mergeEpisodeGroup(group: ScheduleEpisode[]): ScheduleEpisode {
  const primary = group[0]
  const platforms: string[] = []
  const platformUrls: Record<string, string> = {}
  const pubTimes = new Set<string>()
  const pubIndexes = new Set<string>()
  const types = new Set<string>()

  // 3. 收集所有平台的数据
  group.forEach(ep => {
    if (ep.platform) {
      platforms.push(ep.platform)
    }
    if (ep.url && ep.platform) {
      platformUrls[ep.platform] = ep.url
    }
    if (ep.pubTime && ep.pubTime !== '00:00') {
      pubTimes.add(ep.pubTime)  // 优先选择非默认值的播出时间
    }
    if (ep.pubIndex && ep.pubIndex !== '更新中') {
      pubIndexes.add(ep.pubIndex)  // 优先选择非默认值的集数
    }
    if (ep.types) {
      ep.types.forEach(type => types.add(type))
    }
  })

  // 4. 生成合并后的剧集对象
  const merged: ScheduleEpisode = {
    ...primary,
    platforms: platforms.length > 0 ? [...new Set(platforms)] : undefined,
    platformUrls: Object.keys(platformUrls).length > 0 ? platformUrls : undefined,
    pubTime: pubTimes.size > 0 ? Array.from(pubTimes)[0] : primary.pubTime,
    pubIndex: pubIndexes.size > 0 ? Array.from(pubIndexes)[0] : primary.pubIndex,
    types: types.size > 0 ? Array.from(types) : primary.types,
    published: group.some(ep => ep.published)
  }

  return merged
}
```

#### 4. 数据流中的合并调用

合并逻辑在两个地方被调用：

**位置1：按日期合并时** (`platform-manager.ts`)

```typescript
mergeSchedules(...schedules: ScheduleResponse[]): ScheduleResponse {
  const mergedDays = new Map<string, ScheduleDay>()

  for (const schedule of schedules) {
    for (const day of schedule.result.list) {
      this.mergeDay(mergedDays, day)
    }
  }

  return { code: 0, message: 'success', result: { list: Array.from(mergedDays.values()) } }
}

private mergeDay(mergedDays: Map<string, ScheduleDay>, day: ScheduleDay): void {
  const existingDay = mergedDays.get(day.date)

  if (existingDay) {
    const allEpisodes = [...existingDay.episodes, ...day.episodes]
    const mergedEpisodes = this.mergeEpisodes(allEpisodes)  // ← 调用合并
    existingDay.episodes = mergedEpisodes
    existingDay.isToday = existingDay.isToday || day.isToday
  } else {
    mergedDays.set(day.date, { ...day, episodes: this.mergeEpisodes(day.episodes) })
  }
}
```

**位置2：按星期几构建周视图时** (`schedule-view.tsx`)

```typescript
function buildWeekData(scheduleData: ScheduleDay[], todayIndex: number): ScheduleDay[] {
  return WEEKDAYS.map((_, index) => {
    const dayOfWeek = index + 1;
    const matchingDays = scheduleData.filter((day) => day.dayOfWeek === dayOfWeek);

    if (matchingDays.length === 0) {
      return { date: '', dayOfWeek, isToday: index === todayIndex, episodes: [] };
    }

    // ⚠️ 重要：这里需要再次调用合并逻辑
    const episodes = schedulePlatformManager.mergeEpisodes(
      matchingDays.flatMap((day) => day.episodes)
    );
    const isToday = matchingDays.some((day) => day.isToday) || index === todayIndex;
    const date = matchingDays.find((day) => day.isToday)?.date || matchingDays[0].date;

    return { date, dayOfWeek, isToday, episodes };
  });
}
```

**为什么需要在两处调用？**

1. **第一次调用**：在 `mergeSchedules` 中，按日期合并时，确保同一日期内的重复剧集被合并
2. **第二次调用**：在 `buildWeekData` 中，使用 `flatMap` 将不同日期的剧集混在一起时，需要再次合并

**如果不第二次调用会发生什么？**

假设《名侦探柯南》在周一和周二都有更新，两次调用后数据流如下：

```
原始数据：
周一: [{title: "名侦探柯南", platform: "爱奇艺"}]
周二: [{title: "名侦探柯南", platform: "B站"}]

第一次合并（按日期）：
保持不变，因为不同日期

buildWeekData（按星期几）：
使用 flatMap → [{title: "名侦探柯南", platform: "爱奇艺"}, {title: "名侦探柯南", platform: "B站"}]

如果不再合并 → 显示两个《名侦探柯南》❌
如果再合并 → 显示一个《名侦探柯南》，platforms: ["爱奇艺", "B站"] ✅
```

### UI 实现

#### 1. 剧集卡片显示多平台标签

在 `schedule-episode-card.tsx` 中：

```typescript
{episode.platforms && episode.platforms.length > 0 && (
  <div className="flex flex-wrap gap-1 mt-1">
    {episode.platforms.map((platform, index) => (
      <Badge
        key={index}
        variant="outline"
        className="text-[10px] px-1.5 py-0 h-auto bg-gray-50 dark:bg-gray-700/50"
      >
        {platform}
      </Badge>
    ))}
  </div>
)}
```

**效果：**

- 单平台：不显示标签
- 多平台：显示 "哔哩哔哩" "爱奇艺" 等标签

#### 2. 详情面板显示多平台信息

在 `schedule-detail-panel.tsx` 中：

**平台字段显示：**

```typescript
<div className="flex items-start justify-between">
  <span className="text-sm text-gray-500">平台</span>
  {episode.platforms && episode.platforms.length > 0 ? (
    <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
      {episode.platforms.map((platform, index) => (
        <Badge key={index} variant="outline">{platform}</Badge>
      ))}
    </div>
  ) : (
    <span className="text-sm font-medium">{episode.platform || '未知'}</span>
  )}
</div>
```

**播放按钮显示：**

```typescript
{episode.platformUrls && Object.keys(episode.platformUrls).length > 0 ? (
  <div className="space-y-2">
    {Object.entries(episode.platformUrls).map(([platform, url]) => (
      <Button
        key={platform}
        variant="outline"
        onClick={() => window.open(url, '_blank')}
      >
        <ExternalLink className="h-4 w-4 mr-2" />
        去观看（{platform}）
      </Button>
    ))}
  </div>
) : episode.url && (
  <Button variant="outline" onClick={() => window.open(episode.url, '_blank')}>
    <ExternalLink className="h-4 w-4 mr-2" />
    去观看
  </Button>
)}
```

**效果：**

- 单平台：显示一个"去观看"按钮
- 多平台：显示多个按钮，如"去观看（爱奇艺）"、"去观看（哔哩哔哩）"

### 数据合并策略

合并时优先选择更完整的数据：

| 字段           | 合并策略                 | 示例                                                         |
| -------------- | ------------------------ | ------------------------------------------------------------ |
| `platforms`    | 收集所有平台             | `["爱奇艺", "哔哩哔哩"]`                                     |
| `platformUrls` | 收集所有平台的URL        | `{ "爱奇艺": "url1", "哔哩哔哩": "url2" }`                   |
| `pubTime`      | 优先选择非默认值         | 爱奇艺 `00:00` + B站 `18:00` → `18:00`                       |
| `pubIndex`     | 优先选择非默认值         | 爱奇艺 `更新中` + B站 `第12话` → `第12话`                    |
| `types`        | 合并所有类型             | `["热血"]` + `["冒险", "动作"]` → `["热血", "冒险", "动作"]` |
| `published`    | 任一平台已发布即为已发布 | `false` + `true` → `true`                                    |
| `cover`        | 使用第一个平台的封面     | 保留原值                                                     |
| `contentType`  | 使用第一个平台的类型     | 如果第一个平台是动漫，则为 `'anime'`                         |

### 调试技巧

#### 1. 查看合并过程日志

在 `mergeEpisodes` 方法中已添加日志：

```typescript
episodes.forEach((ep) => {
  const key = this.normalizeTitle(ep.title);
  console.log('[Merge] Original:', ep.title, '| Normalized:', key, '| Platform:', ep.platform);
  // ...
});

console.log('[Merge] Groups:', Array.from(grouped.keys()));
```

在浏览器控制台中可以看到：

```
[Merge] Original: 名侦探柯南 | Normalized: 名侦探柯南 | Platform: 爱奇艺
[Merge] Original: 名侦探柯南 | Normalized: 名侦探柯南 | Platform: 哔哩哔哩
[Merge] Groups: ["名侦探柯南"]
```

#### 2. 检查合并后的数据

在 `fetchSchedule` 中添加日志：

```typescript
const merged = schedulePlatformManager.mergeSchedules(...schedules);
console.log('[Fetch] Merged data:', merged.result.list);

const weekData = buildWeekData(merged.result.list, dateInfo.today);
console.log('[Fetch] Week data:', weekData);
```

### 集成新平台时的注意事项

在实现新的平台适配器时，需要确保：

1. **正确设置 `platform` 字段**：

   ```typescript
   return {
     platform: '平台名称', // 必须设置，用于合并时识别平台
   };
   ```

2. **提供 `url` 字段**：

   ```typescript
   return {
     url: platformUrl, // 用于构建 platformUrls 对象
   };
   ```

3. **⚠️ 必须设置 `contentType` 字段**：

   ```typescript
   return {
     contentType: 'anime'  // 动漫平台
     // 或
     contentType: 'domestic'  // 影剧平台
   }
   ```

4. **数据转换正确**：
   - 确保 `title` 字段包含剧集名称
   - 不要在标题中添加额外的标签或后缀

5. **测试合并效果**：
   - 选择一个已知在多个平台都有剧集的标题
   - 验证是否正确合并为一个条目
   - 检查平台标签和播放按钮是否正确显示
   - 测试分类筛选功能是否正常工作

### 常见问题

#### Q1: 为什么我的剧集没有被合并？

**可能原因：**

1. 标题格式不完全相同（如包含标点、空格等）
2. 标题标准化逻辑需要调整
3. 合并逻辑没有被调用（检查是否在两处都调用了）

**解决方法：**

1. 在控制台查看 `[Merge] Original:` 日志，确认标准化后的标题是否相同
2. 如果标题有差异，调整 `normalizeTitle` 函数
3. 检查 `buildWeekData` 中是否调用了 `mergeEpisodes`

#### Q2: 合并后播放按钮显示错误？

**可能原因：**

- 适配器没有正确设置 `url` 字段
- `platformUrls` 对象没有正确构建

**解决方法：**

```typescript
// 检查 platformUrls 是否正确
console.log('Platform URLs:', episode.platformUrls);
// 应该显示: { "平台名": "https://..." }
```

#### Q3: 如何禁用合并功能？

如果需要临时禁用合并功能，可以在 `mergeEpisodes` 中返回原始数据：

```typescript
mergeEpisodes(episodes: ScheduleEpisode[]): ScheduleEpisode[] {
  // 直接返回原始数据，不合并
  return episodes
}
```

### 性能优化

1. **标题标准化缓存**：如果标题频繁标准化，可以考虑缓存结果
2. **合并逻辑优化**：对于大量剧集，可以考虑使用更高效的数据结构
3. **调试日志清理**：生产环境中移除 `console.log` 日志

### 总结

多平台合并显示功能通过以下方式实现：

1. **数据层**：扩展 `ScheduleEpisode` 类型，添加 `platforms` 和 `platformUrls` 字段
2. **合并逻辑**：基于标题标准化进行分组和合并
3. **UI 层**：显示多平台标签和独立的播放按钮
4. **数据流**：在两处调用合并逻辑确保正确性

这个功能可以显著提升用户体验，避免重复显示，同时利用不同平台的数据优势。在集成新平台时，确保适配器正确设置 `platform` 和 `url` 字段，以便合并逻辑正常工作。
