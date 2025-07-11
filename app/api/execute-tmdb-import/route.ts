import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs'
import { BrowserInterruptDetector } from '@/lib/browser-interrupt-detector';

/**
 * POST /api/execute-tmdb-import - 执行TMDB导入
 */
export async function POST(request: NextRequest) {
  try {
    console.log(`[API] 开始处理TMDB导入请求`);

    let requestBody;
    try {
      requestBody = await request.json();
      console.log(`[API] 请求体解析成功:`, requestBody);
    } catch (parseError) {
      console.error(`[API] 请求体解析失败:`, parseError);
      return NextResponse.json({
        success: false,
        error: '请求体解析失败'
      }, { status: 400 });
    }

    const { csvPath, seasonNumber, itemId, tmdbId, conflictAction = 'w' } = requestBody;
    
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
    
    console.log(`[API] 执行TMDB导入: CSV=${csvPath}, Season=${seasonNumber}, TMDB ID=${tmdbId}, Item ID=${itemId}`);

    // 检查CSV文件是否存在
    try {
      if (!fs.existsSync(csvPath)) {
        console.error(`[API] CSV文件不存在: ${csvPath}`);
        return NextResponse.json({
          success: false,
          error: 'CSV文件不存在',
          details: { csvPath }
        }, { status: 404 });
      }

      const fileStats = fs.statSync(csvPath);
      console.log(`[API] CSV文件存在，大小: ${fileStats.size} 字节`);

      if (fileStats.size === 0) {
        console.error(`[API] CSV文件为空: ${csvPath}`);
        return NextResponse.json({
          success: false,
          error: 'CSV文件为空',
          details: { csvPath }
        }, { status: 400 });
      }
    } catch (fsError) {
      console.error(`[API] 文件系统操作失败:`, fsError);
      return NextResponse.json({
        success: false,
        error: '文件系统操作失败',
        details: { error: fsError instanceof Error ? fsError.message : String(fsError) }
      }, { status: 500 });
    }
    
    // 查找TMDB-Import目录
    const tmdbImportDir = path.resolve(process.cwd(), 'TMDB-Import-master');
    console.log(`[API] 检查TMDB-Import目录: ${tmdbImportDir}`);

    try {
      if (!fs.existsSync(tmdbImportDir)) {
        console.error(`[API] TMDB-Import目录不存在: ${tmdbImportDir}`);
        return NextResponse.json({
          success: false,
          error: '找不到TMDB-Import目录',
          details: { expectedPath: tmdbImportDir }
        }, { status: 500 });
      }

      // 检查目录是否可读
      const dirStats = fs.statSync(tmdbImportDir);
      if (!dirStats.isDirectory()) {
        console.error(`[API] TMDB-Import路径不是目录: ${tmdbImportDir}`);
        return NextResponse.json({
          success: false,
          error: 'TMDB-Import路径不是目录',
          details: { path: tmdbImportDir }
        }, { status: 400 });
      }

      console.log(`[API] TMDB-Import目录验证成功`);
    } catch (dirError) {
      console.error(`[API] TMDB-Import目录检查失败:`, dirError);
      return NextResponse.json({
        success: false,
        error: 'TMDB-Import目录检查失败',
        details: { error: dirError instanceof Error ? dirError.message : String(dirError) }
      }, { status: 500 });
    }
    
    // 构建TMDB导入命令
    const tmdbUrl = `https://www.themoviedb.org/tv/${tmdbId}/season/${seasonNumber}?language=zh-CN`;

    console.log(`[API] 执行TMDB导入命令: python -m tmdb-import "${tmdbUrl}"`);
    console.log(`[API] 工作目录: ${tmdbImportDir}`);
    console.log(`[API] 冲突处理选项: ${conflictAction}`);

    try {
      console.log(`[API] 开始执行TMDB导入进程`);

      let result;
      try {
        result = await executeTMDBImportWithInteraction(tmdbImportDir, tmdbUrl, conflictAction);
        console.log(`[API] TMDB导入进程执行完成，结果:`, { success: result.success, hasError: !!result.error });
      } catch (processError) {
        console.error(`[API] 进程执行异常:`, processError);

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
        console.error(`[API] TMDB导入进程失败:`, result.error);
        console.error(`[API] 进程输出 (stdout):`, result.stdout?.substring(0, 500) || '无输出');
        console.error(`[API] 进程错误 (stderr):`, result.stderr?.substring(0, 500) || '无错误输出');

        // 使用浏览器中断检测器分析错误
        const interruptResult = BrowserInterruptDetector.analyzeError(
          { message: result.error || 'TMDB导入进程失败' },
          result.stdout,
          result.stderr
        );

        console.log(`[API] 错误分析结果:`, interruptResult);

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
        console.error(`[API] 解析导入集数失败:`, parseError);
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
      console.error(`[API] TMDB导入命令执行失败:`, execError);
      console.error(`[API] 错误堆栈:`, execError.stack);

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
    console.error('[API] TMDB导入API顶层错误:', error);
    console.error('[API] 错误类型:', typeof error);
    console.error('[API] 错误堆栈:', error instanceof Error ? error.stack : '无堆栈信息');

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
    console.log(`[API] 启动TMDB导入进程，冲突处理: ${conflictAction}`);
    console.log(`[API] 命令: python -m tmdb-import "${tmdbUrl}"`);
    console.log(`[API] 工作目录: ${workingDir}`);

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

      console.log(`[API] 进程启动成功，PID: ${child.pid}`);

      // 检查进程是否真的启动了
      if (!child.pid) {
        console.error(`[API] 进程启动失败：无法获取进程ID`);
        safeResolve({
          success: false,
          stdout: '',
          stderr: '',
          error: '进程启动失败：无法获取进程ID'
        });
        return;
      }

    } catch (spawnError) {
      console.error(`[API] 进程启动失败:`, spawnError);
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
        console.log(`[API] TMDB导入超时，正在终止进程`);

        try {
          child.kill('SIGTERM');
          // 如果SIGTERM不起作用，5秒后强制终止
          setTimeout(() => {
            if (!child.killed) {
              child.kill('SIGKILL');
            }
          }, 5000);
        } catch (killError) {
          console.error(`[API] 终止进程失败:`, killError);
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

        console.log(`[API] 检测到交互式提示，自动回答: ${conflictAction}`);

        // 自动回答
        try {
          child.stdin.write(`${conflictAction}\n`);
        } catch (stdinError) {
          console.error(`[API] 写入stdin失败:`, stdinError);
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
        console.error(`[API] 检测到致命错误，准备终止进程`);
      }
    });

    // 监听进程结束
    child.on('close', (code, signal) => {
      clearTimeout(timeout);

      if (!hasResolved) {
        console.log(`[API] TMDB导入进程结束，退出码: ${code}, 信号: ${signal}`);

        if (code === 0) {
          console.log(`[API] TMDB导入进程成功结束`);
          safeResolve({
            success: true,
            stdout,
            stderr
          });
        } else {
          console.error(`[API] TMDB导入进程异常结束，退出码: ${code}, 信号: ${signal}`);
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
        console.error(`[API] TMDB导入进程错误:`, error);
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
  
  console.log(`[API] 解析导入的集数，输出内容:`, output);
  
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
    console.log(`[API] 无法从输出解析集数，尝试其他方法`);
    
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
