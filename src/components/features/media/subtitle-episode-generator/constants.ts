import { StyleOption } from './types'

// 硅基流动支持的模型列表
export const SILICONFLOW_MODELS = [
  { id: "deepseek-ai/DeepSeek-V2.5", name: "DeepSeek-V2.5", description: "强大的中文理解能力" },
  { id: "Qwen/Qwen2.5-72B-Instruct", name: "Qwen2.5-72B", description: "阿里通义千问大模型" },
  { id: "meta-llama/Meta-Llama-3.1-70B-Instruct", name: "Llama-3.1-70B", description: "Meta开源大模型" },
  { id: "01-ai/Yi-1.5-34B-Chat", name: "Yi-1.5-34B", description: "零一万物大模型" },
  { id: "THUDM/glm-4-9b-chat", name: "GLM-4-9B", description: "智谱AI大模型" }
]

// 标题风格选项
export const TITLE_STYLES: StyleOption[] = [
  // 原有风格
  { id: "location_skill", name: "地名招式风格", description: "优先使用字幕中出现的具体地名、招式名、技能名作为标题核心，采用简洁的组合方式，如：树神之谜、封印之战、古村秘密等，避免使用冒号或复杂格式", icon: "⚔️" },
  { id: "character_focus", name: "角色聚焦", description: "以主要角色名字和行动为标题重点，突出角色的成长与变化", icon: "👤" },
  { id: "plot_highlight", name: "情节亮点", description: "突出本集最重要的情节转折点，强调故事发展的关键节点", icon: "🎯" },
  { id: "emotional_core", name: "情感核心", description: "以情感冲突或情感高潮为标题主题，注重内心世界的描绘", icon: "💫" },

  // 新增风格
  { id: "mystery_suspense", name: "悬疑推理", description: "营造神秘感和悬念，使用疑问式或暗示性的表达，如：消失的真相、隐藏的秘密、未解之谜", icon: "🔍" },
  { id: "action_adventure", name: "动作冒险", description: "强调动作场面和冒险元素，使用动感十足的词汇，如：激战、追击、突破、征服", icon: "⚡" },
  { id: "romantic_drama", name: "浪漫情感", description: "突出爱情线和情感纠葛，使用温馨或戏剧化的表达，如：心动时刻、告白之夜、离别之痛", icon: "💕" },
  { id: "philosophical", name: "哲理思辨", description: "体现深层思考和人生哲理，使用富有思辨性的词汇，如：选择、命运、真理、觉醒", icon: "🤔" },
  { id: "comedy_humor", name: "喜剧幽默", description: "突出轻松幽默的元素，使用俏皮或反差的表达，如：意外惊喜、搞笑日常、乌龙事件", icon: "😄" },
  { id: "traditional_classic", name: "传统经典", description: "采用经典的命名方式，使用传统文学色彩的词汇，如：风云变幻、英雄本色、江湖恩仇", icon: "📜" },
  { id: "modern_trendy", name: "现代时尚", description: "使用现代化和时尚的表达方式，贴近年轻观众的语言习惯，如：逆袭、燃爆、高能", icon: "🔥" },
  { id: "poetic_artistic", name: "诗意文艺", description: "采用优美诗意的表达，注重意境和美感，如：月下花前、春风化雨、岁月如歌", icon: "🌸" },
  { id: "simple_direct", name: "简洁直白", description: "使用最直接明了的表达，避免修饰，直击要害，如：决战、重逢、背叛、新生", icon: "📝" },
  { id: "symbolic_metaphor", name: "象征隐喻", description: "运用象征和隐喻手法，富有深层含义，如：破茧成蝶、星火燎原、镜花水月", icon: "🎭" },
  { id: "countdown_urgency", name: "紧迫倒计时", description: "营造紧迫感和时间压力，如：最后一战、倒计时、生死时速、关键时刻", icon: "⏰" }
]

// 简介风格选项
export const SUMMARY_STYLES: StyleOption[] = [
  // 特殊风格 - 模仿风格（互斥）
  { id: "imitate", name: "模仿", description: "根据提供的样本内容，模仿其写作风格和表达方式生成简介", icon: "🎭", isExclusive: true },

  // 平台风格
  { id: "crunchyroll", name: "Crunchyroll平台风格", description: "动漫平台专业风格：结构化简洁表达，客观描述核心冲突", icon: "🍥" },
  { id: "netflix", name: "Netflix平台风格", description: "情感驱动叙述，强调角色困境与选择，富有张力的悬念营造", icon: "🎬" },
  { id: "ai_free", name: "AI自由发挥", description: "AI根据内容自由生成", icon: "🤖" },

  // 常规风格
  { id: "professional", name: "专业", description: "正式、准确的描述风格", icon: "📝" },
  { id: "engaging", name: "引人入胜", description: "吸引观众的生动描述", icon: "✨" },
  { id: "suspenseful", name: "悬疑", description: "营造紧张悬疑氛围", icon: "🔍" },
  { id: "emotional", name: "情感", description: "注重情感表达和共鸣", icon: "💝" },
  { id: "humorous", name: "幽默", description: "轻松幽默的表达方式", icon: "😄" },
  { id: "dramatic", name: "戏剧化", description: "强调戏剧冲突和张力", icon: "🎭" },

  // 新增风格
  { id: "concise", name: "简洁明了", description: "简短直接的核心内容描述", icon: "📋" },
  { id: "detailed", name: "详细描述", description: "丰富详尽的内容介绍", icon: "📖" },
  { id: "action", name: "动作导向", description: "突出动作场面和节奏感", icon: "⚡" },
  { id: "character", name: "角色聚焦", description: "以角色发展和关系为中心", icon: "👥" },
  { id: "plot", name: "情节推进", description: "强调故事情节的发展脉络", icon: "🧩" },
  { id: "atmospheric", name: "氛围营造", description: "注重场景和氛围的描述", icon: "🌅" },
  { id: "technical", name: "技术分析", description: "从制作技术角度进行描述", icon: "🎯" },
  { id: "artistic", name: "文艺风格", description: "优雅文艺的表达方式", icon: "🎨" },
  { id: "accessible", name: "通俗易懂", description: "大众化的表达方式", icon: "👨‍👩‍👧‍👦" },
  { id: "objective", name: "客观中性", description: "客观事实性的描述", icon: "⚖️" }
]

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