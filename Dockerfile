# TMDB Helper Docker 配置
# 多阶段构建，支持 Node.js 和 Python 环境
FROM node:22-slim AS base

# 安装系统依赖、Python 支持、Playwright 系统依赖和 pnpm
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-dev \
    make \
    g++ \
    gcc \
    libc6-dev \
    libffi-dev \
    libssl-dev \
    curl \
    ffmpeg \
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

# 为启动脚本安装 bcryptjs
RUN cd /app/scripts && npm init -y && npm install bcryptjs@3.0.2

# 安装 Python 包
RUN pip3 install --break-system-packages python-dateutil Pillow bordercrop playwright

# 安装 Playwright Chromium 浏览器及其系统依赖
RUN python3 -m playwright install --with-deps chromium

# 安装 Node.js Playwright（如果尚未安装）
RUN which playwright || npm install -g playwright

# 切换到非root用户
USER nextjs

# 预设卷挂载点
VOLUME ["/app/data", "/app/logs"]

# 暴露端口
EXPOSE 4949

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:4949/api/auth/init || exit 1

# 启动应用
CMD ["sh", "-c", "node scripts/docker-startup.js && node server.js"]
