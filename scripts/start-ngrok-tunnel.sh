#!/bin/bash

set -e

# Load environment variables
source "$(dirname "$0")/load-env.sh"

echo "🚀 Starting local development webhook tunnel (ngrok)..."

# create logs dir 
mkdir -p logs
mkdir -p pids


# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed. Please install it first:"
    echo "   https://ngrok.com/download"
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
if [ -f pids/ngrok.pid ]; then
    EXISTING_PID=$(cat pids/ngrok.pid)
    if ps -p $EXISTING_PID > /dev/null; then
        echo "⚠️  ngrok tunnel is already running (PID: $EXISTING_PID)"
        if [ -f pids/ngrok.url ]; then
            echo "🌐 Tunnel URL: $(cat pids/ngrok.url)"
        fi
        exit 0
    else
        echo "🧹 Cleaning up stale PID file..."
        rm -f pids/ngrok.pid pids/ngrok.url
    fi
fi

# Default port for frontend (which proxies to backend)
PORT=${1:-3000}
echo "📡 Using port: $PORT (frontend with backend proxy)"

# Start ngrok tunnel in background
echo "🌐 Starting ngrok tunnel..."
ngrok http $PORT --host-header=localhost:$PORT --log=stdout > logs/ngrok.log 2>&1 &
NGROK_PID=$!

# Wait for tunnel to be ready
echo "⏳ Waiting for tunnel to be ready..."
for i in {1..20}; do
    sleep 1
    TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')
    if [ ! -z "$TUNNEL_URL" ] && [ "$TUNNEL_URL" != "null" ]; then
        break
    fi
    echo "   Still waiting... (${i}s)"
done

if [ -z "$TUNNEL_URL" ] || [ "$TUNNEL_URL" == "null" ]; then
    echo "❌ Failed to start ngrok tunnel. Check logs/ngrok.log for details."
    kill $NGROK_PID 2>/dev/null || true
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
    kill $NGROK_PID 2>/dev/null || true
    exit 1
fi

# Save tunnel info
echo "$TUNNEL_URL" > pids/ngrok.url
echo "$NGROK_PID" > pids/ngrok.pid

echo ""
echo "🎉 Local development tunnel setup complete!"
echo "📱 Tunnel URL: $TUNNEL_URL"
echo "🤖 Webhook URL: $WEBHOOK_URL"
echo "🔄 Process ID: $NGROK_PID"


echo ""
echo "🛠️  To stop the tunnel: npm run tunnel:stop"
echo "📋 To check status: npm run tunnel:status"



echo "Now start your development server:"
echo "  npm run dev:backend"
