/**
 * 增强操作类型定义
 */

// 从核心类型重新导出
export type {
  EnhanceOperationType,
  EnhanceInput,
  EnhanceOutput,
  EnhanceConfig,
  IEnhanceOperationPlugin
} from '../core/types'

// 导出增强操作专用类型
export { BaseEnhanceOperationPlugin } from './base-enhance-operation'