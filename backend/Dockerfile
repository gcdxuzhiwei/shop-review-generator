# ============ 构建阶段 ============
FROM swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/node:20-alpine AS builder

WORKDIR /app

# 先复制依赖文件，利用缓存层
COPY package*.json ./
RUN npm ci

# 复制源码并构建
COPY tsconfig.json nest-cli.json ./
COPY src ./src
RUN npm run build

# ============ 运行阶段 ============
FROM swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/node:20-alpine AS runner

WORKDIR /app

# 只安装生产依赖
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# 拷贝构建产物
COPY --from=builder /app/dist ./dist

EXPOSE 10483

CMD ["node", "dist/main.js"]
