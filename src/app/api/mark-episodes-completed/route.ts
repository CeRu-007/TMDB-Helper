import { NextRequest, NextResponse } from 'next/server';
import { StorageManager, TMDBItem, Episode, Season } from '@/lib/storage';
import { getUserIdFromRequest } from '@/lib/user-utils';
import fs from 'fs';
import path from 'path';

// 请求参数接口
interface MarkEpisodesRequest {
  itemId: string;
  seasonNumber?: number;
  episodeNumbers: number[];
  completed?: boolean;
}

// 响应数据接口
interface MarkEpisodesResponse {
  success: boolean;
  markedCount: number;
  markedEpisodes: number[];
  skippedEpisodes: number[];
  totalEpisodes: number;
  allCompleted: boolean;
  statusChanged: boolean;
  message: string;
  updatedItem: {
    id: string;
    title: string;
    status: string;
    completed: boolean;
  };
  metadata: {
    previousStatus: string;
    newStatus: string;
    processingTime: number;
  };
  error?: string;
  details?: any;
}

/**
 * 验证并标准化集数编号
 */
function validateEpisodeNumbers(episodeNumbers: number[]): { valid: number[]; invalid: number[] } {
  const valid: number[] = [];
  const invalid: number[] = [];
  
  episodeNumbers.forEach(num => {
    if (Number.isInteger(num) && num > 0 && num <= 1000) {
      valid.push(num);
    } else {
      invalid.push(num);
    }
  });
  
  return { valid, invalid };
}

/**
 * 标记单个集数状态
 */
function markEpisode(episode: Episode | undefined, episodeNumber: number, completed: boolean, seasonNumber?: number): { episode: Episode; wasChanged: boolean } {
  if (!episode) {
    // 创建新的集数记录
    return {
      episode: {
        number: episodeNumber,
        completed,
        ...(seasonNumber && { seasonNumber })
      },
      wasChanged: true
    };
  }
  
  if (episode.completed !== completed) {
    // 更新现有集数状态
    return {
      episode: { ...episode, completed },
      wasChanged: true
    };
  }
  
  // 状态未改变
  return { episode, wasChanged: false };
}

/**
 * 检查项目是否全部完成
 */
function checkAllCompleted(item: TMDBItem): boolean {
  if (item.seasons && item.seasons.length > 0) {
    // 多季模式：检查所有季的所有集数
    return item.seasons.every(season => 
      season.episodes && season.episodes.length > 0 && 
      season.episodes.every(ep => ep.completed)
    );
  } else if (item.episodes) {
    // 单季模式：检查所有集数
    return item.episodes.length > 0 && 
      item.episodes.every(ep => ep.completed);
  }
  return false;
}

/**
 * 获取集数统计信息
 */
function getEpisodeStats(item: TMDBItem): { total: number; completed: number; percentage: number } {
  let total = 0;
  let completed = 0;
  
  if (item.seasons && item.seasons.length > 0) {
    item.seasons.forEach(season => {
      if (season.episodes) {
        total += season.episodes.length;
        completed += season.episodes.filter(ep => ep.completed).length;
      }
    });
  } else if (item.episodes) {
    total = item.episodes.length;
    completed = item.episodes.filter(ep => ep.completed).length;
  }
  
  return {
    total,
    completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0
  };
}

/**
 * POST /api/mark-episodes-completed - 标记集数状态（重构版）
 * 支持批量操作、更详细的错误处理和响应信息
 */
export async function POST(request: NextRequest): Promise<NextResponse<MarkEpisodesResponse>> {
  const startTime = Date.now();
  
  try {
    // 解析请求参数
    const { itemId, seasonNumber, episodeNumbers, completed = true } = await request.json() as MarkEpisodesRequest;

    // 参数验证
    if (!itemId) {
      return NextResponse.json({
        success: false,
        markedCount: 0,
        markedEpisodes: [],
        skippedEpisodes: [],
        totalEpisodes: 0,
        allCompleted: false,
        statusChanged: false,
        message: '缺少项目ID',
        updatedItem: { id: '', title: '', status: '', completed: false },
        metadata: { previousStatus: '', newStatus: '', processingTime: Date.now() - startTime },
        error: '缺少必要参数',
        details: { itemId, seasonNumber, episodeNumbers }
      }, { status: 400 });
    }

    if (!Array.isArray(episodeNumbers) || episodeNumbers.length === 0) {
      return NextResponse.json({
        success: false,
        markedCount: 0,
        markedEpisodes: [],
        skippedEpisodes: [],
        totalEpisodes: 0,
        allCompleted: false,
        statusChanged: false,
        message: '缺少集数编号列表',
        updatedItem: { id: '', title: '', status: '', completed: false },
        metadata: { previousStatus: '', newStatus: '', processingTime: Date.now() - startTime },
        error: '缺少必要参数',
        details: { itemId, seasonNumber, episodeNumbers }
      }, { status: 400 });
    }

    // 验证集数编号
    const { valid: validEpisodes, invalid: invalidEpisodes } = validateEpisodeNumbers(episodeNumbers);
    
    if (invalidEpisodes.length > 0) {
      return NextResponse.json({
        success: false,
        markedCount: 0,
        markedEpisodes: [],
        skippedEpisodes: invalidEpisodes,
        totalEpisodes: episodeNumbers.length,
        allCompleted: false,
        statusChanged: false,
        message: '存在无效的集数编号',
        updatedItem: { id: '', title: '', status: '', completed: false },
        metadata: { previousStatus: '', newStatus: '', processingTime: Date.now() - startTime },
        error: '无效的集数编号',
        details: { invalidEpisodes, validRange: '1-1000的正整数' }
      }, { status: 400 });
    }

    console.log(`[API] 标记集数状态: itemId=${itemId}, season=${seasonNumber}, episodes=[${validEpisodes.join(', ')}], completed=${completed}`);

    // 身份验证
    const userId = await getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({
        success: false,
        markedCount: 0,
        markedEpisodes: [],
        skippedEpisodes: validEpisodes,
        totalEpisodes: validEpisodes.length,
        allCompleted: false,
        statusChanged: false,
        message: '用户身份验证失败',
        updatedItem: { id: '', title: '', status: '', completed: false },
        metadata: { previousStatus: '', newStatus: '', processingTime: Date.now() - startTime },
        error: '缺少用户身份信息'
      }, { status: 401 });
    }

    // 获取项目信息
    const items = await StorageManager.getItemsWithRetry();
    const item = items.find(i => i.id === itemId);
    
    if (!item) {
      return NextResponse.json({
        success: false,
        markedCount: 0,
        markedEpisodes: [],
        skippedEpisodes: validEpisodes,
        totalEpisodes: validEpisodes.length,
        allCompleted: false,
        statusChanged: false,
        message: '找不到指定的项目',
        updatedItem: { id: '', title: '', status: '', completed: false },
        metadata: { previousStatus: '', newStatus: '', processingTime: Date.now() - startTime },
        error: '找不到指定的项目',
        details: { 
          itemId, 
          availableItems: items.slice(0, 10).map(i => ({ id: i.id, title: i.title })),
          totalItems: items.length
        }
      }, { status: 404 });
    }

    console.log(`[API] 项目数据结构: 多季=${!!(item.seasons && item.seasons.length > 0)}, 单季=${!!(item.episodes && item.episodes.length > 0)}`);
    
    // 检查项目结构
    const hasSeasons = item.seasons && item.seasons.length > 0;
    const hasEpisodes = item.episodes && item.episodes.length > 0;
    
    if (!hasSeasons && !hasEpisodes) {
      return NextResponse.json({
        success: false,
        markedCount: 0,
        markedEpisodes: [],
        skippedEpisodes: validEpisodes,
        totalEpisodes: validEpisodes.length,
        allCompleted: false,
        statusChanged: false,
        message: '项目没有集数信息',
        updatedItem: { id: '', title: '', status: '', completed: false },
        metadata: { previousStatus: '', newStatus: '', processingTime: Date.now() - startTime },
        error: '项目没有集数信息',
        details: { 
          itemId, 
          itemTitle: item.title,
          hasSeasons,
          hasEpisodes
        }
      }, { status: 400 });
    }

    // 创建项目副本并处理更新
    const updatedItem = JSON.parse(JSON.stringify(item)) as TMDBItem;
    const previousStatus = updatedItem.status;
    const previousCompleted = updatedItem.completed;
    let markedCount = 0;
    const markedEpisodes: number[] = [];
    const skippedEpisodes: number[] = [];
    
    // 处理多季模式
    if (hasSeasons) {
      if (seasonNumber === undefined) {
        return NextResponse.json({
          success: false,
          markedCount: 0,
          markedEpisodes: [],
          skippedEpisodes: validEpisodes,
          totalEpisodes: validEpisodes.length,
          allCompleted: false,
          statusChanged: false,
          message: '多季项目需要指定季数',
          updatedItem: { id: '', title: '', status: '', completed: false },
          metadata: { previousStatus: '', newStatus: '', processingTime: Date.now() - startTime },
          error: '缺少季数参数',
          details: { 
            availableSeasons: updatedItem.seasons!.map(s => s.seasonNumber),
            seasonCount: updatedItem.seasons!.length
          }
        }, { status: 400 });
      }

      const targetSeason = updatedItem.seasons!.find(s => s.seasonNumber === seasonNumber);
      
      if (!targetSeason) {
        return NextResponse.json({
          success: false,
          markedCount: 0,
          markedEpisodes: [],
          skippedEpisodes: validEpisodes,
          totalEpisodes: validEpisodes.length,
          allCompleted: false,
          statusChanged: false,
          message: `找不到第 ${seasonNumber} 季`,
          updatedItem: { id: '', title: '', status: '', completed: false },
          metadata: { previousStatus: '', newStatus: '', processingTime: Date.now() - startTime },
          error: `找不到第 ${seasonNumber} 季`,
          details: { 
            seasonNumber,
            availableSeasons: updatedItem.seasons!.map(s => s.seasonNumber) 
          }
        }, { status: 404 });
      }

      // 确保季的集数数组存在
      if (!targetSeason.episodes) {
        targetSeason.episodes = [];
      }
      
      // 标记集数
      validEpisodes.forEach(episodeNum => {
        const existingEpisode = targetSeason.episodes!.find(e => e.number === episodeNum);
        const { episode: newEpisode, wasChanged } = markEpisode(existingEpisode, episodeNum, completed, seasonNumber);
        
        if (wasChanged) {
          if (existingEpisode) {
            // 更新现有集数
            const index = targetSeason.episodes!.findIndex(e => e.number === episodeNum);
            targetSeason.episodes![index] = newEpisode;
          } else {
            // 添加新集数
            targetSeason.episodes!.push(newEpisode);
          }
          
          markedCount++;
          markedEpisodes.push(episodeNum);
        } else {
          skippedEpisodes.push(episodeNum);
        }
      });
      
      // 按集数排序
      targetSeason.episodes.sort((a, b) => a.number - b.number);
      
    } else if (hasEpisodes) {
      // 处理单季模式
      validEpisodes.forEach(episodeNum => {
        const existingEpisode = updatedItem.episodes!.find(e => e.number === episodeNum);
        const { episode: newEpisode, wasChanged } = markEpisode(existingEpisode, episodeNum, completed);
        
        if (wasChanged) {
          if (existingEpisode) {
            // 更新现有集数
            const index = updatedItem.episodes!.findIndex(e => e.number === episodeNum);
            updatedItem.episodes![index] = newEpisode;
          } else {
            // 添加新集数
            updatedItem.episodes!.push(newEpisode);
          }
          
          markedCount++;
          markedEpisodes.push(episodeNum);
        } else {
          skippedEpisodes.push(episodeNum);
        }
      });
      
      // 按集数排序
      updatedItem.episodes.sort((a, b) => a.number - b.number);
    }
    
    // 检查是否所有集数都已完成，更新项目状态
    const allCompleted = checkAllCompleted(updatedItem);
    const statusChanged = allCompleted !== previousCompleted || 
                         (allCompleted && previousStatus === "ongoing") ||
                         (!allCompleted && previousStatus === "completed");
    
    if (allCompleted && previousStatus === "ongoing") {
      updatedItem.status = "completed";
      updatedItem.completed = true;
    } else if (!allCompleted && previousStatus === "completed") {
      updatedItem.status = "ongoing";
      updatedItem.completed = false;
    }
    
    // 更新时间戳
    updatedItem.updatedAt = new Date().toISOString();
    
    // 直接保存更新到文件系统，绕过StorageManager的API调用
    const updateSuccess = await saveItemDirectly(updatedItem);
    
    if (!updateSuccess) {
      return NextResponse.json({
        success: false,
        markedCount: 0,
        markedEpisodes: [],
        skippedEpisodes: validEpisodes,
        totalEpisodes: validEpisodes.length,
        allCompleted: false,
        statusChanged: false,
        message: '保存项目更新失败',
        updatedItem: { id: '', title: '', status: '', completed: false },
        metadata: { previousStatus: '', newStatus: '', processingTime: Date.now() - startTime },
        error: '保存项目更新失败'
      }, { status: 500 });
    }

    const processingTime = Date.now() - startTime;
    const newStatus = updatedItem.status;
    const stats = getEpisodeStats(updatedItem);

    console.log(`[API] 更新的集数: [${markedEpisodes.join(', ')}], 跳过: [${skippedEpisodes.join(', ')}], 耗时: ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      markedCount,
      markedEpisodes: markedEpisodes.sort((a, b) => a - b),
      skippedEpisodes: skippedEpisodes.sort((a, b) => a - b),
      totalEpisodes: validEpisodes.length,
      allCompleted,
      statusChanged,
      message: `成功更新 ${markedCount} 个集数状态${skippedEpisodes.length > 0 ? `，跳过 ${skippedEpisodes.length} 个未变化的集数` : ''}`,
      updatedItem: {
        id: updatedItem.id,
        title: updatedItem.title,
        status: updatedItem.status,
        completed: updatedItem.completed
      },
      metadata: {
        previousStatus,
        newStatus,
        processingTime,
        episodeStats: stats
      }
    }, { status: 200 });
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    console.error(`[API] 标记集数完成失败:`, error);
    
    return NextResponse.json({
      success: false,
      markedCount: 0,
      markedEpisodes: [],
      skippedEpisodes: [],
      totalEpisodes: 0,
      allCompleted: false,
      statusChanged: false,
      message: '标记集数完成失败',
      updatedItem: { id: '', title: '', status: '', completed: false },
      metadata: { previousStatus: '', newStatus: '', processingTime },
      error: '标记集数完成失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * 直接保存项目到文件系统，绕过API调用链
 */
async function saveItemDirectly(item: TMDBItem): Promise<boolean> {
  try {
    const DATA_DIR = path.join(process.cwd(), 'data');
    const USERS_DIR = path.join(DATA_DIR, 'users');
    const USER_DIR = path.join(USERS_DIR, 'user_admin_system');
    const DATA_FILE = path.join(USER_DIR, 'tmdb_items.json');

    // 确保目录存在
    if (!fs.existsSync(USER_DIR)) {
      fs.mkdirSync(USER_DIR, { recursive: true });
    }

    // 读取现有数据
    let items: TMDBItem[] = [];
    if (fs.existsSync(DATA_FILE)) {
      const fileContent = fs.readFileSync(DATA_FILE, 'utf-8');
      items = JSON.parse(fileContent);
    }

    // 查找并更新项目
    const index = items.findIndex(i => i.id === item.id);
    if (index !== -1) {
      items[index] = item;
    } else {
      items.push(item);
    }

    // 保存到文件
    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf-8');
    
    console.log(`[DirectSave] 成功保存项目: ${item.title} (ID: ${item.id})`);
    return true;
  } catch (error) {
    console.error(`[DirectSave] 保存项目失败:`, error);
    return false;
  }
}
