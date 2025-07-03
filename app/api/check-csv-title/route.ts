import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';

/**
 * POST /api/check-csv-title - 检查CSV文件中是否包含词条标题
 */
export async function POST(request: NextRequest) {
  try {
    const { csvPath, itemTitle } = await request.json();
    
    if (!csvPath || !itemTitle) {
      return NextResponse.json({
        success: false,
        error: '缺少必要参数',
        details: { csvPath, itemTitle }
      }, { status: 400 });
    }
    
    console.log(`[API] 检查CSV文件中的词条标题: "${itemTitle}"`);
    console.log(`[API] CSV文件路径: ${csvPath}`);
    
    // 检查CSV文件是否存在
    try {
      await fs.access(csvPath);
    } catch (error) {
      console.error(`[API] CSV文件不存在: ${csvPath}`);
      return NextResponse.json({
        success: false,
        error: 'CSV文件不存在',
        details: { csvPath }
      }, { status: 404 });
    }
    
    // 读取CSV文件内容
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');
    
    if (lines.length <= 1) {
      console.log(`[API] CSV文件为空或只有标题行`);
      return NextResponse.json({
        success: true,
        hasItemTitle: false,
        details: {
          totalLines: lines.length,
          message: 'CSV文件为空或只有标题行'
        }
      }, { status: 200 });
    }
    
    // 解析CSV头部，查找name列
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    console.log(`[API] CSV头部: [${headers.join(', ')}]`);
    
    // 查找name列索引
    const possibleNameColumns = ['name', 'title', '标题', '名称', '剧集名'];
    let nameColumnIndex = -1;
    let matchedColumnName = '';
    
    for (const possibleName of possibleNameColumns) {
      nameColumnIndex = headers.findIndex(h => 
        h.toLowerCase().includes(possibleName.toLowerCase())
      );
      if (nameColumnIndex !== -1) {
        matchedColumnName = headers[nameColumnIndex];
        break;
      }
    }
    
    if (nameColumnIndex === -1) {
      console.log(`[API] 未找到name列，无法检查词条标题`);
      return NextResponse.json({
        success: true,
        hasItemTitle: false,
        details: {
          headers,
          message: '未找到name列'
        }
      }, { status: 200 });
    }
    
    console.log(`[API] 找到name列 "${matchedColumnName}" 在索引: ${nameColumnIndex}`);
    
    // 检查数据行中是否包含词条标题
    const dataLines = lines.slice(1);
    const titleMatches = [];
    let hasItemTitle = false;
    
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      const columns = parseCSVLine(line);
      
      if (columns.length > nameColumnIndex) {
        const nameValue = columns[nameColumnIndex].trim();
        
        if (nameValue.includes(itemTitle)) {
          hasItemTitle = true;
          titleMatches.push({
            line: i + 2, // +2 because we start from line 1 and skip header
            nameValue: nameValue,
            fullMatch: nameValue === itemTitle,
            partialMatch: nameValue.includes(itemTitle)
          });
          
          console.log(`[API] 第${i + 2}行包含词条标题: "${nameValue}"`);
        }
      }
    }
    
    console.log(`[API] 检查完成: ${hasItemTitle ? '发现' : '未发现'}包含词条标题的行`);
    console.log(`[API] 匹配行数: ${titleMatches.length}`);
    
    return NextResponse.json({
      success: true,
      hasItemTitle: hasItemTitle,
      details: {
        csvPath,
        itemTitle,
        nameColumnIndex,
        nameColumnName: matchedColumnName,
        totalDataLines: dataLines.length,
        titleMatches: titleMatches,
        matchCount: titleMatches.length
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('[API] 检查CSV标题失败:', error);
    return NextResponse.json({
      success: false,
      error: '检查失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * 解析CSV行，处理引号和逗号
 */
function parseCSVLine(line: string): string[] {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}
