# ============ 构建阶段 ============
FROM swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json rsbuild.config.ts ./
COPY src ./src
RUN npm run build

# ============ 运行阶段 ============
FROM swr.cn-north-4.myhuaweicloud.com/ddn-k8s/docker.io/nginx:1.27-alpine AS runner

# 自定义 nginx 配置（含 /api 反代）
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 拷贝构建产物
COPY --from=builder /app/dist /usr/share/nginx/html/dp

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
