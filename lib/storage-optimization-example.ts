/**
 * 存储和网络优化使用示例
 * 展示如何使用新的优化功能
 */

import { enhancedStorageManager } from './enhanced-storage-manager';
import { storageMigration } from './storage-migration';
import { tmdbNetworkOptimizer, networkOptimizer } from './network-optimizer';
import { TMDBItem, ScheduledTask } from './storage';

/**
 * 示例1: 使用增强存储管理器
 */
export async function exampleEnhancedStorage() {
  console.log('=== 增强存储管理器示例 ===');

  try {
    // 获取所有项目（自动使用IndexedDB或localStorage）
    const items = await enhancedStorageManager.getItems();
    console.log(`获取到 ${items.length} 个项目`);

    // 智能搜索（本地+网络）
    const searchResults = await enhancedStorageManager.smartSearch('复仇者联盟', {
      mediaType: 'movie',
      searchLocal: true,
      searchNetwork: true,
      limit: 10
    });
    console.log(`搜索结果: 本地 ${searchResults.local.length} 个，网络 ${searchResults.network.length} 个`);

    // 条件查询
    const tvShows = await enhancedStorageManager.queryItems({
      mediaType: 'tv',
      status: 'ongoing',
      weekday: 1 // 周一播出
    });
    console.log(`找到 ${tvShows.length} 个周一播出的电视剧`);

    // 批量更新项目
    if (items.length > 0) {
      const updatedItems = items.slice(0, 5).map(item => ({
        ...item,
        updatedAt: new Date().toISOString()
      }));
      
      const batchResult = await enhancedStorageManager.batchUpdateItems(updatedItems);
      console.log(`批量更新结果: 成功 ${batchResult.success} 个，失败 ${batchResult.failed} 个`);
    }

    // 获取存储统计信息
    const stats = await enhancedStorageManager.getStorageStats();
    console.log('存储统计:', {
      项目数量: stats.items,
      任务数量: stats.tasks,
      缓存条目: stats.cacheEntries,
      数据库大小: `${(stats.dbSize / 1024 / 1024).toFixed(2)} MB`,
      网络请求成功率: `${(stats.networkStats.successRate * 100).toFixed(1)}%`,
      平均响应时间: `${stats.networkStats.averageResponseTime.toFixed(0)} ms`,
      缓存命中率: `${(stats.networkStats.cacheHitRate * 100).toFixed(1)}%`
    });

    // 健康状态检查
    const health = await enhancedStorageManager.getHealthStatus();
    console.log('系统健康状态:', health.status, health.details);

  } catch (error) {
    console.error('增强存储管理器示例失败:', error);
  }
}

/**
 * 示例2: 数据迁移
 */
export async function exampleStorageMigration() {
  console.log('=== 存储迁移示例 ===');

  try {
    // 检查是否需要迁移
    const migrationCheck = await storageMigration.checkMigrationNeeded();
    console.log('迁移检查结果:', {
      需要迁移: migrationCheck.needed,
      原因: migrationCheck.reason,
      localStorage项目: migrationCheck.localStorageItems,
      localStorage任务: migrationCheck.localStorageTasks,
      IndexedDB项目: migrationCheck.indexedDBItems,
      IndexedDB任务: migrationCheck.indexedDBTasks
    });

    if (migrationCheck.needed) {
      console.log('开始数据迁移...');
      
      // 执行迁移，带进度回调
      const migrationResult = await storageMigration.migrate({
        backupFirst: true,
        clearLocalStorageAfter: true,
        onProgress: (progress) => {
          console.log(`迁移进度: ${progress.stage} - ${progress.progress.toFixed(1)}% - ${progress.message}`);
        }
      });

      console.log('迁移结果:', {
        成功: migrationResult.success,
        项目迁移数量: migrationResult.itemsMigrated,
        任务迁移数量: migrationResult.tasksMigrated,
        耗时: `${migrationResult.duration} ms`,
        错误数量: migrationResult.errors.length,
        警告数量: migrationResult.warnings.length
      });

      if (migrationResult.errors.length > 0) {
        console.error('迁移错误:', migrationResult.errors);
      }

      if (migrationResult.warnings.length > 0) {
        console.warn('迁移警告:', migrationResult.warnings);
      }
    }

    // 获取可用备份
    const backups = storageMigration.getAvailableBackups();
    console.log(`找到 ${backups.length} 个备份:`, backups);

  } catch (error) {
    console.error('存储迁移示例失败:', error);
  }
}

/**
 * 示例3: 网络优化
 */
export async function exampleNetworkOptimization() {
  console.log('=== 网络优化示例 ===');

  try {
    // 搜索电影（使用网络优化器）
    const movieResults = await tmdbNetworkOptimizer.searchMovie('钢铁侠');
    console.log(`搜索到 ${movieResults.results?.length || 0} 部电影`);

    // 搜索电视剧
    const tvResults = await tmdbNetworkOptimizer.searchTV('权力的游戏');
    console.log(`搜索到 ${tvResults.results?.length || 0} 部电视剧`);

    // 批量获取详情
    const batchItems = [
      { id: '299536', type: 'movie' as const }, // 复仇者联盟4
      { id: '1399', type: 'tv' as const },     // 权力的游戏
      { id: '550', type: 'movie' as const }    // 搏击俱乐部
    ];

    console.log('开始批量获取详情...');
    const batchDetails = await tmdbNetworkOptimizer.batchGetDetails(batchItems);
    console.log(`批量获取完成，成功获取 ${batchDetails.filter(d => d !== null).length} 个详情`);

    // 预加载热门内容
    console.log('开始预加载热门内容...');
    await tmdbNetworkOptimizer.preloadPopularContent();
    console.log('热门内容预加载完成');

    // 获取网络性能统计
    const networkStats = networkOptimizer.getPerformanceStats();
    console.log('网络性能统计:', {
      总请求数: networkStats.totalRequests,
      成功率: `${(networkStats.successRate * 100).toFixed(1)}%`,
      平均响应时间: `${networkStats.averageResponseTime.toFixed(0)} ms`,
      缓存命中率: `${(networkStats.cacheHitRate * 100).toFixed(1)}%`,
      去重请求数: networkStats.deduplicatedRequests,
      批量请求数: networkStats.batchRequests
    });

    // 清理缓存
    await networkOptimizer.clearCache();
    console.log('网络缓存已清理');

  } catch (error) {
    console.error('网络优化示例失败:', error);
  }
}

/**
 * 示例4: 综合使用场景
 */
export async function exampleComprehensiveUsage() {
  console.log('=== 综合使用场景示例 ===');

  try {
    // 场景：用户搜索并添加新项目
    console.log('场景1: 搜索并添加新项目');
    
    const searchQuery = '蜘蛛侠';
    const searchResults = await enhancedStorageManager.smartSearch(searchQuery, {
      mediaType: 'movie',
      searchNetwork: true,
      limit: 5
    });

    if (searchResults.network.length > 0) {
      const firstResult = searchResults.network[0];
      
      // 创建新项目
      const newItem: TMDBItem = {
        id: `tmdb_${firstResult.id}_${Date.now()}`,
        tmdbId: firstResult.id.toString(),
        title: firstResult.title || firstResult.name,
        originalTitle: firstResult.original_title || firstResult.original_name,
        mediaType: firstResult.media_type || 'movie',
        overview: firstResult.overview,
        posterPath: firstResult.poster_path,
        backdropPath: firstResult.backdrop_path,
        voteAverage: firstResult.vote_average,
        category: 'movie',
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // 添加项目
      const addSuccess = await enhancedStorageManager.addItem(newItem);
      console.log(`添加项目 "${newItem.title}": ${addSuccess ? '成功' : '失败'}`);
    }

    // 场景：批量更新项目的TMDB数据
    console.log('场景2: 批量更新TMDB数据');
    
    const allItems = await enhancedStorageManager.getItems();
    const itemsToEnrich = allItems.slice(0, 3); // 只处理前3个项目作为示例
    
    if (itemsToEnrich.length > 0) {
      await enhancedStorageManager.enrichItemsWithTMDBData(itemsToEnrich);
      console.log(`已增强 ${itemsToEnrich.length} 个项目的TMDB数据`);
    }

    // 场景：导出和导入数据
    console.log('场景3: 数据导出导入');
    
    const exportData = await enhancedStorageManager.exportData();
    console.log(`导出数据大小: ${(exportData.length / 1024).toFixed(2)} KB`);

    // 模拟导入（实际使用中不会导入相同的数据）
    // const importResult = await enhancedStorageManager.importData(exportData);
    // console.log('导入结果:', importResult);

    // 场景：性能监控和优化
    console.log('场景4: 性能监控');
    
    const finalStats = await enhancedStorageManager.getStorageStats();
    console.log('最终统计:', {
      总项目数: finalStats.items,
      总任务数: finalStats.tasks,
      缓存效率: `${(finalStats.networkStats.cacheHitRate * 100).toFixed(1)}%`,
      平均响应时间: `${finalStats.networkStats.averageResponseTime.toFixed(0)} ms`
    });

    // 清理操作
    console.log('执行清理操作...');
    await enhancedStorageManager.cleanup();
    console.log('清理完成');

  } catch (error) {
    console.error('综合使用场景示例失败:', error);
  }
}

/**
 * 运行所有示例
 */
export async function runAllExamples() {
  console.log('开始运行所有优化功能示例...\n');

  try {
    await exampleEnhancedStorage();
    console.log('\n');
    
    await exampleStorageMigration();
    console.log('\n');
    
    await exampleNetworkOptimization();
    console.log('\n');
    
    await exampleComprehensiveUsage();
    console.log('\n');

    console.log('所有示例运行完成！');
  } catch (error) {
    console.error('运行示例时发生错误:', error);
  }
}

/**
 * 性能测试
 */
export async function performanceTest() {
  console.log('=== 性能测试 ===');

  try {
    const testData: TMDBItem[] = [];
    
    // 生成测试数据
    for (let i = 0; i < 100; i++) {
      testData.push({
        id: `test_${i}`,
        tmdbId: `${1000 + i}`,
        title: `测试项目 ${i}`,
        mediaType: i % 2 === 0 ? 'movie' : 'tv',
        category: 'test',
        status: 'completed',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    // 测试批量插入性能
    console.log('测试批量插入性能...');
    const insertStart = performance.now();
    const batchResult = await enhancedStorageManager.batchUpdateItems(testData);
    const insertEnd = performance.now();
    
    console.log(`批量插入 ${testData.length} 个项目:`);
    console.log(`- 成功: ${batchResult.success} 个`);
    console.log(`- 失败: ${batchResult.failed} 个`);
    console.log(`- 耗时: ${(insertEnd - insertStart).toFixed(2)} ms`);
    console.log(`- 平均每个: ${((insertEnd - insertStart) / testData.length).toFixed(2)} ms`);

    // 测试查询性能
    console.log('\n测试查询性能...');
    const queryStart = performance.now();
    const queryResults = await enhancedStorageManager.queryItems({
      mediaType: 'movie'
    });
    const queryEnd = performance.now();
    
    console.log(`查询结果: ${queryResults.length} 个项目`);
    console.log(`查询耗时: ${(queryEnd - queryStart).toFixed(2)} ms`);

    // 测试搜索性能
    console.log('\n测试搜索性能...');
    const searchStart = performance.now();
    const searchResults = await enhancedStorageManager.smartSearch('测试', {
      searchLocal: true,
      searchNetwork: false
    });
    const searchEnd = performance.now();
    
    console.log(`搜索结果: ${searchResults.local.length} 个项目`);
    console.log(`搜索耗时: ${(searchEnd - searchStart).toFixed(2)} ms`);

    // 清理测试数据
    console.log('\n清理测试数据...');
    for (const item of testData) {
      await enhancedStorageManager.deleteItem(item.id);
    }
    console.log('测试数据清理完成');

  } catch (error) {
    console.error('性能测试失败:', error);
  }
}

// 如果在浏览器环境中，可以将这些函数挂载到window对象上方便调试
if (typeof window !== 'undefined') {
  (window as any).storageOptimizationExamples = {
    runAllExamples,
    exampleEnhancedStorage,
    exampleStorageMigration,
    exampleNetworkOptimization,
    exampleComprehensiveUsage,
    performanceTest
  };
  
  console.log('存储优化示例已挂载到 window.storageOptimizationExamples');
  console.log('可以在控制台中运行: window.storageOptimizationExamples.runAllExamples()');
}