# 已完结项目定时任务自动删除功能

## 功能概述

当词条状态变为"已完结"时，系统会自动删除对应的定时任务，避免不必要的任务继续执行。这个功能帮助用户自动清理已完成项目的定时任务，保持任务列表的整洁。

## 功能特点

### 🎯 **智能检测**
- 实时检测项目完结状态
- 支持多种完结状态判断（status='completed' 或 completed=true）
- 任务执行时自动检查项目状态

### 🔄 **多重保障**
- 任务执行成功后检查
- 任务执行失败后也检查（防止遗漏）
- 定期后台清理（每小时一次）

### ⚙️ **用户可控**
- 可选择性启用自动删除功能
- 默认启用，用户可以关闭
- 详细的删除日志记录

## 工作原理

### 1. 项目完结状态检测

系统通过以下条件判断项目是否已完结：
```javascript
const isCompleted = relatedItem.status === 'completed' || relatedItem.completed === true;
```

### 2. 自动删除触发时机

- **任务执行后**：每次定时任务执行完成后检查
- **定期清理**：每小时自动扫描所有任务
- **手动触发**：通过API手动清理

### 3. 删除流程

1. 检查任务是否启用了 `autoDeleteWhenCompleted` 选项
2. 检查关联项目是否已完结
3. 记录删除日志
4. 清除任务定时器
5. 从存储中删除任务记录

## 使用方法

### 1. 启用自动删除选项

在创建或编辑定时任务时：

1. 进入"特殊处理选项"区域
2. 找到"完结后自动删除任务"选项
3. 确保开关处于启用状态（默认启用）

### 2. 项目完结操作

当项目所有集数都标记完成时：
- 系统会自动将项目状态设为"已完结"
- 下次任务执行时会自动删除该任务

### 3. 手动清理

可以通过API手动触发清理：
```bash
# 获取可清理的任务信息
GET /api/cleanup-completed-tasks

# 执行清理操作
POST /api/cleanup-completed-tasks
```

## 界面展示

### 任务创建界面
```
特殊处理选项
┌─────────────────────────────────────────┐
│ 完结后自动删除任务              [✓]    │
│ 项目所有集数标记完成后自动删除该定时任务  │
└─────────────────────────────────────────┘
```

### 删除日志示例
```
[TaskScheduler] 检测到项目 示例剧集 已完结，且任务 示例剧集 定时任务 启用了自动删除选项
[TaskScheduler] ✓ 成功自动删除已完结项目的定时任务: 示例剧集 定时任务
```

## 技术实现

### 核心检查方法

```typescript
private async checkAndHandleCompletedProject(
  task: ScheduledTask, 
  relatedItem: TMDBItem
): Promise<boolean> {
  // 检查是否启用自动删除
  if (!task.action.autoDeleteWhenCompleted) {
    return false;
  }

  // 检查项目是否已完结
  const isCompleted = relatedItem.status === 'completed' || relatedItem.completed === true;
  
  if (isCompleted) {
    // 执行删除操作
    await this.deleteTask(task);
    return true;
  }
  
  return false;
}
```

### 定期清理机制

```typescript
// 每小时执行一次清理检查
setInterval(async () => {
  await this.cleanupCompletedProjectTasks();
}, 60 * 60 * 1000);
```

### API接口

#### GET /api/cleanup-completed-tasks
返回可清理的任务信息：
```json
{
  "success": true,
  "totalAutoDeleteTasks": 5,
  "deletableTasks": 2,
  "candidates": [...]
}
```

#### POST /api/cleanup-completed-tasks
执行清理操作：
```json
{
  "success": true,
  "message": "清理完成，共删除 2 个已完结项目的定时任务",
  "deletedCount": 2,
  "deletedTasks": [...],
  "completedProjects": [...]
}
```

## 使用场景

### 典型工作流程

1. **创建定时任务**：为新剧集创建定时任务，启用自动删除选项
2. **正常执行**：任务按计划执行，自动更新剧集信息
3. **项目完结**：所有集数标记完成，项目状态变为"已完结"
4. **自动清理**：下次任务执行时自动删除，或定期清理时删除

### 手动管理场景

- **批量清理**：使用API一次性清理所有已完结项目的任务
- **状态检查**：查看哪些任务可以被清理
- **日志审查**：查看自动删除的历史记录

## 配置选项

### 任务级别配置

```typescript
interface ScheduledTask {
  action: {
    autoDeleteWhenCompleted?: boolean // 默认: true
    // ... 其他选项
  }
}
```

### 系统级别配置

- **检查频率**：每小时一次定期清理
- **删除条件**：项目状态为 'completed' 或 completed=true
- **日志级别**：详细记录所有删除操作

## 注意事项

### ⚠️ **重要提醒**

1. **不可恢复**：删除的任务无法恢复，请确认项目确实已完结
2. **状态准确性**：确保项目完结状态设置正确
3. **日志查看**：可通过日志查看自动删除的详细信息

### 🔧 **最佳实践**

1. **默认启用**：建议保持自动删除选项启用
2. **定期检查**：定期查看任务列表，确认清理效果
3. **状态维护**：及时更新项目完结状态

### 🛠️ **故障排除**

**问题**：任务没有自动删除
**解决方案**：
1. 检查任务是否启用了自动删除选项
2. 确认项目状态是否正确设为"已完结"
3. 查看任务执行日志了解详细情况

**问题**：误删除任务
**解决方案**：
1. 重新创建定时任务
2. 检查项目状态设置
3. 考虑关闭自动删除选项

这个功能让定时任务系统更加智能和自动化，减少了用户的手动维护工作！
