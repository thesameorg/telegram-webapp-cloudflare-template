#!/bin/bash

# Environment loading helper
# Usage: source scripts/load-env.sh

load_env() {
    # Load .env file if it exists (for local development)
    if [ -f .env ]; then
        set -a  # automatically export all variables
        source .env
        set +a  # stop auto-exporting
        echo "🔧 Loaded environment from .env file"
    else
        echo "🔧 Using system environment variables"
    fi
}

# Ensure directories exist
mkdir -p logs

# Auto-load when sourced
load_env