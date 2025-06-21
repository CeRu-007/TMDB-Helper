import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

/**
 * 针对CSV文件的基本验证
 * @param content 文件内容
 * @param filePath 文件路径
 * @returns 是否通过验证
 */
function validateCsvContent(content: string, filePath: string): {valid: boolean, message?: string} {
  // 如果不是CSV文件，跳过验证
  if (!filePath.toLowerCase().endsWith('.csv')) {
    return { valid: true };
  }
  
  try {
    // 基本验证: 确保有内容
    if (!content || !content.trim()) {
      return { valid: false, message: "CSV内容为空" };
    }
    
    // 按行分割
    const lines = content.trim().split('\n');
    if (lines.length < 2) {
      return { valid: false, message: "CSV文件至少应包含表头和一行数据" };
    }
    
    // 验证表头是否包含逗号
    if (!lines[0].includes(',')) {
      return { valid: false, message: "CSV表头格式无效，应包含逗号分隔符" };
    }
    
    // 验证所有行是否有相同的字段数
    const headerCount = (lines[0].match(/,/g) || []).length + 1;
    
    // 简单检查各行的字段数是否一致
    for (let i = 1; i < lines.length; i++) {
      const fieldCount = (lines[i].match(/,/g) || []).length + 1;
      
      // 如果字段数与表头不一致，写入前自动修复
      if (fieldCount < headerCount) {
        // 添加缺失的字段
        const missingCommas = headerCount - fieldCount;
        lines[i] += ','.repeat(missingCommas);
      } else if (fieldCount > headerCount) {
        // 截断多余字段
        const fields = lines[i].split(',');
        lines[i] = fields.slice(0, headerCount).join(',');
      }
    }
    
    // 返回修复后的内容
    return {
      valid: true,
      message: lines.join('\n')
    };
  } catch (error) {
    console.error("CSV验证失败:", error);
    return { valid: true }; // 发生错误时不阻止保存，但记录错误
  }
}

export async function POST(request: Request) {
  try {
    const { filePath, content } = await request.json()
    
    if (!filePath || content === undefined) {
      return NextResponse.json(
        { error: "缺少必要参数" },
        { status: 400 }
      )
    }
    
    // CSV文件特殊处理：验证和修复
    let finalContent = content;
    if (filePath.toLowerCase().endsWith('.csv')) {
      const validation = validateCsvContent(content, filePath);
      if (!validation.valid) {
        return NextResponse.json(
          { error: `CSV格式验证失败: ${validation.message}` },
          { status: 400 }
        )
      }
      
      // 如果验证通过并且有修复后的内容，使用修复后的内容
      if (validation.message && validation.message !== content) {
        finalContent = validation.message;
        console.log("已自动修复CSV内容格式");
      }
    }
    
    // 确保目录存在
    const directory = path.dirname(filePath)
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true })
    }
    
    // 写入文件
    fs.writeFileSync(filePath, finalContent, 'utf8')
    
    return NextResponse.json({ 
      success: true,
      message: finalContent !== content ? "已自动修复CSV格式并保存" : undefined
    })
  } catch (error) {
    console.error('写入文件失败:', error)
    return NextResponse.json(
      { 
        error: "写入文件失败", 
        details: error instanceof Error ? error.message : "未知错误" 
      },
      { status: 500 }
    )
  }
} 