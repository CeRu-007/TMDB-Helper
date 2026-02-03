"use client"

import React, { useState, useCallback, useRef } from "react"
import { logger } from '@/lib/utils/logger'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Button } from '@/shared/components/ui/button'
import { Progress } from '@/shared/components/ui/progress'
import { Badge } from '@/shared/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Upload, Monitor, Search, Star, ExternalLink, Loader2, Image as ImageIcon, AlertCircle, ChevronLeft, ChevronRight, Settings } from 'lucide-react'
import { Switch } from '@/shared/components/ui/switch'
import { toast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'
import { DELAY_1S, INTERVAL_5S, FILE_SIZE_10MB } from '@/lib/constants/constants'

interface AnalysisProgress {
  similarSearch?: number
  featureExtraction: number
  databaseMatching: number
  tmdbSearch: number
  imdbSearch: number
}

interface MovieResult {
  id: string
  title: string
  originalTitle?: string
  poster: string
  rating: number
  matchScore: number
  year: number
  overview: string
  source: 'tmdb' | 'imdb'
}

interface AnalysisResult {
  description: string
  confidence: number
  keywords: string[]
  movies: MovieResult[]
}

export function ImageRecognition() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [advancedSearchMode, setAdvancedSearchMode] = useState(false)
  const [similarImages, setSimilarImages] = useState<any[]>([])
  const [progress, setProgress] = useState<AnalysisProgress>({
    featureExtraction: 0,
    databaseMatching: 0,
    tmdbSearch: 0,
    imdbSearch: 0
  })
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [selectedDatabase, setSelectedDatabase] = useState<'tmdb' | 'imdb'>('tmdb')
  const [sortBy, setSortBy] = useState<'match' | 'rating'>('match')
  const [lastAnalysisTime, setLastAnalysisTime] = useState<number>(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(7)

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({
        title: "文件类型错误",
        description: "请上传图片文件（JPG、PNG、WebP等）",
        variant: "destructive"
      })
      return
    }

    if (file.size > FILE_SIZE_10MB) {
      toast({
        title: "文件过大",
        description: "图片文件大小不能超过10MB",
        variant: "destructive"
      })
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string)
      setAnalysisResult(null)
    }
    reader.readAsDataURL(file)
  }, [])

  const startAnalysis = useCallback(async () => {
    if (!uploadedImage) {
      toast({
        title: "请先上传图片",
        description: "需要上传图片才能开始分析",
        variant: "destructive"
      })
      return
    }

    // 防抖机制：检查距离上次分析是否超过5秒
    const now = Date.now()
    const timeSinceLastAnalysis = now - lastAnalysisTime
    const minInterval = INTERVAL_5S // 5秒间隔

    if (timeSinceLastAnalysis < minInterval) {
      const remainingTime = Math.ceil((minInterval - timeSinceLastAnalysis) / 1000)
      toast({
        title: "请求过于频繁",
        description: `为避免API限制，请等待 ${remainingTime} 秒后再试`,
        variant: "destructive"
      })
      return
    }

    // 如果正在分析中，阻止重复请求
    if (isAnalyzing) {
      toast({
        title: "分析进行中",
        description: "请等待当前分析完成",
        variant: "destructive"
      })
      return
    }

    setLastAnalysisTime(now)
    setIsAnalyzing(true)
    setSimilarImages([])
    setProgress({
      featureExtraction: 0,
      databaseMatching: 0,
      tmdbSearch: 0,
      imdbSearch: 0,
      ...(advancedSearchMode && { similarSearch: 0 })
    })

    try {
      if (advancedSearchMode) {
        setProgress(prev => ({ ...prev, similarSearch: 20 }))

        // 添加请求间隔，避免API调用过于频繁
        await new Promise(resolve => setTimeout(resolve, DELAY_1S))

        const similarSearchResponse = await fetch('/api/media/image-recognition/similar-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            image: uploadedImage
          })
        })

        if (!similarSearchResponse.ok) {
          throw new Error('相似图片搜索失败')
        }

        const similarSearchData = await similarSearchResponse.json()
        setSimilarImages(similarSearchData.results || [])
        setProgress(prev => ({ ...prev, similarSearch: 100 }))

        toast({
          title: "相似图片搜索完成",
          description: `找到 ${similarSearchData.results?.length || 0} 张相似图片`
        })

        // 添加请求间隔，避免API调用过于频繁
        await new Promise(resolve => setTimeout(resolve, DELAY_1S))
      }

      setProgress(prev => ({ ...prev, featureExtraction: 20 }))

      // 添加请求间隔，避免API调用过于频繁
      await new Promise(resolve => setTimeout(resolve, DELAY_1S))

      const analysisResponse = await fetch('/api/media/image-recognition/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image: uploadedImage,
          similarImages: advancedSearchMode ? similarImages : undefined
        })
      })

      if (analysisResponse.status === 429) {
        throw new Error('API请求过于频繁，请稍后再试。建议等待几分钟后重新尝试。')
      }

      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json().catch(() => ({}))
        throw new Error(errorData.error || `分析请求失败 (状态码: ${analysisResponse.status})`)
      }

      const analysisData = await analysisResponse.json()
      
      // 检查分析是否成功
      if (!analysisData.success || !analysisData.data) {
        throw new Error(analysisData.error || '图像分析失败，无法获取分析结果')
      }
      
      setProgress(prev => ({ ...prev, featureExtraction: 100 }))

      setProgress(prev => ({ ...prev, databaseMatching: 20 }))

      // 添加请求间隔，避免API调用过于频繁
      await new Promise(resolve => setTimeout(resolve, DELAY_1S))

      const searchResponse = await fetch('/api/media/image-recognition/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: analysisData.data.description,
          keywords: analysisData.data.keywords
        })
      })

      if (searchResponse.status === 429) {
          throw new Error('搜索请求过于频繁，请稍后再试。建议等待几分钟后重新尝试。')
        }

        if (!searchResponse.ok) {
          const errorData = await searchResponse.json().catch(() => ({}))
          throw new Error(errorData.error || `搜索请求失败 (状态码: ${searchResponse.status})`)
        }

      const searchData = await searchResponse.json()
      setProgress(prev => ({ 
        ...prev, 
        databaseMatching: 100,
        tmdbSearch: 100,
        imdbSearch: 100
      }))

      // 检查搜索是否成功
      if (!searchData.success || !searchData.data) {
        throw new Error(searchData.error || '搜索失败，无法获取匹配结果')
      }

      setAnalysisResult({
        description: analysisData.data.description,
        confidence: analysisData.data.confidence,
        keywords: analysisData.data.keywords,
        movies: searchData.data.movies || []
      })

      toast({
        title: "分析完成",
        description: `找到 ${(searchData.data.movies || []).length} 个匹配结果`
      })

    } catch (error) {
      logger.error('分析过程出错:', error)
      
      let errorMessage = '分析过程中出现错误'
      if (error instanceof Error) {
        errorMessage = error.message
      }
      
      toast({
        title: "分析失败",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsAnalyzing(false)
    }
  }, [uploadedImage, advancedSearchMode, similarImages, lastAnalysisTime, isAnalyzing])

  const handleMovieClick = useCallback((movie: MovieResult) => {
    if (movie.source === 'tmdb') {
      const idParts = movie.id.split('-')
      if (idParts.length >= 2) {
        const mediaType = idParts[0]
        const tmdbId = idParts.slice(1).join('-')
        window.open(`https://www.themoviedb.org/${mediaType}/${tmdbId}`, '_blank')
      } else {
        window.open(`https://www.themoviedb.org/movie/${movie.id}`, '_blank')
      }
    } else if (movie.source === 'imdb') {
      window.open(`https://www.imdb.com/title/${movie.id}`, '_blank')
    }
  }, [])

  const sortedMovies = (analysisResult?.movies || []).sort((a, b) => {
    if (sortBy === 'match') {
      return b.matchScore - a.matchScore
    } else {
      return b.rating - a.rating
    }
  }).filter(movie => selectedDatabase === 'tmdb' ? movie.source === 'tmdb' : movie.source === 'imdb')

  const totalItems = sortedMovies.length
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentMovies = sortedMovies.slice(startIndex, endIndex)

  React.useEffect(() => {
    setCurrentPage(1)
  }, [analysisResult, selectedDatabase, sortBy])

  return (
    <div className="h-[calc(100vh-3rem)] flex flex-col p-6">
      <div className="flex-1 flex gap-6">
        {/* 左侧区域 - 占用3/5宽度，分为上下两部分 */}
        <div className="flex-1 flex flex-col gap-6" style={{ flex: '3' }}>
          {/* 左上：上传区域 */}
          <Card className="flex-shrink-0">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>上传</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors h-48 flex flex-col justify-center",
                  uploadedImage
                    ? "border-green-300 bg-green-50 dark:bg-green-900/20"
                    : "border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploadedImage ? (
                  <div className="space-y-2 flex flex-col items-center">
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden shadow-lg flex-shrink-0">
                      <img
                        src={uploadedImage}
                        alt="Uploaded"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="space-y-1 text-center">
                      <p className="text-sm font-medium text-green-700 dark:text-green-300">
                        图片已上传
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        点击重新选择图片
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="mx-auto w-16 h-16 text-gray-400">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                      </svg>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xl font-medium text-gray-700 dark:text-gray-300">
                        点击上传图片
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        支持海报、剧照、影视截图等类型
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              <Button
                onClick={startAnalysis}
                disabled={!uploadedImage || isAnalyzing}
                className="w-full h-12 text-lg"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5 mr-2" />
                    开始识别
                  </>
                )}
              </Button>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      高级搜索模式
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      先搜索相似图片，提高识别准确度
                    </p>
                  </div>
                </div>
                <Switch
                  checked={advancedSearchMode}
                  onCheckedChange={setAdvancedSearchMode}
                />
              </div>
            </CardContent>
          </Card>

          {/* 左下：图像特征提取区域 */}
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-3 flex-shrink-0">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ImageIcon className="h-5 w-5" />
                  <span>图像特征提取</span>
                </div>
                {isAnalyzing && (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    <span className="text-sm text-blue-600 dark:text-blue-400">分析中...</span>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pb-4 overflow-hidden">
              <div className="h-full overflow-y-auto scrollbar-hide">
                {/* 进度条网格 - 优化布局 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {advancedSearchMode && progress.similarSearch !== undefined && (
                    <div className="space-y-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-purple-700 dark:text-purple-300">相似图片搜索</span>
                        <span className="text-sm text-purple-600 dark:text-purple-400 font-mono">{progress.similarSearch}%</span>
                      </div>
                      <Progress value={progress.similarSearch} className="h-2 bg-purple-100 dark:bg-purple-900" />
                      <div className="text-xs text-purple-600 dark:text-purple-400">
                        搜索相似图片...
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-blue-700 dark:text-blue-300">特征提取</span>
                      <span className="text-sm text-blue-600 dark:text-blue-400 font-mono">{progress.featureExtraction}%</span>
                    </div>
                    <Progress value={progress.featureExtraction} className="h-2 bg-blue-100 dark:bg-blue-900" />
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      分析图像特征和内容...
                    </div>
                  </div>
                  
                  <div className="space-y-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-green-700 dark:text-green-300">数据库匹配</span>
                      <span className="text-sm text-green-600 dark:text-green-400 font-mono">{progress.databaseMatching}%</span>
                    </div>
                    <Progress value={progress.databaseMatching} className="h-2 bg-green-100 dark:bg-green-900" />
                    <div className="text-xs text-green-600 dark:text-green-400">
                      匹配本地数据库...
                    </div>
                  </div>
                  
                  <div className="space-y-3 p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-orange-700 dark:text-orange-300">TMDB搜索</span>
                      <span className="text-sm text-orange-600 dark:text-orange-400 font-mono">{progress.tmdbSearch}%</span>
                    </div>
                    <Progress value={progress.tmdbSearch} className="h-2 bg-orange-100 dark:bg-orange-900" />
                    <div className="text-xs text-orange-600 dark:text-orange-400">
                      搜索TMDB数据库...
                    </div>
                  </div>
                  
                  <div className="space-y-3 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">IMDB搜索</span>
                      <span className="text-sm text-yellow-600 dark:text-yellow-400 font-mono">{progress.imdbSearch}%</span>
                    </div>
                    <Progress value={progress.imdbSearch} className="h-2 bg-yellow-100 dark:bg-yellow-900" />
                    <div className="text-xs text-yellow-600 dark:text-yellow-400">
                      搜索IMDB数据库...
                    </div>
                  </div>
                </div>

                {/* 相似图片展示区域 */}
                {advancedSearchMode && similarImages.length > 0 && (
                  <div className="space-y-4 p-4 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/50 dark:to-slate-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                        <ImageIcon className="h-4 w-4" />
                        <span>相似图片</span>
                        <Badge variant="secondary" className="text-xs">
                          {similarImages.length}
                        </Badge>
                      </h4>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-xs"
                        onClick={() => {
                          // 查看全部相似图片的逻辑
                        }}
                      >
                        查看全部
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                      {similarImages.slice(0, showAllSimilarImages ? similarImages.length : 8).map((image, index) => (
                        <div key={index} className="group relative">
                          <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-sm group-hover:shadow-md transition-shadow">
                            <img
                              src={image.url}
                              alt={`相似图片 ${index + 1}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement
                                target.src = '/placeholder.jpg'
                              }}
                            />
                          </div>
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg"></div>
                        </div>
                      ))}
                    </div>
                    
                    {similarImages.length > 8 && !showAllSimilarImages && (
                      <div className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAllSimilarImages(true)}
                          className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                        >
                          加载更多 ({similarImages.length - 8} 张)
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧：结果展示区域 - 占用2/5宽度 */}
        <div className="w-80 flex-shrink-0" style={{ flex: '2' }}>
          <Card className="h-full flex flex-col">
            <CardHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <Search className="h-5 w-5" />
                  <span>识别结果</span>
                </CardTitle>
                
                <div className="flex items-center space-x-2">
                  <Select value={selectedDatabase} onValueChange={(value: 'tmdb' | 'imdb') => setSelectedDatabase(value)}>
                    <SelectTrigger className="w-24 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tmdb">TMDB</SelectItem>
                      <SelectItem value="imdb">IMDB</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={sortBy} onValueChange={(value: 'match' | 'rating') => setSortBy(value)}>
                    <SelectTrigger className="w-24 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="match">匹配</SelectItem>
                      <SelectItem value="rating">评分</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 overflow-hidden p-0">
              <div 
                className="h-full overflow-y-auto"
                style={{ 
                  height: 'calc(100vh - 12rem)',
                  scrollbarWidth: 'none', 
                  msOverflowStyle: 'none',
                  WebkitOverflowScrolling: 'touch'
                }}
              >
                <style jsx>{`
                  div::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
                
              {!analysisResult ? (
                <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400 p-6">
                  <div className="text-center space-y-3">
                    <AlertCircle className="h-12 w-12 mx-auto opacity-50" />
                    <p className="text-base font-medium">暂无分析结果</p>
                    <p className="text-sm">请先上传图片并开始识别</p>
                  </div>
                </div>
              ) : (
                <div className="min-h-full">
                  {/* AI分析结果显示区域 */}
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-200 dark:border-blue-800 flex-shrink-0">
                    <div className="flex items-center space-x-2 mb-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                        AI分析结果
                      </h4>
                      <div className="ml-auto text-xs text-gray-500 dark:text-gray-400">
                        {Math.round(analysisResult.confidence * 100)}%
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="p-3 bg-white/60 dark:bg-gray-800/60 rounded-md backdrop-blur-sm">
                        <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                          {analysisResult.description}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 font-medium">关键词</p>
                        <div className="flex flex-wrap gap-1">
                          {analysisResult.keywords.slice(0, 6).map((keyword, index) => (
                            <Badge 
                              key={index} 
                              variant="secondary" 
                              className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700"
                            >
                              {keyword}
                            </Badge>
                          ))}
                          {analysisResult.keywords.length > 6 && (
                            <Badge 
                              variant="secondary" 
                              className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                            >
                              +{analysisResult.keywords.length - 6}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 匹配结果 */}
                  <div className="p-4 flex-1">
                    {currentMovies.length === 0 ? (
                      <div className="flex items-center justify-center text-gray-500 dark:text-gray-400 py-8">
                        <div className="text-center space-y-3">
                          <Search className="h-8 w-8 mx-auto opacity-50" />
                          <p className="text-sm font-medium">未找到匹配结果</p>
                          <p className="text-xs">尝试使用不同的图片或调整搜索设置</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {currentMovies.map((movie, index) => (
                          <Card 
                            key={movie.id} 
                            className="cursor-pointer hover:shadow-md transition-shadow duration-200 border-l-4 border-l-blue-500"
                            onClick={() => handleMovieClick(movie)}
                          >
                            <CardContent className="p-3">
                              <div className="flex space-x-3">
                                <div className="flex-shrink-0">
                                  <img
                                    src={movie.poster}
                                    alt={movie.title}
                                    className="w-12 h-18 object-cover rounded"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement
                                      target.src = '/placeholder.jpg'
                                    }}
                                  />
                                </div>
                                
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between mb-1">
                                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                      {movie.title}
                                    </h4>
                                  </div>
                                  
                                  {movie.originalTitle && movie.originalTitle !== movie.title && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 truncate">
                                      {movie.originalTitle}
                                    </p>
                                  )}
                                  
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-gray-600 dark:text-gray-400">
                                      {movie.year}
                                    </span>
                                    <div className="flex items-center space-x-2">
                                      <div className="flex items-center space-x-1">
                                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                          {movie.rating.toFixed(1)}
                                        </span>
                                      </div>
                                      <Badge 
                                        variant="secondary" 
                                        className="text-xs px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                                      >
                                        {Math.round(movie.matchScore * 100)}%
                                      </Badge>
                                    </div>
                                  </div>
                                  
                                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                    {movie.overview}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* 分页控制 */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="h-7 px-2"
                        >
                          <ChevronLeft className="h-3 w-3" />
                        </Button>
                        
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {currentPage} / {totalPages}
                        </span>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="h-7 px-2"
                        >
                          <ChevronRight className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}