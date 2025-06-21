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
  const items = readItems();
  const filteredItems = items.filter(item => item.id !== id);
  
  if (filteredItems.length < items.length) {
    return writeItems(filteredItems);
  }
  
  return false;
}

/**
 * 导入数据
 */
export function importData(jsonData: string): boolean {
  try {
    const items = JSON.parse(jsonData);
    if (!Array.isArray(items)) {
      throw new Error('无效的数据格式');
    }
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