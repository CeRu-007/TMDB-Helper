import fs from 'fs';
import path from 'path';
import { parseCsvContent } from '../../../lib/csv-processor-client';
import { validateCsvData } from '../../../lib/csv-validator';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    // 从请求中获取文件路径或数据
    const { filePath, data } = req.body;
    
    let csvData;
    let fileExists = false;
    
    if (filePath) {
      // 如果提供了文件路径，从文件中读取数据
      fileExists = fs.existsSync(filePath);
      
      if (!fileExists) {
        return res.status(404).json({ 
          success: false, 
          exists: false,
          error: `文件不存在: ${filePath}` 
        });
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      csvData = parseCsvContent(content);
    } else if (data) {
      // 如果直接提供了数据，使用提供的数据
      csvData = data;
    } else {
      return res.status(400).json({ 
        success: false, 
        error: '缺少文件路径或数据参数' 
      });
    }
    
    // 验证CSV数据
    const validation = validateCsvData(csvData);
    
    return res.status(200).json({ 
      success: true, 
      exists: fileExists,
      valid: validation.valid, 
      errors: validation.errors 
    });
  } catch (error) {
    console.error('验证CSV文件时出错:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : '未知错误'
    });
  }
} 