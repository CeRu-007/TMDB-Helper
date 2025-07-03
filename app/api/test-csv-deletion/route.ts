import { NextRequest, NextResponse } from 'next/server';
import { StorageManager } from '@/lib/storage';
import path from 'path';
import fs from 'fs/promises';

/**
 * POST /api/test-csv-deletion - 测试CSV集数删除功能
 */
export async function POST(request: NextRequest) {
  try {
    const { itemId, seasonNumber = 1 } = await request.json();
    
    if (!itemId) {
      return NextResponse.json({
        success: false,
        error: '缺少itemId参数'
      }, { status: 400 });
    }
    
    console.log(`[API] 测试CSV删除功能: itemId=${itemId}, seasonNumber=${seasonNumber}`);
    
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
    
    console.log(`[API] 找到项目: ${item.title}`);
    
    // 获取已标记的集数
    const markedEpisodes: number[] = [];
    
    if (item.seasons && item.seasons.length > 0) {
      // 多季模式
      const targetSeason = item.seasons.find(s => s.seasonNumber === seasonNumber);
      if (targetSeason && targetSeason.episodes) {
        targetSeason.episodes.forEach(episode => {
          if (episode.completed) {
            markedEpisodes.push(episode.number);
          }
        });
      }
    } else if (item.episodes) {
      // 单季模式
      item.episodes.forEach(episode => {
        if (episode.completed) {
          markedEpisodes.push(episode.number);
        }
      });
    }
    
    const sortedMarkedEpisodes = markedEpisodes.sort((a, b) => a - b);
    console.log(`[API] 已标记的集数: [${sortedMarkedEpisodes.join(', ')}]`);
    
    // 查找最新的CSV文件
    const tmdbImportDir = path.resolve(process.cwd(), 'TMDB-Import-master');
    let csvPath = '';
    
    try {
      const files = await fs.readdir(tmdbImportDir);
      const csvFiles = files.filter(file => file.endsWith('.csv'));
      
      if (csvFiles.length === 0) {
        return NextResponse.json({
          success: false,
          error: '在TMDB-Import目录中找不到CSV文件',
          details: { directory: tmdbImportDir, files }
        }, { status: 404 });
      }
      
      // 按修改时间排序，获取最新的CSV文件
      const csvFilesWithStats = await Promise.all(
        csvFiles.map(async file => {
          const filePath = path.join(tmdbImportDir, file);
          const stats = await fs.stat(filePath);
          return { file, filePath, mtime: stats.mtime };
        })
      );
      
      csvFilesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      csvPath = csvFilesWithStats[0].filePath;
      
      console.log(`[API] 使用最新的CSV文件: ${csvPath}`);
    } catch (dirError) {
      return NextResponse.json({
        success: false,
        error: '无法访问TMDB-Import目录',
        details: { directory: tmdbImportDir, error: dirError instanceof Error ? dirError.message : String(dirError) }
      }, { status: 500 });
    }
    
    // 测试CSV处理
    console.log(`[API] 开始测试CSV处理...`);
    
    const testResponse = await fetch(`${request.nextUrl.origin}/api/process-csv-episodes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        csvPath: csvPath,
        markedEpisodes: sortedMarkedEpisodes,
        platformUrl: item.platformUrl,
        itemId: item.id,
        testMode: true
      })
    });
    
    if (!testResponse.ok) {
      const errorData = await testResponse.json().catch(() => ({}));
      return NextResponse.json({
        success: false,
        error: 'CSV处理测试失败',
        details: errorData
      }, { status: 500 });
    }
    
    const testResult = await testResponse.json();
    
    // 如果测试显示需要处理，执行实际处理
    let actualResult = null;
    if (testResult.analysis && testResult.analysis.wouldNeedProcessing) {
      console.log(`[API] 测试显示需要处理，执行实际处理...`);
      
      const actualResponse = await fetch(`${request.nextUrl.origin}/api/process-csv-episodes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          csvPath: csvPath,
          markedEpisodes: sortedMarkedEpisodes,
          platformUrl: item.platformUrl,
          itemId: item.id,
          testMode: false
        })
      });
      
      if (actualResponse.ok) {
        actualResult = await actualResponse.json();
        console.log(`[API] 实际处理完成`);
      } else {
        const errorData = await actualResponse.json().catch(() => ({}));
        actualResult = { success: false, error: errorData.error || '实际处理失败' };
      }
    }
    
    return NextResponse.json({
      success: true,
      data: {
        item: {
          id: item.id,
          title: item.title,
          platformUrl: item.platformUrl
        },
        markedEpisodes: sortedMarkedEpisodes,
        csvFile: csvPath,
        testResult: testResult,
        actualResult: actualResult,
        summary: {
          hasMarkedEpisodes: sortedMarkedEpisodes.length > 0,
          needsProcessing: testResult.analysis?.wouldNeedProcessing || false,
          episodesToRemove: testResult.analysis?.episodesToRemove || [],
          actuallyProcessed: !!actualResult
        }
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('[API] 测试CSV删除功能失败:', error);
    return NextResponse.json({
      success: false,
      error: '测试失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
