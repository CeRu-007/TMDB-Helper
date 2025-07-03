import { NextRequest, NextResponse } from 'next/server';
import { StorageManager } from '@/lib/storage';

/**
 * POST /api/test-mark-direct - 直接测试标记功能
 */
export async function POST(request: NextRequest) {
  try {
    const { itemIdOrTitle, seasonNumber = 1, episodeNumbers = [1, 2, 3] } = await request.json();
    
    if (!itemIdOrTitle) {
      return NextResponse.json({
        success: false,
        error: '缺少项目ID或标题参数'
      }, { status: 400 });
    }
    
    console.log(`[API] 直接测试标记功能: ${itemIdOrTitle}, 季=${seasonNumber}, 集数=[${episodeNumbers.join(', ')}]`);
    
    // 获取所有项目
    const allItems = await StorageManager.getItemsWithRetry();
    console.log(`[API] 总共找到 ${allItems.length} 个项目`);
    
    // 尝试多种方式查找项目
    let targetItem = null;
    
    // 方式1: 通过ID查找
    targetItem = allItems.find(i => i.id === itemIdOrTitle);
    if (targetItem) {
      console.log(`[API] ✓ 通过ID找到项目: ${targetItem.title}`);
    }
    
    // 方式2: 通过标题查找
    if (!targetItem) {
      targetItem = allItems.find(i => i.title === itemIdOrTitle);
      if (targetItem) {
        console.log(`[API] ✓ 通过标题找到项目: ${targetItem.title} (ID: ${targetItem.id})`);
      }
    }
    
    // 方式3: 模糊匹配
    if (!targetItem) {
      targetItem = allItems.find(i => 
        i.title.toLowerCase().includes(itemIdOrTitle.toLowerCase()) ||
        i.id.toLowerCase().includes(itemIdOrTitle.toLowerCase())
      );
      if (targetItem) {
        console.log(`[API] ✓ 通过模糊匹配找到项目: ${targetItem.title} (ID: ${targetItem.id})`);
      }
    }
    
    if (!targetItem) {
      console.error(`[API] ✗ 找不到项目: ${itemIdOrTitle}`);
      return NextResponse.json({
        success: false,
        error: '找不到指定的项目',
        details: {
          searchTerm: itemIdOrTitle,
          availableItems: allItems.map(i => ({ id: i.id, title: i.title }))
        }
      }, { status: 404 });
    }
    
    // 分析项目结构
    const projectAnalysis = {
      id: targetItem.id,
      title: targetItem.title,
      mediaType: targetItem.mediaType,
      hasSeasons: !!(targetItem.seasons && targetItem.seasons.length > 0),
      hasEpisodes: !!(targetItem.episodes && targetItem.episodes.length > 0),
      seasonsCount: targetItem.seasons?.length || 0,
      episodesCount: targetItem.episodes?.length || 0
    };
    
    console.log(`[API] 项目分析:`, projectAnalysis);
    
    // 获取当前已标记的集数
    const currentMarkedEpisodes: number[] = [];
    
    if (targetItem.seasons && targetItem.seasons.length > 0) {
      const targetSeason = targetItem.seasons.find(s => s.seasonNumber === seasonNumber);
      if (targetSeason && targetSeason.episodes) {
        targetSeason.episodes.forEach(ep => {
          if (ep.completed) {
            currentMarkedEpisodes.push(ep.number);
          }
        });
      }
    } else if (targetItem.episodes) {
      targetItem.episodes.forEach(ep => {
        if (ep.completed) {
          currentMarkedEpisodes.push(ep.number);
        }
      });
    }
    
    console.log(`[API] 当前已标记集数: [${currentMarkedEpisodes.join(', ')}]`);
    
    // 直接调用标记API
    console.log(`[API] 调用标记API...`);
    
    const markResponse = await fetch(`${request.nextUrl.origin}/api/mark-episodes-completed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itemId: targetItem.id,
        seasonNumber: seasonNumber,
        episodeNumbers: episodeNumbers
      })
    });
    
    let markResult;
    if (markResponse.ok) {
      markResult = await markResponse.json();
      console.log(`[API] 标记API调用成功:`, markResult);
    } else {
      const errorData = await markResponse.json().catch(() => ({}));
      markResult = {
        success: false,
        error: `API调用失败 (${markResponse.status}): ${errorData.error || markResponse.statusText}`,
        details: errorData
      };
      console.error(`[API] 标记API调用失败:`, markResult);
    }
    
    // 重新获取项目数据，检查标记结果
    const updatedItems = await StorageManager.getItemsWithRetry();
    const updatedItem = updatedItems.find(i => i.id === targetItem.id);
    
    const finalMarkedEpisodes: number[] = [];
    if (updatedItem) {
      if (updatedItem.seasons && updatedItem.seasons.length > 0) {
        const targetSeason = updatedItem.seasons.find(s => s.seasonNumber === seasonNumber);
        if (targetSeason && targetSeason.episodes) {
          targetSeason.episodes.forEach(ep => {
            if (ep.completed) {
              finalMarkedEpisodes.push(ep.number);
            }
          });
        }
      } else if (updatedItem.episodes) {
        updatedItem.episodes.forEach(ep => {
          if (ep.completed) {
            finalMarkedEpisodes.push(ep.number);
          }
        });
      }
    }
    
    const newlyMarked = finalMarkedEpisodes.filter(ep => !currentMarkedEpisodes.includes(ep));
    
    console.log(`[API] 最终已标记集数: [${finalMarkedEpisodes.join(', ')}]`);
    console.log(`[API] 新标记的集数: [${newlyMarked.join(', ')}]`);
    
    return NextResponse.json({
      success: true,
      data: {
        targetItem: projectAnalysis,
        testParameters: {
          itemIdOrTitle,
          seasonNumber,
          episodeNumbers
        },
        beforeMarking: {
          markedEpisodes: currentMarkedEpisodes.sort((a, b) => a - b)
        },
        markingResult: markResult,
        afterMarking: {
          markedEpisodes: finalMarkedEpisodes.sort((a, b) => a - b),
          newlyMarked: newlyMarked.sort((a, b) => a - b)
        },
        summary: {
          markingSuccessful: markResult?.success || false,
          episodesMarked: newlyMarked.length,
          totalMarked: finalMarkedEpisodes.length
        }
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('[API] 直接测试标记功能失败:', error);
    return NextResponse.json({
      success: false,
      error: '测试失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
