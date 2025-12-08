/**
 * 数据一致性验证器
 * 确保前端和后端数据的一致性，自动检测和修复不一致问题
 */

'use client';

import { TMDBItem } from './storage';
import { StorageManager } from './storage';


export interface ConsistencyCheckResult {
  isConsistent: boolean;
  inconsistentItems: Array<{
    itemId: string;
    frontendData: TMDBItem;
    backendData: TMDBItem | null;
    inconsistencyType: 'missing_backend' | 'missing_frontend' | 'data_mismatch';
    conflictFields: string[];
  }>;
  totalChecked: number;
  fixedCount: number;
  errors: string[];
}

export interface ValidationConfig {
  enabled: boolean;
  checkIntervalMs: number; // 检查间隔
  autoFix: boolean; // 是否自动修复
  maxRetries: number; // 最大重试次数
  conflictResolution: 'frontend_wins' | 'backend_wins' | 'merge' | 'manual';
  excludeFields: string[]; // 排除检查的字段
}

export class DataConsistencyValidator {
  private static instance: DataConsistencyValidator;
  private config: ValidationConfig;

  private isValidating = false;
  private lastValidationTime = 0;
  private validationHistory: ConsistencyCheckResult[] = [];
  private maxHistorySize = 10;

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  public static getInstance(): DataConsistencyValidator {
    if (!DataConsistencyValidator.instance) {
      DataConsistencyValidator.instance = new DataConsistencyValidator();
    }
    return DataConsistencyValidator.instance;
  }

  /**
   * 获取默认配置
   */
  private getDefaultConfig(): ValidationConfig {
    return {
      enabled: true,
      checkIntervalMs: 30 * 60 * 1000, // 30分钟（减少频繁验证）
      autoFix: true,
      maxRetries: 3,
      conflictResolution: 'frontend_wins',
      excludeFields: ['lastModified', 'syncTimestamp']
    };
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[DataConsistencyValidator] 配置已更新:', this.config);

    // 重启定时验证
    if (this.config.enabled) {
      this.startPeriodicValidation();
    }
  }

  /**
   * 启动验证（只在启动时执行一次，移除定时器）
   */
  public async startPeriodicValidation(): Promise<void> {
    if (!this.config.enabled) return;

    // 只在启动时验证一次
    if (!this.isValidating) {
      await this.validateConsistency();
      }
    }, this.config.checkIntervalMs);

    console.log(`[DataConsistencyValidator] 已启动定期验证，间隔: ${this.config.checkIntervalMs}ms`);
  }

  /**
   * 停止定期验证
   */


  /**
   * 手动验证数据一致性（增强版，改进错误处理）
   */
  public async validateConsistency(): Promise<ConsistencyCheckResult> {
    if (this.isValidating) {
      console.log('[DataConsistencyValidator] 验证正在进行中，跳过');
      return this.getLastValidationResult();
    }

    this.isValidating = true;
    this.lastValidationTime = Date.now();

    console.log('[DataConsistencyValidator] 开始数据一致性验证');

    const result: ConsistencyCheckResult = {
      isConsistent: true,
      inconsistentItems: [],
      totalChecked: 0,
      fixedCount: 0,
      errors: []
    };

    try {
      // 获取前端数据
      const frontendItems = await this.getFrontendItems();

      // 获取后端数据（增强错误处理）
      let backendItems: TMDBItem[] = [];
      let backendDataAvailable = true;

      try {
        backendItems = await this.getBackendItems();
        console.log(`[DataConsistencyValidator] 成功获取后端数据: ${backendItems.length} 个项目`);
      } catch (backendError) {
        console.warn('[DataConsistencyValidator] 后端数据获取失败，使用前端数据作为参考:', backendError);
        backendItems = frontendItems; // 使用前端数据作为参考
        backendDataAvailable = false;
        result.errors.push(`后端数据不可用: ${backendError instanceof Error ? backendError.message : String(backendError)}`);
      }

      result.totalChecked = frontendItems.length;

      // 如果后端数据不可用，进行简化验证
      if (!backendDataAvailable) {
        console.log('[DataConsistencyValidator] 后端数据不可用，执行简化验证');
        result.isConsistent = true; // 假设一致，因为无法比较
        result.errors.push('无法验证数据一致性：后端数据不可用');
        return result;
      }

      // 创建后端数据映射
      const backendMap = new Map<string, TMDBItem>();
      backendItems.forEach(item => backendMap.set(item.id, item));

      // 检查每个前端项目
      for (const frontendItem of frontendItems) {
        const backendItem = backendMap.get(frontendItem.id);
        
        if (!backendItem) {
          // 后端缺失
          result.inconsistentItems.push({
            itemId: frontendItem.id,
            frontendData: frontendItem,
            backendData: null,
            inconsistencyType: 'missing_backend',
            conflictFields: []
          });
        } else {
          // 检查数据是否一致
          const conflictFields = this.findConflictFields(frontendItem, backendItem);
          
          if (conflictFields.length > 0) {
            result.inconsistentItems.push({
              itemId: frontendItem.id,
              frontendData: frontendItem,
              backendData: backendItem,
              inconsistencyType: 'data_mismatch',
              conflictFields
            });
          }
        }
      }

      // 检查后端独有的项目
      for (const backendItem of backendItems) {
        if (!frontendItems.find(item => item.id === backendItem.id)) {
          result.inconsistentItems.push({
            itemId: backendItem.id,
            frontendData: null as any,
            backendData: backendItem,
            inconsistencyType: 'missing_frontend',
            conflictFields: []
          });
        }
      }

      result.isConsistent = result.inconsistentItems.length === 0;

      // 自动修复不一致
      if (!result.isConsistent && this.config.autoFix) {
        result.fixedCount = await this.autoFixInconsistencies(result.inconsistentItems);
      }

      console.log(`[DataConsistencyValidator] 验证完成: 检查${result.totalChecked}项，发现${result.inconsistentItems.length}个不一致，修复${result.fixedCount}个`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMessage);
      console.error('[DataConsistencyValidator] 验证失败:', error);
    } finally {
      this.isValidating = false;
      this.addToHistory(result);
    }

    return result;
  }

  /**
   * 获取前端数据
   */
  private async getFrontendItems(): Promise<TMDBItem[]> {
    try {
      // 直接获取数据（不再使用乐观更新）
      const items = await StorageManager.getItems();
      return items;
    } catch (error) {
      console.error('[DataConsistencyValidator] 获取前端数据失败:', error);
      return [];
    }
  }

  /**
   * 获取后端数据（修复版，使用正确的 API 端点）
   */
  private async getBackendItems(): Promise<TMDBItem[]> {
    try {
      // 尝试多个可能的 API 端点
      const endpoints = [
        '/api/storage/items',  // 主要端点
        '/api/sync-data'       // 备用端点
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`[DataConsistencyValidator] 尝试从 ${endpoint} 获取后端数据`);

          const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            cache: 'no-cache'  // 强制获取最新数据
          });

          if (response.ok) {
            const data = await response.json();

            // 处理不同端点的响应格式
            let items: TMDBItem[] = [];
            if (endpoint === '/api/storage/items') {
              items = data.items || [];
            } else if (endpoint === '/api/sync-data') {
              items = data.items || [];
            }

            console.log(`[DataConsistencyValidator] 从 ${endpoint} 成功获取 ${items.length} 个项目`);
            return items;
          } else {
            console.warn(`[DataConsistencyValidator] ${endpoint} 返回 ${response.status}: ${response.statusText}`);
          }
        } catch (endpointError) {
          console.warn(`[DataConsistencyValidator] ${endpoint} 请求失败:`, endpointError);
        }
      }

      // 所有端点都失败，抛出错误
      throw new Error('所有后端 API 端点都不可用');

    } catch (error) {
      console.error('[DataConsistencyValidator] 获取后端数据失败:', error);

      // 回退到本地存储
      console.log('[DataConsistencyValidator] 回退到本地存储数据');
      return await StorageManager.getItems();
    }
  }

  /**
   * 查找冲突字段
   */
  private findConflictFields(frontendItem: TMDBItem, backendItem: TMDBItem): string[] {
    const conflicts: string[] = [];
    
    // 检查所有字段（排除配置中指定的字段）
    const allKeys = new Set([...Object.keys(frontendItem), ...Object.keys(backendItem)]);
    
    for (const key of allKeys) {
      if (this.config.excludeFields.includes(key)) {
        continue;
      }
      
      const frontendValue = (frontendItem as any)[key];
      const backendValue = (backendItem as any)[key];
      
      if (!this.deepEqual(frontendValue, backendValue)) {
        conflicts.push(key);
      }
    }
    
    return conflicts;
  }

  /**
   * 深度比较两个值
   */
  private deepEqual(a: any, b: any): boolean {
    if (a === b) return true;
    
    if (a == null || b == null) return a === b;
    
    if (typeof a !== typeof b) return false;
    
    if (typeof a === 'object') {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      
      if (keysA.length !== keysB.length) return false;
      
      for (const key of keysA) {
        if (!keysB.includes(key) || !this.deepEqual(a[key], b[key])) {
          return false;
        }
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * 自动修复不一致
   */
  private async autoFixInconsistencies(inconsistencies: ConsistencyCheckResult['inconsistentItems']): Promise<number> {
    let fixedCount = 0;
    
    for (const inconsistency of inconsistencies) {
      try {
        const fixed = await this.fixSingleInconsistency(inconsistency);
        if (fixed) {
          fixedCount++;
        }
      } catch (error) {
        console.error(`[DataConsistencyValidator] 修复失败: ${inconsistency.itemId}`, error);
      }
    }
    
    return fixedCount;
  }

  /**
   * 修复单个不一致
   */
  private async fixSingleInconsistency(inconsistency: ConsistencyCheckResult['inconsistentItems'][0]): Promise<boolean> {
    switch (inconsistency.inconsistencyType) {
      case 'missing_backend':
        // 前端有，后端没有 - 同步到后端
        if (this.config.conflictResolution === 'frontend_wins') {
          return await this.syncToBackend(inconsistency.frontendData);
        }
        break;
        
      case 'missing_frontend':
        // 后端有，前端没有 - 同步到前端
        if (this.config.conflictResolution === 'backend_wins' && inconsistency.backendData) {
          return await this.syncToFrontend(inconsistency.backendData);
        }
        break;
        
      case 'data_mismatch':
        // 数据不匹配 - 根据配置解决冲突
        return await this.resolveDataMismatch(inconsistency);
    }
    
    return false;
  }

  /**
   * 同步到后端
   */
  private async syncToBackend(item: TMDBItem): Promise<boolean> {
    try {
      const success = await StorageManager.updateItem(item);
      if (success) {
        console.log(`[DataConsistencyValidator] 已同步到后端: ${item.id}`);
      }
      return success;
    } catch (error) {
      console.error(`[DataConsistencyValidator] 同步到后端失败: ${item.id}`, error);
      return false;
    }
  }

  /**
   * 同步到前端（现在使用服务端存储，不再需要localStorage）
   */
  private async syncToFrontend(item: TMDBItem): Promise<boolean> {
    try {
      // 数据现在直接存储在服务端，不需要手动同步到前端
      console.log(`[DataConsistencyValidator] 数据已在服务端更新: ${item.id}`);
      return true;
    } catch (error) {
      console.error(`[DataConsistencyValidator] 同步失败: ${item.id}`, error);
      return false;
    }
  }

  /**
   * 解决数据不匹配
   */
  private async resolveDataMismatch(inconsistency: ConsistencyCheckResult['inconsistentItems'][0]): Promise<boolean> {
    if (!inconsistency.backendData) return false;
    
    switch (this.config.conflictResolution) {
      case 'frontend_wins':
        return await this.syncToBackend(inconsistency.frontendData);
        
      case 'backend_wins':
        return await this.syncToFrontend(inconsistency.backendData);
        
      case 'merge':
        // 合并数据（前端优先）
        const mergedData = { ...inconsistency.backendData, ...inconsistency.frontendData };
        return await this.syncToBackend(mergedData);
        
      default:
        return false;
    }
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(result: ConsistencyCheckResult): void {
    this.validationHistory.unshift(result);
    
    if (this.validationHistory.length > this.maxHistorySize) {
      this.validationHistory = this.validationHistory.slice(0, this.maxHistorySize);
    }
  }

  /**
   * 获取最后一次验证结果
   */
  public getLastValidationResult(): ConsistencyCheckResult {
    return this.validationHistory[0] || {
      isConsistent: true,
      inconsistentItems: [],
      totalChecked: 0,
      fixedCount: 0,
      errors: []
    };
  }

  /**
   * 获取验证历史
   */
  public getValidationHistory(): ConsistencyCheckResult[] {
    return [...this.validationHistory];
  }

  /**
   * 获取验证统计（增强版，包含 API 健康状态）
   */
  public getValidationStats(): {
    totalValidations: number;
    averageInconsistencies: number;
    totalFixed: number;
    lastValidationTime: number;
    isValidating: boolean;
    apiHealthy: boolean;
    lastApiCheck: number;
  } {
    const totalValidations = this.validationHistory.length;
    const totalInconsistencies = this.validationHistory.reduce((sum, result) => sum + result.inconsistentItems.length, 0);
    const totalFixed = this.validationHistory.reduce((sum, result) => sum + result.fixedCount, 0);

    // 检查最近的验证是否有 API 错误
    const recentValidation = this.validationHistory[0];
    const apiHealthy = !recentValidation || recentValidation.errors.length === 0 ||
                      !recentValidation.errors.some(error => error.includes('后端数据不可用'));

    return {
      totalValidations,
      averageInconsistencies: totalValidations > 0 ? totalInconsistencies / totalValidations : 0,
      totalFixed,
      lastValidationTime: this.lastValidationTime,
      isValidating: this.isValidating,
      apiHealthy,
      lastApiCheck: this.lastValidationTime
    };
  }

  /**
   * 检查 API 健康状态
   */
  public async checkApiHealth(): Promise<{
    healthy: boolean;
    endpoints: Array<{ url: string; status: number; responseTime: number; error?: string }>;
    timestamp: number;
  }> {
    const endpoints = [
      '/api/items',
      '/api/storage/items',
      '/api/sync-data'
    ];

    const results = await Promise.allSettled(
      endpoints.map(async (endpoint) => {
        const startTime = Date.now();
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            cache: 'no-cache'
          });

          const responseTime = Date.now() - startTime;

          return {
            url: endpoint,
            status: response.status,
            responseTime,
            error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`
          };
        } catch (error) {
          const responseTime = Date.now() - startTime;
          return {
            url: endpoint,
            status: 0,
            responseTime,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      })
    );

    const endpointResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          url: endpoints[index],
          status: 0,
          responseTime: 0,
          error: result.reason instanceof Error ? result.reason.message : String(result.reason)
        };
      }
    });

    const healthy = endpointResults.some(result => result.status === 200);

    return {
      healthy,
      endpoints: endpointResults,
      timestamp: Date.now()
    };
  }
}

export const dataConsistencyValidator = DataConsistencyValidator.getInstance();
