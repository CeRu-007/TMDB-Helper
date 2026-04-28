# TMDB Helper Docker 配置
# 多阶段构建，支持 Node.js 和 Python 环境
FROM node:22-slim AS base

# 安装系统依赖、Python 支持和 pnpm
# 注意：Python 包和 Playwright 浏览器由用户在运行时通过设置页面手动安装
# 但 Chromium 运行需要的系统依赖必须预装
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    curl \
    ffmpeg \
    unzip \
    git \
    ca-certificates \
    dnsutils \
    # Chromium 运行需要的依赖库
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    && ln -sf /usr/bin/python3 /usr/bin/python \
    && npm install -g pnpm \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 安装依赖阶段
FROM base AS deps
WORKDIR /app

# 复制包管理文件
COPY package.json pnpm-lock.yaml ./

# 安装 Node.js 依赖
RUN pnpm install --frozen-lockfile

# 构建应用阶段
FROM base AS builder
WORKDIR /app

# 复制依赖
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 设置构建环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 构建 Next.js 应用（启用standalone输出）
ENV OUTPUT_STANDALONE=true
RUN npm run build

# 生产运行时镜像
FROM base AS runner
WORKDIR /app

# 设置生产环境
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4949
ENV HOSTNAME="0.0.0.0"
ENV DOCKER_CONTAINER=true
ENV TMDB_DATA_DIR=/app/data
ENV NODE_OPTIONS="--max-old-space-size=1024"
ENV COOKIE_SECURE=false

# Playwright 环境变量 - 浏览器由用户运行时手动安装
# 使用 /app/data 目录，确保 nextjs 用户有写入权限
ENV PLAYWRIGHT_BROWSERS_PATH=/app/data/.cache/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制构建产物
COPY --from=builder /app/public ./public

# 复制 Next.js standalone 输出
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 创建必要的目录并设置权限（在 root 下创建，确保权限正确）
RUN mkdir -p /app/data /app/scripts /app/logs && \
    chown -R nextjs:nodejs /app/data /app/scripts /app/logs

# 复制脚本文件
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# 为启动脚本安装 bcryptjs
RUN cd /app/scripts && npm init -y && npm install bcryptjs@3.0.2

# 确保 nextjs 用户可以访问必要的命令和目录
RUN chown -R nextjs:nodejs /app && \
    chmod 755 /usr/bin/unzip /usr/bin/cp /usr/bin/mv /usr/bin/rm /usr/bin/git 2>/dev/null || true

# 切换到非root用户运行应用
USER nextjs

# 设置环境变量确保 PATH 包含系统命令
ENV PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ENV HOME="/app"

# 预设卷挂载点
VOLUME ["/app/data", "/app/logs"]

# 暴露端口
EXPOSE 4949

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:4949/api/auth/init || exit 1

# 启动应用
CMD ["sh", "-c", "node scripts/docker-startup.js && node server.js"]
