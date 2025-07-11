# 定时任务调度系统

## 问题描述

原有的定时任务系统存在以下问题：
- 定时任务依赖浏览器环境运行
- 当开发服务器关闭时，所有定时器都会被清除
- 重启后需要重新初始化，可能错过预定的执行时间

## 解决方案

新的定时任务系统提供了多层保障：

### 1. 客户端增强检查
- 启动时检查错过的任务
- 定期检查错过的任务（每10分钟）
- 自动补偿执行错过的任务（24小时内）

### 2. 服务端API支持
- `/api/check-scheduled-tasks` - 检查定时任务状态
- 支持GET请求查看任务状态
- 支持POST请求执行错过的任务

### 3. 独立守护进程
- 可以独立于主应用运行
- 定期检查并执行错过的任务
- 即使主应用关闭也能保持任务调度

## 使用方法

### 方法一：使用批处理文件（推荐）

1. 双击运行 `scripts/start-task-daemon.bat`
2. 守护进程将自动启动并开始监控任务

### 方法二：使用npm脚本

```bash
# 启动守护进程（生产环境，10分钟检查一次）
npm run task-daemon

# 启动守护进程（开发环境，5分钟检查一次）
npm run task-daemon:dev
```

### 方法三：直接运行Node.js脚本

```bash
# 基本用法
node scripts/task-scheduler-daemon.js

# 自定义端口和检查间隔
node scripts/task-scheduler-daemon.js --port=3000 --interval=300
```

## 参数说明

- `--port`: Next.js应用运行的端口（默认：3000）
- `--interval`: 检查间隔，单位秒（默认：600，即10分钟）

## 工作原理

### 错过任务检测
1. 系统会检查每个启用任务的 `nextRun` 时间
2. 如果当前时间超过预定时间5分钟以上，认为是错过的任务
3. 只有在24小时内错过的任务才会被补偿执行

### 任务执行流程
1. 守护进程定期调用 `/api/check-scheduled-tasks`
2. API返回错过的任务列表
3. 守护进程逐个调用 `/api/check-scheduled-tasks` (POST) 执行任务
4. 任务执行完成后，系统会自动重新调度下次执行

### 安全机制
- 任务执行前会验证关联项目是否存在
- 检查任务是否仍然启用
- 避免重复执行正在运行的任务
- 任务间有5秒间隔，防止系统过载

## 日志说明

守护进程会输出详细的日志信息：

```
[TaskSchedulerDaemon] 启动定时任务守护进程
[TaskSchedulerDaemon] 目标服务器: http://localhost:3000
[TaskSchedulerDaemon] 检查间隔: 600 秒
[TaskSchedulerDaemon] 2024-01-01 12:00:00 - 开始检查定时任务
[TaskSchedulerDaemon] 任务检查完成 - 总任务: 5, 启用: 3, 错过: 1, 即将执行: 2
[TaskSchedulerDaemon] 发现 1 个错过的任务，开始执行
[TaskSchedulerDaemon] 执行错过的任务: 示例任务 (错过 15 分钟)
[TaskSchedulerDaemon] 任务执行成功: 示例任务
```

## 最佳实践

### 开发环境
1. 启动Next.js开发服务器：`npm run dev`
2. 在另一个终端启动守护进程：`npm run task-daemon:dev`

### 生产环境
1. 构建并启动应用：`npm run build && npm run start`
2. 启动守护进程：`npm run task-daemon`

### 服务器部署
建议使用进程管理器（如PM2）来管理守护进程：

```bash
# 安装PM2
npm install -g pm2

# 启动守护进程
pm2 start scripts/task-scheduler-daemon.js --name "task-scheduler"

# 查看状态
pm2 status

# 查看日志
pm2 logs task-scheduler
```

## 故障排除

### 守护进程无法启动
1. 检查Node.js是否正确安装
2. 确认Next.js应用正在运行
3. 检查端口是否正确

### 任务未执行
1. 检查任务是否启用
2. 确认任务的 `nextRun` 时间设置正确
3. 查看守护进程日志了解详细错误信息

### 重复执行
- 系统有防重复执行机制，正常情况下不会重复执行
- 如果发现重复执行，请检查是否启动了多个守护进程实例

## 技术细节

### API接口

#### GET /api/check-scheduled-tasks
返回任务状态概览：
```json
{
  "success": true,
  "totalTasks": 5,
  "enabledTasks": 3,
  "missedTasks": 1,
  "upcomingTasks": 2,
  "missedTaskDetails": [...],
  "upcomingTaskDetails": [...]
}
```

#### POST /api/check-scheduled-tasks
执行指定的错过任务：
```json
{
  "taskId": "task-uuid"
}
```

### 数据存储
- 任务配置存储在浏览器的localStorage中
- 守护进程通过API接口访问任务数据
- 支持服务端文件存储作为备份

这个系统确保了即使在开发服务器重启的情况下，定时任务也能够被正确执行，解决了原有系统的可靠性问题。
