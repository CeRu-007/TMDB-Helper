import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * 修复 TMDB-Import 中文字符解析错误
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('[API] 收到修复 TMDB-Import 错误请求');
  
  try {
    const { action, fixType } = await request.json();
    
    if (action !== 'apply_fix' || fixType !== 'chinese_character_parsing') {
      return NextResponse.json({ 
        success: false, 
        error: '无效的修复参数' 
      }, { status: 400 });
    }
    
    // 查找 TMDB-Import 目录
    const tmdbImportDir = path.resolve(process.cwd(), 'TMDB-Import-master');
    const episodeFilePath = path.join(tmdbImportDir, 'tmdb-import', 'importors', 'episode.py');
    
    if (!fs.existsSync(episodeFilePath)) {
      return NextResponse.json({ 
        success: false, 
        error: '找不到 episode.py 文件，请确保 TMDB-Import-master 目录存在' 
      }, { status: 404 });
    }
    
    // 读取原文件
    const originalContent = fs.readFileSync(episodeFilePath, 'utf-8');
    
    // 创建备份
    const backupPath = episodeFilePath + '.backup.' + Date.now();
    fs.writeFileSync(backupPath, originalContent);
    console.log(`[API] 已创建备份文件: ${backupPath}`);
    
    // 修复代码
    const fixedContent = applyChineseCharacterFix(originalContent);
    
    // 写入修复后的文件
    fs.writeFileSync(episodeFilePath, fixedContent, 'utf-8');
    
    console.log('[API] TMDB-Import 中文字符解析错误修复完成');
    
    return NextResponse.json({
      success: true,
      message: '修复成功，已应用中文字符解析错误修复补丁',
      backupPath: backupPath
    });
    
  } catch (error: any) {
    console.error('[API] 修复 TMDB-Import 错误失败:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || '修复失败' 
    }, { status: 500 });
  }
}

/**
 * 应用中文字符解析修复
 */
function applyChineseCharacterFix(content: string): string {
  // 添加导入语句
  const imports = `import re
import logging
`;
  
  // 安全转换函数
  const safeConversionFunction = `
def safe_int_conversion(value, default=0):
    """安全的整数转换函数，处理中文字符和异常情况"""
    if not value:
        return default
    
    # 如果已经是整数，直接返回
    if isinstance(value, int):
        return value
    
    # 转换为字符串并清理
    str_value = str(value).strip()
    
    # 如果是空字符串，返回默认值
    if not str_value:
        return default
    
    # 尝试直接转换
    try:
        return int(str_value)
    except ValueError:
        pass
    
    # 提取数字部分
    numbers = re.findall(r'\\\\d+', str_value)
    if numbers:
        try:
            return int(numbers[0])
        except ValueError:
            pass
    
    # 如果包含中文字符，可能是描述文本，返回默认值
    if re.search(r'[\\\\u4e00-\\\\u9fff]', str_value):
        logging.warning(f"检测到中文字符，可能是描述文本而非集数: {str_value[:50]}...")
        return default
    
    # 最后尝试：移除所有非数字字符
    clean_value = re.sub(r'[^\\\\d]', '', str_value)
    if clean_value:
        try:
            return int(clean_value)
        except ValueError:
            pass
    
    logging.warning(f"无法转换为整数: {str_value[:50]}...")
    return default

def extract_episode_number_from_text(text):
    """从文本中提取集数编号"""
    if not text:
        return None
    
    # 常见的集数模式
    patterns = [
        r'第(\\\\d+)集',           # 第X集
        r'第(\\\\d+)话',           # 第X话
        r'EP(\\\\d+)',            # EPX
        r'Episode\\\\s*(\\\\d+)',    # Episode X
        r'^(\\\\d+)$',            # 纯数字
        r'E(\\\\d+)',             # EX
    ]
    
    for pattern in patterns:
        match = re.search(pattern, str(text), re.IGNORECASE)
        if match:
            try:
                return int(match.group(1))
            except (ValueError, IndexError):
                continue
    
    return None
`;
  
  let fixedContent = content;
  
  // 1. 添加导入语句（如果不存在）
  if (!content.includes('import re')) {
    fixedContent = imports + fixedContent;
  }
  
  // 2. 添加安全转换函数
  const functionInsertPoint = fixedContent.indexOf('def import_spisode(');
  if (functionInsertPoint !== -1) {
    fixedContent = fixedContent.slice(0, functionInsertPoint) + 
                   safeConversionFunction + 
                   fixedContent.slice(functionInsertPoint);
  }
  
  // 3. 替换问题代码行
  // 查找并替换 int(episoideID) != int(episoideNumber) 的比较
  const problemPattern = /if\s*\(\s*int\s*\(\s*episoideID\s*\)\s*!=\s*int\s*\(\s*episoideNumber\s*\)\s*\)\s*:/g;
  const fixedComparison = `        # 使用安全转换函数修复中文字符解析错误
        id_num = safe_int_conversion(episoideID)
        number_num = safe_int_conversion(episoideNumber)
        
        # 如果转换失败，尝试从文本提取集数
        if id_num == 0:
            extracted = extract_episode_number_from_text(episoideID)
            if extracted:
                id_num = extracted
        
        if number_num == 0:
            extracted = extract_episode_number_from_text(episoideNumber)
            if extracted:
                number_num = extracted
        
        if (id_num != number_num):`;
  
  fixedContent = fixedContent.replace(problemPattern, fixedComparison);
  
  // 4. 添加错误处理包装
  const tryWrapPattern = /(\s+)(if\s*\(\s*int\s*\(\s*episoideID\s*\)\s*!=\s*int\s*\(\s*episoideNumber\s*\)\s*\)\s*:)/g;
  fixedContent = fixedContent.replace(tryWrapPattern, (match, indent, code) => {
    return `${indent}try:
${indent}    ${fixedComparison}
${indent}except Exception as e:
${indent}    logging.error(f"集数比较时发生错误: {e}")
${indent}    continue  # 跳过有问题的集数`;
  });
  
  // 5. 如果上述替换没有成功，尝试更宽泛的模式
  if (fixedContent.includes('int(episoideID)') && fixedContent.includes('int(episoideNumber)')) {
    // 直接替换所有的 int(episoideID) 和 int(episoideNumber)
    fixedContent = fixedContent.replace(/int\(episoideID\)/g, 'safe_int_conversion(episoideID)');
    fixedContent = fixedContent.replace(/int\(episoideNumber\)/g, 'safe_int_conversion(episoideNumber)');
  }
  
  return fixedContent;
}

/**
 * GET 处理程序 - 获取修复状态
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const tmdbImportDir = path.resolve(process.cwd(), 'TMDB-Import-master');
    const episodeFilePath = path.join(tmdbImportDir, 'tmdb-import', 'importors', 'episode.py');
    
    if (!fs.existsSync(episodeFilePath)) {
      return NextResponse.json({ 
        exists: false,
        fixed: false,
        message: '找不到 episode.py 文件'
      });
    }
    
    const content = fs.readFileSync(episodeFilePath, 'utf-8');
    const isFixed = content.includes('safe_int_conversion') && content.includes('extract_episode_number_from_text');
    
    return NextResponse.json({
      exists: true,
      fixed: isFixed,
      message: isFixed ? '已应用修复补丁' : '尚未修复'
    });
    
  } catch (error: any) {
    console.error('[API] 检查修复状态失败:', error);
    return NextResponse.json({ 
      exists: false,
      fixed: false,
      error: error.message 
    }, { status: 500 });
  }
}