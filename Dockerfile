# TMDB Helper Docker 配置
# 多阶段构建，支持 Node.js 和 Python 环境
FROM node:18-alpine AS base

# 安装系统依赖和 Python 支持
RUN apk add --no-cache \
    libc6-compat \
    python3 \
    py3-pip \
    make \
    g++ \
    curl \
    && ln -sf python3 /usr/bin/python

# 设置工作目录
WORKDIR /app

# 安装依赖阶段
FROM base AS deps
WORKDIR /app

# 复制包管理文件
COPY package.json package-lock.json* pnpm-lock.yaml* ./

# 安装 Node.js 依赖
RUN \
  if [ -f pnpm-lock.yaml ]; then \
    npm install -g pnpm && pnpm install --frozen-lockfile; \
  elif [ -f package-lock.json ]; then \
    npm ci --legacy-peer-deps && npm cache clean --force; \
  else \
    npm install --legacy-peer-deps && npm cache clean --force; \
  fi

# 构建应用阶段
FROM base AS builder
WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置构建环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 构建 Next.js 应用
RUN npm run build

# 生产运行时镜像
FROM base AS runner
WORKDIR /app

# 设置生产环境
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4949
ENV HOSTNAME="0.0.0.0"

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/public ./public

# 复制 Next.js standalone 输出
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 创建必要的目录并设置权限
RUN mkdir -p /app/data /app/scripts /app/logs && \
    chown -R nextjs:nodejs /app/data /app/scripts /app/logs

# 复制脚本文件
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# 安装健康检查工具
RUN apk add --no-cache curl

# 切换到非root用户
USER nextjs

# 暴露端口
EXPOSE 4949

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:4949/api/auth/init || exit 1

# 启动应用
CMD ["node", "server.js"]
