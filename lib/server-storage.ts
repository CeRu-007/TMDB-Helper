import fs from 'fs';
import path from 'path';
import { TMDBItem } from './storage';

// 数据文件存储路径 - 修改为项目根目录下的data文件夹
const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'tmdb_items.json');

/**
 * 确保数据目录存在
 */
export function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

/**
 * 从文件读取所有项目
 */
export function readItems(): TMDBItem[] {
  ensureDataDir();
  
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }
  
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取数据文件失败:', error);
    return [];
  }
}

/**
 * 将项目写入文件
 */
export function writeItems(items: TMDBItem[]): boolean {
  ensureDataDir();
  
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf-8');
    return true;
  } catch (error) {
    console.error('写入数据文件失败:', error);
    return false;
  }
}

/**
 * 添加新项目
 */
export function addItem(item: TMDBItem): boolean {
  const items = readItems();
  items.push(item);
  return writeItems(items);
}

/**
 * 更新已有项目
 */
export function updateItem(updatedItem: TMDBItem): boolean {
  const items = readItems();
  const index = items.findIndex(item => item.id === updatedItem.id);
  
  if (index !== -1) {
    items[index] = updatedItem;
    return writeItems(items);
  }
  
  return false;
}

/**
 * 删除项目
 */
export function deleteItem(id: string): boolean {
  console.log(`[ServerStorage] 开始删除项目: ID=${id}`);

  const items = readItems();
  const filteredItems = items.filter(item => item.id !== id);

  if (filteredItems.length < items.length) {
    const success = writeItems(filteredItems);
    if (success) {
      console.log(`[ServerStorage] 项目删除成功: ID=${id}`);

      // 注意：服务器端无法直接访问localStorage中的定时任务
      // 任务清理将由客户端的StorageManager.deleteItem方法处理
      console.log(`[ServerStorage] 提示：请确保客户端清理相关的定时任务`);
    }
    return success;
  }

  console.log(`[ServerStorage] 项目不存在或删除失败: ID=${id}`);
  return false;
}

/**
 * 导入数据
 */
export function importData(jsonData: string): boolean {
  try {
    const parsedData = JSON.parse(jsonData);
    let items: TMDBItem[] = [];

    // 检查数据格式
    if (Array.isArray(parsedData)) {
      // 旧格式：直接是项目数组
      items = parsedData;
    } else if (parsedData && typeof parsedData === 'object' && parsedData.items) {
      // 新格式：包含items和tasks的对象
      if (!Array.isArray(parsedData.items)) {
        throw new Error('无效的数据格式：items必须是数组');
      }
      items = parsedData.items;
    } else {
      throw new Error('无效的数据格式：期望数组或包含items字段的对象');
    }

    console.log(`服务器端导入 ${items.length} 个项目`);
    return writeItems(items);
  } catch (error) {
    console.error('导入数据失败:', error);
    return false;
  }
}

/**
 * 导出数据
 */
export function exportData(): string {
  const items = readItems();
  return JSON.stringify(items, null, 2);
} 