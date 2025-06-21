"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"
import {
  Terminal,
  Play,
  Copy,
  CheckCircle2,
  XCircle,
  FileText,
  Save,
  Download,
  Loader2,
  Settings,
  RefreshCw,
  Info,
  Zap,
  Square,
  Send,
  Bug,
  Wrench,
  Table,
  FileCode,
  Search,
  Filter,
  ExternalLink,
  X,
} from "lucide-react"
import { StorageManager, TMDBItem } from "@/lib/storage"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import TMDBImportIntegrationDialog from "./tmdb-import-integration-dialog"

interface GlobalTMDBImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function GlobalTMDBImportDialog({ open, onOpenChange }: GlobalTMDBImportDialogProps) {
  const [items, setItems] = useState<TMDBItem[]>([])
  const [filteredItems, setFilteredItems] = useState<TMDBItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [selectedItem, setSelectedItem] = useState<TMDBItem | null>(null)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [tmdbImportPath, setTmdbImportPath] = useState<string | null>(null)

  // 加载项目列表
  useEffect(() => {
    if (open) {
      loadItems()
      // 获取TMDB-Import路径
      const savedPath = localStorage.getItem("tmdb_import_path")
      setTmdbImportPath(savedPath)
    }
  }, [open])

  // 过滤项目
  useEffect(() => {
    filterItems()
  }, [items, searchTerm, categoryFilter])

  // 加载项目
  const loadItems = async () => {
    setLoading(true)
    try {
      const allItems = await StorageManager.getItemsWithRetry()
      setItems(allItems)
    } catch (error) {
      console.error("加载数据失败:", error)
      toast({
        title: "加载失败",
        description: "无法加载项目数据",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // 过滤项目
  const filterItems = () => {
    let filtered = [...items]
    
    // 按分类过滤
    if (categoryFilter !== "all") {
      filtered = filtered.filter(item => item.category === categoryFilter || 
        (!item.category && item.mediaType === categoryFilter))
    }
    
    // 按搜索词过滤
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(term) || 
        (item.tmdbId?.toString() || "").includes(term)
      )
    }
    
    setFilteredItems(filtered)
  }

  // 打开TMDB-Import对话框
  const handleOpenImport = (item: TMDBItem) => {
    setSelectedItem(item)
    setShowImportDialog(true)
  }

  // 更新项目
  const handleItemUpdate = (updatedItem: TMDBItem) => {
    setItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item))
  }

  // 渲染项目列表
  const renderItemList = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
          <p className="text-gray-500">正在加载项目...</p>
        </div>
      )
    }

    if (filteredItems.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">没有找到匹配的项目</h3>
          <p className="text-gray-500 max-w-md">
            {searchTerm ? "尝试使用不同的搜索词或清除过滤器" : "添加一些项目以开始使用TMDB-Import"}
          </p>
        </div>
      )
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <div className="flex">
              {/* 海报缩略图 */}
              <div className="w-24 h-36 flex-shrink-0">
                <img
                  src={item.posterUrl || "/placeholder.svg"}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              </div>
              
              {/* 内容区域 */}
              <div className="flex-1 p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-base line-clamp-1">{item.title}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {item.mediaType === "tv" ? "剧集" : "电影"}
                      </Badge>
                      {item.category && (
                        <Badge variant="secondary" className="text-xs">
                          {item.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenImport(item)}
                    className="h-8"
                  >
                    <Terminal className="h-4 w-4 mr-1" />
                    <span className="text-xs">导入</span>
                  </Button>
                </div>
                
                <div className="mt-2 text-xs text-gray-500">
                  <div className="flex items-center">
                    <span className="mr-1">TMDB ID:</span>
                    <span>{item.tmdbId || "未设置"}</span>
                  </div>
                  {item.platformUrl && (
                    <div className="flex items-center mt-1">
                      <span className="mr-1">播出平台:</span>
                      <span className="truncate max-w-[200px]">{new URL(item.platformUrl).hostname}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => handleOpenImport(item)}
                    className="h-8 bg-blue-600 hover:bg-blue-700"
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    <span className="text-xs">TMDB-Import</span>
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Terminal className="h-5 w-5" />
              <span>TMDB-Import 全局管理</span>
            </DialogTitle>
          </DialogHeader>
          
          {/* 工具路径状态 */}
          <div className="mb-6">
            <Card className={`${!tmdbImportPath ? "border-red-300 dark:border-red-700" : ""}`}>
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <div className="flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    TMDB-Import 工具配置
                  </div>
                  {tmdbImportPath ? (
                    <Badge variant="outline" className="ml-2">已配置</Badge>
                  ) : (
                    <Badge variant="destructive" className="ml-2">未配置</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <div className="text-sm">
                  {tmdbImportPath ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mr-2" />
                        <span className="text-gray-700 dark:text-gray-300">工具路径: </span>
                        <span className="ml-1 font-mono text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                          {tmdbImportPath}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          localStorage.removeItem("tmdb_import_path")
                          setTmdbImportPath(null)
                          toast({
                            title: "已清除",
                            description: "TMDB-Import工具路径已清除",
                          })
                        }}
                      >
                        <X className="h-4 w-4 mr-1" />
                        清除
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <XCircle className="h-4 w-4 text-red-600 mr-2" />
                      <span className="text-red-600 dark:text-red-400">
                        未配置TMDB-Import工具路径，请在设置中配置
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* 搜索和过滤 */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="搜索词条..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="w-full md:w-64">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 mr-2" />
                    <span>
                      {categoryFilter === "all" ? "全部分类" : 
                       categoryFilter === "tv" ? "电视剧" : 
                       categoryFilter === "movie" ? "电影" : 
                       categoryFilter}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分类</SelectItem>
                  <SelectItem value="tv">电视剧</SelectItem>
                  <SelectItem value="movie">电影</SelectItem>
                  <SelectItem value="anime">动漫</SelectItem>
                  <SelectItem value="variety">综艺</SelectItem>
                  <SelectItem value="kids">少儿</SelectItem>
                  <SelectItem value="short">短剧</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* 项目列表 */}
          <ScrollArea className="h-[60vh]">
            {renderItemList()}
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* TMDB-Import集成对话框 */}
      {selectedItem && showImportDialog && (
        <TMDBImportIntegrationDialog
          item={selectedItem}
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          onItemUpdate={handleItemUpdate}
        />
      )}
    </>
  )
} 