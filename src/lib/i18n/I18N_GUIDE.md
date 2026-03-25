# TMDB Helper 国际化(i18n)开发指南

## 概述

TMDB Helper 项目使用 `i18next` + `react-i18next` 实现国际化支持，目前已支持以下语言：

- 简体中文 (zh-CN) - 默认语言
- 英语 (en-US)
- 繁体中文 - 台湾 (zh-TW)
- 繁体中文 - 香港 (zh-HK)

## 开发规范

### 必须遵循的规则

1. **禁止硬编码用户可见文本**
   - 所有用户可见的文本（界面显示、按钮标签、提示信息、加载状态、错误状态、空状态、错误消息等）必须使用 i18next 翻译函数
   - 使用 `t("key", { ns: "namespace" })` 或 `t("key")`（当使用默认命名空间时）

2. **允许硬编码的情况**
   - 代码注释（但建议使用英文注释）
   - 技术性错误消息（用于日志记录）
   - API请求中的中文提示文本（发送给AI模型的提示）
   - placeholder 中的示例 URL（如 `https://example.com/show-page`）

3. **翻译键命名规范**
   - 使用点分隔的层次结构：`命名空间.类别.具体键`
   - 示例：`settings.general.autoSave`、`media.categoryNames.anime`

4. **新增翻译时的操作**
   - 在 `src/lib/i18n/locales/` 目录下找到对应的语言文件
   - 同时更新 zh-CN、en-US、zh-TW、zh-HK 四个语言文件
   - 遵循现有文件的结构和命名规范

### 快速检查

修改代码后，问自己：
- 这个文本会在浏览器中显示给用户吗？
- 如果是，它使用了 `t()` 函数吗？
- 翻译键是否已添加到所有语言文件中？
- **namespace 名称是否正确？**（见下方常见错误）
- **useTranslation hook 是否指定了正确的 namespace？**（如使用 `settings.xxx` 键，必须用 `useTranslation("settings")` 或 `{ ns: "settings" }`）

## 项目结构

```
src/lib/i18n/
├── index.ts              # i18next 初始化配置
├── config.ts             # 语言配置
├── language-store.ts     # 语言状态管理 (Zustand)
├── locales/
│   ├── zh-CN/
│   │   ├── common.json              # 通用文本
│   │   ├── nav/
│   │   │   ├── maintenance.json     # 维护模块导航
│   │   │   ├── news.json            # 资讯模块导航
│   │   │   ├── content.json         # 内容模块导航
│   │   │   ├── image.json           # 图片模块导航
│   │   │   └── tools.json           # 工具模块导航
│   │   ├── media.json               # 媒体相关文本
│   │   ├── schedule.json            # 排程相关文本
│   │   ├── settings.json             # 设置面板文本
│   │   ├── user.json                # 用户相关文本
│   │   ├── dialogs.json             # 对话框文本
│   │   ├── messages.json            # 消息文本
│   │   ├── errors.json              # 错误消息
│   │   ├── weekdays.json            # 星期名称
│   │   └── categories.json           # 分类名称
│   ├── en-US/                       # 英语翻译（同上结构）
│   ├── zh-TW/                       # 台湾繁体翻译（同上结构）
│   └── zh-HK/                       # 香港繁体翻译（同上结构）
└── utils/
    ├── date-format.ts    # 日期格式化工具
    └── number-format.ts  # 数字格式化工具
```

## 模块化命名空间

项目采用**按功能模块拆分**的命名空间设计，便于维护和团队协作：

| 命名空间 | 翻译文件 | 用途 |
|---------|---------|------|
| `common` | `common.json` | 通用文本（按钮、标签、提示） |
| `nav.maintenance` | `nav/maintenance.json` | 维护模块导航 |
| `nav.news` | `nav/news.json` | 资讯模块导航 |
| `nav.content` | `nav/content.json` | 内容模块导航 |
| `nav.image` | `nav/image.json` | 图片模块导航 |
| `nav.tools` | `nav/tools.json` | 工具模块导航 |
| `media` | `media.json` | 媒体相关文本 |
| `schedule` | `schedule.json` | 排程相关文本 |
| `settings` | `settings.json` | 设置面板 |
| `user` | `user.json` | 用户相关文本 |
| `dialogs` | `dialogs.json` | 对话框文本 |
| `messages` | `messages.json` | 消息和通知 |
| `errors` | `errors.json` | 错误消息 |
| `weekdays` | `weekdays.json` | 星期名称 |
| `categories` | `categories.json` | 分类名称 |

**注意**：命名空间在代码中使用**点号格式**（如 `nav.maintenance`），而不是斜杠格式。文件名使用**斜杠格式**（如 `nav/maintenance.json`）。

## 在组件中使用翻译

### 基本用法

```tsx
import { useTranslation } from "react-i18next"

function MyComponent() {
  const { t } = useTranslation()

  return (
    <div>
      <h1>{t("nav.maintenance.title", { ns: "nav.maintenance" })}</h1>
      <button>{t("save", { ns: "common" })}</button>
    </div>
  )
}
```

### 使用 hook 参数指定 namespace

可以在 `useTranslation` hook 中直接传入 namespace 参数，这样在组件中就可以省略 `{ ns: "..." }`：

```tsx
import { useTranslation } from "react-i18next"

// 方法1：在 hook 中指定 namespace
function MyComponent() {
  const { t } = useTranslation("settings")  // 指定默认 namespace

  return (
    <div>
      <h1>{t("settings.settings")}</h1>  // 无需再指定 ns
      <p>{t("settings.settingsDesc")}</p>
    </div>
  )
}

// 方法2：省略 namespace（仅适用于 common）
function AnotherComponent() {
  const { t } = useTranslation()  // 默认 namespace 是 common

  return (
    <div>
      <button>{t("save")}</button>  // common.save
    </div>
  )
}
```

**注意**：如果指定的 namespace 不是 `common`，必须使用 hook 参数方式或 `{ ns: "..." }` 方式明确指定，否则翻译键将无法正确解析。

### 使用默认命名空间

如果命名空间是 `common`，可以省略 `ns` 参数：

```tsx
// 这两种写法效果相同
<button>{t("save")}</button>
<button>{t("save", { ns: "common" })}</button>
```

### 带变量的翻译

在翻译文件中使用 `{{variable}}` 占位符：

```json
{
  "welcome": "欢迎，{{name}}！",
  "itemCount": "共 {{count}} 项"
}
```

在代码中传递变量：

```tsx
// 带变量的翻译
<p>{t("welcome", { name: userName, ns: "common" })}</p>
<p>{t("itemCount", { count: items.length, ns: "common" })}</p>
```

### 复数支持

在翻译文件中定义不同复数形式：

```json
{
  "itemCount": "{{count}} 个项目",
  "itemCount_plural": "{{count}} 个项目"
}
```

使用复数：

```tsx
// 根据数量自动选择单数/复数形式
<p>{t("itemCount", { count: items.length, ns: "common" })}</p>
```

## 翻译键命名规范

使用点分隔的层次结构：

```
命名空间.类别.子类别.具体键
```

示例：

- `nav.maintenance.title` - 导航菜单中维护模块的标题
- `common.save` - 通用保存按钮
- `media.categoryNames.anime` - 动漫分类名称
- `nav.maintenance.addItem.form.title` - 添加词条表单的标题

## 完整示例：AddItemDialog 组件

以下是一个完整国际化的组件示例（`src/features/media-maintenance/components/add-item-dialog.tsx`）：

```tsx
import { useTranslation } from "react-i18next"

// 使用 WEEKDAY_KEYS 映射到翻译
const WEEKDAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

function AddItemDialog() {
  const { t } = useTranslation()

  // 在组件内使用 WEEKDAY_KEYS 生成翻译后的星期数组
  const WEEKDAYS = WEEKDAY_KEYS.map(key => t(`weekdaysList.${key}`, { ns: "common" }))

  return (
    <div>
      {/* 对话框标题 - 使用 nav.maintenance 命名空间 */}
      <DialogTitle>
        {t("independentPage.addItem.title", { ns: "nav.maintenance" })}
      </DialogTitle>

      {/* 搜索提示 - 使用 nav.maintenance 命名空间 */}
      <DialogDescription>
        {t("independentPage.addItem.searchHint", { ns: "nav.maintenance" })}
      </DialogDescription>

      {/* 搜索输入框 - 使用 nav.maintenance 命名空间 */}
      <Input
        placeholder={t("independentPage.addItem.searchPlaceholder", { ns: "nav.maintenance" })}
      />

      {/* 分类选择 - 使用 media 命名空间的 categoryNames */}
      <SelectItem value="anime">
        {t('categoryNames.anime', { ns: 'media' })}
      </SelectItem>

      {/* 星期选择 - 使用 common 命名空间的 weekdaysList */}
      <SelectItem value="0">
        {t("weekdaysList.sunday", { ns: "common" })}
      </SelectItem>
      {WEEKDAYS.map((day, index) => (
        <SelectItem key={index} value={(index + 1).toString()}>
          {day}
        </SelectItem>
      ))}
    </div>
  )
}
```

## 语言切换

### 用户下拉菜单

语言切换功能集成在用户头像下拉菜单中：

1. 点击用户头像打开下拉菜单
2. 选择"语言切换"选项
3. 从子菜单中选择目标语言

### 手动切换语言

```tsx
import { changeLanguage } from "@/lib/i18n"

// 切换到英语
await changeLanguage("en-US")

// 切换到简体中文
await changeLanguage("zh-CN")
```

## 添加新翻译

### 1. 更新翻译文件

在对应语言的模块目录下添加新的翻译键值对：

**zh-CN/nav/maintenance.json:**
```json
{
  "title": "词条维护",
  "list": "维护列表",
  "independent": "独立维护",
  "newFeature": "新功能"
}
```

**en-US/nav/maintenance.json:**
```json
{
  "title": "Media Maintenance",
  "list": "Maintenance List",
  "independent": "Independent Maintenance",
  "newFeature": "New Feature"
}
```

### 2. 在组件中使用

```tsx
const { t } = useTranslation()

// 在 JSX 中使用 - 注意使用点号格式的 namespace
<span>{t("newFeature", { ns: "nav.maintenance" })}</span>
```

## 日期和数字格式化

### 日期格式化

```tsx
import { formatDate, formatDateTime } from "@/lib/i18n/utils"

const date = new Date()

// 格式化日期
formatDate(date, "zh-CN")  // "2024年1月15日"
formatDate(date, "en-US")  // "January 15, 2024"

// 格式化日期时间
formatDateTime(date, "zh-CN")  // "2024年1月15日 上午10:30"
```

### 数字格式化

```tsx
import { formatNumber, formatPercentage } from "@/lib/i18n/utils"

const num = 1234567.89

// 格式化数字
formatNumber(num, "zh-CN")  // "1,234,567.89"
formatNumber(num, "en-US")  // "1,234,567.89"

// 格式化百分比
formatPercentage(85.5, "zh-CN")  // "86%"
```

## 常见错误与排查

### 错误1：namespace 名称使用斜杠而非点号

**错误写法：**
```tsx
// ✗ 错误 - 使用了斜杠格式
{t("independentPage.addItem.title", { ns: "nav/maintenance" })}
```

**正确写法：**
```tsx
// ✓ 正确 - 使用了点号格式，与 i18n 配置中的注册名一致
{t("independentPage.addItem.title", { ns: "nav.maintenance" })}
```

**原因**：代码中的 namespace 必须与 `src/lib/i18n/index.ts` 中注册的名字完全一致。注册时使用的是点号格式（如 `"nav.maintenance"`），而不是斜杠格式的文件路径。

### 错误2：翻译键直接显示而非翻译文本

如果界面显示 `settings.settings` 而不是"设置"，请检查：

1. **namespace 是否正确？** 如上所述
2. **useTranslation hook 是否指定了正确的 namespace？**
   - 如果翻译键是 `settings.xxx`，必须使用 `useTranslation("settings")` 或 `{ ns: "settings" }`
   - 如果翻译键是 `common.xxx`，可以使用 `useTranslation()`（默认）或 `useTranslation("common")` 或 `{ ns: "common" }`
3. **翻译键是否存在于 JSON 文件中？** 检查 `locales/zh-CN/settings.json` 是否包含该键
4. **翻译值是否正确？** JSON 中 `"settings": "设置"` 而非 `"settings": "settings"`

### 错误3：缺少 namespace 参数

```tsx
// ✗ 错误 - 省略了 namespace，且 hook 中也未指定
{t("settings.settings")}  // 翻译键无法解析，会直接显示键名

// ✓ 正确 - 在 hook 中指定 namespace
const { t } = useTranslation("settings")
{t("settings.settings")}  // 正确解析

// ✓ 也正确 - 使用 { ns: "..." } 参数
{t("settings.settings", { ns: "settings" })}  // 正确解析
```

### 错误4：common 命名空间省略问题

`common` 是默认命名空间，可以省略 `ns` 参数：

```tsx
// ✓ 正确 - common 作为默认命名空间
{t("save")}

// ✓ 也正确 - 显式指定 common
{t("save", { ns: "common" })}
```

但其他命名空间必须显式指定：

```tsx
// ✗ 错误 - media 不是默认命名空间
{t("categoryNames.anime")}

// ✓ 正确 - 必须指定 namespace
{t("categoryNames.anime", { ns: "media" })}
```

## 最佳实践

### 1. 始终使用翻译键而非硬编码文本

```tsx
// ✗ 错误
<button>保存</button>

// ✓ 正确
<button>{t("save", { ns: "common" })}</button>
```

### 2. 使用有意义的翻译键

```tsx
// ✗ 不推荐 - 语义不清晰
<span>{t("text1", { ns: "common" })}</span>

// ✓ 推荐 - 语义清晰
<span>{t("autoSaveEnabled", { ns: "settings" })}</span>
```

### 3. 组件内联翻译而非全局文本

```tsx
// ✓ 推荐 - 在使用处翻译
function SaveButton() {
  const { t } = useTranslation()
  return <button>{t("save", { ns: "common" })}</button>
}
```

### 4. 避免在翻译中使用硬编码变量

```tsx
// ✗ 不推荐
<p>{"Total: " + count}</p>

// ✓ 推荐 - 将整个句子作为翻译键
<p>{t("totalCount", { count: count, ns: "common" })}</p>
```

## 常见问题

### Q: 为什么语言切换后界面没有更新？

确保在 `mid-layout.tsx` 中已导入 i18n 配置：

```tsx
import "@/lib/i18n"
```

### Q: 如何获取当前语言？

```tsx
import { getCurrentLanguage } from "@/lib/i18n"

const currentLang = getCurrentLanguage()  // "zh-CN", "en-US", 等
```

### Q: namespace 名称应该用斜杠还是点号？

**始终使用点号格式**。命名空间在代码中引用时使用点号（如 `nav.maintenance`），这与 `src/lib/i18n/index.ts` 中的注册名称一致。

文件名使用斜杠格式（如 `nav/maintenance.json`），这是文件系统的路径格式。

### Q: 如何在 TypeScript 中获得类型提示？

i18next 支持 TypeScript 类型推导，但需要额外配置：

```tsx
// 使用时类型会正确推导
const { t } = useTranslation()
t("save", { ns: "common" })  // string 类型
```

## 技术栈

- **i18next**: 核心国际化框架
- **react-i18next**: React 绑定
- **i18next-browser-languagedetector**: 浏览器语言自动检测
- **Zustand**: 语言状态管理

## 相关文件

| 文件路径 | 说明 |
|---------|------|
| `src/lib/i18n/index.ts` | i18next 初始化配置 |
| `src/lib/i18n/config.ts` | 语言配置常量 |
| `src/lib/i18n/language-store.ts` | 语言状态管理 |
| `src/shared/components/user-identity-provider.tsx` | 用户下拉菜单（含语言切换） |
| `src/shared/components/layouts/sidebar-navigation.tsx` | 侧边栏导航（已国际化） |
| `src/features/media-maintenance/components/add-item-dialog.tsx` | 添加词条对话框（完整 i18n 示例） |
