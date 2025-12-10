import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs'
import { BrowserInterruptDetector } from '@/lib/utils/browser-interrupt-detector';

import { ServerConfigManager } from '@/lib/data/server-config-manager'

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
    throw new Error(`无法读取CSV文件: ${filePath}`);
  }
}

/**
 * 解析CSV内容（增强版）
 */
function parseCSV(csvContent: string): { headers: string[], rows: string[][] } {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCSVLine(lines[0]);
  console.log(`[API] CSV表头: ${headers.join(' | ')}`);

  const rows: string[][] = [];

  for (let i = 1; i < lines.length; i++) {
    try {
      const row = parseCSVLine(lines[i]);

      // 验证行的字段数量
      if (row.length !== headers.length) {
        
        console.warn(`[API] 问题行内容: ${lines[i].substring(0, 100)}...`);

        // 补齐或截断字段以匹配表头数量
        while (row.length < headers.length) {
          row.push('');
        }
        if (row.length > headers.length) {
          row.splice(headers.length);
        }
      }

      rows.push(row);
    } catch (error) {

      // 跳过有问题的行，继续处理
    }
  }

  return { headers, rows };
}

/**
 * 解析CSV行（修复版）- 使用更可靠的CSV解析器
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];
    const nextChar = i + 1 < line.length ? line[i + 1] : null;

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // 转义的引号
        currentField += '"';
        i += 2;
      } else {
        // 开始或结束引号
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // 字段分隔符
      result.push(currentField);
      currentField = '';
      i++;
    } else {
      // 普通字符
      currentField += char;
      i++;
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
 * 格式化CSV字段（处理包含逗号、引号、换行符的字段）
 */
function formatCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n') || field.includes('\r')) {
    // 转义引号并用引号包围
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/**
 * 写入CSV文件
 */
async function writeCSVFile(filePath: string, content: string): Promise<void> {
  try {
    await fs.promises.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    
    throw new Error(`无法写入CSV文件: ${filePath}`);
  }
}

/**
 * POST /api/tasks/execute-tmdb-import - 执行TMDB导入
 */
export async function POST(request: NextRequest) {
  try {
    
    let requestBody;
    try {
      requestBody = await request.json();
      
    } catch (parseError) {
      
      return NextResponse.json({
        success: false,
        error: '请求体解析失败'
      }, { status: 400 });
    }

    const {
      csvPath,
      seasonNumber,
      itemId,
      tmdbId,
      conflictAction = 'w',
      removeAirDateColumn = false,
      removeRuntimeColumn = false,
      removeBackdropColumn = false
    } = requestBody;

    if (!csvPath) {
      return NextResponse.json({
        success: false,
        error: '缺少CSV文件路径参数'
      }, { status: 400 });
    }

    if (!tmdbId) {
      return NextResponse.json({
        success: false,
        error: '缺少TMDB ID参数'
      }, { status: 400 });
    }

    if (!seasonNumber) {
      return NextResponse.json({
        success: false,
        error: '缺少季数参数'
      }, { status: 400 });
    }

    // 检查CSV文件是否存在
    try {
      if (!fs.existsSync(csvPath)) {
        
        return NextResponse.json({
          success: false,
          error: 'CSV文件不存在',
          details: { csvPath }
        }, { status: 404 });
      }

      const fileStats = fs.statSync(csvPath);
      
      if (fileStats.size === 0) {
        
        return NextResponse.json({
          success: false,
          error: 'CSV文件为空',
          details: { csvPath }
        }, { status: 400 });
      }
    } catch (fsError) {
      
      return NextResponse.json({
        success: false,
        error: '文件系统操作失败',
        details: { error: fsError instanceof Error ? fsError.message : String(fsError) }
      }, { status: 500 });
    }

    // 处理列数据清空选项
    if (removeAirDateColumn || removeRuntimeColumn || removeBackdropColumn) {
      try {
        
        // 读取CSV文件
        const csvContent = await readCSVFile(csvPath);

        // 解析CSV内容
        const csvData = parseCSV(csvContent);
        let modified = false;

        // 需要清空数据的列名映射
        const columnsToEmpty: { [key: string]: string[] } = {};

        if (removeAirDateColumn) {
          columnsToEmpty['air_date'] = ['air_date', 'airdate', '播出日期', '首播日期'];
        }

        if (removeRuntimeColumn) {
          columnsToEmpty['runtime'] = ['runtime', '时长', '分钟', 'duration', '片长'];
        }

        if (removeBackdropColumn) {
          columnsToEmpty['backdrop'] = ['backdrop_path', 'backdrop', 'still_path', 'still', '分集图片', '背景图片', '剧照', 'episode_image'];
        }

        // 收集要清空数据的列索引
        const indicesToEmpty: number[] = [];

        Object.entries(columnsToEmpty).forEach(([type, possibleNames]) => {
          possibleNames.forEach(name => {
            const index = csvData.headers.findIndex(h =>
              h.toLowerCase() === name.toLowerCase() ||
              h.toLowerCase().includes(name.toLowerCase()) ||
              name.toLowerCase().includes(h.toLowerCase())
            );
            if (index !== -1 && !indicesToEmpty.includes(index)) {
              indicesToEmpty.push(index);
              console.log(`[API] 找到要清空数据的${type}列: ${csvData.headers[index]} (索引: ${index})`);
            } else if (index === -1) {
              console.log(`[API] 未找到${type}列，搜索名称: ${name}，CSV表头: [${csvData.headers.join(', ')}]`);
            }
          });
        });

        if (indicesToEmpty.length > 0) {
          indicesToEmpty.forEach(index => {
            const columnName = csvData.headers[index];
            // 保留表头，只清空所有行中对应列的数据
            csvData.rows.forEach(row => {
              if (index < row.length) {
                row[index] = ''; // 清空数据，保留列结构和逗号分隔符
              }
            });
            
          });

          // 将修改后的数据写回CSV文件
          const modifiedContent = csvDataToString(csvData);
          await writeCSVFile(csvPath, modifiedContent);

          modified = true;
        } else {
          
        }

        if (modified) {
          
        }

      } catch (csvError) {
        
        return NextResponse.json({
          success: false,
          error: '处理CSV列删除选项失败',
          details: { error: csvError instanceof Error ? csvError.message : String(csvError) }
        }, { status: 500 });
      }
    } else {
      
    }

    // 查找TMDB-Import目录（从服务端配置读取）
    const configuredPath = ServerConfigManager.getConfigItem('tmdbImportPath') as string | undefined
    const tmdbImportDir = configuredPath ? configuredPath : path.resolve(process.cwd(), 'TMDB-Import-master')
    
    try {
      if (!fs.existsSync(tmdbImportDir)) {
        
        return NextResponse.json({
          success: false,
          error: '找不到TMDB-Import目录',
          details: { expectedPath: tmdbImportDir }
        }, { status: 500 });
      }

      // 检查目录是否可读
      const dirStats = fs.statSync(tmdbImportDir);
      if (!dirStats.isDirectory()) {
        
        return NextResponse.json({
          success: false,
          error: 'TMDB-Import路径不是目录',
          details: { path: tmdbImportDir }
        }, { status: 400 });
      }

    } catch (dirError) {
      
      return NextResponse.json({
        success: false,
        error: 'TMDB-Import目录检查失败',
        details: { error: dirError instanceof Error ? dirError.message : String(dirError) }
      }, { status: 500 });
    }

    // 构建TMDB导入命令
    const tmdbUrl = `https://www.themoviedb.org/tv/${tmdbId}/season/${seasonNumber}?language=zh-CN`;

    if (!configuredPath) {
      
    }
    
    try {
      
      let result;
      try {
        result = await executeTMDBImportWithInteraction(tmdbImportDir, tmdbUrl, conflictAction);
        
      } catch (processError) {
        
        // 分析错误类型
        let errorType = 'unknown';
        let errorMessage = processError instanceof Error ? processError.message : String(processError);

        if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
          errorType = 'timeout';
          errorMessage = '进程执行超时，请检查网络连接或稍后重试';
        } else if (errorMessage.includes('ENOENT') || errorMessage.includes('找不到')) {
          errorType = 'not_found';
          errorMessage = 'Python或tmdb-import工具未找到，请检查安装';
        } else if (errorMessage.includes('permission') || errorMessage.includes('权限')) {
          errorType = 'permission';
          errorMessage = '权限不足，请检查文件权限';
        }

        return NextResponse.json({
          success: false,
          error: errorMessage,
          errorType: errorType,
          details: {
            command: `python -m tmdb-import "${tmdbUrl}"`,
            workingDir: tmdbImportDir,
            originalError: processError instanceof Error ? processError.message : String(processError),
            conflictAction: conflictAction
          }
        }, { status: 200 }); // 改为200状态码，避免触发错误处理
      }

      if (!result.success) {
        
        console.error(`[API] 进程输出 (stdout):`, result.stdout?.substring(0, 500) || '无输出');
        console.error(`[API] 进程错误 (stderr):`, result.stderr?.substring(0, 500) || '无错误输出');

        // 使用浏览器中断检测器分析错误
        const interruptResult = BrowserInterruptDetector.analyzeError(
          { message: result.error || 'TMDB导入进程失败' },
          result.stdout,
          result.stderr
        );

        let errorType = interruptResult.errorType;
        let enhancedError = result.error || 'TMDB导入进程失败';
        let isUserInterrupted = interruptResult.isUserInterrupted;

        // 如果是用户中断，使用友好的消息
        if (isUserInterrupted) {
          enhancedError = BrowserInterruptDetector.generateUserFriendlyMessage(interruptResult);
        } else {
          // 保留原有的错误类型分析逻辑作为补充
          if (result.stderr?.includes('HTTP 500') || result.stdout?.includes('HTTP 500')) {
            errorType = 'server_error';
            enhancedError = '目标服务器返回500错误，请稍后重试';
          } else if (result.stderr?.includes('timeout') || result.stdout?.includes('timeout')) {
            errorType = 'timeout';
            enhancedError = '网络请求超时，请检查网络连接';
          } else if (result.stderr?.includes('ConnectionError') || result.stdout?.includes('ConnectionError')) {
            errorType = 'connection_error';
            enhancedError = '网络连接失败，请检查网络设置';
          }
        }

        return NextResponse.json({
          success: false,
          error: enhancedError,
          errorType: errorType,
          isUserInterrupted: isUserInterrupted,
          details: {
            command: `python -m tmdb-import "${tmdbUrl}"`,
            workingDir: tmdbImportDir,
            stdout: result.stdout?.substring(0, 500) || '',
            stderr: result.stderr?.substring(0, 500) || '',
            conflictAction: conflictAction,
            interruptAnalysis: interruptResult
          }
        }, { status: 200 }); // 改为200状态码，避免触发错误处理
      }

      // 解析导入的集数
      let importedEpisodes;
      try {
        importedEpisodes = parseImportedEpisodes(result.stdout || '');
        console.log(`[API] TMDB导入成功，导入的集数: ${importedEpisodes.join(', ')}`);
      } catch (parseError) {
        
        console.log(`[API] 原始输出:`, result.stdout?.substring(0, 1000) || '无输出');
        importedEpisodes = []; // 默认为空数组
      }

      return NextResponse.json({
        success: true,
        importedEpisodes: importedEpisodes,
        message: `TMDB导入完成，成功导入 ${importedEpisodes.length} 集`,
        output: result.stdout?.substring(0, 1000) || '',
        conflictAction: conflictAction
      }, { status: 200 });

    } catch (execError: any) {

      return NextResponse.json({
        success: false,
        error: 'TMDB导入命令执行失败',
        details: {
          command: `python -m tmdb-import "${tmdbUrl}"`,
          workingDir: tmdbImportDir,
          errorMessage: execError.message || String(execError),
          errorStack: execError.stack || '',
          conflictAction: conflictAction
        }
      }, { status: 500 });
    }

  } catch (error) {

    return NextResponse.json({
      success: false,
      error: 'TMDB导入API执行失败',
      details: {
        message: error instanceof Error ? error.message : String(error),
        type: typeof error,
        stack: error instanceof Error ? error.stack : undefined
      }
    }, { status: 500 });
  }
}

/**
 * 执行TMDB导入命令并处理交互式输入
 */
async function executeTMDBImportWithInteraction(
  workingDir: string,
  tmdbUrl: string,
  conflictAction: string
): Promise<{ success: boolean; stdout: string; stderr: string; error?: string }> {
  return new Promise((resolve) => {

    let child;
    let hasResolved = false;

    // 安全的resolve函数，确保只调用一次
    const safeResolve = (result: { success: boolean; stdout: string; stderr: string; error?: string }) => {
      if (!hasResolved) {
        hasResolved = true;
        resolve(result);
      }
    };

    try {
      child = spawn('python', ['-m', 'tmdb-import', tmdbUrl], {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, PYTHONUNBUFFERED: '1' } // 确保Python输出不被缓冲
      });

      // 检查进程是否真的启动了
      if (!child.pid) {
        
        safeResolve({
          success: false,
          stdout: '',
          stderr: '',
          error: '进程启动失败：无法获取进程ID'
        });
        return;
      }

    } catch (spawnError) {
      
      safeResolve({
        success: false,
        stdout: '',
        stderr: '',
        error: `进程启动失败: ${spawnError instanceof Error ? spawnError.message : String(spawnError)}`
      });
      return;
    }

    let stdout = '';
    let stderr = '';

    // 设置超时
    const timeout = setTimeout(() => {
      if (!hasResolved) {
        
        try {
          child.kill('SIGTERM');
          // 如果SIGTERM不起作用，5秒后强制终止
          setTimeout(() => {
            if (!child.killed) {
              child.kill('SIGKILL');
            }
          }, 5000);
        } catch (killError) {
          
        }

        safeResolve({
          success: false,
          stdout,
          stderr,
          error: 'TMDB导入超时（10分钟）'
        });
      }
    }, 600000); // 10分钟超时

    // 监听标准输出
    child.stdout.on('data', (data) => {
      const output = data.toString();
      stdout += output;
      console.log(`[API] TMDB导入输出: ${output.trim()}`);

      // 检测交互式提示
      const lowerOutput = output.toLowerCase();
      if (lowerOutput.includes('already exists') ||
          lowerOutput.includes('overwrite') ||
          lowerOutput.includes('(w/y/n)') ||
          lowerOutput.includes('[w/y/n]') ||
          lowerOutput.includes('w/y/n')) {

        // 自动回答
        try {
          child.stdin.write(`${conflictAction}\n`);
        } catch (stdinError) {
          
        }
      }
    });

    // 监听标准错误
    child.stderr.on('data', (data) => {
      const output = data.toString();
      stderr += output;
      console.log(`[API] TMDB导入错误: ${output.trim()}`);

      // 检查是否是致命错误
      const lowerOutput = output.toLowerCase();
      if (lowerOutput.includes('fatal') ||
          lowerOutput.includes('critical') ||
          lowerOutput.includes('traceback') ||
          lowerOutput.includes('modulenotfounderror')) {
        
      }
    });

    // 监听进程结束
    child.on('close', (code, signal) => {
      clearTimeout(timeout);

      if (!hasResolved) {
        
        if (code === 0) {
          
          safeResolve({
            success: true,
            stdout,
            stderr
          });
        } else {
          
          console.error(`[API] 标准输出:`, stdout.substring(0, 500));
          console.error(`[API] 标准错误:`, stderr.substring(0, 500));

          let errorMessage = `进程异常结束，退出码: ${code}`;
          if (signal) {
            errorMessage += `, 信号: ${signal}`;
          }

          safeResolve({
            success: false,
            stdout,
            stderr,
            error: errorMessage
          });
        }
      }
    });

    // 监听进程错误
    child.on('error', (error) => {
      clearTimeout(timeout);

      if (!hasResolved) {
        
        safeResolve({
          success: false,
          stdout,
          stderr,
          error: `进程启动失败: ${error.message}`
        });
      }
    });
  });
}

/**
 * 从TMDB导入输出中解析导入的集数
 */
function parseImportedEpisodes(output: string): number[] {
  const importedEpisodes: number[] = [];

  // 尝试多种模式来匹配导入的集数
  const patterns = [
    // 匹配 "Episode 1", "Episode 2" 等
    /Episode\s+(\d+)/gi,
    // 匹配 "第1集", "第2集" 等
    /第(\d+)集/g,
    // 匹配 "S01E01", "S01E02" 等
    /S\d+E(\d+)/gi,
    // 匹配 "E01", "E02" 等
    /E(\d+)/gi,
    // 匹配 "导入第1集", "导入第2集" 等
    /导入第?(\d+)集?/g,
    // 匹配 "Imported episode 1", "Imported episode 2" 等
    /Imported\s+episode\s+(\d+)/gi,
    // 匹配 "成功导入 1", "成功导入 2" 等
    /成功导入\s*(\d+)/g
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(output)) !== null) {
      const episodeNumber = parseInt(match[1]);
      if (!isNaN(episodeNumber) && !importedEpisodes.includes(episodeNumber)) {
        importedEpisodes.push(episodeNumber);
      }
    }
  }

  // 如果没有找到具体的集数，尝试从CSV文件中推断
  if (importedEpisodes.length === 0) {
    
    // 查找输出中的数字，可能是集数
    const numbers = output.match(/\b\d+\b/g);
    if (numbers) {
      for (const num of numbers) {
        const episodeNumber = parseInt(num);
        // 假设集数在1-999之间
        if (episodeNumber >= 1 && episodeNumber <= 999) {
          if (!importedEpisodes.includes(episodeNumber)) {
            importedEpisodes.push(episodeNumber);
          }
        }
      }
    }
  }

  // 排序并去重
  const uniqueEpisodes = [...new Set(importedEpisodes)].sort((a, b) => a - b);

  console.log(`[API] 解析到的导入集数: ${uniqueEpisodes.join(', ')}`);

  return uniqueEpisodes;
}
