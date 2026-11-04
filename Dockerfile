# syntax=docker/dockerfile:1

# Этап 1: сборка клиентского приложения.
FROM node:22-alpine AS client-build
WORKDIR /app/client

COPY client/package*.json ./
RUN npm install --no-audit --no-fund

COPY client/ ./
RUN npm run build

# Этап 2: установка backend-зависимостей и автоматическая проверка.
# Если хотя бы один тест падает, сборка Docker-образа завершится ошибкой.
FROM node:22-alpine AS backend-test
WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY server/ ./server/
RUN npm test

# Этап 3: production-образ с Express и собранным React-приложением.
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3001
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund \
    && npm cache clean --force

COPY --from=backend-test /app/server ./server/
COPY --from=client-build /app/client/dist ./client/dist

USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3001/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server/index.js"]
