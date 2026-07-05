#!/bin/bash
cd /home/z/my-project/svgpack
export DATABASE_URL="file:./dev.db"
export PORT=3000
while true; do
  echo "[$(date)] Starting server..." >> /tmp/svgpack-watchdog.log
  node --max-old-space-size=2048 server.js >> /tmp/next-server.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 3s..." >> /tmp/svgpack-watchdog.log
  sleep 3
done

