import fs from 'fs';
import path from 'path';
import { parseCsvContent } from '../../../lib/csv-processor-client';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    // 从请求中获取工作目录
    const { workingDirectory } = req.body;
    
    if (!workingDirectory) {
      return res.status(400).json({ success: false, error: '缺少工作目录参数' });
    }
    
    const filePath = path.join(workingDirectory, 'import.csv');
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false, 
        error: `文件不存在: ${filePath}` 
      });
    }
    
    // 读取文件内容
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // 解析CSV内容
    const csvData = parseCsvContent(content);
    
    return res.status(200).json({ success: true, data: csvData });
  } catch (error) {
    console.error('读取CSV文件时出错:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
} 