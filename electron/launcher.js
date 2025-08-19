// 性能优化的启动配置
process.env.NODE_OPTIONS = '--max-old-space-size=512 --optimize-for-size';

// 禁用不必要的Node.js功能
process.env.UV_THREADPOOL_SIZE = '2'; // 减少线程池大小
process.env.NODE_NO_WARNINGS = '1'; // 禁用警告

// 启动主进程
require('./main.js');