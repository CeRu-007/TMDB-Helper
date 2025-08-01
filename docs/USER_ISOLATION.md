# 用户数据隔离功能说明

## 概述

本文档说明了 TMDB-Helper 项目中实现的用户数据隔离功能，解决了原本所有用户共享数据的问题。

## 问题背景

在实现用户数据隔离之前，项目存在以下问题：

1. **共享数据存储**：所有用户访问同一个 `data/tmdb_items.json` 文件
2. **无用户身份识别**：没有用户登录、注册或身份验证系统
3. **数据冲突**：多个用户的操作会相互影响
4. **隐私问题**：用户无法拥有私有的数据空间

## 解决方案架构

### 1. 用户身份识别系统

#### UserManager (`lib/user-manager.ts`)
- 使用浏览器指纹 + UUID 生成唯一用户ID
- 通过 localStorage 和 cookie 维护用户会话
- 支持用户显示名称自定义
- 提供会话验证和重置功能

#### 用户ID格式
```
user_[16位十六进制字符串]
例如: user_a1b2c3d4e5f6g7h8
```

### 2. 数据隔离存储

#### 目录结构
```
data/
├── users/
│   ├── user_a1b2c3d4e5f6g7h8/
│   │   ├── tmdb_items.json
│   │   └── scheduled_tasks.json
│   └── user_x9y8z7w6v5u4t3s2/
│       ├── tmdb_items.json
│       └── scheduled_tasks.json
└── tmdb_items_backup_[timestamp].json (迁移备份)
```

#### UserAwareStorage (`lib/user-aware-storage.ts`)
- 为每个用户创建独立的数据文件
- 提供用户专属的 CRUD 操作
- 支持数据迁移和备份
- 包含用户统计和管理功能

### 3. API层改造

#### 用户身份API (`app/api/user/route.ts`)
- `GET /api/user` - 获取或创建用户ID
- `POST /api/user` - 更新用户信息
- `DELETE /api/user` - 清除用户数据

#### 存储API改造
所有存储相关的API都已更新以支持用户隔离：
- `GET /api/storage/items` - 获取用户专属项目
- `POST /api/storage/item` - 添加项目到用户数据
- `PUT /api/storage/item` - 更新用户项目
- `DELETE /api/storage/item` - 删除用户项目

#### 数据迁移API (`app/api/migrate-data/route.ts`)
- `GET /api/migrate-data` - 获取迁移状态
- `POST /api/migrate-data` - 执行数据迁移
- `DELETE /api/migrate-data` - 清理用户数据（开发环境）

#### 数据导入导出API (`app/api/user/data/route.ts`)
- `GET /api/user/data` - 导出用户数据为JSON格式
- `POST /api/user/data` - 导入用户数据（支持合并/替换模式）
- `DELETE /api/user/data` - 清空用户数据

### 4. 前端集成

#### UserIdentityProvider (`components/user-identity-provider.tsx`)
- React Context 提供用户身份状态
- 自动初始化用户会话
- 提供用户信息更新和重置功能
- 包含用户头像和资料对话框组件

#### UserAvatar 组件
- 显示在页面右上角导航栏的用户头像
- 支持桌面端显示用户名，移动端仅显示头像
- 点击头像打开用户资料对话框
- 自适应深色/浅色主题

#### UserProfileDialog 组件
- 完整的用户资料管理界面
- 支持编辑用户显示名称
- 显示账户信息和数据统计
- 提供重置用户数据功能
- 响应式设计，支持移动端

#### 客户端存储管理器更新
- `StorageManager` 自动在API请求中包含用户ID
- 支持用户感知的数据操作
- 保持向后兼容性

## 使用方式

### 1. 自动用户识别

用户首次访问时，系统会自动：
1. 生成唯一的用户ID
2. 创建用户专属的数据目录
3. 设置会话cookie和localStorage
4. 初始化用户信息

### 2. 数据迁移

对于现有部署，系统会自动：
1. 检测是否存在旧的共享数据文件
2. 将数据迁移到默认用户目录
3. 创建备份文件
4. 删除原始共享文件

### 3. 用户界面交互

#### 导航栏用户头像
- 位置：页面右上角导航栏
- 显示：圆形头像 + 用户名（桌面端）+ 下拉箭头
- 交互：点击打开下拉菜单

#### 用户下拉菜单（桌面端）
功能菜单包含：
- **个人资料**：可展开编辑显示名称和查看账户信息
- **数据统计**：显示项目数量、使用天数、登录次数、使用时长等
- **导出数据**：将用户数据导出为JSON文件
- **导入数据**：从JSON文件导入数据（支持合并/替换模式）
- **主题切换**：快速切换深色/浅色主题
- **帮助文档**：打开GitHub帮助页面
- **关于应用**：显示应用版本信息
- **重置数据**：清除所有用户数据

#### 移动端抽屉菜单
- 底部弹出的抽屉式设计
- 包含主要功能的简化版本
- 支持拖拽指示器和背景遮罩
- 优化的触摸交互体验

#### 交互特性
- **键盘导航**：ESC键关闭菜单，方向键打开菜单
- **点击外部关闭**：点击菜单外部区域自动关闭
- **动画效果**：平滑的展开/收起动画
- **响应式适配**：桌面端下拉菜单，移动端抽屉菜单

## 技术特性

### 1. 安全性
- 用户ID基于浏览器指纹生成，难以伪造
- 服务器端验证用户身份
- 数据文件物理隔离

### 2. 兼容性
- 与现有功能完全兼容
- 支持 Zeabur 等云部署平台
- 自动处理数据迁移

### 3. 性能
- 用户数据按需加载
- 文件系统级别的数据隔离
- 最小化内存占用

### 4. 可维护性
- 清晰的代码结构
- 完整的错误处理
- 详细的日志记录

## 部署注意事项

### 1. Zeabur 部署
- 确保 `data/users/` 目录有写入权限
- 数据会持久化存储在容器中
- 支持多实例部署（每个实例独立）

### 2. 环境变量
无需额外的环境变量配置，系统会自动工作。

### 3. 数据备份
- 系统会自动创建迁移备份
- 建议定期备份 `data/users/` 目录
- 支持数据导入导出功能

## 测试验证

使用 `UserIsolationTest` 组件可以验证：
1. 用户ID生成是否正常
2. 数据隔离是否有效
3. API集成是否正确
4. 迁移功能是否工作

## 故障排除

### 1. 用户ID丢失
- 检查 localStorage 和 cookie
- 重新初始化用户会话
- 查看浏览器控制台错误

### 2. 数据访问问题
- 验证用户ID格式
- 检查文件权限
- 查看服务器日志

### 3. 迁移失败
- 检查原始数据文件格式
- 验证目标目录权限
- 手动执行迁移API

## 未来改进

1. **用户认证**：添加密码或其他认证方式
2. **数据共享**：支持用户间数据共享
3. **管理界面**：添加用户管理后台
4. **数据同步**：支持多设备数据同步
5. **访问控制**：更细粒度的权限控制

## 总结

用户数据隔离功能成功解决了原有的数据共享问题，为每个用户提供了独立、安全的数据空间。该实现具有良好的兼容性、性能和可维护性，适合在生产环境中使用。
