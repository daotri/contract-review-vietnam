# Multi-service Dockerfile — builds both backend and frontend
# Use build arg to select which service to build:
#   docker build --build-arg SERVICE=backend .
#   docker build --build-arg SERVICE=frontend .

ARG SERVICE=backend

# ============================================
# BACKEND (FastAPI)
# ============================================
FROM python:3.11-slim AS backend

WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

# ============================================
# FRONTEND (Next.js)
# ============================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM node:20-alpine AS frontend

WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

COPY --from=frontend-builder /app/.next/standalone ./
COPY --from=frontend-builder /app/.next/static ./.next/static
COPY --from=frontend-builder /app/public ./public

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
CMD ["node", "server.js"]

# ============================================
# Final stage — select by SERVICE arg
# ============================================
FROM ${SERVICE} AS final
