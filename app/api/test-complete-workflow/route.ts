import { NextRequest, NextResponse } from 'next/server';
import { StorageManager } from '@/lib/storage';
import path from 'path';
import fs from 'fs/promises';

/**
 * POST /api/test-complete-workflow - 测试完整的5步工作流程
 */
export async function POST(request: NextRequest) {
  try {
    const { itemId, seasonNumber = 1, simulateOnly = true } = await request.json();
    
    if (!itemId) {
      return NextResponse.json({
        success: false,
        error: '缺少itemId参数'
      }, { status: 400 });
    }
    
    console.log(`[API] 测试完整工作流程: itemId=${itemId}, seasonNumber=${seasonNumber}, 模拟模式=${simulateOnly}`);
    
    // 获取项目数据
    const items = await StorageManager.getItemsWithRetry();
    const item = items.find(i => i.id === itemId);
    
    if (!item) {
      return NextResponse.json({
        success: false,
        error: '找不到指定的项目',
        details: { itemId }
      }, { status: 404 });
    }
    
    const workflowResult = {
      item: {
        id: item.id,
        title: item.title,
        platformUrl: item.platformUrl
      },
      steps: {
        step1_platformExtraction: null as any,
        step2_csvProcessing: null as any,
        step3_tmdbImport: null as any,
        step4_episodeMarking: null as any
      },
      summary: {
        initialMarkedEpisodes: [] as number[],
        csvRemainingEpisodes: [] as number[],
        finalMarkedEpisodes: [] as number[],
        newlyMarkedEpisodes: [] as number[]
      }
    };
    
    // 获取初始已标记的集数
    const initialMarkedEpisodes: number[] = [];
    if (item.seasons && item.seasons.length > 0) {
      const targetSeason = item.seasons.find(s => s.seasonNumber === seasonNumber);
      if (targetSeason && targetSeason.episodes) {
        targetSeason.episodes.forEach(episode => {
          if (episode.completed) {
            initialMarkedEpisodes.push(episode.number);
          }
        });
      }
    } else if (item.episodes) {
      item.episodes.forEach(episode => {
        if (episode.completed) {
          initialMarkedEpisodes.push(episode.number);
        }
      });
    }
    
    workflowResult.summary.initialMarkedEpisodes = initialMarkedEpisodes.sort((a, b) => a - b);
    console.log(`[API] 初始已标记集数: [${workflowResult.summary.initialMarkedEpisodes.join(', ')}]`);
    
    // 步骤1: 模拟播出平台抓取（查找现有CSV文件）
    console.log(`[API] 步骤1: 查找现有CSV文件（模拟播出平台抓取）`);
    const tmdbImportDir = path.resolve(process.cwd(), 'TMDB-Import-master');
    let csvPath = '';
    
    try {
      const files = await fs.readdir(tmdbImportDir);
      const csvFiles = files.filter(file => file.endsWith('.csv') && !file.includes('_backup_'));
      
      if (csvFiles.length === 0) {
        throw new Error('在TMDB-Import目录中找不到CSV文件');
      }
      
      // 使用最新的CSV文件
      const csvFilesWithStats = await Promise.all(
        csvFiles.map(async file => {
          const filePath = path.join(tmdbImportDir, file);
          const stats = await fs.stat(filePath);
          return { file, filePath, mtime: stats.mtime };
        })
      );
      
      csvFilesWithStats.sort((a, b) => b.mtime.getTime() - a.mtime.getTime());
      csvPath = csvFilesWithStats[0].filePath;
      
      workflowResult.steps.step1_platformExtraction = {
        success: true,
        csvPath: csvPath,
        message: '找到现有CSV文件'
      };
      
    } catch (error) {
      workflowResult.steps.step1_platformExtraction = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
      
      return NextResponse.json({
        success: false,
        error: '步骤1失败',
        details: workflowResult
      }, { status: 500 });
    }
    
    // 步骤2: CSV处理（删除已标记集数）
    console.log(`[API] 步骤2: 测试CSV处理`);
    try {
      const csvResponse = await fetch(`${request.nextUrl.origin}/api/process-csv-episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          csvPath: csvPath,
          markedEpisodes: workflowResult.summary.initialMarkedEpisodes,
          platformUrl: item.platformUrl,
          itemId: item.id,
          testMode: simulateOnly
        })
      });
      
      if (!csvResponse.ok) {
        throw new Error(`CSV处理失败: ${csvResponse.statusText}`);
      }
      
      const csvResult = await csvResponse.json();
      workflowResult.steps.step2_csvProcessing = csvResult;
      
    } catch (error) {
      workflowResult.steps.step2_csvProcessing = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
    
    // 步骤3: 分析CSV剩余集数（模拟TMDB导入后的结果）
    console.log(`[API] 步骤3: 分析CSV剩余集数`);
    try {
      const csvToAnalyze = simulateOnly ? csvPath : (workflowResult.steps.step2_csvProcessing?.processedCsvPath || csvPath);
      
      // 读取CSV文件获取剩余集数
      const csvContent = await fs.readFile(csvToAnalyze, 'utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim() !== '');
      
      const csvRemainingEpisodes: number[] = [];
      
      if (lines.length > 1) {
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        const episodeColumnIndex = headers.findIndex(h => 
          h.toLowerCase().includes('episode') && h.toLowerCase().includes('number')
        );
        
        if (episodeColumnIndex !== -1) {
          const dataLines = lines.slice(1);
          
          for (const line of dataLines) {
            const columns = line.split(',').map(c => c.trim().replace(/"/g, ''));
            if (columns.length > episodeColumnIndex) {
              const episodeNumber = parseInt(columns[episodeColumnIndex]);
              if (!isNaN(episodeNumber)) {
                csvRemainingEpisodes.push(episodeNumber);
              }
            }
          }
        }
      }
      
      workflowResult.summary.csvRemainingEpisodes = csvRemainingEpisodes.sort((a, b) => a - b);
      workflowResult.steps.step3_tmdbImport = {
        success: true,
        csvAnalyzed: csvToAnalyze,
        remainingEpisodes: workflowResult.summary.csvRemainingEpisodes,
        message: `分析完成，CSV中剩余 ${csvRemainingEpisodes.length} 个集数`
      };
      
    } catch (error) {
      workflowResult.steps.step3_tmdbImport = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
    
    // 步骤4: 模拟标记集数
    console.log(`[API] 步骤4: 模拟标记剩余集数为已完成`);
    try {
      const episodesToMark = workflowResult.summary.csvRemainingEpisodes;
      
      if (episodesToMark.length > 0) {
        if (simulateOnly) {
          // 模拟模式：只计算会标记哪些集数
          const newlyMarkedEpisodes = episodesToMark.filter(ep => 
            !workflowResult.summary.initialMarkedEpisodes.includes(ep)
          );
          
          workflowResult.summary.newlyMarkedEpisodes = newlyMarkedEpisodes;
          workflowResult.summary.finalMarkedEpisodes = [
            ...workflowResult.summary.initialMarkedEpisodes,
            ...newlyMarkedEpisodes
          ].sort((a, b) => a - b);
          
          workflowResult.steps.step4_episodeMarking = {
            success: true,
            simulated: true,
            episodesToMark: episodesToMark,
            newlyMarked: newlyMarkedEpisodes,
            message: `模拟模式：将标记 ${newlyMarkedEpisodes.length} 个新集数`
          };
          
        } else {
          // 实际执行标记
          const markResponse = await fetch(`${request.nextUrl.origin}/api/mark-episodes-completed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemId: item.id,
              seasonNumber: seasonNumber,
              episodeNumbers: episodesToMark
            })
          });
          
          if (!markResponse.ok) {
            throw new Error(`标记集数失败: ${markResponse.statusText}`);
          }
          
          const markResult = await markResponse.json();
          workflowResult.steps.step4_episodeMarking = markResult;
          
          // 重新获取最终状态
          const updatedItems = await StorageManager.getItemsWithRetry();
          const updatedItem = updatedItems.find(i => i.id === itemId);
          
          if (updatedItem) {
            const finalMarkedEpisodes: number[] = [];
            if (updatedItem.seasons && updatedItem.seasons.length > 0) {
              const targetSeason = updatedItem.seasons.find(s => s.seasonNumber === seasonNumber);
              if (targetSeason && targetSeason.episodes) {
                targetSeason.episodes.forEach(episode => {
                  if (episode.completed) {
                    finalMarkedEpisodes.push(episode.number);
                  }
                });
              }
            } else if (updatedItem.episodes) {
              updatedItem.episodes.forEach(episode => {
                if (episode.completed) {
                  finalMarkedEpisodes.push(episode.number);
                }
              });
            }
            
            workflowResult.summary.finalMarkedEpisodes = finalMarkedEpisodes.sort((a, b) => a - b);
            workflowResult.summary.newlyMarkedEpisodes = finalMarkedEpisodes.filter(ep => 
              !workflowResult.summary.initialMarkedEpisodes.includes(ep)
            );
          }
        }
      } else {
        workflowResult.steps.step4_episodeMarking = {
          success: true,
          message: '没有需要标记的集数'
        };
      }
      
    } catch (error) {
      workflowResult.steps.step4_episodeMarking = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
    
    // 生成总结报告
    const allStepsSuccessful = Object.values(workflowResult.steps).every(step => step?.success);
    
    return NextResponse.json({
      success: true,
      simulateOnly,
      workflowResult,
      allStepsSuccessful,
      summary: {
        ...workflowResult.summary,
        workflowComplete: allStepsSuccessful,
        totalSteps: 4,
        successfulSteps: Object.values(workflowResult.steps).filter(step => step?.success).length
      }
    }, { status: 200 });
    
  } catch (error) {
    console.error('[API] 测试完整工作流程失败:', error);
    return NextResponse.json({
      success: false,
      error: '测试失败',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
