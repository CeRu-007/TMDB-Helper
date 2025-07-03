import { NextRequest, NextResponse } from 'next/server';
import { StorageManager } from '@/lib/storage';

/**
 * POST /api/debug-project-id - 调试项目ID问题
 */
export async function POST(request: NextRequest) {
  try {
    const { itemId, taskId } = await request.json();
    
    console.log(`[API] 调试项目ID问题: itemId=${itemId}, taskId=${taskId}`);
    
    // 获取所有项目
    const allItems = await StorageManager.getItemsWithRetry();
    console.log(`[API] 总共找到 ${allItems.length} 个项目`);
    
    // 查找目标项目
    const targetItem = allItems.find(i => i.id === itemId);
    
    // 获取所有任务
    const allTasks = await StorageManager.getScheduledTasks();
    console.log(`[API] 总共找到 ${allTasks.length} 个任务`);
    
    // 查找目标任务
    const targetTask = allTasks.find(t => t.id === taskId);
    
    // 分析项目ID格式
    const projectIdAnalysis = {
      provided: itemId,
      type: typeof itemId,
      length: itemId ? itemId.length : 0,
      isString: typeof itemId === 'string',
      isEmpty: !itemId || itemId.trim() === '',
      hasSpaces: itemId ? itemId.includes(' ') : false,
      isNumeric: itemId ? !isNaN(Number(itemId)) : false
    };
    
    // 查找相似的项目ID
    const similarItems = allItems.filter(item => {
      if (!itemId) return false;
      return item.id.toLowerCase().includes(itemId.toLowerCase()) ||
             itemId.toLowerCase().includes(item.id.toLowerCase()) ||
             item.title.toLowerCase().includes(itemId.toLowerCase());
    });
    
    // 检查任务关联的项目
    let taskRelatedItem = null;
    if (targetTask) {
      taskRelatedItem = allItems.find(i => i.id === targetTask.itemId);
    }
    
    return NextResponse.json({
      success: true,
      debug: {
        request: {
          itemId,
          taskId,
          projectIdAnalysis
        },
        storage: {
          totalItems: allItems.length,
          totalTasks: allTasks.length,
          targetItemFound: !!targetItem,
          targetTaskFound: !!targetTask,
          taskRelatedItemFound: !!taskRelatedItem
        },
        targetItem: targetItem ? {
          id: targetItem.id,
          title: targetItem.title,
          mediaType: targetItem.mediaType,
          hasSeasons: !!(targetItem.seasons && targetItem.seasons.length > 0),
          hasEpisodes: !!(targetItem.episodes && targetItem.episodes.length > 0)
        } : null,
        targetTask: targetTask ? {
          id: targetTask.id,
          name: targetTask.name,
          itemId: targetTask.itemId,
          itemTitle: targetTask.itemTitle,
          enabled: targetTask.enabled
        } : null,
        taskRelatedItem: taskRelatedItem ? {
          id: taskRelatedItem.id,
          title: taskRelatedItem.title,
          matchesTaskItemId: taskRelatedItem.id === targetTask?.itemId
        } : null,
        similarItems: similarItems.map(item => ({
          id: item.id,
          title: item.title,
          similarity: 'partial_match'
        })),
        allItemIds: allItems.map(item => ({
          id: item.id,
          title: item.title,
          idType: typeof item.id,
          idLength: item.id.length
        })),
        recommendations: []
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('[API] 调试项目ID失败:', error);
    return NextResponse.json({
      success: false,
      error: '调试失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
