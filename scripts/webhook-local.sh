#!/bin/bash

set -e

echo "🚀 Setting up local development webhook tunnel..."

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

# Default port for wrangler dev
PORT=${1:-8787}
echo "📡 Using port: $PORT"

# Start cloudflared tunnel in background
echo "🌐 Starting cloudflared tunnel..."
cloudflared tunnel --url http://localhost:$PORT > tunnel.log 2>&1 &
TUNNEL_PID=$!

# Wait for tunnel to be ready
echo "⏳ Waiting for tunnel to be ready..."
sleep 5

# Extract tunnel URL from log
TUNNEL_URL=$(grep -o 'https://[^[:space:]]*\.trycloudflare\.com' tunnel.log | head -1)

if [ -z "$TUNNEL_URL" ]; then
    echo "❌ Failed to start tunnel. Check tunnel.log for details."
    kill $TUNNEL_PID 2>/dev/null || true
    exit 1
fi

echo "✅ Tunnel started: $TUNNEL_URL"

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
echo "$TUNNEL_URL" > .tunnel_url
echo "$TUNNEL_PID" > .tunnel_pid

echo ""
echo "🎉 Local development setup complete!"
echo "📱 Tunnel URL: $TUNNEL_URL"
echo "🤖 Webhook URL: $WEBHOOK_URL"
echo "🔄 Process ID: $TUNNEL_PID"
echo ""
echo "🛠️  To stop the tunnel, run: ./scripts/stop-tunnel.sh"
echo "📋 To check webhook status: ./scripts/webhook-status.sh"
echo ""
echo "Now start your development server:"
echo "  cd backend && npm run dev"