# syntax=docker/dockerfile:1
#
# CloakMesh 管理控制台镜像（静态站点，nginx 托管）
#
# 产物路径 /usr/share/nginx/html 可直接被 front proxy 或 compose 挂载复用。
#
# 构建（仓库根目录）：
#   docker build -f docker-images/cloakmesh-console/Dockerfile -t cloakmesh/console:local .

ARG NODE_IMAGE=node:20-bookworm-slim
ARG BASE_HREF=./

FROM ${NODE_IMAGE} AS builder
WORKDIR /usr/src/app

# 依赖层单独缓存
COPY package.json package-lock.json ./
COPY version.js ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=optional --no-audit --no-fund

COPY . .
RUN node ./scripts/check-route-segments.mjs \
 && npx ng build ziti-console-lib \
 && npx ng build ziti-console --base-href "${BASE_HREF}" --configuration production \
 && node ./scripts/rewrite-bundle-css.mjs

FROM nginx:alpine

COPY --from=builder /usr/src/app/dist/app-ziti-console /usr/share/nginx/html
RUN printf '%s\n' \
    'server {' \
    '    listen 80;' \
    '    server_name _;' \
    '    root /usr/share/nginx/html;' \
    '    index index.html;' \
    '    location / { try_files $uri $uri/ /index.html; }' \
    '    location = /index.html { add_header Cache-Control "no-store"; }' \
    '}' > /etc/nginx/conf.d/default.conf

LABEL org.opencontainers.image.title="CloakMesh Console" \
      org.opencontainers.image.description="CloakMesh admin console, zh-CN localized (based on OpenZiti ZAC, Apache-2.0)" \
      org.opencontainers.image.source="https://github.com/aiuc-labs/cloakmesh-console" \
      org.opencontainers.image.licenses="Apache-2.0"

EXPOSE 80