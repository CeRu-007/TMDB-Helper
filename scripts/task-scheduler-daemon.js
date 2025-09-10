#!/usr/bin/env node

/**
 * 定时任务守护进程
 * 独立运行的后台服务，用于检查和执行错过的定时任务
 * 
 * 使用方法:
 * node scripts/task-scheduler-daemon.js [--port=3000] [--interval=600]
 * 
 * 参数:
 * --port: Next.js 应用运行的端口 (默认: 3000)
 * --interval: 检查间隔，单位秒 (默认: 600，即10分钟)
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

// 解析命令行参数
const args = process.argv.slice(2);
let port = 3000;
let interval = 600; // 10分钟

args.forEach(arg => {
  if (arg.startsWith('--port=')) {
    port = parseInt(arg.split('=')[1]);
  } else if (arg.startsWith('--interval=')) {
    interval = parseInt(arg.split('=')[1]);
  }
});

const baseUrl = `http://localhost:${port}`;
const checkInterval = interval * 1000; // 转换为毫秒

/**
 * 发送HTTP请求
 */
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'TaskSchedulerDaemon/1.0',
        ...options.headers
      }
    };

    const req = client.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            data: jsonData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: data,
            error: 'JSON解析失败'
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

/**
 * 检查定时任务
 */
async function checkScheduledTasks() {
  try {
    console.log(`[TaskSchedulerDaemon] ${new Date().toLocaleString('zh-CN')} - 开始检查定时任务`);
    
    const response = await makeRequest(`${baseUrl}/api/check-scheduled-tasks`);
    
    if (response.statusCode !== 200) {
      
      return;
    }

    const result = response.data;
    
    if (!result.success) {
      
      return;
    }

    // 如果有错过的任务，尝试执行
    if (result.missedTasks > 0) {
      
      for (const missedTask of result.missedTaskDetails) {
        try {
          console.log(`[TaskSchedulerDaemon] 执行错过的任务: ${missedTask.name} (错过 ${missedTask.timeDiff} 分钟)`);
          
          const executeResponse = await makeRequest(`${baseUrl}/api/check-scheduled-tasks`, {
            method: 'POST',
            body: {
              taskId: missedTask.id
            }
          });

          if (executeResponse.statusCode === 200 && executeResponse.data.success) {
            
          } else {
            
          }
        } catch (error) {
          
        }
        
        // 任务之间间隔5秒，避免过载
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    // 显示即将执行的任务
    if (result.upcomingTasks > 0) {
      
      result.upcomingTaskDetails.forEach(task => {
        
      });
    }

  } catch (error) {
    
  }
}

/**
 * 检查服务器是否可用
 */
async function checkServerHealth() {
  try {
    const response = await makeRequest(`${baseUrl}/api/check-scheduled-tasks`);
    return response.statusCode === 200;
  } catch (error) {
    return false;
  }
}

/**
 * 主循环
 */
async function main() {
  
  // 等待服务器启动
  let serverReady = false;
  let retryCount = 0;
  const maxRetries = 30; // 最多等待5分钟
  
  while (!serverReady && retryCount < maxRetries) {
    serverReady = await checkServerHealth();
    if (!serverReady) {
      retryCount++;
      console.log(`[TaskSchedulerDaemon] 服务器未就绪，等待中... (${retryCount}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 10000)); // 等待10秒
    }
  }

  if (!serverReady) {
    
    process.exit(1);
  }

  // 立即执行一次检查
  await checkScheduledTasks();

  // 设置定时检查
  setInterval(async () => {
    await checkScheduledTasks();
  }, checkInterval);

}

// 处理进程退出
process.on('SIGINT', () => {
  
  process.exit(0);
});

process.on('SIGTERM', () => {
  
  process.exit(0);
});

// 守护进程已禁用 - 避免频繁的配置API调用

// 只有明确指定 --enable 参数才启动
const enableFlag = process.argv.includes('--enable');
if (enableFlag) {
  
  main().catch(error => {
    
    process.exit(1);
  });
} else {
  
}
