/**
 * 插件系统主入口
 * 导出所有插件和核心功能
 */

export * from './core'
export * from './title-styles'
export * from './summary-styles'
export * from './enhance-operations'

// 导出内置插件集合
import { 
  locationSkillPlugin,
  characterFocusPlugin,
  plot_highlightPlugin,
  emotional_corePlugin,
  mystery_suspensePlugin,
  action_adventurePlugin,
  romantic_dramaPlugin,
  philosophicalPlugin,
  comedy_humorPlugin,
  traditional_classicPlugin,
  modern_trendyPlugin,
  poetic_artisticPlugin,
  simple_directPlugin,
  symbolic_metaphorPlugin,
  countdown_urgencyPlugin
} from './title-styles'

import {
  netflixPlugin,
  crunchyrollPlugin,
  imitatePlugin,
  ai_freePlugin,
  professionalPlugin,
  engagingPlugin,
  suspensefulPlugin,
  emotionalPlugin,
  humorousPlugin,
  dramaticPlugin,
  concisePlugin,
  detailedPlugin,
  actionPlugin,
  characterPlugin,
  plotPlugin,
  atmosphericPlugin,
  technicalPlugin,
  artisticPlugin,
  accessiblePlugin,
  objectivePlugin
} from './summary-styles'

import {
  builtinEnhanceOperationPlugins
} from './enhance-operations'

export const builtinTitleStylePlugins = [
  locationSkillPlugin,
  characterFocusPlugin,
  plot_highlightPlugin,
  emotional_corePlugin,
  mystery_suspensePlugin,
  action_adventurePlugin,
  romantic_dramaPlugin,
  philosophicalPlugin,
  comedy_humorPlugin,
  traditional_classicPlugin,
  modern_trendyPlugin,
  poetic_artisticPlugin,
  simple_directPlugin,
  symbolic_metaphorPlugin,
  countdown_urgencyPlugin
]

export const builtinSummaryStylePlugins = [
  netflixPlugin,
  crunchyrollPlugin,
  imitatePlugin,
  ai_freePlugin,
  professionalPlugin,
  engagingPlugin,
  suspensefulPlugin,
  emotionalPlugin,
  humorousPlugin,
  dramaticPlugin,
  concisePlugin,
  detailedPlugin,
  actionPlugin,
  characterPlugin,
  plotPlugin,
  atmosphericPlugin,
  technicalPlugin,
  artisticPlugin,
  accessiblePlugin,
  objectivePlugin
]

export const allBuiltinPlugins = [
  ...builtinTitleStylePlugins,
  ...builtinSummaryStylePlugins,
  ...builtinEnhanceOperationPlugins
]