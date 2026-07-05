#!/bin/bash
# SVG Icon Pack - Start script
# Runs Next.js on port 3000, proxied by Caddy on port 81

cd /home/z/my-project/svgpack
export DATABASE_URL="file:./dev.db"
export PORT=3000

# Kill existing instance
fuser -k 3000/tcp 2>/dev/null
sleep 1

# Start with custom server and increased memory
exec node --max-old-space-size=1024 server.js
