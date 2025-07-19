'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Save, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle,
  Info
} from 'lucide-react';

interface ConflictConfig {
  conflictDetection: {
    enabled: boolean;
    conflictWindowMs: number;
    maxAdjustments: number;
    adjustmentIntervalMs: number;
    strictMode: boolean;
    considerPriority: boolean;
    considerTaskType: boolean;
  };
  conflictResolution: {
    enabled: boolean;
    defaultStrategy: 'stagger' | 'queue' | 'priority' | 'hybrid';
    staggerIntervalMs: number;
    maxStaggerAttempts: number;
    queueEnabled: boolean;
    priorityWeights: Record<string, number>;
    adaptiveAdjustment: boolean;
  };
}

export function ConflictResolutionConfig() {
  const [config, setConfig] = useState<ConflictConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // 加载配置
  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const { advancedConfigManager } = await import('@/lib/task-scheduler-config');
      const fullConfig = advancedConfigManager.getConfig();
      
      setConfig({
        conflictDetection: fullConfig.conflictDetection,
        conflictResolution: fullConfig.conflictResolution
      });
    } catch (error) {
      console.error('加载配置失败:', error);
      setSaveMessage({ type: 'error', message: '加载配置失败' });
    } finally {
      setIsLoading(false);
    }
  };

  // 保存配置
  const saveConfig = async () => {
    if (!config) return;

    try {
      setIsSaving(true);
      const { advancedConfigManager } = await import('@/lib/task-scheduler-config');
      const { taskScheduler } = await import('@/lib/scheduler');
      
      // 更新配置
      advancedConfigManager.updateConfig(config);
      taskScheduler.updateConflictConfig(config);
      
      setSaveMessage({ type: 'success', message: '配置保存成功' });
      
      // 3秒后清除消息
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      console.error('保存配置失败:', error);
      setSaveMessage({ type: 'error', message: '保存配置失败' });
    } finally {
      setIsSaving(false);
    }
  };

  // 重置为默认配置
  const resetToDefaults = async () => {
    try {
      const { advancedConfigManager } = await import('@/lib/task-scheduler-config');
      advancedConfigManager.resetToDefaults();
      await loadConfig();
      setSaveMessage({ type: 'success', message: '已重置为默认配置' });
    } catch (error) {
      console.error('重置配置失败:', error);
      setSaveMessage({ type: 'error', message: '重置配置失败' });
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const updateConfig = (section: keyof ConflictConfig, key: string, value: any) => {
    if (!config) return;
    
    setConfig(prev => ({
      ...prev!,
      [section]: {
        ...prev![section],
        [key]: value
      }
    }));
  };

  const updatePriorityWeight = (priority: string, weight: number) => {
    if (!config) return;
    
    setConfig(prev => ({
      ...prev!,
      conflictResolution: {
        ...prev!.conflictResolution,
        priorityWeights: {
          ...prev!.conflictResolution.priorityWeights,
          [priority]: weight
        }
      }
    }));
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 animate-spin" />
            加载配置中...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!config) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>无法加载配置数据</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          冲突解决配置
        </h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-1" />
            重置默认
          </Button>
          <Button onClick={saveConfig} disabled={isSaving}>
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? '保存中...' : '保存配置'}
          </Button>
        </div>
      </div>

      {saveMessage && (
        <Alert>
          {saveMessage.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          <AlertDescription>{saveMessage.message}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="detection" className="space-y-4">
        <TabsList>
          <TabsTrigger value="detection">冲突检测</TabsTrigger>
          <TabsTrigger value="resolution">冲突解决</TabsTrigger>
          <TabsTrigger value="advanced">高级设置</TabsTrigger>
        </TabsList>

        <TabsContent value="detection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>冲突检测设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>启用冲突检测</Label>
                  <p className="text-sm text-muted-foreground">
                    自动检测任务时间冲突
                  </p>
                </div>
                <Switch
                  checked={config.conflictDetection.enabled}
                  onCheckedChange={(checked) => updateConfig('conflictDetection', 'enabled', checked)}
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>冲突检测时间窗口 (毫秒)</Label>
                  <Input
                    type="number"
                    value={config.conflictDetection.conflictWindowMs}
                    onChange={(e) => updateConfig('conflictDetection', 'conflictWindowMs', parseInt(e.target.value))}
                    min="1000"
                    max="300000"
                  />
                  <p className="text-xs text-muted-foreground">
                    检测冲突的时间范围，建议 30000-120000ms
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>调整间隔 (毫秒)</Label>
                  <Input
                    type="number"
                    value={config.conflictDetection.adjustmentIntervalMs}
                    onChange={(e) => updateConfig('conflictDetection', 'adjustmentIntervalMs', parseInt(e.target.value))}
                    min="5000"
                    max="300000"
                  />
                  <p className="text-xs text-muted-foreground">
                    时间调整的最小间隔
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>严格模式</Label>
                    <p className="text-sm text-muted-foreground">
                      使用更小的时间窗口进行检测
                    </p>
                  </div>
                  <Switch
                    checked={config.conflictDetection.strictMode}
                    onCheckedChange={(checked) => updateConfig('conflictDetection', 'strictMode', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>考虑任务优先级</Label>
                    <p className="text-sm text-muted-foreground">
                      在冲突检测时考虑任务优先级
                    </p>
                  </div>
                  <Switch
                    checked={config.conflictDetection.considerPriority}
                    onCheckedChange={(checked) => updateConfig('conflictDetection', 'considerPriority', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>考虑任务类型</Label>
                    <p className="text-sm text-muted-foreground">
                      检测相同类型任务的资源冲突
                    </p>
                  </div>
                  <Switch
                    checked={config.conflictDetection.considerTaskType}
                    onCheckedChange={(checked) => updateConfig('conflictDetection', 'considerTaskType', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resolution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>冲突解决设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>启用冲突解决</Label>
                  <p className="text-sm text-muted-foreground">
                    自动解决检测到的冲突
                  </p>
                </div>
                <Switch
                  checked={config.conflictResolution.enabled}
                  onCheckedChange={(checked) => updateConfig('conflictResolution', 'enabled', checked)}
                />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>默认解决策略</Label>
                <Select
                  value={config.conflictResolution.defaultStrategy}
                  onValueChange={(value) => updateConfig('conflictResolution', 'defaultStrategy', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stagger">时间错开</SelectItem>
                    <SelectItem value="queue">队列执行</SelectItem>
                    <SelectItem value="priority">优先级调整</SelectItem>
                    <SelectItem value="hybrid">混合策略</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  推荐使用混合策略以获得最佳效果
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>错开时间间隔 (毫秒)</Label>
                  <Input
                    type="number"
                    value={config.conflictResolution.staggerIntervalMs}
                    onChange={(e) => updateConfig('conflictResolution', 'staggerIntervalMs', parseInt(e.target.value))}
                    min="5000"
                    max="300000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>最大错开尝试次数</Label>
                  <Input
                    type="number"
                    value={config.conflictResolution.maxStaggerAttempts}
                    onChange={(e) => updateConfig('conflictResolution', 'maxStaggerAttempts', parseInt(e.target.value))}
                    min="1"
                    max="20"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>启用队列策略</Label>
                  <p className="text-sm text-muted-foreground">
                    允许将冲突任务加入执行队列
                  </p>
                </div>
                <Switch
                  checked={config.conflictResolution.queueEnabled}
                  onCheckedChange={(checked) => updateConfig('conflictResolution', 'queueEnabled', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>自适应调整</Label>
                  <p className="text-sm text-muted-foreground">
                    根据系统负载自动调整解决策略
                  </p>
                </div>
                <Switch
                  checked={config.conflictResolution.adaptiveAdjustment}
                  onCheckedChange={(checked) => updateConfig('conflictResolution', 'adaptiveAdjustment', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>优先级权重设置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(config.conflictResolution.priorityWeights).map(([priority, weight]) => (
                <div key={priority} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {priority === 'urgent' ? '紧急' : 
                       priority === 'high' ? '高' : 
                       priority === 'normal' ? '普通' : 
                       priority === 'low' ? '低' : priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={weight}
                      onChange={(e) => updatePriorityWeight(priority, parseInt(e.target.value))}
                      min="1"
                      max="10"
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">权重</span>
                  </div>
                </div>
              ))}
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  权重越高的任务在冲突解决时优先级越高。建议保持默认设置。
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
