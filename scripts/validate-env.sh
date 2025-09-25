#!/bin/bash

set -e

# Load environment variables
source "$(dirname "$0")/load-env.sh"

echo "🔍 Validating environment configuration..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0

# Function to check required variable
check_required() {
    local var_name=$1
    local var_value=${!var_name}

    if [ -z "$var_value" ]; then
        echo -e "${RED}❌ $var_name is not set${NC}"
        ERRORS=$((ERRORS + 1))
        return 1
    else
        echo -e "${GREEN}✅ $var_name is set${NC}"
        return 0
    fi
}

# Function to check optional variable
check_optional() {
    local var_name=$1
    local var_value=${!var_name}

    if [ -z "$var_value" ]; then
        echo -e "${YELLOW}⚠️  $var_name is not set (optional)${NC}"
    else
        echo -e "${GREEN}✅ $var_name is set${NC}"
    fi
}

# Function to validate bot token format
validate_bot_token() {
    local token=$1
    if [[ $token =~ ^[0-9]+:[A-Za-z0-9_-]+$ ]]; then
        echo -e "${GREEN}✅ Bot token format is valid${NC}"
        return 0
    else
        echo -e "${RED}❌ Bot token format is invalid${NC}"
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

# Function to test bot token
test_bot_token() {
    local token=$1
    echo "🤖 Testing bot token..."

    local response=$(curl -s "https://api.telegram.org/bot$token/getMe")
    if echo "$response" | jq -e '.ok' > /dev/null; then
        local bot_name=$(echo "$response" | jq -r '.result.username')
        echo -e "${GREEN}✅ Bot token is valid (bot: @$bot_name)${NC}"
        return 0
    else
        echo -e "${RED}❌ Bot token is invalid or bot is inaccessible${NC}"
        echo "$response" | jq '.'
        ERRORS=$((ERRORS + 1))
        return 1
    fi
}

echo ""
echo "📋 Checking required environment variables..."

# Check required variables
check_required "TELEGRAM_BOT_TOKEN"

# Check optional variables
echo ""
echo "📋 Checking optional environment variables..."
check_optional "CLOUDFLARE_ACCOUNT_ID"
check_optional "ENVIRONMENT"
check_optional "WEBHOOK_SECRET"

# Validate bot token format and test it
if [ ! -z "$TELEGRAM_BOT_TOKEN" ]; then
    echo ""
    echo "🔐 Validating bot token..."
    validate_bot_token "$TELEGRAM_BOT_TOKEN"

    if command -v curl &> /dev/null && command -v jq &> /dev/null; then
        test_bot_token "$TELEGRAM_BOT_TOKEN"
    else
        echo -e "${YELLOW}⚠️  curl or jq not available, skipping bot token test${NC}"
    fi
fi

# Check for required tools
echo ""
echo "🛠️  Checking required tools..."

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js is installed ($NODE_VERSION)${NC}"
else
    echo -e "${RED}❌ Node.js is not installed${NC}"
    ERRORS=$((ERRORS + 1))
fi

if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm is installed ($NPM_VERSION)${NC}"
else
    echo -e "${RED}❌ npm is not installed${NC}"
    ERRORS=$((ERRORS + 1))
fi

if command -v ngrok &> /dev/null; then
    echo -e "${GREEN}✅ ngrok is installed${NC}"
else
    echo -e "${YELLOW}⚠️  ngrok is not installed (needed for local development)${NC}"
    SHOULD_EXIT=true
fi

if command -v curl &> /dev/null; then
    echo -e "${GREEN}✅ curl is installed${NC}"
else
    echo -e "${RED}❌ curl is not installed${NC}"
    ERRORS=$((ERRORS + 1))
fi

if command -v jq &> /dev/null; then
    echo -e "${GREEN}✅ jq is installed${NC}"
else
    echo -e "${YELLOW}⚠️  jq is not installed (helpful for JSON processing)${NC}"
fi

# Check project files
echo ""
echo "📁 Checking project structure..."

if [ -f "backend/package.json" ]; then
    echo -e "${GREEN}✅ backend/package.json exists${NC}"
else
    echo -e "${RED}❌ backend/package.json not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "frontend/package.json" ]; then
    echo -e "${GREEN}✅ frontend/package.json exists${NC}"
else
    echo -e "${RED}❌ frontend/package.json not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ -f "wrangler.toml" ]; then
    echo -e "${GREEN}✅ wrangler.toml exists${NC}"
else
    echo -e "${RED}❌ wrangler.toml not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ -f ".env.example" ]; then
    echo -e "${GREEN}✅ .env.example exists${NC}"
else
    echo -e "${RED}❌ .env.example not found${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check dependencies
echo ""
echo "📦 Checking dependencies..."

if [ -d "backend/node_modules" ]; then
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  Backend dependencies not installed (run: npm run install)${NC}"
fi

if [ -d "frontend/node_modules" ]; then
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend dependencies not installed (run: npm run install)${NC}"
fi

# Summary
echo ""
echo "📊 Validation Summary"
echo "===================="

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! Environment is ready.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Set up local development: npm run tunnel"
    echo "2. Start backend: npm run dev:backend"
    echo "3. Start frontend: npm run dev:frontend"
    exit 0
else
    echo -e "${RED}❌ $ERRORS error(s) found. Please fix them before proceeding.${NC}"
    echo ""
    echo "Common fixes:"
    echo "1. Copy .env.example to .env and fill in your values"
    echo "2. Install Node.js from https://nodejs.org"
    echo "3. Install dependencies: npm run install"
    echo "4. Install ngrok from https://ngrok.com/download"
    exit 1
fi