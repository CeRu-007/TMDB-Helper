"use client"

import type React from "react"
import type { MediaNewsType } from "../types/media-news"

import { useState, useEffect } from "react"
import {
  Plus,
  Settings,
  Download,
  Upload,
  Calendar,
  Film,
  Tv,
  Star,
  Clock,
  CheckCircle2,
  PlayCircle,
  Menu,
  Sun,
  Moon,
  Video,
  LayoutGrid,
  Clapperboard,
  Baby,
  Popcorn,
  Ticket,
  Sparkles,
  Wand2,
  FileText,
  Loader2,
  RefreshCw,
  AlertTriangle,
  AlarmClock,
  ExternalLink,
  Wifi,
  Key,
  Server,
  Filter,
  XCircle,
  CalendarRange,
  BarChart2,
} from "lucide-react"

// 导入新的工具和组件
import { log } from '@/lib/logger'
import { handleError } from '@/lib/error-handler'
import { perf } from '@/lib/performance-manager'
import { ErrorBoundary } from '@/components/error-boundary'
import { useMediaNews } from '@/hooks/use-media-news'
import { useScheduledTasks } from '@/hooks/use-scheduled-tasks'
import { WeekdayNavigation } from '@/components/home/weekday-navigation'
import { MediaNewsSection } from '@/components/home/media-news-section'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTheme } from "next-themes"
import Link from "next/link"
import Image from "next/image"
import AddItemDialog from "@/components/add-item-dialog"
import SettingsDialog from "@/components/settings-dialog"
import ItemDetailDialog from "@/components/item-detail-dialog"
import VideoThumbnailExtractor from "@/components/video-thumbnail-extractor"
import { ImageCropper } from "@/components/image-cropper"
import GlobalScheduledTasksDialog from "@/components/global-scheduled-tasks-dialog"
import { TaskExecutionLogsDialog } from "@/components/task-execution-logs-dialog"
import ScheduledTaskDialog from "@/components/scheduled-task-dialog"
import { type TMDBItem, type ScheduledTask } from "@/lib/storage"
import { taskScheduler } from "@/lib/scheduler"
import { useMobile } from "@/hooks/use-mobile"
import MediaCard from "@/components/media-card"
import { useIsClient } from "@/hooks/use-is-client"
import { useData } from "@/components/client-data-provider"
import { StatCard } from "@/components/ui/stat-card"
import { StorageManager } from "@/lib/storage"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { ClientConfigManager } from "@/lib/client-config-manager"
import ImportDataDialog from "@/components/import-data-dialog"
import ExportDataDialog from "@/components/export-data-dialog"
import { SidebarLayout } from "@/components/sidebar-layout"
import { LayoutSwitcher } from "@/components/layout-switcher"
import { LayoutPreferencesManager, type LayoutType } from "@/lib/layout-preferences"
import { UserAvatar, useUser } from "@/components/user-identity-provider"
import { MobileFloatingStatusIndicator } from "@/components/realtime-status-indicator"
import { SubtitleEpisodeGenerator } from "@/components/subtitle-episode-generator"



const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]

// 定义国家/区域常量
const REGIONS = [
  { id: "CN", name: "中国大陆", icon: "🇨🇳" },
  { id: "HK", name: "香港", icon: "🇭🇰" },
  { id: "TW", name: "台湾", icon: "🇹🇼" },
  { id: "JP", name: "日本", icon: "🇯🇵" },
  { id: "KR", name: "韩国", icon: "🇰🇷" },
  { id: "US", name: "美国", icon: "🇺🇸" },
  { id: "GB", name: "英国", icon: "🇬🇧" },
]

// 区域分组
const REGION_GROUPS = [
  {
    name: "亚洲",
    regions: ["CN", "HK", "TW", "JP", "KR"]
  },
  {
    name: "欧美",
    regions: ["US", "GB"]
  }
];

// 判断当前环境是否为客户端
const isClientEnv = typeof window !== 'undefined'

export default function HomePage() {
  const { toast } = useToast()
  const router = useRouter()
  const { userInfo, isInitialized } = useUser()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [settingsInitialSection, setSettingsInitialSection] = useState<string | undefined>(undefined)
  const [showTasksDialog, setShowTasksDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showExecutionLogs, setShowExecutionLogs] = useState(false)
  const [runningTasks, setRunningTasks] = useState<ScheduledTask[]>([])
  const [showScheduledTaskDialog, setShowScheduledTaskDialog] = useState(false)
  const [scheduledTaskItem, setScheduledTaskItem] = useState<TMDBItem | null>(null)
  const [selectedItem, setSelectedItem] = useState<TMDBItem | null>(null)
  const [currentDay, setCurrentDay] = useState(() => {
    if (isClientEnv) {
      const jsDay = new Date().getDay() // 0-6，0是周日
      return jsDay === 0 ? 6 : jsDay - 1 // 转换为0=周一，6=周日
    }
    return 0 // 默认周一
  })

  // 确保客户端渲染时正确设置当前日期
  const [isClientReady, setIsClientReady] = useState(false)
  const [activeTab, setActiveTab] = useState("ongoing")
  const [selectedDayFilter, setSelectedDayFilter] = useState<"recent" | number>("recent")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [upcomingItems, setUpcomingItems] = useState<any[]>([])
  const [loadingUpcoming, setLoadingUpcoming] = useState(false)
  const [upcomingError, setUpcomingError] = useState<string | null>(null)
  const [upcomingLastUpdated, setUpcomingLastUpdated] = useState<string | null>(null)
  const [isMissingApiKey, setIsMissingApiKey] = useState(false)
  const isMobile = useMobile()
  const { theme, setTheme } = useTheme()
  const isClient = useIsClient()
  const [selectedRegion, setSelectedRegion] = useState<string>("CN")
  const [upcomingItemsByRegion, setUpcomingItemsByRegion] = useState<Record<string, any[]>>({})
  // 影视资讯子类型
  const [mediaNewsType, setMediaNewsType] = useState<string>('upcoming');
  // 近期开播内容
  const [recentItems, setRecentItems] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);
  const [recentLastUpdated, setRecentLastUpdated] = useState<string | null>(null);
  const [recentItemsByRegion, setRecentItemsByRegion] = useState<Record<string, any[]>>({});

  // 布局状态管理（使用本地缓存作为首屏渲染的同步来源，避免闪烁）
  const [currentLayout, setCurrentLayout] = useState<LayoutType>(() => {
    try {
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem('tmdb_helper_layout_preferences')
        if (cached) {
          const pref = JSON.parse(cached)
          if (pref?.layoutType === 'sidebar' || pref?.layoutType === 'original') {
            return pref.layoutType as LayoutType
          }
        }
      }
    } catch (e) {
      // 忽略本地解析错误，回退默认
    }
    return 'original'
  })

  // 初始化布局偏好
  useEffect(() => {
    if (isClient) {
      const loadPreferences = async () => {
        try {
          const preferences = await LayoutPreferencesManager.getPreferences()
          setCurrentLayout(preferences.layoutType)
          // 将当前偏好写入本地缓存，供下次首屏同步读取，避免刷新闪烁
          try {
            localStorage.setItem('tmdb_helper_layout_preferences', JSON.stringify(preferences))
          } catch {}
        } catch (error) {
          console.error('Failed to load layout preferences:', error)
          // 读取失败则保持现有状态（可能来自本地缓存），避免强制抖动
        }
      }
      loadPreferences()
    }
  }, [isClient])

  // 处理布局切换
  const handleLayoutChange = (newLayout: LayoutType) => {
    setCurrentLayout(newLayout)
  }

  // 使用增强的数据提供者获取数据和方法
  const { 
    items, 
    baseItems,
    loading, 
    error: loadError, 
    initialized, 
    isConnected,
    pendingOperations,
    refreshData: handleRefresh, 
    addItem: handleAddItem, 
    updateItem: handleUpdateItem, 
    deleteItem: handleDeleteItem,
    exportData,
    importData: importDataFromJson,
    clearError,
    getOptimisticStats
  } = useData()

  // 获取即将上线的内容
  const fetchUpcomingItems = async (silent = false, retryCount = 0, region = selectedRegion, signal?: AbortSignal) => {
    if (!silent) {
      setLoadingUpcoming(true);
    }
    setUpcomingError(null);
    setIsMissingApiKey(false);

    // 检查signal是否已经被中止
    if (signal?.aborted) {
      console.log('[fetchUpcomingItems] 请求已被中止，跳过执行');
      if (!silent) {
        setLoadingUpcoming(false);
      }
      return;
    }

    try {

      // 优化AbortController使用逻辑
      let requestSignal: AbortSignal;
      let timeoutId: NodeJS.Timeout | undefined;

      if (signal) {
        // 使用外部提供的signal
        requestSignal = signal;
      } else {
        // 创建新的controller并设置超时
        const controller = new AbortController();
        requestSignal = controller.signal;
        timeoutId = setTimeout(() => {
          console.log('[fetchUpcomingItems] 请求超时，中止请求');
          controller.abort();
        }, 30000); // 30秒超时
      }

      const response = await fetch(`/api/tmdb/upcoming?region=${region}`, {
        signal: requestSignal,
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      // 清理超时定时器
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('服务器响应错误:', errorText);
        
        // 检查是否是API密钥未配置或用户身份验证失败的错误
        if (response.status === 400 && errorText.includes('API密钥未配置')) {
          setIsMissingApiKey(true);
          throw new Error('TMDB API密钥未配置，请在设置中配置');
        }
        if (response.status === 401) {
          setIsMissingApiKey(true);
          throw new Error('用户身份验证失败，请刷新页面重试');
        }
        
        // 根据HTTP状态码提供更详细的错误信息
        let errorMessage = `获取影视资讯内容失败 (${response.status})`;
        if (response.status === 500) {
          errorMessage = `服务器内部错误 (500)，请稍后再试`;
        } else if (response.status === 503) {
          errorMessage = `TMDB服务暂时不可用 (503)，请稍后再试`;
        } else if (response.status === 429) {
          errorMessage = `请求过于频繁 (429)，请稍后再试`;
        } else if (response.status >= 400 && response.status < 500) {
          errorMessage = `请求错误 (${response.status})，请检查API配置`;
        }
        
        // 尝试解析错误响应为JSON
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error) {
            errorMessage = errorJson.error;
          }
        } catch (e) {
          // 如果无法解析为JSON，使用原始错误文本
          console.debug('无法解析错误响应为JSON:', e);
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      if (data.success) {
        // 保存数据到状态 - 区分不同区域的数据
        const newUpcomingItemsByRegion = { ...upcomingItemsByRegion };
        newUpcomingItemsByRegion[region] = data.results;
        setUpcomingItemsByRegion(newUpcomingItemsByRegion);
        
        // 如果当前选中的是这个区域，也更新主要数据
        if (region === selectedRegion) {
          setUpcomingItems(data.results);
        }
        
        setUpcomingLastUpdated(new Date().toLocaleString('zh-CN'));
        
        // 数据现在存储在服务端，不再需要localStorage缓存
        console.log(`即将上映数据已更新 (${region}):`, data.results.length, '项');
      } else {
        // 检查是否是API密钥未配置的错误
        if (data.error && data.error.includes('API密钥未配置')) {
          setIsMissingApiKey(true);
          throw new Error('TMDB API密钥未配置，请在设置中配置');
        }
        throw new Error(data.error || '获取影视资讯内容失败');
      }
    } catch (error) {
      // 专门处理AbortError
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[fetchUpcomingItems] 请求被中止:', error.message);
        if (!silent) {
          setLoadingUpcoming(false);
        }
        return; // 对于AbortError，直接返回，不进行重试或错误处理
      }

      console.error('获取影视资讯内容失败:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      // 对于TMDB API连接失败，不显示错误，静默处理
      if (errorMessage.includes('TMDB API连接失败') ||
          errorMessage.includes('网络连接异常') ||
          errorMessage.includes('fetch failed')) {
        console.debug('TMDB API连接问题，静默处理:', errorMessage);
        if (!silent) {
          setLoadingUpcoming(false);
        }
        return;
      }

      setUpcomingError(errorMessage);

      // 如果是网络错误或超时，尝试重试（最多5次）
      // 注意：移除了对'aborted'的检查，因为AbortError已经单独处理
      if (retryCount < 5 &&
          (errorMessage.includes('network') ||
           errorMessage.includes('timeout') ||
           error instanceof TypeError)) {
        console.log(`尝试重新获取影视资讯内容，第${retryCount + 1}次重试`);
        
        // 使用指数退避算法计算延迟时间
        // 基础延迟为1000ms，每次重试翻倍，并添加随机因子
        const baseDelay = 1000;
        const exponentialDelay = baseDelay * Math.pow(2, retryCount);
        const jitter = Math.random() * 1000; // 0-1000ms的随机值
        const delay = exponentialDelay + jitter;
        
        console.log(`重试延迟: ${Math.round(delay)}ms`);
        
        // 延迟重试，避免立即重试可能导致的同样错误
        setTimeout(() => {
          fetchUpcomingItems(silent, retryCount + 1, region, signal);
        }, delay);
        
        return; // 不要继续执行后面的代码
      }
      
      // 如果重试失败或其他错误，尝试从localStorage加载缓存数据
      if (retryCount >= 5) {
        try {
          // 检查是否在客户端环境
          if (typeof window === 'undefined') {
            console.log('[HomePage] 服务器端渲染，跳过localStorage操作');
            return;
          }

          const cachedItems = localStorage.getItem(`upcomingItems_${region}`);
          const cachedLastUpdated = localStorage.getItem('upcomingLastUpdated');

          if (cachedItems && cachedItems.trim() !== '') {
            const parsedItems = JSON.parse(cachedItems);
            if (Array.isArray(parsedItems)) {
              const newUpcomingItemsByRegion: Record<string, any[]> = { ...upcomingItemsByRegion };
              newUpcomingItemsByRegion[region] = parsedItems;
              setUpcomingItemsByRegion(newUpcomingItemsByRegion);
              if (cachedLastUpdated) {
                setUpcomingLastUpdated(cachedLastUpdated + ' (缓存)');
              }
              setUpcomingError('无法获取最新数据，显示的是缓存数据');
            }
          }
        } catch (e) {
          console.warn('无法从本地存储加载缓存数据:', e);
          // 清除损坏的缓存数据
          try {
            if (typeof window !== 'undefined') {
              localStorage.removeItem(`upcomingItems_${region}`);
            }
          } catch (cleanupError) {
            console.warn('清除损坏缓存失败:', cleanupError);
          }
        }
      }
    } finally {
      if (!silent) {
        setLoadingUpcoming(false);
      }
    }
  };

  // 加载缓存数据和自动刷新
  useEffect(() => {
    // 创建一个AbortController
    const abortController = new AbortController();
    let isMounted = true; // 添加挂载状态标记

    const loadDataAndStartRefresh = async () => {
      // 首先尝试从localStorage加载缓存数据
      try {
        // 检查是否在客户端环境
        if (typeof window === 'undefined') {
          console.log('[HomePage] 服务器端渲染，跳过localStorage操作');
          return;
        }

        // 加载所有区域的缓存数据
        const newUpcomingItemsByRegion: Record<string, any[]> = {};
        let hasAnyData = false;

        REGIONS.forEach(region => {
          try {
            const cachedItems = localStorage.getItem(`upcomingItems_${region.id}`);
            if (cachedItems && cachedItems.trim() !== '') {
              const parsedItems = JSON.parse(cachedItems);
              if (Array.isArray(parsedItems)) {
                newUpcomingItemsByRegion[region.id] = parsedItems;
                hasAnyData = true;
              }
            }
          } catch (parseError) {
            console.warn(`[HomePage] 解析缓存数据失败 (${region.id}):`, parseError);
            // 清除损坏的缓存数据
            try {
              localStorage.removeItem(`upcomingItems_${region.id}`);
            } catch (e) {
              console.warn(`[HomePage] 清除损坏缓存失败:`, e);
            }
          }
        });

        if (hasAnyData && isMounted) {
          setUpcomingItemsByRegion(newUpcomingItemsByRegion);
          // 设置当前选中区域的数据
          if (newUpcomingItemsByRegion[selectedRegion]) {
            setUpcomingItems(newUpcomingItemsByRegion[selectedRegion]);
          }

          const cachedLastUpdated = localStorage.getItem('upcomingLastUpdated');
          if (cachedLastUpdated) {
            setUpcomingLastUpdated(cachedLastUpdated);
          }
        }
      } catch (e) {
        console.warn('无法从本地存储加载缓存数据:', e);
      }

      // 检查组件是否仍然挂载且请求未被中止
      if (!isMounted || abortController.signal.aborted) {
        return;
      }

      // 然后获取最新数据 - 默认只获取当前选中的区域
      try {
        await fetchUpcomingItems(false, 0, selectedRegion, abortController.signal);
      } catch (error) {
        // 错误已在fetchUpcomingItems中处理
        console.debug('[HomePage] 初始数据获取完成');
      }
    };

    // 启动数据加载
    loadDataAndStartRefresh();

    // 每小时刷新一次
    const intervalId = setInterval(() => {
      if (isMounted && !abortController.signal.aborted) {
        fetchUpcomingItems(true, 0, selectedRegion, abortController.signal); // 静默刷新
      }
    }, 60 * 60 * 1000); // 1小时

    return () => {
      isMounted = false; // 标记组件已卸载
      clearInterval(intervalId);
      // 组件卸载时中止所有未完成的请求
      abortController.abort();
    };
  }, []); // 保持空依赖数组，因为我们不希望这个effect重新运行
  
  // 当选中区域变化时加载对应区域的数据
  useEffect(() => {
    // 为每个区域变化创建单独的AbortController
    const abortController = new AbortController();
    let isMounted = true;

    const loadRegionData = async () => {
      // 检查组件是否仍然挂载
      if (!isMounted) return;

      if (upcomingItemsByRegion[selectedRegion]) {
        // 如果已经有数据，直接使用
        setUpcomingItems(upcomingItemsByRegion[selectedRegion]);
      } else {
        // 检查请求是否已被中止
        if (abortController.signal.aborted) {
          console.log('[HomePage] 区域数据请求已被中止');
          return;
        }

        // 否则请求新数据，传入signal
        try {
          await fetchUpcomingItems(false, 0, selectedRegion, abortController.signal);
        } catch (error) {
          // 错误已在fetchUpcomingItems中处理
          console.debug(`[HomePage] 区域 ${selectedRegion} 数据获取完成`);
        }
      }
    };

    loadRegionData();

    return () => {
      isMounted = false;
      // 区域变化时中止上一个区域的请求
      abortController.abort();
    };
  }, [selectedRegion, upcomingItemsByRegion]); // 添加upcomingItemsByRegion到依赖数组

  // 添加自动修复定时任务的功能
  useEffect(() => {
    if (!isClientEnv) return;
    
    const autoFixScheduledTasks = async () => {
      try {
        console.log("正在检查并自动修复定时任务...");
        // 强制刷新将执行migrateScheduledTasks
        const fixedTasks = await StorageManager.forceRefreshScheduledTasks();
        console.log(`定时任务检查完成，共处理 ${fixedTasks.length} 个任务`);
      } catch (error) {
        console.error("自动修复定时任务时发生错误:", error);
      }
    };
    
    // 延迟3秒执行，确保其他组件已加载完成
    const timer = setTimeout(() => {
      autoFixScheduledTasks();
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);

  // 定时更新当前日期（仅在客户端）
  useEffect(() => {
    if (!isClient) return

    const dayTimer = setInterval(() => {
      // 将JS的日期（0=周日，1=周一）转换为我们的数组索引（0=周一，6=周日）
      const jsDay = new Date().getDay() // 0-6，0是周日
      const adjustedDay = jsDay === 0 ? 6 : jsDay - 1 // 转换为0=周一，6=周日
      setCurrentDay(adjustedDay)
    }, 60000)

    return () => {
      clearInterval(dayTimer);
    }
  }, [isClient])

  // 监控正在运行的任务
  useEffect(() => {
    if (!isClientEnv) return;

    const updateRunningTasks = async () => {
      try {
        const allTasks = await StorageManager.getScheduledTasks();
        const running = allTasks.filter(task =>
          task.isRunning || taskScheduler.isTaskRunning(task.id)
        );
        setRunningTasks(running);
      } catch (error) {
        console.error('获取正在运行的任务失败:', error);
      }
    };

    // 初始加载
    updateRunningTasks();

    // 每2秒检查一次正在运行的任务
    const interval = setInterval(updateRunningTasks, 2000);

    return () => clearInterval(interval);
  }, [isClientEnv]);

  // 定义分类列表
  const categories = [
    { id: "all", name: "全部", icon: <LayoutGrid className="h-4 w-4 mr-2" /> },
    { id: "anime", name: "动漫", icon: <Sparkles className="h-4 w-4 mr-2" /> },
    { id: "tv", name: "电视剧", icon: <Tv className="h-4 w-4 mr-2" /> },
    { id: "kids", name: "少儿", icon: <Baby className="h-4 w-4 mr-2" /> },
    { id: "variety", name: "综艺", icon: <Popcorn className="h-4 w-4 mr-2" /> },
    { id: "short", name: "短剧", icon: <Ticket className="h-4 w-4 mr-2" /> },
    { id: "movie", name: "电影", icon: <Clapperboard className="h-4 w-4 mr-2" /> },
  ]

  // 客户端渲染时正确初始化当前日期
  useEffect(() => {
    if (isClient) {
      const jsDay = new Date().getDay()
      const adjustedDay = jsDay === 0 ? 6 : jsDay - 1
      setCurrentDay(adjustedDay)
      setIsClientReady(true)
    }
  }, [isClient])



  const getItemsByStatus = (status: "ongoing" | "completed") => {
    return items.filter((item) => item.status === status)
  }

  const getItemsByDay = (items: TMDBItem[], day: number) => {
    return items.filter((item) => 
      // 主播出日匹配 或 第二播出日匹配（如果有）
      item.weekday === day || 
      (typeof item.secondWeekday === 'number' && item.secondWeekday === day)
    )
  }

  // 根据分类筛选词条
  const filterItemsByCategory = (items: TMDBItem[]) => {
    if (selectedCategory === "all") return items;
    
    // 优先使用category字段筛选
    return items.filter(item => {
      // 如果有category字段，直接用它判断
      if (item.category) {
        return item.category === selectedCategory;
      }
      
      // 没有category字段时，使用备用逻辑
      const title = item.title.toLowerCase();
      const notes = item.notes?.toLowerCase() || "";
      
      switch(selectedCategory) {
        case "anime":
          return title.includes("动漫") || notes.includes("动漫") || 
                 title.includes("anime") || notes.includes("anime");
        case "tv":
          return item.mediaType === "tv" && 
                 !title.includes("动漫") && !notes.includes("动漫") &&
                 !title.includes("综艺") && !notes.includes("综艺") &&
                 !title.includes("少儿") && !notes.includes("少儿") &&
                 !title.includes("短剧") && !notes.includes("短剧");
        case "kids":
          return title.includes("少儿") || notes.includes("少儿") ||
                 title.includes("儿童") || notes.includes("儿童");
        case "variety":
          return title.includes("综艺") || notes.includes("综艺");
        case "short":
          return title.includes("短剧") || notes.includes("短剧");
        case "movie":
          return item.mediaType === "movie";
        default:
          return true;
      }
    });
  }

  const getFilteredItems = (items: TMDBItem[]) => {
    // 注意：items已经是按分类过滤过的，不需要再次过滤
    
    if (selectedDayFilter === "recent") {
      // 获取当前JS的星期几（0=周日，1=周一，...，6=周六）
      const jsWeekday = new Date().getDay()

      // 计算到指定weekday的天数差（考虑循环）
      const getDayDifference = (targetWeekday: number) => {
        const safeTarget = targetWeekday % 7;
        let diff = safeTarget - jsWeekday;
        if (diff < 0) diff += 7;
        return diff;
      };

      // 获取条目距离今天最近的播出weekday
      const getNearestWeekday = (it: TMDBItem) => {
        const primaryDiff = getDayDifference(it.weekday);
        if (typeof it.secondWeekday === 'number') {
          const secondDiff = getDayDifference(it.secondWeekday);
          return secondDiff < primaryDiff ? it.secondWeekday : it.weekday;
        }
        return it.weekday;
      };

      // 获取条目距离今天最近的播出weekday
      const isToday = (it: TMDBItem) => {
        return it.weekday === jsWeekday || it.secondWeekday === jsWeekday;
      };

      return items.sort((a, b) => {
        // 获取更新时间
        const timeA = new Date(a.updatedAt).getTime();
        const timeB = new Date(b.updatedAt).getTime();
        
        // 判断是否为今天的播出日（周几）
        const aIsToday = isToday(a);
        const bIsToday = isToday(b);
        
        // 判断是否为每日更新内容，优先使用isDailyUpdate属性
        const aIsDailyUpdate = a.isDailyUpdate === true || (
          a.isDailyUpdate === undefined && (
            a.category === "tv" || 
            a.category === "short" || 
            (a.mediaType === "tv" && 
              (!a.category || 
              (a.category !== "anime" && a.category !== "kids" && a.category !== "variety")))
          )
        );
        
        const bIsDailyUpdate = b.isDailyUpdate === true || (
          b.isDailyUpdate === undefined && (
            b.category === "tv" || 
            b.category === "short" || 
            (b.mediaType === "tv" && 
              (!b.category || 
              (b.category !== "anime" && b.category !== "kids" && b.category !== "variety")))
          )
        );
        
        // 在"全部"分类下使用特殊的排序逻辑
        if (selectedCategory === "all") {
          // 第一优先级：当前日期的词条（今天是周几就显示周几的内容）
          // 注意：电视剧和短剧也可能有周几信息，这里不区分内容类型，确保当天的所有内容都排在前面
          if (aIsToday !== bIsToday) {
            return aIsToday ? -1 : 1; // 今天的播出日排在前面
          }
          
          // 如果都是当前日期的词条，则按内容类型和更新时间排序
          if (aIsToday && bIsToday) {
            // 同为今天的内容，优先显示非每日更新内容（避免每日更新标签覆盖当天标签）
            if (aIsDailyUpdate !== bIsDailyUpdate) {
              return aIsDailyUpdate ? 1 : -1; // 非每日更新内容排在前面
            }
            return timeB - timeA; // 最后按更新时间排序
          }
          
          // 第二优先级：带每日更新标签的词条
          if (aIsDailyUpdate !== bIsDailyUpdate) {
            return aIsDailyUpdate ? -1 : 1; // 每日更新内容排在前面
          }
          
          // 第三优先级：按照未来最近的日期排序（今天是周一，则按周二、周三、周四...的顺序）
          const aDayDiff = getDayDifference(getNearestWeekday(a));
          const bDayDiff = getDayDifference(getNearestWeekday(b));
          
          // 确保差值不同时进行排序
          if (aDayDiff !== bDayDiff) {
            return aDayDiff - bDayDiff; // 天数差小的排在前面
          }
        } else {
          // 其他分类使用相同的排序逻辑
          // 第一优先级：是否是今天的播出日（周几）
          // 注意：电视剧和短剧也可能有周几信息，这里不区分内容类型，确保当天的所有内容都排在前面
          if (aIsToday !== bIsToday) {
            return aIsToday ? -1 : 1; // 今天的播出日排在前面
          }
          
          // 如果都是当前日期的词条，则按内容类型和更新时间排序
          if (aIsToday && bIsToday) {
            // 同为今天的内容，优先显示非每日更新内容（避免每日更新标签覆盖当天标签）
            if (aIsDailyUpdate !== bIsDailyUpdate) {
              return aIsDailyUpdate ? 1 : -1; // 非每日更新内容排在前面
            }
            return timeB - timeA; // 最后按更新时间排序
          }
          
          // 第二优先级：是否是每日更新的电视剧或短剧
          if (aIsDailyUpdate !== bIsDailyUpdate) {
            return aIsDailyUpdate ? -1 : 1; // 每日更新内容排在前面
          }
          
          // 第三优先级：按照未来最近的日期排序（今天是周一，则按周二、周三、周四...的顺序）
          const aDayDiff = getDayDifference(getNearestWeekday(a));
          const bDayDiff = getDayDifference(getNearestWeekday(b));
          
          // 确保差值不同时进行排序
          if (aDayDiff !== bDayDiff) {
            return aDayDiff - bDayDiff; // 天数差小的排在前面
          }
        }

        // 最后优先级：更新时间的细微差异
        return timeB - timeA;
      })
    } else {
      // 按指定日期筛选，获取该日期的所有内容
      const filteredItems = getItemsByDay(items, selectedDayFilter);
      
      // 获取当前JS的星期几（0=周日，1=周一，...，6=周六）
      const jsWeekday = new Date().getDay();
      
      // 判断选择的日期是否是今天
      const isTodaySelected = selectedDayFilter === jsWeekday;
      
      // 对筛选后的内容进行排序
      return filteredItems.sort((a, b) => {
        // 判断是否为每日更新内容，优先使用isDailyUpdate属性
        const aIsDailyUpdate = a.isDailyUpdate === true || (
          a.isDailyUpdate === undefined && (
            a.category === "tv" || 
            a.category === "short" || 
            (a.mediaType === "tv" && 
              (!a.category || 
              (a.category !== "anime" && a.category !== "kids" && a.category !== "variety")))
          )
        );
        
        const bIsDailyUpdate = b.isDailyUpdate === true || (
          b.isDailyUpdate === undefined && (
            b.category === "tv" || 
            b.category === "short" || 
            (b.mediaType === "tv" && 
              (!b.category || 
              (b.category !== "anime" && b.category !== "kids" && b.category !== "variety")))
          )
        );
        
        // 如果筛选的是具体某一天，优先显示每日更新内容（电视剧或短剧）
        if (aIsDailyUpdate !== bIsDailyUpdate) {
          return aIsDailyUpdate ? -1 : 1; // 每日更新内容排在前面
        }
        
        // 如果都是每日更新内容或都不是每日更新内容，按更新时间排序
        const timeA = new Date(a.updatedAt).getTime();
        const timeB = new Date(b.updatedAt).getTime();
        return timeB - timeA; // 更新时间近的排在前面
      });
    }
  }

  const ongoingItems = getItemsByStatus("ongoing")
  const completedItems = getItemsByStatus("completed")

  // 统计数据
  const totalItems = items.length
  const completedCount = completedItems.length
  const ongoingCount = ongoingItems.length
  
  // 根据当前选择的分类过滤统计数据
  const filteredOngoingItems = filterItemsByCategory(ongoingItems)
  const filteredCompletedItems = filterItemsByCategory(completedItems)
  const filteredTotalItems = filteredOngoingItems.length + filteredCompletedItems.length
  const filteredOngoingCount = filteredOngoingItems.length
  const filteredCompletedCount = filteredCompletedItems.length

  // 移动端操作菜单
  const MobileMenu = () => (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button
            className="md:hidden fixed bottom-4 right-4 z-50 shadow-md"
            size="icon"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[300px]">
          {/* 移动端菜单内容 */}
          <div className="mt-6">
            {/* 用户信息 */}
            {isInitialized && userInfo && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <UserAvatar
                  onShowImportDialog={() => setShowImportDialog(true)}
                  onShowExportDialog={() => setShowExportDialog(true)}
                />
              </div>
            )}

            <nav className="flex flex-col space-y-4">
            <Button
              className="justify-start"
              onClick={() => setActiveTab("upcoming")}
            >
              <Calendar className="h-4 w-4 mr-2" /> 即将上线
            </Button>
            <Button
              className="justify-start"
              onClick={() => setActiveTab("recent")}
            >
              <Film className="h-4 w-4 mr-2" /> 近期开播
            </Button>
            <Button
              className="justify-start"
              onClick={() => setActiveTab("weekly")}
            >
              <CalendarRange className="h-4 w-4 mr-2" /> 每周放送
            </Button>
            <Button
              className="justify-start"
              onClick={() => setActiveTab("progress")}
            >
              <BarChart2 className="h-4 w-4 mr-2" /> 追剧进度
            </Button>

            {/* 分隔线 */}
            <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>

            {/* 功能按钮 */}
            <Button
              className="justify-start"
              variant="outline"
              onClick={() => setShowTasksDialog(true)}
            >
              <AlarmClock className="h-4 w-4 mr-2" /> 定时任务
            </Button>

            {runningTasks.length > 0 && (
              <Button
                className="justify-start bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800"
                variant="outline"
                onClick={() => setShowExecutionLogs(true)}
              >
                <BarChart2 className="h-4 w-4 mr-2" /> 执行日志 ({runningTasks.length})
              </Button>
            )}

            <Button
              className="justify-start"
              variant="outline"
              onClick={() => setShowImportDialog(true)}
            >
              <Upload className="h-4 w-4 mr-2" /> 导入
            </Button>

            <Button
              className="justify-start"
              variant="outline"
              onClick={() => setShowExportDialog(true)}
            >
              <Download className="h-4 w-4 mr-2" /> 导出
            </Button>

            <Button
              className="justify-start"
              variant="outline"
              onClick={() => setShowSettingsDialog(true)}
            >
              <Settings className="h-4 w-4 mr-2" /> 设置
            </Button>
          </nav>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );

  // 周几导航栏 - 修复词条数量计算问题和侧边栏布局适配
  const WeekdayNavigation = () => {
    // 根据当前活动标签页获取对应状态的词条
    const currentTabItems = activeTab === "ongoing" ? ongoingItems : completedItems

    // 先按分类筛选当前标签页的词条
    const filteredTabItems = filterItemsByCategory(currentTabItems)

    // 根据布局类型调整样式 - 降低z-index确保不遮挡用户下拉菜单
    const isInSidebar = currentLayout === 'sidebar'
    const containerClasses = isInSidebar
      ? "bg-white dark:bg-gray-900 border-b dark:border-gray-700 sticky top-0 z-10" // 侧边栏布局：降低到z-10
      : "bg-white dark:bg-gray-900 border-b dark:border-gray-700 sticky top-16 z-30" // 原始布局：保持z-30

    return (
      <div className={containerClasses}>
        <div className={isInSidebar ? "mx-auto px-4 sm:px-6 lg:px-8" : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"}>
          <div className="flex justify-between items-center py-3">
            {/* 左侧：日期导航按钮 */}
            <div className="flex space-x-1 overflow-x-auto">
              <button
                onClick={() => setSelectedDayFilter("recent")}
                className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedDayFilter === "recent"
                    ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-600"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                最近更新
              </button>
              {WEEKDAYS.map((day, index) => {
                // 将我们的索引（0=周一，6=周日）转换回JS的日期（0=周日，1=周一）
                const jsWeekday = index === 6 ? 0 : index + 1
                // 修复：根据当前标签页状态和分类计算词条数量
                const dayItems = getItemsByDay(filteredTabItems, jsWeekday)
                // 只有在客户端准备好时才显示今日高亮
                const isToday = index === currentDay
                const isSelected = selectedDayFilter === jsWeekday

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDayFilter(jsWeekday)}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isSelected
                        ? isToday
                          ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          : "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-600"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                    } ${isToday ? "!border-2 !border-yellow-400 relative z-10" : ""}`}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{day}</span>
                      {isToday && <Calendar className="h-3 w-3 text-yellow-600" />}
                      {dayItems.length > 0 && (
                        <span className="bg-gray-500 text-white text-xs rounded-full px-1.5 py-0.5 ml-1">
                          {dayItems.length}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* 右侧：状态选择器（仅在侧边栏布局中显示） */}
            {isInSidebar && (
              <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">状态:</span>
                <Select value={activeTab} onValueChange={setActiveTab}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[60]">
                    <SelectItem value="ongoing">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4" />
                        <span>连载中</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="completed">
                      <div className="flex items-center space-x-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>已完结</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // 移动端分类选择器
  const MobileCategorySelector = () => (
    <div className="md:hidden overflow-x-auto pb-3 mb-2 pt-1">
      <div className="flex space-x-2 px-1">
        {categories.map((category) => {
          const isSelected = selectedCategory === category.id;
          return (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex-shrink-0 flex items-center text-xs px-3 py-2 rounded-lg transition-colors ${
                isSelected
                  ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium shadow-sm border border-blue-200 dark:border-blue-800"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60 border border-transparent"
              }`}
            >
              <div className={`flex items-center justify-center h-6 w-6 rounded-md mr-1.5 ${
                isSelected 
                  ? "bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300" 
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
              }`}>
                <span className="h-3.5 w-3.5">{category.icon}</span>
              </div>
              <span>{category.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  )

  // 添加加载状态UI组件
  const LoadingState = () => (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
      <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
      <h2 className="text-xl font-semibold mb-2">正在加载数据...</h2>
      <p className="text-gray-500 text-center mb-6">首次加载可能需要几秒钟</p>
    </div>
  )

  // 添加错误状态UI组件
  const ErrorState = () => {
    // 根据错误信息提供更具体的提示
    const errorMessage = loadError || "无法加载数据，请刷新页面重试";
    const isNetworkError = errorMessage.includes('aborted') || 
                          errorMessage.includes('timeout') || 
                          errorMessage.includes('network') ||
                          errorMessage.includes('连接失败');
    const isApiKeyError = errorMessage.includes('API密钥') || 
                         errorMessage.includes('401');
    const isServerError = errorMessage.includes('500') || 
                         errorMessage.includes('服务器');
    
    let errorIcon = <AlertTriangle className="h-5 w-5 mr-2" />;
    let errorTitle = "加载失败";
    let errorTip = "";
    
    if (isNetworkError) {
      errorIcon = <Wifi className="h-5 w-5 mr-2" />;
      errorTitle = "网络连接问题";
      errorTip = "请检查您的网络连接，或者TMDB服务器可能暂时不可用";
    } else if (isApiKeyError) {
      errorIcon = <Key className="h-5 w-5 mr-2" />;
      errorTitle = "API密钥问题";
      errorTip = "请检查您的TMDB API密钥是否有效";
    } else if (isServerError) {
      errorIcon = <Server className="h-5 w-5 mr-2" />;
      errorTitle = "服务器错误";
      errorTip = "TMDB服务器可能暂时不可用，请稍后再试";
    }
    
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
        <div className="bg-red-50 dark:bg-red-900/30 p-6 rounded-lg border border-red-200 dark:border-red-800 max-w-md">
          <h2 className="text-xl font-semibold mb-2 text-red-700 dark:text-red-300 flex items-center">
            {errorIcon}
            {errorTitle}
          </h2>
          <p className="text-red-600 dark:text-red-300 mb-2">{errorMessage}</p>
          {errorTip && (
            <p className="text-sm text-red-500 dark:text-red-400 mb-4 bg-red-100 dark:bg-red-900/50 p-2 rounded">
              提示: {errorTip}
            </p>
          )}
          <div className="flex space-x-3 mt-4">
            <Button onClick={handleRefresh} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              重新加载
            </Button>
            {isApiKeyError && (
              <Button onClick={() => setShowSettingsDialog(true)} variant="outline" className="flex-1">
                <Settings className="h-4 w-4 mr-2" />
                配置API密钥
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 添加空状态UI组件
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
      <div className="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-lg border border-blue-200 dark:border-blue-800 max-w-md">
        <h2 className="text-xl font-semibold mb-2 text-blue-700 dark:text-blue-300">开始使用TMDB维护助手</h2>
        <p className="text-blue-600 dark:text-blue-300 mb-4">点击右上角的"+"按钮添加您的第一个词条</p>
        <Button onClick={() => setShowAddDialog(true)} className="w-full">
          <Plus className="h-4 w-4 mr-2" />
          添加词条
        </Button>
      </div>
    </div>
  )

  // API密钥配置指南组件
  const ApiKeySetupGuide = () => (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-lg p-5 mb-6">
      <div className="flex items-start space-x-4">
        <div className="bg-blue-100 dark:bg-blue-800/30 p-2 rounded-full text-blue-700 dark:text-blue-300">
          <Key className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-1">
            配置TMDB API密钥
      </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
            要使用"影视资讯"功能，您需要配置有效的TMDB API密钥。
          </p>
          <div className="space-y-2 text-sm text-blue-600 dark:text-blue-400">
            <p>1. 访问 <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noopener noreferrer" className="underline">TMDB API设置</a> (需要先注册并登录)</p>
            <p>2. 创建API密钥 (选择"开发者"类型)</p>
            <p>3. 复制生成的API密钥(v3)</p>
            <p>4. 点击下方的设置按钮，粘贴密钥并保存</p>
          </div>
        <Button 
          onClick={() => setShowSettingsDialog(true)}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Settings className="h-4 w-4 mr-2" />
            打开设置
        </Button>
      </div>
      </div>
    </div>
  )

  // 区域选择导航栏
  const RegionNavigation = () => (
    <div className="mb-4 border-b border-blue-100/70 dark:border-blue-900/30 pb-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* 当前选中区域显示和切换按钮集成 */}
          <div className="flex items-center">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400 mr-2">区域:</span>
            <div className="relative group">
              <button className="flex items-center bg-white/80 dark:bg-gray-800/80 px-3 py-1.5 rounded-md border border-blue-100 dark:border-blue-800/30 shadow-sm hover:bg-white dark:hover:bg-gray-800 transition-all text-sm">
                <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 shadow-inner mr-2">
                  <span className="text-base">{REGIONS.find(r => r.id === selectedRegion)?.icon}</span>
                </div>
                <span className="font-medium text-sm text-blue-700 dark:text-blue-300 mr-1.5">
                  {REGIONS.find(r => r.id === selectedRegion)?.name}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* 下拉菜单 */}
              <div className="absolute left-0 mt-1 w-52 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm shadow-lg rounded-lg border border-blue-100/70 dark:border-blue-800/30 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 transform group-hover:translate-y-0 translate-y-1 z-50 overflow-hidden">
                <div className="p-2">
                  {REGION_GROUPS.map(group => (
                    <div key={group.name} className="mb-2 last:mb-0">
                      <div className="flex items-center px-2 py-0.5">
                        <div className="h-px w-2 bg-blue-200 dark:bg-blue-800/70 mr-1.5"></div>
                        <span className="text-[10px] font-medium text-blue-600/80 dark:text-blue-400/80 uppercase tracking-wider">
                          {group.name}
                        </span>
                        <div className="h-px flex-grow bg-blue-200 dark:bg-blue-800/70 ml-1.5"></div>
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {group.regions.map(regionId => {
                          const region = REGIONS.find(r => r.id === regionId);
                          if (!region) return null;
                          
                          const isActive = selectedRegion === regionId;
                          const regionItems = (mediaNewsType as string) === 'upcoming' 
                            ? (upcomingItemsByRegion[regionId] || [])
                            : (recentItemsByRegion[regionId] || []);
                          const validItems = regionItems.filter(item => 
                            !items.some(existingItem => 
                              existingItem.tmdbId === item.id.toString() && 
                              existingItem.mediaType === item.mediaType
              )
            );

            return (
                            <button
                              key={regionId}
                              onClick={() => setSelectedRegion(regionId)}
                              className={`flex items-center justify-between w-full px-2.5 py-1.5 text-xs rounded-md transition-all duration-150 ${
                                isActive
                                  ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 shadow-sm"
                                  : "hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300"
                              }`}
                            >
                              <div className="flex items-center">
                                <div className={`w-5 h-5 flex items-center justify-center rounded-full ${
                                  isActive 
                                    ? "bg-white dark:bg-gray-800 shadow-inner" 
                                    : "bg-gray-100 dark:bg-gray-700/50"
                                }`}>
                                  <span className="text-sm">{region.icon}</span>
                                </div>
                                <span className="ml-2 text-xs">{region.name}</span>
                              </div>
                  {validItems.length > 0 && (
                                <span className={`px-1.5 py-0.5 text-xs rounded-full flex items-center justify-center min-w-[1.25rem] ${
                                  isActive
                                    ? "bg-blue-200/80 dark:bg-blue-700/50 text-blue-800 dark:text-blue-200"
                                    : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
                                }`}>
                      {validItems.length}
                    </span>
                  )}
                            </button>
            );
          })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* 媒体资讯类型切换按钮 - 移到这里 */}
          <div className="inline-flex p-0.5 rounded-md shadow-sm border border-blue-100 dark:border-blue-900/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
            <button 
              onClick={() => setMediaNewsType('upcoming')}
              className={`px-2.5 py-1 rounded-sm text-sm font-medium transition-all duration-200 ${
                (mediaNewsType as string) === 'upcoming' 
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <Calendar className="h-3.5 w-3.5" />
                <span>即将上线</span>
              </div>
            </button>
            <button 
              onClick={() => setMediaNewsType('recent')}
              className={`px-2.5 py-1 rounded-sm text-sm font-medium transition-all duration-200 ${
                (mediaNewsType as string) === 'recent' 
                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-600 dark:text-blue-400 shadow-sm' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center space-x-1.5">
                <PlayCircle className="h-3.5 w-3.5" />
                <span>近期开播</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // 渲染内容
  const renderContent = () => {
    if (loading && !initialized) {
      return <LoadingState />;
    }
    
    if (loadError) {
      return <ErrorState />;
    }
    
    if (items.length === 0 && initialized) {
      return <EmptyState />;
    }
    
    // 原有的内容渲染逻辑...
    return (
      <div className="container mx-auto p-4 max-w-7xl">

        {/* 原有的标签页内容 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 mb-6 h-12">
            <TabsTrigger value="ongoing" className="flex items-center space-x-2 text-sm">
              <Clock className="h-4 w-4" />
              <span>连载中</span>
              <Badge variant="secondary" className="ml-1 text-xs">
                {filteredOngoingCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center space-x-2 text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>已完结</span>
              <Badge variant="secondary" className="ml-1 text-xs">
                {filteredCompletedCount}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="upcoming" className="flex items-center space-x-2 text-sm">
              <Calendar className="h-4 w-4" />
              <span>影视资讯</span>
              {upcomingItems.length > 0 && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {upcomingItems.filter(upcomingItem => 
                    !items.some(item => 
                      item.tmdbId === upcomingItem.id.toString() && 
                      item.mediaType === upcomingItem.mediaType
                    )
                  ).length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="content-generation" className="flex items-center space-x-2 text-sm">
              <FileText className="h-4 w-4" />
              <span>分集简介</span>
            </TabsTrigger>
            <TabsTrigger value="thumbnail" className="flex items-center space-x-2 text-sm">
              <Video className="h-4 w-4" />
              <span>缩略图</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ongoing">
            {/* 周几导航栏 */}
            <WeekdayNavigation />

            {/* 内容展示区域 */}
            <div className="mt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
                {getFilteredItems(filteredOngoingItems).map((item) => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    onClick={() => setSelectedItem(item)}
                    showAirTime={true} // 总是显示播出时间
                  />
                ))}
              </div>

              {getFilteredItems(filteredOngoingItems).length === 0 && (
                <div className="text-center py-16">
                  <div className="p-8 max-w-md mx-auto">
                    <Tv className="h-16 w-16 mx-auto mb-4 text-blue-400 dark:text-blue-500 opacity-70" />
                    <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">
                      {selectedCategory !== "all" 
                        ? `${categories.find(c => c.id === selectedCategory)?.name}分类暂无词条` 
                        : selectedDayFilter === "recent"
                          ? "暂无最近更新的词条"
                          : `${WEEKDAYS[selectedDayFilter === 0 ? 6 : selectedDayFilter - 1]}暂无词条`}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">添加新词条开始维护吧</p>
                    <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-2" />
                      添加新词条
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="completed">
            {/* 周几导航栏 */}
            <WeekdayNavigation />

            {/* 内容展示区域 */}
            <div className="mt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
                {getFilteredItems(filteredCompletedItems).map((item) => (
                  <MediaCard
                    key={item.id}
                    item={item}
                    onClick={() => setSelectedItem(item)}
                    showAirTime={true} // 总是显示播出时间
                  />
                ))}
              </div>

              {getFilteredItems(filteredCompletedItems).length === 0 && (
                <div className="text-center py-16">
                  <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-gray-400 dark:text-gray-500 opacity-50" />
                  <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">
                    {selectedCategory !== "all" 
                      ? `${categories.find(c => c.id === selectedCategory)?.name}分类暂无已完结词条` 
                      : selectedDayFilter === "recent"
                        ? "暂无最近完成的词条"
                        : `${WEEKDAYS[selectedDayFilter === 0 ? 6 : selectedDayFilter - 1]}暂无已完结词条`}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">完成维护的词条会自动出现在这里</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="upcoming">
            {/* 影视资讯内容头部 */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
              <div className="flex items-center mb-4 sm:mb-0">
                <div className="relative mr-3">
                  <div className="absolute inset-0 bg-blue-500 blur-md opacity-20 rounded-full"></div>
                  <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-full text-white">
                    {(mediaNewsType as string) === 'upcoming' ? (
                    <Calendar className="h-5 w-5" />
                    ) : (
                      <PlayCircle className="h-5 w-5" />
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                      {(mediaNewsType as string) === 'upcoming' ? '即将上线' : '近期开播'}
                    </h2>
                    {(mediaNewsType as string) === 'upcoming' && upcomingItems.length > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                        {upcomingItems.filter(upcomingItem => 
                          !items.some(item => 
                            item.tmdbId === upcomingItem.id.toString() && 
                            item.mediaType === upcomingItem.mediaType
                          )
                        ).length}
                      </span>
                    )}
                    {(mediaNewsType as string) === 'recent' && recentItems.length > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                        {recentItems.filter(recentItem => 
                          !items.some(item => 
                            item.tmdbId === recentItem.id.toString() && 
                            item.mediaType === recentItem.mediaType
                          )
                        ).length}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {(mediaNewsType as string) === 'upcoming' ? '未来30天将要上线的内容' : '过去30天刚刚开播的内容'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => (mediaNewsType as string) === 'upcoming' ? fetchUpcomingItems(false, 0, selectedRegion) : fetchRecentItems(false, 0, selectedRegion)}
                  className="h-9 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${((mediaNewsType as string) === 'upcoming' && loadingUpcoming) || ((mediaNewsType as string) === 'recent' && loadingRecent) ? 'animate-spin' : ''}`} />
                  刷新
                </Button>
              </div>
            </div>
            
            {/* 区域导航 */}
            <RegionNavigation />
            
            {/* 影视资讯内容主体 */}
            <div>
              {/* 显示API密钥配置指南 */}
              {isMissingApiKey && <ApiKeySetupGuide />}
              
              {mediaNewsType === 'upcoming' ? (
                // 即将上线内容
                <>
              {loadingUpcoming ? (
                <div className="flex justify-center items-center h-48">
                  <div className="flex flex-col items-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">加载中，请稍候...</p>
                  </div>
                </div>
              ) : upcomingError ? (
                <div className="bg-red-50 dark:bg-red-900/30 p-6 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex flex-col items-center text-center mb-4">
                    <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
                    <p className="text-red-600 dark:text-red-300 font-medium mb-1">
                      {upcomingError}
                    </p>
                    <p className="text-red-500 dark:text-red-400 text-sm mb-4">
                      {isMissingApiKey 
                        ? '请按照上方指南配置TMDB API密钥' 
                        : '无法连接到TMDB服务，请检查网络连接或稍后重试'}
                    </p>
                    <Button
                      onClick={() => fetchUpcomingItems(false, 0, selectedRegion)}
                      variant="outline"
                      className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      重试
                    </Button>
                  </div>
                </div>
              ) : upcomingItems.length === 0 ? (
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg text-center border border-gray-200 dark:border-gray-700">
                  <p className="text-gray-500 dark:text-gray-400 mb-1">
                    暂无即将上线的内容
                  </p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm">
                        未找到未来30天内上线的影视动态
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
                  {upcomingItems
                    .filter(upcomingItem => 
                      !items.some(item => 
                        item.tmdbId === upcomingItem.id.toString() && 
                        item.mediaType === upcomingItem.mediaType
                      )
                    )
                    .map((item) => (
                      <div 
                        key={`${item.mediaType}-${item.id}`}
                        className="group"
                      >
                            {/* 显示上映日期标签 */}
                        <div className="mb-2">
                          <Badge
                            className="bg-green-500 text-white text-xs px-2 py-1 rounded-full"
                          >
                            {new Date(item.releaseDate).toLocaleDateString('zh-CN')}
                          </Badge>
                        </div>
                        
                            {/* 海报容器 */}
                        <div
                          className="block cursor-pointer"
                          title={item.title}
                        >
                                                      <div className="relative aspect-[2/3] overflow-hidden rounded-lg shadow-md transition-all duration-200 group-hover:scale-[1.03] group-hover:shadow-xl dark:group-hover:shadow-blue-900/40">
                              <img
                                src={item.posterPath ? `https://image.tmdb.org/t/p/w500${item.posterPath}` : "/placeholder.svg"}
                                alt={item.title}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100">
                              {/* 悬停时显示两个按钮 */}
                              <div className="flex items-center gap-3 transform transition-transform duration-300 group-hover:scale-105">
                                {/* 添加按钮 */}
                                <button 
                                  className="flex items-center justify-center h-11 w-11 rounded-full bg-blue-500/90 hover:bg-blue-600 text-white transition-all shadow-lg hover:shadow-blue-500/50 group-hover:rotate-3"
                                  title="添加到我的列表"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    // 预填充更多详细信息到localStorage
                                    const detailData = {
                                      id: item.id,
                                      title: item.title,
                                      media_type: item.mediaType,
                                      poster_path: item.posterPath,
                                      release_date: item.releaseDate,
                                      overview: item.overview || "",
                                      vote_average: item.voteAverage || 0
                                    };
                                    
                                    // 保存到localStorage
                                    localStorage.setItem('tmdb_prefilled_data', JSON.stringify(detailData));
                                    
                                        // 打开对话框
                                        setShowAddDialog(true);
                                      }}
                                    >
                                      <Plus className="h-5 w-5" />
                                    </button>
                                    
                                    {/* 链接到TMDB */}
                                    <a 
                                      href={`https://www.themoviedb.org/${item.mediaType}/${item.id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center justify-center h-11 w-11 rounded-full bg-gray-800/80 hover:bg-gray-900 text-white transition-all shadow-lg hover:shadow-gray-800/50 group-hover:-rotate-3"
                                      title="在TMDB查看详情"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <ExternalLink className="h-5 w-5" />
                                    </a>
                                  </div>
                                  
                                  {/* 提示文字 */}
                                  <div className="absolute bottom-4 left-0 right-0 text-center">
                                    <span className="text-xs font-medium text-white/95 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
                                      {item.mediaType === "movie" ? "电影" : "剧集"}
                                      <span className="mx-1">·</span>
                                      {(() => {
                                        if (mediaNewsType === 'upcoming') {
                                          return `${new Date(item.releaseDate).getMonth() + 1}月${new Date(item.releaseDate).getDate()}日`;
                                        } else {
                                          return `${Math.ceil((new Date().getTime() - new Date(item.releaseDate).getTime()) / (1000 * 60 * 60 * 24))}天前`;
                                        }
                                      })()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="mt-2 space-y-1 relative z-0">
                                <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm leading-tight line-clamp-1 group-hover:text-blue-600 transition-colors">
                                  {item.title}
                                </h3>
                                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                                  <span className="flex items-center">
                                    {item.mediaType === "movie" ? "电影" : "剧集"}
                                  </span>
                                  <span className="mx-1">·</span>
                                  <span className="flex items-center">
                                    {(mediaNewsType as string) === 'upcoming' ? (
                                      (() => {
                                        const daysUntilRelease = Math.ceil((new Date(item.releaseDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                        if (daysUntilRelease <= 0) {
                                          return "今天上线";
                                        } else if (daysUntilRelease === 1) {
                                          return "明天上线";
                                        } else {
                                          return `${daysUntilRelease} 天后上线`;
                                        }
                                      })()
                                    ) : mediaNewsType === 'recent' ? (
                                      Math.ceil((new Date().getTime() - new Date(item.releaseDate).getTime()) / (1000 * 60 * 60 * 24)) <= 0 
                                        ? "今天开播" 
                                        : `${Math.ceil((new Date().getTime() - new Date(item.releaseDate).getTime()) / (1000 * 60 * 60 * 24))} 天前开播`
                                    ) : ""}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </>
              ) : (
                // 近期开播内容
                <>
                  {loadingRecent ? (
                    <div className="flex justify-center items-center h-48">
                      <div className="flex flex-col items-center">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-3" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">加载中，请稍候...</p>
                      </div>
                    </div>
                  ) : recentError ? (
                    <div className="bg-red-50 dark:bg-red-900/30 p-6 rounded-lg border border-red-200 dark:border-red-800">
                      <div className="flex flex-col items-center text-center mb-4">
                        <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
                        <p className="text-red-600 dark:text-red-300 font-medium mb-1">
                          {recentError}
                        </p>
                        <p className="text-red-500 dark:text-red-400 text-sm mb-4">
                          {isMissingApiKey 
                            ? '请按照上方指南配置TMDB API密钥' 
                            : '无法连接到TMDB服务，请检查网络连接或稍后重试'}
                        </p>
                        <Button
                          onClick={() => fetchRecentItems(false, 0, selectedRegion)}
                          variant="outline"
                          className="border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50"
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          重试
                        </Button>
                      </div>
                    </div>
                  ) : recentItems.length === 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg text-center border border-gray-200 dark:border-gray-700">
                      <p className="text-gray-500 dark:text-gray-400 mb-1">
                        暂无近期开播的内容
                      </p>
                      <p className="text-gray-400 dark:text-gray-500 text-sm">
                        未找到过去30天内开播的影视动态
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
                      {recentItems
                        .filter(recentItem => 
                          !items.some(item => 
                            item.tmdbId === recentItem.id.toString() && 
                            item.mediaType === recentItem.mediaType
                          )
                        )
                        .map((item) => (
                          <div 
                            key={`${item.mediaType}-${item.id}`}
                            className="group"
                          >
                            {/* 显示上映日期标签 */}
                            <div className="mb-2">
                              <Badge
                                className="bg-green-500 text-white text-xs px-2 py-1 rounded-full"
                              >
                                {new Date(item.releaseDate).toLocaleDateString('zh-CN')}
                              </Badge>
                            </div>
                            
                            {/* 海报容器 */}
                            <div
                              className="block cursor-pointer"
                              title={item.title}
                            >
                              <div className="relative aspect-[2/3] overflow-hidden rounded-lg shadow-md transition-all duration-200 group-hover:scale-[1.03] group-hover:shadow-xl dark:group-hover:shadow-blue-900/40">
                                <img
                                  src={item.posterPath ? `https://image.tmdb.org/t/p/w500${item.posterPath}` : "/placeholder.svg"}
                                  alt={item.title}
                                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.05]"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-300 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100">
                                  {/* 悬停时显示两个按钮 */}
                                  <div className="flex items-center gap-3 transform transition-transform duration-300 group-hover:scale-105">
                                    {/* 添加按钮 */}
                                    <button 
                                      className="flex items-center justify-center h-11 w-11 rounded-full bg-blue-500/90 hover:bg-blue-600 text-white transition-all shadow-lg hover:shadow-blue-500/50 group-hover:rotate-3"
                                      title="添加到我的列表"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        
                                        // 预填充详细信息（现在通过状态传递，不使用localStorage）
                                        const detailData = {
                                          id: item.id,
                                          title: item.title,
                                          media_type: item.mediaType,
                                          poster_path: item.posterPath,
                                          release_date: item.releaseDate,
                                          overview: item.overview || "",
                                          vote_average: item.voteAverage || 0
                                        };

                                        // 通过状态传递数据，不再使用localStorage
                                        console.log('预填充数据:', detailData);
                                        
                                        // 打开对话框
                                      setShowAddDialog(true);
                                  }}
                                >
                                  <Plus className="h-5 w-5" />
                                </button>
                                
                                {/* 链接到TMDB */}
                                <a 
                                  href={`https://www.themoviedb.org/${item.mediaType}/${item.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center h-11 w-11 rounded-full bg-gray-800/80 hover:bg-gray-900 text-white transition-all shadow-lg hover:shadow-gray-800/50 group-hover:-rotate-3"
                                  title="在TMDB查看详情"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="h-5 w-5" />
                                </a>
                              </div>
                              
                              {/* 提示文字 */}
                              <div className="absolute bottom-4 left-0 right-0 text-center">
                                <span className="text-xs font-medium text-white/95 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm">
                                  {item.mediaType === "movie" ? "电影" : "剧集"}
                                  <span className="mx-1">·</span>
                                      {mediaNewsType === 'upcoming'
                                        ? `${new Date(item.releaseDate).getMonth() + 1}月${new Date(item.releaseDate).getDate()}日`
                                        : `${Math.ceil((new Date().getTime() - new Date(item.releaseDate).getTime()) / (1000 * 60 * 60 * 24))}天前`
                                      }
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-2 space-y-1 relative z-0">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm leading-tight line-clamp-1 group-hover:text-blue-600 transition-colors">
                              {item.title}
                            </h3>
                            <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                              <span className="flex items-center">
                                {item.mediaType === "movie" ? "电影" : "剧集"}
                              </span>
                              <span className="mx-1">·</span>
                              <span className="flex items-center">
                                    {(() => {
                                      if (mediaNewsType === 'upcoming') {
                                        const daysUntilRelease = Math.ceil((new Date(item.releaseDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                        if (daysUntilRelease <= 0) {
                                          return "今天上线";
                                        } else if (daysUntilRelease === 1) {
                                          return "明天上线";
                                        } else {
                                          return `${daysUntilRelease} 天后上线`;
                                        }
                                      } else {
                                        return Math.ceil((new Date().getTime() - new Date(item.releaseDate).getTime()) / (1000 * 60 * 60 * 24)) === 1 
                                          ? "昨天开播" 
                                          : `${Math.ceil((new Date().getTime() - new Date(item.releaseDate).getTime()) / (1000 * 60 * 60 * 24))} 天前开播`;
                                      }
                                    })()}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="content-generation">
            <div className="h-[calc(100vh-200px)]">
              <SubtitleEpisodeGenerator 
                onOpenGlobalSettings={(section) => {
                  setSettingsInitialSection(section)
                  setShowSettingsDialog(true)
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="thumbnail">
            <Tabs defaultValue="extract" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="extract">分集图片提取</TabsTrigger>
                <TabsTrigger value="crop">分集图片裁切</TabsTrigger>
              </TabsList>

              <TabsContent value="extract" className="mt-6">
                <VideoThumbnailExtractor onOpenGlobalSettings={(section) => {
                  setSettingsInitialSection(section)
                  setShowSettingsDialog(true)
                }} />
              </TabsContent>

              <TabsContent value="crop" className="mt-6">
                <ImageCropper />
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // 在组件加载时，确保activeTab有效
  useEffect(() => {
    // 如果当前标签是"upcoming"，但出现API密钥缺失错误，自动切换到"ongoing"
    if (activeTab === "upcoming" && isMissingApiKey) {
      setActiveTab("ongoing");
      setShowSettingsDialog(true); // 显示设置对话框
    }
  }, [activeTab, isMissingApiKey]);
  
  // 确保影视资讯页面不会消失
  useEffect(() => {
    const abortController = new AbortController();

    // 如果用户切换到影视资讯标签，但数据为空，尝试重新获取
    if (activeTab === "upcoming" && upcomingItems.length === 0 && !loadingUpcoming && !upcomingError) {
      fetchUpcomingItems(false, 0, selectedRegion, abortController.signal);
    }

    return () => {
      abortController.abort();
    };
  }, [activeTab, upcomingItems.length, loadingUpcoming, upcomingError, selectedRegion]);

  // 获取近期开播内容
  const fetchRecentItems = async (silent = false, retryCount = 0, region = selectedRegion, signal?: AbortSignal) => {
    if (!silent) {
      setLoadingRecent(true);
    }
    setRecentError(null);

    // 检查signal是否已经被中止
    if (signal?.aborted) {
      console.log('[fetchRecentItems] 请求已被中止，跳过执行');
      if (!silent) {
        setLoadingRecent(false);
      }
      return;
    }

    try {
      // 优化AbortController使用逻辑
      let requestSignal: AbortSignal;
      let timeoutId: NodeJS.Timeout | undefined;

      if (signal) {
        // 使用外部提供的signal
        requestSignal = signal;
      } else {
        // 创建新的controller并设置超时
        const controller = new AbortController();
        requestSignal = controller.signal;
        timeoutId = setTimeout(() => {
          console.log('[fetchRecentItems] 请求超时，中止请求');
          controller.abort();
        }, 30000); // 30秒超时
      }

      const response = await fetch(`/api/tmdb/recent?region=${region}`, {
        signal: requestSignal,
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      // 清理超时定时器
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('服务器响应错误:', errorText);
        
        // 检查是否是API密钥未配置或用户身份验证失败的错误
        if (response.status === 400 && errorText.includes('API密钥未配置')) {
          setIsMissingApiKey(true);
          throw new Error('TMDB API密钥未配置，请在设置中配置');
        }
        if (response.status === 401) {
          setIsMissingApiKey(true);
          throw new Error('用户身份验证失败，请刷新页面重试');
        }
        
        // 根据HTTP状态码提供更详细的错误信息
        let errorMessage = `获取近期开播内容失败 (${response.status})`;
        if (response.status === 500) {
          errorMessage = `服务器内部错误 (500)，请稍后再试`;
        } else if (response.status === 503) {
          errorMessage = `TMDB服务暂时不可用 (503)，请稍后再试`;
        } else if (response.status === 429) {
          errorMessage = `请求过于频繁 (429)，请稍后再试`;
        } else if (response.status >= 400 && response.status < 500) {
          errorMessage = `请求错误 (${response.status})，请检查API配置`;
        }
        
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      if (data.success) {
        // 保存数据到状态 - 区分不同区域的数据
        const newRecentItemsByRegion = { ...recentItemsByRegion };
        newRecentItemsByRegion[region] = data.results;
        setRecentItemsByRegion(newRecentItemsByRegion);
        
        // 如果当前选中的是这个区域，也更新主要数据
        if (region === selectedRegion) {
          setRecentItems(data.results);
        }
        
        setRecentLastUpdated(new Date().toLocaleString('zh-CN'));
        
        // 数据现在存储在服务端，不再需要localStorage缓存
        console.log(`近期开播数据已更新 (${region}):`, data.results.length, '项');
      } else {
        // 检查是否是API密钥未配置的错误
        if (data.error && data.error.includes('API密钥未配置')) {
          setIsMissingApiKey(true);
          throw new Error('TMDB API密钥未配置，请在设置中配置');
        }
        throw new Error(data.error || '获取近期开播内容失败');
      }
    } catch (error) {
      // 专门处理AbortError
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[fetchRecentItems] 请求被中止:', error.message);
        if (!silent) {
          setLoadingRecent(false);
        }
        return; // 对于AbortError，直接返回，不进行重试或错误处理
      }

      console.error('获取近期开播内容失败:', error);

      const errorMessage = error instanceof Error ? error.message : String(error);

      // 对于TMDB API连接失败，不显示错误，静默处理
      if (errorMessage.includes('TMDB API连接失败') ||
          errorMessage.includes('网络连接异常') ||
          errorMessage.includes('fetch failed')) {
        console.debug('TMDB API连接问题，静默处理:', errorMessage);
        if (!silent) {
          setLoadingRecent(false);
        }
        return;
      }

      setRecentError(errorMessage);

      // 如果是网络错误或超时，尝试重试（最多5次）
      // 注意：移除了对'aborted'的检查，因为AbortError已经单独处理
      if (retryCount < 5 &&
          (errorMessage.includes('network') ||
           errorMessage.includes('timeout') ||
           error instanceof TypeError)) {
        console.log(`尝试重新获取近期开播内容，第${retryCount + 1}次重试`);
        
        // 使用指数退避算法计算延迟时间
        const baseDelay = 1000;
        const exponentialDelay = baseDelay * Math.pow(2, retryCount);
        const jitter = Math.random() * 1000;
        const delay = exponentialDelay + jitter;
        
        console.log(`重试延迟: ${Math.round(delay)}ms`);
        
        setTimeout(() => {
          fetchRecentItems(silent, retryCount + 1, region, signal);
        }, delay);
        
        return;
      }
      
      // 如果重试失败或其他错误，尝试从localStorage加载缓存数据
      if (retryCount >= 5) {
        try {
          // 检查是否在客户端环境
          if (typeof window === 'undefined') {
            console.log('[HomePage] 服务器端渲染，跳过localStorage操作');
            return;
          }

          const cachedItems = localStorage.getItem(`recentItems_${region}`);
          if (cachedItems && cachedItems.trim() !== '') {
            const parsedItems = JSON.parse(cachedItems);
            if (Array.isArray(parsedItems) && parsedItems.length > 0) {
              console.log(`从缓存中加载 ${parsedItems.length} 个近期开播内容`);
              setRecentItems(parsedItems);
              setRecentError(`无法连接到TMDB，显示的是缓存数据 (${new Date().toLocaleString('zh-CN')})`);
              return;
            }
          }
        } catch (e) {
          console.warn('无法从本地存储加载缓存数据:', e);
          // 清除损坏的缓存数据
          try {
            if (typeof window !== 'undefined') {
              localStorage.removeItem(`recentItems_${region}`);
            }
          } catch (cleanupError) {
            console.warn('清除损坏缓存失败:', cleanupError);
          }
        }
      }
    } finally {
      if (!silent) {
        setLoadingRecent(false);
      }
    }
  };

  // 加载选定区域的数据
  useEffect(() => {
    if (mediaNewsType === 'upcoming') {
      fetchUpcomingItems(false, 0, selectedRegion);
    } else {
      fetchRecentItems(false, 0, selectedRegion);
    }
  }, [selectedRegion, mediaNewsType]);

  // 在媒体类型变更时加载数据
  useEffect(() => {
    const abortController = new AbortController();

    if (mediaNewsType === 'recent' && recentItems.length === 0 && !loadingRecent) {
      fetchRecentItems(false, 0, selectedRegion, abortController.signal);
    }

    return () => {
      abortController.abort();
    };
  }, [mediaNewsType, recentItems.length, loadingRecent, selectedRegion]);

  // 确保影视资讯页面不会消失
  useEffect(() => {
    // 创建AbortController用于这个effect
    const abortController = new AbortController();

    // 如果用户切换到影视资讯标签，但数据为空，尝试重新获取
    if (activeTab === "upcoming") {
      if (mediaNewsType === 'upcoming' && upcomingItems.length === 0 && !loadingUpcoming && !upcomingError) {
        fetchUpcomingItems(false, 0, selectedRegion, abortController.signal);
      } else if (mediaNewsType === 'recent' && recentItems.length === 0 && !loadingRecent && !recentError) {
        fetchRecentItems(false, 0, selectedRegion, abortController.signal);
      }
    }

    return () => {
      // 清理时中止请求
      abortController.abort();
    };
  }, [activeTab, mediaNewsType, selectedRegion, upcomingItems.length, loadingUpcoming, upcomingError, recentItems.length, loadingRecent, recentError]);

  // 加载近期开播数据和自动刷新
  useEffect(() => {
    // 创建一个AbortController
    const abortController = new AbortController();
    let isMounted = true; // 添加挂载状态标记

    const loadDataAndStartRefresh = async () => {
      // 首先尝试从localStorage加载缓存数据
      try {
        // 检查是否在客户端环境
        if (typeof window === 'undefined') {
          console.log('[HomePage] 服务器端渲染，跳过localStorage操作');
          return;
        }

        // 加载所有区域的缓存数据
        const newRecentItemsByRegion: Record<string, any[]> = {};
        let hasAnyData = false;

        REGIONS.forEach(region => {
          try {
            const cachedItems = localStorage.getItem(`recentItems_${region.id}`);
            if (cachedItems && cachedItems.trim() !== '') {
              const parsedItems = JSON.parse(cachedItems);
              if (Array.isArray(parsedItems)) {
                newRecentItemsByRegion[region.id] = parsedItems;
                hasAnyData = true;
              }
            }
          } catch (parseError) {
            console.warn(`[HomePage] 解析近期开播缓存数据失败 (${region.id}):`, parseError);
            // 清除损坏的缓存数据
            try {
              localStorage.removeItem(`recentItems_${region.id}`);
            } catch (e) {
              console.warn(`[HomePage] 清除损坏缓存失败:`, e);
            }
          }
        });

        if (hasAnyData && isMounted) {
          setRecentItemsByRegion(newRecentItemsByRegion);
          // 设置当前选中区域的数据
          if (newRecentItemsByRegion[selectedRegion]) {
            setRecentItems(newRecentItemsByRegion[selectedRegion]);
          }

          const cachedLastUpdated = localStorage.getItem('recentLastUpdated');
          if (cachedLastUpdated) {
            setRecentLastUpdated(cachedLastUpdated);
          }
        }
      } catch (e) {
        console.warn('无法从本地存储加载缓存数据:', e);
      }

      // 检查组件是否仍然挂载且请求未被中止
      if (!isMounted || abortController.signal.aborted) {
        return;
      }

      // 然后获取最新数据 - 默认只获取当前选中的区域
      try {
        await fetchRecentItems(false, 0, selectedRegion, abortController.signal);
      } catch (error) {
        // 错误已在fetchRecentItems中处理
        console.debug('[HomePage] 近期开播初始数据获取完成');
      }
    };

    // 启动数据加载
    loadDataAndStartRefresh();

    // 每小时刷新一次
    const intervalId = setInterval(() => {
      if (isMounted && !abortController.signal.aborted) {
        fetchRecentItems(true, 0, selectedRegion, abortController.signal); // 静默刷新
      }
    }, 60 * 60 * 1000); // 1小时

    return () => {
      isMounted = false; // 标记组件已卸载
      clearInterval(intervalId);
      // 组件卸载时中止所有未完成的请求
      abortController.abort();
    };
  }, []); // 保持空依赖数组，因为我们不希望这个effect重新运行

  // 如果是侧边栏布局，使用SidebarLayout组件
  if (currentLayout === 'sidebar') {
    return (
      <>
        <SidebarLayout
          onLayoutChange={handleLayoutChange}
          currentLayout={currentLayout}
          totalItems={totalItems}
          runningTasks={runningTasks}
          onShowAddDialog={() => setShowAddDialog(true)}
          onShowSettingsDialog={(section) => {
            setSettingsInitialSection(section)
            setShowSettingsDialog(true)
          }}
          onShowTasksDialog={() => setShowTasksDialog(true)}
          onShowExecutionLogs={() => setShowExecutionLogs(true)}
          onShowImportDialog={() => setShowImportDialog(true)}
          onShowExportDialog={() => setShowExportDialog(true)}
          // 影视资讯相关状态和函数
          upcomingItems={upcomingItems}
          recentItems={recentItems}
          loadingUpcoming={loadingUpcoming}
          loadingRecent={loadingRecent}
          upcomingError={upcomingError}
          recentError={recentError}
          upcomingLastUpdated={upcomingLastUpdated}
          recentLastUpdated={recentLastUpdated}
          selectedRegion={selectedRegion}
          mediaNewsType={mediaNewsType}
          isMissingApiKey={isMissingApiKey}
          upcomingItemsByRegion={upcomingItemsByRegion}
          recentItemsByRegion={recentItemsByRegion}
          fetchUpcomingItems={fetchUpcomingItems}
          fetchRecentItems={fetchRecentItems}
          setMediaNewsType={setMediaNewsType}
          setSelectedRegion={setSelectedRegion}
          // 词条维护相关状态和函数
          items={items}
          activeTab={activeTab}
          selectedDayFilter={selectedDayFilter}
          selectedCategory={selectedCategory}
          categories={categories}
          filteredOngoingItems={filteredOngoingItems}
          filteredCompletedItems={filteredCompletedItems}
          getFilteredItems={getFilteredItems}
          setActiveTab={setActiveTab}
          setSelectedDayFilter={setSelectedDayFilter}
          setSelectedCategory={setSelectedCategory}
          onItemClick={(item) => setSelectedItem(item)}
          // 组件引用
          RegionNavigation={RegionNavigation}
          ApiKeySetupGuide={ApiKeySetupGuide}
          VideoThumbnailExtractor={VideoThumbnailExtractor}
          ImageCropper={ImageCropper}
          WeekdayNavigation={WeekdayNavigation}
        >
          {/* 侧边栏布局的词条维护内容 - 移除重复的标签页导航 */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* 只保留词条维护相关的内容，移除TabsList */}
              <TabsContent value="ongoing">
                {/* 周几导航栏 */}
                <WeekdayNavigation />

                {/* 内容展示区域 */}
                <div className="mt-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
                    {getFilteredItems(filteredOngoingItems).map((item) => (
                      <MediaCard
                        key={item.id}
                        item={item}
                        onClick={() => setSelectedItem(item)}
                        showAirTime={true}
                      />
                    ))}
                  </div>

                  {getFilteredItems(filteredOngoingItems).length === 0 && (
                    <div className="text-center py-16">
                      <Clock className="h-16 w-16 mx-auto mb-4 text-gray-400 dark:text-gray-500 opacity-50" />
                      <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">
                        {selectedCategory !== "all"
                          ? `${categories.find(c => c.id === selectedCategory)?.name}分类暂无连载中词条`
                          : selectedDayFilter === "recent"
                            ? "暂无最近更新的词条"
                            : `${WEEKDAYS[selectedDayFilter === 0 ? 6 : selectedDayFilter - 1]}暂无连载中词条`}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">添加新词条后会自动出现在这里</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="completed">
                {/* 周几导航栏 */}
                <WeekdayNavigation />

                {/* 内容展示区域 */}
                <div className="mt-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-6">
                    {getFilteredItems(filteredCompletedItems).map((item) => (
                      <MediaCard
                        key={item.id}
                        item={item}
                        onClick={() => setSelectedItem(item)}
                        showAirTime={true}
                      />
                    ))}
                  </div>

                  {getFilteredItems(filteredCompletedItems).length === 0 && (
                    <div className="text-center py-16">
                      <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-gray-400 dark:text-gray-500 opacity-50" />
                      <h3 className="text-lg font-medium mb-2 text-gray-700 dark:text-gray-300">
                        {selectedCategory !== "all"
                          ? `${categories.find(c => c.id === selectedCategory)?.name}分类暂无已完结词条`
                          : selectedDayFilter === "recent"
                            ? "暂无最近完成的词条"
                            : `${WEEKDAYS[selectedDayFilter === 0 ? 6 : selectedDayFilter - 1]}暂无已完结词条`}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">完成维护的词条会自动出现在这里</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
        </SidebarLayout>

        {/* Dialogs */}
        <AddItemDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onAdd={handleAddItem}
        />
        <SettingsDialog 
          open={showSettingsDialog} 
          onOpenChange={(open) => {
            setShowSettingsDialog(open)
            if (!open) {
              setSettingsInitialSection(undefined)
            }
          }}
          initialSection={settingsInitialSection}
        />
        <GlobalScheduledTasksDialog open={showTasksDialog} onOpenChange={setShowTasksDialog} />
        <TaskExecutionLogsDialog
          open={showExecutionLogs}
          onOpenChange={setShowExecutionLogs}
          runningTasks={runningTasks}
        />
        <ImportDataDialog open={showImportDialog} onOpenChange={setShowImportDialog} />
        <ExportDataDialog open={showExportDialog} onOpenChange={setShowExportDialog} />
        {scheduledTaskItem && (
          <ScheduledTaskDialog
            item={scheduledTaskItem}
            open={showScheduledTaskDialog}
            onOpenChange={(open) => {
              setShowScheduledTaskDialog(open);
              if (!open) setScheduledTaskItem(null);
            }}
            onUpdate={handleUpdateItem}
            onTaskSaved={(task) => {
              console.log("定时任务已保存:", task);
              toast({
                title: "定时任务已保存",
                description: `任务 "${task.name}" 已成功保存`,
              });
            }}
          />
        )}
        {selectedItem && (
          <ItemDetailDialog
            item={selectedItem}
            open={!!selectedItem}
            onOpenChange={(open) => {
              if (!open) setSelectedItem(null)
            }}
            onUpdate={handleUpdateItem}
            onDelete={handleDeleteItem}
            onOpenScheduledTask={(item) => {
              setScheduledTaskItem(item);
              setShowScheduledTaskDialog(true);
            }}
          />
        )}
      </>
    )
  }

  // 原始布局
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm border-b dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              {/* Logo */}
              <div className="group">
                <Image
                  src="/tmdb-helper-logo.png"
                  alt="TMDB维护助手"
                  width={160}
                  height={60}
                  className="h-14 w-auto object-contain transform group-hover:scale-105 transition duration-300"
                  priority
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* 桌面版操作按钮 */}
              <div className="hidden md:flex md:items-center md:space-x-2">
                <Button variant="outline" size="sm" onClick={() => setShowTasksDialog(true)}>
                  <AlarmClock className="h-4 w-4 mr-2" />
                  定时任务
                </Button>
                {runningTasks.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExecutionLogs(true)}
                    className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/50"
                  >
                    <BarChart2 className="h-4 w-4 mr-2" />
                    执行日志 ({runningTasks.length})
                  </Button>
                )}

                <Button variant="outline" size="sm" onClick={() => setShowSettingsDialog(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  设置
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                {/* 用户头像 */}




                {isInitialized && userInfo && (
                  <div className="ml-2 pl-2 border-l border-gray-200 dark:border-gray-700">
                    <UserAvatar
                      onShowImportDialog={() => setShowImportDialog(true)}
                      onShowExportDialog={() => setShowExportDialog(true)}
                      onLayoutChange={handleLayoutChange}
                      currentLayout={currentLayout}
                    />
                  </div>
                )}
              </div>
              {/* 移动端菜单 */}
              <MobileMenu />
              
              {/* 移动端浮动状态指示器 */}
              <MobileFloatingStatusIndicator
                isConnected={isConnected}
                pendingOperations={pendingOperations}
                onTap={() => {
                  // 点击时显示详细状态信息
                  if (pendingOperations > 0) {
                    toast({
                      title: "数据同步中",
                      description: `正在处理 ${pendingOperations} 个操作`,
                      duration: 3000
                    })
                  } else if (!isConnected) {
                    toast({
                      title: "连接状态",
                      description: "实时同步连接已断开",
                      variant: "destructive",
                      duration: 3000
                    })
                  }
                }}
              />
              <Button
                onClick={() => setShowAddDialog(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                size={isMobile ? "sm" : "default"}
              >
                <Plus className="h-4 w-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">添加词条</span>
                <span className="sm:hidden">添加</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 分类选择器 - 移到顶部 */}
        <div className="py-4">
          {/* 桌面端水平分类 */}
          <div className="hidden md:block">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => {
                const isSelected = selectedCategory === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex items-center text-sm px-4 py-2.5 rounded-lg transition-all ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium shadow-sm border border-blue-200 dark:border-blue-800"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60 border border-gray-100 dark:border-gray-800"
                    }`}
                  >
                    <div className={`flex items-center justify-center h-7 w-7 rounded-lg mr-3 ${
                      isSelected 
                        ? "bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300" 
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                    }`}>
                      <span className="h-4 w-4">{category.icon}</span>
                    </div>
                    <span className={isSelected ? "font-medium" : ""}>{category.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* 移动端分类选择器 */}
          <div className="md:hidden overflow-x-auto pb-3">
            <div className="flex space-x-2">
              {categories.map((category) => {
                const isSelected = selectedCategory === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`flex-shrink-0 flex items-center text-xs px-3 py-2 rounded-lg transition-colors ${
                      isSelected
                        ? "bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium shadow-sm border border-blue-200 dark:border-blue-800"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60 border border-transparent"
                    }`}
                  >
                    <div className={`flex items-center justify-center h-6 w-6 rounded-md mr-1.5 ${
                      isSelected 
                        ? "bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300" 
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                    }`}>
                      <span className="h-3.5 w-3.5">{category.icon}</span>
                    </div>
                    <span>{category.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        


        {/* Stats Bar - 统计卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <StatCard 
            title="连载中"
            value={filteredOngoingCount}
            icon={<PlayCircle className="h-8 w-8" />}
            bgClass="bg-gradient-to-r from-blue-500 to-blue-600"
            iconClass="text-blue-200"
          />
          <StatCard 
            title="已完结"
            value={filteredCompletedCount}
            icon={<CheckCircle2 className="h-8 w-8" />}
            bgClass="bg-gradient-to-r from-green-500 to-green-600"
            iconClass="text-green-200"
          />
          <StatCard 
            title="总计"
            value={filteredTotalItems}
            icon={<Star className="h-8 w-8" />}
            bgClass="bg-gradient-to-r from-purple-500 to-purple-600"
            iconClass="text-purple-200"
          />
        </div>

        {/* 主内容 */}
        <div className="pb-20 md:pb-8">
          {renderContent()}
        </div>
      </div>

      {/* 移动端底部操作栏 */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border-t dark:border-gray-700 p-4 z-30">
          <div className="flex justify-center">
            <Button
              onClick={() => setShowAddDialog(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-full px-8 py-3 shadow-lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              添加新词条
            </Button>
          </div>
        </div>
      )}



      {/* Dialogs */}
      <AddItemDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog} 
        onAdd={handleAddItem} 
      />
      <SettingsDialog 
        open={showSettingsDialog} 
        onOpenChange={(open) => {
          setShowSettingsDialog(open)
          if (!open) {
            setSettingsInitialSection(undefined)
          }
        }}
        initialSection={settingsInitialSection}
      />
      <GlobalScheduledTasksDialog open={showTasksDialog} onOpenChange={setShowTasksDialog} />
      <TaskExecutionLogsDialog
        open={showExecutionLogs}
        onOpenChange={setShowExecutionLogs}
        runningTasks={runningTasks}
      />
      <ImportDataDialog open={showImportDialog} onOpenChange={setShowImportDialog} />
      <ExportDataDialog open={showExportDialog} onOpenChange={setShowExportDialog} />
      {scheduledTaskItem && (
        <ScheduledTaskDialog
          item={scheduledTaskItem}
          open={showScheduledTaskDialog}
          onOpenChange={(open) => {
            setShowScheduledTaskDialog(open);
            if (!open) setScheduledTaskItem(null);
          }}
          onUpdate={handleUpdateItem}
          onTaskSaved={(task) => {
            console.log("定时任务已保存:", task);
            toast({
              title: "定时任务已保存",
              description: `任务 "${task.name}" 已成功保存`,
            });
          }}
        />
      )}
      {selectedItem && (
        <ItemDetailDialog
          item={selectedItem}
          open={!!selectedItem}
          onOpenChange={(open) => {
            if (!open) setSelectedItem(null)
          }}
          onUpdate={handleUpdateItem}
          onDelete={handleDeleteItem}
          onOpenScheduledTask={(item) => {
            setScheduledTaskItem(item);
            setShowScheduledTaskDialog(true);
          }}
        />
      )}
    </div>
  )
}
