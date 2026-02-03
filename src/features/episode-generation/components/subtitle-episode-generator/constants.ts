import { StyleOption } from './types'
import { getAllTitleStyles, getAllSummaryStyles } from '@/features/episode-generation/plugins/plugin-service'

// 硅基流动支持的模型列表
export const SILICONFLOW_MODELS = [
  { id: "deepseek-ai/DeepSeek-V2.5", name: "DeepSeek-V2.5", description: "强大的中文理解能力" },
  { id: "Qwen/Qwen2.5-72B-Instruct", name: "Qwen2.5-72B", description: "阿里通义千问大模型" },
  { id: "meta-llama/Meta-Llama-3.1-70B-Instruct", name: "Llama-3.1-70B", description: "Meta开源大模型" },
  { id: "01-ai/Yi-1.5-34B-Chat", name: "Yi-1.5-34B", description: "零一万物大模型" },
  { id: "THUDM/glm-4-9b-chat", name: "GLM-4-9B", description: "智谱AI大模型" }
]

// 标题风格选项（从插件系统获取）
export const TITLE_STYLES: StyleOption[] = getAllTitleStyles()

// 简介风格选项（从插件系统获取）
export const SUMMARY_STYLES: StyleOption[] = getAllSummaryStyles()

// 兼容性：保持原有的GENERATION_STYLES用于向后兼容
export const GENERATION_STYLES = SUMMARY_STYLES

// 超强浏览器菜单禁用样式
export const REWRITE_MODE_STYLES = `
  /* 全局禁用改写模式下的所有选择和菜单 */
  body.rewrite-mode-active,
  body.rewrite-mode-active * {
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
    user-select: none !important;
    -webkit-touch-callout: none !important;
    -webkit-user-drag: none !important;
    -khtml-user-drag: none !important;
    -moz-user-drag: none !important;
    -o-user-drag: none !important;
    user-drag: none !important;
    -webkit-tap-highlight-color: transparent !important;
  }

  /* 禁用所有选择高亮 */
  body.rewrite-mode-active *::selection,
  body.rewrite-mode-active *::-moz-selection,
  body.rewrite-mode-active *::-webkit-selection {
    background: transparent !important;
    color: inherit !important;
  }

  /* 只允许在指定区域选择文字 */
  body.rewrite-mode-active .text-selectable {
    -webkit-user-select: text !important;
    -moz-user-select: text !important;
    -ms-user-select: text !important;
    user-select: text !important;
  }

  body.rewrite-mode-active .text-selectable::selection {
    background: #3b82f6 !important;
    color: white !important;
  }

  body.rewrite-mode-active .text-selectable::-moz-selection {
    background: #3b82f6 !important;
    color: white !important;
  }

  /* 隐藏所有可能的浏览器UI元素 */
  body.rewrite-mode-active [role="menu"],
  body.rewrite-mode-active [role="menuitem"],
  body.rewrite-mode-active [role="tooltip"],
  body.rewrite-mode-active .context-menu,
  body.rewrite-mode-active .selection-menu,
  body.rewrite-mode-active .copy-menu,
  body.rewrite-mode-active [data-testid*="menu"],
  body.rewrite-mode-active [class*="menu"],
  body.rewrite-mode-active [class*="context"],
  body.rewrite-mode-active [class*="selection"],
  body.rewrite-mode-active [class*="copy"] {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }

  /* 禁用浏览器扩展可能添加的元素 */
  body.rewrite-mode-active [data-extension],
  body.rewrite-mode-active [data-copilot],
  body.rewrite-mode-active [data-grammarly],
  body.rewrite-mode-active [data-translate] {
    display: none !important;
  }
`