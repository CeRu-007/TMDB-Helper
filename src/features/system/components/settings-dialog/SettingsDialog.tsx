/**
 * 设置对话框主组件
 * 
 * 使用复合模式组织各个设置面板
 */

"use client"

import { useRef, useState, useEffect, useMemo, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Button } from "@/shared/components/ui/button"
import { useToast } from "@/shared/lib/hooks/use-toast"
import { useAuth } from "@/shared/components/auth-provider"
import { useModelService } from "@/lib/contexts/ModelServiceContext"
import { ClientConfigManager } from '@/shared/lib/utils/client-config-manager'
import { safeJsonParse } from '@/lib/utils'
import { ModelProvider, ModelConfig } from '@/shared/types/model-service'
import { SettingsMenu } from "./SettingsMenu"
import ModelServiceSettingsPanel from "./ModelServiceSettingsPanel"
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
    initialSection &&
    typeof initialSection === 'string' &&
    validSections.includes(initialSection)
    ? initialSection
    : 'model-service',
    [initialSection, validSections]
  )

  const [activeSection, setActiveSection] = useState<string>(validInitialSection)

  // TMDB配置相关状态
  const [tmdbImportPath, setTmdbImportPath] = useState("")
  const [tmdbConfig, setTmdbConfig] = useState<TMDBConfig>({
    encoding: 'utf-8-sig',
    logging_level: 'INFO',
    save_user_profile: true,
    tmdb_username: '',
    tmdb_password: '',
    backdrop_forced_upload: false,
    filter_words: ''
  })
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
    }
  })
  const [showSiliconFlowApiKey, setShowSiliconFlowApiKey] = useState(false)
  const [showModelScopeApiKey, setShowModelScopeApiKey] = useState(false)
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
  const [helpTab, setHelpTab] = useState<'about' | 'help' | 'feedback'>('about')
  const [appInfo, setAppInfo] = useState<AppInfo>({
      name: 'TMDB Helper',
      version: '0.5.2',
      versionInfo: {
        title: '系统架构重构与功能优化',
        description: `主要更新：
1. 系统架构重构
• 完成大型组件重构，提升代码可维护性
• 重构状态管理系统，实现统一的hooks模式
• 重构日志系统，支持环境变量配置
• 重构存储模式，统一使用StorageService替代localStorage

2. CSV编辑器功能增强
• 新增批量插入行功能，提升编辑效率
• 新增数字范围填充功能，支持快速生成序列数据
• 优化表格滚动性能和编辑体验
• 修复runtime列"统一设置分钟"功能不生效问题
• 简化CSV保存逻辑，移除冗余代码

3. 多语言支持
• 新增多语言选择器组件
• 集成到相关组件，支持国际化切换

4. TMDB功能优化
• 重构TMDB API配置为使用官方API
• 为backdrop列添加URL点击功能
• 优化剧集总集数计算和展示
• 简化TMDB数据刷新按钮的文本

5. 设置对话框改进
• 完成设置对话框模块化重构，从4178行单体文件拆分为多个独立面板组件
• 提升代码可维护性，每个面板独立管理自己的UI和交互
• 保持所有原有功能和UI完全不变
• 添加底部通用保存按钮，统一保存操作
• 从localStorage初始化侧边栏折叠状态

6. 终端和命令功能
• 新增进程终止功能
• 优化命令执行状态处理
• 修复独立维护页面终端读取CSV文件失败问题

7. UI/UX优化
• 优化词条卡片网格间距，提升视觉协调性
• 优化命令显示区域的文本溢出样式
• 修改季操作区域的按钮显示逻辑

8. 开发工具
• 添加自动检测代码变更并重建的逻辑
• 增强日志系统，支持环境变量控制

技术改进：
• 统一存储服务实现，提升数据管理一致性
• 优化组件状态管理，减少不必要的重渲染
• 清理冗余代码和调试日志，提升系统性能`,
        releaseDate: '2026-01-19'
      }
    })
  
    const [isVersionDescriptionExpanded, setIsVersionDescriptionExpanded] = useState(false)
  
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

  // 初始化设置
  useEffect(() => {
    if (typeof window === "undefined") return

    const initializeSettings = async () => {
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
          console.warn('Docker环境检查失败:', error)
        }

        // 加载TMDB导入路径
        let savedTmdbImportPath = await ClientConfigManager.getItem("tmdb_import_path")

        // 如果ClientConfigManager失败，尝试从localStorage fallback
        if (!savedTmdbImportPath && typeof window !== "undefined") {
          const localPath = localStorage.getItem("tmdb_import_path")
          if (localPath) {
            console.log('🔄 [SettingsDialog] 从localStorage恢复tmdb_import_path配置')
            savedTmdbImportPath = localPath
            // 自动迁移到ClientConfigManager
            try {
              await ClientConfigManager.setItem("tmdb_import_path", localPath)
              console.log('✅ [SettingsDialog] 已迁移tmdb_import_path到ClientConfigManager')
            } catch (error) {
              console.warn('⚠️ [SettingsDialog] 迁移tmdb_import_path到ClientConfigManager失败:', error)
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
          console.warn('加载通用设置失败:', error)
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
          console.warn('加载外观设置失败:', error)
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
          console.warn('加载视频缩略图设置失败:', error)
        }

        // 加载模型服务配置
        try {
          const response = await fetch('/api/model-service')
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.config) {
              setModelServiceConfig(data.config)
              if (data.config.providers) {
                const customProviders = data.config.providers.filter((p: any) => p.isBuiltIn === false)
                setCustomProviders(customProviders)
              }
              if (data.config.models) {
                setConfiguredModels(data.config.models)
              }
              if (data.config.scenarios) {
                const initialScenarioSettings: ScenarioSettings = {}
                data.config.scenarios.forEach((scenario: any) => {
                  initialScenarioSettings[scenario.type] = {
                    selectedModelIds: scenario.selectedModelIds || [],
                    primaryModelId: scenario.primaryModelId || '',
                    parameters: scenario.parameters || {}
                  }
                })
                setScenarioSettings(initialScenarioSettings)
              }

              // 加载API设置
              const siliconflowProvider = data.config.providers?.find((p: any) => p.type === 'siliconflow' && p.isBuiltIn)
              if (siliconflowProvider) {
                setApiSettings(prev => ({
                  ...prev,
                  siliconFlow: {
                    ...prev.siliconFlow!,
                    apiKey: siliconflowProvider.apiKey || ""
                  }
                }))
              }

              const modelscopeProvider = data.config.providers?.find((p: any) => p.type === 'modelscope' && p.isBuiltIn)
              if (modelscopeProvider) {
                setApiSettings(prev => ({
                  ...prev,
                  modelScope: {
                    ...prev.modelScope!,
                    apiKey: modelscopeProvider.apiKey || ""
                  }
                }))
              }
            }
          }
        } catch (error) {
          console.warn('加载模型服务配置失败:', error)
          // 不抛出错误，继续初始化其他设置
        }

        // 获取应用信息
        fetch('/api/app-info')
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setAppInfo({
                name: data.data.name || 'TMDB Helper',
                version: data.data.version || '0.3.1',
                versionInfo: data.data.versionInfo || {
                  title: '修复Docker环境配置保存问题',
                  description: '',
                  releaseDate: '2025-07-30'
                }
              })
            }
          })
          .catch(error => {
            console.warn('获取应用信息失败:', error)
            // 使用默认值，不影响功能
          })

      } catch (error) {
        console.error('初始化设置失败:', error)
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
          console.error('刷新配置失败:', error)
        }
      }

      refreshConfig()
    }
  }, [open])

  // 提取模型服务配置刷新逻辑
  const refreshModelServiceConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/model-service')
      if (!response.ok) return

      const data = await response.json()
      if (!data.success || !data.config) return

      setModelServiceConfig(data.config)

      // 更新自定义提供商
      if (data.config.providers) {
        setCustomProviders(data.config.providers.filter((p: any) => !p.isBuiltIn))
      }

      // 更新配置的模型
      if (data.config.models) {
        setConfiguredModels(data.config.models)
      }

      // 更新场景设置
      if (data.config.scenarios) {
        const updatedScenarioSettings: ScenarioSettings = {}
        data.config.scenarios.forEach((scenario: any) => {
          updatedScenarioSettings[scenario.type] = {
            selectedModelIds: scenario.selectedModelIds || [],
            primaryModelId: scenario.primaryModelId || '',
            parameters: scenario.parameters || {}
          }
        })
        setScenarioSettings(updatedScenarioSettings)
      }
    } catch (error) {
      console.warn('刷新模型服务配置失败:', error)
    }
  }, [])

  // 监听模型服务配置更新事件
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleConfigUpdate = async () => {
      try {
        const response = await fetch('/api/model-service')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.config) {
            setConfiguredModels(data.config.models || [])
            setCustomProviders(data.config.providers?.filter((p: any) => p.isBuiltIn === false) || [])

            const siliconflowProvider = data.config.providers?.find((p: any) => p.type === 'siliconflow' && p.isBuiltIn)
            if (siliconflowProvider) {
              setApiSettings(prev => ({
                ...prev,
                siliconFlow: { ...prev.siliconFlow!, apiKey: siliconflowProvider.apiKey || '' }
              }))
            }

            const modelscopeProvider = data.config.providers?.find((p: any) => p.type === 'modelscope' && p.isBuiltIn)
            if (modelscopeProvider) {
              setApiSettings(prev => ({
                ...prev,
                modelScope: { ...prev.modelScope!, apiKey: modelscopeProvider.apiKey || '' }
              }))
            }

            const updatedScenarioSettings: ScenarioSettings = {}
            data.config.scenarios.forEach((scenario: any) => {
              const validModelIds = scenario.selectedModelIds?.filter((modelId: string) =>
                data.config.models.some((model: any) => model.id === modelId)
              ) || []
              const validPrimaryId = validModelIds.includes(scenario.primaryModelId || '')
                ? scenario.primaryModelId
                : validModelIds[0] || ''
              updatedScenarioSettings[scenario.type] = {
                selectedModelIds: validModelIds,
                primaryModelId: validPrimaryId,
                parameters: scenario.parameters || {}
              }
            })
            setScenarioSettings(updatedScenarioSettings)
          }
        }
      } catch (error) {
        console.warn('同步场景设置失败:', error)
        // 不抛出错误，避免影响其他功能
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
        "tools": () => toast({ title: "成功", description: "工具设置已保存" }),
        "security": () => toast({ title: "成功", description: "安全设置已保存" })
      }

      const saveAction = saveActions[activeSection as keyof typeof saveActions]
      if (saveAction) {
        saveAction()
      } else {
        console.warn('未知的设置面板:', activeSection)
      }

      setSaveStatus("success")
      setValidationMessage("设置已成功保存")

      // 2秒后重置状态
      setTimeout(() => {
        setSaveStatus("idle")
        setValidationMessage("")
      }, 2000)
    } catch (error) {
      console.error('保存设置失败:', error)
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
    switch (saveStatus) {
      case "saving":
        return <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
      case "success":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const getStatusColor = () => {
    switch (saveStatus) {
      case "success":
        return "text-green-600 dark:text-green-400"
      case "error":
        return "text-red-600 dark:text-red-400"
      case "saving":
        return "text-blue-600 dark:text-blue-400"
      default:
        return "text-gray-600 dark:text-gray-400"
    }
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
        console.error('加载TMDB配置失败:', response.status, errorText)
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.success && data.config) {
        // 使用默认值合并配置
        const defaultConfig = {
          encoding: 'utf-8-sig',
          logging_level: 'INFO',
          save_user_profile: true,
          tmdb_username: '',
          tmdb_password: '',
          backdrop_forced_upload: false,
          filter_words: ''
        }

        setTmdbConfig({
          ...defaultConfig,
          ...data.config,
          save_user_profile: data.config.save_user_profile !== false,
          backdrop_forced_upload: data.config.backdrop_forced_upload === true
        })
      } else {
        console.warn('TMDB配置API返回失败:', data.error)
        toast({
          title: "警告",
          description: data.error || "TMDB配置数据无效",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('加载TMDB配置失败，可能是服务不可用:', error)
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
    if (!tmdbImportPath) {
      toast({
        title: "错误",
        description: "请先设置TMDB-Import工具路径",
        variant: "destructive",
      })
      return
    }

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
        console.error('保存TMDB配置失败:', response.status, errorText)
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
      console.error('保存TMDB配置失败，可能是服务不可用:', error)
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
      console.error('保存通用设置失败:', error)
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
        description: "外观设置已保存并应用",
      })
    } catch (error) {
      console.error('保存外观设置失败:', error)
      toast({
        title: "错误",
        description: "保存外观设置失败",
        variant: "destructive",
      })
    }
  }, [appearanceSettings, toast, applyThemeSettings])

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
      console.error('保存视频缩略图设置失败:', error)
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
      console.warn('检查Docker环境失败:', error)
      return false
    }
  }, [])

  // 保存Docker配置
  const saveDockerConfig = useCallback(async (configData: any) => {
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
            isVersionDescriptionExpanded={isVersionDescriptionExpanded}
            setIsVersionDescriptionExpanded={setIsVersionDescriptionExpanded}
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