#!/bin/bash

# Tunnel management script for local development
# Usage: ./tunnel.sh {start|stop|status}

set -e

# Load environment variables
SCRIPT_DIR="$(dirname "$0")"
source "$SCRIPT_DIR/load-env.sh"

# Constants
NGROK_PID_FILE="pids/ngrok.pid"
NGROK_LOG_FILE="logs/ngrok.log"

# Functions
start_tunnel() {
    local PORT=3000

    echo "🚀 Starting ngrok tunnel on port $PORT..."

    # Check dependencies
    if ! command -v ngrok &> /dev/null; then
        echo "❌ ngrok not installed: https://ngrok.com/download"
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        echo "❌ jq not installed: brew install jq"
        exit 1
    fi

    # Check if tunnel is already running
    if [ -f "$NGROK_PID_FILE" ] && kill -0 $(cat "$NGROK_PID_FILE") 2>/dev/null; then
        echo "⚠️  Tunnel already running (PID: $(cat "$NGROK_PID_FILE"))"
        EXISTING_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | jq -r '.tunnels[0].public_url' 2>/dev/null)
        if [ -n "$EXISTING_URL" ] && [ "$EXISTING_URL" != "null" ]; then
            echo "🌐 URL: $EXISTING_URL"
        else
            echo "⚠️  Can't fetch URL (ngrok API not responding)"
        fi
        return 0
    fi

    # Clean up stale PID file
    rm -f "$NGROK_PID_FILE"

    # Start ngrok tunnel
    ngrok http $PORT --host-header=localhost:$PORT --log=stdout > "$NGROK_LOG_FILE" 2>&1 &
    NGROK_PID=$!

    # Wait for tunnel to be ready
    echo "⏳ Waiting for tunnel..."
    local TUNNEL_URL=""
    for i in {1..20}; do
        sleep 1
        TUNNEL_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | jq -r '.tunnels[0].public_url' 2>/dev/null)
        [ -n "$TUNNEL_URL" ] && [ "$TUNNEL_URL" != "null" ] && break
        [ $((i % 5)) -eq 0 ] && echo "   ${i}s..."
    done

    if [ -z "$TUNNEL_URL" ] || [ "$TUNNEL_URL" == "null" ]; then
        echo "❌ Failed to start tunnel. Check $NGROK_LOG_FILE"
        kill $NGROK_PID 2>/dev/null || true
        exit 1
    fi

    # Save PID
    echo "$NGROK_PID" > "$NGROK_PID_FILE"

    echo ""
    echo "✅ Tunnel started!"
    echo "🌐 URL: $TUNNEL_URL"
    echo "🔄 PID: $NGROK_PID"
    echo ""
    echo "💡 Next: npm run webhook:set"
}

stop_tunnel() {
    echo "🛑 Stopping ngrok tunnel..."

    local STOPPED=false

    # Try PID file first
    if [ -f "$NGROK_PID_FILE" ]; then
        TUNNEL_PID=$(cat "$NGROK_PID_FILE")
        if kill $TUNNEL_PID 2>/dev/null; then
            echo "✅ Stopped tunnel (PID: $TUNNEL_PID)"
            STOPPED=true
        fi
    fi

    # If PID file method failed, find and kill ngrok process directly
    if [ "$STOPPED" = false ]; then
        NGROK_PIDS=$(pgrep -f "ngrok http" || true)
        if [ -n "$NGROK_PIDS" ]; then
            echo "$NGROK_PIDS" | while read -r pid; do
                if kill $pid 2>/dev/null; then
                    echo "✅ Stopped tunnel (PID: $pid)"
                    STOPPED=true
                fi
            done
        else
            echo "⚠️  No running ngrok process found"
        fi
    fi

    # Clean up
    rm -f "$NGROK_PID_FILE" "$NGROK_LOG_FILE"
    echo ""
    echo "💡 Next: npm run webhook:clear"
}

status_tunnel() {
    echo "🔍 Checking tunnel status..."
    echo ""

    # Check jq
    if ! command -v jq &> /dev/null; then
        echo "❌ jq not installed: brew install jq"
        exit 1
    fi

    # Check ngrok API
    TUNNEL_INFO=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null)

    if [ -z "$TUNNEL_INFO" ]; then
        echo "❌ Can't reach ngrok API (tunnel not running or ngrok not responding)"
        echo ""
        echo "💡 Start: npm run tunnel:start"
        rm -f "$NGROK_PID_FILE"
        return 1
    fi

    TUNNEL_URL=$(echo "$TUNNEL_INFO" | jq -r '.tunnels[0].public_url' 2>/dev/null)

    if [ -z "$TUNNEL_URL" ] || [ "$TUNNEL_URL" == "null" ]; then
        echo "❌ Tunnel not running"
        echo ""
        echo "💡 Start: npm run tunnel:start"
        rm -f "$NGROK_PID_FILE"
        return 1
    fi

    echo "✅ Tunnel is running"
    echo ""
    echo "$TUNNEL_INFO" | jq '.tunnels[0] | {
        public_url: .public_url,
        proto: .proto,
        local_addr: .config.addr,
        connections: .metrics.conns.count
    }'
}

# Main script
case "$1" in
    start)
        start_tunnel
        ;;
    stop)
        stop_tunnel
        ;;
    status)
        status_tunnel
        ;;
    *)
        echo "Usage: $0 {start|stop|status}"
        echo ""
        echo "Commands:"
        echo "  start   - Start ngrok tunnel on port 3000"
        echo "  stop    - Stop ngrok tunnel"
        echo "  status  - Check tunnel status"
        exit 1
        ;;
esac
