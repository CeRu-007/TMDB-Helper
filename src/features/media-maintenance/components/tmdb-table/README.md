# TMDB Table Component

**状态**: 待拆分 (1716 行)

## 当前问题
- 文件过大 (1716 行)
- 职责过多,包含:
  - 表格渲染
  - 单元格编辑
  - 拖拽选择
  - 剪贴板操作
  - 列宽调整
  - 键盘导航
  - 右键菜单

## 拆分计划
建议拆分为以下子组件:

1. **tmdb-table-header.tsx** - 表头组件
2. **tmdb-table-body.tsx** - 表体组件
3. **tmdb-table-row.tsx** - 行组件
4. **tmdb-table-cell.tsx** - 单元格组件
5. **tmdb-table-filters.tsx** - 过滤器组件
6. **tmdb-table-actions.tsx** - 操作按钮组件
7. **use-tmdb-table.ts** - 表格逻辑 hook

## 优先级
- 高: 需要尽快拆分以降低维护成本

## 备注
- 保持所有功能不变
- 确保向后兼容
- 添加单元测试