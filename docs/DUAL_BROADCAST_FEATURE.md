# 双播出日定时任务功能

## 功能概述

为了适配每周双更的剧集，定时任务系统现在支持设置第二播出日。用户可以为每周播出的任务设置两个不同的播出日期，系统会自动在最近的播出日执行任务。

## 功能特点

### 🎯 **智能调度**
- 自动选择最近的播出日执行任务
- 支持跨周的播出日期计算
- 精确的时间计算，避免重复执行

### 🔄 **灵活配置**
- 可选择性启用第二播出日
- 支持任意两个工作日的组合
- 实时显示当前配置状态

### 📱 **用户友好**
- 直观的双更模式标识
- 清晰的播出日期显示
- 详细的执行时间预览

## 使用方法

### 1. 创建双播出日任务

1. 在词条详情页面点击"定时任务"按钮
2. 点击"添加新任务"
3. 选择执行频率为"每周"
4. 在播出日期设置区域：
   - 设置主播出日（必选）
   - 设置第二播出日（可选）
5. 配置其他任务参数
6. 保存任务

### 2. 双更模式识别

当设置了第二播出日时，系统会显示：
- 🏷️ "双更模式"标识
- 📅 两个播出日的完整显示
- ⏰ 统一的执行时间

### 3. 任务执行逻辑

系统会：
1. 计算到每个播出日的时间差
2. 选择最近的播出日执行
3. 执行完成后自动调度到下一个播出日

## 界面展示

### 任务创建界面
```
播出日期设置                    [双更模式]
┌─────────────────────────────────────────┐
│ 主播出日      │ 第二播出日 (可选)        │
│ [周二 ▼]     │ [周五 ▼]              │
└─────────────────────────────────────────┘

💡 双更模式：任务将在每周的两个不同日期执行
```

### 任务列表显示
```
📺 示例剧集 定时任务
每周周二、周五 21:30 (双更)    [已启用]
```

### 执行时间预览
```
执行时间                    每周周二、周五 21:30
┌─────────────────────────────────────────┐
│        [时间选择器]                      │
└─────────────────────────────────────────┘
```

## 技术实现

### 数据结构扩展

```typescript
interface ScheduledTask {
  schedule: {
    type: "weekly" | "daily"
    dayOfWeek?: number // 0-6，主播出日
    secondDayOfWeek?: number // 0-6，第二播出日（新增）
    hour: number
    minute: number
  }
  // ... 其他字段
}
```

### 核心算法

```javascript
// 计算下次执行时间
function calculateNextWeeklyRunTime(task, now) {
  const targetDays = [task.schedule.dayOfWeek];
  
  // 添加第二播出日
  if (task.schedule.secondDayOfWeek !== undefined) {
    targetDays.push(task.schedule.secondDayOfWeek);
  }
  
  // 选择最近的播出日
  let nearestNextRun = null;
  let minDaysUntilTarget = Infinity;
  
  for (const targetDay of targetDays) {
    // 计算到目标日期的天数差
    const daysUntilTarget = calculateDaysUntilTarget(targetDay, now);
    
    if (daysUntilTarget < minDaysUntilTarget) {
      minDaysUntilTarget = daysUntilTarget;
      nearestNextRun = createNextRunDate(now, targetDay, task.schedule);
    }
  }
  
  return nearestNextRun;
}
```

## 使用场景

### 典型双更剧集
- **周二、周五更新**：适合大部分双更剧集
- **周一、周四更新**：适合工作日双更
- **周六、周日更新**：适合周末双更

### 执行示例

假设当前时间是周三 15:00，任务设置为周二、周五 21:30：

1. **计算结果**：下次执行时间为周五 21:30
2. **执行完成后**：自动调度到下周二 21:30
3. **循环执行**：周二 → 周五 → 周二 → 周五...

## 兼容性

### 向后兼容
- 现有单播出日任务完全兼容
- 不设置第二播出日时行为不变
- 数据迁移自动处理

### 数据升级
系统会自动为现有任务添加 `secondDayOfWeek` 字段：
- 默认值：`undefined`（不设置第二播出日）
- 现有任务行为保持不变

## 注意事项

### ⚠️ **重要提醒**
1. **时间统一**：两个播出日使用相同的执行时间
2. **避免冲突**：不要设置相同的主播出日和第二播出日
3. **合理间隔**：建议两个播出日之间有适当间隔

### 🔧 **最佳实践**
1. **常见组合**：周二+周五、周一+周四、周六+周日
2. **时间选择**：建议选择剧集通常更新的时间点
3. **测试验证**：创建任务后检查下次执行时间是否正确

## 故障排除

### 问题：任务只在一个播出日执行
**解决方案**：检查第二播出日是否正确设置，确保不是"不设置"

### 问题：执行时间计算错误
**解决方案**：确认当前系统时间正确，重新保存任务配置

### 问题：双更模式标识不显示
**解决方案**：刷新页面，确保第二播出日已正确保存

这个功能让定时任务系统更加灵活，能够完美适配各种双更剧集的播出模式！
