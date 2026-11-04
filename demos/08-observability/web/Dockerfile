FROM node:22-alpine AS base
RUN npm i -g pnpm@8.15.9
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
# VITE_* 变量在构建时被内联进产物，所以通过 build arg 传入
ARG VITE_SENTRY_DSN=
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# 构建产物是纯静态文件，运行时不需要 Node
FROM nginx:alpine AS runner
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
