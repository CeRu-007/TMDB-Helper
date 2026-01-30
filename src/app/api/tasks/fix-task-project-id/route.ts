import { NextRequest, NextResponse } from 'next/server';
import { StorageManager } from '@/lib/data/storage';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/tasks/fix-task-project-id - 修复任务的项目ID关联
 */
export async function POST(request: NextRequest) {
  try {
    const { taskId, newItemId, autoFix = false } = await request.json();

    // 获取所有任务和项目
    const allTasks = await StorageManager.getScheduledTasks();
    const allItems = await StorageManager.getItemsWithRetry();

    const result = {
      tasksChecked: 0,
      tasksFixed: 0,
      errors: [] as string[],
      fixedTasks: [] as any[],
      brokenTasks: [] as any[]
    };
    
    if (taskId) {
      // 修复特定任务
      const task = allTasks.find(t => t.id === taskId);
      if (!task) {
        return NextResponse.json({
          success: false,
          error: '找不到指定的任务',
          details: { taskId }
        }, { status: 404 });
      }
      
      result.tasksChecked = 1;
      
      // 检查任务的项目ID是否有效
      const currentItem = allItems.find(i => i.id === task.itemId);
      
      if (!currentItem) {
        
        if (newItemId) {
          // 使用指定的新项目ID
          const newItem = allItems.find(i => i.id === newItemId);
          if (!newItem) {
            return NextResponse.json({
              success: false,
              error: '指定的新项目ID不存在',
              details: { newItemId }
            }, { status: 400 });
          }
          
          const updatedTask = {
            ...task,
            itemId: newItem.id,
            itemTitle: newItem.title,
            itemTmdbId: newItem.tmdbId,
            updatedAt: new Date().toISOString()
          };
          
          const updateSuccess = await StorageManager.updateScheduledTask(updatedTask);
          if (updateSuccess) {
            result.tasksFixed = 1;
            result.fixedTasks.push({
              taskId: task.id,
              taskName: task.name,
              oldItemId: task.itemId,
              newItemId: newItem.id,
              newItemTitle: newItem.title
            });
            
          } else {
            result.errors.push(`更新任务 ${task.name} 失败`);
          }
        } else {
          // 尝试通过标题自动匹配
          const matchedItem = allItems.find(i => i.title === task.itemTitle);
          if (matchedItem) {
            logger.info(`[API] 通过标题找到匹配项目: ${matchedItem.title} (ID: ${matchedItem.id})`);
            
            if (autoFix) {
              const updatedTask = {
                ...task,
                itemId: matchedItem.id,
                itemTmdbId: matchedItem.tmdbId,
                updatedAt: new Date().toISOString()
              };
              
              const updateSuccess = await StorageManager.updateScheduledTask(updatedTask);
              if (updateSuccess) {
                result.tasksFixed = 1;
                result.fixedTasks.push({
                  taskId: task.id,
                  taskName: task.name,
                  oldItemId: task.itemId,
                  newItemId: matchedItem.id,
                  newItemTitle: matchedItem.title,
                  matchMethod: 'title'
                });
                
              } else {
                result.errors.push(`自动更新任务 ${task.name} 失败`);
              }
            } else {
              result.brokenTasks.push({
                taskId: task.id,
                taskName: task.name,
                invalidItemId: task.itemId,
                suggestedItem: {
                  id: matchedItem.id,
                  title: matchedItem.title
                },
                matchMethod: 'title'
              });
            }
          } else {
            result.brokenTasks.push({
              taskId: task.id,
              taskName: task.name,
              invalidItemId: task.itemId,
              itemTitle: task.itemTitle,
              suggestedItem: null
            });
          }
        }
      } else {
        
      }
      
    } else {
      // 检查所有任务
      
      for (const task of allTasks) {
        result.tasksChecked++;
        
        const currentItem = allItems.find(i => i.id === task.itemId);
        
        if (!currentItem) {
          
          // 尝试通过标题匹配
          const matchedItem = allItems.find(i => i.title === task.itemTitle);
          
          if (matchedItem && autoFix) {
            const updatedTask = {
              ...task,
              itemId: matchedItem.id,
              itemTmdbId: matchedItem.tmdbId,
              updatedAt: new Date().toISOString()
            };
            
            const updateSuccess = await StorageManager.updateScheduledTask(updatedTask);
            if (updateSuccess) {
              result.tasksFixed++;
              result.fixedTasks.push({
                taskId: task.id,
                taskName: task.name,
                oldItemId: task.itemId,
                newItemId: matchedItem.id,
                newItemTitle: matchedItem.title,
                matchMethod: 'title'
              });
              
            } else {
              result.errors.push(`自动更新任务 ${task.name} 失败`);
            }
          } else {
            result.brokenTasks.push({
              taskId: task.id,
              taskName: task.name,
              invalidItemId: task.itemId,
              itemTitle: task.itemTitle,
              suggestedItem: matchedItem ? {
                id: matchedItem.id,
                title: matchedItem.title
              } : null
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      result,
      summary: {
        totalTasks: allTasks.length,
        totalItems: allItems.length,
        tasksChecked: result.tasksChecked,
        tasksFixed: result.tasksFixed,
        brokenTasks: result.brokenTasks.length,
        hasErrors: result.errors.length > 0
      }
    }, { status: 200 });
    
  } catch (error) {
    
    return NextResponse.json({
      success: false,
      error: '修复失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
