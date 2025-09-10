// 内存监控和优化
const { app } = require('electron');

let memoryCheckInterval;

function startMemoryMonitoring() {
  memoryCheckInterval = setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const heapUsed = Math.round(memoryUsage.heapUsed / 1024 / 1024);

    // 如果内存使用超过200MB，触发垃圾回收
    if (heapUsed > 200) {
      if (global.gc) {
        global.gc();
        
      }
    }
  }, 60000); // 每分钟检查一次
}

function stopMemoryMonitoring() {
  if (memoryCheckInterval) {
    clearInterval(memoryCheckInterval);
  }
}

module.exports = {
  startMemoryMonitoring,
  stopMemoryMonitoring
};