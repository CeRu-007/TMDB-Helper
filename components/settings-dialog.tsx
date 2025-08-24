"use client"

import { useRef } from "react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
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
  Download,
  GitBranch,
  ChevronDown,
  ChevronUp,
} from "lucide-react"
import TMDBImportUpdater from "./tmdb-import-updater"
import DockerVersionManager from "./docker-version-manager"
import { ClientConfigManager } from '@/lib/client-config-manager'
import { safeJsonParse } from '@/lib/utils'
import ConfigMigrationDialog from "./config-migration-dialog"

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
  
  // 确保 activeSection 始终有效且为字符串类型
  const validSections = ['api', 'tools', 'video-thumbnail', 'general', 'appearance', 'security', 'help']
  const validInitialSection = initialSection && 
    typeof initialSection === 'string' && 
    validSections.includes(initialSection) 
    ? initialSection 
    : 'api'
  
  console.log('🚀 [DEBUG] SettingsDialog 初始化:', { 
    initialSection, 
    initialSectionType: typeof initialSection,
    validInitialSection,
    validSections,
    open 
  })
  
  const [activeSection, setActiveSection] = useState<string>(validInitialSection)

  // 包装onOpenChange以触发自定义事件
  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
    // 当对话框关闭时，触发自定义事件
    if (!newOpen) {
      window.dispatchEvent(new CustomEvent('global-settings-closed'))
    }
  }
  const [apiKey, setApiKey] = useState("")
  const [showApiKey, setShowApiKey] = useState(false)
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
          let dockerHasApiKey = false
          let dockerImportPath = ''
          
          try {
            const dockerResponse = await fetch('/api/docker-config')
            if (dockerResponse.ok) {
              const dockerData = await dockerResponse.json()
              if (dockerData.success && dockerData.config?.isDockerEnvironment) {
                isDockerEnv = true
                dockerHasApiKey = dockerData.config.hasApiKey
                dockerImportPath = dockerData.config.tmdbImportPath || ''
                setIsDockerEnv(true)
                console.log('🐳 [TMDB Debug] 检测到Docker环境:', {
                  hasApiKey: dockerHasApiKey,
                  importPath: dockerImportPath
                })
              }
            }
          } catch (error) {
            console.warn('⚠️ [TMDB Debug] Docker环境检查失败:', error)
            setIsDockerEnv(false)
          }

          // 从服务端获取配置
          const [savedApiKey, savedTmdbImportPath] = await Promise.all([
            ClientConfigManager.getItem("tmdb_api_key"),
            ClientConfigManager.getItem("tmdb_import_path")
          ])

          console.log('📖 [TMDB Debug] 服务端配置状态:', {
            hasApiKey: !!savedApiKey,
            apiKeyLength: savedApiKey?.length || 0,
            hasImportPath: !!savedTmdbImportPath,
            importPath: savedTmdbImportPath,
            isDockerEnv,
            dockerHasApiKey
          })

          // 设置API密钥状态 - 优先级：Docker配置 > 服务端配置
          // 只有在不在编辑状态时才更新配置
          if (!isCurrentlyEditing()) {
            if (isDockerEnv && dockerHasApiKey) {
              // Docker环境中已有配置，显示占位符
              setApiKey("***已配置***")
              console.log('✅ [TMDB Debug] 显示Docker配置占位符')
            } else if (savedApiKey && savedApiKey.trim() !== "") {
              // ⚠️ 关键修复：只检查非空字符串
              setApiKey(savedApiKey)
              console.log('✅ [TMDB Debug] API密钥已设置:', savedApiKey.substring(0, 8) + '...')
            } else {
              setApiKey("")
              console.log('⚠️ [TMDB Debug] 未找到保存的API密钥或为空')
            }
          } else {
            console.log('📝 [TMDB Debug] 检测到用户正在编辑，跳过初始化覆盖')
          }

          // 设置导入路径状态 - 优先级：Docker配置 > 服务端配置
          const finalImportPath = dockerImportPath || savedTmdbImportPath || ''
          setTmdbImportPath(finalImportPath)
          if (finalImportPath) {
            console.log('✅ [TMDB Debug] 导入路径已设置:', finalImportPath)
            loadTmdbConfig(finalImportPath)
          } else {
            console.log('⚠️ [TMDB Debug] 未找到保存的导入路径')
          }

          // 如果非Docker环境但有本地配置，且Docker环境无配置，尝试迁移
          if (isDockerEnv && !dockerHasApiKey && savedApiKey) {
            console.log('🔄 [TMDB Debug] 迁移本地配置到Docker')
            fetch('/api/docker-config', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'migrate',
                configData: {
                  tmdb_api_key: savedApiKey,
                  tmdb_import_path: savedTmdbImportPath || ""
                }
              })
            }).catch(err => console.warn('⚠️ [TMDB Debug] 迁移失败:', err))
          }

        } catch (error) {
          console.error('❌ [TMDB Debug] 初始化设置失败:', error)
          // 确保至少设置空值
          setApiKey("")
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

        // 加载硅基流动API设置
        const savedSiliconFlowSettings = await ClientConfigManager.getItem("siliconflow_api_settings")
        if (savedSiliconFlowSettings) {
          const settings = safeJsonParse<any>(savedSiliconFlowSettings)
          if (settings) {
            setSiliconFlowSettings(settings)
          } else {
            console.error('加载硅基流动API设置失败: 解析失败')
          }
        } else {
          // 兼容旧的设置，从分集生成器和缩略图设置中迁移
          const episodeApiKey = await ClientConfigManager.getItem('siliconflow_api_key')
          const thumbnailSettings = await ClientConfigManager.getItem("video_thumbnail_settings")

          let apiKey = episodeApiKey || ""
          if (!apiKey && thumbnailSettings) {
            const parsed = safeJsonParse<any>(thumbnailSettings)
            if (parsed) {
              apiKey = parsed.siliconFlowApiKey || ""
            }
          }

          if (apiKey) {
            setSiliconFlowSettings(prev => ({ ...prev, apiKey }))
          }
        }

        // 加载魔搭社区API设置
        const savedModelScopeSettings = await ClientConfigManager.getItem("modelscope_api_settings")
        if (savedModelScopeSettings) {
          const settings = safeJsonParse<any>(savedModelScopeSettings)
          if (settings) {
            setModelScopeSettings(settings)
          } else {
            console.error('加载魔搭社区API设置失败: 解析失败')
          }
        } else {
          // 兼容旧的设置
          const modelScopeApiKey = await ClientConfigManager.getItem('modelscope_api_key')
          if (modelScopeApiKey) {
            setModelScopeSettings(prev => ({ ...prev, apiKey: modelScopeApiKey }))
          }
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
          
          // 重新获取API密钥
          const currentApiKey = await ClientConfigManager.getItem("tmdb_api_key")
          if (currentApiKey && currentApiKey.trim() !== "") {
            setApiKey(currentApiKey)
            console.log('✅ [TMDB Debug] 刷新后的API密钥:', currentApiKey.substring(0, 8) + '...')
          } else {
            setApiKey("")
            console.log('⚠️ [TMDB Debug] 刷新后无API密钥')
          }
          
          // 重新获取导入路径
          const currentImportPath = await ClientConfigManager.getItem("tmdb_import_path")
          if (currentImportPath) {
            setTmdbImportPath(currentImportPath)
            console.log('✅ [TMDB Debug] 刷新后的导入路径:', currentImportPath)
          }
        } catch (error) {
          console.error('❌ [TMDB Debug] 刷新配置失败:', error)
        }
      }
      
      refreshConfig()
    }
  }, [open])

  // 监听initialSection变化，当对话框打开时设置活动页面
  useEffect(() => {
    if (open && initialSection && typeof initialSection === 'string') {
      console.log('🔄 [DEBUG] useEffect设置activeSection:', {
        initialSection,
        type: typeof initialSection,
        isValidSection: validSections.includes(initialSection)
      })
      
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
      const dockerConfigResponse = await fetch('/api/docker-config')
      const dockerConfigData = await dockerConfigResponse.json()

      if (dockerConfigData.success && dockerConfigData.config.isDockerEnvironment) {
        // Docker环境：保存到服务器端文件系统
        const saveResponse = await fetch('/api/docker-config', {
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
      const dockerConfigResponse = await fetch('/api/docker-config')
      const dockerConfigData = await dockerConfigResponse.json()

      if (dockerConfigData.success && dockerConfigData.config.isDockerEnvironment) {
        // Docker环境：保存到服务器端文件系统
        const saveResponse = await fetch('/api/docker-config', {
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
      const dockerConfigResponse = await fetch('/api/docker-config')
      const dockerConfigData = await dockerConfigResponse.json()

      if (dockerConfigData.success && dockerConfigData.config.isDockerEnvironment) {
        // Docker环境：保存到服务器端文件系统
        const saveResponse = await fetch('/api/docker-config', {
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
      const response = await fetch(`/api/tmdb-config?path=${encodeURIComponent(path)}`)
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
      const response = await fetch('/api/tmdb-config', {
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

  // 异步同步到Docker配置
  const syncToDockerConfig = async (apiKey: string, importPath: string) => {
    try {
      console.log('🐳 [TMDB Debug] 尝试同步到Docker配置...')
      const response = await fetch('/api/docker-config')

      if (!response.ok) {
        console.log('⚠️ [TMDB Debug] Docker API不可用，跳过同步')
        return
      }

      const data = await response.json()
      if (data.success && data.config?.isDockerEnvironment) {
        console.log('🐳 [TMDB Debug] 同步到Docker环境')

        const saveResponse = await fetch('/api/docker-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tmdbApiKey: apiKey,
            tmdbImportPath: importPath
          })
        })

        const saveData = await saveResponse.json()
        if (saveData.success) {
          console.log('✅ [TMDB Debug] Docker配置同步成功')
        } else {
          console.warn('⚠️ [TMDB Debug] Docker配置同步失败:', saveData.error)
        }
      } else {
        console.log('💻 [TMDB Debug] 非Docker环境，无需同步')
      }
    } catch (error) {
      console.warn('⚠️ [TMDB Debug] Docker配置同步异常:', error)
    }
  }

  // API密钥验证已移除，用户可以输入任何内容

  const handleSave = async () => {
    console.log('🚀 [DEBUG] handleSave 函数被调用')
    console.log('📋 [DEBUG] 当前状态:', {
      activeSection,
      activeSectionType: typeof activeSection,
      activeSectionLength: activeSection?.length,
      initialSection,
      apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : '空',
      apiKeyLength: apiKey?.length || 0,
      tmdbImportPath,
      saveStatus,
      isDockerEnv
    })
    
    // 强制检查并修复activeSection
    let currentActiveSection = activeSection
    if (!currentActiveSection || typeof currentActiveSection !== 'string' || currentActiveSection.trim() === '') {
      console.warn('⚠️ [DEBUG] activeSection无效，强制设置为api:', {
        原值: currentActiveSection,
        类型: typeof currentActiveSection,
        长度: currentActiveSection?.length
      })
      currentActiveSection = 'api'
      setActiveSection('api')
    }
    
    console.log('🎯 [DEBUG] 最终使用的activeSection:', currentActiveSection)
    
    setSaveStatus("saving")
    setValidationMessage("")

    try {
      // 根据当前活动的设置页面保存对应的设置
      console.log('🎯 [DEBUG] 进入switch语句，activeSection:', currentActiveSection)
      switch (currentActiveSection) {
        case "api":
          console.log('💾 [DEBUG] 开始保存API设置...', {
            apiKeyType: apiKey === "***已配置***" ? 'placeholder' : 'actual',
            apiKeyValue: apiKey,
            hasImportPath: !!tmdbImportPath
          })

          // 如果API密钥是占位符，跳过验证但仍需保存路径
          if (apiKey === "***已配置***") {
            console.log('⏭️ [DEBUG] API密钥是占位符，只保存路径')

            // 保存路径到适当的存储位置
            try {
              if (isDockerEnv) {
                // Docker环境：保存到Docker配置
                if (tmdbImportPath) {
                  const saveResponse = await fetch('/api/docker-config', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      tmdbImportPath: tmdbImportPath
                    })
                  })

                  const saveData = await saveResponse.json()
                  if (!saveData.success) {
                    throw new Error(saveData.error || '保存失败')
                  }
                  console.log('✅ Docker环境路径保存成功')
                }
              } else {
                // 非Docker环境：保存到服务端配置
                if (tmdbImportPath) {
                  const oldPath = await ClientConfigManager.getItem("tmdb_import_path")
                  await ClientConfigManager.setItem("tmdb_import_path", tmdbImportPath)
                  console.log('✅ 服务端路径保存成功')

                  if (oldPath !== tmdbImportPath) {
                    loadTmdbConfig(tmdbImportPath)
                  }
                }
              }
            } catch (error) {
              console.error('❌ 保存路径失败:', error)
              // 回退到服务端保存
              if (tmdbImportPath) {
                await ClientConfigManager.setItem("tmdb_import_path", tmdbImportPath)
                console.log('🔄 回退到服务端保存路径')
              }
            }
            break
          }

          console.log('✅ [DEBUG] 跳过API密钥验证，直接保存')
          console.log('📝 [DEBUG] 准备保存的数据:', {
            apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : '空',
            apiKeyLength: apiKey?.length || 0,
            tmdbImportPath: tmdbImportPath || '空',
            isDockerEnv
          })

          // 保存API密钥和路径
          try {
            // 确定保存位置：Docker环境优先保存到Docker配置，否则保存到服务端
            console.log('🔍 [DEBUG] 决定保存位置:', { isDockerEnv })
            if (isDockerEnv) {
              // Docker环境：保存到Docker配置
              console.log('🐳 [DEBUG] 在Docker环境中保存配置')
              console.log('📤 [DEBUG] 发送到/api/docker-config的数据:', {
                tmdbApiKey: apiKey ? `${apiKey.substring(0, 8)}...` : '空',
                tmdbImportPath: tmdbImportPath || ''
              })
              const dockerSaveResponse = await fetch('/api/docker-config', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  tmdbApiKey: apiKey,
                  tmdbImportPath: tmdbImportPath || ''
                })
              })

              const dockerSaveData = await dockerSaveResponse.json()
              if (!dockerSaveData.success) {
                throw new Error(dockerSaveData.error || 'Docker配置保存失败')
              }
              console.log('✅ [TMDB Debug] Docker配置保存成功')
              
              // 同时保存到服务端作为备份
              await ClientConfigManager.setItem("tmdb_api_key", apiKey)
              if (tmdbImportPath) {
                await ClientConfigManager.setItem("tmdb_import_path", tmdbImportPath)
              }
              console.log('✅ [TMDB Debug] 服务端备份保存成功')
            } else {
              // 非Docker环境：保存到服务端配置
              console.log('💻 [DEBUG] 在非Docker环境中保存配置')
              console.log('📤 [DEBUG] 调用ClientConfigManager.setItem:', {
                key: 'tmdb_api_key',
                value: apiKey ? `${apiKey.substring(0, 8)}...` : '空'
              })
              await ClientConfigManager.setItem("tmdb_api_key", apiKey)
              console.log('✅ [DEBUG] API密钥已保存到服务端')

              if (tmdbImportPath) {
                console.log('📤 [DEBUG] 保存导入路径:', tmdbImportPath)
                await ClientConfigManager.setItem("tmdb_import_path", tmdbImportPath)
                console.log('✅ [DEBUG] 导入路径已保存到服务端')
              }
            }

            // 验证保存是否成功
            console.log('🔍 [DEBUG] 验证保存结果...')
            const verifyApiKey = await ClientConfigManager.getItem("tmdb_api_key")
            console.log('📋 [DEBUG] 验证结果:', {
              期望: apiKey ? `${apiKey.substring(0, 8)}...` : '空',
              实际: verifyApiKey ? `${verifyApiKey.substring(0, 8)}...` : '空',
              匹配: verifyApiKey === apiKey
            })
            if (verifyApiKey === apiKey) {
              console.log('✅ [DEBUG] 配置保存验证成功')
            } else {
              console.warn('⚠️ [DEBUG] 配置保存验证不一致，但可能是正常的（Docker环境）')
            }

          } catch (error) {
            console.error('❌ [DEBUG] 配置保存失败:', error)
            console.error('❌ [DEBUG] 错误详情:', {
              name: error instanceof Error ? error.name : 'Unknown',
              message: error instanceof Error ? error.message : error,
              stack: error instanceof Error ? error.stack : undefined
            })
            throw error // 重新抛出错误，让用户知道保存失败
          }

          // 处理TMDB配置加载
          if (tmdbImportPath) {
            loadTmdbConfig(tmdbImportPath)
          }
          break

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

        case "tools":
          console.log('🔧 [DEBUG] 保存工具设置')
          await saveTmdbConfig()
          break

        default:
          console.warn('⚠️ [DEBUG] 未知的activeSection:', currentActiveSection)
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
    console.log('❌ 用户取消设置，恢复原始配置')

    handleOpenChange(false)
    setSaveStatus("idle")
    setValidationMessage("")

    if (typeof window === "undefined") return

    // 从服务端恢复配置
    const restoreFromServer = async () => {
      try {
        // 首先检查Docker环境
        let isDockerEnv = false
        let dockerHasApiKey = false
        let dockerImportPath = ''
        
        try {
          const dockerResponse = await fetch('/api/docker-config')
          if (dockerResponse.ok) {
            const dockerData = await dockerResponse.json()
            if (dockerData.success && dockerData.config?.isDockerEnvironment) {
              isDockerEnv = true
              dockerHasApiKey = dockerData.config.hasApiKey
              dockerImportPath = dockerData.config.tmdbImportPath || ''
            }
          }
        } catch (error) {
          console.warn('⚠️ Docker环境检查失败:', error)
        }

        const savedApiKey = await ClientConfigManager.getItem("tmdb_api_key")
        const savedTmdbImportPath = await ClientConfigManager.getItem("tmdb_import_path")

        console.log('🔄 从服务端恢复配置:', {
          hasApiKey: !!savedApiKey,
          hasImportPath: !!savedTmdbImportPath,
          isDockerEnv,
          dockerHasApiKey
        })

        // 恢复API密钥 - 优先级：Docker配置 > 服务端配置
        // 只有在不在编辑状态时才恢复配置
        if (!isCurrentlyEditing()) {
          if (isDockerEnv && dockerHasApiKey) {
            setApiKey("***已配置***")
            console.log('✅ 恢复Docker配置占位符')
          } else if (savedApiKey) {
            setApiKey(savedApiKey)
            console.log('✅ 恢复API密钥')
          } else {
            setApiKey("")
            console.log('🔄 清空API密钥')
          }
        } else {
          console.log('📝 检测到用户正在编辑，跳过恢复覆盖')
        }

        // 恢复导入路径 - 优先级：Docker配置 > 服务端配置
        const finalImportPath = dockerImportPath || savedTmdbImportPath || ''
        setTmdbImportPath(finalImportPath)
        if (finalImportPath) {
          console.log('✅ 恢复导入路径')
        } else {
          console.log('🔄 清空导入路径')
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

  // 检查是否有有效的API密钥
  const hasValidApiKey = () => {
    if (typeof window === "undefined") return false

    // 检查当前表单中的API密钥（包括占位符）
    return apiKey && apiKey.trim().length > 0 && apiKey !== "***已配置***"
  }

  // 检查是否已配置API密钥（不再验证格式，只要有内容就认为已配置）
  const hasConfiguredApiKey = () => {
    if (typeof window === "undefined") return false

    // 只要有API密钥内容就认为已配置
    return apiKey && apiKey.trim().length > 0
  }

  // 检查当前输入状态（用于判断是否在编辑中）
  const isCurrentlyEditing = () => {
    // 简化逻辑：只要不是占位符且有内容，就认为在编辑
    return apiKey && apiKey !== "***已配置***" && apiKey.trim().length > 0
  }

  // 设置菜单项
  const settingsMenuItems = [
    {
      id: "api",
      label: "API配置",
      icon: Key,
      description: "TMDB API密钥设置"
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
      case "api":
        return renderApiSettings()
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
        return renderApiSettings()
    }
  }

  // API设置内容
  function renderApiSettings() {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-2">API配置</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            配置各种API密钥以启用相关功能
          </p>
        </div>

        {/* API配置顶部导航 */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setApiActiveTab("tmdb")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${apiActiveTab === "tmdb"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
            >
              TMDB API
            </button>
            <button
              onClick={() => setApiActiveTab("siliconflow")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${apiActiveTab === "siliconflow"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
            >
              硅基流动 API
            </button>
            <button
              onClick={() => setApiActiveTab("modelscope")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${apiActiveTab === "modelscope"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
            >
              魔搭社区 API
            </button>
          </nav>
        </div>

        {/* 根据选中的标签页显示不同内容 */}
        {apiActiveTab === "tmdb" && renderTMDBApiSettings()}
        {apiActiveTab === "siliconflow" && renderSiliconFlowApiSettings()}
        {apiActiveTab === "modelscope" && renderModelScopeApiSettings()}
      </div>
    )
  }

  // TMDB API设置
  function renderTMDBApiSettings() {

    return (
      <div className="space-y-6">
        {/* Docker环境提示 */}
        {isDockerEnv && (
          <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">Docker环境检测</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    检测到您正在Docker环境中运行，API密钥将保存到容器的持久化存储中，确保重启后不会丢失。
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6 space-y-4">
            <div>
              <Label htmlFor="apiKey" className="flex items-center text-sm font-medium">
                TMDB API密钥
                {apiKey === "***已配置***" && (
                  <Badge variant="default" className="ml-2 text-xs">
                    已配置
                  </Badge>
                )}
              </Label>
              <div className="relative mt-2">
                <Input
                  id="apiKey"
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={apiKey === "***已配置***" ? "API密钥已配置，如需更改请输入新密钥" : "输入您的TMDB API密钥"}
                  className={`pr-10 ${saveStatus === "success"
                    ? "border-green-300 focus:border-green-500"
                    : saveStatus === "error"
                      ? "border-red-300 focus:border-red-500"
                      : apiKey === "***已配置***"
                        ? "border-green-300 bg-green-50 dark:bg-green-950"
                        : ""
                    }`}
                  disabled={apiKey === "***已配置***" && !showApiKey}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => {
                    if (apiKey === "***已配置***") {
                      // 如果是占位符，点击时清空并允许编辑
                      setApiKey("")
                      setShowApiKey(true)
                    } else {
                      setShowApiKey(!showApiKey)
                    }
                  }}
                >
                  {apiKey === "***已配置***" ? (
                    <Key className="h-4 w-4" />
                  ) : showApiKey ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {apiKey === "***已配置***" && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  API密钥已安全保存。点击右侧按钮可修改密钥。
                </p>
              )}
            </div>

            {/* 当前状态显示 */}
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">API状态:</span>
                <Badge variant={hasConfiguredApiKey() ? "default" : "secondary"}>
                  {hasConfiguredApiKey() ? "已配置" : "未配置"}
                </Badge>
              </div>
              {apiKey === "***已配置***" ? (
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                  安全存储中
                </span>
              ) : hasValidApiKey() && apiKey && (
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                  {apiKey.substring(0, 8)}...{apiKey.substring(apiKey.length - 4)}
                </span>
              )}
            </div>

            {/* 帮助信息 */}
            <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-3">
                  <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">如何获取TMDB API密钥？</p>
                  <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-2 list-decimal list-inside">
                    <li>访问TMDB官网并注册账户</li>
                    <li>进入账户设置页面</li>
                    <li>在API部分申请新的API密钥</li>
                    <li>复制生成的API密钥到此处</li>
                  </ol>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open("https://www.themoviedb.org/settings/api", "_blank")}
                    className="mt-3"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    前往TMDB设置页面
                  </Button>
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

  // 硅基流动API设置
  function renderSiliconFlowApiSettings() {
    const saveSiliconFlowSettings = async () => {
      setSiliconFlowSaving(true)
      try {
        // 检查是否在Docker环境中
        const dockerConfigResponse = await fetch('/api/docker-config')
        const dockerConfigData = await dockerConfigResponse.json()

        if (dockerConfigData.success && dockerConfigData.config.isDockerEnvironment) {
          // Docker环境：保存到服务器端文件系统
          const saveResponse = await fetch('/api/docker-config', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              siliconFlowApiKey: siliconFlowSettings.apiKey,
              siliconFlowThumbnailModel: siliconFlowSettings.thumbnailFilterModel
            })
          })

          const saveData = await saveResponse.json()
          if (!saveData.success) {
            throw new Error(saveData.error || '保存失败')
          }
        } else {
          // 保存到服务端配置
          await ClientConfigManager.setItem("siliconflow_api_settings", JSON.stringify(siliconFlowSettings))

          // 同步更新到分集生成器的配置
          await ClientConfigManager.setItem('siliconflow_api_key', siliconFlowSettings.apiKey)

          // 同步更新到缩略图设置
          const savedVideoSettings = await ClientConfigManager.getItem("video_thumbnail_settings")
          if (savedVideoSettings) {
            try {
              const settings = JSON.parse(savedVideoSettings)
              settings.siliconFlowApiKey = siliconFlowSettings.apiKey
              settings.siliconFlowModel = siliconFlowSettings.thumbnailFilterModel
              await ClientConfigManager.setItem("video_thumbnail_settings", JSON.stringify(settings))
            } catch (error) {
              console.error('同步缩略图设置失败:', error)
            }
          }
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
        // 检查是否在Docker环境中
        const dockerConfigResponse = await fetch('/api/docker-config')
        const dockerConfigData = await dockerConfigResponse.json()

        if (dockerConfigData.success && dockerConfigData.config.isDockerEnvironment) {
          // Docker环境：保存到服务器端文件系统
          const saveResponse = await fetch('/api/docker-config', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              modelScopeApiKey: modelScopeSettings.apiKey,
              modelScopeEpisodeModel: modelScopeSettings.episodeGenerationModel
            })
          })

          const saveData = await saveResponse.json()
          if (!saveData.success) {
            throw new Error(saveData.error || '保存失败')
          }
        } else {
          // 保存到服务端配置
          await ClientConfigManager.setItem("modelscope_api_settings", JSON.stringify(modelScopeSettings))

          // 同步更新到分集生成器的配置
          await ClientConfigManager.setItem('modelscope_api_key', modelScopeSettings.apiKey)
        }

        // 触发自定义事件，通知其他组件设置已更改
        window.dispatchEvent(new CustomEvent('modelscope-settings-changed', {
          detail: modelScopeSettings
        }))

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

                    <SelectItem value="moonshotai/Kimi-K2-Instruct">
                      <div className="flex flex-col">
                        <span className="font-medium">Kimi-K2-Instruct</span>
                        <span className="text-xs text-gray-500">月之暗面Kimi大模型，支持长文本理解</span>
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
        {/* 自动更新管理 */}
        <TMDBImportUpdater
          onPathUpdate={async (path) => {
            setTmdbImportPath(path)
            await ClientConfigManager.setItem("tmdb_import_path", path)
          }}
        />

        {/* 手动路径配置 */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="border-t pt-4">
              <h4 className="text-base font-medium mb-2 flex items-center">
                <FolderOpen className="h-4 w-4 mr-2" />
                手动路径配置
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                如果需要使用自定义路径或现有安装，可以手动指定工具路径
              </p>
            </div>

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

        {/* config.ini配置 */}
        {tmdbImportPath && (
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        )}

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
                  <div className="text-sm text-blue-800 dark:text-blue-200">
                    <p className="font-medium mb-1">AI筛选工作原理：</p>
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

        {/* 帮助与支持顶部导航 - 采用与 API 配置一致的标签式布局 */}
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
            <button
              onClick={() => setHelpActiveTab("docker")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${helpActiveTab === "docker"
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
            >
              Docker镜像版本管理
            </button>
          </nav>
        </div>

        {/* 根据选中的标签页显示内容 */}
        {helpActiveTab === "docker" && (
          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Download className="h-5 w-5 mr-2" />
                  Docker镜像版本管理
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DockerVersionManager />
              </CardContent>
            </Card>
          </div>
        )}

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
                      <li>• Docker镜像版本管理</li>
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
                    
                    // 如果用户不在API页面但是有API密钥输入，先切换到API页面
                    if (activeSection !== 'api' && apiKey && 
                        typeof apiKey === 'string' && 
                        apiKey.trim() !== '' && 
                        apiKey !== '***已配置***') {
                      console.log('🔄 [DEBUG] 检测到API密钥输入，切换到API页面')
                      setActiveSection('api')
                      setTimeout(() => {
                        handleSave()
                      }, 100)
                    } else {
                      handleSave()
                    }
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