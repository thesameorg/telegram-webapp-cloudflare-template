#!/bin/bash

# Telegram Web App + Bot Template - Server Control Script
# Usage: ./scripts/server-control.sh <action> [service]

setup_dirs() {
    mkdir -p logs pids
}


start_backend() {
    echo "Starting backend dev server in background on http://localhost:8787"
    setup_dirs
    local current_dir=$(pwd)
    (cd backend && nohup npx wrangler dev --local --port 8787 > "$current_dir/logs/backend.log" 2>&1 & echo $! > "$current_dir/pids/backend.pid")
    sleep 1
    if [ -f pids/backend.pid ]; then
        echo "Backend started with PID: $(cat pids/backend.pid)"
        echo "Logs: tail -f logs/backend.log"
    else
        echo "Failed to start backend"
        exit 1
    fi
}

start_frontend() {
    echo "Starting frontend dev server in background"
    setup_dirs
    local current_dir=$(pwd)
    (cd frontend && nohup npm run dev > "$current_dir/logs/frontend.log" 2>&1 & echo $! > "$current_dir/pids/frontend.pid")
    sleep 1
    if [ -f pids/frontend.pid ]; then
        echo "Frontend started with PID: $(cat pids/frontend.pid)"
        echo "Logs: tail -f logs/frontend.log"
    else
        echo "Failed to start frontend"
        exit 1
    fi
}

stop_backend() {
    local stopped=false

    # Try to stop using saved PID first
    if [ -f pids/backend.pid ]; then
        PID=$(cat pids/backend.pid)
        if kill -0 $PID 2>/dev/null; then
            kill $PID && echo "Backend stopped (PID: $PID)" && stopped=true
        else
            echo "Backend not running (stale PID)"
        fi
        rm -f pids/backend.pid
    fi

    # Kill any remaining wrangler processes on port 8787
    local wrangler_pids=$(ps aux | grep "wrangler dev.*8787" | grep -v grep | awk '{print $2}')
    if [ -n "$wrangler_pids" ]; then
        echo $wrangler_pids | xargs kill 2>/dev/null && echo "Killed remaining wrangler processes" && stopped=true
    fi


    if [ "$stopped" = false ]; then
        echo "Backend not running"
    fi
}

stop_frontend() {
    local stopped=false

    # Try to stop using saved PID first
    if [ -f pids/frontend.pid ]; then
        PID=$(cat pids/frontend.pid)
        if kill -0 $PID 2>/dev/null; then
            kill $PID && echo "Frontend stopped (PID: $PID)" && stopped=true
        else
            echo "Frontend not running (stale PID)"
        fi
        rm -f pids/frontend.pid
    fi

    # Kill any remaining vite/npm dev processes
    local vite_pids=$(ps aux | grep -E "(vite|npm run dev)" | grep -v grep | awk '{print $2}')
    if [ -n "$vite_pids" ]; then
        echo $vite_pids | xargs kill 2>/dev/null && echo "Killed remaining frontend processes" && stopped=true
    fi

    if [ "$stopped" = false ]; then
        echo "Frontend not running"
    fi
}

status() {
    echo "=== Server Status ==="

    # Backend status
    local backend_running=false
    if [ -f pids/backend.pid ] && kill -0 $(cat pids/backend.pid) 2>/dev/null; then
        echo "✅ Backend: Running (PID: $(cat pids/backend.pid)) - http://localhost:8787"
        backend_running=true
    else
        # Check for running wrangler processes
        local wrangler_pid=$(ps aux | grep "wrangler dev.*8787" | grep -v grep | awk '{print $2}' | head -1)
        if [ -n "$wrangler_pid" ]; then
            echo "⚠️ Backend: Running (untracked PID: $wrangler_pid) - http://localhost:8787"
            backend_running=true
        fi
    fi
    if [ "$backend_running" = false ]; then
        echo "❌ Backend: Stopped"
    fi

    # Frontend status
    local frontend_running=false
    if [ -f pids/frontend.pid ] && kill -0 $(cat pids/frontend.pid) 2>/dev/null; then
        # Try to extract actual port from logs
        frontend_port=$(grep -o "Local:.*http://localhost:[0-9]*" logs/frontend.log 2>/dev/null | grep -o "[0-9]*" | tail -1)
        if [ -n "$frontend_port" ]; then
            echo "✅ Frontend: Running (PID: $(cat pids/frontend.pid)) - http://localhost:$frontend_port"
        else
            echo "✅ Frontend: Running (PID: $(cat pids/frontend.pid)) - http://localhost:3000"
        fi
        frontend_running=true
    else
        # Check for running vite processes
        local vite_pid=$(ps aux | grep "vite" | grep -v grep | awk '{print $2}' | head -1)
        if [ -n "$vite_pid" ]; then
            echo "⚠️ Frontend: Running (untracked PID: $vite_pid) - check logs for port"
            frontend_running=true
        fi
    fi
    if [ "$frontend_running" = false ]; then
        echo "❌ Frontend: Stopped"
    fi

    # KV status
}

logs() {
    echo "=== Backend Logs ==="
    if [ -f logs/backend.log ]; then tail -f logs/backend.log; else echo "Backend not running"; fi &
    echo "=== Frontend Logs ==="
    if [ -f logs/frontend.log ]; then tail -f logs/frontend.log; else echo "Frontend not running"; fi
}

case "$1" in
    start)
        case "$2" in
            backend) start_backend ;;
            frontend) start_frontend ;;
            *) start_backend && start_frontend
               echo "Both servers started!"
               echo "Backend: http://localhost:8787"
               echo "Frontend: http://localhost:3000"
               echo "Check logs: npm run logs"
               ;;
        esac
        ;;
    stop)
        case "$2" in
            backend) stop_backend ;;
            frontend) stop_frontend ;;
            *) stop_backend && stop_frontend
               echo "All servers stopped"
               ;;
        esac
        ;;
    restart)
        case "$2" in
            backend) stop_backend && start_backend
                     echo "Backend restarted" ;;
            frontend) stop_frontend && start_frontend
                      echo "Frontend restarted" ;;
            *) stop_backend && stop_frontend && start_backend && start_frontend
               echo "All servers restarted" ;;
        esac
        ;;
    status) status ;;
    logs) logs ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs} [backend|frontend]"
        exit 1
        ;;
esac