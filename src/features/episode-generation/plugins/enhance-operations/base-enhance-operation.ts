/**
 * 增强操作插件基类
 */

import { BasePlugin, PluginType } from '../core'
import { IEnhanceOperationPlugin, EnhanceInput, EnhanceOutput, EnhanceConfig, EnhanceOperationType } from './types'

/**
 * 增强操作插件抽象基类
 */
export abstract class BaseEnhanceOperationPlugin extends BasePlugin implements IEnhanceOperationPlugin {
  type: PluginType.EnhanceOperation = PluginType.EnhanceOperation
  
  abstract operationType: EnhanceOperationType
  abstract defaultConfig: EnhanceConfig
  
  abstract buildPrompt(input: EnhanceInput, config?: EnhanceConfig): string
  
  parseResult(content: string): EnhanceOutput {
    // 尝试解析标题和简介
    const lines = content.split('\n').filter(line => line.trim())
    let title = ''
    let summary = ''
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // 检查标题
      if (trimmedLine.match(/^(标题[:：]?\s*)/i)) {
        title = trimmedLine.replace(/^(标题[:：]?\s*)/i, '').trim()
      }
      // 检查简介
      else if (trimmedLine.match(/^(简介[:：]?\s*)/i)) {
        summary = trimmedLine.replace(/^(简介[:：]?\s*)/i, '').trim()
      }
      // 如果没有明确标识，但内容较长，可能是简介
      else if (trimmedLine.length > 20 && !trimmedLine.includes('标题')) {
        summary = trimmedLine
      }
    }
    
    return {
      title: title || '未找到标题',
      summary: summary || '未找到简介',
      confidence: 0.8
    }
  }
}