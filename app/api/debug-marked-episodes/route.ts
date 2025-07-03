import { NextRequest, NextResponse } from 'next/server';
import { StorageManager } from '@/lib/storage';

/**
 * GET /api/debug-marked-episodes - 调试已标记集数
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('itemId');
    const seasonNumber = parseInt(searchParams.get('seasonNumber') || '1');
    
    if (!itemId) {
      return NextResponse.json({
        success: false,
        error: '缺少itemId参数'
      }, { status: 400 });
    }
    
    console.log(`[API] 调试已标记集数: itemId=${itemId}, seasonNumber=${seasonNumber}`);
    
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
    
    // 分析项目数据结构
    const analysis = {
      itemId: item.id,
      title: item.title,
      mediaType: item.mediaType,
      hasSeasons: !!(item.seasons && item.seasons.length > 0),
      seasonsCount: item.seasons?.length || 0,
      hasEpisodes: !!(item.episodes && item.episodes.length > 0),
      episodesCount: item.episodes?.length || 0,
      seasons: item.seasons?.map(s => ({
        seasonNumber: s.seasonNumber,
        episodeCount: s.episodes?.length || 0,
        episodes: s.episodes?.map(e => ({
          number: e.number,
          completed: e.completed,
          title: e.title || `第${e.number}集`
        })) || []
      })) || [],
      episodes: item.episodes?.map(e => ({
        number: e.number,
        completed: e.completed,
        title: e.title || `第${e.number}集`,
        seasonNumber: e.seasonNumber
      })) || []
    };
    
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
    
    console.log(`[API] 调试结果: 已标记集数 [${sortedMarkedEpisodes.join(', ')}]`);
    
    return NextResponse.json({
      success: true,
      data: {
        analysis,
        markedEpisodes: sortedMarkedEpisodes,
        targetSeason: seasonNumber,
        recommendations: {
          dataStructure: analysis.hasSeasons ? '多季模式' : (analysis.hasEpisodes ? '单季模式' : '无集数数据'),
          markedCount: sortedMarkedEpisodes.length,
          suggestions: sortedMarkedEpisodes.length === 0 ? [
            '检查项目是否有已标记的集数',
            '确认集数标记功能是否正常工作',
            '验证数据存储是否正确'
          ] : [
            `找到 ${sortedMarkedEpisodes.length} 个已标记集数`,
            '数据结构正常，可以进行CSV处理'
          ]
        }
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('[API] 调试已标记集数失败:', error);
    return NextResponse.json({
      success: false,
      error: '调试失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * POST /api/debug-marked-episodes - 测试CSV处理
 */
export async function POST(request: NextRequest) {
  try {
    const { itemId, seasonNumber, csvContent } = await request.json();
    
    if (!itemId || !csvContent) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数'
      }, { status: 400 });
    }
    
    console.log(`[API] 测试CSV处理: itemId=${itemId}, seasonNumber=${seasonNumber}`);
    
    // 获取项目数据和已标记集数
    const items = await StorageManager.getItemsWithRetry();
    const item = items.find(i => i.id === itemId);
    
    if (!item) {
      return NextResponse.json({
        success: false,
        error: '找不到指定的项目'
      }, { status: 404 });
    }
    
    // 获取已标记集数
    const markedEpisodes: number[] = [];
    if (item.seasons && item.seasons.length > 0) {
      const targetSeason = item.seasons.find(s => s.seasonNumber === seasonNumber);
      if (targetSeason && targetSeason.episodes) {
        targetSeason.episodes.forEach(episode => {
          if (episode.completed) {
            markedEpisodes.push(episode.number);
          }
        });
      }
    } else if (item.episodes) {
      item.episodes.forEach(episode => {
        if (episode.completed) {
          markedEpisodes.push(episode.number);
        }
      });
    }
    
    // 解析CSV内容
    const lines = csvContent.split('\n');
    const headers = lines[0].split(',').map((h: string) => h.trim().replace(/"/g, ''));
    
    // 查找集数列
    const possibleEpisodeColumns = [
      'episode_number', 'episode', 'ep', 'number', 'episode_num', 'ep_num', '集数', '第几集'
    ];
    
    let episodeNumberIndex = -1;
    let matchedColumnName = '';
    
    for (const possibleName of possibleEpisodeColumns) {
      episodeNumberIndex = headers.findIndex(h => 
        h.toLowerCase().includes(possibleName.toLowerCase())
      );
      if (episodeNumberIndex !== -1) {
        matchedColumnName = headers[episodeNumberIndex];
        break;
      }
    }
    
    // 分析CSV数据
    const dataLines = lines.slice(1).filter(line => line.trim() !== '');
    const csvEpisodes: Array<{line: number, episodeNumber: number, willBeRemoved: boolean}> = [];
    
    dataLines.forEach((line, index) => {
      const columns = line.split(',').map((c: string) => c.trim().replace(/"/g, ''));
      if (columns.length > episodeNumberIndex) {
        const episodeNumber = parseInt(columns[episodeNumberIndex]);
        if (!isNaN(episodeNumber)) {
          csvEpisodes.push({
            line: index + 2, // +2 because we start from line 1 and skip header
            episodeNumber,
            willBeRemoved: markedEpisodes.includes(episodeNumber)
          });
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      data: {
        markedEpisodes: markedEpisodes.sort((a, b) => a - b),
        csvAnalysis: {
          headers,
          episodeColumnIndex: episodeNumberIndex,
          episodeColumnName: matchedColumnName,
          totalLines: dataLines.length,
          episodesFound: csvEpisodes.length
        },
        csvEpisodes,
        summary: {
          toBeRemoved: csvEpisodes.filter(e => e.willBeRemoved).length,
          toBeKept: csvEpisodes.filter(e => !e.willBeRemoved).length
        }
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('[API] 测试CSV处理失败:', error);
    return NextResponse.json({
      success: false,
      error: '测试失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
