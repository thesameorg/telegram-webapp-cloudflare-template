#!/bin/bash

set -e

# Load environment variables
source "$(dirname "$0")/load-env.sh"

echo "🚀 Starting local development webhook tunnel..."

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo "❌ cloudflared is not installed. Please install it first:"
    echo "   https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/"
    exit 1
fi

# Check if TELEGRAM_BOT_TOKEN is set
if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "❌ TELEGRAM_BOT_TOKEN environment variable is not set"
    echo "   Please set it in your .env file or export it:"
    echo "   export TELEGRAM_BOT_TOKEN=your_bot_token"
    exit 1
fi

# Check if tunnel is already running
if [ -f pids/cloudflared.pid ]; then
    EXISTING_PID=$(cat pids/cloudflared.pid)
    if ps -p $EXISTING_PID > /dev/null; then
        echo "⚠️  Tunnel is already running (PID: $EXISTING_PID)"
        if [ -f pids/cloudflared.url ]; then
            echo "🌐 Tunnel URL: $(cat pids/cloudflared.url)"
        fi
        exit 0
    else
        echo "🧹 Cleaning up stale PID file..."
        rm -f pids/cloudflared.pid pids/cloudflared.url
    fi
fi

# Default port for frontend (which proxies to backend)
PORT=${1:-3000}
echo "📡 Using port: $PORT (frontend with backend proxy)"

# Start cloudflared tunnel in background
echo "🌐 Starting cloudflared tunnel..."
cloudflared tunnel --url http://localhost:$PORT --http-host-header localhost:$PORT > logs/cloudflared.log 2>&1 &
TUNNEL_PID=$!

# Wait for tunnel to be ready
echo "⏳ Waiting for tunnel to be ready..."
for i in {1..20}; do
    sleep 1
    TUNNEL_URL=$(grep -o 'https://[^[:space:]]*\.trycloudflare\.com' logs/cloudflared.log | head -1)
    if [ ! -z "$TUNNEL_URL" ]; then
        break
    fi
    echo "   Still waiting... (${i}s)"
done

if [ -z "$TUNNEL_URL" ]; then
    echo "❌ Failed to start tunnel. Check logs/cloudflared.log for details."
    kill $TUNNEL_PID 2>/dev/null || true
    exit 1
fi

echo "✅ Tunnel started: $TUNNEL_URL"

# Wait a bit for tunnel to be fully propagated
echo "⏳ Waiting for tunnel to be fully available..."
sleep 5

# Set webhook URL
WEBHOOK_URL="$TUNNEL_URL/webhook"
echo "🔗 Setting webhook URL: $WEBHOOK_URL"

WEBHOOK_RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{
        \"url\": \"$WEBHOOK_URL\",
        \"allowed_updates\": [\"message\", \"callback_query\"]
    }")

if echo "$WEBHOOK_RESPONSE" | jq -e '.ok' > /dev/null; then
    echo "✅ Webhook set successfully!"
else
    echo "❌ Failed to set webhook:"
    echo "$WEBHOOK_RESPONSE" | jq '.'
    kill $TUNNEL_PID 2>/dev/null || true
    exit 1
fi

# Save tunnel info
echo "$TUNNEL_URL" > pids/cloudflared.url
echo "$TUNNEL_PID" > pids/cloudflared.pid

echo ""
echo "🎉 Local development tunnel setup complete!"
echo "📱 Tunnel URL: $TUNNEL_URL"
echo "🤖 Webhook URL: $WEBHOOK_URL"
echo "🔄 Process ID: $TUNNEL_PID"
echo ""
echo "🛠️  To stop the tunnel: npm run tunnel:stop"
echo "📋 To check status: npm run tunnel:status"
echo ""
echo "Now start your development server:"
echo "  npm run dev:backend"