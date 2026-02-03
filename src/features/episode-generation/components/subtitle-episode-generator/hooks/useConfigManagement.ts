import { useState, useEffect, useCallback } from 'react'
import { GenerationConfig } from '../types'
import { SUMMARY_STYLES } from '../constants'
import { ClientConfigManager } from '@/lib/utils/client-config-manager'
import { logger } from '@/lib/utils/logger'

export function useConfigManagement() {
  const [config, setConfig] = useState<GenerationConfig>({
    model: "deepseek-ai/DeepSeek-V2.5",
    summaryLength: [20, 30],
    selectedStyles: [],
    selectedTitleStyle: "location_skill",
    temperature: 0.7,
    includeOriginalTitle: true,
    speechRecognitionModel: "FunAudioLLM/SenseVoiceSmall",
    enableVideoAnalysis: false,
    imitateConfig: {
      sampleContent: "",
      generateCount: 3
    }
  })

  const [configInitialized, setConfigInitialized] = useState(false)
  const [apiProvider, setApiProvider] = useState<'siliconflow' | 'modelscope'>('siliconflow')
  const [siliconFlowApiKey, setSiliconFlowApiKey] = useState('')
  const [modelScopeApiKey, setModelScopeApiKey] = useState('')

  // 初始化配置加载
  useEffect(() => {
    (async () => {
      try {
        // 从新的模型服务系统加载场景配置
        let episodeGenerationModel = 'deepseek-ai/DeepSeek-V2.5' // 默认模型
        let speechRecognitionModel = 'FunAudioLLM/SenseVoiceSmall' // 默认语音识别模型
        
        try {
          // 加载分集生成模型配置
          const episodeResponse = await fetch('/api/model-service/scenario?scenario=episode_generation')
          const episodeResult = await episodeResponse.json()
          
          if (episodeResult.success && episodeResult.scenario && episodeResult.scenario.primaryModelId) {
            episodeGenerationModel = episodeResult.scenario.primaryModelId
          }

          // 加载语音转文字模型配置
          const speechResponse = await fetch('/api/model-service/scenario?scenario=speech_to_text')
          const speechResult = await speechResponse.json()

          if (speechResult.success && speechResult.scenario && speechResult.scenario.primaryModelId) {
            speechRecognitionModel = speechResult.scenario.primaryModelId
          }
        } catch (error) {
          logger.warn('🔧 [配置加载] 从模型服务系统加载模型失败:', error)
        }
        
        // 兼容旧的配置存储方式
        const provider = (await ClientConfigManager.getItem('episode_generator_api_provider')) || 'siliconflow'
        const settingsKey = provider === 'siliconflow' ? 'siliconflow_api_settings' : 'modelscope_api_settings'
        const settingsText = await ClientConfigManager.getItem(settingsKey)
        
        // 如果新系统没有配置，则尝试从旧系统加载
        if (episodeGenerationModel === 'deepseek-ai/DeepSeek-V2.5') {
          if (settingsText) {
            try { 
              const s = JSON.parse(settingsText)
              if (s.episodeGenerationModel) episodeGenerationModel = s.episodeGenerationModel 
            } catch {}
          }
        }
        
        const saved = await ClientConfigManager.getItem('episode_generator_config')

        if (saved) {
          try {
            const parsed = JSON.parse(saved)
            
            // 处理标题风格的兼容性
            if (parsed.selectedTitleStyles && Array.isArray(parsed.selectedTitleStyles)) {
              parsed.selectedTitleStyle = parsed.selectedTitleStyles[0] || 'location_skill'
              delete parsed.selectedTitleStyles
            } else if (!parsed.selectedTitleStyle) {
              parsed.selectedTitleStyle = 'location_skill'
            }
            
            // 处理简介风格的兼容性
            if (parsed.selectedStyles && Array.isArray(parsed.selectedStyles)) {
              const validStyleIds = SUMMARY_STYLES.map(s => s.id)
              parsed.selectedStyles = parsed.selectedStyles.filter((id: string) => validStyleIds.includes(id))
            } else {
              parsed.selectedStyles = []
            }
            
            // 确保所有必要字段都存在
            const completeConfig = {
              model: episodeGenerationModel,
              summaryLength: parsed.summaryLength || [20, 30],
              selectedStyles: parsed.selectedStyles || [],
              selectedTitleStyle: parsed.selectedTitleStyle || 'location_skill',
              temperature: parsed.temperature || 0.7,
              includeOriginalTitle: parsed.includeOriginalTitle !== undefined ? parsed.includeOriginalTitle : true,
              speechRecognitionModel: parsed.speechRecognitionModel || speechRecognitionModel,
              enableVideoAnalysis: parsed.enableVideoAnalysis || false,
              imitateConfig: parsed.imitateConfig || {
                sampleContent: "",
                generateCount: 3
              }
            }

            setConfig(completeConfig)
          } catch (e) {
            logger.error('🔧 [配置加载] 解析配置失败:', e)
            setConfig(prev => ({ ...prev, model: episodeGenerationModel }))
          }
        } else {
          setConfig(prev => ({
            ...prev,
            model: episodeGenerationModel,
            speechRecognitionModel: speechRecognitionModel
          }))
        }

        // 标记配置已初始化
        setConfigInitialized(true)
      } catch (e) {
        logger.error('🔧 [配置加载] 加载配置时出错:', e)
        setConfigInitialized(true)
      }
    })()
  }, [])

  // 自动保存配置变更到服务端
  useEffect(() => {
    // 只有在配置初始化完成后才进行保存
    if (!configInitialized) {
      return
    }

    // 延迟保存，避免频繁保存
    const timeoutId = setTimeout(async () => {
      try {
        // 排除模型字段，因为模型是从全局设置中获取的
        const { model, ...configWithoutModel } = config
        const configJson = JSON.stringify(configWithoutModel)

        // 使用 ClientConfigManager 保存配置
        await ClientConfigManager.setItem('episode_generator_config', configJson)
      } catch (error) {
        logger.error('保存配置时出错:', error)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [config, configInitialized])

  // 从全局设置加载API密钥
  const loadGlobalSettings = useCallback(async () => {
    // 加载硅基流动设置
    const globalSiliconFlowSettings = await ClientConfigManager.getItem('siliconflow_api_settings')
    if (globalSiliconFlowSettings) {
      try {
        const settings = JSON.parse(globalSiliconFlowSettings)
        setSiliconFlowApiKey(settings.apiKey || '')
      } catch (error) {
        logger.error('解析硅基流动设置失败:', error)
      }
    } else {
      // 兼容旧的设置
      const savedApiKey = await ClientConfigManager.getItem('siliconflow_api_key')
      if (savedApiKey) {
        setSiliconFlowApiKey(savedApiKey)
      }
    }

    // 加载魔搭社区设置
    const globalModelScopeSettings = await ClientConfigManager.getItem('modelscope_api_settings')
    if (globalModelScopeSettings) {
      try {
        const settings = JSON.parse(globalModelScopeSettings)
        setModelScopeApiKey(settings.apiKey || '')
      } catch (error) {
        logger.error('解析魔搭社区设置失败:', error)
      }
    } else {
      // 兼容旧的设置
      const savedApiKey = await ClientConfigManager.getItem('modelscope_api_key')
      if (savedApiKey) {
        setModelScopeApiKey(savedApiKey)
      }
    }

    // 加载API提供商偏好设置
    const savedProvider = await ClientConfigManager.getItem('episode_generator_api_provider')
    if (savedProvider && (savedProvider === 'siliconflow' || savedProvider === 'modelscope')) {
      setApiProvider(savedProvider)
    }
  }, [])

  // 当API提供商切换时，更新模型配置
  useEffect(() => {
    const updateModelForProvider = async () => {
      const settingsKey = apiProvider === 'siliconflow' ? 'siliconflow_api_settings' : 'modelscope_api_settings'
      let newModel = apiProvider === 'siliconflow' ? 'deepseek-ai/DeepSeek-V2.5' : 'Qwen/Qwen3-32B';

      try {
        const globalSettings = await ClientConfigManager.getItem(settingsKey)
        if (globalSettings) {
          const settings = JSON.parse(globalSettings)
          if (settings.episodeGenerationModel) {
            newModel = settings.episodeGenerationModel
          }
        }
      } catch (e) {
        logger.error('更新模型配置失败:', e)
      }
      
      setConfig(prev => ({ ...prev, model: newModel }))
    }

    updateModelForProvider()
  }, [apiProvider])

  // 初始加载配置
  useEffect(() => {
    loadGlobalSettings()
  }, [loadGlobalSettings])

  // 监听全局设置变化
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'siliconflow_api_settings' || e.key === 'modelscope_api_settings') {
        logger.info('检测到API设置变化，重新加载')
        loadGlobalSettings()
      }
    }

    // 服务端存储不触发 storage 事件，这里仅保留自定义事件监听

    // 监听自定义事件（用于同一页面内的设置变化）
    const handleCustomSettingsChange = () => {
      logger.info('检测到自定义设置变化事件')
      loadGlobalSettings()
    }
    window.addEventListener('siliconflow-settings-changed', handleCustomSettingsChange)
    window.addEventListener('modelscope-settings-changed', handleCustomSettingsChange)

    // 监听全局设置对话框关闭事件
    const handleGlobalSettingsClose = (shouldReopenSettingsDialog: boolean, setShowSettingsDialog: (show: boolean) => void) => {
      logger.info('检测到全局设置关闭事件')
      if (shouldReopenSettingsDialog) {
        logger.info('重新打开设置对话框')
        // 延迟一点时间确保全局设置对话框完全关闭
        setTimeout(() => {
          setShowSettingsDialog(true)
        }, 100)
      }
    }

    window.addEventListener('global-settings-closed', (event: unknown) => {
      handleGlobalSettingsClose(event.detail?.shouldReopenSettingsDialog, event.detail?.setShowSettingsDialog)
    })

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('siliconflow-settings-changed', handleCustomSettingsChange)
      window.removeEventListener('modelscope-settings-changed', handleCustomSettingsChange)
      window.removeEventListener('global-settings-closed', handleGlobalSettingsClose as any)
    }
  }, [loadGlobalSettings])

  return {
    config,
    setConfig,
    configInitialized,
    apiProvider,
    setApiProvider,
    siliconFlowApiKey,
    setSiliconFlowApiKey,
    modelScopeApiKey,
    setModelScopeApiKey,
    loadGlobalSettings
  }
}