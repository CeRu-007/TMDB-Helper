import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  ModelServiceConfig,
  ModelConfig,
  ModelProvider,
  UsageScenario,
} from '@/shared/types/model-service';
import { logger } from '@/lib/utils/logger';

interface ModelServiceContextType {
  config: ModelServiceConfig | null;
  isLoading: boolean;
  error: string | null;
  refreshConfig: () => Promise<void>;
  getScenarioModels: (scenarioType: string) => {
    scenario: UsageScenario | null;
    models: ModelConfig[];
    providers: ModelProvider[];
  };
  updateScenario: (
    scenarioType: string,
    selectedModelIds: string[],
    primaryModelId: string
  ) => Promise<void>;
}

const ModelServiceContext = createContext<ModelServiceContextType | undefined>(undefined);

export function useModelService() {
  const context = useContext(ModelServiceContext);
  if (!context) {
    throw new Error('useModelService must be used within ModelServiceProvider');
  }
  return context;
}

interface ModelServiceProviderProps {
  children: ReactNode;
}

export function ModelServiceProvider({ children }: ModelServiceProviderProps) {
  const [config, setConfig] = useState<ModelServiceConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/model-service');
      const data = await response.json();

      if (data.success && data.config) {
        setConfig(data.config);
      } else {
        throw new Error(data.error || '获取配置失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshConfig = async () => {
    await loadConfig();
  };

  const getScenarioModels = (scenarioType: string) => {
    if (!config) {
      return { scenario: null, models: [], providers: [] };
    }

    const scenario = config.scenarios.find((s) => s.type === scenarioType) || null;
    if (!scenario) {
      return { scenario: null, models: [], providers: [] };
    }

    // Filter valid model IDs
    const validModelIds =
      scenario.selectedModelIds?.filter((modelId) =>
        config.models.some((model) => model.id === modelId)
      ) || [];

    // Auto-cleanup invalid references
    if (scenario.selectedModelIds && scenario.selectedModelIds.length !== validModelIds.length) {
      logger.warn(`[ModelService] 场景 ${scenarioType} 包含无效模型引用，自动清理中`);
      cleanupInvalidScenarioReferences(scenarioType, validModelIds);
    }

    if (validModelIds.length === 0) {
      return { scenario, models: [], providers: [] };
    }

    const models = config.models.filter((model) => validModelIds.includes(model.id));
    const providerIds = [...new Set(models.map((m) => m.providerId))];
    const providers = config.providers.filter((provider) => providerIds.includes(provider.id));

    return { scenario, models, providers };
  };

  // Extracted cleanup logic for better separation of concerns
  const cleanupInvalidScenarioReferences = async (
    scenarioType: string,
    validModelIds: string[]
  ) => {
    const updatedScenarios = config!.scenarios.map((s) => {
      if (s.type === scenarioType) {
        return {
          ...s,
          selectedModelIds: validModelIds,
          primaryModelId: validModelIds.includes(s.primaryModelId || '')
            ? s.primaryModelId
            : validModelIds[0] || '',
        };
      }
      return s;
    });

    try {
      const response = await fetch('/api/model-service', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-scenarios',
          data: updatedScenarios,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setConfig(result.config);
        logger.info(`[ModelService] 场景 ${scenarioType} 无效引用已清理`);
        window.dispatchEvent(new CustomEvent('model-service-config-updated'));
      }
    } catch (error) {
      logger.error('[ModelService] 自动清理失败:', error);
    }
  };

  const updateScenario = async (
    scenarioType: string,
    selectedModelIds: string[],
    primaryModelId: string
  ) => {
    if (!config) {
      return;
    }

    const updatedScenarios = config.scenarios.map((scenario) => {
      if (scenario.type === scenarioType) {
        return {
          ...scenario,
          selectedModelIds,
          primaryModelId,
        };
      }
      return scenario;
    });

    const response = await fetch('/api/model-service', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update-scenarios',
        data: updatedScenarios,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      if (result.success) {
        setConfig(result.config);

        // 触发全局配置更新事件
        window.dispatchEvent(new CustomEvent('model-service-config-updated'));
      }
    }
  };

  useEffect(() => {
    loadConfig();

    // 监听模型服务配置更新事件
    const handleConfigUpdate = () => {
      logger.info('🔄 [ModelService] 配置更新事件触发，重新加载配置');
      loadConfig();
    };

    window.addEventListener('model-service-config-updated', handleConfigUpdate);

    return () => {
      window.removeEventListener('model-service-config-updated', handleConfigUpdate);
    };
  }, []);

  const value: ModelServiceContextType = {
    config,
    isLoading,
    error,
    refreshConfig,
    getScenarioModels,
    updateScenario,
  };

  return <ModelServiceContext.Provider value={value}>{children}</ModelServiceContext.Provider>;
}
