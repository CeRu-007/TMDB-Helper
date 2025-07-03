import { NextRequest, NextResponse } from 'next/server';
import { StorageManager, TMDBItem } from '@/lib/storage';

/**
 * POST /api/mark-episodes-completed - 标记集数为已完成
 */
export async function POST(request: NextRequest) {
  try {
    const { itemId, seasonNumber, episodeNumbers } = await request.json();
    
    if (!itemId || !Array.isArray(episodeNumbers) || episodeNumbers.length === 0) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数',
        details: { itemId, seasonNumber, episodeNumbers }
      }, { status: 400 });
    }
    
    console.log(`[API] 标记集数为已完成: itemId=${itemId}, season=${seasonNumber}, episodes=[${episodeNumbers.join(', ')}]`);
    
    // 获取项目信息
    const items = await StorageManager.getItemsWithRetry();
    const item = items.find(i => i.id === itemId);
    
    if (!item) {
      console.error(`[API] 找不到项目: ${itemId}`);
      return NextResponse.json({
        success: false,
        error: '找不到指定的项目',
        details: { itemId, availableItems: items.map(i => ({ id: i.id, title: i.title })) }
      }, { status: 404 });
    }
    
    console.log(`[API] 找到项目: ${item.title}`);
    console.log(`[API] 项目数据结构: 多季=${!!(item.seasons && item.seasons.length > 0)}, 单季=${!!(item.episodes && item.episodes.length > 0)}`);
    
    // 创建项目副本以避免直接修改
    const updatedItem = JSON.parse(JSON.stringify(item)) as TMDBItem;
    let markedCount = 0;
    const markedEpisodes: number[] = [];
    
    if (updatedItem.seasons && updatedItem.seasons.length > 0) {
      // 多季模式
      console.log(`[API] 多季模式，查找第 ${seasonNumber} 季`);
      const targetSeason = updatedItem.seasons.find(s => s.seasonNumber === seasonNumber);
      
      if (!targetSeason) {
        console.error(`[API] 找不到第 ${seasonNumber} 季`);
        return NextResponse.json({
          success: false,
          error: `找不到第 ${seasonNumber} 季`,
          details: { 
            seasonNumber,
            availableSeasons: updatedItem.seasons.map(s => s.seasonNumber) 
          }
        }, { status: 404 });
      }
      
      console.log(`[API] 找到第 ${seasonNumber} 季，当前集数: ${targetSeason.episodes?.length || 0}`);
      
      if (!targetSeason.episodes) {
        targetSeason.episodes = [];
      }
      
      // 标记指定集数为已完成
      episodeNumbers.forEach(episodeNum => {
        let episode = targetSeason.episodes!.find(e => e.number === episodeNum);
        
        if (!episode) {
          // 如果集数不存在，创建新的集数记录
          episode = {
            number: episodeNum,
            completed: false,
            seasonNumber: seasonNumber
          };
          targetSeason.episodes!.push(episode);
          console.log(`[API] 创建新集数记录: 第${seasonNumber}季第${episodeNum}集`);
        }
        
        if (!episode.completed) {
          episode.completed = true;
          markedCount++;
          markedEpisodes.push(episodeNum);
          console.log(`[API] ✓ 标记第 ${seasonNumber} 季第 ${episodeNum} 集为已完成`);
        } else {
          console.log(`[API] - 第 ${seasonNumber} 季第 ${episodeNum} 集已经标记为完成`);
        }
      });
      
      // 按集数排序
      targetSeason.episodes.sort((a, b) => a.number - b.number);
      
    } else if (updatedItem.episodes) {
      // 单季模式
      console.log(`[API] 单季模式，当前集数: ${updatedItem.episodes.length}`);
      
      episodeNumbers.forEach(episodeNum => {
        let episode = updatedItem.episodes!.find(e => e.number === episodeNum);
        
        if (!episode) {
          // 如果集数不存在，创建新的集数记录
          episode = {
            number: episodeNum,
            completed: false
          };
          updatedItem.episodes!.push(episode);
          console.log(`[API] 创建新集数记录: 第${episodeNum}集`);
        }
        
        if (!episode.completed) {
          episode.completed = true;
          markedCount++;
          markedEpisodes.push(episodeNum);
          console.log(`[API] ✓ 标记第 ${episodeNum} 集为已完成`);
        } else {
          console.log(`[API] - 第 ${episodeNum} 集已经标记为完成`);
        }
      });
      
      // 按集数排序
      updatedItem.episodes.sort((a, b) => a.number - b.number);
      
    } else {
      console.error(`[API] 项目没有集数信息`);
      return NextResponse.json({
        success: false,
        error: '项目没有集数信息',
        details: { 
          itemId, 
          itemTitle: item.title,
          hasSeasons: !!(item.seasons && item.seasons.length > 0),
          hasEpisodes: !!(item.episodes && item.episodes.length > 0)
        }
      }, { status: 400 });
    }
    
    // 检查是否所有集数都已完成，更新项目状态
    let allCompleted = false;
    if (updatedItem.seasons && updatedItem.seasons.length > 0) {
      // 多季模式：检查所有季的所有集数
      allCompleted = updatedItem.seasons.every(season => 
        season.episodes && season.episodes.length > 0 && 
        season.episodes.every(ep => ep.completed)
      );
    } else if (updatedItem.episodes) {
      // 单季模式：检查所有集数
      allCompleted = updatedItem.episodes.length > 0 && 
        updatedItem.episodes.every(ep => ep.completed);
    }
    
    if (allCompleted && updatedItem.status === "ongoing") {
      updatedItem.status = "completed";
      updatedItem.completed = true;
      console.log(`[API] 项目 ${updatedItem.title} 所有集数已完成，更新状态为已完成`);
    }
    
    // 更新时间戳
    updatedItem.updatedAt = new Date().toISOString();
    
    // 保存更新后的项目
    console.log(`[API] 保存更新后的项目数据...`);
    const updateSuccess = await StorageManager.updateItem(updatedItem);
    
    if (!updateSuccess) {
      console.error(`[API] 保存项目更新失败`);
      return NextResponse.json({
        success: false,
        error: '保存项目更新失败'
      }, { status: 500 });
    }
    
    console.log(`[API] ✓ 成功标记 ${markedCount} 个集数为已完成`);
    console.log(`[API] 新标记的集数: [${markedEpisodes.join(', ')}]`);
    
    return NextResponse.json({
      success: true,
      markedCount: markedCount,
      markedEpisodes: markedEpisodes.sort((a, b) => a - b),
      totalEpisodes: episodeNumbers.length,
      allCompleted: allCompleted,
      message: `成功标记 ${markedCount} 个集数为已完成`,
      updatedItem: {
        id: updatedItem.id,
        title: updatedItem.title,
        status: updatedItem.status,
        completed: updatedItem.completed
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('[API] 标记集数完成失败:', error);
    return NextResponse.json({
      success: false,
      error: '标记集数完成失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
