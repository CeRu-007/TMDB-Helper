/**
 * 插件系统核心模块
 * 导出所有核心类型和类
 */

export { PluginType, PluginStatus } from './types';
export type {
  PluginRegistrationOptions,
  PluginInfo,
  EnhanceOperationType,
  IPlugin,
  ITitleStylePlugin,
  ISummaryStylePlugin,
  IEnhanceOperationPlugin,
  EpisodeContent,
  ParsedTitle,
  ParsedSummary,
  TitleStyleConfig,
  SummaryStyleConfig,
  SummaryConstraints,
  ValidationResult,
  EnhanceInput,
  EnhanceOutput,
  EnhanceConfig,
} from './types';
export * from './base-plugin';
export { PluginContext } from './plugin-context';
export * from './plugin-registry';
export * from './plugin-manager';
