# TMDB Helper 构建指南

## 🚀 标准构建命令

### 开发环境
```bash
# 启动开发服务器
pnpm run dev

# 启动Electron开发环境
pnpm run electron:dev
```

### 生产构建
```bash
# 构建Next.js应用
pnpm run build

# 打包Windows桌面应用
pnpm run electron:build

# 打包macOS桌面应用
pnpm run electron:build:mac

# 打包Linux桌面应用
pnpm run electron:build:linux

# 打包所有平台
pnpm run electron:build:all

# 智能多平台构建（根据当前系统选择可用平台）
pnpm run electron:build:smart
```

### Docker部署
```bash
# 构建Docker镜像
pnpm run docker:build

# 运行Docker容器
pnpm run docker:run

# 开发环境Docker
pnpm run docker:dev
```

## 🔧 构建优化

所有构建命令已自动集成以下优化：

### 性能优化
- ✅ 限制V8内存使用（512MB）
- ✅ 禁用不必要的Electron功能
- ✅ 优化webpack配置
- ✅ 启用代码压缩和tree-shaking

### 体积优化
- ✅ 排除开发文件和大型目录
- ✅ 优化node_modules包含策略
- ✅ 智能asar打包
- ✅ 最大压缩设置

### 资源优化
- ✅ 自动包含所有必要的静态资源
- ✅ 优化图片和logo文件
- ✅ 清理缓存和临时文件

## 📁 构建产物

构建完成后，产物位于：
- `dist/` - Electron应用安装包
- `.next/` - Next.js构建产物

## 🛠️ 故障排除

### 常见问题

1. **构建失败**
   ```bash
   # 清理缓存重试
   rm -rf .next dist node_modules/.cache
   pnpm install
   pnpm run build
   ```

2. **权限问题**
   - Windows: 以管理员身份运行终端
   - macOS/Linux: 检查文件权限

3. **内存不足**
   - 关闭其他应用程序
   - 增加系统虚拟内存

### 构建要求

- **Node.js**: >= 18.0.0
- **pnpm**: >= 8.0.0
- **内存**: >= 4GB 可用内存
- **磁盘**: >= 2GB 可用空间

## 📊 性能指标

优化后的预期性能：
- 🚀 **启动时间**: < 3秒
- 💾 **内存占用**: 150-200MB
- 🔥 **CPU使用**: 10-15%
- 📦 **安装包**: 80-120MB

## 🔄 版本发布

1. 更新版本号
   ```bash
   npm version patch  # 或 minor/major
   ```

2. 构建所有平台
   ```bash
   pnpm run electron:build:all
   ```

3. 测试安装包
4. 发布到GitHub Releases

---

**注意**: 所有优化已集成到标准构建流程中，无需额外命令。
