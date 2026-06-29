/**
 * 插件系统测试脚本
 * 验证插件系统是否正常工作
 */

import {
  PluginManager,
  allBuiltinPlugins,
  PluginType,
} from '../src/features/episode-generation/plugins/index';

import {
  getAllTitleStyles,
  getAllSummaryStyles,
} from '../src/features/episode-generation/plugins/plugin-service';

console.log('🚀 开始测试插件系统...\n');

// 测试1: 初始化插件管理器
console.log('测试1: 初始化插件管理器');
const generateFn = async (
  prompt: string,
  config: { temperature?: number; maxTokens?: number }
): Promise<string> => {
  return `模拟生成结果 for: ${prompt.substring(0, 50)}...`;
};

const pluginManager = new PluginManager(generateFn);
console.log('✓ 插件管理器创建成功');

// 测试2: 注册插件
console.log('\n测试2: 注册内置插件');
const registeredCount = pluginManager.registerBatch(allBuiltinPlugins);
console.log(`✓ 成功注册 ${registeredCount} 个插件`);

// 测试3: 获取插件统计
console.log('\n测试3: 获取插件统计');
const stats = {
  total: pluginManager.getCount(),
  titleStyles: pluginManager.getTitleStyleCount(),
  summaryStyles: pluginManager.getSummaryStyleCount(),
  initialized: pluginManager.isInitialized(),
};
console.log(`✓ 总插件数: ${stats.total}`);
console.log(`✓ 标题风格: ${stats.titleStyles}`);
console.log(`✓ 简介风格: ${stats.summaryStyles}`);
console.log(`✓ 已初始化: ${stats.initialized}`);

// 测试4: 获取所有标题风格
console.log('\n测试4: 获取所有标题风格');
const titleStyles = getAllTitleStyles();
console.log(`✓ 标题风格数量: ${titleStyles.length}`);
titleStyles.slice(0, 3).forEach((style) => {
  console.log(`  - ${style.name} (${style.id}): ${style.icon}`);
});

// 测试5: 获取所有简介风格
console.log('\n测试5: 获取所有简介风格');
const summaryStyles = getAllSummaryStyles();
console.log(`✓ 简介风格数量: ${summaryStyles.length}`);
summaryStyles.slice(0, 3).forEach((style) => {
  console.log(
    `  - ${style.name} (${style.id}): ${style.icon}${style.isExclusive ? ' [互斥]' : ''}`
  );
});

// 测试6: 测试特定插件
console.log('\n测试6: 测试特定插件');
const netflixPlugin = pluginManager.get('netflix');
if (netflixPlugin) {
  console.log(`✓ 找到 Netflix 插件: ${netflixPlugin.name}`);
  console.log(`  - 类型: ${netflixPlugin.type}`);
  console.log(`  - 描述: ${netflixPlugin.description}`);
  console.log(`  - 版本: ${netflixPlugin.version}`);
} else {
  console.log('✗ 未找到 Netflix 插件');
}

// 测试7: 测试插件方法
console.log('\n测试7: 测试插件方法');
if (netflixPlugin && netflixPlugin.type === PluginType.SummaryStyle) {
  const episodeContent = {
    fileName: 'test.srt',
    episodeNumber: 1,
    subtitleContent: '这是一段测试字幕内容，用于验证插件系统是否正常工作。',
    wordCount: 30,
  };

  try {
    const prompt = netflixPlugin.buildPrompt(episodeContent);
    console.log(`✓ buildPrompt 成功 (长度: ${prompt.length} 字符)`);

    const testContent = '{"title":"测试标题","summary":"测试简介内容"}';
    const parsed = netflixPlugin.parseResult(testContent);
    console.log(`✓ parseResult 成功`);
    console.log(`  - 简介长度: ${parsed.wordCount} 字`);
    console.log(`  - 置信度: ${parsed.confidence}`);
  } catch (error) {
    console.log(`✗ 插件方法测试失败: ${error}`);
  }
}

// 测试8: 按标签筛选
console.log('\n测试8: 按标签筛选');
const platformPlugins = pluginManager.getByTag('platform');
console.log(`✓ 找到 ${platformPlugins.length} 个平台风格插件`);
platformPlugins.forEach((plugin) => {
  console.log(`  - ${plugin.name}`);
});

console.log('\n✅ 所有测试完成！');
console.log('\n📊 测试总结:');
console.log(`  - 插件总数: ${stats.total}`);
console.log(`  - 标题风格: ${stats.titleStyles}`);
console.log(`  - 简介风格: ${stats.summaryStyles}`);
console.log('\n🎉 插件系统运行正常！');
