// CSV格式修复工具 - 简化版本
// 使用直接的文件操作和正则表达式替换修复CSV文件

const fs = require('fs');
const path = require('path');

// 控制台颜色
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

// 日志函数
function log(message, color = colors.reset) {
  const time = new Date().toLocaleTimeString();
  console.log(`${color}[${time}] ${message}${colors.reset}`);
}

/**
 * 修复CSV文件格式
 * 直接使用正则表达式查找并替换问题行
 * @param {string} filePath CSV文件路径
 * @returns {boolean} 是否成功修复
 */
function fixCsvFile(filePath) {
  try {
    log(`开始处理文件: ${filePath}`, colors.cyan);
    
    // 确保文件存在
    if (!fs.existsSync(filePath)) {
      log(`错误: 文件不存在 ${filePath}`, colors.red);
      return false;
    }
    
    // 读取文件
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      log(`读取文件失败，尝试使用不同编码...`, colors.yellow);
      // 尝试其他编码
      try {
        content = fs.readFileSync(filePath, 'latin1');
      } catch (err2) {
        log(`无法读取文件: ${err2.message}`, colors.red);
        return false;
      }
    }
    
    log(`文件已读取，大小: ${content.length} 字节`, colors.cyan);
    
    // 解析CSV表头，确定overview和backdrop的位置
    const lines = content.split('\n');
    if (lines.length <= 1) {
      log("文件内容太少，无法处理", colors.red);
      return false;
    }
    
    const header = lines[0].toLowerCase();
    log(`表头: ${header}`, colors.cyan);
    
    // 直接使用正则表达式查找并修复URL错位问题
    // 查找模式: 行开头有数字和逗号，后跟一些非逗号字符，然后是http或https URL在概述位置，而backdrop位置为空
    const regex = /^(\d+,[^,]+,[^,]+,\d+),https:\/\/([^,]+),(.*)$/gm;
    const fixedContent = content.replace(regex, '$1,,https://$2,$3');
    
    // 如果内容已修改，写入文件
    if (fixedContent !== content) {
      log("检测到并修复了URL错位问题", colors.green);
      fs.writeFileSync(filePath, fixedContent, 'utf8');
      log("文件已保存", colors.green);
      return true;
    } else {
      log("未检测到需要修复的问题", colors.cyan);
      return true;
    }
    
  } catch (error) {
    log(`处理过程中出错: ${error.message}`, colors.red);
    return false;
  }
}

/**
 * 监视CSV文件变化
 * @param {string} filePath 
 */
function watchCsvFile(filePath) {
  log(`开始监视文件: ${filePath}`, colors.cyan);
  
  // 首次运行
  fixCsvFile(filePath);
  
  // 监视文件变化
  fs.watch(filePath, (eventType) => {
    if (eventType === 'change') {
      log(`检测到文件变化`, colors.yellow);
      // 延迟处理，确保文件写入完成
      setTimeout(() => {
        fixCsvFile(filePath);
      }, 1000);
    }
  });
  
  log("监视器已启动，按Ctrl+C退出", colors.green);
}

// 主程序
if (require.main === module) {
  const csvPath = process.argv[2];
  const isWatchMode = process.argv.includes('--watch');
  
  if (!csvPath) {
    log("错误: 请提供CSV文件路径", colors.red);
    process.exit(1);
  }
  
  if (isWatchMode) {
    watchCsvFile(csvPath);
  } else {
    const success = fixCsvFile(csvPath);
    process.exit(success ? 0 : 1);
  }
} 