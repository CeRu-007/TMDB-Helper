'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  Server,
  Wifi
} from 'lucide-react';

interface ApiEndpoint {
  url: string;
  status: number;
  responseTime: number;
  error?: string;
}

interface ApiHealthStatus {
  healthy: boolean;
  endpoints: ApiEndpoint[];
  timestamp: number;
}

export function ApiHealthMonitor() {
  const [healthStatus, setHealthStatus] = useState<ApiHealthStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // 检查 API 健康状态
  const checkApiHealth = async () => {
    try {
      setIsLoading(true);
      
      const { dataConsistencyValidator } = await import('@/lib/data-consistency-validator');
      const health = await dataConsistencyValidator.checkApiHealth();
      
      setHealthStatus(health);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('API 健康检查失败:', error);
      
      // 设置错误状态
      setHealthStatus({
        healthy: false,
        endpoints: [],
        timestamp: Date.now()
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkApiHealth();
    
    // 每30秒自动检查一次
    const interval = setInterval(checkApiHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: number) => {
    if (status === 200) return 'default';
    if (status >= 400 && status < 500) return 'destructive';
    if (status >= 500) return 'destructive';
    return 'secondary';
  };

  const getStatusIcon = (status: number) => {
    if (status === 200) return <CheckCircle className="h-3 w-3" />;
    if (status === 0) return <XCircle className="h-3 w-3" />;
    if (status >= 400) return <AlertTriangle className="h-3 w-3" />;
    return <Clock className="h-3 w-3" />;
  };

  const getResponseTimeColor = (responseTime: number) => {
    if (responseTime < 500) return 'text-green-600';
    if (responseTime < 1000) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (isLoading && !healthStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            检查 API 健康状态...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Server className="h-5 w-5" />
          API 健康监控
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            最后检查: {lastUpdate.toLocaleTimeString('zh-CN')}
          </span>
          <Button variant="outline" size="sm" onClick={checkApiHealth}>
            <RefreshCw className="h-4 w-4 mr-1" />
            刷新
          </Button>
        </div>
      </div>

      {healthStatus && (
        <>
          {/* 总体状态 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  {healthStatus.healthy ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  API 服务状态
                </span>
                <Badge variant={healthStatus.healthy ? 'default' : 'destructive'}>
                  {healthStatus.healthy ? '正常' : '异常'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!healthStatus.healthy && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    检测到 API 服务异常。数据一致性验证功能可能受到影响。
                    请检查网络连接或联系技术支持。
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* 端点详情 */}
          <Card>
            <CardHeader>
              <CardTitle>API 端点状态</CardTitle>
            </CardHeader>
            <CardContent>
              {healthStatus.endpoints.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  没有可用的端点信息
                </p>
              ) : (
                <div className="space-y-3">
                  {healthStatus.endpoints.map((endpoint, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(endpoint.status)}
                        <div>
                          <div className="font-medium">{endpoint.url}</div>
                          {endpoint.error && (
                            <div className="text-sm text-destructive">
                              {endpoint.error}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge variant={getStatusColor(endpoint.status) as any}>
                          {endpoint.status === 0 ? '连接失败' : 
                           endpoint.status === 200 ? '正常' :
                           `HTTP ${endpoint.status}`}
                        </Badge>
                        
                        {endpoint.responseTime > 0 && (
                          <span className={`text-sm ${getResponseTimeColor(endpoint.responseTime)}`}>
                            {endpoint.responseTime}ms
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 性能指标 */}
          <Card>
            <CardHeader>
              <CardTitle>性能指标</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* 可用性 */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>API 可用性</span>
                    <span>
                      {healthStatus.endpoints.length > 0 ? 
                        `${Math.round((healthStatus.endpoints.filter(e => e.status === 200).length / healthStatus.endpoints.length) * 100)}%` : 
                        '0%'}
                    </span>
                  </div>
                  <Progress 
                    value={healthStatus.endpoints.length > 0 ? 
                      (healthStatus.endpoints.filter(e => e.status === 200).length / healthStatus.endpoints.length) * 100 : 
                      0} 
                    className="h-2" 
                  />
                </div>

                {/* 平均响应时间 */}
                {healthStatus.endpoints.length > 0 && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>平均响应时间</span>
                      <span className={getResponseTimeColor(
                        healthStatus.endpoints
                          .filter(e => e.responseTime > 0)
                          .reduce((sum, e) => sum + e.responseTime, 0) / 
                        Math.max(1, healthStatus.endpoints.filter(e => e.responseTime > 0).length)
                      )}>
                        {Math.round(
                          healthStatus.endpoints
                            .filter(e => e.responseTime > 0)
                            .reduce((sum, e) => sum + e.responseTime, 0) / 
                          Math.max(1, healthStatus.endpoints.filter(e => e.responseTime > 0).length)
                        )}ms
                      </span>
                    </div>
                    <Progress 
                      value={Math.min(100, 
                        (1000 - Math.min(1000, 
                          healthStatus.endpoints
                            .filter(e => e.responseTime > 0)
                            .reduce((sum, e) => sum + e.responseTime, 0) / 
                          Math.max(1, healthStatus.endpoints.filter(e => e.responseTime > 0).length)
                        )) / 1000 * 100
                      )} 
                      className="h-2" 
                    />
                  </div>
                )}

                {/* 连接状态 */}
                <div className="flex items-center gap-2 text-sm">
                  <Wifi className="h-4 w-4" />
                  <span>
                    网络连接: {healthStatus.healthy ? '正常' : '异常'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
