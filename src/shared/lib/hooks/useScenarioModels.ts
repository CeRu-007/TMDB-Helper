import { useMemo } from 'react'
import { useModelService } from '@/lib/contexts/ModelServiceContext'
import { ModelConfig } from '@/shared/types/model-service'

interface ScenarioModelConfig {
  selectedModelIds: string[]
  primaryModelId: string
  availableModels: ModelConfig[]
  isLoading: boolean
  error: string | null
}

export function useScenarioModels(scenarioType: string): ScenarioModelConfig & {
  getCurrentModel: () => ModelConfig | undefined
  getSelectedModels: () => ModelConfig[]
} {
  const { config, isLoading, error, getScenarioModels } = useModelService()

  const scenarioData = useMemo(() => {
    if (!config || isLoading) {
      return {
        scenario: null,
        models: [],
        providers: []
      }
    }
    return getScenarioModels(scenarioType)
  }, [config, isLoading, scenarioType, getScenarioModels])

  const result = useMemo(() => {
    const { scenario, models, providers } = scenarioData

    return {
      selectedModelIds: scenario?.selectedModelIds || [],
      primaryModelId: scenario?.primaryModelId || '',
      availableModels: models,
      isLoading,
      error,
      getCurrentModel: () => models.find(m => m.id === scenario?.primaryModelId),
      getSelectedModels: () => models.filter(m => scenario?.selectedModelIds?.includes(m.id))
    }
  }, [scenarioData, isLoading, error])

  return result
}