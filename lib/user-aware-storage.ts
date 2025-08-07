import fs from 'fs';
import path from 'path';
import { TMDBItem, ScheduledTask } from './storage';
import { stringifyAuto } from './readable-compact-json';

/**
 * 用户感知的存储管理器
 * 为每个用户创建独立的数据文件
 */

// 数据文件存储路径
const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_DIR = path.join(DATA_DIR, 'users');

/**
 * 确保用户数据目录存在
 */
export function ensureUserDataDir(userId?: string) {
  // 确保主数据目录存在
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  // 确保用户数据目录存在
  if (!fs.existsSync(USERS_DIR)) {
    fs.mkdirSync(USERS_DIR, { recursive: true });
  }
  
  // 如果指定了用户ID，确保用户专属目录存在
  if (userId) {
    const userDir = path.join(USERS_DIR, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
  }
}

/**
 * 获取用户数据文件路径
 */
function getUserDataFilePath(userId: string): string {
  ensureUserDataDir(userId);
  return path.join(USERS_DIR, userId, 'tmdb_items.json');
}

/**
 * 获取用户任务文件路径
 */
function getUserTaskFilePath(userId: string): string {
  ensureUserDataDir(userId);
  return path.join(USERS_DIR, userId, 'scheduled_tasks.json');
}

/**
 * 从用户文件读取所有项目
 */
export function readUserItems(userId: string): TMDBItem[] {
  if (!userId || userId === 'anonymous') {
    console.warn('无效的用户ID，返回空数组');
    return [];
  }

  const filePath = getUserDataFilePath(userId);
  
  if (!fs.existsSync(filePath)) {
    console.log(`用户 ${userId} 的数据文件不存在，返回空数组`);
    return [];
  }
  
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    const items = JSON.parse(data);
    console.log(`成功读取用户 ${userId} 的 ${items.length} 个项目`);
    return items;
  } catch (error) {
    console.error(`读取用户 ${userId} 数据文件失败:`, error);
    return [];
  }
}

/**
 * 将项目写入用户文件
 */
export function writeUserItems(userId: string, items: TMDBItem[]): boolean {
  if (!userId || userId === 'anonymous') {
    console.error('无效的用户ID，无法写入数据');
    return false;
  }

  const filePath = getUserDataFilePath(userId);
  
  try {
    // 使用可读紧凑格式保存，既节省空间又便于阅读
    fs.writeFileSync(filePath, stringifyAuto(items, 'tmdb'), 'utf-8');
    console.log(`成功写入用户 ${userId} 的 ${items.length} 个项目`);
    return true;
  } catch (error) {
    console.error(`写入用户 ${userId} 数据文件失败:`, error);
    return false;
  }
}

/**
 * 添加新项目到用户数据
 */
export function addUserItem(userId: string, item: TMDBItem): boolean {
  const items = readUserItems(userId);
  items.push(item);
  return writeUserItems(userId, items);
}

/**
 * 更新用户项目
 */
export function updateUserItem(userId: string, updatedItem: TMDBItem): boolean {
  const items = readUserItems(userId);
  const index = items.findIndex(item => item.id === updatedItem.id);
  
  if (index !== -1) {
    items[index] = updatedItem;
    return writeUserItems(userId, items);
  }
  
  console.warn(`用户 ${userId} 的项目 ${updatedItem.id} 不存在`);
  return false;
}

/**
 * 删除用户项目
 */
export function deleteUserItem(userId: string, itemId: string): boolean {
  const items = readUserItems(userId);
  const filteredItems = items.filter(item => item.id !== itemId);
  
  if (filteredItems.length < items.length) {
    return writeUserItems(userId, filteredItems);
  }
  
  console.warn(`用户 ${userId} 的项目 ${itemId} 不存在`);
  return false;
}

/**
 * 批量删除用户项目
 */
export function deleteUserItems(userId: string, itemIds: string[]): boolean {
  const items = readUserItems(userId);
  const filteredItems = items.filter(item => !itemIds.includes(item.id));
  return writeUserItems(userId, filteredItems);
}

/**
 * 导入用户数据
 */
export function importUserData(userId: string, jsonData: string): boolean {
  try {
    const parsedData = JSON.parse(jsonData);
    let items: TMDBItem[] = [];

    // 检查数据格式
    if (Array.isArray(parsedData)) {
      items = parsedData;
    } else if (parsedData && typeof parsedData === 'object' && parsedData.items) {
      if (!Array.isArray(parsedData.items)) {
        throw new Error('无效的数据格式：items必须是数组');
      }
      items = parsedData.items;
    } else {
      throw new Error('无效的数据格式：期望数组或包含items字段的对象');
    }

    console.log(`用户 ${userId} 导入 ${items.length} 个项目`);
    return writeUserItems(userId, items);
  } catch (error) {
    console.error(`用户 ${userId} 导入数据失败:`, error);
    return false;
  }
}

/**
 * 导出用户数据
 */
export function exportUserData(userId: string): string {
  const items = readUserItems(userId);
  return JSON.stringify(items, null, 2);
}

/**
 * 读取用户定时任务
 */
export function readUserTasks(userId: string): ScheduledTask[] {
  if (!userId || userId === 'anonymous') {
    return [];
  }

  const filePath = getUserTaskFilePath(userId);
  
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`读取用户 ${userId} 任务文件失败:`, error);
    return [];
  }
}

/**
 * 写入用户定时任务
 */
export function writeUserTasks(userId: string, tasks: ScheduledTask[]): boolean {
  if (!userId || userId === 'anonymous') {
    return false;
  }

  const filePath = getUserTaskFilePath(userId);
  
  try {
    // 使用可读紧凑格式保存定时任务
    fs.writeFileSync(filePath, stringifyAuto(tasks, 'tasks'), 'utf-8');
    return true;
  } catch (error) {
    console.error(`写入用户 ${userId} 任务文件失败:`, error);
    return false;
  }
}

/**
 * 迁移现有数据到用户专属存储
 * 将原有的共享数据文件迁移到默认用户
 */
export function migrateExistingData(defaultUserId: string = 'default_user'): boolean {
  const oldDataFile = path.join(DATA_DIR, 'tmdb_items.json');
  const oldTaskFile = path.join(DATA_DIR, 'scheduled_tasks.json');
  
  let migrated = false;
  
  // 迁移项目数据
  if (fs.existsSync(oldDataFile)) {
    try {
      const data = fs.readFileSync(oldDataFile, 'utf-8');
      const items = JSON.parse(data);
      
      if (writeUserItems(defaultUserId, items)) {
        // 备份原文件
        const backupFile = path.join(DATA_DIR, `tmdb_items_backup_${Date.now()}.json`);
        fs.copyFileSync(oldDataFile, backupFile);
        fs.unlinkSync(oldDataFile);
        
        console.log(`成功迁移 ${items.length} 个项目到用户 ${defaultUserId}`);
        migrated = true;
      }
    } catch (error) {
      console.error('迁移项目数据失败:', error);
    }
  }
  
  // 迁移任务数据
  if (fs.existsSync(oldTaskFile)) {
    try {
      const data = fs.readFileSync(oldTaskFile, 'utf-8');
      const tasks = JSON.parse(data);
      
      if (writeUserTasks(defaultUserId, tasks)) {
        // 备份原文件
        const backupFile = path.join(DATA_DIR, `scheduled_tasks_backup_${Date.now()}.json`);
        fs.copyFileSync(oldTaskFile, backupFile);
        fs.unlinkSync(oldTaskFile);
        
        console.log(`成功迁移 ${tasks.length} 个任务到用户 ${defaultUserId}`);
        migrated = true;
      }
    } catch (error) {
      console.error('迁移任务数据失败:', error);
    }
  }
  
  return migrated;
}

/**
 * 获取所有用户列表
 */
export function getAllUsers(): string[] {
  ensureUserDataDir();

  try {
    if (!fs.existsSync(USERS_DIR)) {
      return [];
    }

    return fs.readdirSync(USERS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  } catch (error) {
    console.error('获取用户列表失败:', error);
    return [];
  }
}

/**
 * 清空用户数据
 */
export function clearUserData(userId: string): boolean {
  try {
    const userDir = path.join(USERS_DIR, userId);

    if (fs.existsSync(userDir)) {
      // 删除用户目录及其所有内容
      fs.rmSync(userDir, { recursive: true, force: true });
      console.log(`用户 ${userId} 的数据已清空`);
      return true;
    } else {
      console.log(`用户 ${userId} 的数据目录不存在`);
      return true; // 目录不存在也算成功
    }
  } catch (error) {
    console.error(`清空用户 ${userId} 数据失败:`, error);
    return false;
  }
}

/**
 * 获取用户配置
 */
export function getUserConfig(userId: string, key: string): string | null {
  try {
    const userDir = path.join(USERS_DIR, userId);
    const configFile = path.join(userDir, 'config.json');

    if (!fs.existsSync(configFile)) {
      return null;
    }

    const configData = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    return configData[key] || null;
  } catch (error) {
    console.error(`获取用户 ${userId} 配置 ${key} 失败:`, error);
    return null;
  }
}

/**
 * 设置用户配置
 */
export function setUserConfig(userId: string, key: string, value: string): boolean {
  try {
    const userDir = path.join(USERS_DIR, userId);
    ensureUserDir(userId);

    const configFile = path.join(userDir, 'config.json');

    let configData = {};
    if (fs.existsSync(configFile)) {
      configData = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
    }

    configData[key] = value;

    // 使用可读紧凑格式保存配置
    fs.writeFileSync(configFile, stringifyAuto(configData, 'config'), 'utf-8');
    return true;
  } catch (error) {
    console.error(`设置用户 ${userId} 配置 ${key} 失败:`, error);
    return false;
  }
}

/**
 * 获取用户所有配置
 */
export function getAllUserConfig(userId: string): Record<string, any> {
  try {
    const userDir = path.join(USERS_DIR, userId);
    const configFile = path.join(userDir, 'config.json');

    if (!fs.existsSync(configFile)) {
      return {};
    }

    return JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  } catch (error) {
    console.error(`获取用户 ${userId} 所有配置失败:`, error);
    return {};
  }
}

/**
 * 获取用户数据统计
 */
export function getUserStats(userId: string): {
  itemCount: number;
  taskCount: number;
  lastModified: string | null;
} {
  const items = readUserItems(userId);
  const tasks = readUserTasks(userId);
  
  let lastModified: string | null = null;
  const filePath = getUserDataFilePath(userId);
  
  if (fs.existsSync(filePath)) {
    try {
      const stats = fs.statSync(filePath);
      lastModified = stats.mtime.toISOString();
    } catch (error) {
      console.warn('获取文件修改时间失败:', error);
    }
  }
  
  return {
    itemCount: items.length,
    taskCount: tasks.length,
    lastModified
  };
}
