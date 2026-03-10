/**
 * 统一存储服务
 * 
 * 自动检测运行环境，提供一致的 API：
 * - 服务端：直接操作文件系统
 * - 客户端：通过 API 调用
 * 
 * 建议用法：
 * - API 路由中使用：直接调用服务端方法
 * - 客户端组件中使用：通过 API 调用
 */

import type { TMDBItem } from '@/types/tmdb-item'
import type { ScheduledTask } from '@/lib/data/storage/types'

// 环境检测
const isServer = typeof window === 'undefined'
const isClient = !isServer

// 服务端存储服务（动态导入，避免客户端打包）
let _serverService: typeof import('./server-storage-service').ServerStorageService | null = null

async function getServerService() {
  if (!isServer) {
    throw new Error('ServerStorageService can only be used on the server side')
  }
  if (!_serverService) {
    const serverModule = await import('./server-storage-service')
    _serverService = serverModule.ServerStorageService
  }
  return _serverService
}

/**
 * 统一存储服务类
 */
export class UnifiedStorageService {
  // ==================== 项目管理 ====================

  /**
   * 获取所有项目
   */
  static async getItems(): Promise<TMDBItem[]> {
    if (isServer) {
      const service = await getServerService()
      return service.readItemsFromFile()
    }
    
    // 客户端通过 API 获取
    const response = await fetch('/api/storage/items')
    if (!response.ok) {
      throw new Error('Failed to fetch items')
    }
    const data = await response.json()
    return data.items || []
  }

  /**
   * 添加项目
   */
  static async addItem(item: TMDBItem): Promise<boolean> {
    if (isServer) {
      const service = await getServerService()
      return service.addItemToFile(item)
    }
    
    const response = await fetch('/api/storage/item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    })
    return response.ok
  }

  /**
   * 更新项目
   */
  static async updateItem(item: TMDBItem): Promise<boolean> {
    if (isServer) {
      const service = await getServerService()
      return service.updateItemToFile(item)
    }
    
    const response = await fetch('/api/storage/item', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    })
    return response.ok
  }

  /**
   * 删除项目
   */
  static async deleteItem(id: string): Promise<boolean> {
    if (isServer) {
      const service = await getServerService()
      return service.deleteItemFromFile(id)
    }
    
    const response = await fetch(`/api/storage/item?id=${id}`, {
      method: 'DELETE',
    })
    return response.ok
  }

  /**
   * 根据 ID 查找项目
   */
  static async findItemById(id: string): Promise<TMDBItem | undefined> {
    const items = await this.getItems()
    return items.find(item => item.id === id)
  }

  // ==================== 批量操作 ====================

  /**
   * 导入数据
   */
  static async importData(items: TMDBItem[], tasks?: ScheduledTask[]): Promise<boolean> {
    if (isServer) {
      const service = await getServerService()
      return service.writeItemsToFile(items)
    }
    
    const response = await fetch('/api/storage/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items, tasks }),
    })
    return response.ok
  }

  /**
   * 导出数据
   */
  static async exportData(): Promise<{ items: TMDBItem[]; tasks?: ScheduledTask[] }> {
    if (isServer) {
      const service = await getServerService()
      const items = service.readItemsFromFile()
      // TODO: 添加任务导出
      return { items }
    }
    
    const response = await fetch('/api/storage/data')
    if (!response.ok) {
      throw new Error('Failed to export data')
    }
    return response.json()
  }

  // ==================== 工具方法 ====================

  /**
   * 检查是否有任何项目
   */
  static async hasAnyItems(): Promise<boolean> {
    const items = await this.getItems()
    return items.length > 0
  }

  /**
   * 获取项目数量
   */
  static async getItemCount(): Promise<number> {
    const items = await this.getItems()
    return items.length
  }
}

// 导出环境检测工具
export { isServer, isClient }
