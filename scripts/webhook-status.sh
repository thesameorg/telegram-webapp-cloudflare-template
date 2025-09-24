#!/bin/bash

echo "🔍 Checking Telegram webhook status..."

if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo "❌ TELEGRAM_BOT_TOKEN environment variable is not set"
    exit 1
fi

echo "📞 Fetching webhook info..."
WEBHOOK_INFO=$(curl -s "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo")

if echo "$WEBHOOK_INFO" | jq -e '.ok' > /dev/null; then
    echo "✅ Webhook info retrieved successfully:"
    echo "$WEBHOOK_INFO" | jq '{
        url: .result.url,
        has_custom_certificate: .result.has_custom_certificate,
        pending_update_count: .result.pending_update_count,
        last_error_date: .result.last_error_date,
        last_error_message: .result.last_error_message,
        max_connections: .result.max_connections,
        allowed_updates: .result.allowed_updates
    }'
else
    echo "❌ Failed to get webhook info:"
    echo "$WEBHOOK_INFO" | jq '.'
fi

# Check if tunnel is running
if [ -f .tunnel_url ]; then
    TUNNEL_URL=$(cat .tunnel_url)
    echo ""
    echo "🌐 Local tunnel: $TUNNEL_URL"

    if [ -f .tunnel_pid ]; then
        TUNNEL_PID=$(cat .tunnel_pid)
        if ps -p $TUNNEL_PID > /dev/null; then
            echo "✅ Tunnel process $TUNNEL_PID is running"
        else
            echo "❌ Tunnel process $TUNNEL_PID is not running"
        fi
    fi
else
    echo ""
    echo "⚠️  No local tunnel active"
fi