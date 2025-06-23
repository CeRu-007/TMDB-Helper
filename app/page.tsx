"use client"

import type React from "react"

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
  Loader2,
  RefreshCw,
  AlertTriangle,
  AlarmClock,
  ExternalLink,
  Wifi,
  Key,
  Server,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useTheme } from "next-themes"
import Link from "next/link"
import Image from "next/image"
import AddItemDialog from "@/components/add-item-dialog"
import SettingsDialog from "@/components/settings-dialog"
import ItemDetailDialog from "@/components/item-detail-dialog"
import VideoThumbnailExtractor from "@/components/video-thumbnail-extractor"
import GlobalScheduledTasksDialog from "@/components/global-scheduled-tasks-dialog"
import { type TMDBItem } from "@/lib/storage"
import { useMobile } from "@/hooks/use-mobile"
import MediaCard from "@/components/media-card"
import { useIsClient } from "@/hooks/use-is-client"
import { useData } from "@/components/client-data-provider"
import { StatCard } from "@/components/ui/stat-card"
import { StorageManager } from "@/lib/storage"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]

// 判断当前环境是否为客户端
const isClientEnv = typeof window !== 'undefined'

export default function HomePage() {
  const { toast } = useToast()
  const router = useRouter()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [showTasksDialog, setShowTasksDialog] = useState(false)
  const [selectedItem, setSelectedItem] = useState<TMDBItem | null>(null)
  const [currentDay, setCurrentDay] = useState(() => {
    if (isClientEnv) {
      const jsDay = new Date().getDay() // 0-6，0是周日
      return jsDay === 0 ? 6 : jsDay - 1 // 转换为0=周一，6=周日
    }
    return 0 // 默认周一
  })
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
  
  // 使用数据提供者获取数据和方法
  const { 
    items, 
    loading, 
    error: loadError, 
    initialized, 
    refreshData: handleRefresh, 
    addItem: handleAddItem, 
    updateItem: handleUpdateItem, 
    deleteItem: handleDeleteItem,
    exportData,
    importData: importDataFromJson
  } = useData()

  // 获取即将上线的内容
  const fetchUpcomingItems = async (silent = false, retryCount = 0) => {
    if (!silent) {
      setLoadingUpcoming(true);
    }
    setUpcomingError(null);
    setIsMissingApiKey(false);
    
    try {
      // 从localStorage获取API密钥
      const apiKey = localStorage.getItem("tmdb_api_key");
      
      // 检查API密钥是否存在
      if (!apiKey) {
        setIsMissingApiKey(true);
        throw new Error('TMDB API密钥未配置，请在设置中配置');
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
      
      const response = await fetch(`/api/tmdb/upcoming?api_key=${encodeURIComponent(apiKey)}`, {
        signal: controller.signal,
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('服务器响应错误:', errorText);
        
        // 检查是否是API密钥未配置或无效的错误
        if (errorText.includes('API密钥未配置') || errorText.includes('401 Unauthorized')) {
          setIsMissingApiKey(true);
          throw new Error('TMDB API密钥无效，请在设置中重新配置');
        }
        
        // 根据HTTP状态码提供更详细的错误信息
        let errorMessage = `获取即将上线内容失败 (${response.status})`;
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
        // 保存数据到状态
        setUpcomingItems(data.results);
        setUpcomingLastUpdated(new Date().toLocaleString('zh-CN'));
        
        // 同时保存到localStorage作为缓存，以防页面刷新后数据丢失
        try {
          localStorage.setItem('upcomingItems', JSON.stringify(data.results));
          localStorage.setItem('upcomingLastUpdated', new Date().toLocaleString('zh-CN'));
        } catch (e) {
          console.warn('无法保存即将上线数据到本地存储:', e);
        }
      } else {
        // 检查是否是API密钥未配置或无效的错误
        if (data.error && (data.error.includes('API密钥未配置') || data.error.includes('401 Unauthorized'))) {
          setIsMissingApiKey(true);
          throw new Error('TMDB API密钥无效，请在设置中重新配置');
        }
        throw new Error(data.error || '获取即将上线内容失败');
      }
    } catch (error) {
      console.error('获取即将上线内容失败:', error);
      setUpcomingError(error instanceof Error ? error.message : '未知错误');
      
      // 如果是网络错误或超时，尝试重试（最多5次）
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (retryCount < 5 && 
          (errorMessage.includes('network') || 
           errorMessage.includes('timeout') || 
           errorMessage.includes('aborted') ||
           error instanceof TypeError)) {
        console.log(`尝试重新获取即将上线内容，第${retryCount + 1}次重试`);
        
        // 使用指数退避算法计算延迟时间
        // 基础延迟为1000ms，每次重试翻倍，并添加随机因子
        const baseDelay = 1000;
        const exponentialDelay = baseDelay * Math.pow(2, retryCount);
        const jitter = Math.random() * 1000; // 0-1000ms的随机值
        const delay = exponentialDelay + jitter;
        
        console.log(`重试延迟: ${Math.round(delay)}ms`);
        
        // 延迟重试，避免立即重试可能导致的同样错误
        setTimeout(() => {
          fetchUpcomingItems(silent, retryCount + 1);
        }, delay);
        
        return; // 不要继续执行后面的代码
      }
      
      // 如果重试失败或其他错误，尝试从localStorage加载缓存数据
      if (retryCount >= 5) {
        try {
          const cachedItems = localStorage.getItem('upcomingItems');
          const cachedLastUpdated = localStorage.getItem('upcomingLastUpdated');
          
          if (cachedItems) {
            setUpcomingItems(JSON.parse(cachedItems));
            if (cachedLastUpdated) {
              setUpcomingLastUpdated(cachedLastUpdated + ' (缓存)');
            }
            setUpcomingError('无法获取最新数据，显示的是缓存数据');
          }
        } catch (e) {
          console.warn('无法从本地存储加载缓存数据:', e);
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
    // 首先尝试从localStorage加载缓存数据
    try {
      const cachedItems = localStorage.getItem('upcomingItems');
      const cachedLastUpdated = localStorage.getItem('upcomingLastUpdated');
      
      if (cachedItems) {
        setUpcomingItems(JSON.parse(cachedItems));
        if (cachedLastUpdated) {
          setUpcomingLastUpdated(cachedLastUpdated);
        }
      }
    } catch (e) {
      console.warn('无法从本地存储加载缓存数据:', e);
    }
    
    // 然后获取最新数据
    fetchUpcomingItems();
    
    // 每小时刷新一次
    const intervalId = setInterval(() => {
      fetchUpcomingItems(true); // 静默刷新
    }, 60 * 60 * 1000); // 1小时
    
    return () => clearInterval(intervalId);
  }, []);

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

  // 更新当前日期
  useEffect(() => {
    const dayTimer = setInterval(() => {
      // 将JS的日期（0=周日，1=周一）转换为我们的数组索引（0=周一，6=周日）
      const jsDay = new Date().getDay() // 0-6，0是周日
      const adjustedDay = jsDay === 0 ? 6 : jsDay - 1 // 转换为0=周一，6=周日
      setCurrentDay(adjustedDay)
    }, 60000)
    
    return () => {
      clearInterval(dayTimer);
    }
  }, [])

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

  // 初始化时也需要设置正确的当前日期
  useEffect(() => {
    const jsDay = new Date().getDay()
    const adjustedDay = jsDay === 0 ? 6 : jsDay - 1
    setCurrentDay(adjustedDay)
  }, [])

  // 导入数据处理
  const importData = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isClientEnv) return;
    
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result as string
          importDataFromJson(data)
          alert("数据导入成功！")
        } catch (error) {
          console.error("Failed to import data:", error)
          alert("数据导入失败，请检查文件格式")
        }
      }
      reader.readAsText(file)
    }
  }

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
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="md:hidden">
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <div className="flex flex-col space-y-4 mb-8">
          <div className="flex flex-col space-y-1">
            <h2 className="text-lg font-medium">快捷功能</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">常用功能快速访问</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" size="sm" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              添加词条
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowTasksDialog(true)}>
            <AlarmClock className="h-4 w-4 mr-2" />
              定时任务
          </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSettingsDialog(true)}>
            <Settings className="h-4 w-4 mr-2" />
            设置
          </Button>
          <Button
            variant="outline"
              size="sm"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
              {theme === "dark" ? (
                <Sun className="h-4 w-4 mr-2" />
              ) : (
                <Moon className="h-4 w-4 mr-2" />
              )}
              {theme === "dark" ? "浅色" : "深色"}
          </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )

  // 周几导航栏 - 修复词条数量计算问题
  const WeekdayNavigation = () => {
    // 根据当前活动标签页获取对应状态的词条
    const currentTabItems = activeTab === "ongoing" ? ongoingItems : completedItems
    
    // 先按分类筛选当前标签页的词条
    const filteredTabItems = filterItemsByCategory(currentTabItems)

    return (
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-700 sticky top-16 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-1 overflow-x-auto py-3">
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
              const isToday = index === currentDay
              const isSelected = selectedDayFilter === jsWeekday

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDayFilter(jsWeekday)}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isSelected
                      ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-600"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
                  } ${isToday ? "ring-2 ring-yellow-400" : ""}`}
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
    <div className="bg-yellow-50 dark:bg-yellow-900/30 p-6 rounded-lg border border-yellow-200 dark:border-yellow-800 mb-6">
      <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-300 mb-3 flex items-center">
        <Settings className="h-5 w-5 mr-2" />
        需要配置TMDB API密钥
      </h3>
      <p className="text-yellow-700 dark:text-yellow-400 mb-4">
        要使用"即将上线"功能，您需要配置有效的TMDB API密钥。
      </p>
      <div className="flex justify-center mb-4">
        <Button 
          onClick={() => setShowSettingsDialog(true)}
          className="bg-yellow-600 hover:bg-yellow-700 text-white"
        >
          <Settings className="h-4 w-4 mr-2" />
          打开设置配置API密钥
        </Button>
      </div>
      <div className="bg-yellow-100 dark:bg-yellow-800/50 p-3 rounded border border-yellow-200 dark:border-yellow-700">
        <p className="text-sm text-yellow-800 dark:text-yellow-300">
          <strong>提示：</strong> 您已在设置中配置过API密钥，但可能无效或已过期。请检查并更新您的API密钥。
        </p>
      </div>
    </div>
  );

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
          <TabsList className="grid w-full grid-cols-4 mb-6 h-12">
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
              <span>即将上线</span>
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
            {/* 全新设计的即将上线内容头部 */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center">
                <div className="relative mr-3">
                  <div className="absolute inset-0 bg-blue-500 blur-md opacity-20 rounded-full"></div>
                  <div className="relative bg-gradient-to-br from-blue-500 to-indigo-600 p-2 rounded-full text-white">
                    <Calendar className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">即将上线</h2>
                    {upcomingItems.length > 0 && (
                      <span className="ml-2 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
                        {upcomingItems.filter(upcomingItem => 
                          !items.some(item => 
                            item.tmdbId === upcomingItem.id.toString() && 
                            item.mediaType === upcomingItem.mediaType
                          )
                        ).length}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">未来30天内上线的内容</p>
                </div>
              </div>
              
              {/* 功能按钮 */}
              <div className="flex flex-wrap gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => fetchUpcomingItems()}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${loadingUpcoming ? 'animate-spin' : ''}`} />
                  刷新数据
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowSettingsDialog(true)}>
                  <Settings className="h-4 w-4 mr-2" />
                  配置API密钥
                </Button>
              </div>
            </div>
            
            {/* 即将上线内容主体 */}
            <div>
              {/* 显示API密钥配置指南 */}
              {isMissingApiKey && <ApiKeySetupGuide />}
              
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
                      onClick={() => fetchUpcomingItems()} 
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
                    未找到未来30天内上线的中文内容
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
                        {/* 只显示上映日期标签 */}
                        <div className="mb-2">
                          <Badge
                            className="bg-green-500 text-white text-xs px-2 py-1 rounded-full"
                          >
                            {new Date(item.releaseDate).toLocaleDateString('zh-CN')}
                          </Badge>
                        </div>
                        
                        {/* 海报容器 - 不再直接链接到TMDB，点击按钮时才导航 */}
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
                                    
                                    // 添加点击反馈
                                    const button = e.currentTarget;
                                    button.classList.add('animate-ping-once');
                                    button.disabled = true;
                                    
                                    // 使用超小图标显示成功状态
                                    const originalInnerHTML = button.innerHTML;
                                    button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
                                    
                                    // 短暂延迟后打开对话框
                                    setTimeout(() => {
                                      setShowAddDialog(true);
                                      // 恢复按钮状态
                                      setTimeout(() => {
                                        button.classList.remove('animate-ping-once');
                                        button.disabled = false;
                                        button.innerHTML = originalInnerHTML;
                                      }, 500);
                                    }, 300);
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
                                  {`${new Date(item.releaseDate).getMonth() + 1}月${new Date(item.releaseDate).getDate()}日`}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-2 space-y-1 relative z-0">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm leading-tight line-clamp-1 group-hover:text-blue-600 transition-colors">
                              {item.title}
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(item.releaseDate).toLocaleDateString('zh-CN')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="thumbnail">
            <VideoThumbnailExtractor />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // 在组件加载时，确保activeTab有效
  useEffect(() => {
    // 如果当前标签是"upcoming"，但没有API密钥，自动切换到"ongoing"
    if (activeTab === "upcoming" && !localStorage.getItem("tmdb_api_key")) {
      setActiveTab("ongoing");
      setShowSettingsDialog(true); // 显示设置对话框
    }
  }, [activeTab]);
  
  // 确保即将上线页面不会消失
  useEffect(() => {
    // 如果用户切换到即将上线标签，但数据为空，尝试重新获取
    if (activeTab === "upcoming" && upcomingItems.length === 0 && !loadingUpcoming && !upcomingError) {
      fetchUpcomingItems();
    }
  }, [activeTab, upcomingItems.length, loadingUpcoming, upcomingError]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm border-b dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              {/* 替换为上传的图标并添加适度的动画效果 */}
              <div className="relative group">
                {/* 添加更柔和的背景光晕效果 */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/30 to-blue-500/30 rounded-lg blur-sm opacity-30 group-hover:opacity-50 transition duration-500"></div>
                
                <div className="relative transform group-hover:scale-105 transition duration-300">
                  <Image 
                    src="/images/tmdb-helper-logo-new.png"
                    alt="TMDB维护助手"
                    width={44}
                    height={44}
                    className="rounded-lg transition-all duration-300"
                  />
                </div>
              </div>
              <div>
                {/* 优化标题样式 */}
                <div className="flex flex-col">
                  <h1 className="text-lg md:text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-600 to-blue-700 dark:from-cyan-400 dark:to-blue-500">
                    TMDB<span className="font-bold tracking-wide">维护助手</span>
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">共 {totalItems} 个词条</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* 桌面版操作按钮 */}
              <div className="hidden md:flex md:items-center md:space-x-2">
                <Button variant="outline" size="sm" onClick={() => setShowTasksDialog(true)}>
                  <AlarmClock className="h-4 w-4 mr-2" />
                  定时任务
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("import-file")?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  导入
                </Button>
                <Button variant="outline" size="sm" onClick={exportData}>
                  <Download className="h-4 w-4 mr-2" />
                  导出
                </Button>
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
              </div>
              {/* 移动端菜单 */}
              <MobileMenu />
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

      {/* Hidden file input for import */}
      <input id="import-file" type="file" accept=".json" className="hidden" onChange={importData} />

      {/* Dialogs */}
      <AddItemDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog} 
        onAdd={handleAddItem} 
      />
      <SettingsDialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog} />
      <GlobalScheduledTasksDialog open={showTasksDialog} onOpenChange={setShowTasksDialog} />
      {selectedItem && (
        <ItemDetailDialog
          item={selectedItem}
          open={!!selectedItem}
          onOpenChange={(open) => {
            if (!open) setSelectedItem(null)
          }}
          onUpdate={handleUpdateItem}
          onDelete={handleDeleteItem}
        />
      )}
    </div>
  )
}
