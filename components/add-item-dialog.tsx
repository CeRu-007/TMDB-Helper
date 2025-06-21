"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge, badgeVariants } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Tv, 
  Search, 
  Info, 
  Star, 
  ExternalLink, 
  Loader2, 
  Sparkles,
  Clapperboard,
  Baby,
  Popcorn,
  Ticket,
  LayoutGrid,
  Zap
} from "lucide-react"
import type { TMDBItem, Season, Episode } from "@/lib/storage"
import { TMDBService } from "@/lib/tmdb"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"

const WEEKDAYS = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]

// 定义分类列表
const CATEGORIES = [
  { id: "anime" as const, name: "动漫", icon: <Sparkles className="h-4 w-4" strokeWidth={2} /> },
  { id: "tv" as const, name: "电视剧", icon: <Tv className="h-4 w-4" strokeWidth={2} /> },
  { id: "kids" as const, name: "少儿", icon: <Baby className="h-4 w-4" strokeWidth={2} /> },
  { id: "variety" as const, name: "综艺", icon: <Popcorn className="h-4 w-4" strokeWidth={2} /> },
  { id: "short" as const, name: "短剧", icon: <Ticket className="h-4 w-4" strokeWidth={2} /> },
  { id: "movie" as const, name: "电影", icon: <Clapperboard className="h-4 w-4" strokeWidth={2} /> },
]

type CategoryType = "anime" | "tv" | "kids" | "variety" | "short" | "movie";

interface TMDBSearchResult {
  id: number
  title: string
  name?: string
  media_type: "movie" | "tv"
  poster_path?: string
  first_air_date?: string
  release_date?: string
  overview?: string
  vote_average?: number
  original_language?: string
}

interface AddItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (item: TMDBItem) => void
}

export default function AddItemDialog({ open, onOpenChange, onAdd }: AddItemDialogProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<TMDBSearchResult[]>([])
  const [selectedResult, setSelectedResult] = useState<TMDBSearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [tmdbSeasons, setTmdbSeasons] = useState<any[]>([])
  const [formData, setFormData] = useState({
    weekday: 1,
    secondWeekday: -1, // -1 表示未设置
    airTime: "19:00",
    totalEpisodes: 1,
    platformUrl: "",
    category: "" as CategoryType | "",
    isDailyUpdate: false // 添加每日更新选项
  })
  // Node.js和浏览器环境中setTimeout返回类型不同，使用any类型避免类型错误
  const searchTimeoutRef = useRef<any>();
  
  // 获取显示标题
  const getDisplayTitle = (result: TMDBSearchResult) => {
    return result.media_type === "movie" ? result.title : result.name || result.title
  }
  
  // 选择搜索结果 - 使用useCallback包装以避免依赖循环
  const handleSelectResult = useCallback(async (result: TMDBSearchResult) => {
    setSelectedResult(result)
    setDetailLoading(true)

    try {
      // 构建TMDB URL
      const tmdbUrl = `https://www.themoviedb.org/${result.media_type}/${result.id}`

      // 创建详细信息预览卡片
      const previewCard = document.createElement('div');
      previewCard.className = 'p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 mb-4';
      previewCard.innerHTML = `
        <div class="flex items-center justify-between">
          <div class="text-sm font-medium text-blue-700 dark:text-blue-300">TMDB详情预览</div>
          <button type="button" class="text-gray-500 hover:text-gray-700" onclick="this.parentElement.parentElement.remove()">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="mt-2 text-xs text-gray-600 dark:text-gray-400">
          <p><strong>ID:</strong> ${result.id}</p>
          <p><strong>标题:</strong> ${getDisplayTitle(result)}</p>
          <p><strong>类型:</strong> ${result.media_type === 'movie' ? '电影' : '剧集'}</p>
          <p><strong>TMDB链接:</strong> 
            <a href="https://www.themoviedb.org/${result.media_type}/${result.id}" 
               target="_blank" 
               rel="noopener noreferrer"
               class="text-blue-600 hover:underline">
              查看TMDB页面
            </a>
          </p>
        </div>
      `;
      
      // 插入预览卡片到表单顶部
      const formElement = document.querySelector('form.space-y-6');
      if (formElement && formElement.firstChild) {
        const timeoutId = setTimeout(() => {
          formElement.insertBefore(previewCard, formElement.firstChild);
          // 清除超时
          clearTimeout(timeoutId);
        }, 100);
      }

      // 获取详细信息
      const tmdbData = await TMDBService.getItemFromUrl(tmdbUrl)

      if (tmdbData) {
        // 更新表单数据
        setFormData((prev) => ({
          ...prev,
          totalEpisodes: tmdbData.totalEpisodes || prev.totalEpisodes,
          platformUrl: prev.platformUrl || tmdbData.platformUrl || "",
          weekday: tmdbData.weekday !== undefined ? tmdbData.weekday : prev.weekday,
          // 根据标签自动设置推荐分类
          category: prev.category || tmdbData.recommendedCategory || (result.media_type === "movie" ? "movie" : "tv") as CategoryType
        }))

        // 设置季数据用于预览
        if (tmdbData.seasons) {
          setTmdbSeasons(tmdbData.seasons)
        }
      }
    } catch (error) {
      console.error("获取详细信息失败:", error)
    } finally {
      setDetailLoading(false)
    }
  }, [setSelectedResult, setDetailLoading, setFormData, setTmdbSeasons])
  
  // 处理预填充数据
  useEffect(() => {
    if (open) {
      // 检查localStorage中是否有预填充数据
      const prefilledDataStr = localStorage.getItem('tmdb_prefilled_data');
      if (prefilledDataStr) {
        try {
          const prefilledData = JSON.parse(prefilledDataStr);
          
          // 设置搜索查询为标题
          setSearchQuery(prefilledData.title);
          
          // 创建一个更详细的搜索结果
          const mockResult: TMDBSearchResult = {
            id: Number(prefilledData.id || 0),
            title: prefilledData.title,
            name: prefilledData.title, // 确保TV类型也显示标题
            media_type: prefilledData.media_type as "movie" | "tv",
            poster_path: prefilledData.poster_path,
            release_date: prefilledData.release_date,
            first_air_date: prefilledData.media_type === 'tv' ? prefilledData.release_date : undefined,
            overview: prefilledData.overview,
            vote_average: prefilledData.vote_average,
            original_language: prefilledData.original_language
          };
          
          // 设置搜索结果
          setSearchResults([mockResult]);
          
          // 设置选中结果
          setSelectedResult(mockResult);
          
          // 手动获取详细信息
          const tmdbUrl = `https://www.themoviedb.org/${mockResult.media_type}/${mockResult.id}`;
          setDetailLoading(true);
          
          TMDBService.getItemFromUrl(tmdbUrl)
            .then(tmdbData => {
              if (tmdbData) {
                // 更新表单数据
                setFormData(prev => ({
                  ...prev,
                  totalEpisodes: tmdbData.totalEpisodes || prev.totalEpisodes,
                  platformUrl: prev.platformUrl || tmdbData.platformUrl || "",
                  weekday: tmdbData.weekday !== undefined ? tmdbData.weekday : prev.weekday,
                  category: prev.category || tmdbData.recommendedCategory || (mockResult.media_type === "movie" ? "movie" : "tv") as CategoryType
                }));
                
                // 设置季数据用于预览
                if (tmdbData.seasons) {
                  setTmdbSeasons(tmdbData.seasons);
                }
              }
            })
            .catch(error => {
              console.error("获取详细信息失败:", error);
            })
            .finally(() => {
              setDetailLoading(false);
              // 清除localStorage中的预填充数据
              localStorage.removeItem('tmdb_prefilled_data');
            });
        } catch (error) {
          console.error("解析预填充数据失败:", error);
          localStorage.removeItem('tmdb_prefilled_data');
        }
      }
    }
  }, [open]);
  
  // 当对话框关闭时重置表单
  useEffect(() => {
    if (!open) {
      // 直接在这里重置状态
      setSearchQuery("");
      setSearchResults([]);
      setSelectedResult(null);
      setTmdbSeasons([]);
      setFormData({
        weekday: 1,
        secondWeekday: -1,
        airTime: "19:00",
        totalEpisodes: 1,
        platformUrl: "",
        category: "",
        isDailyUpdate: false
      });
    }
  }, [open]);

  // 搜索TMDB
  const searchTMDB = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setLoading(true)
    try {
      const apiKey = localStorage.getItem("tmdb_api_key")
      if (!apiKey) {
        throw new Error("请先在设置中配置TMDB API密钥")
      }

      const response = await fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${apiKey}&language=zh-CN&query=${encodeURIComponent(query)}&page=1`,
      )

      if (!response.ok) {
        throw new Error("搜索失败，请检查API密钥是否正确")
      }

      const data = await response.json()
      const results = data.results
        .filter((item: any) => item.media_type === "movie" || item.media_type === "tv")
        .slice(0, 10) // 限制显示10个结果

      setSearchResults(results)
    } catch (error) {
      console.error("搜索失败:", error)
      alert(error instanceof Error ? error.message : "搜索失败")
      setSearchResults([])
    } finally {
      setLoading(false)
    }
  }

  // 处理搜索输入
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    setSelectedResult(null)
    setTmdbSeasons([])

    // 清除之前的定时器
    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current)
    }

    // 设置新的定时器，延迟搜索
    searchTimeoutRef.current = window.setTimeout(() => {
      searchTMDB(value)
    }, 500) as unknown as number
  }

  // 重置表单
  const resetForm = () => {
    setSearchQuery("")
    setSearchResults([])
    setSelectedResult(null)
    setFormData({
      weekday: 1,
      secondWeekday: -1,
      airTime: "19:00",
      totalEpisodes: 1,
      platformUrl: "",
      category: "",
      isDailyUpdate: false
    })
    setTmdbSeasons([])
  }

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedResult) {
      alert("请先选择一个词条")
      return
    }
    
    setLoading(true)
    
    try {
      const tmdbUrl = `https://www.themoviedb.org/${selectedResult.media_type}/${selectedResult.id}`
      const tmdbData = await TMDBService.getItemFromUrl(tmdbUrl)
      
      if (!tmdbData) {
        throw new Error("无法获取词条详细信息")
      }
      
      // 构建季数据
      let seasons: Season[] = []
      let episodes: Episode[] = []
      let totalEpisodes = formData.totalEpisodes
      
      if (tmdbData.seasons && tmdbData.seasons.length > 0) {
        // 多季电视剧
        seasons = tmdbData.seasons.map((seasonData) => ({
          seasonNumber: seasonData.seasonNumber,
          name: seasonData.name,
          totalEpisodes: seasonData.totalEpisodes,
          episodes: Array.from({ length: seasonData.totalEpisodes }, (_, i) => ({
            number: i + 1,
            completed: false,
            seasonNumber: seasonData.seasonNumber,
          })),
          posterUrl: seasonData.posterUrl,
        }))
        
        // 生成所有集数的扁平化数组
        episodes = seasons.flatMap((season) => season.episodes)
        totalEpisodes = tmdbData.totalEpisodes || episodes.length
      } else if (selectedResult.media_type === "tv") {
        // 单季电视剧
        const episodeCount = tmdbData.totalEpisodes || formData.totalEpisodes
        totalEpisodes = episodeCount
        episodes = Array.from({ length: episodeCount }, (_, i) => ({
          number: i + 1,
          completed: false,
        }))
      }
      
      // 优先使用用户手动输入的平台地址
      const finalPlatformUrl = formData.platformUrl || tmdbData.platformUrl || ""
      
      // 判断是否手动设置了集数
      const isManuallySetEpisodes = selectedResult.media_type === "tv" && 
        (tmdbData.totalEpisodes !== formData.totalEpisodes || 
        (!tmdbData.totalEpisodes && formData.totalEpisodes > 1));
      
      // 创建项目对象
      const newItem: TMDBItem = {
        id: Date.now().toString(),
        title: tmdbData.title,
        mediaType: tmdbData.mediaType,
        tmdbId: tmdbData.tmdbId,
        tmdbUrl: tmdbUrl,
        posterUrl: tmdbData.posterUrl || "",
        weekday: formData.weekday,
        airTime: formData.airTime,
        // 只有当第二播出日设置了有效值时才添加
        ...(formData.secondWeekday >= 0 && { secondWeekday: formData.secondWeekday }),
        totalEpisodes: selectedResult.media_type === "movie" ? 1 : totalEpisodes,
        // 添加手动设置集数标记
        ...(isManuallySetEpisodes && { manuallySetEpisodes: true }),
        isDailyUpdate: formData.isDailyUpdate, // 添加每日更新字段
        seasons: seasons.length > 0 ? seasons : undefined,
        episodes: selectedResult.media_type === "movie" ? [] : episodes,
        completed: false,
        status: "ongoing",
        platformUrl: finalPlatformUrl,
        category: formData.category as CategoryType,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      onAdd(newItem)
      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error("添加词条失败:", error)
      alert("添加词条失败: " + (error instanceof Error ? error.message : "未知错误"))
    } finally {
      setLoading(false)
    }
  }

  // 格式化日期
  const formatDate = (dateString?: string) => {
    if (!dateString) return "未知"
    return new Date(dateString).getFullYear().toString()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>添加新词条</DialogTitle>
          <DialogDescription>
            搜索并添加新的电影或电视剧到您的收藏中
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 搜索区域 */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="search">搜索TMDB词条</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="输入电影或电视剧名称进行搜索..."
                  className="pl-10"
                />
                {loading && (
                  <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">输入关键词搜索TMDB数据库中的电影和电视剧</p>
            </div>

            {/* 搜索结果 */}
            {loading && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">搜索中...</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-3 rounded-lg border animate-pulse">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-15 bg-gray-200 dark:bg-gray-700 rounded"></div>
                          <div className="flex-1">
                            <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                            <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                            <div className="h-3 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {searchResults.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">搜索结果</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-2">
                      {searchResults.map((result) => (
                        <div
                          key={result.id}
                          onClick={() => handleSelectResult(result)}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedResult?.id === result.id
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                              : "border-gray-200 hover:border-gray-300 dark:border-gray-700"
                          }`}
                        >
                          <div className="flex items-start space-x-3">
                            <img
                              src={
                                result.poster_path
                                  ? `https://image.tmdb.org/t/p/w92${result.poster_path}`
                                  : "/placeholder.svg?height=60&width=40"
                              }
                              alt={getDisplayTitle(result)}
                              className="w-10 h-15 object-cover rounded"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-medium text-sm truncate">{getDisplayTitle(result)}</h3>
                                <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold border-transparent bg-primary text-primary-foreground">
                                  {result.media_type === "movie" ? "电影" : "电视"}
                                </div>
                                {result.vote_average && result.vote_average > 0 && (
                                  <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-foreground">
                                    <Star className="h-3 w-3 mr-1" />
                                    {result.vote_average.toFixed(1)}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center space-x-4 text-xs text-gray-500 mb-1">
                                <span>ID: {result.id}</span>
                                <span>{formatDate(result.first_air_date || result.release_date)}</span>
                                {result.original_language && <span>{result.original_language.toUpperCase()}</span>}
                              </div>
                              {result.overview && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                  {result.overview}
                                </p>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                window.open(`https://www.themoviedb.org/${result.media_type}/${result.id}`, "_blank")
                              }}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}
          </div>

          {/* 选中词条的详细信息 */}
          {selectedResult && (
            <div className="space-y-4">
              {detailLoading && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>正在获取详细信息...</span>
                </div>
              )}

              {/* 季数预览 */}
              {tmdbSeasons.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-base">
                      <Tv className="h-4 w-4 mr-2" />
                      检测到多季内容
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {tmdbSeasons.map((season) => (
                          <Badge
                            key={season.seasonNumber}
                            variant="secondary"
                            className="px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                          >
                            <div className="flex flex-col items-center space-y-1">
                              <span className="text-sm font-medium">{season.name}</span>
                              <span className="text-xs">{season.totalEpisodes} 集</span>
                            </div>
                          </Badge>
                        ))}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        总计 {tmdbSeasons.length} 季，共 {tmdbSeasons.reduce((total, s) => total + s.totalEpisodes, 0)}{" "}
                        集
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* 基本设置 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">基本设置</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="weekday">播出日期</Label>
                      <Select
                        value={formData.weekday.toString()}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, weekday: Number.parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WEEKDAYS.map((day, index) => {
                            // 将我们的索引（0=周一，6=周日）转换回JS的日期（0=周日，1=周一）
                            const jsWeekday = index === 6 ? 0 : index + 1;
                            return (
                              <SelectItem key={index} value={jsWeekday.toString()}>
                              {day}
                            </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="airTime">播出时间</Label>
                      <div className="flex items-center space-x-2">
                        <Input 
                          id="airTime"
                          placeholder="时间 (如 20:00)"
                          value={formData.airTime}
                          onChange={(e) => setFormData({...formData, airTime: e.target.value})}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 添加每日更新设置选项 - 移除分类限制，允许所有分类设置 */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="daily-update"
                        checked={formData.isDailyUpdate}
                        onCheckedChange={(checked) => setFormData({...formData, isDailyUpdate: checked === true})}
                      />
                      <Label htmlFor="daily-update" className="flex items-center cursor-pointer">
                        <Zap className="h-3 w-3 mr-1 animate-pulse" />
                        设为每日更新
                      </Label>
                    </div>
                  </div>

                  {/* 分类选择 */}
                  <div>
                    <Label htmlFor="category">分类</Label>
                    <Select
                      value={formData.category || "none"}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, category: value === "none" ? "" as CategoryType : value as CategoryType }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择分类" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">选择分类</SelectItem>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            <div className="flex items-center">
                              {category.icon}
                              <span>{category.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedResult && formData.category && (
                      <p className="text-xs text-gray-500 mt-1">
                        {formData.category === "anime" && "已自动检测为动漫，根据TMDB类型标签"}
                        {formData.category === "kids" && "已自动检测为少儿节目，根据TMDB类型标签"}
                        {formData.category === "variety" && "已自动检测为综艺节目，根据TMDB类型标签"}
                        {formData.category === "movie" && "已自动检测为电影"}
                        {formData.category === "tv" && "已自动检测为电视剧"}
                        {formData.category === "short" && "已设置为短剧"}
                      </p>
                    )}
                  </div>

                  {/* 第二播出日选择器 - 仅在动漫分类下显示 */}
                  {formData.category === "anime" && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label htmlFor="secondWeekday">第二播出日（可选）</Label>
                        {formData.secondWeekday >= 0 && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs text-red-500"
                            onClick={() => setFormData((prev) => ({ ...prev, secondWeekday: -1 }))}
                          >
                            清除
                          </Button>
                        )}
                      </div>
                      <Select
                        value={formData.secondWeekday >= 0 ? formData.secondWeekday.toString() : "-1"}
                        onValueChange={(value) => setFormData((prev) => ({ ...prev, secondWeekday: Number.parseInt(value) }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="无第二播出日" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="-1">不设置</SelectItem>
                          {WEEKDAYS.map((day, index) => {
                            // 将我们的索引（0=周一，6=周日）转换回JS的日期（0=周日，1=周一）
                            const jsWeekday = index === 6 ? 0 : index + 1;
                            // 禁用主播出日，避免重复
                            const disabled = jsWeekday === formData.weekday;
                            return (
                              <SelectItem 
                                key={index} 
                                value={jsWeekday.toString()}
                                disabled={disabled}
                              >
                                {day} {disabled ? '(已选为主播出日)' : ''}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500 mt-1">
                        适用于一周两更的动漫，将在卡片上显示两个播出日期
                      </p>
                    </div>
                  )}

                  {/* 总集数输入 - 显示条件优化 */}
                  {selectedResult.media_type === "tv" && (
                    <div>
                      <Label htmlFor="totalEpisodes" className="flex items-center">
                        总集数
                        {tmdbSeasons.length > 0 && (
                          <div className="ml-2 flex items-center text-xs text-blue-600 dark:text-blue-400">
                            <Info className="h-3 w-3 mr-1" />
                            已从TMDB自动获取
                          </div>
                        )}
                      </Label>
                      <Input
                        id="totalEpisodes"
                        type="number"
                        min="1"
                        value={formData.totalEpisodes}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, totalEpisodes: Number.parseInt(e.target.value) || 1 }))
                        }
                        className={tmdbSeasons.length > 0 ? "border-blue-300 dark:border-blue-700" : ""}
                      />
                      {tmdbSeasons.length > 0 ? (
                        <p className="text-xs text-gray-500 mt-1">
                          已自动获取总集数，您也可以手动修改
                        </p>
                      ) : (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                          <Info className="h-3 w-3 inline mr-1" />
                          未能从TMDB获取集数，请手动设置
                        </p>
                      )}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="platformUrl">播出平台地址</Label>
                    <Input
                      id="platformUrl"
                      value={formData.platformUrl}
                      onChange={(e) => setFormData((prev) => ({ ...prev, platformUrl: e.target.value }))}
                      placeholder="https://..."
                    />
                    <p className="text-xs text-gray-500 mt-1">手动输入的地址将优先使用，留空则使用TMDB自动获取的地址</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={loading || !selectedResult}>
              {loading ? "添加中..." : "添加"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
