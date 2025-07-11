import fs from 'fs';
import path from 'path';
import { ScheduledTask } from './storage';

const TASKS_FILE_PATH = path.join(process.cwd(), 'data', 'scheduled-tasks.json');

/**
 * 确保数据目录存在
 */
function ensureDataDirectory(): void {
  const dataDir = path.dirname(TASKS_FILE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * 从服务端文件读取定时任务
 */
export function readScheduledTasks(): ScheduledTask[] {
  try {
    ensureDataDirectory();
    
    if (!fs.existsSync(TASKS_FILE_PATH)) {
      console.log('[ServerScheduledTasks] 定时任务文件不存在，返回空数组');
      return [];
    }

    const data = fs.readFileSync(TASKS_FILE_PATH, 'utf-8');
    const tasks = JSON.parse(data) as ScheduledTask[];
    
    console.log(`[ServerScheduledTasks] 从服务端文件读取到 ${tasks.length} 个定时任务`);
    return tasks;
  } catch (error) {
    console.error('[ServerScheduledTasks] 读取定时任务文件失败:', error);
    return [];
  }
}

/**
 * 将定时任务写入服务端文件
 */
export function writeScheduledTasks(tasks: ScheduledTask[]): boolean {
  try {
    ensureDataDirectory();
    
    const data = JSON.stringify(tasks, null, 2);
    fs.writeFileSync(TASKS_FILE_PATH, data, 'utf-8');
    
    console.log(`[ServerScheduledTasks] 成功写入 ${tasks.length} 个定时任务到服务端文件`);
    return true;
  } catch (error) {
    console.error('[ServerScheduledTasks] 写入定时任务文件失败:', error);
    return false;
  }
}

/**
 * 添加定时任务到服务端文件
 */
export function addScheduledTask(task: ScheduledTask): boolean {
  try {
    const tasks = readScheduledTasks();
    
    // 检查是否已存在相同ID的任务
    const existingIndex = tasks.findIndex(t => t.id === task.id);
    if (existingIndex !== -1) {
      // 更新现有任务
      tasks[existingIndex] = task;
      console.log(`[ServerScheduledTasks] 更新现有任务: ${task.name} (${task.id})`);
    } else {
      // 添加新任务
      tasks.push(task);
      console.log(`[ServerScheduledTasks] 添加新任务: ${task.name} (${task.id})`);
    }
    
    return writeScheduledTasks(tasks);
  } catch (error) {
    console.error('[ServerScheduledTasks] 添加定时任务失败:', error);
    return false;
  }
}

/**
 * 更新定时任务
 */
export function updateScheduledTask(updatedTask: ScheduledTask): boolean {
  try {
    const tasks = readScheduledTasks();
    const taskIndex = tasks.findIndex(t => t.id === updatedTask.id);
    
    if (taskIndex === -1) {
      console.warn(`[ServerScheduledTasks] 要更新的任务不存在: ${updatedTask.id}`);
      return addScheduledTask(updatedTask);
    }
    
    tasks[taskIndex] = updatedTask;
    console.log(`[ServerScheduledTasks] 更新任务: ${updatedTask.name} (${updatedTask.id})`);
    
    return writeScheduledTasks(tasks);
  } catch (error) {
    console.error('[ServerScheduledTasks] 更新定时任务失败:', error);
    return false;
  }
}

/**
 * 删除定时任务
 */
export function deleteScheduledTask(taskId: string): boolean {
  try {
    const tasks = readScheduledTasks();
    const filteredTasks = tasks.filter(t => t.id !== taskId);
    
    if (filteredTasks.length === tasks.length) {
      console.warn(`[ServerScheduledTasks] 要删除的任务不存在: ${taskId}`);
      return false;
    }
    
    console.log(`[ServerScheduledTasks] 删除任务: ${taskId}`);
    return writeScheduledTasks(filteredTasks);
  } catch (error) {
    console.error('[ServerScheduledTasks] 删除定时任务失败:', error);
    return false;
  }
}

/**
 * 获取指定项目的定时任务
 */
export function getItemScheduledTasks(itemId: string): ScheduledTask[] {
  const allTasks = readScheduledTasks();
  return allTasks.filter(task => task.itemId === itemId);
}

/**
 * 同步客户端任务到服务端
 * 这个函数可以被API调用，将localStorage中的任务同步到服务端文件
 */
export function syncTasksFromClient(clientTasks: ScheduledTask[]): boolean {
  try {
    console.log(`[ServerScheduledTasks] 开始同步 ${clientTasks.length} 个客户端任务到服务端`);
    
    // 读取现有的服务端任务
    const serverTasks = readScheduledTasks();
    const mergedTasks: ScheduledTask[] = [];
    
    // 创建一个Map来快速查找服务端任务
    const serverTasksMap = new Map(serverTasks.map(task => [task.id, task]));
    
    // 处理客户端任务
    for (const clientTask of clientTasks) {
      const serverTask = serverTasksMap.get(clientTask.id);
      
      if (serverTask) {
        // 如果服务端已有该任务，使用更新时间较新的版本
        const clientUpdated = new Date(clientTask.updatedAt || clientTask.createdAt);
        const serverUpdated = new Date(serverTask.updatedAt || serverTask.createdAt);
        
        if (clientUpdated > serverUpdated) {
          mergedTasks.push(clientTask);
          console.log(`[ServerScheduledTasks] 使用客户端版本: ${clientTask.name}`);
        } else {
          mergedTasks.push(serverTask);
          console.log(`[ServerScheduledTasks] 使用服务端版本: ${serverTask.name}`);
        }
        
        // 从Map中移除已处理的任务
        serverTasksMap.delete(clientTask.id);
      } else {
        // 新的客户端任务
        mergedTasks.push(clientTask);
        console.log(`[ServerScheduledTasks] 添加新的客户端任务: ${clientTask.name}`);
      }
    }
    
    // 添加剩余的服务端任务（客户端没有的）
    for (const [, serverTask] of serverTasksMap) {
      mergedTasks.push(serverTask);
      console.log(`[ServerScheduledTasks] 保留服务端任务: ${serverTask.name}`);
    }
    
    // 写入合并后的任务
    const success = writeScheduledTasks(mergedTasks);
    
    if (success) {
      console.log(`[ServerScheduledTasks] 同步完成，共 ${mergedTasks.length} 个任务`);
    }
    
    return success;
  } catch (error) {
    console.error('[ServerScheduledTasks] 同步任务失败:', error);
    return false;
  }
}
