import { NextRequest, NextResponse } from 'next/server';
import { StorageManager, TMDBItem, Season, Episode } from '@/lib/storage';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

/**
 * 执行TMDB-Import命令
 */
async function executeTMDBImportCommand(command: string, workingDirectory: string): Promise<{stdout: string, stderr: string}> {
  try {
    // 确保工作目录存在
    if (!fs.existsSync(workingDirectory)) {
      throw new Error(`工作目录不存在: ${workingDirectory}`);
    }
    
    console.log(`[API] [执行命令] ${command} (在 ${workingDirectory})`);
    
    // 检查Python是否可用
    try {
      await execAsync('python --version');
    } catch (pythonError) {
      console.error('[API] Python不可用:', pythonError);
      throw new Error('Python不可用，请确保已安装Python并添加到PATH中');
    }
    
    // 检查TMDB-Import模块是否可用
    try {
      const moduleCheckResult = await execAsync('python -c "import sys; print(\'tmdb-import\' in sys.path)"', { cwd: workingDirectory });
      if (moduleCheckResult.stdout.trim() !== 'True') {
        console.warn('[API] 警告: tmdb-import模块可能不在Python路径中');
      }
    } catch (moduleError) {
      console.warn('[API] 检查tmdb-import模块时出错:', moduleError);
    }
    
    // 执行命令
    console.log(`[API] 开始执行命令: ${command}`);
    const { stdout, stderr } = await execAsync(command, { 
      cwd: workingDirectory,
      timeout: 60000 // 设置60秒超时
    });
    
    if (stderr) {
      console.warn(`[API] 命令执行产生stderr输出: ${stderr}`);
    }
    
    console.log(`[API] 命令执行完成，输出长度: ${stdout.length}字符`);
    return { stdout, stderr };
  } catch (error: any) {
    console.error('[API] 命令执行失败:', error);
    
    // 提供更详细的错误信息
    let errorMessage = error.message || '未知错误';
    if (error.code === 'ENOENT') {
      errorMessage = `找不到可执行文件: ${error.path}`;
    } else if (error.code === 'ETIMEDOUT') {
      errorMessage = '命令执行超时';
    }
    
    return { stdout: '', stderr: `${errorMessage}\n${error.stack || ''}` };
  }
}

/**
 * 从输出中解析CSV文件路径
 */
function parseCSVPathFromOutput(output: string): string | null {
  const regex = /Saved to (.+\.csv)/;
  const match = output.match(regex);
  return match ? match[1] : null;
}

/**
 * 读取CSV文件内容
 */
async function readCSVFile(filePath: string): Promise<string> {
  try {
    return await fs.promises.readFile(filePath, 'utf-8');
  } catch (error) {
    console.error('读取CSV文件失败:', error);
    throw new Error(`无法读取CSV文件: ${filePath}`);
  }
}

/**
 * 解析CSV内容
 */
function parseCSV(csvContent: string): { headers: string[], rows: string[][] } {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }
  
  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map(line => parseCSVLine(line));
  
  return { headers, rows };
}

/**
 * 解析CSV行
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"' && !inQuotes) {
      // 开始引号
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      // 结束引号或转义引号
      if (nextChar === '"') {
        // 转义引号
        currentField += '"';
        i++; // 跳过下一个引号
      } else {
        // 结束引号
        inQuotes = false;
      }
    } else if (char === ',' && !inQuotes) {
      // 字段分隔符
      result.push(currentField);
      currentField = '';
    } else {
      // 普通字符
      currentField += char;
    }
  }
  
  // 添加最后一个字段
  result.push(currentField);
  
  return result;
}

/**
 * 将CSV数据转换为字符串
 */
function csvDataToString(data: { headers: string[], rows: string[][] }): string {
  const headerLine = data.headers.map(formatCSVField).join(',');
  const rowLines = data.rows.map(row => row.map(formatCSVField).join(','));
  return [headerLine, ...rowLines].join('\n');
}

/**
 * 格式化CSV字段
 */
function formatCSVField(value: string): string {
  // 如果字段包含逗号、引号或换行符，需要用引号包裹
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    // 将字段中的引号替换为两个引号
    const escaped = value.replace(/"/g, '""');
    return `"${escaped}"`;
  }
  return value;
}

/**
 * 自动删除已标记完成的集数
 */
function autoRemoveMarkedEpisodes(csvData: { headers: string[], rows: string[][] }, item: TMDBItem): { headers: string[], rows: string[][] } {
  // 如果没有集数数据或CSV数据为空，直接返回
  if (!item.episodes || item.episodes.length === 0 || csvData.rows.length === 0) {
    return csvData;
  }
  
  // 查找集数列的索引
  const episodeColumnIndex = csvData.headers.findIndex(
    header => header.toLowerCase().includes('episode') || header.toLowerCase().includes('集')
  );
  
  if (episodeColumnIndex === -1) {
    console.warn('无法找到CSV中的集数列');
    return csvData;
  }
  
  // 创建已完成集数的映射，便于快速查找
  const completedEpisodesMap = new Map();
  
  // 处理多季情况
  if (item.seasons) {
    item.seasons.forEach((season: Season) => {
      season.episodes.forEach((episode: Episode) => {
        if (episode.completed) {
          // 标准化集数格式，以便匹配
          const normalizedNumber = normalizeEpisodeNumber(episode.number.toString());
          completedEpisodesMap.set(normalizedNumber, true);
        }
      });
    });
  } else if (item.episodes) {
    // 处理单季情况
    item.episodes.forEach((episode: Episode) => {
      if (episode.completed) {
        const normalizedNumber = normalizeEpisodeNumber(episode.number.toString());
        completedEpisodesMap.set(normalizedNumber, true);
      }
    });
  }
  
  // 过滤掉已完成的集数
  const filteredRows = csvData.rows.filter(row => {
    if (episodeColumnIndex >= row.length) {
      return true; // 如果行不完整，保留
    }
    
    const episodeValue = row[episodeColumnIndex];
    const normalizedEpisode = normalizeEpisodeNumber(episodeValue);
    
    // 如果在已完成集数映射中找到，则过滤掉
    return !completedEpisodesMap.has(normalizedEpisode);
  });
  
  return {
    headers: csvData.headers,
    rows: filteredRows
  };
}

/**
 * 标准化集数格式，以便匹配
 */
function normalizeEpisodeNumber(episodeNumber: string): string {
  // 移除所有空白字符
  let normalized = episodeNumber.replace(/\s+/g, '');
  
  // 处理常见的集数格式
  // 处理"第X集"格式
  normalized = normalized.replace(/^第(\d+)集$/, '$1');
  
  // 处理"EX"格式
  normalized = normalized.replace(/^[Ee](\d+)$/, '$1');
  
  // 处理"EPX"格式
  normalized = normalized.replace(/^[Ee][Pp](\d+)$/, '$1');
  
  // 处理带前导零的情况，如"01"转为"1"
  if (/^\d+$/.test(normalized)) {
    normalized = String(parseInt(normalized, 10));
  }
  
  return normalized;
}

/**
 * 将处理后的CSV写回文件
 */
async function writeCSVFile(filePath: string, content: string): Promise<void> {
  try {
    await fs.promises.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    console.error('写入CSV文件失败:', error);
    throw new Error(`无法写入CSV文件: ${filePath}`);
  }
}

/**
 * 执行TMDB上传命令
 */
async function executeTMDBUpload(csvFilePath: string, workingDirectory: string): Promise<{stdout: string, stderr: string}> {
  const uploadCommand = `python -m tmdb-import "${csvFilePath}" --upload`;
  return await executeTMDBImportCommand(uploadCommand, workingDirectory);
}

/**
 * 从上传结果中提取上传成功的集数
 */
function extractUploadedEpisodes(output: string): number[] {
  const episodes: number[] = [];
  
  // 匹配上传成功的集数信息
  // 示例: "Successfully uploaded episode 1" 或 "成功上传第1集"
  const pattern1 = /Successfully uploaded episode (\d+)/gi;
  const pattern2 = /成功上传第(\d+)集/g;
  
  let match;
  
  // 匹配英文格式
  while ((match = pattern1.exec(output)) !== null) {
    const episodeNumber = parseInt(match[1], 10);
    if (!isNaN(episodeNumber) && !episodes.includes(episodeNumber)) {
      episodes.push(episodeNumber);
    }
  }
  
  // 匹配中文格式
  while ((match = pattern2.exec(output)) !== null) {
    const episodeNumber = parseInt(match[1], 10);
    if (!isNaN(episodeNumber) && !episodes.includes(episodeNumber)) {
      episodes.push(episodeNumber);
    }
  }
  
  return episodes;
}

/**
 * 标记集数为已完成
 */
async function markEpisodesAsCompleted(item: TMDBItem, seasonNumber: number, episodeNumbers: number[]): Promise<TMDBItem | null> {
  if (episodeNumbers.length === 0) {
    return null;
  }
  
  const updatedItem = { ...item };
  
  // 处理多季情况
  if (updatedItem.seasons) {
    const seasonIndex = updatedItem.seasons.findIndex(s => s.seasonNumber === seasonNumber);
    if (seasonIndex !== -1) {
      const season = { ...updatedItem.seasons[seasonIndex] };
      
      // 更新集数状态
      for (const episodeNumber of episodeNumbers) {
        const episodeIndex = season.episodes.findIndex(e => e.number === episodeNumber);
        if (episodeIndex !== -1) {
          // 更新已存在的集数
          season.episodes[episodeIndex] = {
            ...season.episodes[episodeIndex],
            completed: true
          };
        } else {
          // 添加新的集数
          season.episodes.push({
            number: episodeNumber,
            completed: true,
            seasonNumber: seasonNumber
          });
        }
      }
      
      // 更新季
      updatedItem.seasons[seasonIndex] = season;
    }
  } else if (updatedItem.episodes) {
    // 处理单季情况
    for (const episodeNumber of episodeNumbers) {
      const episodeIndex = updatedItem.episodes.findIndex(e => e.number === episodeNumber);
      if (episodeIndex !== -1) {
        // 更新已存在的集数
        updatedItem.episodes[episodeIndex] = {
          ...updatedItem.episodes[episodeIndex],
          completed: true
        };
      } else {
        // 添加新的集数
        updatedItem.episodes.push({
          number: episodeNumber,
          completed: true
        });
      }
    }
  }
  
  return updatedItem;
}

export async function GET(request: NextRequest) {
  try {
    console.log('[API] 开始处理execute-scheduled-task请求');
    
    // 获取请求参数
    const searchParams = request.nextUrl.searchParams;
    const itemId = searchParams.get('itemId');
    const seasonNumber = parseInt(searchParams.get('seasonNumber') || '1', 10);
    const autoUpload = searchParams.get('autoUpload') === 'true';
    const autoRemoveMarked = searchParams.get('autoRemoveMarked') === 'true';
    // 获取新增的参数
    const autoConfirm = searchParams.get('autoConfirm') === 'true';
    const autoMarkUploaded = searchParams.get('autoMarkUploaded') === 'true';
    const removeIqiyiAirDate = searchParams.get('removeIqiyiAirDate') === 'true';
    const platformUrl = searchParams.get('platformUrl') || '';
    
    console.log(`[API] 请求参数: itemId=${itemId}, seasonNumber=${seasonNumber}, autoUpload=${autoUpload}, autoRemoveMarked=${autoRemoveMarked}, autoConfirm=${autoConfirm}, autoMarkUploaded=${autoMarkUploaded}, removeIqiyiAirDate=${removeIqiyiAirDate}`);
    
    if (!itemId) {
      console.error('[API] 缺少必要参数: itemId');
      return NextResponse.json({ error: '缺少必要参数: itemId' }, { status: 400 });
    }
    
    // 获取项目信息
    console.log('[API] 获取项目信息...');
    const items = await StorageManager.getItemsWithRetry();
    let item = items.find(i => i.id === itemId);
    
    // 如果找不到项目，尝试通过其他方式查找
    if (!item) {
      console.warn(`[API] 找不到ID为 ${itemId} 的项目，尝试通过其他方式查找...`);
      
      // 尝试从URL参数中获取更多信息
      const tmdbId = searchParams.get('tmdbId');
      const title = searchParams.get('title');
      
      // 创建匹配项集合，用于记录每个匹配项的匹配方式和分数
      const matchCandidates: Array<{item: TMDBItem, score: number, matchType: string}> = [];
      
      // 1. 尝试通过TMDB ID查找（最精确的匹配）
      if (tmdbId) {
        const matchByTmdbId = items.find(i => i.tmdbId === tmdbId);
        if (matchByTmdbId) {
          matchCandidates.push({
            item: matchByTmdbId, 
            score: 100, // 最高优先级
            matchType: 'TMDB ID'
          });
          console.log(`[API] 通过TMDB ID找到匹配项: ${matchByTmdbId.title} (ID: ${matchByTmdbId.id})`);
        }
      }
      
      // 2. 尝试通过平台URL查找（次高精确度）
      if (platformUrl && platformUrl.length > 10) {
        const matchByUrl = items.find(i => i.platformUrl === platformUrl);
        if (matchByUrl) {
          matchCandidates.push({
            item: matchByUrl, 
            score: 90, 
            matchType: '平台URL'
          });
          console.log(`[API] 通过平台URL找到匹配项: ${matchByUrl.title} (ID: ${matchByUrl.id})`);
        }
      }
      
      // 3. 尝试通过标题精确匹配
      if (title) {
        const exactTitleMatch = items.find(i => i.title === title);
        if (exactTitleMatch) {
          matchCandidates.push({
            item: exactTitleMatch, 
            score: 80, 
            matchType: '标题精确匹配'
          });
          console.log(`[API] 通过标题精确匹配找到项目: ${exactTitleMatch.title} (ID: ${exactTitleMatch.id})`);
        }
      }
      
      // 4. 尝试通过标题模糊匹配
      if (title) {
        const fuzzyMatches = items.filter(i => 
          i.title.includes(title) || 
          title.includes(i.title)
        );
        
        // 为每个模糊匹配项计算匹配分数
        fuzzyMatches.forEach(match => {
          // 避免重复添加已经通过精确匹配找到的项目
          if (!matchCandidates.some(c => c.item.id === match.id)) {
            // 计算相似度分数 (简单实现，可以使用更复杂的算法)
            const similarity = Math.min(
              match.title.length, 
              title.length
            ) / Math.max(match.title.length, title.length);
            
            // 转换为0-70的分数范围（低于精确匹配）
            const score = Math.round(similarity * 70);
            
            matchCandidates.push({
              item: match,
              score,
              matchType: '标题模糊匹配'
            });
          }
        });
        
        if (fuzzyMatches.length > 0) {
          console.log(`[API] 通过标题模糊匹配找到 ${fuzzyMatches.length} 个可能的项目`);
        }
      }
      
      // 如果找到了候选项，按分数排序并选择最佳匹配
      if (matchCandidates.length > 0) {
        // 对电视剧类型加分
        matchCandidates.forEach(candidate => {
          if (candidate.item.mediaType === 'tv') {
            candidate.score += 5;
          }
        });
        
        // 按分数降序排序
        matchCandidates.sort((a, b) => b.score - a.score);
        
        // 选择得分最高的候选项
        const bestMatch = matchCandidates[0];
        item = bestMatch.item;
        
        console.log(`[API] 选择最佳匹配项: ${item.title} (ID: ${item.id}), 匹配方式: ${bestMatch.matchType}, 分数: ${bestMatch.score}`);
      }
      
      // 如果仍然找不到项目，返回404错误
      if (!item) {
        console.error(`[API] 找不到ID为 ${itemId} 的项目，也无法通过其他方式找到匹配项`);
        return NextResponse.json({ 
          error: `找不到ID为 ${itemId} 的项目，请检查项目是否存在或已被删除`,
          suggestion: "可能需要重新创建定时任务并关联到正确的项目",
          details: {
            searchedBy: {
              itemId,
              tmdbId: tmdbId || '未提供',
              title: title || '未提供',
              platformUrl: platformUrl || '未提供'
            }
          }
        }, { status: 404 });
      }
    }
    
    console.log(`[API] 找到项目: ${item.title} (ID: ${item.id})`);
    
    // 检查项目是否有TMDB ID和平台URL
    if (!item.tmdbId || item.mediaType !== 'tv') {
      console.error(`[API] 项目类型错误或缺少TMDB ID: mediaType=${item.mediaType}, tmdbId=${item.tmdbId}`);
      return NextResponse.json({ 
        error: '项目必须是电视剧类型并且有TMDB ID',
        suggestion: "请编辑项目，确保它是电视剧类型并添加TMDB ID",
        details: {
          itemId: item.id,
          title: item.title,
          mediaType: item.mediaType,
          tmdbId: item.tmdbId || '未设置'
        }
      }, { status: 400 });
    }
    
    if (!item.platformUrl) {
      console.error('[API] 项目缺少平台URL');
      return NextResponse.json({ 
        error: '项目必须有平台URL才能执行TMDB-Import',
        suggestion: "请编辑项目，添加正确的流媒体平台URL",
        details: {
          itemId: item.id,
          title: item.title
        }
      }, { status: 400 });
    }
    
    console.log(`[API] 项目信息验证通过: tmdbId=${item.tmdbId}, platformUrl=${item.platformUrl}`);
    
    // 设置TMDB-Import工作目录
    const workingDirectory = path.join(process.cwd(), 'TMDB-Import-master');
    
    // 检查工作目录是否存在
    if (!fs.existsSync(workingDirectory)) {
      console.error(`[API] TMDB-Import工作目录不存在: ${workingDirectory}`);
      return NextResponse.json({ error: 'TMDB-Import工作目录不存在' }, { status: 500 });
    }
    
    console.log(`[API] TMDB-Import工作目录: ${workingDirectory}`);
    
    // 步骤1: 执行平台抓取命令
    console.log(`[API] 执行平台抓取命令: ${item.platformUrl}`);
    const platformCommand = `python -m tmdb-import "${item.platformUrl}"`;
    const platformResult = await executeTMDBImportCommand(platformCommand, workingDirectory);
    
    if (platformResult.stderr) {
      console.error('[API] 平台抓取错误:', platformResult.stderr);
      return NextResponse.json({ error: '平台抓取失败', details: platformResult.stderr }, { status: 500 });
    }
    
    console.log('[API] 平台抓取成功');
    
    // 解析生成的CSV文件路径
    const csvFilePath = parseCSVPathFromOutput(platformResult.stdout);
    if (!csvFilePath) {
      console.error('[API] 无法从输出中解析CSV文件路径:', platformResult.stdout);
      return NextResponse.json({ 
        error: '无法从输出中解析CSV文件路径', 
        stdout: platformResult.stdout 
      }, { status: 500 });
    }
    
    console.log(`[API] 解析到CSV文件路径: ${csvFilePath}`);
    
    // 检查CSV文件是否存在
    const fullCsvPath = path.join(workingDirectory, csvFilePath);
    if (!fs.existsSync(fullCsvPath)) {
      console.error(`[API] CSV文件不存在: ${fullCsvPath}`);
      return NextResponse.json({ error: `CSV文件不存在: ${csvFilePath}` }, { status: 500 });
    }
    
    // 读取CSV文件
    console.log(`[API] 读取CSV文件: ${fullCsvPath}`);
    const csvContent = await readCSVFile(fullCsvPath);
    let csvData = parseCSV(csvContent);
    
    console.log(`[API] CSV解析结果: ${csvData.rows.length}行数据`);
    
    // 获取已完成的集数列表，用于CSV处理和自动标记
    const completedEpisodes: number[] = [];
    if (autoRemoveMarked || autoMarkUploaded) {
      // 处理多季情况
      if (item.seasons) {
        const season = item.seasons.find(s => s.seasonNumber === seasonNumber);
        if (season) {
          season.episodes.forEach(episode => {
            if (episode.completed) {
              completedEpisodes.push(episode.number);
            }
          });
        }
      } else if (item.episodes) {
        // 处理单季情况
        item.episodes.forEach(episode => {
          if (episode.completed) {
            completedEpisodes.push(episode.number);
          }
        });
      }
    }
    
    // 处理CSV数据（爱奇艺平台特殊处理和自动删除已标记集数）
    if (autoRemoveMarked || removeIqiyiAirDate) {
      console.log('[API] 开始处理CSV数据');
      
      try {
        // 调用process-csv API处理CSV文件
        const processResponse = await fetch(new URL('/api/process-csv', request.url).toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            csvFilePath: fullCsvPath,
            removeIqiyiAirDate: removeIqiyiAirDate && platformUrl.includes('iqiyi.com'),
            completedEpisodes: autoRemoveMarked ? completedEpisodes : []
          }),
        });
        
        if (!processResponse.ok) {
          const errorData = await processResponse.json();
          console.error('[API] 处理CSV数据失败:', errorData);
          throw new Error(errorData.error || '处理CSV数据失败');
        }
        
        const processResult = await processResponse.json();
        csvData = processResult.csvData;
        console.log(`[API] CSV处理完成，剩余${csvData.rows.length}行数据`);
      } catch (error) {
        console.error('[API] 处理CSV数据时出错:', error);
        // 继续执行，不中断流程
      }
    }
    
    let uploadResult = { stdout: '', stderr: '' };
    let markedEpisodes: number[] = [];
    
    // 如果启用了自动上传，执行上传命令
    if (autoUpload) {
      // 构建TMDB URL
      const language = 'zh-CN';
      const tmdbUrl = `https://www.themoviedb.org/tv/${item.tmdbId}/season/${seasonNumber}?language=${language}`;
      
      console.log(`[API] 开始执行TMDB上传命令: ${tmdbUrl}`);
      
      // 检查config.ini中是否配置了TMDB用户名和密码
      const configPath = path.join(workingDirectory, 'config.ini');
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf-8');
        if (!configContent.includes('tmdb_username = ') || !configContent.includes('tmdb_password = ')) {
          console.warn('[API] 警告: config.ini中未配置TMDB用户名和密码，可能导致上传失败');
        }
      }
      
      // 根据是否自动确认选择执行方式
      if (autoConfirm) {
        console.log('[API] 使用自动确认模式执行上传');
        
        // 创建一个临时脚本文件，自动输入"y"
        const tempScriptPath = path.join(workingDirectory, 'auto_confirm.py');
        const scriptContent = `
import subprocess
import sys
import time

def main():
    # 构建命令
    cmd = ['python', '-m', 'tmdb-import', '${tmdbUrl}', '--upload']
    
    # 启动进程
    process = subprocess.Popen(
        cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1
    )
    
    # 持续读取输出并检查是否需要输入
    while True:
        output = process.stdout.readline()
        if output == '' and process.poll() is not None:
            break
        if output:
            print(output.strip())
            sys.stdout.flush()
            
            # 检测需要确认的提示
            if "Do you want to continue" in output or "确认上传" in output or "[y/n]" in output or "[Y/n]" in output:
                print("检测到确认提示，自动输入: y")
                process.stdin.write("y\\n")
                process.stdin.flush()
                time.sleep(0.5)  # 等待一下，确保输入被处理
    
    # 获取错误输出
    stderr = process.stderr.read()
    if stderr:
        print("错误输出:", stderr)
    
    return process.returncode

if __name__ == "__main__":
    sys.exit(main())
`;

        await fs.promises.writeFile(tempScriptPath, scriptContent);
        console.log(`[API] 创建临时自动确认脚本: ${tempScriptPath}`);
        
        // 执行自动确认脚本
        uploadResult = await executeTMDBImportCommand(`python ${tempScriptPath}`, workingDirectory);
        
        // 删除临时脚本
        try {
          await fs.promises.unlink(tempScriptPath);
          console.log(`[API] 已删除临时脚本: ${tempScriptPath}`);
        } catch (unlinkError) {
          console.warn(`[API] 删除临时脚本失败: ${unlinkError}`);
        }
      } else {
        // 常规执行上传命令
        uploadResult = await executeTMDBImportCommand(`python -m tmdb-import "${tmdbUrl}" --upload`, workingDirectory);
      }
      
      if (uploadResult.stderr) {
        console.error('[API] TMDB上传错误:', uploadResult.stderr);
        return NextResponse.json({ 
          error: 'TMDB上传失败', 
          details: uploadResult.stderr,
          platformResult: platformResult.stdout,
          csvData
        }, { status: 500 });
      }
      
      console.log('[API] TMDB上传成功');
      
      // 如果启用了自动标记上传的集数，解析上传结果并标记集数
      if (autoMarkUploaded) {
        console.log('[API] 开始自动标记已上传的集数');
        
        // 从上传结果中提取上传成功的集数
        const uploadedEpisodes = extractUploadedEpisodes(uploadResult.stdout);
        console.log(`[API] 检测到上传成功的集数: ${uploadedEpisodes.join(', ')}`);
        
        if (uploadedEpisodes.length > 0) {
          // 更新项目中的集数状态
          const updatedItem = await markEpisodesAsCompleted(item, seasonNumber, uploadedEpisodes);
          
          if (updatedItem) {
            // 保存更新后的项目
            await StorageManager.updateItem(updatedItem);
            console.log(`[API] 已标记 ${uploadedEpisodes.length} 个集数为已完成`);
            markedEpisodes = uploadedEpisodes;
          }
        }
      }
    }
    
    console.log('[API] 定时任务执行成功');
    return NextResponse.json({
      success: true,
      message: '定时任务执行成功',
      platformResult: platformResult.stdout,
      uploadResult: uploadResult.stdout,
      csvData,
      markedEpisodes // 添加已标记的集数信息
    });
    
  } catch (error: any) {
    console.error('[API] 执行定时任务失败:', error);
    return NextResponse.json({ 
      error: error.message || '执行定时任务失败',
      stack: error.stack
    }, { status: 500 });
  }
} 