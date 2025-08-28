"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Loader2, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  PauseCircle, 
  RefreshCw, 
  Settings,
  Activity,
  Database,
  Lock,
  TrendingUp,
  TrendingDown,
  Zap,
  MemoryStick,
  HardDrive,
  Timer,
  AlertCircle,
  Download,
  Upload
} from 'lucide-react';
import { performanceMonitor, PerformanceReport } from '@/lib/performance-monitor';
import { configManager } from '@/lib/config-manager';
import { StorageSyncManager } from '@/lib/storage-sync-manager';
import { DistributedLock } from '@/lib/distributed-lock';

interface EnhancedMonitoringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MonitoringData {
  scheduler: {
    isInitialized: boolean;
    activeTimers: number;
    runningTasks: number;
    timerDetails: Array<{taskId: string, nextRun?: string}>;
  };
  tasks: {
    total: number;
    enabled: number;
    disabled: number;
    running: number;
  };
  performance: {
    currentTasks: any[];
    systemMetrics: any;
    recentMetrics: any[];
  };
  sync: {
    status: any;
    lockStatus: any;
    lastSyncAgo: string;
  };
  locks: {
    activeLocks: any[];
    expiredLocks: any[];
    totalLocks: number;
  };
  config: {
    totalSettings: number;
    customizedSettings: number;
    defaultSettings: number;
    lastUpdated: string | null;
  };
}

export function EnhancedMonitoringDialog({ open, onOpenChange }: EnhancedMonitoringDialogProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<MonitoringData | null>(null);
  const [operating, setOperating] = useState(false);
  const [performanceReport, setPerformanceReport] = useState<PerformanceReport | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 并行获取所有监控数据
      const [
        performanceData,
        syncStats,
        lockStatus,
        configStats
      ] = await Promise.all([
        performanceMonitor.getRealTimeMetrics(),
        StorageSyncManager.getSyncStats(),
        DistributedLock.getAllLockStatus(),
        configManager.getConfigStats()
      ]);

      const monitoringData: MonitoringData = {
        scheduler: {
          isInitialized: false,
          activeTimers: 0,
          runningTasks: 0,
          timerDetails: []
        },
        tasks: {
          total: 0,
          enabled: 0,
          disabled: 0,
          running: 0
        },
        performance: performanceData,
        sync: syncStats,
        locks: lockStatus,
        config: configStats
      };

      setData(monitoringData);

      // 生成性能报告
      try {
        const report = await performanceMonitor.generatePerformanceReport();
        setPerformanceReport(report);
      } catch (error) {
        console.error('生成性能报告失败:', error);
      }

    } catch (error) {
      console.error('获取监控数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOperation = async (action: string) => {
    setOperating(true);
    try {
      let response;
      
      switch (action) {

        case 'sync':
          await StorageSyncManager.triggerSync();
          break;
        case 'cleanup_locks':
          await DistributedLock.forceCleanupAllLocks();
          break;
        case 'cleanup_performance':
          performanceMonitor.cleanupOldData(7);
          break;
        default:
          throw new Error(`未知操作: ${action}`);
      }

      if (response && !response.ok) {
        throw new Error(`操作失败: ${response.statusText}`);
      }

      // 重新获取数据
      await fetchData();

    } catch (error) {
      console.error(`操作 ${action} 失败:`, error);
    } finally {
      setOperating(false);
    }
  };

  const toggleAutoRefresh = () => {
    if (autoRefresh) {
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
      setAutoRefresh(false);
    } else {
      const interval = setInterval(fetchData, 30000); // 30秒刷新
      setRefreshInterval(interval);
      setAutoRefresh(true);
    }
  };

  const exportData = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      monitoringData: data,
      performanceReport,
      config: configManager.exportConfig()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tmdb-helper-monitoring-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (open) {
      fetchData();
    }
    
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [open]);

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '未设置';
    try {
      return new Date(timeStr).toLocaleString('zh-CN');
    } catch {
      return timeStr;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'disabled':
        return <PauseCircle className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getHealthStatus = (data: MonitoringData) => {
    if (!data) return { status: 'unknown', color: 'gray', message: '数据加载中' };

    const issues = [];
    

    if (data.tasks.running > data.tasks.enabled * 0.8) issues.push('运行任务过多');
    if (data.locks.expiredLocks.length > 5) issues.push('过期锁过多');
    if (data.performance.systemMetrics?.memory.percentage > 80) issues.push('内存使用率过高');
    if (data.sync.status.conflictCount > 10) issues.push('同步冲突过多');

    if (issues.length === 0) {
      return { status: 'healthy', color: 'green', message: '系统运行正常' };
    } else if (issues.length <= 2) {
      return { status: 'warning', color: 'yellow', message: `发现 ${issues.length} 个警告` };
    } else {
      return { status: 'critical', color: 'red', message: `发现 ${issues.length} 个问题` };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            系统监控中心
          </DialogTitle>
          <DialogDescription>
            实时监控定时任务系统的运行状态、性能指标和资源使用情况
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 操作按钮栏 */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={fetchData}
              disabled={loading}
              size="sm"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              刷新数据
            </Button>
            
            <Button 
              onClick={toggleAutoRefresh}
              variant={autoRefresh ? "default" : "outline"}
              size="sm"
            >
              <Timer className="h-4 w-4 mr-2" />
              {autoRefresh ? '停止自动刷新' : '自动刷新'}
            </Button>

            <Button 
              onClick={exportData}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              导出数据
            </Button>

            <Button 
              onClick={() => handleOperation('reinitialize')}
              disabled={operating}
              variant="outline"
              size="sm"
            >
              重新初始化
            </Button>

            <Button 
              onClick={() => handleOperation('sync')}
              disabled={operating}
              variant="outline"
              size="sm"
            >
              <Upload className="h-4 w-4 mr-2" />
              强制同步
            </Button>
          </div>

          {/* 系统健康状态 */}
          {data && (
            <Alert className={`border-${getHealthStatus(data).color}-200`}>
              <AlertCircle className={`h-4 w-4 text-${getHealthStatus(data).color}-500`} />
              <AlertDescription className="flex items-center justify-between">
                <span>系统状态: {getHealthStatus(data).message}</span>
                <Badge variant={getHealthStatus(data).status === 'healthy' ? 'default' : 'destructive'}>
                  {getHealthStatus(data).status.toUpperCase()}
                </Badge>
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">概览</TabsTrigger>
              <TabsTrigger value="performance">性能</TabsTrigger>
              <TabsTrigger value="storage">存储</TabsTrigger>
              <TabsTrigger value="locks">锁管理</TabsTrigger>
              <TabsTrigger value="config">配置</TabsTrigger>
            </TabsList>

            {/* 概览标签页 */}
            <TabsContent value="overview" className="space-y-4">
              {data && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">


                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">活跃任务</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        {data.tasks.running} / {data.tasks.enabled}
                      </div>
                      <div className="text-xs text-gray-500">
                        运行中 / 已启用
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">内存使用</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-lg font-bold">
                          {data.performance.systemMetrics?.memory.percentage.toFixed(1) || 0}%
                        </div>
                        <Progress 
                          value={data.performance.systemMetrics?.memory.percentage || 0} 
                          className="h-2"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">同步状态</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm">
                        <div>上次同步: {data.sync.lastSyncAgo}</div>
                        <div className="text-xs text-gray-500">
                          冲突: {data.sync.status.conflictCount}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>



            {/* 性能标签页 */}
            <TabsContent value="performance" className="space-y-4">
              {performanceReport && (
                <div className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">性能概览</CardTitle>
                      <CardDescription>
                        统计期间: {formatTime(performanceReport.period.start)} - {formatTime(performanceReport.period.end)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <div className="text-lg font-bold">{performanceReport.summary.totalTasks}</div>
                          <div className="text-xs text-gray-500">总任务数</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-green-600">{performanceReport.summary.successfulTasks}</div>
                          <div className="text-xs text-gray-500">成功任务</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold text-red-600">{performanceReport.summary.failedTasks}</div>
                          <div className="text-xs text-gray-500">失败任务</div>
                        </div>
                        <div>
                          <div className="text-lg font-bold">{performanceReport.summary.errorRate.toFixed(1)}%</div>
                          <div className="text-xs text-gray-500">错误率</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 性能建议 */}
                  {performanceReport.recommendations.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">性能建议</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {performanceReport.recommendations.map((recommendation, index) => (
                            <div key={index} className="flex items-start gap-2 p-2 bg-blue-50 rounded">
                              <Zap className="h-4 w-4 text-blue-500 mt-0.5" />
                              <span className="text-sm">{recommendation}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 错误统计 */}
                  {performanceReport.topErrors.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">常见错误</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {performanceReport.topErrors.slice(0, 5).map((error, index) => (
                            <div key={index} className="flex items-center justify-between p-2 border rounded">
                              <span className="text-sm font-mono text-red-600 truncate flex-1">
                                {error.error}
                              </span>
                              <Badge variant="destructive">
                                {error.count} ({error.percentage.toFixed(1)}%)
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>

            {/* 存储标签页 */}
            <TabsContent value="storage" className="space-y-4">
              {data && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Database className="h-4 w-4" />
                          同步状态
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span>上次同步:</span>
                          <span>{data.sync.lastSyncAgo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>客户端版本:</span>
                          <span>{data.sync.status.clientVersion}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>服务端版本:</span>
                          <span>{data.sync.status.serverVersion}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>冲突次数:</span>
                          <Badge variant={data.sync.status.conflictCount > 0 ? "destructive" : "default"}>
                            {data.sync.status.conflictCount}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span>同步状态:</span>
                          <Badge variant={data.sync.status.syncInProgress ? "default" : "outline"}>
                            {data.sync.status.syncInProgress ? '同步中' : '空闲'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <HardDrive className="h-4 w-4" />
                          存储使用情况
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {data.performance.systemMetrics?.storage && (
                          <>
                            <div className="space-y-1">
                              <div className="flex justify-between text-sm">
                                <span>已使用:</span>
                                <span>{(data.performance.systemMetrics.storage.used / 1024).toFixed(1)} KB</span>
                              </div>
                              <Progress 
                                value={data.performance.systemMetrics.storage.percentage} 
                                className="h-2"
                              />
                              <div className="text-xs text-gray-500 text-center">
                                {data.performance.systemMetrics.storage.percentage.toFixed(1)}% 已使用
                              </div>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* 锁管理标签页 */}
            <TabsContent value="locks" className="space-y-4">
              {data && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">活跃锁</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-green-600">
                          {data.locks.activeLocks.length}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">过期锁</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-red-600">
                          {data.locks.expiredLocks.length}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">总锁数</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {data.locks.totalLocks}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 活跃锁列表 */}
                  {data.locks.activeLocks.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          活跃锁详情
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {data.locks.activeLocks.map((lock, index) => (
                            <div key={index} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <div className="font-medium">{lock.taskId}</div>
                                <div className="text-xs text-gray-500">类型: {lock.lockType}</div>
                              </div>
                              <div className="text-right text-xs">
                                <div>获取: {formatTime(lock.acquiredAt)}</div>
                                <div>过期: {formatTime(lock.expiresAt)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* 清理操作 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">锁管理操作</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleOperation('cleanup_locks')}
                          disabled={operating}
                          variant="outline"
                          size="sm"
                        >
                          清理过期锁
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* 配置标签页 */}
            <TabsContent value="config" className="space-y-4">
              {data && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">总配置项</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {data.config.totalSettings}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">自定义配置</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">
                          {data.config.customizedSettings}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">默认配置</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-gray-600">
                          {data.config.defaultSettings}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">配置信息</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span>最后更新:</span>
                        <span>{data.config.lastUpdated ? formatTime(data.config.lastUpdated) : '从未更新'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>自定义比例:</span>
                        <span>{((data.config.customizedSettings / data.config.totalSettings) * 100).toFixed(1)}%</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* 配置操作 */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">配置管理</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => {
                            const config = configManager.exportConfig();
                            const blob = new Blob([config], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `tmdb-helper-config-${new Date().toISOString().split('T')[0]}.json`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }}
                          variant="outline"
                          size="sm"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          导出配置
                        </Button>
                        
                        <Button 
                          onClick={() => {
                            if (confirm('确定要重置所有配置为默认值吗？此操作不可撤销。')) {
                              configManager.resetToDefault();
                              fetchData();
                            }
                          }}
                          variant="outline"
                          size="sm"
                        >
                          重置配置
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}