#!/bin/bash

# Load environment variables
source "$(dirname "$0")/load-env.sh"

echo "🛑 Stopping cloudflared tunnel..."

# Check if tunnel is running
if [ -f .tunnel_pid ]; then
    TUNNEL_PID=$(cat .tunnel_pid)
    if ps -p $TUNNEL_PID > /dev/null; then
        kill $TUNNEL_PID
        echo "✅ Tunnel process $TUNNEL_PID stopped"

        # Clear webhook if TELEGRAM_BOT_TOKEN is available
        if [ ! -z "$TELEGRAM_BOT_TOKEN" ]; then
            echo "🔗 Clearing webhook..."
            curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/deleteWebhook" > /dev/null
            echo "✅ Webhook cleared"
        fi
    else
        echo "⚠️  Tunnel process $TUNNEL_PID not found (may have already stopped)"
    fi
    rm -f .tunnel_pid
else
    echo "⚠️  No tunnel PID file found - tunnel may not be running"
fi

# Clean up tunnel files
rm -f .tunnel_url tunnel.log

echo "🧹 Cleanup complete"