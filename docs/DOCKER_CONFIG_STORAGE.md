# Docker环境配置存储说明

## 概述

TMDB Helper在Docker环境中支持两种配置存储方式：
1. **Docker命名卷**（推荐）- 由Docker管理的持久化存储
2. **绑定挂载** - 直接映射到宿主机目录

## 配置存储位置

### 容器内路径
- 配置文件：`/app/data/server-config.json`
- 日志文件：`/app/logs/`
- 其他数据：`/app/data/`

### 开发环境路径
- 配置文件：`D:\.background\tmdb-helper\data\server-config.json`
- 其他数据：`D:\.background\tmdb-helper\data\`

## 部署方式

### 方式一：使用Docker命名卷（推荐）

```yaml
# docker-compose.yml
volumes:
  - tmdb_data:/app/data
  - tmdb_logs:/app/logs
```

**优点：**
- 由Docker管理，自动处理权限
- 跨平台兼容性好
- 备份和迁移方便

**数据位置：**
- Windows: `\\wsl$\docker-desktop-data\data\docker\volumes\`
- Linux: `/var/lib/docker/volumes/`
- macOS: `~/Library/Containers/com.docker.docker/Data/vms/0/data/docker/volumes/`

### 方式二：绑定挂载到宿主机

```yaml
# docker-compose.yml
volumes:
  - ./data:/app/data
  - ./logs:/app/logs
```

**优点：**
- 直接访问宿主机文件
- 便于开发和调试
- 配置文件可直接编辑

**注意事项：**
- 需要确保宿主机目录存在
- 需要正确的文件权限（UID 1001）

## 配置管理

### 自动配置迁移

应用启动时会自动：
1. 检测是否为Docker环境
2. 创建必要的目录结构
3. 从localStorage迁移配置（如果需要）
4. 初始化默认配置

### 配置文件结构

```json
{
  "version": "1.0.0",
  "lastUpdated": 1754573343031,
  "tmdbApiKey": "your_api_key_here",
  "tmdbImportPath": "/path/to/tmdb-import",
  "siliconFlowApiKey": "your_silicon_flow_key",
  "siliconFlowThumbnailModel": "Qwen/Qwen2.5-VL-32B-Instruct",
  "modelScopeApiKey": "your_modelscope_key",
  "modelScopeEpisodeModel": "qwen-plus",
  "generalSettings": {},
  "appearanceSettings": {},
  "videoThumbnailSettings": {},
  "taskSchedulerConfig": {}
}
```

## 环境变量配置

可以通过环境变量预设一些配置：

```yaml
environment:
  # TMDB API密钥
  - TMDB_API_KEY=your_tmdb_api_key_here
  
  # Docker环境标识
  - DOCKER_CONTAINER=true
  
  # 其他配置...
```

## 数据备份和恢复

### 备份命名卷数据

```bash
# 创建备份
docker run --rm -v tmdb_data:/data -v $(pwd):/backup alpine tar czf /backup/tmdb_data_backup.tar.gz -C /data .

# 恢复备份
docker run --rm -v tmdb_data:/data -v $(pwd):/backup alpine tar xzf /backup/tmdb_data_backup.tar.gz -C /data
```

### 备份绑定挂载数据

```bash
# 直接复制宿主机目录
cp -r ./data ./data_backup
```

## 权限管理

### Docker用户权限

容器内使用非root用户（UID: 1001, GID: 1001）：
- 用户名：nextjs
- 组名：nodejs

### 宿主机权限设置

如果使用绑定挂载，需要设置正确的权限：

```bash
# Linux/macOS
sudo chown -R 1001:1001 ./data ./logs

# Windows (WSL)
# 通常不需要特殊设置，Docker Desktop会自动处理
```

## 故障排除

### 配置文件权限问题

```bash
# 检查容器内权限
docker exec tmdb-helper ls -la /app/data

# 修复权限
docker exec tmdb-helper chown -R nextjs:nodejs /app/data
```

### 配置文件损坏

```bash
# 查看配置文件
docker exec tmdb-helper cat /app/data/server-config.json

# 重置配置（会删除现有配置）
docker exec tmdb-helper rm /app/data/server-config.json
docker restart tmdb-helper
```

### 数据卷管理

```bash
# 查看所有卷
docker volume ls

# 查看卷详情
docker volume inspect tmdb_data

# 删除卷（注意：会丢失所有数据）
docker volume rm tmdb_data
```

## 最佳实践

1. **生产环境**：使用Docker命名卷
2. **开发环境**：可以使用绑定挂载便于调试
3. **定期备份**：无论使用哪种方式都要定期备份配置
4. **权限管理**：确保容器用户有正确的文件访问权限
5. **监控日志**：关注配置相关的日志输出

## 配置API

应用提供REST API来管理配置：

- `GET /api/config` - 获取完整配置
- `POST /api/config` - 更新配置
- `GET /api/config?key=xxx` - 获取特定配置项
- `GET /api/config?info=true` - 获取配置文件信息

这些API在Docker环境中同样可用，便于自动化管理。
