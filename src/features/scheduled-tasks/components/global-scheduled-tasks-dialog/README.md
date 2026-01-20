# Global Scheduled Tasks Dialog

**状态**: 待拆分 (2356 行)

## 当前问题
- 文件过大 (2356 行)
- 职责过多,包含:
  - 任务列表显示
  - 任务编辑器
  - 任务调度器
  - 任务历史记录
  - 任务模板管理
  - 复杂的状态管理

## 拆分计划
建议拆分为以下子组件:

1. **task-list.tsx** - 任务列表组件
2. **task-editor.tsx** - 任务编辑器组件
3. **task-scheduler.tsx** - 任务调度器组件
4. **task-history.tsx** - 任务历史记录组件
5. **task-templates.tsx** - 任务模板管理组件
6. **use-scheduled-tasks-dialog.ts** - 对话框逻辑 hook

## 优先级
- 高: 需要尽快拆分以降低维护成本

## 备注
- 保持所有功能不变
- 确保向后兼容
- 添加单元测试