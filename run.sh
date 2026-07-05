#!/bin/bash
# SVG Icon Pack — Production Runner
# Auto-restarts on crash, logs everything

cd /home/z/my-project/svgpack
export DATABASE_URL="file:./dev.db"
export PORT=3000
export NODE_ENV=production

# Ensure Z AI config is accessible
ln -sf /etc/.z-ai-config /home/z/.z-ai-config 2>/dev/null

LOG="/home/z/my-project/svgpack/server.log"

echo "[$(date -Iseconds)] Starting SVG Icon Pack server..." >> "$LOG"

while true; do
  node --max-old-space-size=2048 server.js >> "$LOG" 2>&1
  EXIT=$?
  echo "[$(date -Iseconds)] Server exited (code=$EXIT), restarting in 2s..." >> "$LOG"
  sleep 2
done
