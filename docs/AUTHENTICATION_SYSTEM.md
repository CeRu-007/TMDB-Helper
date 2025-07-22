# TMDB Helper 认证系统说明

## 概述

TMDB Helper 已升级为单用户认证模式，适合个人部署和Docker容器化使用。系统保留了原有的用户界面和数据隔离功能，但现在需要通过用户名和密码登录。

## 功能特性

### 🔐 认证功能
- **单用户模式**：支持一个管理员账户
- **安全登录**：用户名+密码认证
- **会话管理**：JWT token + httpOnly cookie
- **记住我**：可选的延长登录有效期
- **密码加密**：使用bcrypt加密存储

### 🎨 用户界面
- **精美登录页**：符合应用设计风格的登录界面
- **保持原有UI**：用户下拉菜单和所有功能保持不变
- **响应式设计**：支持桌面端和移动端
- **主题支持**：支持深色/浅色主题

### 🐳 容器化支持
- **环境变量配置**：支持通过环境变量设置管理员账户
- **数据持久化**：数据目录可挂载到宿主机
- **健康检查**：内置Docker健康检查
- **安全配置**：生产环境安全最佳实践

## 快速开始

### 本地开发

1. **安装依赖**
```bash
npm install
```

2. **启动开发服务器**
```bash
npm run dev
```

3. **访问应用**
- 打开浏览器访问 `http://localhost:3000`
- 系统会自动重定向到登录页面
- 使用默认账户：`admin` / `admin`

### Docker 部署

1. **使用 docker-compose（推荐）**
```bash
# 复制并修改环境配置
cp .env.example .env

# 启动服务
docker-compose up -d
```

2. **直接使用 Docker**
```bash
# 构建镜像
docker build -t tmdb-helper .

# 运行容器
docker run -d \
  -p 3000:3000 \
  -v tmdb_data:/app/data \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=your_password \
  -e JWT_SECRET=your_jwt_secret \
  tmdb-helper
```

## 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|--------|------|
| `ADMIN_USERNAME` | 管理员用户名 | `admin` | 否 |
| `ADMIN_PASSWORD` | 管理员密码 | `admin` | 否 |
| `JWT_SECRET` | JWT签名密钥 | 自动生成 | 生产环境必需 |
| `SESSION_EXPIRY_DAYS` | 会话有效期（天） | `7` | 否 |

### 安全建议

1. **修改默认密码**：首次部署后立即修改默认密码
2. **设置强密码**：使用至少8位包含字母数字的密码
3. **配置JWT密钥**：生产环境必须设置强随机JWT密钥
4. **启用HTTPS**：生产环境建议使用HTTPS

## API 接口

### 认证相关

- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/verify` - 验证认证状态
- `GET /api/auth/init` - 检查系统初始化状态
- `POST /api/auth/change-password` - 修改密码
- `GET /api/auth/profile` - 获取用户信息

### 数据操作

- `GET /api/user/data` - 导出用户数据
- `POST /api/user/data` - 导入用户数据
- `DELETE /api/user/data` - 清空用户数据

所有数据操作API都需要认证。

## 数据迁移

系统会自动将现有数据迁移到认证用户账户下，无需手动操作。

## 故障排除

### 常见问题

1. **忘记密码**
   - 停止应用
   - 删除 `data/auth/admin.json` 文件
   - 重启应用，系统会重新创建默认账户

2. **登录失败**
   - 检查用户名和密码是否正确
   - 确认系统已正确初始化

3. **数据丢失**
   - 检查 `data/users/user_admin_system/` 目录
   - 查看是否有备份文件

### 日志查看

```bash
# Docker 环境
docker-compose logs -f tmdb-helper

# 本地开发
npm run dev
```

## 技术架构

### 认证流程
1. 用户访问应用 → 检查认证状态
2. 未认证 → 重定向到登录页
3. 输入凭据 → 服务器验证
4. 验证成功 → 生成JWT token → 设置cookie
5. 后续请求自动携带认证信息

### 数据存储
- **认证信息**：`data/auth/admin.json`
- **用户数据**：`data/users/user_admin_system/`
- **密码加密**：bcrypt (salt rounds: 12)
- **会话存储**：JWT + httpOnly cookie

### 安全特性
- 密码bcrypt加密存储
- JWT token签名验证
- httpOnly cookie防止XSS
- 生产环境强制HTTPS
- 会话过期自动清理

## 更新日志

### v1.0.0
- ✅ 新增单用户认证系统
- ✅ 精美登录界面
- ✅ 保持原有UI功能
- ✅ Docker容器化支持
- ✅ 环境变量配置
- ✅ 数据自动迁移
- ✅ 安全最佳实践

## 支持

如有问题或建议，请查看项目文档或提交Issue。
