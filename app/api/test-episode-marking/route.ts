import { NextRequest, NextResponse } from 'next/server';
import { StorageManager } from '@/lib/storage';
import path from 'path';
import fs from 'fs/promises';

/**
 * POST /api/test-episode-marking - 测试集数标记功能
 */
export async function POST(request: NextRequest) {
  try {
    const { itemId, seasonNumber = 1, testEpisodes } = await request.json();
    
    if (!itemId) {
      return NextResponse.json({
        success: false,
        error: '缺少itemId参数'
      }, { status: 400 });
    }
    
    console.log(`[API] 测试集数标记功能: itemId=${itemId}, seasonNumber=${seasonNumber}`);
    
    // 获取项目数据
    const items = await StorageManager.getItemsWithRetry();
    const item = items.find(i => i.id === itemId);
    
    if (!item) {
      return NextResponse.json({
        success: false,
        error: '找不到指定的项目',
        details: { itemId }
      }, { status: 404 });
    }
    
    const testResult = {
      item: {
        id: item.id,
        title: item.title,
        mediaType: item.mediaType
      },
      beforeMarking: {
        markedEpisodes: [] as number[],
        totalEpisodes: 0
      },
      csvAnalysis: null as any,
      markingTest: null as any,
      afterMarking: {
        markedEpisodes: [] as number[],
        totalEpisodes: 0
      }
    };
    
    // 获取标记前的状态
    if (item.seasons && item.seasons.length > 0) {
      const targetSeason = item.seasons.find(s => s.seasonNumber === seasonNumber);
      if (targetSeason && targetSeason.episodes) {
        testResult.beforeMarking.totalEpisodes = targetSeason.episodes.length;
        targetSeason.episodes.forEach(ep => {
          if (ep.completed) {
            testResult.beforeMarking.markedEpisodes.push(ep.number);
          }
        });
      }
    } else if (item.episodes) {
      testResult.beforeMarking.totalEpisodes = item.episodes.length;
      item.episodes.forEach(ep => {
        if (ep.completed) {
          testResult.beforeMarking.markedEpisodes.push(ep.number);
        }
      });
    }
    
    testResult.beforeMarking.markedEpisodes.sort((a, b) => a - b);
    console.log(`[API] 标记前状态: ${testResult.beforeMarking.markedEpisodes.length}/${testResult.beforeMarking.totalEpisodes} 集已标记`);
    
    // 如果没有提供测试集数，尝试从CSV文件获取
    let episodesToTest = testEpisodes;
    
    if (!episodesToTest || episodesToTest.length === 0) {
      console.log(`[API] 没有提供测试集数，尝试从CSV文件获取...`);
      
      try {
        // 查找最新的CSV文件
        const tmdbImportDir = path.resolve(process.cwd(), 'TMDB-Import-master');
        const files = await fs.readdir(tmdbImportDir);
        const csvFiles = files.filter(file => file.endsWith('.csv') && !file.includes('_backup_'));
        
        if (csvFiles.length > 0) {
          const csvFilesWithStats = await Promise.all(
            csvFiles.map(async file => {
              const filePath = path.join(tmdbImportDir, file);
              const stats = await fs.stat(filePath);
              return { file, filePath, mtime: stats.mtime };
            })
          );
          
          csvFilesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
          const csvPath = csvFilesWithStats[0].filePath;
          
          console.log(`[API] 分析CSV文件: ${csvPath}`);
          
          // 调用CSV分析API
          const csvResponse = await fetch(`${request.nextUrl.origin}/api/analyze-csv-episodes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ csvPath })
          });
          
          if (csvResponse.ok) {
            const csvResult = await csvResponse.json();
            if (csvResult.success && csvResult.remainingEpisodes) {
              episodesToTest = csvResult.remainingEpisodes;
              testResult.csvAnalysis = csvResult.analysis;
              console.log(`[API] 从CSV获取到测试集数: [${episodesToTest.join(', ')}]`);
            }
          }
        }
      } catch (csvError) {
        console.warn(`[API] 无法从CSV获取集数: ${csvError}`);
      }
    }
    
    // 如果仍然没有测试集数，使用默认值
    if (!episodesToTest || episodesToTest.length === 0) {
      episodesToTest = [1, 2, 3]; // 默认测试集数
      console.log(`[API] 使用默认测试集数: [${episodesToTest.join(', ')}]`);
    }
    
    // 测试标记功能
    console.log(`[API] 开始测试标记集数: [${episodesToTest.join(', ')}]`);
    
    try {
      const markResponse = await fetch(`${request.nextUrl.origin}/api/mark-episodes-completed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: item.id,
          seasonNumber: seasonNumber,
          episodeNumbers: episodesToTest
        })
      });
      
      if (!markResponse.ok) {
        const errorData = await markResponse.json().catch(() => ({}));
        throw new Error(`标记API失败 (${markResponse.status}): ${errorData.error || markResponse.statusText}`);
      }
      
      testResult.markingTest = await markResponse.json();
      console.log(`[API] 标记测试完成: ${testResult.markingTest.success ? '成功' : '失败'}`);
      
    } catch (markError) {
      testResult.markingTest = {
        success: false,
        error: markError instanceof Error ? markError.message : String(markError)
      };
      console.error(`[API] 标记测试失败: ${markError}`);
    }
    
    // 获取标记后的状态
    try {
      const updatedItems = await StorageManager.getItemsWithRetry();
      const updatedItem = updatedItems.find(i => i.id === itemId);
      
      if (updatedItem) {
        if (updatedItem.seasons && updatedItem.seasons.length > 0) {
          const targetSeason = updatedItem.seasons.find(s => s.seasonNumber === seasonNumber);
          if (targetSeason && targetSeason.episodes) {
            testResult.afterMarking.totalEpisodes = targetSeason.episodes.length;
            targetSeason.episodes.forEach(ep => {
              if (ep.completed) {
                testResult.afterMarking.markedEpisodes.push(ep.number);
              }
            });
          }
        } else if (updatedItem.episodes) {
          testResult.afterMarking.totalEpisodes = updatedItem.episodes.length;
          updatedItem.episodes.forEach(ep => {
            if (ep.completed) {
              testResult.afterMarking.markedEpisodes.push(ep.number);
            }
          });
        }
        
        testResult.afterMarking.markedEpisodes.sort((a, b) => a - b);
      }
    } catch (afterError) {
      console.error(`[API] 获取标记后状态失败: ${afterError}`);
    }
    
    // 计算变化
    const newlyMarked = testResult.afterMarking.markedEpisodes.filter(ep => 
      !testResult.beforeMarking.markedEpisodes.includes(ep)
    );
    
    console.log(`[API] 测试完成: 新标记了 ${newlyMarked.length} 个集数`);
    
    return NextResponse.json({
      success: true,
      testResult,
      summary: {
        testedEpisodes: episodesToTest,
        beforeCount: testResult.beforeMarking.markedEpisodes.length,
        afterCount: testResult.afterMarking.markedEpisodes.length,
        newlyMarked: newlyMarked,
        markingSuccessful: testResult.markingTest?.success || false,
        hasCSVData: !!testResult.csvAnalysis
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('[API] 测试集数标记功能失败:', error);
    return NextResponse.json({
      success: false,
      error: '测试失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
