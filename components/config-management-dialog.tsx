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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { 
  Settings,
  Download,
  Upload,
  RotateCcw,
  Save,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Shield,
  Database,
  Bug
} from 'lucide-react';
import { configManager, TaskSchedulerConfig } from '@/lib/config-manager';
import { toast } from '@/components/ui/use-toast';

interface ConfigManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConfigManagementDialog({ open, onOpenChange }: ConfigManagementDialogProps) {
  const [config, setConfig] = useState<TaskSchedulerConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<TaskSchedulerConfig | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);

  // 加载配置
  useEffect(() => {
    if (open) {
      const currentConfig = configManager.getConfig();
      setConfig(currentConfig);
      setOriginalConfig(currentConfig);
      setHasChanges(false);
    }
  }, [open]);

  // 检查是否有更改
  useEffect(() => {
    if (config && originalConfig) {
      const changed = JSON.stringify(config) !== JSON.stringify(originalConfig);
      setHasChanges(changed);
    }
  }, [config, originalConfig]);

  const handleConfigChange = (key: keyof TaskSchedulerConfig, value: any) => {
    if (!config) return;
    
    setConfig({
      ...config,
      [key]: value
    });
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    try {
      configManager.updateConfig(config);
      setOriginalConfig(config);
      setHasChanges(false);
      
      toast({
        title: "配置已保存",
        description: "配置更改已成功保存并生效",
      });
    } catch (error) {
      console.error('保存配置失败:', error);
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : "保存配置时出现错误",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!originalConfig) return;
    
    setConfig(originalConfig);
    setHasChanges(false);
  };

  const handleResetToDefault = () => {
    if (confirm('确定要重置所有配置为默认值吗？此操作不可撤销。')) {
      try {
        configManager.resetToDefault();
        const defaultConfig = configManager.getConfig();
        setConfig(defaultConfig);
        setOriginalConfig(defaultConfig);
        setHasChanges(false);
        
        toast({
          title: "配置已重置",
          description: "所有配置已重置为默认值",
        });
      } catch (error) {
        console.error('重置配置失败:', error);
        toast({
          title: "重置失败",
          description: "重置配置时出现错误",
          variant: "destructive"
        });
      }
    }
  };

  const handleExport = () => {
    try {
      const configJson = configManager.exportConfig();
      const blob = new Blob([configJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tmdb-helper-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "配置已导出",
        description: "配置文件已下载到本地",
      });
    } catch (error) {
      console.error('导出配置失败:', error);
      toast({
        title: "导出失败",
        description: "导出配置时出现错误",
        variant: "destructive"
      });
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setImporting(true);
      try {
        const text = await file.text();
        configManager.importConfig(text);
        
        const newConfig = configManager.getConfig();
        setConfig(newConfig);
        setOriginalConfig(newConfig);
        setHasChanges(false);
        
        toast({
          title: "配置已导入",
          description: "配置文件已成功导入并应用",
        });
      } catch (error) {
        console.error('导入配置失败:', error);
        toast({
          title: "导入失败",
          description: error instanceof Error ? error.message : "导入配置时出现错误",
          variant: "destructive"
        });
      } finally {
        setImporting(false);
      }
    };
    input.click();
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}min`;
    return `${(ms / 3600000).toFixed(1)}h`;
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  if (!config) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            配置管理
          </DialogTitle>
          <DialogDescription>
            管理定时任务系统的运行时配置参数
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 操作按钮 */}
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={handleSave}
              disabled={!hasChanges || saving}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? '保存中...' : '保存配置'}
            </Button>
            
            <Button 
              onClick={handleReset}
              disabled={!hasChanges}
              variant="outline"
              size="sm"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              撤销更改
            </Button>

            <Button 
              onClick={handleExport}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              导出配置
            </Button>

            <Button 
              onClick={handleImport}
              disabled={importing}
              variant="outline"
              size="sm"
            >
              <Upload className="h-4 w-4 mr-2" />
              {importing ? '导入中...' : '导入配置'}
            </Button>

            <Button 
              onClick={handleResetToDefault}
              variant="destructive"
              size="sm"
            >
              重置为默认
            </Button>
          </div>

          {/* 更改提示 */}
          {hasChanges && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                您有未保存的配置更改。请保存后生效，或撤销更改。
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="intervals" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="intervals">时间间隔</TabsTrigger>
              <TabsTrigger value="timeouts">超时设置</TabsTrigger>
              <TabsTrigger value="retry">重试配置</TabsTrigger>
              <TabsTrigger value="storage">存储配置</TabsTrigger>
              <TabsTrigger value="debug">调试选项</TabsTrigger>
              <TabsTrigger value="security">安全设置</TabsTrigger>
            </TabsList>

            {/* 时间间隔配置 */}
            <TabsContent value="intervals" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    时间间隔配置
                  </CardTitle>
                  <CardDescription>
                    配置各种定期检查和同步的时间间隔
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>同步间隔</Label>
                      <div className="space-y-2">
                        <Slider
                          value={[config.syncInterval / 60000]}
                          onValueChange={([value]) => handleConfigChange('syncInterval', value * 60000)}
                          min={1}
                          max={60}
                          step={1}
                          className="w-full"
                        />
                        <div className="text-sm text-gray-500">
                          当前值: {formatTime(config.syncInterval)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>验证间隔</Label>
                      <div className="space-y-2">
                        <Slider
                          value={[config.validationInterval / 60000]}
                          onValueChange={([value]) => handleConfigChange('validationInterval', value * 60000)}
                          min={5}
                          max={240}
                          step={5}
                          className="w-full"
                        />
                        <div className="text-sm text-gray-500">
                          当前值: {formatTime(config.validationInterval)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>错过任务检查间隔</Label>
                      <div className="space-y-2">
                        <Slider
                          value={[config.missedTaskCheckInterval / 60000]}
                          onValueChange={([value]) => handleConfigChange('missedTaskCheckInterval', value * 60000)}
                          min={1}
                          max={60}
                          step={1}
                          className="w-full"
                        />
                        <div className="text-sm text-gray-500">
                          当前值: {formatTime(config.missedTaskCheckInterval)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>清理间隔</Label>
                      <div className="space-y-2">
                        <Slider
                          value={[config.cleanupInterval / 60000]}
                          onValueChange={([value]) => handleConfigChange('cleanupInterval', value * 60000)}
                          min={10}
                          max={480}
                          step={10}
                          className="w-full"
                        />
                        <div className="text-sm text-gray-500">
                          当前值: {formatTime(config.cleanupInterval)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 超时设置 */}
            <TabsContent value="timeouts" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    超时设置
                  </CardTitle>
                  <CardDescription>
                    配置各种操作的超时时间
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>任务执行超时</Label>
                      <div className="space-y-2">
                        <Slider
                          value={[config.taskExecutionTimeout / 60000]}
                          onValueChange={([value]) => handleConfigChange('taskExecutionTimeout', value * 60000)}
                          min={1}
                          max={30}
                          step={1}
                          className="w-full"
                        />
                        <div className="text-sm text-gray-500">
                          当前值: {formatTime(config.taskExecutionTimeout)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>锁超时时间</Label>
                      <div className="space-y-2">
                        <Slider
                          value={[config.lockTimeout / 60000]}
                          onValueChange={([value]) => handleConfigChange('lockTimeout', value * 60000)}
                          min={0.5}
                          max={15}
                          step={0.5}
                          className="w-full"
                        />
                        <div className="text-sm text-gray-500">
                          当前值: {formatTime(config.lockTimeout)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>API请求超时</Label>
                      <div className="space-y-2">
                        <Slider
                          value={[config.apiTimeout / 1000]}
                          onValueChange={([value]) => handleConfigChange('apiTimeout', value * 1000)}
                          min={10}
                          max={300}
                          step={10}
                          className="w-full"
                        />
                        <div className="text-sm text-gray-500">
                          当前值: {formatTime(config.apiTimeout)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>最小执行延迟</Label>
                      <div className="space-y-2">
                        <Slider
                          value={[config.minExecutionDelay / 1000]}
                          onValueChange={([value]) => handleConfigChange('minExecutionDelay', value * 1000)}
                          min={1}
                          max={60}
                          step={1}
                          className="w-full"
                        />
                        <div className="text-sm text-gray-500">
                          当前值: {formatTime(config.minExecutionDelay)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 重试配置 */}
            <TabsContent value="retry" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">重试配置</CardTitle>
                  <CardDescription>
                    配置任务失败时的重试策略
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>最大重试次数</Label>
                      <div className="space-y-2">
                        <Slider
                          value={[config.maxRetries]}
                          onValueChange={([value]) => handleConfigChange('maxRetries', value)}
                          min={0}
                          max={10}
                          step={1}
                          className="w-full"
                        />
                        <div className="text-sm text-gray-500">
                          当前值: {config.maxRetries} 次
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>重试延迟</Label>
                      <div className="space-y-2">
                        <Slider
                          value={[config.retryDelay / 1000]}
                          onValueChange={([value]) => handleConfigChange('retryDelay', value * 1000)}
                          min={1}
                          max={60}
                          step={1}
                          className="w-full"
                        />
                        <div className="text-sm text-gray-500">
                          当前值: {formatTime(config.retryDelay)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>退避乘数</Label>
                      <div className="space-y-2">
                        <Slider
                          value={[config.backoffMultiplier * 10]}
                          onValueChange={([value]) => handleConfigChange('backoffMultiplier', value / 10)}
                          min={10}
                          max={50}
                          step={1}
                          className="w-full"
                        />
                        <div className="text-sm text-gray-500">
                          当前值: {config.backoffMultiplier}x
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>错过任务补偿窗口</Label>
                      <div className="space-y-2">
                        <Slider
                          value={[config.missedTaskWindow / (60 * 60 * 1000)]}
                          onValueChange={([value]) => handleConfigChange('missedTaskWindow', value * 60 * 60 * 1000)}
                          min={1}
                          max={72}
                          step={1}
                          className="w-full"
                        />
                        <div className="text-sm text-gray-500">
                          当前值: {config.missedTaskWindow / (60 * 60 * 1000)} 小时
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 存储配置 */}
            <TabsContent value="storage" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    存储配置
                  </CardTitle>
                  <CardDescription>
                    配置数据存储和保留策略
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>存储配额</Label>
                      <div className="space-y-2">
                        <Slider
                          value={[config.storageQuota / (1024 * 1024)]}
                          onValueChange={([value]) => handleConfigChange('storageQuota', value * 1024 * 1024)}
                          min={1}
                          max={200}
                          step={1}
                          className="w-full"
                        />
                        <div className="text-sm text-gray-500">
                          当前值: {formatSize(config.storageQuota)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>最大日志条目数</Label>
                      <div className="space-y-2">
                        <Slider
                          value={[config.maxLogEntries]}
                          onValueChange={([value]) => handleConfigChange('maxLogEntries', value)}
                          min={100}
                          max={10000}
                          step={100}
                          className="w-full"
                        />
                        <div className="text-sm text-gray-500">
                          当前值: {config.maxLogEntries.toLocaleString()} 条
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>数据保留天数</Label>
                      <div className="space-y-2">
                        <Slider
                          value={[config.dataRetentionDays]}
                          onValueChange={([value]) => handleConfigChange('dataRetentionDays', value)}
                          min={1}
                          max={365}
                          step={1}
                          className="w-full"
                        />
                        <div className="text-sm text-gray-500">
                          当前值: {config.dataRetentionDays} 天
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 调试选项 */}
            <TabsContent value="debug" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Bug className="h-4 w-4" />
                    调试选项
                  </CardTitle>
                  <CardDescription>
                    配置调试和监控功能
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>启用调试日志</Label>
                        <div className="text-sm text-gray-500">
                          输出详细的调试信息到控制台
                        </div>
                      </div>
                      <Switch
                        checked={config.enableDebugLogs}
                        onCheckedChange={(checked) => handleConfigChange('enableDebugLogs', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>启用性能监控</Label>
                        <div className="text-sm text-gray-500">
                          收集和分析系统性能数据
                        </div>
                      </div>
                      <Switch
                        checked={config.enablePerformanceMonitoring}
                        onCheckedChange={(checked) => handleConfigChange('enablePerformanceMonitoring', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>启用错误报告</Label>
                        <div className="text-sm text-gray-500">
                          自动收集和报告错误信息
                        </div>
                      </div>
                      <Switch
                        checked={config.enableErrorReporting}
                        onCheckedChange={(checked) => handleConfigChange('enableErrorReporting', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 安全设置 */}
            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    安全设置
                  </CardTitle>
                  <CardDescription>
                    配置安全和并发控制选项
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>启用并发控制</Label>
                        <div className="text-sm text-gray-500">
                          使用分布式锁防止任务重复执行
                        </div>
                      </div>
                      <Switch
                        checked={config.enableConcurrencyControl}
                        onCheckedChange={(checked) => handleConfigChange('enableConcurrencyControl', checked)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>最大并发任务数</Label>
                      <div className="space-y-2">
                        <Slider
                          value={[config.maxConcurrentTasks]}
                          onValueChange={([value]) => handleConfigChange('maxConcurrentTasks', value)}
                          min={1}
                          max={10}
                          step={1}
                          className="w-full"
                        />
                        <div className="text-sm text-gray-500">
                          当前值: {config.maxConcurrentTasks} 个
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>启用数据验证</Label>
                        <div className="text-sm text-gray-500">
                          在处理前验证所有输入数据
                        </div>
                      </div>
                      <Switch
                        checked={config.enableDataValidation}
                        onCheckedChange={(checked) => handleConfigChange('enableDataValidation', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          {hasChanges && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : '保存配置'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}