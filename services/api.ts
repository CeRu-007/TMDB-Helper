// 视频缩略图提取API服务

// 服务器地址配置
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// 接口类型定义
export interface VideoFile {
  name: string;
  size: number;
  duration: number;
  resolution: string;
}

export interface Thumbnail {
  id: string;
  url: string;
  timestamp: number;
  hasSubtitles: boolean;
}

export interface Task {
  id: string;
  file: VideoFile;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  thumbnails: Thumbnail[];
  createdAt: string;
  updatedAt: string;
  error?: string;
}

export interface ExtractionSettings {
  thumbnailCount?: number;
  startTime?: number;
  outputFormat?: 'jpg' | 'png';
}

// 上传视频文件
export async function uploadVideo(file: File): Promise<{ taskId: string; file: VideoFile }> {
  const formData = new FormData();
  formData.append('video', file);

  try {
    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '上传失败');
    }

    const data = await response.json();
    return {
      taskId: data.taskId,
      file: data.file,
    };
  } catch (error) {
    console.error('上传视频失败:', error);
    throw error;
  }
}

// 获取任务状态
export async function getTaskStatus(taskId: string): Promise<Task> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/task/${taskId}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '获取任务状态失败');
    }

    const data = await response.json();
    return data.task;
  } catch (error) {
    console.error('获取任务状态失败:', error);
    throw error;
  }
}

// 开始处理视频
export async function processVideo(taskId: string, settings: ExtractionSettings = {}): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ taskId, settings }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '处理请求失败');
    }
  } catch (error) {
    console.error('处理视频失败:', error);
    throw error;
  }
}

// 获取缩略图URL
export function getThumbnailUrl(filename: string): string {
  return `${API_BASE_URL}/api/thumbnails/${filename}`;
}

// 格式化文件大小
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化时间
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  const hDisplay = h > 0 ? String(h).padStart(2, '0') + ':' : '';
  const mDisplay = String(m).padStart(2, '0');
  const sDisplay = String(s).padStart(2, '0');
  
  return `${hDisplay}${mDisplay}:${sDisplay}`;
}