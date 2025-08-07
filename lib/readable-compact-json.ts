/**
 * 可读紧凑JSON格式化工具
 * 在保持紧凑的同时提高可读性
 */

/**
 * 智能JSON序列化，既紧凑又可读
 */
export function stringifyReadableCompact(data: any): string {
  return JSON.stringify(data, null, 0)
    .replace(/},/g, '},\n')  // 在对象结束后换行
    .replace(/\[{/g, '[\n{')  // 数组开始时换行
    .replace(/}\]/g, '}\n]')  // 数组结束前换行
    .replace(/,{/g, ',\n{')   // 对象之间换行
    .replace(/"episodes":\[([^\]]+)\]/g, (match, episodes) => {
      // episodes数组保持在一行，但在元素间添加空格
      const formatted = episodes.replace(/},/g, '}, ');
      return `"episodes":[${formatted}]`;
    })
    .replace(/"seasons":\[([^\]]+)\]/g, (match, seasons) => {
      // seasons数组的处理
      if (seasons.length < 200) { // 短的seasons保持一行
        const formatted = seasons.replace(/},/g, '}, ');
        return `"seasons":[${formatted}]`;
      }
      return match; // 长的seasons使用默认格式
    });
}

/**
 * 更高级的可读紧凑格式化
 * 针对TMDB数据结构优化
 */
export function stringifyTMDBReadableCompact(items: any[]): string {
  if (!Array.isArray(items)) {
    return stringifyReadableCompact(items);
  }

  const formattedItems = items.map(item => {
    // 对每个项目进行格式化
    const itemStr = JSON.stringify(item, null, 0);
    
    // 对episodes进行特殊处理 - 保持紧凑但可读
    return itemStr
      .replace(/"episodes":\[([^\]]*)\]/g, (match, episodes) => {
        if (!episodes.trim()) return '"episodes":[]';
        
        // 将episodes格式化为每行几个元素
        const episodeArray = episodes.split('},{');
        const formattedEpisodes = [];
        
        for (let i = 0; i < episodeArray.length; i += 5) {
          const chunk = episodeArray.slice(i, i + 5);
          const chunkStr = chunk.join('},{');
          formattedEpisodes.push(chunkStr);
        }
        
        if (formattedEpisodes.length === 1) {
          // 如果只有一行，保持紧凑
          return `"episodes":[${formattedEpisodes[0]}]`;
        } else {
          // 多行时，每行缩进
          const formatted = formattedEpisodes
            .map(chunk => `    ${chunk}`)
            .join('},\n    {');
          return `"episodes":[\n    {${formatted}}\n  ]`;
        }
      })
      .replace(/"seasons":\[([^\]]*)\]/g, (match, seasons) => {
        if (!seasons.trim()) return '"seasons":[]';
        
        // seasons每个对象一行
        const seasonArray = seasons.split('},{');
        if (seasonArray.length === 1) {
          return `"seasons":[${seasons}]`;
        } else {
          const formatted = seasonArray
            .map((season, index) => {
              if (index === 0) return `    {${season}}`;
              if (index === seasonArray.length - 1) return `    {${season}`;
              return `    {${season}}`;
            })
            .join(',\n');
          return `"seasons":[\n${formatted}\n  ]`;
        }
      });
  });

  // 将所有项目组合，每个项目之间换行
  return '[\n' + formattedItems.map(item => `  ${item}`).join(',\n') + '\n]';
}

/**
 * 美观紧凑格式 - 对称美观又紧凑
 * 适当的缩进和换行，保持视觉美感
 */
export function stringifySimpleReadableCompact(data: any): string {
  // 先使用标准格式化，然后进行美化调整
  let formatted = JSON.stringify(data, null, 2);

  // 对episodes数组进行特殊处理：每行显示5个episode，保持对称美观
  formatted = formatted.replace(
    /"episodes":\s*\[\s*([\s\S]*?)\s*\]/g,
    (match, episodes) => {
      if (!episodes.trim()) return '"episodes": []';

      // 提取所有episode对象
      const episodeMatches = episodes.match(/\{[\s\S]*?\}/g);
      if (!episodeMatches || episodeMatches.length === 0) return match;

      // 将每个episode对象转换为单行格式
      const compactEpisodes = episodeMatches.map(ep => {
        return ep.replace(/\s+/g, ' ').replace(/\{\s*/, '{').replace(/\s*\}/, '}');
      });

      // 如果只有少量episodes，保持在一行
      if (compactEpisodes.length <= 3) {
        return `"episodes": [${compactEpisodes.join(', ')}]`;
      }

      // 每行5个episode，格式化为美观的多行
      const lines = [];
      for (let i = 0; i < compactEpisodes.length; i += 5) {
        const chunk = compactEpisodes.slice(i, i + 5);
        lines.push('      ' + chunk.join(', '));
      }

      return `"episodes": [\n${lines.join(',\n')}\n    ]`;
    }
  );

  return formatted;
}



/**
 * 针对定时任务的可读紧凑格式
 */
export function stringifyScheduledTasksReadableCompact(tasks: any[]): string {
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return JSON.stringify(tasks);
  }

  const formattedTasks = tasks.map(task => {
    return JSON.stringify(task, null, 0);
  });

  return '[\n  ' + formattedTasks.join(',\n  ') + '\n]';
}

/**
 * 自动选择最佳格式化方式
 */
export function stringifyAuto(data: any, dataType?: 'tmdb' | 'tasks' | 'config'): string {
  // 统一使用简单可读紧凑格式，既节省空间又便于阅读
  return stringifySimpleReadableCompact(data);
}

/**
 * 更新自动优化工具以使用可读紧凑格式
 */
export function optimizeToReadableCompact(jsonString: string, dataType?: string): string {
  try {
    const data = JSON.parse(jsonString);
    return stringifyAuto(data, dataType as any);
  } catch (error) {
    console.error('JSON解析失败:', error);
    return jsonString;
  }
}
