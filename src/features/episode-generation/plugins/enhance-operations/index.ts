/**
 * 增强操作插件集合
 * 导出所有增强操作插件
 */

// 导出类
export { PolishPlugin } from './polish.plugin'
export { ShortenPlugin } from './shorten.plugin'
export { ExpandPlugin } from './expand.plugin'
export { ProofreadPlugin } from './proofread.plugin'
export { RewritePlugin } from './rewrite.plugin'

// 在这里直接导入并创建实例
import { PolishPlugin } from './polish.plugin'
import { ShortenPlugin } from './shorten.plugin'
import { ExpandPlugin } from './expand.plugin'
import { ProofreadPlugin } from './proofread.plugin'
import { RewritePlugin } from './rewrite.plugin'

// 导出内置增强操作插件集合
export const builtinEnhanceOperationPlugins = [
  new PolishPlugin(),
  new ShortenPlugin(),
  new ExpandPlugin(),
  new ProofreadPlugin(),
  new RewritePlugin()
]

// 同时导出实例以保持向后兼容
export const polishPlugin = builtinEnhanceOperationPlugins[0]
export const shortenPlugin = builtinEnhanceOperationPlugins[1]
export const expandPlugin = builtinEnhanceOperationPlugins[2]
export const proofreadPlugin = builtinEnhanceOperationPlugins[3]
export const rewritePlugin = builtinEnhanceOperationPlugins[4]