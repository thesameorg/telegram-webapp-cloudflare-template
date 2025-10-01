#!/bin/bash

# Webhook management script for Telegram bot
# Usage: ./webhook.sh {set|status|clear}

set -e

# Load environment variables
SCRIPT_DIR="$(dirname "$0")"
source "$SCRIPT_DIR/load-env.sh"

# Constants
TELEGRAM_API_BASE="https://api.telegram.org/bot"

# Functions
check_bot_token() {
    if [ -z "$TELEGRAM_BOT_TOKEN" ]; then
        echo "❌ TELEGRAM_BOT_TOKEN not set in .env"
        exit 1
    fi
}

get_tunnel_url() {
    local TUNNEL_INFO=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null)
    if [ -z "$TUNNEL_INFO" ]; then
        echo ""
        return 1
    fi
    echo "$TUNNEL_INFO" | jq -r '.tunnels[0].public_url' 2>/dev/null || echo ""
}

set_webhook() {
    check_bot_token

    # Check dependencies
    if ! command -v jq &> /dev/null; then
        echo "❌ jq not installed: brew install jq"
        exit 1
    fi

    local TUNNEL_URL=$(get_tunnel_url)
    if [ -z "$TUNNEL_URL" ] || [ "$TUNNEL_URL" == "null" ]; then
        echo "❌ Can't get tunnel URL. Is tunnel running?"
        echo "💡 Start tunnel: npm run tunnel:start"
        exit 1
    fi

    local WEBHOOK_URL="$TUNNEL_URL/webhook"
    echo "🔗 Setting webhook: $WEBHOOK_URL"

    WEBHOOK_RESPONSE=$(curl -s -X POST "$TELEGRAM_API_BASE$TELEGRAM_BOT_TOKEN/setWebhook" \
        -H "Content-Type: application/json" \
        -d "{\"url\": \"$WEBHOOK_URL\", \"allowed_updates\": [\"message\", \"callback_query\", \"pre_checkout_query\"]}")

    if echo "$WEBHOOK_RESPONSE" | jq -e '.ok' > /dev/null 2>&1; then
        echo "✅ Webhook set!"
        echo "   Updates: message, callback_query, pre_checkout_query"
        echo ""
        echo "💡 Status: npm run webhook:status"
    else
        echo "❌ Failed:"
        echo "$WEBHOOK_RESPONSE" | jq '.' 2>/dev/null || echo "$WEBHOOK_RESPONSE"
        exit 1
    fi
}

status_webhook() {
    check_bot_token

    # Check dependencies
    if ! command -v jq &> /dev/null; then
        echo "❌ jq not installed: brew install jq"
        exit 1
    fi

    echo "🔍 Checking webhook..."
    echo ""

    WEBHOOK_INFO=$(curl -s "$TELEGRAM_API_BASE$TELEGRAM_BOT_TOKEN/getWebhookInfo")

    if ! echo "$WEBHOOK_INFO" | jq -e '.ok' > /dev/null 2>&1; then
        echo "❌ Failed:"
        echo "$WEBHOOK_INFO" | jq '.' 2>/dev/null || echo "$WEBHOOK_INFO"
        exit 1
    fi

    echo "$WEBHOOK_INFO" | jq '{
        url: .result.url,
        pending_updates: .result.pending_update_count,
        last_error: .result.last_error_message,
        allowed_updates: .result.allowed_updates
    }'

    # Check if webhook matches tunnel
    local WEBHOOK_URL=$(echo "$WEBHOOK_INFO" | jq -r '.result.url')
    local TUNNEL_URL=$(get_tunnel_url)

    if [ -n "$TUNNEL_URL" ] && [ "$TUNNEL_URL" != "null" ]; then
        echo ""
        echo "🌐 Tunnel: $TUNNEL_URL"
        local EXPECTED_WEBHOOK="$TUNNEL_URL/webhook"
        if [ "$WEBHOOK_URL" == "$EXPECTED_WEBHOOK" ]; then
            echo "✅ Webhook matches tunnel"
        else
            echo "⚠️  Mismatch - run: npm run webhook:set"
        fi
    fi
}

clear_webhook() {
    check_bot_token

    echo "🧹 Clearing webhook..."

    WEBHOOK_RESPONSE=$(curl -s -X POST "$TELEGRAM_API_BASE$TELEGRAM_BOT_TOKEN/deleteWebhook")

    if echo "$WEBHOOK_RESPONSE" | jq -e '.ok' > /dev/null 2>&1; then
        echo "✅ Webhook cleared (now using long polling)"
    else
        echo "❌ Failed:"
        echo "$WEBHOOK_RESPONSE" | jq '.' 2>/dev/null || echo "$WEBHOOK_RESPONSE"
        exit 1
    fi
}

# Main script
case "$1" in
    set)
        set_webhook
        ;;
    status)
        status_webhook
        ;;
    clear)
        clear_webhook
        ;;
    *)
        echo "Usage: $0 {set|status|clear}"
        echo ""
        echo "Commands:"
        echo "  set     - Set webhook URL to current tunnel"
        echo "  status  - Check webhook configuration"
        echo "  clear   - Remove webhook (use long polling)"
        echo ""
        echo "Examples:"
        echo "  $0 set       # Set webhook to tunnel URL"
        echo "  $0 status    # Check current webhook"
        echo "  $0 clear     # Remove webhook"
        exit 1
        ;;
esac
