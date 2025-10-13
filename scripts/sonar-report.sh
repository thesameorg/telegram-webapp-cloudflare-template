#!/bin/bash

# SonarQube Report Script
# Fetches and displays issues from SonarQube API

set -e

# Load environment variables
if [ -f .env ]; then
    set -a
    source .env
    set +a
fi

# Configuration
SONAR_HOST="${SONAR_HOST_URL:-http://localhost:10000}"
PROJECT_KEY="telegram-webapp-cloudflare-template"

# Check if SONAR_TOKEN is set
if [ -z "$SONAR_TOKEN" ]; then
    echo "Error: SONAR_TOKEN environment variable is not set"
    echo "Please set it in your .env file or export it"
    exit 1
fi

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "Fetching SonarQube analysis for project: $PROJECT_KEY"
echo "SonarQube server: $SONAR_HOST"
echo ""

# Function to fetch issues by severity
fetch_issues() {
    local severity=$1
    local page_size=100

    response=$(curl -s -u "$SONAR_TOKEN:" \
        "$SONAR_HOST/api/issues/search?componentKeys=$PROJECT_KEY&severities=$severity&ps=$page_size&resolved=false")

    echo "$response"
}

# Function to display issues
display_issues() {
    local severity=$1
    local color=$2
    local issues_json=$3

    issue_count=$(echo "$issues_json" | jq -r '.total // 0')

    if [ "$issue_count" -gt 0 ]; then
        echo -e "${color}=== $severity Issues ($issue_count) ===${NC}"
        echo ""

        echo "$issues_json" | jq -r '.issues[] |
            "File: \(.component | sub(".*:"; ""))\n" +
            "Line: \(.line // "N/A")\n" +
            "Rule: \(.rule)\n" +
            "Message: \(.message)\n" +
            "Type: \(.type)\n" +
            "---"'

        echo ""
    fi
}

# Fetch project metrics
echo "Fetching project metrics..."
metrics=$(curl -s -u "$SONAR_TOKEN:" \
    "$SONAR_HOST/api/measures/component?component=$PROJECT_KEY&metricKeys=bugs,vulnerabilities,code_smells,coverage,duplicated_lines_density,ncloc")

echo -e "${BLUE}=== Project Overview ===${NC}"
echo "$metrics" | jq -r '.component.measures[] | "\(.metric): \(.value)"'
echo ""

# Fetch issues by severity
echo "Fetching issues..."
echo ""

blocker_issues=$(fetch_issues "BLOCKER")
display_issues "BLOCKER" "$RED" "$blocker_issues"

critical_issues=$(fetch_issues "CRITICAL")
display_issues "CRITICAL" "$RED" "$critical_issues"

major_issues=$(fetch_issues "MAJOR")
display_issues "MAJOR" "$YELLOW" "$major_issues"

minor_issues=$(fetch_issues "MINOR")
display_issues "MINOR" "$GREEN" "$minor_issues"

info_issues=$(fetch_issues "INFO")
display_issues "INFO" "$BLUE" "$info_issues"

# Summary
total_blocker=$(echo "$blocker_issues" | jq -r '.total // 0')
total_critical=$(echo "$critical_issues" | jq -r '.total // 0')
total_major=$(echo "$major_issues" | jq -r '.total // 0')
total_minor=$(echo "$minor_issues" | jq -r '.total // 0')
total_info=$(echo "$info_issues" | jq -r '.total // 0')
total_issues=$((total_blocker + total_critical + total_major + total_minor + total_info))

echo -e "${BLUE}=== Summary ===${NC}"
echo -e "${RED}Blocker: $total_blocker${NC}"
echo -e "${RED}Critical: $total_critical${NC}"
echo -e "${YELLOW}Major: $total_major${NC}"
echo -e "${GREEN}Minor: $total_minor${NC}"
echo -e "${BLUE}Info: $total_info${NC}"
echo "Total: $total_issues"
echo ""

# Exit with error if there are blocker or critical issues
if [ "$total_blocker" -gt 0 ] || [ "$total_critical" -gt 0 ]; then
    echo -e "${RED}Build should fail: Found blocker or critical issues${NC}"
    exit 1
fi

echo -e "${GREEN}SonarQube report complete!${NC}"
