# 桌面应用构建命令

## 🚀 快速开始

### 构建Windows版本 (推荐)
```bash
pnpm run electron:build
```

### 智能多平台构建
```bash
# 自动检测当前平台并构建合适的版本
pnpm run electron:build:smart
```

## 📦 所有构建命令

### 单平台构建
```bash
# Windows版本
pnpm run electron:build:win

# macOS版本 (仅在macOS系统上可用)
pnpm run electron:build:mac

# Linux版本
pnpm run electron:build:linux
```

### 多平台构建
```bash
# Windows + Linux (适用于Windows/Linux开发环境)
pnpm run electron:build:all

# 所有平台 (需要在macOS上运行才能构建macOS版本)
pnpm run electron:build:all-platforms
```

## 🎯 平台限制

| 开发平台 | 可构建目标 | 说明 |
|---------|-----------|------|
| Windows | Windows + Linux | macOS构建需要在macOS上进行 |
| macOS   | Windows + macOS + Linux | 可构建所有平台 |
| Linux   | Windows + Linux | macOS构建需要在macOS上进行 |

## 💡 使用建议

### 对于项目维护者
- 日常开发：使用 `pnpm run electron:build`
- 测试多平台：使用 `pnpm run electron:build:smart`

### 对于贡献者
- **Windows用户**：可以帮助构建Windows和Linux版本
- **macOS用户**：可以帮助构建macOS版本
- **Linux用户**：可以帮助构建Linux版本

## 📊 优化效果

- **体积优化**：从 600MB+ 减少到 100-150MB (减少60-80%)
- **构建速度**：优化了文件包含策略，构建更快
- **多平台支持**：Windows、macOS、Linux全平台支持

## 🔧 构建输出

构建完成后，安装包会生成在 `dist/` 目录：

```
dist/
├── TMDB Helper Setup 0.3.7.exe        # Windows安装包
├── TMDB Helper-0.3.7.dmg              # macOS磁盘映像
├── TMDB Helper-0.3.7.AppImage         # Linux AppImage
└── tmdb-helper_0.3.7_amd64.deb        # Linux DEB包
```

## ⚠️ 注意事项

1. **首次构建**可能需要下载平台相关的Electron二进制文件
2. **macOS构建**需要在macOS系统上进行，这是Apple的限制
3. **代码签名**：macOS和Windows的发布版本需要相应的开发者证书
