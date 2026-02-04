/**
 * 设置对话框主组件
 *
 * 使用复合模式组织各个设置面板
 */

"use client"

import React, { useState, useEffect, useCallback, useMemo } from "react"
import { logger } from '@/lib/utils/logger'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Button } from "@/shared/components/ui/button"
import { useToast } from "@/lib/hooks/use-toast"
import { useAuth } from "@/shared/components/auth-provider"
import { useModelService } from "@/lib/contexts/ModelServiceContext"
import { ClientConfigManager } from '@/lib/utils/client-config-manager'
import { safeJsonParse } from '@/lib/utils'
import { ModelProvider, ModelConfig } from '@/shared/types/model-service'
import { SettingsMenu } from "./SettingsMenu"
import ModelServiceSettingsPanel from "./ModelServiceSettingsPanel"
import { DELAY_2S } from '@/lib/constants/constants'
import ToolsSettingsPanel from "./ToolsSettingsPanel"
import VideoThumbnailSettingsPanel from "./VideoThumbnailSettingsPanel"
import GeneralSettingsPanel from "./GeneralSettingsPanel"
import AppearanceSettingsPanel from "./AppearanceSettingsPanel"
import SecuritySettingsPanel from "./SecuritySettingsPanel"
import HelpSettingsPanel from "./HelpSettingsPanel"
import { CheckCircle2, AlertCircle } from "lucide-react"
import type {
  SettingsDialogProps,
  TMDBConfig,
  GeneralSettings,
  AppearanceSettings,
  VideoThumbnailSettings,
  ApiSettings,
  ModelServiceTabState,
  ProviderForm,
  ConnectionTestResult,
  ModelForm,
  ScenarioSettings,
  ToolsTabState,
  HelpTabState,
  AppInfo,
  PasswordForm
} from "./types"

// TMDB配置默认值
const DEFAULT_TMDB_CONFIG: TMDBConfig = {
  encoding: 'utf-8-sig',
  save_user_profile: true,
  tmdb_username: '',
  tmdb_password: '',
  backdrop_forced_upload: false,
  backdrop_vote_after_upload: false,
  filter_words: '',
  rename_csv_on_import: false,
  delete_csv_after_import: false
}

// 辅助函数：查找内置提供商
function findBuiltinProvider(
  providers: Array<{ id: string; type: string; isBuiltIn: boolean }>,
  id: string,
  type: string
) {
  return providers.find(p => p.id === id && p.isBuiltIn) ||
         providers.find(p => p.type === type && p.isBuiltIn)
}

export default function SettingsDialog({ open, onOpenChange, initialSection }: SettingsDialogProps) {
  const { toast } = useToast()
  const { changePassword } = useAuth()
  const { updateScenario } = useModelService()

  const validSections = useMemo(() => [
    'model-service',
    'tools',
    'video-thumbnail',
    'general',
    'appearance',
    'security',
    'help'
  ], [])

  const validInitialSection = useMemo(() =>
    validSections.includes(initialSection || '') ? initialSection : 'model-service',
    [initialSection, validSections]
  )

  const [activeSection, setActiveSection] = useState<string>(validInitialSection)

  useEffect(() => {
    if (validSections.includes(initialSection || '')) {
      setActiveSection(initialSection || '')
    }
  }, [initialSection, validSections])

  // TMDB配置相关状态
  const [tmdbImportPath, setTmdbImportPath] = useState("")
  const [tmdbConfig, setTmdbConfig] = useState<TMDBConfig>(DEFAULT_TMDB_CONFIG)
  const [configLoading, setConfigLoading] = useState(false)
  const [configSaving, setConfigSaving] = useState(false)
  const [showTmdbPassword, setShowTmdbPassword] = useState(false)

  // 通用设置状态
  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    autoSave: true,
    dataBackup: true,
    cacheCleanup: false,
    requestTimeout: 30,
    concurrentRequests: 5,
    useProxy: false,
    proxyUrl: ''
  })

  // 外观设置状态
  const [appearanceSettings, setAppearanceSettings] = useState<AppearanceSettings>({
    theme: 'system',
    primaryColor: 'blue',
    compactMode: false,
    fontSize: 'medium',
    showAnimations: true,
    showTooltips: true,
    detailBackdropBlurEnabled: true,
    detailBackdropBlurIntensity: 'medium',
  })

  // 视频缩略图设置状态
  const [videoThumbnailSettings, setVideoThumbnailSettings] = useState<VideoThumbnailSettings>({
    startTime: 0,
    threadCount: 2,
    outputFormat: "jpg",
    thumbnailCount: 9,
    frameInterval: 30,
    keepOriginalResolution: true,
    enableAIFilter: false,
    siliconFlowApiKey: "",
    siliconFlowModel: "Qwen/Qwen2.5-VL-32B-Instruct"
  })

  // API配置状态
  const [apiSettings, setApiSettings] = useState<ApiSettings>({
    siliconFlow: {
      apiKey: "",
      thumbnailFilterModel: "Qwen/Qwen2.5-VL-32B-Instruct"
    },
    modelScope: {
      apiKey: "",
      episodeGenerationModel: "Qwen/Qwen3-32B"
    },
    zhipu: {
      apiKey: "",
      chatModel: "glm-4-flash"
    }
  })
  const [showSiliconFlowApiKey, setShowSiliconFlowApiKey] = useState(false)
  const [showModelScopeApiKey, setShowModelScopeApiKey] = useState(false)
  const [showZhipuApiKey, setShowZhipuApiKey] = useState(false)
  const [siliconFlowSaving, setSiliconFlowSaving] = useState(false)
  const [modelScopeSaving, setModelScopeSaving] = useState(false)

  // 模型服务状态
  const [modelServiceTab, setModelServiceTab] = useState<'providers' | 'models' | 'scenarios'>("providers")
  const [modelServiceConfig, setModelServiceConfig] = useState<any>(null)
  const [selectedProviderId, setSelectedProviderId] = useState<string>("")
  const [showProviderDialog, setShowProviderDialog] = useState(false)
  const [editingProvider, setEditingProvider] = useState<ModelProvider | null>(null)
  const [providerForm, setProviderForm] = useState<ProviderForm>({
    name: "",
    apiKey: "",
    apiBaseUrl: "",
  })
  const [customProviders, setCustomProviders] = useState<ModelProvider[]>([])
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionTestResult, setConnectionTestResult] = useState<ConnectionTestResult | null>(null)
  const [configuredModels, setConfiguredModels] = useState<ModelConfig[]>([])
  const [showModelDialog, setShowModelDialog] = useState(false)
  const [showAvailableModelsDialog, setShowAvailableModelsDialog] = useState(false)
  const [availableModels, setAvailableModels] = useState<any[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelForm, setModelForm] = useState<ModelForm>({
    modelId: "",
    displayName: "",
    capabilities: []
  })
  const [scenarioSettings, setScenarioSettings] = useState<ScenarioSettings>({})
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null)

  // 工具设置状态
  const [toolsTab, setToolsTab] = useState<'management' | 'config' | 'dependencies'>('management')

  // 帮助与支持状态
  const [helpTab, setHelpTab] = useState<'about' | 'updates' | 'help' | 'feedback'>('about')
  const [appInfo] = useState<AppInfo>({
      name: 'TMDB Helper',
      version: '0.5.6',
      buildDate: '2024'
  })
  
    // 保存状态
    const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
    const [validationMessage, setValidationMessage] = useState("")
  
    // 账户安全状态
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  })
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false)

  // Docker环境状态
  const [isDockerEnv, setIsDockerEnv] = useState(false)

  // 辅助函数：更新API设置
  const updateApiSetting = useCallback((providerKey: 'siliconFlow' | 'modelScope' | 'zhipu', apiKey: string, defaultModel: string) => {
    setApiSettings(prev => ({
      ...prev,
      [providerKey]: {
        ...(prev[providerKey] || {}),
        apiKey
      }
    }))
  }, [])

  // 初始化设置
  useEffect(() => {
    if (typeof window === "undefined") return

    const initializeSettings = async () => {
      logger.info('初始化设置...')
      try {
        // 清除缓存
        ClientConfigManager.clearCache()

        // 检查Docker环境
        let isDockerEnv = false
        let dockerImportPath = ''

        try {
          const dockerResponse = await fetch('/api/system/docker-config')
          if (dockerResponse.ok) {
            const dockerData = await dockerResponse.json()
            if (dockerData.success && dockerData.config?.isDockerEnvironment) {
              isDockerEnv = true
              dockerImportPath = dockerData.config.tmdbImportPath || ''
              setIsDockerEnv(true)
            }
          }
        } catch (error) {
          logger.warn('Docker环境检查失败:', error)
        }

        // 加载TMDB导入路径
        let savedTmdbImportPath = await ClientConfigManager.getItem("tmdb_import_path")

        // 如果ClientConfigManager失败，尝试从localStorage fallback
        if (!savedTmdbImportPath && typeof window !== "undefined") {
          const localPath = localStorage.getItem("tmdb_import_path")
          if (localPath) {
            savedTmdbImportPath = localPath
            // 自动迁移到ClientConfigManager
            try {
              await ClientConfigManager.setItem("tmdb_import_path", localPath)
            } catch (error) {
              logger.warn('迁移tmdb_import_path到ClientConfigManager失败:', error)
            }
          }
        }

        const finalImportPath = dockerImportPath || savedTmdbImportPath || ''
        setTmdbImportPath(finalImportPath)
        if (finalImportPath) {
          loadTmdbConfig(finalImportPath)
        }

        // 加载通用设置
        try {
          const savedGeneralSettings = await ClientConfigManager.getItem("general_settings")
          if (savedGeneralSettings) {
            const parsed = safeJsonParse<GeneralSettings>(savedGeneralSettings)
            if (parsed) setGeneralSettings(parsed)
          }
        } catch (error) {
          logger.warn('加载通用设置失败:', error)
        }

        // 加载外观设置
        try {
          const savedAppearanceSettings = await ClientConfigManager.getItem("appearance_settings")
          if (savedAppearanceSettings) {
            const saved = safeJsonParse<any>(savedAppearanceSettings)
            if (saved) {
              if ('detailBackdropOverlayOpacity' in saved) delete saved.detailBackdropOverlayOpacity
              const merged: AppearanceSettings = {
                theme: 'system',
                primaryColor: 'blue',
                compactMode: false,
                fontSize: 'medium',
                showAnimations: true,
                showTooltips: true,
                detailBackdropBlurEnabled: true,
                detailBackdropBlurIntensity: 'medium',
                ...saved,
              }
              setAppearanceSettings(merged)
              applyThemeSettings(merged)
            }
          }
        } catch (error) {
          logger.warn('加载外观设置失败:', error)
        }

        // 加载视频缩略图设置
        try {
          const savedVideoThumbnailSettings = await ClientConfigManager.getItem("video_thumbnail_settings")
          const settings = safeJsonParse<any>(savedVideoThumbnailSettings)
          if (settings) {
            setVideoThumbnailSettings(prev => ({
              ...prev,
              ...settings,
              startTime: Number(settings.startTime || prev.startTime),
              threadCount: Number(settings.threadCount || prev.threadCount),
              thumbnailCount: Number(settings.thumbnailCount || prev.thumbnailCount),
              frameInterval: Number(settings.frameInterval || prev.frameInterval),
              enableAIFilter: settings.enableAIFilter || prev.enableAIFilter,
              siliconFlowApiKey: "",
              siliconFlowModel: settings.siliconFlowModel || prev.siliconFlowModel
            }))
          }
        } catch (error) {
          logger.warn('加载视频缩略图设置失败:', error)
        }

        // 加载模型服务配置
        try {
          const response = await fetch('/api/model-service')
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.config) {
              setModelServiceConfig(data.config)
              if (data.config.providers) {
                const customProviders = data.config.providers.filter((p: { isBuiltIn: boolean }) => p.isBuiltIn === false)
                setCustomProviders(customProviders)
              } else {
                setCustomProviders([])
              }
              if (data.config.models) {
                setConfiguredModels(data.config.models)
              } else {
                setConfiguredModels([])
              }
              if (data.config.scenarios) {
                const initialScenarioSettings: ScenarioSettings = {}
                data.config.scenarios.forEach((scenario: {
  type: string;
  selectedModelIds?: string[];
  primaryModelId?: string;
  parameters?: Record<string, unknown>
}) => {
                  initialScenarioSettings[scenario.type] = {
                    selectedModelIds: scenario.selectedModelIds || [],
                    primaryModelId: scenario.primaryModelId || '',
                    parameters: scenario.parameters || {}
                  }
                })
                setScenarioSettings(initialScenarioSettings)
              } else {
                setScenarioSettings({})
              }

              // 加载API设置
              const providers = data.config.providers || []
              const siliconflowProvider = findBuiltinProvider(providers, 'siliconflow-builtin', 'siliconflow')
              const modelscopeProvider = findBuiltinProvider(providers, 'modelscope-builtin', 'modelscope')
              const zhipuProvider = findBuiltinProvider(providers, 'zhipu-builtin', 'zhipu')

              if (siliconflowProvider) {
                updateApiSetting('siliconFlow', siliconflowProvider.apiKey || '', 'Qwen/Qwen2.5-VL-32B-Instruct')
              }

              if (modelscopeProvider) {
                updateApiSetting('modelScope', modelscopeProvider.apiKey || '', 'Qwen/Qwen3-32B')
              }

              if (zhipuProvider) {
                updateApiSetting('zhipu', zhipuProvider.apiKey || '', 'glm-4-flash')
              }
            } else {
              logger.warn('加载模型服务配置失败，响应数据无效:', data)
              // 提供默认值
              setCustomProviders([])
              setConfiguredModels([])
              setScenarioSettings({})
            }
          } else {
            logger.warn('加载模型服务配置失败，状态码:', response.status)
            // 提供默认值
            setCustomProviders([])
            setConfiguredModels([])
            setScenarioSettings({})
          }
        } catch (error) {
          logger.warn('加载模型服务配置失败:', error)
          // 提供默认值
          setCustomProviders([])
          setConfiguredModels([])
          setScenarioSettings({})
          // 不抛出错误，继续初始化其他设置
        }

      } catch (error) {
        logger.error('初始化设置失败:', error)
      }
    }

    initializeSettings()
  }, [])

  // 对话框打开时刷新配置
  useEffect(() => {
    if (open && typeof window !== "undefined") {
      const refreshConfig = async () => {
        try {
          ClientConfigManager.clearCache()

          // 刷新TMDB导入路径
          const currentImportPath = await ClientConfigManager.getItem("tmdb_import_path")
          if (currentImportPath) {
            setTmdbImportPath(currentImportPath)
          }

          // 刷新模型服务配置
          await refreshModelServiceConfig()
        } catch (error) {
          logger.error('刷新配置失败:', error)
        }
      }

      refreshConfig()
    }
  }, [open])

  // 提取模型服务配置刷新逻辑
  const refreshModelServiceConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/model-service')
      if (!response.ok) {
        logger.warn('获取模型服务配置失败，状态码:', response.status)
        resetModelServiceState()
        return
      }

      const data = await response.json()
      if (!data.success || !data.config) {
        logger.warn('获取模型服务配置失败，响应数据无效:', data)
        resetModelServiceState()
        return
      }

      const config = data.config
      setModelServiceConfig(config)
      updateModelServiceState(config)
    } catch (error) {
      logger.warn('刷新模型服务配置失败:', error)
      resetModelServiceState()
    }
  }, [])

  // 辅助函数：重置模型服务状态
  const resetModelServiceState = useCallback(() => {
    setCustomProviders([])
    setConfiguredModels([])
    setScenarioSettings({})
  }, [])

  // 辅助函数：更新模型服务状态
  const updateModelServiceState = useCallback((config: any) => {
    const providers = config.providers || []
    const customProviders = providers.filter((p: { isBuiltIn: boolean }) => !p.isBuiltIn)
    const siliconflowProvider = findBuiltinProvider(providers, 'siliconflow-builtin', 'siliconflow')
    const modelscopeProvider = findBuiltinProvider(providers, 'modelscope-builtin', 'modelscope')

    setCustomProviders(customProviders)
    setConfiguredModels(config.models || [])

    if (siliconflowProvider) {
      updateApiSetting('siliconFlow', siliconflowProvider.apiKey || '', 'Qwen/Qwen2.5-VL-32B-Instruct')
    }

    if (modelscopeProvider) {
      updateApiSetting('modelScope', modelscopeProvider.apiKey || '', 'Qwen/Qwen3-32B')
    }

    // 更新场景设置
    const scenarioSettings: ScenarioSettings = {}
    if (config.scenarios) {
      config.scenarios.forEach((scenario: {
        type: string
        selectedModelIds?: string[]
        primaryModelId?: string
        parameters?: Record<string, unknown>
      }) => {
        scenarioSettings[scenario.type] = {
          selectedModelIds: scenario.selectedModelIds || [],
          primaryModelId: scenario.primaryModelId || '',
          parameters: scenario.parameters || {}
        }
      })
    }
    setScenarioSettings(scenarioSettings)
  }, [updateApiSetting])

  // 监听模型服务配置更新事件
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleConfigUpdate = async () => {
      try {
        const response = await fetch('/api/model-service')
        if (!response.ok) {
          logger.warn('同步模型服务配置失败，状态码:', response.status)
          resetModelServiceState()
          return
        }

        const data = await response.json()
        if (!data.success || !data.config) {
          logger.warn('同步模型服务配置失败，响应数据无效:', data)
          resetModelServiceState()
          return
        }

        const config = data.config
        setModelServiceConfig(config)
        setConfiguredModels(config.models || [])
        setCustomProviders(config.providers?.filter((p: { isBuiltIn: boolean }) => !p.isBuiltIn) || [])

        // 更新API设置
        const providers = config.providers || []
        const siliconflowProvider = findBuiltinProvider(providers, 'siliconflow-builtin', 'siliconflow')
        const modelscopeProvider = findBuiltinProvider(providers, 'modelscope-builtin', 'modelscope')

        if (siliconflowProvider) {
          setApiSettings(prev => ({
            ...prev,
            siliconFlow: { ...prev.siliconFlow!, apiKey: siliconflowProvider.apiKey || '' }
          }))
        }

        if (modelscopeProvider) {
          setApiSettings(prev => ({
            ...prev,
            modelScope: { ...prev.modelScope!, apiKey: modelscopeProvider.apiKey || '' }
          }))
        }

        // 更新场景设置（过滤无效的模型ID）
        const updatedScenarioSettings: ScenarioSettings = {}
        if (config.scenarios) {
          const validModelIds = new Set(config.models.map((m: { id: string }) => m.id))
          config.scenarios.forEach((scenario: {
            type: string
            selectedModelIds?: string[]
            primaryModelId?: string
            parameters?: Record<string, unknown>
          }) => {
            const filteredModelIds = (scenario.selectedModelIds || []).filter(id => validModelIds.has(id))
            const primaryId = filteredModelIds.includes(scenario.primaryModelId || '')
              ? scenario.primaryModelId
              : filteredModelIds[0] || ''

            updatedScenarioSettings[scenario.type] = {
              selectedModelIds: filteredModelIds,
              primaryModelId: primaryId,
              parameters: scenario.parameters || {}
            }
          })
        }
        setScenarioSettings(updatedScenarioSettings)
      } catch (error) {
        logger.warn('同步模型服务配置失败:', error)
        resetModelServiceState()
      }
    }

    window.addEventListener('model-service-config-updated', handleConfigUpdate)
    return () => window.removeEventListener('model-service-config-updated', handleConfigUpdate)
  }, [])

// 保存处理函数
  const handleSave = async () => {
    setSaveStatus("saving")
    setValidationMessage("")

    try {
      // 定义各设置面板的保存行为
      const saveActions = {
        "general": () => saveGeneralSettings(),
        "appearance": () => saveAppearanceSettings(),
        "video-thumbnail": () => saveVideoThumbnailSettings(),
        "model-service": () => toast({ title: "成功", description: "模型服务设置已保存" }),
        "tools": () => saveTmdbConfig(),
        "security": () => toast({ title: "成功", description: "安全设置已保存" })
      }

      const saveAction = saveActions[activeSection as keyof typeof saveActions]
      if (saveAction) {
        saveAction()
      } else {
        logger.warn('未知的设置面板:', activeSection)
      }

      setSaveStatus("success")
      setValidationMessage("设置已成功保存")

      // 2秒后重置状态
      setTimeout(() => {
        setSaveStatus("idle")
        setValidationMessage("")
      }, DELAY_2S)
    } catch (error) {
      logger.error('保存设置失败:', error)
      setSaveStatus("error")
      setValidationMessage("保存失败，请重试")
    }
  }

  const handleCancel = () => {
    handleOpenChange(false)
    setSaveStatus("idle")
    setValidationMessage("")
  }

  const getStatusIcon = () => {
    const icons = {
      saving: <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />,
      success: <CheckCircle2 className="h-4 w-4 text-green-600" />,
      error: <AlertCircle className="h-4 w-4 text-red-600" />
    }
    return icons[saveStatus] || null
  }

  const getStatusColor = () => {
    const colors = {
      saving: "text-blue-600 dark:text-blue-400",
      success: "text-green-600 dark:text-green-400",
      error: "text-red-600 dark:text-red-400"
    }
    return colors[saveStatus] || "text-gray-600 dark:text-gray-400"
  }

// 应用主题设置
  const applyThemeSettings = useCallback((settings: AppearanceSettings) => {
    const root = document.documentElement

    if (settings.theme === 'dark') {
      root.classList.add('dark')
    } else if (settings.theme === 'light') {
      root.classList.remove('dark')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    root.setAttribute('data-primary-color', settings.primaryColor)

    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px'
    }
    root.style.fontSize = fontSizeMap[settings.fontSize]

    if (settings.compactMode) {
      root.classList.add('compact-mode')
    } else {
      root.classList.remove('compact-mode')
    }

    if (!settings.showAnimations) {
      root.classList.add('no-animations')
    } else {
      root.classList.remove('no-animations')
    }
  }, [])

  // 加载TMDB配置
  const loadTmdbConfig = useCallback(async (path: string) => {
    if (!path) return

    setConfigLoading(true)
    try {
      const response = await fetch(`/api/external/tmdb-config?path=${encodeURIComponent(path)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('加载TMDB配置失败:', response.status, errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.config) {
        // 使用默认值合并配置
        setTmdbConfig({
          ...DEFAULT_TMDB_CONFIG,
          ...data.config
        })
      } else {
        logger.warn('TMDB配置API返回失败:', data.error)
        toast({
          title: "警告",
          description: data.error || "TMDB配置数据无效",
          variant: "destructive"
        })
      }
    } catch (error) {
      logger.error('加载TMDB配置失败，可能是服务不可用:', error)
      toast({
        title: "错误",
        description: "加载TMDB配置失败，请检查TMDB-Import路径是否正确",
        variant: "destructive"
      })
    } finally {
      setConfigLoading(false)
    }
  }, [toast])

  // 保存TMDB配置
  const saveTmdbConfig = useCallback(async () => {
    setConfigSaving(true)
    try {
      const response = await fetch('/api/external/tmdb-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tmdbImportPath,
          config: tmdbConfig
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        logger.error('保存TMDB配置失败:', response.status, errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        toast({
          title: "成功",
          description: "TMDB配置保存成功",
        })
      } else {
        throw new Error(data.error || '保存失败')
      }
    } catch (error) {
      logger.error('保存TMDB配置失败，可能是服务不可用:', error)
      toast({
        title: "错误",
        description: `保存TMDB配置失败: ${error instanceof Error ? error.message : '服务不可用'}`,
        variant: "destructive",
      })
    } finally {
      setConfigSaving(false)
    }
  }, [tmdbImportPath, tmdbConfig, toast])

  // 保存通用设置
  const saveGeneralSettings = useCallback(async () => {
    try {
      const isDocker = await checkDockerEnvironment()

      if (isDocker) {
        await saveDockerConfig({ generalSettings })
      } else {
        await ClientConfigManager.setItem("general_settings", JSON.stringify(generalSettings))
      }

      toast({
        title: "成功",
        description: "通用设置已保存",
      })
    } catch (error) {
      logger.error('保存通用设置失败:', error)
      toast({
        title: "错误",
        description: "保存通用设置失败",
        variant: "destructive",
      })
    }
  }, [generalSettings, toast])

  // 保存外观设置
  const saveAppearanceSettings = useCallback(async () => {
    try {
      const isDocker = await checkDockerEnvironment()

      if (isDocker) {
        await saveDockerConfig({ appearanceSettings })
      } else {
        await ClientConfigManager.setItem("appearance_settings", JSON.stringify(appearanceSettings))
      }

      applyThemeSettings(appearanceSettings)

      toast({
        title: "成功",
        description: "外观设置已保存",
      })
    } catch (error) {
      logger.error('保存外观设置失败:', error)
      toast({
        variant: "destructive",
        title: "保存失败",
        description: "保存外观设置时发生错误"
      })
    }
  }, [appearanceSettings, toast])

  // 保存视频缩略图设置
  const saveVideoThumbnailSettings = useCallback(async () => {
    try {
      const isDocker = await checkDockerEnvironment()

      if (isDocker) {
        await saveDockerConfig({ videoThumbnailSettings })
      } else {
        await ClientConfigManager.setItem("video_thumbnail_settings", JSON.stringify(videoThumbnailSettings))
      }

      toast({
        title: "成功",
        description: "视频缩略图设置已保存",
      })
    } catch (error) {
      logger.error('保存视频缩略图设置失败:', error)
      toast({
        title: "错误",
        description: "保存视频缩略图设置失败",
        variant: "destructive",
      })
    }
  }, [videoThumbnailSettings, toast])

  // 密码修改
  const handlePasswordChange = useCallback(async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: "错误",
        description: "请填写所有密码字段",
        variant: "destructive",
      })
      return
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: "错误",
        description: "新密码和确认密码不匹配",
        variant: "destructive",
      })
      return
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: "错误",
        description: "新密码长度至少为6位",
        variant: "destructive",
      })
      return
    }

    setPasswordChangeLoading(true)
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword)
      toast({
        title: "成功",
        description: "密码修改成功",
      })
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      })
    } catch (error) {
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "密码修改失败",
        variant: "destructive",
      })
    } finally {
      setPasswordChangeLoading(false)
    }
  }, [passwordForm, changePassword, toast])

  // 检查是否为Docker环境
  const checkDockerEnvironment = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/system/docker-config')
      const data = await response.json()
      return data.success && data.config?.isDockerEnvironment
    } catch (error) {
      logger.warn('检查Docker环境失败:', error)
      return false
    }
  }, [])

  // 保存Docker配置
  const saveDockerConfig = useCallback(async (configData: Record<string, unknown>) => {
    const response = await fetch('/api/system/docker-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(configData)
    })

    const data = await response.json()
    if (!data.success) {
      throw new Error(data.error || '保存失败')
    }
  }, [])

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
    if (!newOpen) {
      window.dispatchEvent(new CustomEvent('global-settings-closed'))
    }
  }

  const renderActivePanel = () => {
    switch (activeSection) {
      case "model-service":
        return (
          <ModelServiceSettingsPanel
            modelServiceTab={modelServiceTab}
            setModelServiceTab={setModelServiceTab}
            apiSettings={apiSettings}
            setApiSettings={setApiSettings}
            customProviders={customProviders}
            setCustomProviders={setCustomProviders}
            configuredModels={configuredModels}
            setConfiguredModels={setConfiguredModels}
            scenarioSettings={scenarioSettings}
            setScenarioSettings={setScenarioSettings}
            showProviderDialog={showProviderDialog}
            setShowProviderDialog={setShowProviderDialog}
            showModelDialog={showModelDialog}
            setShowModelDialog={setShowModelDialog}
            showAvailableModelsDialog={showAvailableModelsDialog}
            setShowAvailableModelsDialog={setShowAvailableModelsDialog}
            editingProvider={editingProvider}
            setEditingProvider={setEditingProvider}
            providerForm={providerForm}
            setProviderForm={setProviderForm}
            modelForm={modelForm}
            setModelForm={setModelForm}
            connectionTestResult={connectionTestResult}
            setConnectionTestResult={setConnectionTestResult}
            testingConnection={testingConnection}
            setTestingConnection={setTestingConnection}
            loadingModels={loadingModels}
            setLoadingModels={setLoadingModels}
            availableModels={availableModels}
            setAvailableModels={setAvailableModels}
            selectedProviderId={selectedProviderId}
            setSelectedProviderId={setSelectedProviderId}
            expandedScenario={expandedScenario}
            setExpandedScenario={setExpandedScenario}
            showSiliconFlowApiKey={showSiliconFlowApiKey}
            setShowSiliconFlowApiKey={setShowSiliconFlowApiKey}
            showModelScopeApiKey={showModelScopeApiKey}
            setShowModelScopeApiKey={setShowModelScopeApiKey}
            showZhipuApiKey={showZhipuApiKey}
            setShowZhipuApiKey={setShowZhipuApiKey}
          />
        )
      case "tools":
        return (
          <ToolsSettingsPanel
            toolsTab={toolsTab}
            setToolsTab={setToolsTab}
            tmdbImportPath={tmdbImportPath}
            setTmdbImportPath={setTmdbImportPath}
            tmdbConfig={tmdbConfig}
            setTmdbConfig={setTmdbConfig}
            configLoading={configLoading}
            configSaving={configSaving}
            showTmdbPassword={showTmdbPassword}
            setShowTmdbPassword={setShowTmdbPassword}
            loadTmdbConfig={loadTmdbConfig}
            saveTmdbConfig={saveTmdbConfig}
            isDockerEnv={isDockerEnv}
          />
        )
      case "video-thumbnail":
        return (
          <VideoThumbnailSettingsPanel
            videoThumbnailSettings={videoThumbnailSettings}
            setVideoThumbnailSettings={setVideoThumbnailSettings}
            apiSettings={apiSettings}
            setApiSettings={setApiSettings}
            saveVideoThumbnailSettings={saveVideoThumbnailSettings}
          />
        )
      case "general":
        return (
          <GeneralSettingsPanel
            generalSettings={generalSettings}
            setGeneralSettings={setGeneralSettings}
            saveGeneralSettings={saveGeneralSettings}
          />
        )
      case "appearance":
        return (
          <AppearanceSettingsPanel
            appearanceSettings={appearanceSettings}
            setAppearanceSettings={setAppearanceSettings}
            saveAppearanceSettings={saveAppearanceSettings}
          />
        )
      case "security":
        return (
          <SecuritySettingsPanel
            passwordForm={passwordForm}
            setPasswordForm={setPasswordForm}
            showCurrentPassword={showCurrentPassword}
            setShowCurrentPassword={setShowCurrentPassword}
            showNewPassword={showNewPassword}
            setShowNewPassword={setShowNewPassword}
            showConfirmPassword={showConfirmPassword}
            setShowConfirmPassword={setShowConfirmPassword}
            passwordChangeLoading={passwordChangeLoading}
            handlePasswordChange={handlePasswordChange}
          />
        )
      case "help":
        return (
          <HelpSettingsPanel
            helpTab={helpTab}
            setHelpTab={setHelpTab}
            appInfo={appInfo}
          />
        )
      default:
        return <ModelServiceSettingsPanel />
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center">
            设置
          </DialogTitle>
          <DialogDescription>
            配置应用程序的全局设置和API密钥
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[calc(90vh-120px)]">
          <SettingsMenu
            activeSection={activeSection}
            onSectionChange={setActiveSection}
          />

          <div className="flex-1 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-6">
                {renderActivePanel()}
              </div>
            </ScrollArea>

            {/* 底部操作按钮 */}
            <div className="border-t p-4 bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleCancel} disabled={saveStatus === "saving"}>
                  取消
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saveStatus === "saving"}
                  className={saveStatus === "success" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {saveStatus === "saving" && (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  )}
                  {saveStatus === "success" ? "已保存" : saveStatus === "saving" ? "保存中..." : "保存"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}