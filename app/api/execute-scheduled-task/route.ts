import { NextRequest, NextResponse } from 'next/server';
import { StorageManager, TMDBItem, Season, Episode, ScheduledTask } from '@/lib/storage';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

// 接口定义
interface ExecuteTaskRequest {
  taskId: string;
  itemId: string;
  action: {
    seasonNumber: number;
    autoUpload: boolean;
    autoRemoveMarked: boolean;
    autoConfirm?: boolean;
    removeIqiyiAirDate?: boolean;
    autoMarkUploaded?: boolean;
  };
  metadata?: {
    tmdbId?: string;
    title?: string;
  };
}

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
    
    // 执行命令
    console.log(`[API] 开始执行命令: ${command}`);
    const { stdout, stderr } = await execAsync(command, { 
      cwd: workingDirectory,
      timeout: 180000 // 设置3分钟超时
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
      errorMessage = '命令执行超时 (3分钟)';
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
    if (!fs.existsSync(filePath)) {
      throw new Error(`CSV文件不存在: ${filePath}`);
    }
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
  if (!item.episodes && (!item.seasons || item.seasons.length === 0) || csvData.rows.length === 0) {
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
  if (item.seasons && item.seasons.length > 0) {
    item.seasons.forEach((season: Season) => {
      if (season.episodes) {
      season.episodes.forEach((episode: Episode) => {
        if (episode.completed) {
          // 标准化集数格式，以便匹配
          const normalizedNumber = normalizeEpisodeNumber(episode.number.toString());
          completedEpisodesMap.set(normalizedNumber, true);
        }
      });
      }
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
 * 写入CSV文件
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
async function executeTMDBUpload(csvFilePath: string, workingDirectory: string, autoConfirm: boolean = false): Promise<{stdout: string, stderr: string}> {
  // 构建上传命令
  let uploadCommand = `python -m tmdb-import.importor -f "${csvFilePath}"`;
  
  // 如果需要自动确认，使用echo y | 前缀
  if (autoConfirm) {
    uploadCommand = `echo y | ${uploadCommand}`;
  }
  
  return executeTMDBImportCommand(uploadCommand, workingDirectory);
}

/**
 * 从输出中提取已上传的集数
 */
function extractUploadedEpisodes(output: string): number[] {
  const uploadedEpisodes: number[] = [];
  const lines = output.split('\n');
  
  // 寻找上传成功的集数
  for (const line of lines) {
    // 匹配形如 "上传成功：第X集" 或 "Upload successful: Episode X" 的行
    const zhMatch = line.match(/上传成功：(?:第)?(\d+)(?:集)?/);
    const enMatch = line.match(/Upload successful: (?:Episode )?(\d+)/i);
    
    if (zhMatch && zhMatch[1]) {
      uploadedEpisodes.push(parseInt(zhMatch[1], 10));
    } else if (enMatch && enMatch[1]) {
      uploadedEpisodes.push(parseInt(enMatch[1], 10));
    }
  }
  
  return uploadedEpisodes;
}

/**
 * 将成功上传的集数标记为已完成
 */
async function markEpisodesAsCompleted(item: TMDBItem, seasonNumber: number, episodeNumbers: number[]): Promise<TMDBItem | null> {
  if (episodeNumbers.length === 0) {
    return null; // 没有需要标记的集数
  }
  
  console.log(`[API] 将集数标记为已完成: 季=${seasonNumber}, 集数=${episodeNumbers.join(', ')}`);
  
  // 创建副本以避免直接修改原对象
  const updatedItem = JSON.parse(JSON.stringify(item)) as TMDBItem;
  let changed = false;
  
  // 处理多季情况
  if (updatedItem.seasons && updatedItem.seasons.length > 0) {
    // 找到目标季
    const targetSeason = updatedItem.seasons.find(s => s.seasonNumber === seasonNumber);
    
    if (targetSeason && targetSeason.episodes) {
      // 标记目标集数为已完成
      episodeNumbers.forEach(episodeNum => {
        const episode = targetSeason.episodes.find(e => e.number === episodeNum);
        if (episode && !episode.completed) {
          episode.completed = true;
          changed = true;
        }
      });
    }
  }
  // 处理单季情况（旧数据格式）
  else if (updatedItem.episodes) {
    // 标记目标集数为已完成
    episodeNumbers.forEach(episodeNum => {
      const episode = updatedItem.episodes!.find(e => e.number === episodeNum);
      if (episode && !episode.completed) {
        episode.completed = true;
        changed = true;
      }
    });
  }
  
  // 如果有更改，保存更新后的项目
  if (changed) {
    // 更新updatedAt字段
    updatedItem.updatedAt = new Date().toISOString();
    
    try {
      const success = await StorageManager.updateItem(updatedItem);
      if (success) {
        console.log(`[API] 成功更新项目: ${updatedItem.title}`);
        return updatedItem;
      } else {
        console.error(`[API] 更新项目失败: ${updatedItem.title}`);
        return null;
      }
    } catch (error) {
      console.error(`[API] 更新项目时出错:`, error);
      return null;
    }
  }
  
  return null; // 没有更改
}

/**
 * POST 处理程序
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  console.log('[API] 收到执行定时任务请求');
  
  try {
    // 解析请求体
    const requestData: ExecuteTaskRequest = await request.json();
    
    // 验证请求参数
    if (!requestData || !requestData.taskId || !requestData.action) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }
    
    console.log(`[API] 执行定时任务: taskId=${requestData.taskId}, itemId=${requestData.itemId}, 季=${requestData.action.seasonNumber}`);
    
    // 记录额外元数据（如果存在）
    if (requestData.metadata) {
      console.log(`[API] 附加元数据: tmdbId=${requestData.metadata.tmdbId || '未提供'}, title="${requestData.metadata.title || '未提供'}"`);
    }
    
    // 获取所有项目，用于后续各种情况
    const items = await StorageManager.getItemsWithRetry();
    console.log(`[API] 系统中共有 ${items.length} 个项目`);;
    
    // 添加零项目保护 - 如果系统中没有任何项目，直接返回错误
    if (items.length === 0) {
      console.error('[API] 系统中没有可用项目，无法继续执行');
      return NextResponse.json({ 
        error: "系统中没有可用项目", 
        suggestion: "请先添加至少一个项目，然后再尝试执行任务"
      }, { status: 500 });
    }
    
    let foundValidItem = false;
    let item = null;
    
    // 首先尝试通过ID直接查找
    if (requestData.itemId) {
      item = items.find(i => i.id === requestData.itemId);
      
      // 如果直接通过ID找到了项目，标记为有效
      if (item) {
        console.log(`[API] 通过ID直接找到项目: ${item.title} (ID: ${item.id})`);
        foundValidItem = true;
      } else {
        console.warn(`[API] 通过ID ${requestData.itemId} 未找到项目，尝试其他方法`);
      }
    } else {
      console.warn(`[API] 请求中无有效itemId，将尝试从其他信息中查找项目`);
    }
    
    // 如果没有通过ID找到项目，尝试通过元数据查找
    if (!foundValidItem && requestData.metadata) {
      console.log(`[API] 尝试通过元数据查找项目`);
      
      // 通过TMDB ID查找
      if (requestData.metadata.tmdbId) {
        const matchByTmdbId = items.find(i => i.tmdbId === requestData.metadata?.tmdbId);
        if (matchByTmdbId) {
          console.log(`[API] 通过TMDB ID ${requestData.metadata.tmdbId} 找到项目: ${matchByTmdbId.title} (ID: ${matchByTmdbId.id})`);
          item = matchByTmdbId;
          requestData.itemId = matchByTmdbId.id;
          foundValidItem = true;
        }
      }
      
      // 如果TMDB ID没找到，尝试通过标题查找
      if (!foundValidItem && requestData.metadata.title) {
        const title = requestData.metadata.title;
        const matchByTitle = items.find(i => 
          i.title === title ||
          (i.title.includes(title) && i.title.length - title.length < 10) ||
          (title.includes(i.title) && title.length - i.title.length < 10)
        );
        
        if (matchByTitle) {
          console.log(`[API] 通过标题 "${title}" 找到项目: ${matchByTitle.title} (ID: ${matchByTitle.id})`);
          item = matchByTitle;
          requestData.itemId = matchByTitle.id;
          foundValidItem = true;
        }
      }
    }
    
    // 检查是否是问题ID
    if (!foundValidItem && requestData.itemId && (requestData.itemId === "1749566411729" || requestData.itemId.length > 20)) {
      console.log('[API] 检测到问题ID格式，尝试修复...');
      
      // 选择最近创建的项目
      const sortedItems = [...items].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      if (sortedItems.length > 0) {
        const newItemId = sortedItems[0].id;
        console.log(`[API] 将使用最近创建的项目 ${sortedItems[0].title} (ID: ${newItemId}) 替代问题ID`);
        
        // 修改请求数据
        requestData.itemId = newItemId;
        item = sortedItems[0];
        foundValidItem = true;
        
        // 更新任务记录
        if (requestData.taskId && requestData.taskId !== 'legacy-get-request') {
          const tasks = await StorageManager.getScheduledTasks();
          const taskToUpdate = tasks.find(t => t.id === requestData.taskId);
          
          if (taskToUpdate) {
            const updatedTask = { 
              ...taskToUpdate, 
              itemId: newItemId,
              itemTitle: sortedItems[0].title,
              itemTmdbId: sortedItems[0].tmdbId,
              updatedAt: new Date().toISOString()
            };
            
            await StorageManager.updateScheduledTask(updatedTask);
            console.log(`[API] 已更新任务 ${requestData.taskId} 的项目ID`);
          }
        }
      }
    }
    
    // 如果通过问题ID处理没找到，尝试通过任务ID寻找关联信息
    if (!foundValidItem && requestData.taskId && requestData.taskId !== 'legacy-get-request') {
      console.log(`[API] 尝试通过任务ID ${requestData.taskId} 找到关联项目`);
      const tasks = await StorageManager.getScheduledTasks();
      const task = tasks.find(t => t.id === requestData.taskId);
      
      if (task) {
        console.log(`[API] 找到了任务 ${task.id} (${task.name})`);
        
        // 尝试通过任务中的TMDB ID匹配
        if (task.itemTmdbId) {
          const matchedItem = items.find(item => item.tmdbId === task.itemTmdbId);
          if (matchedItem) {
            console.log(`[API] 通过TMDB ID匹配到项目: ${matchedItem.title} (ID: ${matchedItem.id})`);
            requestData.itemId = matchedItem.id;
            item = matchedItem;
            foundValidItem = true;
            
            // 更新任务
            const updatedTask = { 
              ...task, 
              itemId: matchedItem.id, 
              itemTitle: matchedItem.title,
              updatedAt: new Date().toISOString()
            };
            await StorageManager.updateScheduledTask(updatedTask);
            console.log(`[API] 已更新任务 ${task.id} 的项目ID`);
          }
        }
        
        // 如果通过TMDB ID未匹配成功，尝试通过任务名称或标题匹配
        if (!foundValidItem) {
          const possibleTitle = task.itemTitle || task.name.replace(/\s*定时任务$/, '');
          console.log(`[API] 尝试通过标题匹配: "${possibleTitle}"`);
          
          const matchedItems = items.filter(item => 
            item.title === possibleTitle ||
            (item.title.includes(possibleTitle) && item.title.length - possibleTitle.length < 10) ||
            (possibleTitle.includes(item.title) && possibleTitle.length - item.title.length < 10)
          );
          
          if (matchedItems.length > 0) {
            const bestMatch = matchedItems[0];
            console.log(`[API] 通过标题匹配到项目: ${bestMatch.title} (ID: ${bestMatch.id})`);
            requestData.itemId = bestMatch.id;
            item = bestMatch;
            foundValidItem = true;
            
            // 更新任务
            const updatedTask = {
              ...task,
              itemId: bestMatch.id,
              itemTitle: bestMatch.title,
              itemTmdbId: bestMatch.tmdbId,
              updatedAt: new Date().toISOString()
            };
            await StorageManager.updateScheduledTask(updatedTask);
            console.log(`[API] 已更新任务 ${task.id} 的项目ID`);
          }
        }
      }
    }
    
    // 如果所有方法都失败，使用最近创建的项目作为最后手段
    if (!foundValidItem) {
      console.warn(`[API] 所有匹配方法均失败，使用最近创建的项目作为备用`);
      
      // 按创建时间排序
      const sortedItems = [...items].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      if (sortedItems.length > 0) {
        const fallbackItem = sortedItems[0];
        console.log(`[API] 使用最近创建的项目: ${fallbackItem.title} (ID: ${fallbackItem.id})`);
        requestData.itemId = fallbackItem.id;
        item = fallbackItem;
        foundValidItem = true;
        
        // 如果有任务ID，更新任务
        if (requestData.taskId && requestData.taskId !== 'legacy-get-request') {
          const tasks = await StorageManager.getScheduledTasks();
          const taskToUpdate = tasks.find(t => t.id === requestData.taskId);
          
          if (taskToUpdate) {
            const updatedTask = { 
              ...taskToUpdate, 
              itemId: fallbackItem.id,
              itemTitle: fallbackItem.title,
              itemTmdbId: fallbackItem.tmdbId,
              updatedAt: new Date().toISOString()
            };
            
            await StorageManager.updateScheduledTask(updatedTask);
            console.log(`[API] 已更新任务 ${requestData.taskId} 的项目ID`);
          }
        }
      } else {
        // 这种情况理论上不应该发生，因为我们前面已经检查了items.length > 0
        // 但为了健壮性，仍然保留此检查
        return NextResponse.json({ 
          error: "系统中没有可用项目", 
          suggestion: "请先添加至少一个项目，然后再尝试执行任务"
        }, { status: 500 });
      }
    }
    
    // 最终检查是否找到有效项目
    if (!item || !foundValidItem) {
      console.error(`[API] 无法为请求找到有效项目，itemId=${requestData.itemId}`);
      return NextResponse.json({ 
        error: `无法找到有效项目`, 
        suggestion: '请检查项目是否存在或重新创建任务'
      }, { status: 404 });
    }
    
    // 验证项目信息
    if (!item.tmdbId) {
      return NextResponse.json({ error: `项目 ${item.title} 缺少TMDB ID` }, { status: 400 });
    }
    
    if (!item.platformUrl) {
      return NextResponse.json({ error: `项目 ${item.title} 缺少平台URL` }, { status: 400 });
    }
    
    // 检查项目是否有指定的季数
    if (requestData.action.seasonNumber > 0 && item.mediaType === 'tv') {
      if (!item.seasons || !item.seasons.some(s => s.seasonNumber === requestData.action.seasonNumber)) {
        return NextResponse.json({ 
          error: `项目 ${item.title} 没有第 ${requestData.action.seasonNumber} 季` 
        }, { status: 400 });
      }
    }
    
    // 查找TMDB-Import目录
    const tmdbImportDir = path.resolve(process.cwd(), 'TMDB-Import-master');
    if (!fs.existsSync(tmdbImportDir)) {
      return NextResponse.json({ 
        error: '找不到TMDB-Import目录', 
        suggestion: '请确保TMDB-Import-master目录存在于项目根目录下'
      }, { status: 500 });
    }
    
    // 构建导出命令
    let extractCommand = `python -m tmdb-import.extractor -u "${item.platformUrl}" -s ${requestData.action.seasonNumber}`;
    
    // 执行导出命令
    const { stdout, stderr } = await executeTMDBImportCommand(extractCommand, tmdbImportDir);
    
    // 检查是否有错误
    if (stderr && !stdout) {
      return NextResponse.json({ 
        error: '执行TMDB导出命令失败', 
        details: stderr,
        command: extractCommand
      }, { status: 500 });
    }
    
    // 从输出中解析CSV文件路径
    const csvPath = parseCSVPathFromOutput(stdout);
    if (!csvPath) {
      return NextResponse.json({ 
        error: '无法从输出中找到CSV文件路径', 
        output: stdout.substring(0, 500) + (stdout.length > 500 ? '...' : '')
      }, { status: 500 });
    }
    
    // 构建CSV文件的绝对路径
    const csvAbsolutePath = path.resolve(tmdbImportDir, csvPath);
    console.log(`[API] CSV文件路径: ${csvAbsolutePath}`);
    
    // 如果需要自动过滤已标记完成的集数
    if (requestData.action.autoRemoveMarked) {
      try {
        // 读取CSV文件
        const csvContent = await readCSVFile(csvAbsolutePath);
        
        // 解析CSV内容
        const csvData = parseCSV(csvContent);
        
        // 过滤掉已标记完成的集数
        const filteredData = autoRemoveMarkedEpisodes(csvData, item);
        
        // 如果过滤后没有数据，返回提示
        if (filteredData.rows.length === 0) {
          return NextResponse.json({ 
            success: true, 
            message: '所有集数已标记为完成，无需上传',
            csvPath: csvPath
          });
        }
        
        // 将过滤后的数据写回CSV文件
        const filteredContent = csvDataToString(filteredData);
        await writeCSVFile(csvAbsolutePath, filteredContent);
        
        console.log(`[API] 已过滤已完成集数: 原始=${csvData.rows.length}行, 过滤后=${filteredData.rows.length}行`);
      } catch (error) {
        console.error('[API] 过滤已完成集数时出错:', error);
        // 继续执行，不中断流程
      }
    }
    
    // 如果需要删除爱奇艺平台的air_date列
    if (requestData.action.removeIqiyiAirDate && item.platformUrl.includes('iqiyi.com')) {
      try {
        // 读取CSV文件
        const csvContent = await readCSVFile(csvAbsolutePath);
        
        // 解析CSV内容
        const csvData = parseCSV(csvContent);
        
        // 查找air_date列的索引
        const airDateIndex = csvData.headers.findIndex(h => h.toLowerCase() === 'air_date');
        
        if (airDateIndex !== -1) {
          // 从所有行中删除air_date列
          csvData.headers.splice(airDateIndex, 1);
          csvData.rows.forEach(row => {
            if (airDateIndex < row.length) {
              row.splice(airDateIndex, 1);
            }
          });
          
          // 将修改后的数据写回CSV文件
          const modifiedContent = csvDataToString(csvData);
          await writeCSVFile(csvAbsolutePath, modifiedContent);
          
          console.log(`[API] 已删除爱奇艺平台的air_date列`);
        }
      } catch (error) {
        console.error('[API] 删除air_date列时出错:', error);
        // 继续执行，不中断流程
      }
    }
    
    // 如果需要自动上传
    if (requestData.action.autoUpload) {
      // 执行上传命令
      const uploadResult = await executeTMDBUpload(
        csvAbsolutePath, 
        tmdbImportDir,
        !!requestData.action.autoConfirm
      );
      
      // 如果需要自动标记已上传的集数
      if (requestData.action.autoMarkUploaded) {
        // 从输出中提取成功上传的集数
        const uploadedEpisodes = extractUploadedEpisodes(uploadResult.stdout);
        
        if (uploadedEpisodes.length > 0) {
          // 将上传成功的集数标记为已完成
          await markEpisodesAsCompleted(item, requestData.action.seasonNumber, uploadedEpisodes);
        }
      }
      
      return NextResponse.json({ 
        success: true, 
        message: '成功执行TMDB导入任务',
        csvPath: csvPath,
        uploadOutput: uploadResult.stdout.substring(0, 1000) + (uploadResult.stdout.length > 1000 ? '...' : '')
      });
    } else {
      // 如果不需要自动上传，只返回CSV路径
    return NextResponse.json({
      success: true,
        message: '成功执行TMDB导出任务',
        csvPath: csvPath
      });
    }
  } catch (error: any) {
    console.error('[API] 执行定时任务失败:', error);
    return NextResponse.json({ 
      error: '执行定时任务失败', 
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

/**
 * 为了兼容原有的GET请求方式，仍然保留GET处理程序
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  console.log('[API] 收到GET请求，建议改用POST方法');
  
  try {
    // 从URL参数中获取信息
    const url = new URL(request.url);
    const itemId = url.searchParams.get('itemId');
    const seasonNumber = parseInt(url.searchParams.get('seasonNumber') || '1', 10);
    const autoUpload = url.searchParams.get('autoUpload') === 'true';
    const autoRemoveMarked = url.searchParams.get('autoRemoveMarked') === 'true';
    const autoConfirm = url.searchParams.get('autoConfirm') === 'true';
    const removeIqiyiAirDate = url.searchParams.get('removeIqiyiAirDate') === 'true';
    const autoMarkUploaded = url.searchParams.get('autoMarkUploaded') !== 'false'; // 默认为true
    
    // 验证必要参数
    if (!itemId) {
      return NextResponse.json({ error: '缺少必要参数: itemId' }, { status: 400 });
    }
    
    // 模拟POST请求的请求体
    const requestData: ExecuteTaskRequest = {
      taskId: 'legacy-get-request',
      itemId,
      action: {
        seasonNumber,
        autoUpload,
        autoRemoveMarked,
        autoConfirm,
        removeIqiyiAirDate,
        autoMarkUploaded
      }
    };
    
    // 直接调用POST处理程序，传递JSON数据
    return POST(new NextRequest(request.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    }));
  } catch (error: any) {
    console.error('[API] 处理GET请求失败:', error);
    return NextResponse.json({ 
      error: '处理请求失败', 
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
} 