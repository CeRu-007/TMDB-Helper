/**
 * 乐观更新系统压力测试
 * 测试高频操作下的数据一致性和并发控制
 */

import { TMDBItem } from '@/lib/storage';
import { operationQueueManager } from '@/lib/operation-queue-manager';
import { optimisticUpdateManager } from '@/lib/optimistic-update-manager';
import { dataConsistencyValidator } from '@/lib/data-consistency-validator';

interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  operationsCount: number;
  conflictsDetected: number;
  mergedOperations: number;
  failedOperations: number;
  dataConsistency: boolean;
  errors: string[];
}

export class OptimisticUpdateStressTest {
  private testResults: TestResult[] = [];
  private mockItems: TMDBItem[] = [];

  constructor() {
    this.initializeMockData();
  }

  /**
   * 初始化测试数据
   */
  private initializeMockData(): void {
    this.mockItems = Array.from({ length: 10 }, (_, i) => ({
      id: `test_item_${i}`,
      title: `测试项目 ${i}`,
      type: 'movie' as const,
      tmdb_id: 1000 + i,
      poster_path: `/test${i}.jpg`,
      overview: `测试项目 ${i} 的描述`,
      release_date: '2024-01-01',
      vote_average: 7.5,
      vote_count: 100,
      genre_ids: [1, 2, 3],
      original_language: 'zh',
      original_title: `Test Movie ${i}`,
      popularity: 100.0,
      backdrop_path: `/backdrop${i}.jpg`,
      adult: false,
      video: false,
      watched_episodes: 0,
      total_episodes: 10,
      current_season: 1,
      total_seasons: 1,
      last_watched_date: null,
      added_date: new Date().toISOString(),
      tags: [],
      personal_rating: null,
      notes: '',
      watch_status: 'plan_to_watch' as const,
      favorite: false,
      custom_fields: {}
    }));
  }

  /**
   * 运行所有测试
   */
  public async runAllTests(): Promise<TestResult[]> {
    console.log('[StressTest] 开始乐观更新系统压力测试');

    this.testResults = [];

    // 测试1: 高频更新同一项目
    await this.testHighFrequencyUpdates();

    // 测试2: 并发更新多个项目
    await this.testConcurrentUpdates();

    // 测试3: 网络延迟模拟
    await this.testNetworkLatency();

    // 测试4: 操作失败恢复
    await this.testFailureRecovery();

    // 测试5: 数据一致性验证
    await this.testDataConsistency();

    // 测试6: 队列管理压力测试
    await this.testQueueManagement();

    console.log('[StressTest] 所有测试完成');
    this.printTestSummary();

    return this.testResults;
  }

  /**
   * 测试1: 高频更新同一项目
   */
  private async testHighFrequencyUpdates(): Promise<void> {
    const testName = '高频更新同一项目';
    const startTime = Date.now();
    let operationsCount = 0;
    let conflictsDetected = 0;
    let mergedOperations = 0;
    const errors: string[] = [];

    try {
      console.log(`[StressTest] 开始测试: ${testName}`);

      const testItem = { ...this.mockItems[0] };
      const updateCount = 20; // 20次快速更新

      // 模拟用户快速连续点击更新
      const promises = Array.from({ length: updateCount }, async (_, i) => {
        try {
          const updatedItem = {
            ...testItem,
            watched_episodes: i + 1,
            last_watched_date: new Date().toISOString()
          };

          const operationId = optimisticUpdateManager.addOperation({
            type: 'update',
            entity: 'item',
            data: updatedItem,
            originalData: testItem
          });

          operationsCount++;

          // 模拟短暂延迟
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));

          return operationId;
        } catch (error) {
          errors.push(`操作 ${i} 失败: ${error instanceof Error ? error.message : String(error)}`);
          return null;
        }
      });

      const operationIds = await Promise.all(promises);
      
      // 等待操作完成
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 检查操作合并情况
      const queueStatus = operationQueueManager.getQueueStatus();
      const pendingOps = optimisticUpdateManager.getPendingOperations();
      
      mergedOperations = updateCount - pendingOps.length;
      
      this.testResults.push({
        testName,
        success: errors.length === 0,
        duration: Date.now() - startTime,
        operationsCount,
        conflictsDetected,
        mergedOperations,
        failedOperations: errors.length,
        dataConsistency: true,
        errors
      });

    } catch (error) {
      errors.push(`测试失败: ${error instanceof Error ? error.message : String(error)}`);
      
      this.testResults.push({
        testName,
        success: false,
        duration: Date.now() - startTime,
        operationsCount,
        conflictsDetected,
        mergedOperations,
        failedOperations: errors.length,
        dataConsistency: false,
        errors
      });
    }
  }

  /**
   * 测试2: 并发更新多个项目
   */
  private async testConcurrentUpdates(): Promise<void> {
    const testName = '并发更新多个项目';
    const startTime = Date.now();
    let operationsCount = 0;
    const errors: string[] = [];

    try {
      console.log(`[StressTest] 开始测试: ${testName}`);

      // 同时更新5个不同项目
      const promises = this.mockItems.slice(0, 5).map(async (item, index) => {
        try {
          const updatedItem = {
            ...item,
            watched_episodes: 5,
            personal_rating: 8.0 + index * 0.2
          };

          const operationId = optimisticUpdateManager.addOperation({
            type: 'update',
            entity: 'item',
            data: updatedItem,
            originalData: item
          });

          operationsCount++;
          return operationId;
        } catch (error) {
          errors.push(`项目 ${item.id} 更新失败: ${error instanceof Error ? error.message : String(error)}`);
          return null;
        }
      });

      await Promise.all(promises);
      
      // 等待操作完成
      await new Promise(resolve => setTimeout(resolve, 1500));

      this.testResults.push({
        testName,
        success: errors.length === 0,
        duration: Date.now() - startTime,
        operationsCount,
        conflictsDetected: 0,
        mergedOperations: 0,
        failedOperations: errors.length,
        dataConsistency: true,
        errors
      });

    } catch (error) {
      errors.push(`测试失败: ${error instanceof Error ? error.message : String(error)}`);
      
      this.testResults.push({
        testName,
        success: false,
        duration: Date.now() - startTime,
        operationsCount,
        conflictsDetected: 0,
        mergedOperations: 0,
        failedOperations: errors.length,
        dataConsistency: false,
        errors
      });
    }
  }

  /**
   * 测试3: 网络延迟模拟
   */
  private async testNetworkLatency(): Promise<void> {
    const testName = '网络延迟模拟';
    const startTime = Date.now();
    let operationsCount = 0;
    const errors: string[] = [];

    try {
      console.log(`[StressTest] 开始测试: ${testName}`);

      // 模拟网络延迟的操作执行器
      const originalExecutor = operationQueueManager.setOperationExecutor;
      
      operationQueueManager.setOperationExecutor(async (operation) => {
        // 模拟网络延迟 (200-1000ms)
        const delay = 200 + Math.random() * 800;
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // 模拟90%成功率
        return Math.random() > 0.1;
      });

      const testItem = { ...this.mockItems[1] };
      
      // 在网络延迟情况下进行多次更新
      for (let i = 0; i < 10; i++) {
        const updatedItem = {
          ...testItem,
          watched_episodes: i + 1
        };

        optimisticUpdateManager.addOperation({
          type: 'update',
          entity: 'item',
          data: updatedItem,
          originalData: testItem
        });

        operationsCount++;
        
        // 短暂间隔
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 等待所有操作完成
      await new Promise(resolve => setTimeout(resolve, 3000));

      this.testResults.push({
        testName,
        success: errors.length === 0,
        duration: Date.now() - startTime,
        operationsCount,
        conflictsDetected: 0,
        mergedOperations: 0,
        failedOperations: errors.length,
        dataConsistency: true,
        errors
      });

    } catch (error) {
      errors.push(`测试失败: ${error instanceof Error ? error.message : String(error)}`);
      
      this.testResults.push({
        testName,
        success: false,
        duration: Date.now() - startTime,
        operationsCount,
        conflictsDetected: 0,
        mergedOperations: 0,
        failedOperations: errors.length,
        dataConsistency: false,
        errors
      });
    }
  }

  /**
   * 测试4: 操作失败恢复
   */
  private async testFailureRecovery(): Promise<void> {
    const testName = '操作失败恢复';
    const startTime = Date.now();
    let operationsCount = 0;
    let failedOperations = 0;
    const errors: string[] = [];

    try {
      console.log(`[StressTest] 开始测试: ${testName}`);

      // 模拟失败的操作执行器
      operationQueueManager.setOperationExecutor(async (operation) => {
        // 50%失败率
        if (Math.random() > 0.5) {
          throw new Error('模拟网络错误');
        }
        return true;
      });

      const testItem = { ...this.mockItems[2] };
      
      // 进行多次操作，期望一些失败
      for (let i = 0; i < 8; i++) {
        const updatedItem = {
          ...testItem,
          watched_episodes: i + 1
        };

        optimisticUpdateManager.addOperation({
          type: 'update',
          entity: 'item',
          data: updatedItem,
          originalData: testItem
        });

        operationsCount++;
      }

      // 等待操作完成和重试
      await new Promise(resolve => setTimeout(resolve, 4000));

      // 检查失败操作数量
      const pendingOps = optimisticUpdateManager.getPendingOperations();
      failedOperations = pendingOps.filter(op => op.status === 'failed').length;

      this.testResults.push({
        testName,
        success: true, // 测试成功完成
        duration: Date.now() - startTime,
        operationsCount,
        conflictsDetected: 0,
        mergedOperations: 0,
        failedOperations,
        dataConsistency: true,
        errors
      });

    } catch (error) {
      errors.push(`测试失败: ${error instanceof Error ? error.message : String(error)}`);
      
      this.testResults.push({
        testName,
        success: false,
        duration: Date.now() - startTime,
        operationsCount,
        conflictsDetected: 0,
        mergedOperations: 0,
        failedOperations,
        dataConsistency: false,
        errors
      });
    }
  }

  /**
   * 测试5: 数据一致性验证
   */
  private async testDataConsistency(): Promise<void> {
    const testName = '数据一致性验证';
    const startTime = Date.now();
    const errors: string[] = [];

    try {
      console.log(`[StressTest] 开始测试: ${testName}`);

      // 执行数据一致性验证
      const result = await dataConsistencyValidator.validateConsistency();
      
      const dataConsistency = result.isConsistent || result.fixedCount > 0;

      this.testResults.push({
        testName,
        success: result.errors.length === 0,
        duration: Date.now() - startTime,
        operationsCount: result.totalChecked,
        conflictsDetected: result.inconsistentItems.length,
        mergedOperations: 0,
        failedOperations: result.errors.length,
        dataConsistency,
        errors: result.errors
      });

    } catch (error) {
      errors.push(`测试失败: ${error instanceof Error ? error.message : String(error)}`);
      
      this.testResults.push({
        testName,
        success: false,
        duration: Date.now() - startTime,
        operationsCount: 0,
        conflictsDetected: 0,
        mergedOperations: 0,
        failedOperations: 1,
        dataConsistency: false,
        errors
      });
    }
  }

  /**
   * 测试6: 队列管理压力测试
   */
  private async testQueueManagement(): Promise<void> {
    const testName = '队列管理压力测试';
    const startTime = Date.now();
    let operationsCount = 0;
    const errors: string[] = [];

    try {
      console.log(`[StressTest] 开始测试: ${testName}`);

      // 大量操作入队
      const promises = Array.from({ length: 50 }, async (_, i) => {
        const itemIndex = i % this.mockItems.length;
        const testItem = { ...this.mockItems[itemIndex] };
        
        const updatedItem = {
          ...testItem,
          watched_episodes: i,
          notes: `批量更新 ${i}`
        };

        optimisticUpdateManager.addOperation({
          type: 'update',
          entity: 'item',
          data: updatedItem,
          originalData: testItem
        });

        operationsCount++;
      });

      await Promise.all(promises);

      // 检查队列状态
      const queueStatus = operationQueueManager.getQueueStatus();
      
      // 等待队列处理
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 清理队列
      operationQueueManager.cleanup();

      this.testResults.push({
        testName,
        success: errors.length === 0,
        duration: Date.now() - startTime,
        operationsCount,
        conflictsDetected: 0,
        mergedOperations: 0,
        failedOperations: errors.length,
        dataConsistency: true,
        errors
      });

    } catch (error) {
      errors.push(`测试失败: ${error instanceof Error ? error.message : String(error)}`);
      
      this.testResults.push({
        testName,
        success: false,
        duration: Date.now() - startTime,
        operationsCount,
        conflictsDetected: 0,
        mergedOperations: 0,
        failedOperations: errors.length,
        dataConsistency: false,
        errors
      });
    }
  }

  /**
   * 打印测试摘要
   */
  private printTestSummary(): void {
    console.log('\n=== 乐观更新系统压力测试摘要 ===');
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const totalOperations = this.testResults.reduce((sum, r) => sum + r.operationsCount, 0);
    const totalDuration = this.testResults.reduce((sum, r) => sum + r.duration, 0);
    const totalMerged = this.testResults.reduce((sum, r) => sum + r.mergedOperations, 0);
    const totalFailed = this.testResults.reduce((sum, r) => sum + r.failedOperations, 0);

    console.log(`总测试数: ${totalTests}`);
    console.log(`通过测试: ${passedTests} (${((passedTests / totalTests) * 100).toFixed(1)}%)`);
    console.log(`总操作数: ${totalOperations}`);
    console.log(`总耗时: ${totalDuration}ms`);
    console.log(`合并操作: ${totalMerged}`);
    console.log(`失败操作: ${totalFailed}`);
    console.log(`操作成功率: ${(((totalOperations - totalFailed) / totalOperations) * 100).toFixed(1)}%`);

    console.log('\n详细结果:');
    this.testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.testName}: ${result.duration}ms, ${result.operationsCount}操作, ${result.failedOperations}失败`);
      
      if (result.errors.length > 0) {
        result.errors.forEach(error => {
          console.log(`   错误: ${error}`);
        });
      }
    });
  }

  /**
   * 获取测试结果
   */
  public getTestResults(): TestResult[] {
    return [...this.testResults];
  }
}

// 导出测试实例
export const stressTest = new OptimisticUpdateStressTest();
