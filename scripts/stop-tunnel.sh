#!/bin/bash

echo "🛑 Stopping cloudflared tunnel..."

if [ -f .tunnel_pid ]; then
    TUNNEL_PID=$(cat .tunnel_pid)
    if ps -p $TUNNEL_PID > /dev/null; then
        kill $TUNNEL_PID
        echo "✅ Tunnel process $TUNNEL_PID stopped"
    else
        echo "⚠️  Tunnel process $TUNNEL_PID not found (may have already stopped)"
    fi
    rm -f .tunnel_pid
else
    echo "⚠️  No tunnel PID file found"
fi

# Clean up tunnel URL file
rm -f .tunnel_url

# Clean up log file
rm -f tunnel.log

echo "🧹 Cleanup complete"