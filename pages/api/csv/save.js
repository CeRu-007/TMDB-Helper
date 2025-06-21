import fs from 'fs';
import path from 'path';
import { serializeCsvData } from '../../../lib/csv-processor-client';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    // 从请求中获取文件路径和数据
    const { filePath, data } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ success: false, error: '缺少文件路径参数' });
    }
    
    if (!data) {
      return res.status(400).json({ success: false, error: '缺少数据参数' });
    }
    
    // 确保目录存在
    const directory = path.dirname(filePath);
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }
    
    // 将数据序列化为CSV文本
    let content;
    if (typeof data === 'string') {
      content = data;
    } else {
      content = serializeCsvData(data);
    }
    
    // 写入文件
    fs.writeFileSync(filePath, content, 'utf-8');
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('保存CSV文件时出错:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
} 