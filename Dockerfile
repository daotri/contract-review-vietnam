# All-in-one Dockerfile: FastAPI backend + Next.js frontend in single container
# Uses supervisord to run both processes

# === Stage 1: Build frontend ===
FROM node:20-alpine AS frontend-build

WORKDIR /app
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci
COPY frontend/ .
RUN npm run build

# === Stage 2: Final image ===
FROM python:3.11-slim

# Install Node.js for Next.js standalone server
RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs npm supervisor curl \
    && rm -rf /var/lib/apt/lists/*

# Backend setup
WORKDIR /app/backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .

# Frontend setup — copy standalone build
WORKDIR /app/frontend
COPY --from=frontend-build /app/.next/standalone ./
COPY --from=frontend-build /app/.next/static ./.next/static
COPY --from=frontend-build /app/public ./public 2>/dev/null || true

# Supervisord config — runs both services
RUN mkdir -p /var/log/supervisor
COPY <<'SUPERVISOR' /etc/supervisor/conf.d/app.conf
[supervisord]
nodaemon=true
logfile=/var/log/supervisor/supervisord.log

[program:backend]
command=uvicorn main:app --host 0.0.0.0 --port 8000
directory=/app/backend
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0

[program:frontend]
command=node server.js
directory=/app/frontend
environment=PORT="3000",HOSTNAME="0.0.0.0",BACKEND_URL="http://localhost:8000",NEXT_PUBLIC_API_URL="http://localhost:8000"
autostart=true
autorestart=true
stdout_logfile=/dev/stdout
stdout_logfile_maxbytes=0
stderr_logfile=/dev/stderr
stderr_logfile_maxbytes=0
SUPERVISOR

EXPOSE 3000 8000

CMD ["supervisord", "-c", "/etc/supervisor/conf.d/app.conf"]
