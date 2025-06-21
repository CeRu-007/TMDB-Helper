const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const ffmpeg = require('fluent-ffmpeg');
const tesseract = require('node-tesseract-ocr');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// 创建上传目录
const uploadsDir = path.join(__dirname, '../uploads');
const thumbnailsDir = path.join(__dirname, '../thumbnails');
const tempDir = path.join(__dirname, '../temp');

[uploadsDir, thumbnailsDir, tempDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// 配置multer存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueId}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 1024 * 1024 * 500 }, // 500MB限制
  fileFilter: (req, file, cb) => {
    const filetypes = /mp4|avi|mkv|mov|wmv|flv|webm/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('仅支持视频文件!'));
    }
  }
});

// 存储任务状态
const tasks = new Map();

// 上传视频文件
app.post('/api/upload', upload.single('video'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: '未接收到文件' });
    }

    const taskId = path.parse(req.file.filename).name;
    const filePath = req.file.path;
    const originalName = req.file.originalname;
    
    // 获取视频信息
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error('获取视频信息失败:', err);
        return res.status(500).json({ success: false, error: '获取视频信息失败' });
      }
      
      const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
      if (!videoStream) {
        return res.status(400).json({ success: false, error: '未找到视频流' });
      }
      
      const duration = metadata.format.duration;
      const resolution = videoStream.width && videoStream.height 
        ? `${videoStream.width}x${videoStream.height}` 
        : '未知';
      
      // 创建任务
      tasks.set(taskId, {
        id: taskId,
        file: {
          path: filePath,
          name: originalName,
          size: req.file.size
        },
        status: 'pending',
        progress: 0,
        duration,
        resolution,
        thumbnails: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      res.json({
        success: true,
        taskId,
        file: {
          name: originalName,
          size: req.file.size,
          duration,
          resolution
        }
      });
    });
  } catch (error) {
    console.error('上传处理失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取任务状态
app.get('/api/task/:taskId', (req, res) => {
  const { taskId } = req.params;
  
  if (!tasks.has(taskId)) {
    return res.status(404).json({ success: false, error: '任务不存在' });
  }
  
  const task = tasks.get(taskId);
  res.json({ success: true, task });
});

// 开始处理视频
app.post('/api/process', express.json(), (req, res) => {
  const { taskId, settings } = req.body;
  
  if (!taskId || !tasks.has(taskId)) {
    return res.status(404).json({ success: false, error: '任务不存在' });
  }
  
  const task = tasks.get(taskId);
  if (task.status === 'processing') {
    return res.status(400).json({ success: false, error: '任务已在处理中' });
  }
  
  // 更新任务状态
  task.status = 'processing';
  task.progress = 0;
  task.settings = settings || {};
  task.updatedAt = new Date();
  tasks.set(taskId, task);
  
  // 异步处理视频
  processVideo(taskId, settings)
    .then(() => {
      console.log(`任务 ${taskId} 处理完成`);
    })
    .catch(err => {
      console.error(`任务 ${taskId} 处理失败:`, err);
      task.status = 'error';
      task.error = err.message;
      task.updatedAt = new Date();
      tasks.set(taskId, task);
    });
  
  res.json({ success: true, message: '处理已开始' });
});

// 获取缩略图
app.get('/api/thumbnails/:filename', (req, res) => {
  const { filename } = req.params;
  const filePath = path.join(thumbnailsDir, filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: '文件不存在' });
  }
  
  res.sendFile(filePath);
});

// 视频处理函数
async function processVideo(taskId, settings = {}) {
  const task = tasks.get(taskId);
  if (!task) return;
  
  const {
    thumbnailCount = 10,
    startTime = 0,
    outputFormat = 'jpg'
  } = settings;
  
  const videoPath = task.file.path;
  const duration = task.duration;
  
  // 计算时间间隔
  const interval = (duration - startTime) / (thumbnailCount + 1);
  const timestamps = [];
  
  for (let i = 1; i <= thumbnailCount; i++) {
    const timestamp = startTime + (interval * i);
    timestamps.push(timestamp);
  }
  
  // 清空之前的缩略图
  task.thumbnails = [];
  tasks.set(taskId, task);
  
  // 提取缩略图
  for (let i = 0; i < timestamps.length; i++) {
    const timestamp = timestamps[i];
    const thumbnailId = uuidv4();
    const outputPath = path.join(thumbnailsDir, `${thumbnailId}.${outputFormat}`);
    
    try {
      // 提取帧
      await extractFrame(videoPath, timestamp, outputPath);
      
      // 分析字幕
      const hasSubtitles = await detectSubtitles(outputPath);
      
      // 更新任务状态
      task.thumbnails.push({
        id: thumbnailId,
        url: `/api/thumbnails/${thumbnailId}.${outputFormat}`,
        timestamp,
        hasSubtitles
      });
      
      task.progress = Math.round(((i + 1) / timestamps.length) * 100);
      task.updatedAt = new Date();
      tasks.set(taskId, task);
    } catch (err) {
      console.error(`提取帧失败 (${timestamp}s):`, err);
    }
  }
  
  // 完成处理
  task.status = 'completed';
  task.progress = 100;
  task.updatedAt = new Date();
  tasks.set(taskId, task);
}

// 提取视频帧
function extractFrame(videoPath, timestamp, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timestamp],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: '?x720' // 高度限制为720px，保持宽高比
      })
      .on('end', () => resolve())
      .on('error', (err) => reject(err));
  });
}

// 检测字幕
async function detectSubtitles(imagePath) {
  try {
    // 使用Tesseract OCR检测图片中的文字
    const result = await tesseract.recognize(imagePath, {
      lang: 'chi_sim+eng',
      oem: 1,
      psm: 6,
    });
    
    // 如果检测到文字，判断是否可能是字幕
    if (result && result.trim().length > 0) {
      // 简单判断：如果文字行数少且位于图片底部，可能是字幕
      const lines = result.split('\n').filter(line => line.trim().length > 0);
      return lines.length <= 3; // 字幕通常不超过3行
    }
    
    return false;
  } catch (err) {
    console.error('字幕检测失败:', err);
    return false;
  }
}

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
}); 