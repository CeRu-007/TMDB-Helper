/**
 * 象征隐喻风格插件
 * 运用象征和隐喻手法，富有深层含义，如：破茧成蝶、星火燎原、镜花水月
 */

import {
  BasePlugin,
  PluginType,
  ITitleStylePlugin,
  EpisodeContent,
  ParsedTitle,
  TitleStyleConfig,
} from '../core';
import { cleanTitleText } from '../../lib/text-cleaner';

export const symbolic_metaphorPlugin: ITitleStylePlugin = new (class
  extends BasePlugin
  implements ITitleStylePlugin
{
  constructor() {
    super({
      id: 'symbolic_metaphor',
      type: PluginType.TitleStyle,
      name: '象征隐喻',
      description: '运用象征和隐喻手法，富有深层含义，如：破茧成蝶、星火燎原、镜花水月',
      icon: '🎭',
      version: '1.0.0',
      author: 'TMDB-Helper',
      isBuiltin: true,
      tags: ['symbolic_metaphor', 'builtin'],
      metadata: {
        category: 'title',
        difficulty: 'medium',
      },
    });
  }

  declare readonly type: PluginType.TitleStyle;

  defaultConfig: TitleStyleConfig = {
    maxLength: 20,
    minLength: 5,
    punctuationHandling: 'simplify',
  };

  buildPrompt(content: EpisodeContent, options?: Record<string, any>): string {
    const config = { ...this.defaultConfig, ...options };

    return `你是一位专业的影视内容编辑，擅长撰写象征隐喻风格的标题。

任务：为第 ${content.episodeNumber} 集撰写象征隐喻风格的标题

风格要求：
运用象征和隐喻手法，富有深层含义，如：破茧成蝶、星火燎原、镜花水月

内容来源：
${content.subtitleContent.substring(0, 2000)}${content.subtitleContent.length > 2000 ? '...' : ''}

${content.originalTitle ? `原标题：${content.originalTitle}` : ''}

请生成一个 ${config.minLength!}-${config.maxLength!} 字的标题，要求：
- 符合象征隐喻风格特点
- 简洁有力，易于记忆
- 直接输出标题，不要任何解释或附加内容`;
  }

  parseResult(generated: string, options?: Record<string, any>): ParsedTitle {
    const config = { ...this.defaultConfig, ...options };

    // 使用统一的标题清理工具（包括清理前缀、引号、标点、方括号、"第X集"）
    let title = cleanTitleText(generated);

    // 限制长度
    if (title.length > config.maxLength!) {
      title = title.substring(0, config.maxLength!);
    }

    let confidence = 100;
    if (title.length < config.minLength! * 0.5) {
      confidence = 40;
    }

    return {
      title: title.trim(),
      confidence,
      metadata: {
        pluginId: this.id,
        pluginVersion: this.version,
        originalLength: generated.length,
      },
    };
  }

  validate(title: string) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const config = this.defaultConfig!;

    if (title.length < config.minLength!) {
      errors.push(`标题过短：${title.length} 字，要求至少 ${config.minLength!} 字`);
    }

    if (title.length > config.maxLength!) {
      errors.push(`标题过长：${title.length} 字，要求最多 ${config.maxLength!} 字`);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
})();
