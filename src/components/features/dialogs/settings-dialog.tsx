"use client"

import { useRef } from "react"
import { useState, useEffect, useMemo, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/common/dialog"
import { Button } from "@/components/common/button"
import { Input } from "@/components/common/input"
import { Label } from "@/components/common/label"
import { Badge } from "@/components/common/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/common/card"
import { Separator } from "@/components/common/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/common/select"
import { Switch } from "@/components/common/switch"
import { Textarea } from "@/components/common/textarea"
import { ScrollArea } from "@/components/common/scroll-area"
import { useToast } from "@/lib/hooks/use-toast"
import { useAuth } from "@/components/features/auth/auth-provider"
import { useModelService } from "@/lib/contexts/ModelServiceContext"
import { Slider } from "@/components/common/slider"
import { Checkbox } from "@/components/common/checkbox"
import {
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Key,
  Info,
  Settings,
  Terminal,
  FolderOpen,
  FileText,
  RefreshCw,
  Save,
  Database,
  Globe,
  Shield,
  Palette,
  Monitor,
  Sun,
  Moon,
  Film,
  HelpCircle,
  GitBranch,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  Sparkles,
} from "lucide-react"
import TMDBImportUpdater from "@/components/features/tmdb/tmdb-import-updater"
import DependencyInstaller from "@/components/features/system/dependency-installer"
import { ClientConfigManager } from '@/lib/utils/client-config-manager'
import { safeJsonParse } from '@/lib/utils'
import ConfigMigrationDialog from "./config-migration-dialog"
import { ModelServiceConfig, ModelProvider, ModelConfig, UsageScenario } from '@/types/model-service'
import { ModelServiceMigration } from '@/lib/utils/model-service-migration'

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialSection?: string
}

interface TMDBConfig {
  encoding?: string
  logging_level?: string
  save_user_profile?: boolean
  tmdb_username?: string
  tmdb_password?: string
  backdrop_forced_upload?: boolean
  filter_words?: string
}

interface GeneralSettings {
  autoSave: boolean
  dataBackup: boolean
  cacheCleanup: boolean
  requestTimeout: number
  concurrentRequests: number
  useProxy: boolean
  proxyUrl: string
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system'
  primaryColor: string
  compactMode: boolean
  fontSize: 'small' | 'medium' | 'large'
  showAnimations: boolean
  showTooltips: boolean
  // 新增：词条详情背景毛玻璃效果设置
  detailBackdropBlurEnabled?: boolean
  detailBackdropBlurIntensity?: 'light' | 'medium' | 'heavy'
}

interface VideoThumbnailSettings {
  startTime: number
  threadCount: number
  outputFormat: "jpg" | "png"
  thumbnailCount: number
  frameInterval: number
  keepOriginalResolution: boolean
  // AI筛选功能
  enableAIFilter: boolean
  siliconFlowApiKey: string
  siliconFlowModel: string
}

export default function SettingsDialog({ open, onOpenChange, initialSection }: SettingsDialogProps) {
  const { toast } = useToast()
  const { changePassword } = useAuth()
  const { updateScenario } = useModelService()
  
  // 确保 activeSection 始终有效且为字符串类型
  const validSections = useMemo(() => ['api', 'model-service', 'tools', 'video-thumbnail', 'general', 'appearance', 'security', 'help'], [])
  const validInitialSection = useMemo(() => 
    initialSection && 
    typeof initialSection === 'string' && 
    validSections.includes(initialSection) 
    ? initialSection 
    : 'api', [initialSection, validSections])
  
  // 只在开发环境且组件首次挂载时输出日志
  if (process.env.NODE_ENV === 'development') {
    const isFirstRender = useRef(true)
    if (isFirstRender.current) {
      console.log('🚀 [DEBUG] SettingsDialog 初始化:', { 
        initialSection, 
        initialSectionType: typeof initialSection,
        validInitialSection,
        validSections,
        open 
      })
      isFirstRender.current = false
    }
  }
  
  // 跟踪是否首次渲染，避免重复日志
  const isFirstRenderRef = useRef(true)

  const [activeSection, setActiveSection] = useState<string>(validInitialSection)
  const [activeToolTab, setActiveToolTab] = useState<'management' | 'config' | 'dependencies'>('management')

  // 包装onOpenChange以触发自定义事件
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
    // 当对话框关闭时，触发自定义事件
    if (!newOpen) {
      window.dispatchEvent(new CustomEvent('global-settings-closed'))
    }
  }
  const [apiKey, setApiKey] = useState("")
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "success" | "error">("idle")
  const [validationMessage, setValidationMessage] = useState("")
  const [tmdbImportPath, setTmdbImportPath] = useState("")
  const directoryInputRef = useRef<HTMLInputElement>(null)

  // TMDB配置相关状态
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

  // 密码修改相关状态
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)

  // 只在开发环境且组件首次挂载时输出日志
  if (process.env.NODE_ENV === 'development' && isFirstRenderRef.current) {
    console.log('🚀 [DEBUG] SettingsDialog 初始化:', {
      initialSection,
      initialSectionType: typeof initialSection,
      validInitialSection,
      validSections,
      open
    })
    isFirstRenderRef.current = false
  }
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false)

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
    // AI筛选功能
    enableAIFilter: false,
    siliconFlowApiKey: "",
    siliconFlowModel: "Qwen/Qwen2.5-VL-32B-Instruct"
  })

  // 硅基流动API设置状态
  const [siliconFlowSettings, setSiliconFlowSettings] = useState({
    apiKey: "",
    // 缩略图AI筛选模型
    thumbnailFilterModel: "Qwen/Qwen2.5-VL-32B-Instruct"
  })

  const [showAdvancedVideoSettings, setShowAdvancedVideoSettings] = useState(false)
  const [showSiliconFlowApiKey, setShowSiliconFlowApiKey] = useState(false)
  const [apiActiveTab, setApiActiveTab] = useState("tmdb")
  // 帮助与支持页的标签状态（对齐 API 配置的标签式体验）
  const [helpActiveTab, setHelpActiveTab] = useState("about")
  const [siliconFlowSaving, setSiliconFlowSaving] = useState(false)

  // 魔搭社区API设置状态
  const [modelScopeSettings, setModelScopeSettings] = useState({
    apiKey: "",
    episodeGenerationModel: "Qwen/Qwen3-32B"
  })
  const [showModelScopeApiKey, setShowModelScopeApiKey] = useState(false)
  const [modelScopeSaving, setModelScopeSaving] = useState(false)
  const [isDockerEnv, setIsDockerEnv] = useState(false)
  const [isVersionDescriptionExpanded, setIsVersionDescriptionExpanded] = useState(false)
  const [appInfo, setAppInfo] = useState({
    name: 'TMDB Helper',
    version: '0.3.1',
    versionInfo: {
      title: '修复Docker环境配置保存问题',
      description: '',
      releaseDate: '2025-07-30'
    }
  })

  // 配置迁移对话框状态
  const [showMigrationDialog, setShowMigrationDialog] = useState(false)

  // 模型服务状态
  const [modelServiceTab, setModelServiceTab] = useState("providers")
  const [modelServiceConfig, setModelServiceConfig] = useState<any>(null)
  const [selectedProviderId, setSelectedProviderId] = useState<string>("")
    
  const [showProviderDialog, setShowProviderDialog] = useState(false)
  const [editingProvider, setEditingProvider] = useState<ModelProvider | null>(null)
  const [providerForm, setProviderForm] = useState({
    name: "",
    apiKey: "",
    apiBaseUrl: "",
  })
  const [customProviders, setCustomProviders] = useState<ModelProvider[]>([])
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionTestResult, setConnectionTestResult] = useState<{success: boolean; message: string} | null>(null)
  
  const [configuredModels, setConfiguredModels] = useState<ModelConfig[]>([])
  const [showModelDialog, setShowModelDialog] = useState(false)
  const [showAvailableModelsDialog, setShowAvailableModelsDialog] = useState(false)
  const [availableModels, setAvailableModels] = useState<any[]>([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [modelForm, setModelForm] = useState({
    modelId: "",
    displayName: "",
    capabilities: [] as string[]
  })
  const [scenarioSettings, setScenarioSettings] = useState<Record<string, {selectedModelIds: string[]; primaryModelId: string; parameters: any}>>({})
  const [expandedScenario, setExpandedScenario] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return

    console.log('🔄 [TMDB Debug] 开始初始化设置对话框...')

    // 从服务端加载配置
    const initializeSettings = () => {
      const loadConfig = async () => {
        try {
          console.log('🔄 [TMDB Debug] 从服务端加载配置...')

          // ⚠️ 关键修复：清除缓存确保获取最新配置
          ClientConfigManager.clearCache()
          console.log('🎨 [TMDB Debug] 已清除缓存，将从服务端获取最新配置')

          // 首先检查Docker环境
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
                console.log('🐳 [TMDB Debug] 检测到Docker环境:', {
                  importPath: dockerImportPath
                })
              }
            }
          } catch (error) {
            console.warn('⚠️ [TMDB Debug] Docker环境检查失败:', error)
            setIsDockerEnv(false)
          }

          // 从服务端获取配置
          const savedTmdbImportPath = await ClientConfigManager.getItem("tmdb_import_path")

          console.log('📖 [TMDB Debug] 服务端配置状态:', {
            hasImportPath: !!savedTmdbImportPath,
            importPath: savedTmdbImportPath,
            isDockerEnv
          })

          // 设置导入路径状态 - 优先级：Docker配置 > 服务端配置
          const finalImportPath = dockerImportPath || savedTmdbImportPath || ''
          setTmdbImportPath(finalImportPath)
          if (finalImportPath) {
            console.log('✅ [TMDB Debug] 导入路径已设置:', finalImportPath)
            loadTmdbConfig(finalImportPath)
          } else {
            console.log('⚠️ [TMDB Debug] 未找到保存的导入路径')
          }

        } catch (error) {
          console.error('❌ [TMDB Debug] 初始化设置失败:', error)
          // 确保至少设置空值
          setTmdbImportPath("")
        }
      }

      loadConfig()
    }

    // 立即执行初始化
    initializeSettings()

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
      })

    // 加载其他设置
    const loadOtherSettings = async () => {
      try {
        // 加载通用设置
        const savedGeneralSettings = await ClientConfigManager.getItem("general_settings")
        if (savedGeneralSettings) {
          const parsed = safeJsonParse<GeneralSettings>(savedGeneralSettings)
          if (parsed) {
            setGeneralSettings(parsed)
          } else {
            console.error('加载通用设置失败: 解析失败')
          }
        }

        // 加载外观设置
        const savedAppearanceSettings = await ClientConfigManager.getItem("appearance_settings")
        if (savedAppearanceSettings) {
          const saved = safeJsonParse<any>(savedAppearanceSettings)
          if (saved) {
            // 移除已废弃字段
            if ('detailBackdropOverlayOpacity' in saved) delete saved.detailBackdropOverlayOpacity
            // 兼容旧配置：与默认值合并
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
            // 应用主题设置
            applyThemeSettings(merged)
          } else {
            console.error('加载外观设置失败: 解析失败')
          }
        }

        // 加载视频缩略图设置
        const savedVideoThumbnailSettings = await ClientConfigManager.getItem("video_thumbnail_settings")
        if (savedVideoThumbnailSettings) {
          const settings = safeJsonParse<any>(savedVideoThumbnailSettings)
          if (settings) {
            setVideoThumbnailSettings(prev => ({
              ...prev,
              ...settings,
              // 确保数值正确
              startTime: Number(settings.startTime || prev.startTime),
              threadCount: Number(settings.threadCount || prev.threadCount),
              thumbnailCount: Number(settings.thumbnailCount || prev.thumbnailCount),
              frameInterval: Number(settings.frameInterval || prev.frameInterval),
              // AI筛选设置 - API密钥现在从全局设置中读取
              enableAIFilter: settings.enableAIFilter || prev.enableAIFilter,
              siliconFlowApiKey: "", // 将从全局设置中读取
              siliconFlowModel: settings.siliconFlowModel || prev.siliconFlowModel
            }))
          } else {
            console.error('加载视频缩略图设置失败: 解析失败')
          }
        }

        // 加载模型服务配置
        try {
          const response = await fetch('/api/model-service')
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.config) {
              setModelServiceConfig(data.config)
              // 初始化相关状态
              if (data.config.providers) {
                const customProviders = data.config.providers.filter((p: any) => p.isBuiltIn === false)
                setCustomProviders(customProviders)
              }
              if (data.config.models) {
                setConfiguredModels(data.config.models)
              }
              // 初始化场景设置
              if (data.config.scenarios) {
                const initialScenarioSettings: Record<string, any> = {}
                data.config.scenarios.forEach((scenario: any) => {
                  initialScenarioSettings[scenario.type] = {
                    selectedModelIds: scenario.selectedModelIds || [],
                    primaryModelId: scenario.primaryModelId || '',
                    parameters: scenario.parameters || {}
                  }
                })
                setScenarioSettings(initialScenarioSettings)
                console.log('✅ [Model Service] 场景设置已初始化')
              }
              console.log('✅ [Model Service] 模型服务配置已加载')
            }
          }
        } catch (error) {
          console.error('加载模型服务配置失败:', error)
        }

        // 从新的模型服务系统加载API设置
        try {
          const modelServiceResponse = await fetch('/api/model-service')
          if (modelServiceResponse.ok) {
            const { config } = await modelServiceResponse.json()

            // 查找硅基流动内置提供商的API密钥
            const siliconflowProvider = config.providers?.find(p => p.type === 'siliconflow' && p.isBuiltIn)
            if (siliconflowProvider) {
              setSiliconFlowSettings({
                apiKey: siliconflowProvider.apiKey || "",
                thumbnailFilterModel: "Qwen/Qwen2.5-VL-32B-Instruct"
              })
            }

            // 查找魔搭社区内置提供商的API密钥
            const modelscopeProvider = config.providers?.find(p => p.type === 'modelscope' && p.isBuiltIn)
            if (modelscopeProvider) {
              setModelScopeSettings({
                apiKey: modelscopeProvider.apiKey || "",
                episodeGenerationModel: "Qwen/Qwen3-32B"
              })
            }
          }
        } catch (error) {
          console.warn('从模型服务系统加载API设置失败:', error)
        }
      } catch (error) {
        console.error('加载其他设置失败:', error)
      }
    }

    loadOtherSettings()
  }, [])

  // ⚠️ 关键修复：每次打开设置对话框时都重新加载配置
  useEffect(() => {
    if (open && typeof window !== "undefined") {
      console.log('🔄 [TMDB Debug] 设置对话框打开，重新加载配置...')
      
      // 重新加载配置以获取最新状态
      const refreshConfig = async () => {
        try {
          // 清除缓存确保获取最新配置
          ClientConfigManager.clearCache()
          
          // 重新获取导入路径
          const currentImportPath = await ClientConfigManager.getItem("tmdb_import_path")
          if (currentImportPath) {
            setTmdbImportPath(currentImportPath)
            console.log('✅ [TMDB Debug] 刷新后的导入路径:', currentImportPath)
          }

          // 重新获取模型服务配置
          try {
            const response = await fetch('/api/model-service')
            if (response.ok) {
              const data = await response.json()
              if (data.success && data.config) {
                setModelServiceConfig(data.config)
                // 刷新相关状态
                if (data.config.providers) {
                  const customProviders = data.config.providers.filter((p: any) => p.isBuiltIn === false)
                  setCustomProviders(customProviders)
                }
                if (data.config.models) {
                  setConfiguredModels(data.config.models)
                }
                // 刷新场景设置
                if (data.config.scenarios) {
                  const updatedScenarioSettings: Record<string, any> = {}
                  data.config.scenarios.forEach((scenario: any) => {
                    updatedScenarioSettings[scenario.type] = {
                      selectedModelIds: scenario.selectedModelIds || [],
                      primaryModelId: scenario.primaryModelId || '',
                      parameters: scenario.parameters || {}
                    }
                  })
                  setScenarioSettings(updatedScenarioSettings)
                  console.log('✅ [Model Service] 场景设置已刷新')
                }
                console.log('✅ [Model Service] 模型服务配置已刷新')
              }
            }
          } catch (error) {
            console.error('刷新模型服务配置失败:', error)
          }
        } catch (error) {
          console.error('❌ [TMDB Debug] 刷新配置失败:', error)
        }
      }
      
      refreshConfig()
    }
  }, [open])

  // 监听模型服务配置更新事件，同步场景设置
  useEffect(() => {
    if (typeof window === "undefined") return

    const handleConfigUpdate = async () => {
      console.log('🔄 [Settings Dialog] 模型服务配置更新事件触发，同步场景设置')

      try {
        const response = await fetch('/api/model-service')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.config) {
            // 更新配置状态
            setConfiguredModels(data.config.models || [])
            setCustomProviders(data.config.providers?.filter((p: any) => p.isBuiltIn === false) || [])

            // 更新内置提供商的API密钥状态
            const siliconflowProvider = data.config.providers?.find((p: any) => p.type === 'siliconflow' && p.isBuiltIn)
            if (siliconflowProvider) {
              setSiliconFlowSettings(prev => ({ ...prev, apiKey: siliconflowProvider.apiKey || '' }))
            }

            const modelscopeProvider = data.config.providers?.find((p: any) => p.type === 'modelscope' && p.isBuiltIn)
            if (modelscopeProvider) {
              setModelScopeSettings(prev => ({ ...prev, apiKey: modelscopeProvider.apiKey || '' }))
            }

            // 同步场景设置，使用 getScenarioModels 逻辑过滤无效模型
            const updatedScenarioSettings: Record<string, any> = {}

            data.config.scenarios.forEach((scenario: any) => {
              // 过滤出实际存在的模型ID (复用 getScenarioModels 的逻辑)
              const validModelIds = scenario.selectedModelIds?.filter((modelId: string) =>
                data.config.models.some((model: any) => model.id === modelId)
              ) || []

              // 如果主模型不在有效列表中，则重新选择
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
            console.log('✅ [Settings Dialog] 场景设置已同步更新，无效模型已清理')
          }
        }
      } catch (error) {
        console.error('[Settings Dialog] 同步场景设置失败:', error)
      }
    }

    window.addEventListener('model-service-config-updated', handleConfigUpdate)

    return () => {
      window.removeEventListener('model-service-config-updated', handleConfigUpdate)
    }
  }, [])

  // 监听initialSection变化，当对话框打开时设置活动页面
  useEffect(() => {
    if (open && initialSection && typeof initialSection === 'string') {
      // 只在开发环境且section实际有效时输出日志
      if (process.env.NODE_ENV === 'development' && validSections.includes(initialSection)) {
        console.log('🔄 [DEBUG] useEffect设置activeSection:', {
          initialSection,
          type: typeof initialSection,
          isValidSection: validSections.includes(initialSection)
        })
      }
      
      // 确保只设置有效的section
      if (validSections.includes(initialSection)) {
        setActiveSection(initialSection)
        // 如果是API配置，自动切换到硅基流动API标签页
        if (initialSection === "api") {
          setApiActiveTab("siliconflow")
        }
      } else {
        console.warn('⚠️ [DEBUG] 收到无效的initialSection，忽略:', initialSection)
      }
    }
  }, [open, initialSection, validSections])

  // 应用主题设置
  const applyThemeSettings = (settings: AppearanceSettings) => {
    const root = document.documentElement

    // 应用主题模式
    if (settings.theme === 'dark') {
      root.classList.add('dark')
    } else if (settings.theme === 'light') {
      root.classList.remove('dark')
    } else {
      // 系统主题
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }
    }

    // 应用主色调
    root.setAttribute('data-primary-color', settings.primaryColor)

    // 应用字体大小
    const fontSizeMap = {
      small: '14px',
      medium: '16px',
      large: '18px'
    }
    root.style.fontSize = fontSizeMap[settings.fontSize]

    // 应用紧凑模式
    if (settings.compactMode) {
      root.classList.add('compact-mode')
    } else {
      root.classList.remove('compact-mode')
    }

    // 应用动画设置
    if (!settings.showAnimations) {
      root.classList.add('no-animations')
    } else {
      root.classList.remove('no-animations')
    }
  }

  // 保存通用设置
  const saveGeneralSettings = async () => {
    try {
      // 检查是否在Docker环境中
      const dockerConfigResponse = await fetch('/api/system/docker-config')
      const dockerConfigData = await dockerConfigResponse.json()

      if (dockerConfigData.success && dockerConfigData.config.isDockerEnvironment) {
        // Docker环境：保存到服务器端文件系统
        const saveResponse = await fetch('/api/system/docker-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            generalSettings: generalSettings
          })
        })

        const saveData = await saveResponse.json()
        if (!saveData.success) {
          throw new Error(saveData.error || '保存失败')
        }
      } else {
        // 保存到服务端配置
        await ClientConfigManager.setItem("general_settings", JSON.stringify(generalSettings))
      }

      toast({
        title: "成功",
        description: "通用设置已保存",
      })
    } catch (error) {
      toast({
        title: "错误",
        description: "保存通用设置失败",
        variant: "destructive",
      })
    }
  }

  // 保存外观设置
  const saveAppearanceSettings = async () => {
    try {
      // 检查是否在Docker环境中
      const dockerConfigResponse = await fetch('/api/system/docker-config')
      const dockerConfigData = await dockerConfigResponse.json()

      if (dockerConfigData.success && dockerConfigData.config.isDockerEnvironment) {
        // Docker环境：保存到服务器端文件系统
        const saveResponse = await fetch('/api/system/docker-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            appearanceSettings: appearanceSettings
          })
        })

        const saveData = await saveResponse.json()
        if (!saveData.success) {
          throw new Error(saveData.error || '保存失败')
        }
      } else {
        // 保存到服务端配置
        await ClientConfigManager.setItem("appearance_settings", JSON.stringify(appearanceSettings))
      }

      applyThemeSettings(appearanceSettings)
      toast({
        title: "成功",
        description: "外观设置已保存并应用",
      })
    } catch (error) {
      toast({
        title: "错误",
        description: "保存外观设置失败",
        variant: "destructive",
      })
    }
  }

  // 保存视频缩略图设置
  const saveVideoThumbnailSettings = async () => {
    try {
      // 检查是否在Docker环境中
      const dockerConfigResponse = await fetch('/api/system/docker-config')
      const dockerConfigData = await dockerConfigResponse.json()

      if (dockerConfigData.success && dockerConfigData.config.isDockerEnvironment) {
        // Docker环境：保存到服务器端文件系统
        const saveResponse = await fetch('/api/system/docker-config', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            videoThumbnailSettings: videoThumbnailSettings
          })
        })

        const saveData = await saveResponse.json()
        if (!saveData.success) {
          throw new Error(saveData.error || '保存失败')
        }
      } else {
        // 保存到服务端配置
        await ClientConfigManager.setItem("video_thumbnail_settings", JSON.stringify(videoThumbnailSettings))
      }

      toast({
        title: "成功",
        description: "视频缩略图设置已保存",
      })
    } catch (error) {
      toast({
        title: "错误",
        description: "保存视频缩略图设置失败",
        variant: "destructive",
      })
    }
  }

  // 加载TMDB配置
  const loadTmdbConfig = async (path: string) => {
    if (!path) return

    setConfigLoading(true)
    try {
      const response = await fetch(`/api/external/tmdb-config?path=${encodeURIComponent(path)}`)
      const data = await response.json()

      if (data.success && data.config) {
        setTmdbConfig({
          encoding: data.config.encoding || 'utf-8-sig',
          logging_level: data.config.logging_level || 'INFO',
          save_user_profile: data.config.save_user_profile !== false,
          tmdb_username: data.config.tmdb_username || '',
          tmdb_password: data.config.tmdb_password || '',
          backdrop_forced_upload: data.config.backdrop_forced_upload === true,
          filter_words: data.config.filter_words || ''
        })
      }
    } catch (error) {
      console.error('加载TMDB配置失败:', error)
    } finally {
      setConfigLoading(false)
    }
  }

  // 保存TMDB配置
  const saveTmdbConfig = async () => {
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
      console.error('保存TMDB配置失败:', error)
      toast({
        title: "错误",
        description: `保存TMDB配置失败: ${error instanceof Error ? error.message : '未知错误'}`,
        variant: "destructive",
      })
    } finally {
      setConfigSaving(false)
    }
  }

  const handleSave = async () => {
    setSaveStatus("saving")
    setValidationMessage("")

    try {
      switch (activeSection) {
        case "general":
          console.log('🗺️ [DEBUG] 保存通用设置')
          saveGeneralSettings()
          break

        case "appearance":
          console.log('🎨 [DEBUG] 保存外观设置')
          saveAppearanceSettings()
          break

        case "video-thumbnail":
          console.log('🎥 [DEBUG] 保存视频缩略图设置')
          saveVideoThumbnailSettings()
          break

        case "model-service":
          console.log('🤖 [DEBUG] 保存模型服务设置')

          // 更新模型服务提供商配置
          await Promise.all([
            fetch('/api/model-service', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'update-provider',
                data: {
                  id: 'siliconflow-builtin',
                  apiKey: siliconFlowSettings.apiKey
                }
              })
            }),
            fetch('/api/model-service', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'update-provider',
                data: {
                  id: 'modelscope-builtin',
                  apiKey: modelScopeSettings.apiKey
                }
              })
            })
          ])

          // 触发全局配置更新事件，通知页面刷新提供商数据
          window.dispatchEvent(new CustomEvent('model-service-config-updated'))

          // 保存使用场景配置到模型服务
          try {
            const scenariosResponse = await fetch('/api/model-service')
            const scenariosData = await scenariosResponse.json()

            if (scenariosData.success && scenariosData.config.scenarios) {
              // 获取当前场景设置并合并
              const updatedScenarios = scenariosData.config.scenarios.map(scenario => {
                const setting = scenarioSettings[scenario.type]
                if (setting) {
                  return {
                    ...scenario,
                    selectedModelIds: setting.selectedModelIds || [],
                    primaryModelId: setting.primaryModelId || setting.selectedModelIds?.[0] || '',
                    parameters: setting.parameters || {}
                  }
                }
                return scenario
              })

              const saveResponse = await fetch('/api/model-service', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  action: 'update-scenarios',
                  data: updatedScenarios
                })
              })

              const saveResult = await saveResponse.json()
              if (!saveResult.success) {
                throw new Error(saveResult.error || '场景配置保存失败')
              }
              console.log('✅ [DEBUG] 场景配置保存成功')

              // 触发全局事件通知模型服务配置已更新
              window.dispatchEvent(new CustomEvent('model-service-config-updated'))
            }
          } catch (error) {
            console.error('❌ [DEBUG] 场景配置保存失败:', error)
            throw new Error('场景配置保存失败')
          }
          break

        case "tools":
          console.log('🔧 [DEBUG] 保存工具设置')
          await saveTmdbConfig()
          break

        default:
          console.warn('⚠️ [DEBUG] 未知的activeSection:', activeSection)
          console.log('⚠️ [DEBUG] 尝试作为API设置处理...')
          // 如果是未知的section，尝试作为API配置处理
          if (apiKey && apiKey.trim() !== '') {
            console.log('💾 [DEBUG] 强制执行API密钥保存逻辑')
            try {
              await ClientConfigManager.setItem("tmdb_api_key", apiKey)
              console.log('✅ [DEBUG] 强制API密钥保存成功')
            } catch (error) {
              console.error('❌ [DEBUG] 强制API密钥保存失败:', error)
              throw error
            }
          }
          break
      }

      console.log('✅ [DEBUG] 保存成功，设置成功状态')
      setSaveStatus("success")
      setValidationMessage("设置已成功保存")

      setTimeout(() => {
        setSaveStatus("idle")
        setValidationMessage("")
      }, 2000)
    } catch (error) {
      console.error('❌ [DEBUG] handleSave函数总体失败:', error)
      setSaveStatus("error")
      setValidationMessage("保存失败，请重试")
    }
  }

  const handleCancel = () => {
    handleOpenChange(false)
    setSaveStatus("idle")
    setValidationMessage("")

    if (typeof window === "undefined") return

    // 从服务端恢复配置
    const restoreFromServer = async () => {
      try {
        // 从服务端获取配置
        const savedTmdbImportPath = await ClientConfigManager.getItem("tmdb_import_path")

        // 恢复导入路径状态
        if (savedTmdbImportPath) {
          setTmdbImportPath(savedTmdbImportPath)
        }

      } catch (error) {
        console.error('❌ 恢复配置失败:', error)
      }
    }

    restoreFromServer()
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

  // 密码修改处理函数
  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "错误",
        description: "请填写所有密码字段",
        variant: "destructive",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "错误",
        description: "新密码和确认密码不匹配",
        variant: "destructive",
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: "错误",
        description: "新密码长度至少为6位",
        variant: "destructive",
      })
      return
    }

    setPasswordChangeLoading(true)
    try {
      await changePassword(currentPassword, newPassword)
      toast({
        title: "成功",
        description: "密码修改成功",
      })
      // 清空表单
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error) {
      toast({
        title: "错误",
        description: error instanceof Error ? error.message : "密码修改失败",
        variant: "destructive",
      })
    } finally {
      setPasswordChangeLoading(false)
    }
  }

  // 设置菜单项
  const settingsMenuItems = [
    {
      id: "model-service",
      label: "模型服务",
      icon: Database,
      description: "模型提供商和配置管理"
    },
    {
      id: "tools",
      label: "工具配置",
      icon: Terminal,
      description: "TMDB-Import工具设置"
    },
    {
      id: "video-thumbnail",
      label: "缩略图设置",
      icon: Film,
      description: "视频缩略图提取设置"
    },
    {
      id: "general",
      label: "通用设置",
      icon: Settings,
      description: "应用程序通用配置"
    },
    {
      id: "appearance",
      label: "外观设置",
      icon: Palette,
      description: "主题和界面设置"
    },
    {
      id: "security",
      label: "账户安全",
      icon: Shield,
      description: "密码修改和安全设置"
    },
    {
      id: "help",
      label: "帮助与支持",
      icon: HelpCircle,
      description: "帮助文档和应用信息"
    }
  ]

  // 渲染设置内容的函数
  function renderSettingsContent() {
    switch (activeSection) {
      case "model-service":
        return renderModelService()
      case "tools":
        return renderToolsSettings()
      case "video-thumbnail":
        return renderVideoThumbnailSettings()
      case "general":
        return renderGeneralSettings()
      case "appearance":
        return renderAppearanceSettings()
      case "security":
        return renderSecuritySettings()
      case "help":
        return renderHelpSettings()
      default:
        return renderModelService()
    }
  }

  // 模型服务设置
  function renderModelService() {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">模型服务</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            管理AI模型提供商、模型配置和使用场景
          </p>
        </div>

        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setModelServiceTab("providers")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${modelServiceTab === "providers"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
            >
              模型提供商
            </button>
            <button
              onClick={() => setModelServiceTab("models")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${modelServiceTab === "models"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
            >
              模型配置
            </button>
            <button
              onClick={() => setModelServiceTab("scenarios")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${modelServiceTab === "scenarios"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
            >
              使用场景
            </button>
          </nav>
        </div>

        {modelServiceTab === "providers" && renderModelProviders()}
        {modelServiceTab === "models" && renderModelConfigs()}
        {modelServiceTab === "scenarios" && renderUsageScenarios()}
      </div>
    )
  }

  const handleAddProvider = () => {
    setEditingProvider(null)
    setProviderForm({ name: "", apiKey: "", apiBaseUrl: "" })
    setConnectionTestResult(null)
    setShowProviderDialog(true)
  }

  const handleEditProvider = (provider: ModelProvider) => {
    setEditingProvider(provider)
    setProviderForm({
      name: provider.name,
      apiKey: provider.apiKey,
      apiBaseUrl: provider.apiBaseUrl
    })
    setConnectionTestResult(null)
    setShowProviderDialog(true)
  }

  const handleDeleteProvider = async (providerId: string) => {
    if (!confirm("确定要删除此提供商吗?")) return

    try {
      await fetch('/api/model-service', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-provider',
          data: { id: providerId }
        })
      })

      const newProviders = customProviders.filter(p => p.id !== providerId)
      setCustomProviders(newProviders)
      
      // 触发模型服务配置更新事件，确保界面同步
      window.dispatchEvent(new CustomEvent('model-service-config-updated'))
      
      toast({ title: "删除成功", description: "提供商已从本地删除" })
    } catch (error) {
      console.error('删除提供商失败:', error)
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: "destructive"
      })
    }
  }

  const handleSaveProvider = async () => {
    if (!providerForm.name || !providerForm.apiKey || !providerForm.apiBaseUrl) {
      toast({ title: "验证失败", description: "请填写所有必填字段", variant: "destructive" })
      return
    }

    try {
      let provider: ModelProvider

      if (editingProvider) {
        provider = {
          ...editingProvider,
          ...providerForm,
          updatedAt: Date.now()
        }
        await fetch('/api/model-service', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update-provider',
            data: provider
          })
        })
        setCustomProviders(customProviders.map(p => p.id === editingProvider.id ? provider : p))
        toast({ title: "更新成功", description: "提供商配置已更新到本地" })
      } else {
        provider = {
          id: `custom-${Date.now()}`,
          ...providerForm,
          type: 'custom',
          enabled: true,
          isBuiltIn: false,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        await fetch('/api/model-service', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'add-provider',
            data: provider
          })
        })
        setCustomProviders([...customProviders, provider])
        toast({ title: "添加成功", description: "自定义提供商已保存到本地" })
      }
      
      // 触发模型服务配置更新事件，确保界面同步
      window.dispatchEvent(new CustomEvent('model-service-config-updated'))
      
      setShowProviderDialog(false)
    } catch (error) {
      console.error('保存提供商失败:', error)
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: "destructive"
      })
    }
  }

  const handleTestConnection = async () => {
    setTestingConnection(true)
    setConnectionTestResult(null)
    
    try {
      const response = await fetch('/api/model-service/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: providerForm.apiKey,
          apiBaseUrl: providerForm.apiBaseUrl
        })
      })
      
      const result = await response.json()
      setConnectionTestResult(result)
      
      if (result.success) {
        toast({ title: "连接成功", description: result.message })
      } else {
        toast({ title: "连接失败", description: result.message, variant: "destructive" })
      }
    } catch (error) {
      setConnectionTestResult({ success: false, message: "连接测试失败" })
      toast({ title: "测试失败", description: "无法连接到服务器", variant: "destructive" })
    } finally {
      setTestingConnection(false)
    }
  }

  
  function renderModelProviders() {
    return (
      <div className="space-y-6 mt-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>内置提供商</CardTitle>
              <Button onClick={handleAddProvider} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                添加自定义提供商
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">硅基流动</h4>
                <Badge>内置</Badge>
              </div>
              <p className="text-sm text-gray-500 mb-4">提供视觉和对话模型服务</p>
              <div className="space-y-3">
                <div>
                  <Label>API密钥</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showSiliconFlowApiKey ? "text" : "password"}
                      value={siliconFlowSettings.apiKey}
                      onChange={(e) => setSiliconFlowSettings({...siliconFlowSettings, apiKey: e.target.value})}
                      placeholder="输入硅基流动API密钥"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowSiliconFlowApiKey(!showSiliconFlowApiKey)}
                    >
                      {showSiliconFlowApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>API地址</Label>
                  <Input
                    value="https://api.siliconflow.cn/v1"
                    disabled
                    className="bg-gray-50 dark:bg-gray-900"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">魔搭社区</h4>
                <Badge>内置</Badge>
              </div>
              <p className="text-sm text-gray-500 mb-4">提供对话和文本生成模型</p>
              <div className="space-y-3">
                <div>
                  <Label>API密钥</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showModelScopeApiKey ? "text" : "password"}
                      value={modelScopeSettings.apiKey}
                      onChange={(e) => setModelScopeSettings({...modelScopeSettings, apiKey: e.target.value})}
                      placeholder="输入魔搭社区API密钥"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowModelScopeApiKey(!showModelScopeApiKey)}
                    >
                      {showModelScopeApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label>API地址</Label>
                  <Input
                    value="https://api-inference.modelscope.cn/v1"
                    disabled
                    className="bg-gray-50 dark:bg-gray-900"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 自定义提供商列表 */}
        {customProviders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">已添加的自定义提供商</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {customProviders
                  .filter(provider => provider && provider.id && provider.name)
                  .map(provider => (
                  <div key={provider.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{provider.name || '未知提供商'}</h4>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditProvider(provider)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteProvider(provider.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">{provider.apiBaseUrl || '未知地址'}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={showProviderDialog} onOpenChange={setShowProviderDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingProvider ? "编辑提供商" : "添加自定义提供商"}</DialogTitle>
              <DialogDescription>
                配置兼容OpenAI API的模型提供商
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="provider-name">提供商名称 *</Label>
                <Input
                  id="provider-name"
                  value={providerForm.name}
                  onChange={(e) => setProviderForm({...providerForm, name: e.target.value})}
                  placeholder="例如: OpenAI"
                />
              </div>
              <div>
                <Label htmlFor="provider-url">API地址 *</Label>
                <Input
                  id="provider-url"
                  value={providerForm.apiBaseUrl}
                  onChange={(e) => setProviderForm({...providerForm, apiBaseUrl: e.target.value})}
                  placeholder="https://api.openai.com/v1"
                />
              </div>
              <div>
                <Label htmlFor="provider-key">API密钥 *</Label>
                <Input
                  id="provider-key"
                  type="password"
                  value={providerForm.apiKey}
                  onChange={(e) => setProviderForm({...providerForm, apiKey: e.target.value})}
                  placeholder="sk-..."
                />
              </div>
              
              {connectionTestResult && (
                <div className={`p-3 rounded-lg ${connectionTestResult.success ? 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800'} border`}>
                  <div className="flex items-start gap-2">
                    {connectionTestResult.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                    )}
                    <div>
                      <p className={`text-sm font-medium ${connectionTestResult.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>
                        {connectionTestResult.success ? "连接成功" : "连接失败"}
                      </p>
                      <p className={`text-sm ${connectionTestResult.success ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        {connectionTestResult.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testingConnection || !providerForm.apiKey || !providerForm.apiBaseUrl}
                  className="flex-1"
                >
                  {testingConnection ? "测试中..." : "测试连接"}
                </Button>
                <Button onClick={handleSaveProvider} className="flex-1">
                  {editingProvider ? "更新" : "添加"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  const handleFetchModels = async (providerId: string) => {
    setLoadingModels(true)
    try {
      let apiKey = ""
      let apiBaseUrl = ""
      
      if (providerId === "siliconflow-builtin") {
        apiKey = siliconFlowSettings.apiKey
        apiBaseUrl = "https://api.siliconflow.cn/v1"
      } else if (providerId === "modelscope-builtin") {
        apiKey = modelScopeSettings.apiKey
        apiBaseUrl = "https://api-inference.modelscope.cn/v1"
      } else {
        const provider = customProviders.find(p => p.id === providerId)
        if (provider) {
          apiKey = provider.apiKey
          apiBaseUrl = provider.apiBaseUrl
        }
      }
      
      if (!apiKey) {
        toast({ title: "错误", description: "请先配置API密钥", variant: "destructive" })
        setLoadingModels(false)
        return
      }
      
      const response = await fetch('/api/model-service/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, apiBaseUrl })
      })

      const result = await response.json()
      if (result.success && result.models) {
        // 标准化模型数据格式
        const normalizedModels = result.models.map((model: any) => ({
          id: model.id || model.model,
          object: model.object || 'model',
          created: model.created || Date.now(),
          owned_by: model.owned_by || providerId
        }))
        setAvailableModels(normalizedModels)
        setShowAvailableModelsDialog(true)
        toast({ title: "成功", description: `获取到 ${normalizedModels.length} 个模型` })
      } else {
        toast({ title: "失败", description: result.message || "获取模型列表失败", variant: "destructive" })
      }
    } catch (error) {
      toast({ title: "错误", description: "获取模型列表失败", variant: "destructive" })
    } finally {
      setLoadingModels(false)
    }
  }

  const handleAddModel = () => {
    setModelForm({ modelId: "", displayName: "", capabilities: [] })
    setShowModelDialog(true)
  }

  const handleSaveModel = async () => {
    if (!modelForm.modelId || !selectedProviderId) {
      toast({ title: "验证失败", description: "请填写必填字段", variant: "destructive" })
      return
    }

    const newModel: ModelConfig = {
      id: `model-${Date.now()}`,
      providerId: selectedProviderId,
      modelId: modelForm.modelId,
      displayName: modelForm.displayName || modelForm.modelId,
      capabilities: modelForm.capabilities,
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }

    try {
      // 调用API保存模型
      const response = await fetch('/api/model-service', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add-model',
          data: newModel
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setConfiguredModels([...configuredModels, newModel])
          setShowModelDialog(false)
          setModelForm({ modelId: "", displayName: "", capabilities: [] })

          // 触发全局配置更新事件
          window.dispatchEvent(new CustomEvent('model-service-config-updated'))

          toast({ title: "添加成功", description: "模型已保存到本地" })
        } else {
          throw new Error(result.error || '保存失败')
        }
      } else {
        throw new Error('保存失败')
      }
    } catch (error) {
      console.error('保存模型失败:', error)
      toast({
        title: "保存失败",
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: "destructive"
      })
    }
  }

  const handleDeleteModel = async (modelId: string) => {
    if (!confirm("确定要删除此模型吗?")) return

    try {
      const response = await fetch('/api/model-service', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete-model',
          data: { id: modelId }
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setConfiguredModels(configuredModels.filter(m => m.id !== modelId))

          // 触发全局配置更新事件
          window.dispatchEvent(new CustomEvent('model-service-config-updated'))

          toast({ title: "删除成功", description: "模型已从本地删除" })
        } else {
          throw new Error(result.error || '删除失败')
        }
      } else {
        throw new Error('删除失败')
      }
    } catch (error) {
      console.error('删除模型失败:', error)
      toast({
        title: "删除失败",
        description: error instanceof Error ? error.message : '请稍后重试',
        variant: "destructive"
      })
    }
  }

  function renderModelConfigs() {
    const allProviders = [
      { id: "siliconflow-builtin", name: "硅基流动", type: "builtin" },
      { id: "modelscope-builtin", name: "魔搭社区", type: "builtin" },
      ...customProviders.filter(p => p && p.id && p.name && !["siliconflow-builtin", "modelscope-builtin"].includes(p.id))
    ]

    const allModels = configuredModels

    // 获取所有提供商列表（供弹窗使用）
    const getAllProviders = () => [
      { id: "siliconflow-builtin", name: "硅基流动", type: "builtin" },
      { id: "modelscope-builtin", name: "魔搭社区", type: "builtin" },
      ...customProviders.filter(p => p && p.id && p.name && !["siliconflow-builtin", "modelscope-builtin"].includes(p.id))
    ]

    // 获取所有模型列表（供弹窗使用）
    const getAllModels = () => configuredModels

    return (
      <div className="space-y-6 mt-6">
        <div className="flex items-center gap-4">
          <Select value={selectedProviderId} onValueChange={(value) => {
          setSelectedProviderId(value)
          // 切换提供商时清空可用模型列表
          setAvailableModels([])
        }}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="选择提供商" />
            </SelectTrigger>
            <SelectContent>
              {allProviders.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            onClick={() => selectedProviderId && handleFetchModels(selectedProviderId)}
            disabled={!selectedProviderId || loadingModels}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loadingModels ? 'animate-spin' : ''}`} />
            {loadingModels ? "获取中..." : "获取模型列表"}
          </Button>

          <Button onClick={handleAddModel} disabled={!selectedProviderId}>
            <Plus className="h-4 w-4 mr-2" />
            添加模型
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>已配置模型</CardTitle>
            <p className="text-sm text-gray-500">管理可用的AI模型</p>
          </CardHeader>
          <CardContent>
            {allModels.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Film className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>暂无配置的模型</p>
              </div>
            ) : (
              <div className="space-y-3">
                {allModels.map(model => {
                  const provider = allProviders.find(p => p.id === model.providerId)

                  return (
                    <div key={`${model.id}-${model.providerId}`} className="p-3 border rounded flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{model.displayName}</p>
                        </div>
                        <p className="text-sm text-gray-500">{provider?.name} • {model.modelId}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          {model.capabilities?.map(cap => (
                            <Badge key={cap} variant="outline" className="text-xs">{cap}</Badge>
                          ))}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteModel(model.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 可用模型列表弹窗 */}
        <Dialog open={showAvailableModelsDialog} onOpenChange={setShowAvailableModelsDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>可用模型列表</DialogTitle>
              <DialogDescription>
                从 {(() => {
                  const providers = [
                    { id: "siliconflow-builtin", name: "硅基流动", type: "builtin" },
                    { id: "modelscope-builtin", name: "魔搭社区", type: "builtin" },
                    ...customProviders
                  ]
                  return providers.find(p => p.id === selectedProviderId)?.name
                })()} 获取的模型
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableModels.map((model, index) => {
                  const isAlreadyConfigured = configuredModels.some(m => m.modelId === model.id)
                  return (
                    <div
                      key={index}
                      className={`p-3 border rounded flex items-center justify-between transition-colors ${
                        isAlreadyConfigured
                          ? 'bg-gray-50 dark:bg-gray-900 opacity-60'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                      }`}
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{model.id}</p>
                        {model.object && (
                          <p className="text-xs text-gray-500">类型: {model.object}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isAlreadyConfigured ? (
                          <Badge variant="secondary" className="text-xs">已添加</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setModelForm({
                                modelId: model.id,
                                displayName: model.id,
                                capabilities: []
                              })
                              setShowAvailableModelsDialog(false)
                              setShowModelDialog(true)
                            }}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            添加
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAvailableModelsDialog(false)}>
                关闭
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showModelDialog} onOpenChange={setShowModelDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加模型</DialogTitle>
              <DialogDescription>
                从提供商添加新的AI模型
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {availableModels.length > 0 ? (
                <div>
                  <Label>从列表选择</Label>
                  <Select
                    value={modelForm.modelId}
                    onValueChange={(value) => {
                      const selected = availableModels.find(m => m.id === value)
                      setModelForm({
                        modelId: value,
                        displayName: selected?.id || value,
                        capabilities: []
                      })
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="选择模型" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map((model, index) => (
                        <SelectItem key={`${model.id}-${index}`} value={model.id}>
                          {model.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div>
                  <Label>模型ID *</Label>
                  <Input
                    value={modelForm.modelId}
                    onChange={(e) => setModelForm({...modelForm, modelId: e.target.value})}
                    placeholder="例如: gpt-4"
                  />
                </div>
              )}
              
              <div>
                <Label>显示名称</Label>
                <Input
                  value={modelForm.displayName}
                  onChange={(e) => setModelForm({...modelForm, displayName: e.target.value})}
                  placeholder="可选,默认使用模型ID"
                />
              </div>
              
              <div>
                <Label>模型能力</Label>
                <div className="flex gap-2 mt-2">
                  {['vision', 'chat', 'audio'].map(cap => (
                    <Button
                      key={cap}
                      variant={modelForm.capabilities.includes(cap) ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const newCaps = modelForm.capabilities.includes(cap)
                          ? modelForm.capabilities.filter(c => c !== cap)
                          : [...modelForm.capabilities, cap]
                        setModelForm({...modelForm, capabilities: newCaps})
                      }}
                    >
                      {cap}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowModelDialog(false)}>
                  取消
                </Button>
                <Button onClick={handleSaveModel}>
                  添加
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  function renderUsageScenarios() {
    const allModels = configuredModels
    const allProviders = [
      { id: "siliconflow-builtin", name: "硅基流动" },
      { id: "modelscope-builtin", name: "魔搭社区" },
      ...customProviders.filter(p => p && p.id && p.name)
    ]

    const scenarios: UsageScenario[] = [
      {
        type: 'thumbnail_filter',
        label: '视频缩略图智能筛选',
        description: '用于"视频缩略图提取"页面的AI智能筛选功能，自动识别包含人物且无字幕的优质帧',
        requiredCapabilities: ['vision']
      },
      {
        type: 'image_analysis',
        label: '影视图像识别分析',
        description: '用于"影视识别"页面的图像分析功能，识别影视作品海报、剧照并进行内容分析',
        requiredCapabilities: ['vision']
      },
      {
        type: 'speech_to_text',
        label: '视频语音识别转文字',
        description: '用于"分集简介-AI生成"页面的音频转写功能，将视频中的语音转换为文字用于生成简介',
        requiredCapabilities: ['audio']
      },
      {
        type: 'episode_generation',
        label: '分集简介AI生成',
        description: '用于"分集简介-AI生成"页面，基于视频内容或字幕生成精彩的分集简介',
        requiredCapabilities: ['chat']
      },
      {
        type: 'ai_chat',
        label: 'AI智能对话助手',
        description: '用于"分集简介-AI对话"页面，提供智能对话、问答和内容创作服务',
        requiredCapabilities: ['chat']
      },
      {
        type: 'subtitle_ocr',
        label: '硬字幕OCR识别',
        description: '用于"硬字幕提取"页面，通过多模态视觉模型识别视频帧中的硬字幕文本',
        requiredCapabilities: ['vision']
      }
    ]

    // 将保存函数暴露给父组件
    if (typeof window !== 'undefined') {
      (window as any).saveScenarioConfig = async () => {
        try {
          // 构建场景配置
          const updatedScenarios = Object.entries(scenarioSettings).map(([type, setting]) => {
            const baseScenario = scenarios.find(s => s.type === type)
            return {
              type,
              label: baseScenario?.label || type,
              description: baseScenario?.description || '',
              selectedModelIds: setting.selectedModelIds || [],
              primaryModelId: setting.primaryModelId || setting.selectedModelIds?.[0] || '',
              requiredCapabilities: baseScenario?.requiredCapabilities || []
            }
          })

          // 保存到服务器
          const response = await fetch('/api/model-service', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update-scenarios',
              data: updatedScenarios
            })
          })

          if (response.ok) {
            return { success: true }
          } else {
            throw new Error('保存失败')
          }
        } catch (error) {
          return { success: false, error: error instanceof Error ? error.message : '未知错误' }
        }
      }
    }

    const getCompatibleModels = (requiredCapabilities: string[]) => {
      return allModels.filter(model =>
        requiredCapabilities.every(cap => model.capabilities?.includes(cap))
      )
    }

    // 事件处理函数
    const handleModelToggle = async (scenarioType: string, modelId: string, checked: boolean) => {
      const currentSetting = scenarioSettings[scenarioType]
      const selectedModelIds = currentSetting?.selectedModelIds || []
      const primaryModelId = currentSetting?.primaryModelId || selectedModelIds[0] || ""

      let newSelectedIds: string[]
      if (checked) {
        newSelectedIds = [...selectedModelIds, modelId]
      } else {
        newSelectedIds = selectedModelIds.filter(id => id !== modelId)
      }

      // 如果移除的是主模型，则重新选择主模型
      let newPrimaryId = primaryModelId
      if (!checked && primaryModelId === modelId) {
        newPrimaryId = newSelectedIds[0] || ""
      }
      // 如果添加模型且当前没有主模型，则自动将新模型设为主模型
      else if (checked && !primaryModelId) {
        newPrimaryId = modelId
      }

      // 更新本地状态
      setScenarioSettings({
        ...scenarioSettings,
        [scenarioType]: {
          ...currentSetting,
          selectedModelIds: newSelectedIds,
          primaryModelId: newPrimaryId,
          parameters: currentSetting?.parameters || {}
        }
      })

      // 立即同步到服务器
      await updateScenario(scenarioType, newSelectedIds, newPrimaryId)
    }

    const handlePrimaryModelChange = async (scenarioType: string, modelId: string) => {
      const currentSetting = scenarioSettings[scenarioType]
      const selectedModelIds = currentSetting?.selectedModelIds || []

      // 更新本地状态
      setScenarioSettings({
        ...scenarioSettings,
        [scenarioType]: {
          ...currentSetting,
          primaryModelId: modelId
        }
      })

      // 立即同步到服务器
      await updateScenario(scenarioType, selectedModelIds, modelId)
    }

    const handleParameterChange = (scenarioType: string, parameter: string, value: any) => {
      const currentSetting = scenarioSettings[scenarioType]
      const selectedModelIds = currentSetting?.selectedModelIds || []
      const primaryModelId = currentSetting?.primaryModelId || selectedModelIds[0] || ""

      setScenarioSettings({
        ...scenarioSettings,
        [scenarioType]: {
          ...currentSetting,
          selectedModelIds,
          primaryModelId,
          parameters: {
            ...currentSetting?.parameters,
            [parameter]: value
          }
        }
      })
    }

    return (
      <div className="space-y-6 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>功能场景配置</CardTitle>
            <p className="text-sm text-gray-500">为每个功能选择使用的AI模型并配置参数</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {scenarios.map(scenario => {
              const compatibleModels = getCompatibleModels(scenario.requiredCapabilities)
              const currentSetting = scenarioSettings[scenario.type]
              const isExpanded = expandedScenario === scenario.type
              const rawSelectedModelIds = currentSetting?.selectedModelIds || []
              const primaryModelId = currentSetting?.primaryModelId || rawSelectedModelIds[0] || ""

              // 实时过滤出实际存在的模型ID
              const selectedModelIds = rawSelectedModelIds.filter(modelId =>
                allModels.some(model => model.id === modelId)
              )

              return (
                <div key={scenario.type} className="border rounded-lg">
                  <div className="flex items-center justify-between p-4">
                    <div className="flex-1">
                      <h4 className="font-medium">{scenario.label}</h4>
                      <p className="text-sm text-gray-500">{scenario.description}</p>
                      <div className="flex gap-1 mt-2">
                        {scenario.requiredCapabilities.map(cap => (
                          <Badge key={cap} variant="secondary" className="text-xs">{cap}</Badge>
                        ))}
                      </div>
                      {selectedModelIds.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          已选择 {selectedModelIds.length} 个模型
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedScenario(isExpanded ? null : scenario.type)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  {isExpanded && (
                    <div className="border-t p-4 bg-gray-50 dark:bg-gray-900/50 space-y-6">
                      <div>
                        <h5 className="font-medium text-sm mb-3">选择模型</h5>
                        {compatibleModels.length === 0 ? (
                          <div className="p-4 text-sm text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-lg">
                            暂无兼容模型
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-60 overflow-y-auto">
                            {compatibleModels.map(model => {
                              const provider = allProviders.find(p => p.id === model.providerId)
                              const isSelected = selectedModelIds.includes(model.id)
                              const isPrimary = primaryModelId === model.id

                              return (
                                <div
                                  key={`${model.id}-${scenario.type}`}
                                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20'
                                      : 'border-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                                  }`}
                                  onClick={() => handleModelToggle(scenario.type, model.id, !isSelected)}
                                >
                                  <div className="flex items-center gap-3">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={(checked) => handleModelToggle(scenario.type, model.id, checked as boolean)}
                                    />
                                    <div>
                                      <p className="font-medium text-sm">{model.displayName}</p>
                                      <p className="text-xs text-gray-500">{provider?.name}</p>
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant={isPrimary ? "default" : "outline"}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handlePrimaryModelChange(scenario.type, model.id)
                                        }}
                                      >
                                        {isPrimary ? "主模型" : "设为主模型"}
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>

                      {selectedModelIds.length > 0 && (
                        <div>
                          <h5 className="font-medium text-sm mb-3">模型参数</h5>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor={`${scenario.type}-temp`}>Temperature</Label>
                              <div className="flex items-center gap-2">
                                <Slider
                                  id={`${scenario.type}-temp`}
                                  min={0}
                                  max={2}
                                  step={0.1}
                                  value={[currentSetting?.parameters?.temperature || 0.7]}
                                  onValueChange={([value]) => {
                                    handleParameterChange(scenario.type, 'temperature', value)
                                  }}
                                  className="flex-1"
                                />
                                <span className="text-sm w-12 text-right">
                                  {currentSetting?.parameters?.temperature?.toFixed(1) || "0.7"}
                                </span>
                              </div>
                            </div>
                            <div>
                              <Label htmlFor={`${scenario.type}-tokens`}>Max Tokens</Label>
                              <Input
                                id={`${scenario.type}-tokens`}
                                type="number"
                                value={currentSetting?.parameters?.max_tokens || 2048}
                                onChange={(e) => {
                                    handleParameterChange(scenario.type, 'max_tokens', parseInt(e.target.value))
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>
    )
  }

  // 硅基流动API设置
  function renderSiliconFlowApiSettings() {
    const saveSiliconFlowSettings = async () => {
      setSiliconFlowSaving(true)
      try {
        // 从模型服务系统获取当前配置
        const modelServiceResponse = await fetch('/api/model-service')
        if (!modelServiceResponse.ok) {
          throw new Error('获取模型服务配置失败')
        }

        const { config } = await modelServiceResponse.json()

        // 查找并更新硅基流动内置提供商
        const siliconflowProvider = config.providers?.find(p => p.type === 'siliconflow' && p.isBuiltIn)
        if (siliconflowProvider) {
          siliconflowProvider.apiKey = siliconFlowSettings.apiKey
          siliconflowProvider.updatedAt = Date.now()

          // 保存更新后的配置
          const saveResponse = await fetch('/api/model-service', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ config })
          })

          const saveData = await saveResponse.json()
          if (!saveData.success) {
            throw new Error(saveData.error || '保存失败')
          }
        } else {
          throw new Error('未找到硅基流动内置提供商')
        }

        // 触发自定义事件，通知其他组件设置已更改
        window.dispatchEvent(new CustomEvent('siliconflow-settings-changed', {
          detail: siliconFlowSettings
        }))

        toast({
          title: "成功",
          description: "硅基流动API设置已保存",
        })
      } catch (error) {
        toast({
          title: "错误",
          description: "保存硅基流动API设置失败",
          variant: "destructive",
        })
      } finally {
        setSiliconFlowSaving(false)
      }
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label htmlFor="siliconFlowApiKey" className="flex items-center text-sm font-medium">
                硅基流动 API密钥
              </Label>
              <div className="relative mt-2">
                <Input
                  id="siliconFlowApiKey"
                  type={showSiliconFlowApiKey ? "text" : "password"}
                  value={siliconFlowSettings.apiKey}
                  onChange={(e) => setSiliconFlowSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="输入您的硅基流动API密钥"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowSiliconFlowApiKey(!showSiliconFlowApiKey)}
                >
                  {showSiliconFlowApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* 当前状态显示 */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">API状态:</span>
                <Badge variant={siliconFlowSettings.apiKey ? "default" : "secondary"}>
                  {siliconFlowSettings.apiKey ? "已配置" : "未配置"}
                </Badge>
              </div>
              {siliconFlowSettings.apiKey && (
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {siliconFlowSettings.apiKey.substring(0, 8)}...{siliconFlowSettings.apiKey.substring(siliconFlowSettings.apiKey.length - 4)}
                </span>
              )}
            </div>


            {/* 模型配置 */}
            <div className="space-y-6">


              <div>
                <Label htmlFor="thumbnailFilterModel" className="text-sm font-medium">
                  缩略图AI筛选模型
                </Label>
                <p className="text-xs text-gray-500 mt-1 mb-2">
                  选择用于智能筛选视频缩略图的多模态AI模型，推荐使用Qwen2.5-VL-32B以获得最佳视觉理解效果
                </p>
                <Select
                  value={siliconFlowSettings.thumbnailFilterModel}
                  onValueChange={(value) => setSiliconFlowSettings(prev => ({ ...prev, thumbnailFilterModel: value }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    <SelectItem value="Qwen/Qwen2.5-VL-32B-Instruct">
                      <div className="flex flex-col">
                        <span className="font-medium">Qwen2.5-VL-32B (推荐)</span>
                        <span className="text-xs text-gray-500">阿里多模态视觉理解模型</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="deepseek-ai/DeepSeek-VL2">
                      <div className="flex flex-col">
                        <span className="font-medium">DeepSeek-VL2</span>
                        <span className="text-xs text-gray-500">DeepSeek视觉语言模型</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="01-ai/Yi-VL-34B">
                      <div className="flex flex-col">
                        <span className="font-medium">Yi-VL-34B</span>
                        <span className="text-xs text-gray-500">零一万物视觉理解模型</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 模型使用提示 */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">模型选择建议</p>
                  <ul className="text-xs text-amber-700 dark:text-amber-300 mt-1 space-y-1">
                    <li>• 分集简介生成：DeepSeek-V2.5 在中文理解和创作方面表现优异</li>
                    <li>• 缩略图筛选：Qwen2.5-VL-32B 在图像理解和分析方面效果最佳</li>
                    <li>• 不同模型的调用费用可能不同，请根据需要选择</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 保存按钮 */}
            <div className="pt-4 border-t">
              <Button
                onClick={saveSiliconFlowSettings}
                className="w-full"
                disabled={siliconFlowSaving}
              >
                {siliconFlowSaving ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    保存硅基流动设置
                  </>
                )}
              </Button>
            </div>

            {/* 帮助信息 */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">如何获取硅基流动API密钥？</p>
                  <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-2 list-decimal list-inside">
                    <li>访问硅基流动官网并注册账户</li>
                    <li>进入控制台创建API密钥</li>
                    <li>复制生成的API密钥到此处</li>
                    <li>根据需要选择合适的模型</li>
                  </ol>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open("https://siliconflow.cn", "_blank")}
                    className="mt-3"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    前往硅基流动官网
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 魔搭社区API设置
  function renderModelScopeApiSettings() {
    const saveModelScopeSettings = async () => {
      setModelScopeSaving(true)
      try {
        // 从模型服务系统获取当前配置
        const modelServiceResponse = await fetch('/api/model-service')
        if (!modelServiceResponse.ok) {
          throw new Error('获取模型服务配置失败')
        }

        const { config } = await modelServiceResponse.json()

        // 查找并更新魔搭社区内置提供商
        const modelscopeProvider = config.providers?.find(p => p.type === 'modelscope' && p.isBuiltIn)
        if (modelscopeProvider) {
          modelscopeProvider.apiKey = modelScopeSettings.apiKey
          modelscopeProvider.updatedAt = Date.now()

          // 保存更新后的配置
          const saveResponse = await fetch('/api/model-service', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ config })
          })

          const saveData = await saveResponse.json()
          if (!saveData.success) {
            throw new Error(saveData.error || '保存失败')
          }
        } else {
          throw new Error('未找到魔搭社区内置提供商')
        }

        // 触发自定义事件，通知其他组件设置已更改
        window.dispatchEvent(new CustomEvent('modelscope-settings-changed', {
          detail: modelScopeSettings
        }))

        // 触发模型服务配置更新事件，确保界面同步
        window.dispatchEvent(new CustomEvent('model-service-config-updated'))

        toast({
          title: "成功",
          description: "魔搭社区API设置已保存",
        })
      } catch (error) {
        toast({
          title: "错误",
          description: "保存魔搭社区API设置失败",
          variant: "destructive",
        })
      } finally {
        setModelScopeSaving(false)
      }
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6 space-y-4">

            <div>
              <Label htmlFor="modelScopeApiKey" className="flex items-center text-sm font-medium">
                魔搭社区API密钥
              </Label>
              <div className="relative mt-2">
                <Input
                  id="modelScopeApiKey"
                  type={showModelScopeApiKey ? "text" : "password"}
                  value={modelScopeSettings.apiKey}
                  onChange={(e) => setModelScopeSettings(prev => ({ ...prev, apiKey: e.target.value }))}
                  placeholder="ms-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowModelScopeApiKey(!showModelScopeApiKey)}
                >
                  {showModelScopeApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* 当前状态显示 */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">API状态:</span>
                <Badge variant={modelScopeSettings.apiKey ? "default" : "secondary"}>
                  {modelScopeSettings.apiKey ? "已配置" : "未配置"}
                </Badge>
              </div>
              {modelScopeSettings.apiKey && (
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {modelScopeSettings.apiKey.substring(0, 8)}...{modelScopeSettings.apiKey.substring(modelScopeSettings.apiKey.length - 4)}
                </span>
              )}
            </div>


            {/* 模型配置 */}
            <div className="space-y-6">
              <div>
                <Label htmlFor="episodeGenerationModel" className="text-sm font-medium">
                  分集简介生成模型
                </Label>
                <p className="text-xs text-gray-500 mt-1 mb-2">
                  选择用于生成分集简介的语言模型，推荐使用Qwen3-32B以获得最佳中文创作效果
                </p>
                <Select
                  value={modelScopeSettings.episodeGenerationModel}
                  onValueChange={(value) => setModelScopeSettings(prev => ({ ...prev, episodeGenerationModel: value }))}
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px] overflow-y-auto">
                    <SelectItem value="Qwen/Qwen3-32B">
                      <div className="flex flex-col">
                        <span className="font-medium">Qwen3-32B (推荐)</span>
                        <span className="text-xs text-gray-500">通义千问3代，32B参数，强大推理能力</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="ZhipuAI/GLM-4.5">
                      <div className="flex flex-col">
                        <span className="font-medium">GLM-4.5</span>
                        <span className="text-xs text-gray-500">智谱AI旗舰模型，专为智能体设计</span>
                      </div>
                    </SelectItem>

                    <SelectItem value="deepseek-ai/DeepSeek-V3.1">
                      <div className="flex flex-col">
                        <span className="font-medium">DeepSeek-V3.1</span>
                        <span className="text-xs text-gray-500">DeepSeek最新版本，强大的推理和代码能力</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="deepseek-ai/DeepSeek-R1-Distill-Qwen-32B">
                      <div className="flex flex-col">
                        <span className="font-medium">DeepSeek-R1-Distill-Qwen-32B</span>
                        <span className="text-xs text-gray-500">DeepSeek R1蒸馏版本，32B参数，高效推理</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="Qwen/Qwen2.5-72B-Instruct">
                      <div className="flex flex-col">
                        <span className="font-medium">Qwen2.5-72B-Instruct</span>
                        <span className="text-xs text-gray-500">开源版本，72B参数</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="deepseek-ai/DeepSeek-R1-0528">
                      <div className="flex flex-col">
                        <span className="font-medium">DeepSeek-R1-0528</span>
                        <span className="text-xs text-gray-500">DeepSeek R1思考模型，具备强大的推理能力</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 测试和保存按钮 */}
            <div className="pt-4 border-t space-y-3">
              {/* 验证DashScope API密钥按钮 */}
              {modelScopeSettings.apiKey && (
                <Button
                  variant="outline"
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/validate-dashscope-key', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          apiKey: modelScopeSettings.apiKey
                        })
                      });

                      const result = await response.json();

                      if (result.success) {
                        toast({
                          title: "✅ 验证成功",
                          description: result.message,
                        });
                        console.log('DashScope API密钥验证成功:', result);
                      } else {
                        toast({
                          title: "❌ 验证失败",
                          description: result.error,
                          variant: "destructive",
                        });
                        console.error('DashScope API密钥验证失败:', result);

                        // 显示详细的指导信息
                        if (result.guidance) {
                          console.group('🔧 解决方案指导:');
                          console.log(`步骤 ${result.guidance.step}: ${result.guidance.title}`);
                          result.guidance.instructions.forEach((instruction: string, index: number) => {
                            console.log(`${index + 1}. ${instruction}`);
                          });
                          console.groupEnd();
                        }
                      }
                    } catch (error) {
                      toast({
                        title: "验证失败",
                        description: "网络错误或服务器异常",
                        variant: "destructive",
                      });
                      console.error('API验证错误:', error);
                    }
                  }}
                  className="w-full"
                >
                  <span className="mr-2">🔍</span>
                  测试API连接
                </Button>
              )}

              {/* 保存按钮 */}
              <Button
                onClick={saveModelScopeSettings}
                className="w-full"
                disabled={modelScopeSaving}
              >
                {modelScopeSaving ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    保存魔搭社区设置
                  </>
                )}
              </Button>
            </div>

            {/* 帮助信息 */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">如何获取魔搭社区API密钥？</p>

                  <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-2 list-decimal list-inside">
                    <li>访问 <a href="https://modelscope.cn/" target="_blank" rel="noopener noreferrer" className="underline">魔搭社区官网</a></li>
                    <li>注册并登录您的账户</li>
                    <li>找到API推理服务页面</li>
                    <li>获取API密钥（格式：ms-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx）</li>
                    <li>选择支持的模型（如ZhipuAI/GLM-4.5）</li>
                  </ol>

                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                    <p className="text-xs text-green-800 dark:text-green-200">
                      <strong>提示：</strong>魔搭社区提供多种开源模型的在线推理服务，支持OpenAI兼容的API格式。
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open("https://dashscope.console.aliyun.com/", "_blank")}
                    className="mt-3"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    前往DashScope控制台
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 工具设置内容
  function renderToolsSettings() {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">工具配置</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            管理TMDB-Import工具的安装、配置和依赖环境
          </p>
        </div>

        {/* 标签导航 */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveToolTab("management")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeToolTab === "management"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              工具管理
            </button>
            <button
              onClick={() => setActiveToolTab("config")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeToolTab === "config"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              config.ini 配置
            </button>
            <button
              onClick={() => setActiveToolTab("dependencies")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeToolTab === "dependencies"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              依赖安装
            </button>
          </nav>
        </div>

        {/* 工具管理标签页 */}
        {activeToolTab === 'management' && (
          <div className="space-y-6">
            {/* 自动更新管理 */}
            <TMDBImportUpdater
              onPathUpdate={async (path) => {
                setTmdbImportPath(path)
                await ClientConfigManager.setItem("tmdb_import_path", path)
              }}
            />

            {/* 手动路径配置 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center">
                  <FolderOpen className="h-4 w-4 mr-2" />
                  手动路径配置
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  如果需要使用自定义路径或现有安装，可以手动指定工具路径
                </p>

                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <Input
                      id="tmdbImportPath"
                      value={tmdbImportPath}
                      onChange={(e) => setTmdbImportPath(e.target.value)}
                      placeholder="例如: D:\TMDB-Import-master 或自定义路径"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const path = prompt("请输入TMDB-Import工具路径:", tmdbImportPath)
                        if (path) setTmdbImportPath(path)
                      }}
                    >
                      <FolderOpen className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* 当前状态显示 */}
                  {tmdbImportPath && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">当前配置:</span>
                        <Badge variant="default" className="text-xs">已配置</Badge>
                      </div>
                      <code className="text-xs text-gray-600 dark:text-gray-400 break-all">
                        {tmdbImportPath}
                      </code>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 帮助信息 */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-start space-x-3">
                  <Info className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="text-sm text-green-800 dark:text-green-200 font-medium">TMDB-Import工具说明</p>
                    <ul className="text-sm text-green-700 dark:text-green-300 space-y-1 list-decimal list-inside">
                      <li>请输入本地TMDB-Import工具的完整路径</li>
                      <li>确保路径中包含可执行的Python模块</li>
                      <li>配置后可在词条详情中使用本地集成功能</li>
                      <li>支持播出平台抓取和自动上传至TMDB</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* config.ini配置标签页 */}
        {activeToolTab === 'config' && (
          <div className="space-y-6">
            {tmdbImportPath ? (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <CardTitle className="text-base">config.ini 配置</CardTitle>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => loadTmdbConfig(tmdbImportPath)}
                        disabled={configLoading}
                      >
                        {configLoading ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        刷新
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={saveTmdbConfig}
                        disabled={configSaving}
                      >
                        {configSaving ? (
                          <Save className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        保存配置
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 编码设置 */}
                    <div>
                      <Label className="text-sm font-medium">编码</Label>
                      <Select
                        value={tmdbConfig.encoding}
                        onValueChange={(value) => setTmdbConfig(prev => ({ ...prev, encoding: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="utf-8-sig">utf-8-sig</SelectItem>
                          <SelectItem value="utf-8">utf-8</SelectItem>
                          <SelectItem value="gbk">gbk</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 日志级别 */}
                    <div>
                      <Label className="text-sm font-medium">日志级别</Label>
                      <Select
                        value={tmdbConfig.logging_level}
                        onValueChange={(value) => setTmdbConfig(prev => ({ ...prev, logging_level: value }))}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DEBUG">DEBUG</SelectItem>
                          <SelectItem value="INFO">INFO</SelectItem>
                          <SelectItem value="WARNING">WARNING</SelectItem>
                          <SelectItem value="ERROR">ERROR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* 浏览器说明 */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start space-x-2">
                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">浏览器设置</p>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                            现在使用 Playwright 框架，仅支持 Chrome/Chromium 浏览器。无需手动配置浏览器类型。
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 保存用户配置文件 */}
                    <div className="flex items-center space-x-2 pt-6">
                      <Switch
                        id="save_user_profile"
                        checked={tmdbConfig.save_user_profile}
                        onCheckedChange={(checked) => setTmdbConfig(prev => ({ ...prev, save_user_profile: checked }))}
                      />
                      <Label htmlFor="save_user_profile" className="text-sm font-medium">
                        保存用户配置文件
                      </Label>
                    </div>
                  </div>

                  <Separator />

                  {/* TMDB账户信息 */}
                  <div className="space-y-4">
                    <Label className="text-sm font-medium">TMDB 账户信息</Label>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm text-gray-600 dark:text-gray-400">用户名</Label>
                        <Input
                          value={tmdbConfig.tmdb_username}
                          onChange={(e) => setTmdbConfig(prev => ({ ...prev, tmdb_username: e.target.value }))}
                          placeholder="TMDB用户名"
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label className="text-sm text-gray-600 dark:text-gray-400">密码</Label>
                        <div className="relative mt-1">
                          <Input
                            type={showTmdbPassword ? "text" : "password"}
                            value={tmdbConfig.tmdb_password}
                            onChange={(e) => setTmdbConfig(prev => ({ ...prev, tmdb_password: e.target.value }))}
                            placeholder="TMDB密码"
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowTmdbPassword(!showTmdbPassword)}
                          >
                            {showTmdbPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 其他设置 */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="backdrop_forced_upload"
                        checked={tmdbConfig.backdrop_forced_upload}
                        onCheckedChange={(checked) => setTmdbConfig(prev => ({ ...prev, backdrop_forced_upload: checked }))}
                      />
                      <Label htmlFor="backdrop_forced_upload" className="text-sm font-medium">
                        强制上传背景图
                      </Label>
                    </div>

                    <div>
                      <Label className="text-sm font-medium">过滤词 (用逗号分隔)</Label>
                      <Textarea
                        value={tmdbConfig.filter_words}
                        onChange={(e) => setTmdbConfig(prev => ({ ...prev, filter_words: e.target.value }))}
                        placeholder="番外,加更"
                        className="mt-1 h-20 resize-none"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <div className="flex flex-col items-center space-y-4">
                    <AlertCircle className="h-12 w-12 text-amber-500" />
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">未配置工具路径</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        请先在"工具管理"标签页中配置TMDB-Import工具路径，然后再进行config.ini配置。
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setActiveToolTab('management')}
                    >
                      前往工具管理
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* 依赖安装标签页 */}
        {activeToolTab === 'dependencies' && (
          <DependencyInstaller />
        )}
      </div>
    )
  }

  // 通用设置内容
  function renderGeneralSettings() {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">通用设置</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            配置应用程序的通用选项和行为设置
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Database className="h-4 w-4 mr-2" />
              数据管理
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">自动保存</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">自动保存编辑的数据</p>
              </div>
              <Switch
                checked={generalSettings.autoSave}
                onCheckedChange={(checked) => setGeneralSettings(prev => ({ ...prev, autoSave: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">数据备份</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">定期备份重要数据</p>
              </div>
              <Switch
                checked={generalSettings.dataBackup}
                onCheckedChange={(checked) => setGeneralSettings(prev => ({ ...prev, dataBackup: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">缓存清理</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">自动清理过期缓存</p>
              </div>
              <Switch
                checked={generalSettings.cacheCleanup}
                onCheckedChange={(checked) => setGeneralSettings(prev => ({ ...prev, cacheCleanup: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Database className="h-4 w-4 mr-2" />
              配置迁移
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                将配置从浏览器本地存储迁移到服务端存储，提高安全性和可靠性
              </p>
              <Button
                variant="outline"
                onClick={() => setShowMigrationDialog(true)}
                className="w-full"
              >
                <Database className="h-4 w-4 mr-2" />
                配置迁移管理
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Globe className="h-4 w-4 mr-2" />
              网络设置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">请求超时时间 (秒)</Label>
              <Input
                type="number"
                value={generalSettings.requestTimeout}
                onChange={(e) => setGeneralSettings(prev => ({ ...prev, requestTimeout: parseInt(e.target.value) || 30 }))}
                className="mt-1"
                min="5"
                max="300"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">并发请求数</Label>
              <Input
                type="number"
                value={generalSettings.concurrentRequests}
                onChange={(e) => setGeneralSettings(prev => ({ ...prev, concurrentRequests: parseInt(e.target.value) || 5 }))}
                className="mt-1"
                min="1"
                max="20"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">使用代理</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">通过代理服务器访问网络</p>
              </div>
              <Switch
                checked={generalSettings.useProxy}
                onCheckedChange={(checked) => setGeneralSettings(prev => ({ ...prev, useProxy: checked }))}
              />
            </div>

            {generalSettings.useProxy && (
              <div>
                <Label className="text-sm font-medium">代理地址</Label>
                <Input
                  value={generalSettings.proxyUrl}
                  onChange={(e) => setGeneralSettings(prev => ({ ...prev, proxyUrl: e.target.value }))}
                  placeholder="http://proxy.example.com:8080"
                  className="mt-1"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* 状态反馈 */}
        {(validationMessage || saveStatus !== "idle") && (
          <Card
            className={`${saveStatus === "success"
              ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
              : saveStatus === "error"
                ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
              }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <span className={`text-sm ${getStatusColor()}`}>
                  {validationMessage || (saveStatus === "saving" ? "正在保存..." : "")}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // 外观设置内容
  function renderAppearanceSettings() {
    const colorOptions = [
      { value: 'blue', label: '蓝色', color: 'bg-blue-500' },
      { value: 'green', label: '绿色', color: 'bg-green-500' },
      { value: 'purple', label: '紫色', color: 'bg-purple-500' },
      { value: 'red', label: '红色', color: 'bg-red-500' },
      { value: 'orange', label: '橙色', color: 'bg-orange-500' },
      { value: 'pink', label: '粉色', color: 'bg-pink-500' },
    ]

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">外观设置</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            自定义应用程序的外观和主题设置
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Palette className="h-4 w-4 mr-2" />
              主题设置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">主题模式</Label>
              <Select
                value={appearanceSettings.theme}
                onValueChange={(value: 'light' | 'dark' | 'system') =>
                  setAppearanceSettings(prev => ({ ...prev, theme: value }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center space-x-2">
                      <Sun className="h-4 w-4" />
                      <span>浅色模式</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center space-x-2">
                      <Moon className="h-4 w-4" />
                      <span>深色模式</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center space-x-2">
                      <Monitor className="h-4 w-4" />
                      <span>跟随系统</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium">主色调</Label>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    onClick={() => setAppearanceSettings(prev => ({ ...prev, primaryColor: color.value }))}
                    className={`w-10 h-10 rounded-full ${color.color} hover:scale-110 transition-transform relative ${appearanceSettings.primaryColor === color.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                    title={color.label}
                  >
                    {appearanceSettings.primaryColor === color.value && (
                      <CheckCircle2 className="h-4 w-4 text-white absolute inset-0 m-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">紧凑模式</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">减少界面元素间距</p>
              </div>
              <Switch
                checked={appearanceSettings.compactMode}
                onCheckedChange={(checked) => setAppearanceSettings(prev => ({ ...prev, compactMode: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Settings className="h-4 w-4 mr-2" />
              界面设置
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">字体大小</Label>
              <Select
                value={appearanceSettings.fontSize}
                onValueChange={(value: 'small' | 'medium' | 'large') =>
                  setAppearanceSettings(prev => ({ ...prev, fontSize: value }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">小 (14px)</SelectItem>
                  <SelectItem value="medium">中 (16px)</SelectItem>
                  <SelectItem value="large">大 (18px)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">显示动画</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">启用界面过渡动画</p>
              </div>
              <Switch
                checked={appearanceSettings.showAnimations}
                onCheckedChange={(checked) => setAppearanceSettings(prev => ({ ...prev, showAnimations: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">显示工具提示</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">鼠标悬停时显示帮助信息</p>
              </div>
              <Switch
                checked={appearanceSettings.showTooltips}
                onCheckedChange={(checked) => setAppearanceSettings(prev => ({ ...prev, showTooltips: checked }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* 词条详情背景效果 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center">
              <Palette className="h-4 w-4 mr-2" />
              词条详情背景效果
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">启用毛玻璃</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">控制词条详情页背景的毛玻璃模糊</p>
              </div>
              <Switch
                checked={appearanceSettings.detailBackdropBlurEnabled ?? true}
                onCheckedChange={(checked) => setAppearanceSettings(prev => ({ ...prev, detailBackdropBlurEnabled: checked }))}
              />
            </div>

            <div>
              <Label className="text-sm font-medium">模糊强度</Label>
              <Select
                value={appearanceSettings.detailBackdropBlurIntensity ?? 'medium'}
                onValueChange={(value: 'light' | 'medium' | 'heavy') =>
                  setAppearanceSettings(prev => ({ ...prev, detailBackdropBlurIntensity: value }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">轻度</SelectItem>
                  <SelectItem value="medium">中等</SelectItem>
                  <SelectItem value="heavy">重度</SelectItem>
                </SelectContent>
              </Select>
            </div>


          </CardContent>
        </Card>

        {/* 预览区域 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">预览</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full bg-${appearanceSettings.primaryColor}-500`}></div>
                  <span className={`text-${appearanceSettings.fontSize === 'small' ? 'sm' : appearanceSettings.fontSize === 'large' ? 'lg' : 'base'}`}>
                    示例文本内容
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  当前主题: {appearanceSettings.theme === 'light' ? '浅色' : appearanceSettings.theme === 'dark' ? '深色' : '跟随系统'}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  字体大小: {appearanceSettings.fontSize === 'small' ? '小' : appearanceSettings.fontSize === 'large' ? '大' : '中'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 状态反馈 */}
        {(validationMessage || saveStatus !== "idle") && (
          <Card
            className={`${saveStatus === "success"
              ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
              : saveStatus === "error"
                ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
              }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <span className={`text-sm ${getStatusColor()}`}>
                  {validationMessage || (saveStatus === "saving" ? "正在保存..." : "")}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // 视频缩略图设置内容
  function renderVideoThumbnailSettings() {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">视频缩略图提取设置</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            简单的顺序帧提取，从指定时间开始按帧间隔提取缩略图
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">提取设置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="startTime">开始提取时间 (秒)</Label>
              <Input
                id="startTime"
                type="number"
                min="0"
                step="0.1"
                value={videoThumbnailSettings.startTime}
                onChange={(e) =>
                  setVideoThumbnailSettings(prev => ({ ...prev, startTime: Number(e.target.value) }))
                }
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                从视频的哪个时间点开始提取缩略图
              </p>
            </div>

            <div>
              <Label htmlFor="thumbnailCount">缩略图数量</Label>
              <div className="flex items-center gap-2 mt-1">
                <Slider
                  value={[videoThumbnailSettings.thumbnailCount]}
                  min={1}
                  max={20}
                  step={1}
                  onValueChange={([value]) =>
                    setVideoThumbnailSettings(prev => ({ ...prev, thumbnailCount: Array.isArray(value) ? value[0] : prev.thumbnailCount }))
                  }
                  className="flex-1"
                />
                <span className="font-medium w-8 text-center">{videoThumbnailSettings.thumbnailCount}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                要提取的缩略图数量
              </p>
            </div>

            <div>
              <Label htmlFor="frameInterval">帧间隔</Label>
              <div className="flex items-center gap-2 mt-1">
                <Slider
                  value={[videoThumbnailSettings.frameInterval]}
                  min={1}
                  max={300}
                  step={1}
                  onValueChange={([value]) =>
                    setVideoThumbnailSettings(prev => ({ ...prev, frameInterval: Array.isArray(value) ? value[0] : prev.frameInterval }))
                  }
                  className="flex-1"
                />
                <span className="font-medium w-12 text-center">{videoThumbnailSettings.frameInterval}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                每隔多少帧提取一次（1=每帧，30=约每秒一次@30fps）
              </p>
            </div>

            <div>
              <Label htmlFor="threadCount">同时处理视频数量</Label>
              <div className="flex items-center gap-2 mt-1">
                <Slider
                  value={[videoThumbnailSettings.threadCount]}
                  min={1}
                  max={8}
                  step={1}
                  onValueChange={([value]) =>
                    setVideoThumbnailSettings(prev => ({ ...prev, threadCount: Array.isArray(value) ? value[0] : prev.threadCount }))
                  }
                  className="flex-1"
                />
                <span className="font-medium w-8 text-center">{videoThumbnailSettings.threadCount}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                同时处理的视频数量
              </p>
            </div>

            <div>
              <Label htmlFor="outputFormat">输出格式</Label>
              <Select
                value={videoThumbnailSettings.outputFormat}
                onValueChange={(value) =>
                  setVideoThumbnailSettings(prev => ({ ...prev, outputFormat: value as "jpg" | "png" }))
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="选择输出格式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="jpg">JPG</SelectItem>
                  <SelectItem value="png">PNG</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                缩略图输出格式
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="keepOriginalResolution"
                checked={videoThumbnailSettings.keepOriginalResolution}
                onCheckedChange={(checked) =>
                  setVideoThumbnailSettings(prev => ({ ...prev, keepOriginalResolution: !!checked }))
                }
              />
              <Label htmlFor="keepOriginalResolution" className="cursor-pointer">
                保持原始分辨率
              </Label>
            </div>
            <p className="text-xs text-muted-foreground pl-6">
              保持视频的原始分辨率，否则将缩放到640x360
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">AI智能筛选</CardTitle>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  使用硅基流动AI识别有人物无字幕的帧
                </p>
              </div>
              <Switch
                checked={videoThumbnailSettings.enableAIFilter}
                onCheckedChange={(checked) =>
                  setVideoThumbnailSettings(prev => ({ ...prev, enableAIFilter: !!checked }))
                }
              />
            </div>
          </CardHeader>
          {videoThumbnailSettings.enableAIFilter && (
            <CardContent className="space-y-4">
              {/* API密钥状态显示 */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">硅基流动API:</span>
                    <Badge variant={siliconFlowSettings.apiKey ? "default" : "destructive"}>
                      {siliconFlowSettings.apiKey ? "已配置" : "未配置"}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setActiveSection("api")
                      setApiActiveTab("siliconflow")
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    配置API
                  </Button>
                </div>
                {!siliconFlowSettings.apiKey && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                    请先在API配置页面设置硅基流动API密钥
                  </p>
                )}
              </div>

              {/* 模型选择 - 现在从全局设置中读取 */}
              <div>
                <Label>当前使用模型</Label>
                <div className="mt-1 p-2 bg-gray-50 dark:bg-gray-800 rounded border text-sm">
                  {siliconFlowSettings.thumbnailFilterModel || "Qwen/Qwen2.5-VL-32B-Instruct"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  在API配置页面可以更改模型设置
                </p>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start space-x-2">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">AI筛选工作原理：</p>
                    <ul className="text-xs space-y-1 list-disc list-inside">
                      <li>程序按帧间隔提取视频帧</li>
                      <li>每帧都通过AI模型分析是否有人物和字幕</li>
                      <li>只有包含人物且无字幕的帧才会生成缩略图</li>
                      <li>这样可以自动筛选出高质量的缩略图</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* 状态反馈 */}
        {(validationMessage || saveStatus !== "idle") && (
          <Card
            className={`${saveStatus === "success"
              ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
              : saveStatus === "error"
                ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                : "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
              }`}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                {getStatusIcon()}
                <span className={`text-sm ${getStatusColor()}`}>
                  {validationMessage || (saveStatus === "saving" ? "正在保存..." : "")}
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // 账户安全设置内容
  function renderSecuritySettings() {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">账户安全</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            修改管理员账户密码，确保账户安全
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              密码修改
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 当前密码 */}
            <div>
              <Label htmlFor="currentPassword">当前密码</Label>
              <div className="relative mt-1">
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="请输入当前密码"
                  className="pr-10"
                  disabled={passwordChangeLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  disabled={passwordChangeLoading}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* 新密码 */}
            <div>
              <Label htmlFor="newPassword">新密码</Label>
              <div className="relative mt-1">
                <Input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="请输入新密码（至少6位）"
                  className="pr-10"
                  disabled={passwordChangeLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={passwordChangeLoading}
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* 确认新密码 */}
            <div>
              <Label htmlFor="confirmPassword">确认新密码</Label>
              <div className="relative mt-1">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入新密码"
                  className="pr-10"
                  disabled={passwordChangeLoading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={passwordChangeLoading}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* 密码要求提示 */}
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p>密码要求：</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>至少6个字符</li>
                <li>建议包含字母和数字</li>
                <li>避免使用过于简单的密码</li>
              </ul>
            </div>

            {/* 修改按钮 */}
            <div className="flex justify-end pt-4">
              <Button
                onClick={handlePasswordChange}
                disabled={passwordChangeLoading || !currentPassword || !newPassword || !confirmPassword}
                className="min-w-[100px]"
              >
                {passwordChangeLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    修改中...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    修改密码
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 帮助与支持设置内容
  function renderHelpSettings() {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">帮助与支持</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            获取帮助文档和应用信息
          </p>
        </div>

        {/* 帮助与支持顶部导航 - 采用与 API 配置一致的标签式体验 */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setHelpActiveTab("about")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${helpActiveTab === "about"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
            >
              关于应用
            </button>
          </nav>
        </div>

        {/* 根据选中的标签页显示内容 */}
        {helpActiveTab === "about" && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Info className="h-5 w-5 mr-2" />
                  关于应用
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* 帮助文档（融合到关于应用） */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start space-x-3">
                      <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">帮助文档与常见问题</p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">查看详细的使用说明和常见问题解答</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open('https://github.com/CeRu-007/TMDB-Helper', '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          访问GitHub文档
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100">{appInfo.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">版本 {appInfo.version}</p>
                  </div>

                  {/* 版本描述 */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {appInfo.versionInfo.title}
                        </h5>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {appInfo.versionInfo.releaseDate}
                        </span>
                      </div>
                      {appInfo.versionInfo.description && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsVersionDescriptionExpanded(!isVersionDescriptionExpanded)}
                          className="h-8 w-8 p-0 ml-2"
                        >
                          {isVersionDescriptionExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>

                    {/* 可折叠的详细描述 */}
                    {appInfo.versionInfo.description && isVersionDescriptionExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                          {appInfo.versionInfo.description}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      一个专业的TMDB数据管理工具，帮助您轻松追踪、维护和管理影视词条信息。
                      支持数据导入导出、批量处理、智能分析等功能。
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100">主要功能</h5>
                    <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <li>• 影视数据追踪和管理</li>
                      <li>• TMDB API集成</li>
                      <li>• 数据导入导出</li>
                      <li>• 批量处理工具</li>
                      <li>• 智能数据分析</li>
                      <li>• 多主题界面</li>
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      © 2024 TMDB Helper. 基于 TMDB API 构建。
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            设置
          </DialogTitle>
          <DialogDescription>
            配置应用程序的全局设置和API密钥
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[calc(90vh-120px)]">
          {/* 左侧导航菜单 */}
          <div className="w-64 border-r bg-gray-50/50 dark:bg-gray-900/50">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {settingsMenuItems.map((item) => {
                  const Icon = item.icon
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        console.log('💱 [DEBUG] 菜单项点击:', {
                          itemId: item.id,
                          itemType: typeof item.id,
                          isValidSection: validSections.includes(item.id)
                        })
                        if (typeof item.id === 'string' && validSections.includes(item.id)) {
                          setActiveSection(item.id)
                        } else {
                          console.warn('⚠️ [DEBUG] 无效的菜单项ID:', item.id)
                          setActiveSection('api') // 默认设置为api
                        }
                      }}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${activeSection === item.id
                        ? "bg-blue-100 dark:bg-blue-900/50 text-blue-900 dark:text-blue-100 border border-blue-200 dark:border-blue-800"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300"
                        }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="font-medium text-sm">{item.label}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {item.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          </div>

          {/* 右侧内容区域 */}
          <div className="flex-1 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-6">{renderSettingsContent()}</div>
            </ScrollArea>

            {/* 底部操作按钮 */}
            <div className="border-t p-4 bg-gray-50/50 dark:bg-gray-900/50">
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={handleCancel} disabled={saveStatus === "saving"}>
                  取消
                </Button>
                <Button
                  onClick={() => {
                    console.log('💆 [DEBUG] 保存按钮被点击:', {
                      currentActiveSection: activeSection,
                      hasApiKey: !!apiKey,
                      apiKeyLength: apiKey?.length || 0
                    })
                    
                    // 直接调用保存，不需要自动切换页面
                    handleSave()
                  }}
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

      {/* 配置迁移对话框 */}
      <ConfigMigrationDialog
        open={showMigrationDialog}
        onOpenChange={setShowMigrationDialog}
      />
    </Dialog>
  )
}