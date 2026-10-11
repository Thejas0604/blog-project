# Stage 1: build the frontend
FROM node:22-slim AS frontend
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: backend runtime (node:22-slim, not Alpine, for better-sqlite3 prebuilds)
FROM node:22-slim
ENV NODE_ENV=production \
    DB_PATH=/app/data/blog.db \
    PORT=3000
WORKDIR /app
COPY backend/package*.json ./
# --ignore-scripts: better-sqlite3 ships prebuilt binaries; node:*-slim has no Python/compiler for node-gyp
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY backend/src ./src
COPY --from=frontend /frontend/dist ./public
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "src/index.js"]
