---
p8-style-cache: true
last-validated: 2026-05-01
sample-files:
  - src/lib/hooks/use-update-check.ts
  - src/features/system/components/settings-dialog/HelpSettingsPanel.tsx
---

[风格检测]
命名约定：camelCase（变量/函数）、PascalCase（组件/类/接口）、kebab-case（文件名）
文件结构：按功能/领域组织（features/system、lib/hooks、shared/components）
注释密度：适中（关键逻辑有中文注释）
错误处理：try/catch + 静默降级 + toast 提示
模块粒度：中等文件 + 按职责拆分
