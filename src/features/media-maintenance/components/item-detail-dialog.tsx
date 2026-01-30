// ItemDetailDialog - 模块化重构后的主入口文件
// 原始 2450 行巨型组件已完全拆分为模块化组件

export { ItemDetailDialog } from './item-detail/components'

// 同时导出所有子组件，供外部直接使用
export * from './item-detail/components'
export * from './item-detail/hooks'

// 导出类型定义
export type { TMDBCommand } from './item-detail/hooks'
export type { Season, Episode, TMDBItem } from "@/lib/data/storage"