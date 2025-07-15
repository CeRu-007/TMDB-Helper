"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Lock,
  Settings,
  Zap,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { EnhancedMonitoringDialog } from './enhanced-monitoring-dialog';
import { ConfigManagementDialog } from './config-management-dialog';
import { performanceMonitor } from '@/lib/performance-monitor';
import { configManager } from '@/lib/config-manager';
import { StorageSyncManager } from '@/lib/storage-sync-manager';
import { DistributedLock } from '@/lib/distributed-lock';

interface SystemStatus {
  overall: 'healthy' | 'warning' | 'critical' | 'unknown';
  scheduler: {
    status: 'running' | 'stopped' | 'error';
    activeTasks: number;
    totalTasks: number;
  };
  performance: {
    memoryUsage: number;
    averageResponseTime: number;
    errorRate: number;
  };
  storage: {
    usage: number;
    syncStatus: 'synced' | 'syncing' | 'error';
    lastSync: string;
  };
  locks: {
    active: number;
    expired: number;
  };
  config: {
    customized: number;
    total: number;
  };
}

export function SystemStatusPanel() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMonitoring, setShowMonitoring] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchStatus = async () => {
    try {
      // 并行获取所有状态信息
      const [
        schedulerResponse,
        performanceData,
        syncStats,
        lockStatus,
        configStats
      ] = await Promise.all([
        fetch('/api/scheduler-status').then(r => r.json()).catch(() => ({ success: false })),
        performanceMonitor.getRealTimeMetrics(),
        StorageSyncManager.getSyncStats().catch(() => ({
          status: { syncInProgress: false, conflictCount: 0 },
          lastSyncAgo: '未知'
        })),
        DistributedLock.getAllLockStatus().catch(() => ({
          activeLocks: [],
          expiredLocks: [],
          totalLocks: 0
        })),
        configManager.getConfigStats()
      ]);

      // 计算整体健康状态
      const issues = [];
      if (!schedulerResponse.success) issues.push('调度器异常');
      if (performanceData.systemMetrics?.memory.percentage > 80) issues.push('内存使用率过高');
      if (syncStats.status.conflictCount > 10) issues.push('同步冲突过多');
      if (lockStatus.expiredLocks.length > 5) issues.push('过期锁过多');

      let overall: SystemStatus['overall'] = 'healthy';
      if (issues.length > 2) {
        overall = 'critical';
      } else if (issues.length > 0) {
        overall = 'warning';
      }

      const systemStatus: SystemStatus = {
        overall,
        scheduler: {
          status: schedulerResponse.success ? 
            (schedulerResponse.status.scheduler.isInitialized ? 'running' : 'stopped') : 'error',
          activeTasks: schedulerResponse.success ? schedulerResponse.status.tasks.running : 0,
          totalTasks: schedulerResponse.success ? schedulerResponse.status.tasks.total : 0
        },
        performance: {
          memoryUsage: performanceData.systemMetrics?.memory.percentage || 0,
          averageResponseTime: 0, // 需要从性能数据中计算
          errorRate: 0 // 需要从性能数据中计算
        },
        storage: {
          usage: performanceData.systemMetrics?.storage.percentage || 0,
          syncStatus: syncStats.status.syncInProgress ? 'syncing' : 'synced',
          lastSync: syncStats.lastSyncAgo
        },
        locks: {
          active: lockStatus.activeLocks.length,
          expired: lockStatus.expiredLocks.length
        },
        config: {
          customized: configStats.customizedSettings,
          total: configStats.totalSettings
        }
      };

      setStatus(systemStatus);
    } catch (error) {
      console.error('获取系统状态失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    let interval: NodeJS.Timeout | null = null;
    if (autoRefresh) {
      interval = setInterval(fetchStatus, 30000); // 30秒刷新
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const getStatusColor = (status: SystemStatus['overall']) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: SystemStatus['overall']) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'critical': return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default: return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusText = (status: SystemStatus['overall']) => {
    switch (status) {
      case 'healthy': return '系统运行正常';
      case 'warning': return '系统存在警告';
      case 'critical': return '系统存在严重问题';
      default: return '状态未知';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            系统状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">加载中...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            系统状态
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              无法获取系统状态信息
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              系统状态
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? '自动刷新' : '手动刷新'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMonitoring(true)}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                详细监控
              </Button>
            </div>
          </div>
          <CardDescription>
            定时任务系统的实时运行状态概览
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 整体状态 */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {getStatusIcon(status.overall)}
              <div>
                <div className="font-medium">整体状态</div>
                <div className={`text-sm ${getStatusColor(status.overall)}`}>
                  {getStatusText(status.overall)}
                </div>
              </div>
            </div>
            <Badge variant={status.overall === 'healthy' ? 'default' : 'destructive'}>
              {status.overall.toUpperCase()}
            </Badge>
          </div>

          {/* 状态指标网格 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* 调度器状态 */}
            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">调度器</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">状态</span>
                  <Badge 
                    variant={status.scheduler.status === 'running' ? 'default' : 'destructive'}
                    className="text-xs"
                  >
                    {status.scheduler.status === 'running' ? '运行中' : '已停止'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">活跃任务</span>
                  <span className="text-sm font-medium">
                    {status.scheduler.activeTasks}/{status.scheduler.totalTasks}
                  </span>
                </div>
              </div>
            </div>

            {/* 性能指标 */}
            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium">性能</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">内存使用</span>
                  <span className="text-sm font-medium">
                    {status.performance.memoryUsage.toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={status.performance.memoryUsage} 
                  className="h-1"
                />
              </div>
            </div>

            {/* 存储状态 */}
            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">存储</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">使用率</span>
                  <span className="text-sm font-medium">
                    {status.storage.usage.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">同步</span>
                  <Badge 
                    variant={status.storage.syncStatus === 'synced' ? 'default' : 'outline'}
                    className="text-xs"
                  >
                    {status.storage.syncStatus === 'synced' ? '已同步' : '同步中'}
                  </Badge>
                </div>
              </div>
            </div>

            {/* 锁状态 */}
            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">锁管理</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">活跃锁</span>
                  <span className="text-sm font-medium">{status.locks.active}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">过期锁</span>
                  <span className={`text-sm font-medium ${status.locks.expired > 0 ? 'text-red-500' : ''}`}>
                    {status.locks.expired}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 快速操作 */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowConfig(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              配置管理
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={fetchStatus}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新状态
            </Button>

            {status.overall !== 'healthy' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMonitoring(true)}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                查看问题
              </Button>
            )}
          </div>

          {/* 最后同步时间 */}
          <div className="text-xs text-gray-500 text-center pt-2 border-t">
            上次同步: {status.storage.lastSync} | 配置自定义: {status.config.customized}/{status.config.total}
          </div>
        </CardContent>
      </Card>

      {/* 监控对话框 */}
      <EnhancedMonitoringDialog
        open={showMonitoring}
        onOpenChange={setShowMonitoring}
      />

      {/* 配置对话框 */}
      <ConfigManagementDialog
        open={showConfig}
        onOpenChange={setShowConfig}
      />
    </>
  );
}