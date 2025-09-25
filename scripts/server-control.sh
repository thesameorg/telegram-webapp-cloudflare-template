#!/bin/bash

# Telegram Web App + Bot Template - Server Control Script
# Usage: ./scripts/server-control.sh <action> [service]

setup_dirs() {
    mkdir -p logs pids
}

start_backend() {
    echo "Starting backend dev server in background on http://localhost:8787"
    setup_dirs
    cd backend && nohup npx wrangler dev --local --port 8787 > ../logs/backend.log 2>&1 & echo $! > ../pids/backend.pid
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
    cd frontend && nohup npm run dev > ../logs/frontend.log 2>&1 & echo $! > ../pids/frontend.pid
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
    if [ -f pids/backend.pid ]; then
        PID=$(cat pids/backend.pid)
        if kill -0 $PID 2>/dev/null; then
            kill $PID && echo "Backend stopped (PID: $PID)"
        else
            echo "Backend not running (stale PID)"
        fi
        rm -f pids/backend.pid
    else
        echo "Backend not running"
    fi
}

stop_frontend() {
    if [ -f pids/frontend.pid ]; then
        PID=$(cat pids/frontend.pid)
        if kill -0 $PID 2>/dev/null; then
            kill $PID && echo "Frontend stopped (PID: $PID)"
        else
            echo "Frontend not running (stale PID)"
        fi
        rm -f pids/frontend.pid
    else
        echo "Frontend not running"
    fi
}

status() {
    echo "=== Server Status ==="
    if [ -f pids/backend.pid ] && kill -0 $(cat pids/backend.pid) 2>/dev/null; then
        echo "✅ Backend: Running (PID: $(cat pids/backend.pid)) - http://localhost:8787"
    else
        echo "❌ Backend: Stopped"
    fi
    if [ -f pids/frontend.pid ] && kill -0 $(cat pids/frontend.pid) 2>/dev/null; then
        echo "✅ Frontend: Running (PID: $(cat pids/frontend.pid)) - http://localhost:5173"
    else
        echo "❌ Frontend: Stopped"
    fi
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
               echo "Frontend: http://localhost:5173"
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