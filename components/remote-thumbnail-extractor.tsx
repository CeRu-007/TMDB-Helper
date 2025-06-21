"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import {
  Upload,
  Play,
  Download,
  ImageIcon,
  RefreshCw,
  Trash2,
  FileVideo,
  Grid3X3,
  Clock,
  Settings,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  X,
  Info,
} from "lucide-react"
import { useMobile } from "@/hooks/use-mobile"
import { Checkbox } from "@/components/ui/checkbox"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { 
  uploadVideo, 
  processVideo, 
  getTaskStatus, 
  formatFileSize, 
  formatTime,
  type Task,
  type Thumbnail,
  type ExtractionSettings
} from "@/services/api"

// 本地任务状态接口
interface LocalTask {
  taskId: string;
  file: {
    name: string;
    size: number;
    duration: number;
    resolution: string;
  };
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  thumbnails: Thumbnail[];
  error?: string;
  selectedThumbnail?: number;
}

export default function RemoteThumbnailExtractor() {
  // 状态
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<ExtractionSettings>({
    thumbnailCount: 9,
    startTime: 0,
    outputFormat: "jpg"
  });
  const [showFullScreenImage, setShowFullScreenImage] = useState<{
    url: string;
    timestamp: number;
  } | null>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useMobile();

  // 处理文件选择
  const handleFileSelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // 处理文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 模拟上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 200);

      // 上传文件
      const { taskId, file } = await uploadVideo(files[0]);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // 添加任务到列表
      setTasks(prev => [
        ...prev,
        {
          taskId,
          file,
          status: 'pending',
          progress: 0,
          thumbnails: []
        }
      ]);

      // 自动开始处理
      await processVideo(taskId, settings);

      // 重置上传状态
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1000);

      // 清除文件输入
      if (event.target) {
        event.target.value = '';
      }
    } catch (error) {
      console.error('上传失败:', error);
      setIsUploading(false);
      setUploadProgress(0);
      
      // 显示错误提示
      alert(`上传失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 开始处理视频
  const handleProcessVideo = async (taskId: string) => {
    try {
      await processVideo(taskId, settings);
      
      // 更新任务状态
      setTasks(prev => 
        prev.map(task => 
          task.taskId === taskId 
            ? { ...task, status: 'processing', progress: 0 } 
            : task
        )
      );
    } catch (error) {
      console.error('处理失败:', error);
      alert(`处理失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 选择缩略图
  const selectThumbnail = (taskId: string, index: number) => {
    setTasks(prev => 
      prev.map(task => 
        task.taskId === taskId 
          ? { ...task, selectedThumbnail: index } 
          : task
      )
    );
  };

  // 下载缩略图
  const downloadThumbnail = async (task: LocalTask) => {
    if (!task.thumbnails.length) return;
    
    const selectedIndex = task.selectedThumbnail ?? 0;
    const thumbnail = task.thumbnails[selectedIndex];
    
    try {
      const response = await fetch(thumbnail.url);
      const blob = await response.blob();
      
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${task.file.name.split('.')[0]}_${formatTime(thumbnail.timestamp)}.${settings.outputFormat || 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      
      // 清理
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载缩略图失败');
    }
  };

  // 删除任务
  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(task => task.taskId !== taskId));
  };

  // 轮询任务状态
  useEffect(() => {
    const processingTasks = tasks.filter(task => 
      task.status === 'pending' || task.status === 'processing'
    );
    
    if (processingTasks.length === 0) return;
    
    const intervalId = setInterval(async () => {
      for (const task of processingTasks) {
        try {
          const updatedTask = await getTaskStatus(task.taskId);
          
          setTasks(prev => 
            prev.map(t => 
              t.taskId === task.taskId 
                ? {
                    ...t,
                    status: updatedTask.status,
                    progress: updatedTask.progress,
                    thumbnails: updatedTask.thumbnails,
                    error: updatedTask.error
                  } 
                : t
            )
          );
        } catch (error) {
          console.error('获取任务状态失败:', error);
        }
      }
    }, 2000);
    
    return () => clearInterval(intervalId);
  }, [tasks]);

  // 上传区域
  const renderUploadArea = () => (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-center">
          <FileVideo className="h-10 w-10 text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-medium mb-1">上传视频文件</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">支持 MP4、AVI、MKV 等格式</p>
          
      <input
        type="file"
        ref={fileInputRef}
            accept="video/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      
          <Button
            onClick={handleFileSelect}
            disabled={isUploading}
            className="mb-2"
          >
      {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                上传中...
              </>
      ) : (
              <>
              <Upload className="h-4 w-4 mr-2" />
                选择视频
              </>
            )}
            </Button>
          
          {isUploading && (
            <div className="w-full mt-4">
              <div className="flex justify-between text-xs mb-1">
                <span>上传进度</span>
                <span>{uploadProgress}%</span>
          </div>
              <Progress value={uploadProgress} className="h-2" />
        </div>
      )}
    </div>
      </CardContent>
    </Card>
  );

  // 设置区域
  const renderSettings = () => (
    <Card className={showSettings ? "" : "mb-6"}>
      <CardHeader className="pb-3 flex flex-row justify-between items-center cursor-pointer"
        onClick={() => setShowSettings(!showSettings)}
      >
          <CardTitle className="text-lg flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            提取设置
          </CardTitle>
        <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width="24" 
            height="24" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={`transition-transform ${showSettings ? "rotate-180" : ""}`}
          >
            <path d="m6 9 6 6 6-6"/>
          </svg>
          </Button>
      </CardHeader>
      
      {showSettings && (
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="thumbnailCount">缩略图数量</Label>
              <div className="flex items-center">
                <Slider
                  id="thumbnailCount"
                  min={3}
                  max={18}
                  step={3}
                  value={[settings.thumbnailCount || 9]}
                  onValueChange={(values) => setSettings({...settings, thumbnailCount: values[0]})}
                  className="flex-1 mr-4"
                />
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                  {settings.thumbnailCount}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">推荐选择能被3整除的值，以确保完美的3x3布局</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">开始时间(秒)</Label>
              <Input
                id="startTime"
                type="number"
                min={0}
                  value={settings.startTime}
                  onChange={(e) => setSettings({...settings, startTime: Number(e.target.value)})}
              />
            </div>
            
              <div>
                <Label htmlFor="format">输出格式</Label>
              <Select
                value={settings.outputFormat || "jpg"}
                  onValueChange={(value: "jpg" | "png") => setSettings({...settings, outputFormat: value})}
              >
                  <SelectTrigger id="format">
                  <SelectValue placeholder="选择格式" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="jpg">JPG (较小)</SelectItem>
                    <SelectItem value="png">PNG (高质量)</SelectItem>
                </SelectContent>
              </Select>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );

  // 渲染任务列表
  const renderTasks = () => (
    <div className="space-y-6">
      {tasks.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">暂无任务</p>
        </div>
      ) : (
        tasks.map((task) => (
          <Card key={task.taskId} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg truncate" title={task.file.name}>
                  {task.file.name}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteTask(task.taskId)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>{formatFileSize(task.file.size)}</span>
                <span>•</span>
                <span>{task.file.resolution}</span>
                <span>•</span>
                <span>{formatTime(task.file.duration)}</span>
              </div>
            </CardHeader>
            
            <CardContent>
              {/* 任务状态 */}
              {task.status === 'pending' && (
                <div className="mb-4">
                  <Button onClick={() => handleProcessVideo(task.taskId)}>
                    <Play className="h-4 w-4 mr-2" />
                    开始处理
                  </Button>
                </div>
              )}
              
              {task.status === 'processing' && (
                <div className="mb-4 space-y-2">
                  <div className="flex items-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2 text-blue-500" />
                    <span className="text-sm">处理中... {task.progress}%</span>
                  </div>
                  <Progress value={task.progress} className="h-2" />
                </div>
              )}
              
              {task.status === 'error' && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400 flex items-start">
                  <AlertTriangle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">处理失败</p>
                    <p className="text-sm">{task.error || '未知错误'}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2 border-red-200 dark:border-red-800"
                      onClick={() => handleProcessVideo(task.taskId)}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      重试
                    </Button>
                  </div>
                </div>
              )}
              
              {task.status === 'completed' && task.thumbnails.length > 0 && (
                <div className="mb-4 flex items-center text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  <span>处理完成，已生成 {task.thumbnails.length} 张缩略图</span>
                </div>
              )}
              
              {/* 缩略图网格 */}
              {task.thumbnails.length > 0 && (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center">
                      <h4 className="font-medium">候选帧预览</h4>
                      <Badge variant="outline" className="ml-2">
                        {task.thumbnails.length}
                      </Badge>
                    </div>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => downloadThumbnail(task)}
                        disabled={task.thumbnails.length === 0}
                      >
                        <Download className="h-4 w-4 mr-2" />
                      下载选中帧
                      </Button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                      {task.thumbnails.map((thumbnail, index) => (
                        <div 
                          key={thumbnail.id}
                          className={`relative aspect-video rounded-md overflow-hidden cursor-pointer border-2 transition-all ${
                            (task.selectedThumbnail === index || (task.selectedThumbnail === undefined && index === 0))
                            ? 'border-blue-500 shadow-md scale-105 z-10'
                              : 'border-transparent hover:border-gray-300 dark:hover:border-gray-700'
                          }`}
                          onClick={() => selectThumbnail(task.taskId, index)}
                        >
                          <img 
                            src={thumbnail.url} 
                            alt={`缩略图 ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          
                          {/* 时间戳 */}
                          <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                            {formatTime(thumbnail.timestamp)}
                          </div>
                          
                          {/* 字幕标记 */}
                          {thumbnail.hasSubtitles && (
                            <div className="absolute bottom-1 left-1 bg-yellow-500/90 text-white text-xs px-1.5 py-0.5 rounded flex items-center">
                              <Info className="h-3 w-3 mr-1" />
                              字幕
                            </div>
                          )}
                        
                        {/* 选中指示器 */}
                        {(task.selectedThumbnail === index || (task.selectedThumbnail === undefined && index === 0)) && (
                          <div className="absolute inset-0 flex items-center justify-center bg-blue-500/10">
                            <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs p-1 rounded-full">
                              <CheckCircle2 className="h-3 w-3" />
                            </div>
                          </div>
                        )}
                        </div>
                      ))}
                    </div>
                  
                  {/* 选中帧预览 */}
                  {task.thumbnails.length > 0 && (
                    <div className="mt-6 border rounded-md p-4 bg-gray-50 dark:bg-gray-900">
                      <div className="flex justify-between items-center mb-3">
                        <h5 className="font-medium">选中帧预览</h5>
                        <Badge variant="outline">
                          时间: {formatTime(task.thumbnails[task.selectedThumbnail || 0]?.timestamp || 0)}
                        </Badge>
                      </div>
                      
                      <div className="aspect-video overflow-hidden rounded-md border border-gray-200 dark:border-gray-800">
                        <img 
                          src={task.thumbnails[task.selectedThumbnail || 0]?.url} 
                          alt="选中的缩略图" 
                          className="w-full h-full object-contain bg-black"
                          onClick={() => setShowFullScreenImage({
                            url: task.thumbnails[task.selectedThumbnail || 0]?.url,
                            timestamp: task.thumbnails[task.selectedThumbnail || 0]?.timestamp
                          })}
                            />
                          </div>
                          
                      <div className="flex justify-end mt-3">
                          <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => downloadThumbnail(task)}
                          >
                          <Download className="h-4 w-4 mr-2" />
                          下载此帧
                          </Button>
                        </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">视频缩略图提取</h2>
      </div>
      
      {renderSettings()}
      {renderUploadArea()}
      {renderTasks()}
      
      {/* 全屏预览对话框 */}
      <Dialog open={!!showFullScreenImage} onOpenChange={(open) => !open && setShowFullScreenImage(null)}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>缩略图完整预览</span>
              <span className="text-sm font-normal text-gray-500">
                {showFullScreenImage && formatTime(showFullScreenImage.timestamp)}
              </span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="mt-2 rounded-md overflow-hidden">
            {showFullScreenImage && (
              <img 
                src={showFullScreenImage.url} 
                alt="缩略图预览" 
                className="w-full h-auto"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}