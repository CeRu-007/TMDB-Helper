import fs from 'fs';
import path from 'path';
import { ScheduledTask } from './storage';
import { stringifyAuto } from '@/lib/utils/readable-compact-json';
import { logger } from '@/lib/utils/logger';

// 获取用户数据目录
function getUserDataDir(userId: string = 'user_admin_system'): string {
  return path.join(process.cwd(), 'data', 'users', userId);
}

// 获取定时任务文件路径
function getTasksFilePath(userId: string = 'user_admin_system'): string {
  return path.join(getUserDataDir(userId), 'scheduled_tasks.json');
}

/**
 * 确保用户数据目录存在
 */
function ensureUserDataDirectory(userId: string = 'user_admin_system'): void {
  const userDataDir = getUserDataDir(userId);
  if (!fs.existsSync(userDataDir)) {
    fs.mkdirSync(userDataDir, { recursive: true });
  }
}

/**
 * 从服务端文件读取定时任务
 */
export function readScheduledTasks(
  userId: string = 'user_admin_system',
): ScheduledTask[] {
  try {
    ensureUserDataDirectory(userId);

    const tasksFilePath = getTasksFilePath(userId);
    if (!fs.existsSync(tasksFilePath)) {
      return [];
    }

    const data = fs.readFileSync(tasksFilePath, 'utf-8');
    const tasks = JSON.parse(data) as ScheduledTask[];

    return tasks;
  } catch (error) {
    return [];
  }
}

/**
 * 将定时任务写入服务端文件
 */
export function writeScheduledTasks(
  tasks: ScheduledTask[],
  userId: string = 'user_admin_system',
): boolean {
  try {
    ensureUserDataDirectory(userId);

    const tasksFilePath = getTasksFilePath(userId);
    // 使用可读紧凑格式保存定时任务
    const data = stringifyAuto(tasks, 'tasks');
    fs.writeFileSync(tasksFilePath, data, 'utf-8');

    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 添加定时任务到服务端文件
 */
export function addScheduledTask(
  task: ScheduledTask,
  userId: string = 'user_admin_system',
): boolean {
  try {
    const tasks = readScheduledTasks(userId);

    // 检查是否已存在相同ID的任务
    const existingIndex = tasks.findIndex((t) => t.id === task.id);
    if (existingIndex !== -1) {
      // 更新现有任务
        tasks[existingIndex] = task;
        logger.debug('ServerScheduledTasks', `更新现有任务: ${task.name}`, { id: task.id });
      } else {
        // 添加新任务
        tasks.push(task);
        logger.debug('ServerScheduledTasks', `添加新任务: ${task.name}`, { id: task.id });
      }

    return writeScheduledTasks(tasks, userId);
  } catch (error) {
    return false;
  }
}

/**
 * 更新定时任务
 */
export function updateScheduledTask(
  updatedTask: ScheduledTask,
  userId: string = 'user_admin_system',
): boolean {
  try {
    const tasks = readScheduledTasks(userId);
    const taskIndex = tasks.findIndex((t) => t.id === updatedTask.id);

    if (taskIndex === -1) {
      return addScheduledTask(updatedTask, userId);
    }

    tasks[taskIndex] = updatedTask;
    logger.debug('ServerScheduledTasks', `更新任务: ${updatedTask.name}`, { id: updatedTask.id });

    return writeScheduledTasks(tasks, userId);
  } catch (error) {
    return false;
  }
}

/**
 * 删除定时任务
 */
export function deleteScheduledTask(
  taskId: string,
  userId: string = 'user_admin_system',
): boolean {
  try {
    const tasks = readScheduledTasks(userId);
    const filteredTasks = tasks.filter((t) => t.id !== taskId);

    if (filteredTasks.length === tasks.length) {
      return false;
    }

    return writeScheduledTasks(filteredTasks, userId);
  } catch (error) {
    return false;
  }
}

/**
 * 获取指定项目的定时任务
 */
export function getItemScheduledTasks(
  itemId: string,
  userId: string = 'user_admin_system',
): ScheduledTask[] {
  const allTasks = readScheduledTasks(userId);
  return allTasks.filter((task) => task.itemId === itemId);
}

/**
 * 同步客户端任务到服务端
 * 这个函数可以被API调用，将localStorage中的任务同步到服务端文件
 */
export function syncTasksFromClient(clientTasks: ScheduledTask[]): boolean {
  try {
    // 读取现有的服务端任务
    const serverTasks = readScheduledTasks();
    const mergedTasks: ScheduledTask[] = [];

    // 创建一个Map来快速查找服务端任务
    const serverTasksMap = new Map(serverTasks.map((task) => [task.id, task]));

    // 处理客户端任务
    for (const clientTask of clientTasks) {
      const serverTask = serverTasksMap.get(clientTask.id);

      if (serverTask) {
        // 如果服务端已有该任务，使用更新时间较新的版本
        const clientUpdated = new Date(
          clientTask.updatedAt || clientTask.createdAt,
        );
        const serverUpdated = new Date(
          serverTask.updatedAt || serverTask.createdAt,
        );

        if (clientUpdated > serverUpdated) {
          mergedTasks.push(clientTask);
        } else {
          mergedTasks.push(serverTask);
        }

        // 从Map中移除已处理的任务
        serverTasksMap.delete(clientTask.id);
      } else {
        // 新的客户端任务
        mergedTasks.push(clientTask);
      }
    }

    // 添加剩余的服务端任务（客户端没有的）
    for (const [, serverTask] of serverTasksMap) {
      mergedTasks.push(serverTask);
    }

    // 写入合并后的任务
    const success = writeScheduledTasks(mergedTasks);

    if (success) {
    }

    return success;
  } catch (error) {
    return false;
  }
}
