#!/bin/sh
set -e

echo "=== Starting Pi Coding Agent Web Services ==="

# 啟動 session daemon 在背景
echo "[1/2] Starting pi-web-sessiond daemon in background..."
pi-web-sessiond &
SESSIOND_PID=$!

# 捕捉訊號以便在容器停止時優雅終止背景 sessiond
cleanup() {
  echo "Stopping services..."
  kill -TERM "$SESSIOND_PID" 2>/dev/null || true
  wait "$SESSIOND_PID" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

# 啟動 pi-web 前景伺服器
echo "[2/2] Starting pi-web-server on http://${PI_WEB_HOST:-0.0.0.0}:${PI_WEB_PORT:-8504}..."
pi-web-server
