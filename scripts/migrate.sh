#!/bin/bash

# Migration script for running all D1 database migrations
# Usage: ./scripts/migrate.sh [--local|--remote]

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load environment variables
source "$SCRIPT_DIR/load-env.sh"

# Default to local if no argument provided
ENVIRONMENT=${1:-"--local"}

if [ "$ENVIRONMENT" != "--local" ] && [ "$ENVIRONMENT" != "--remote" ]; then
    echo "Error: Invalid environment. Use --local or --remote"
    exit 1
fi

echo "Running database migrations ($ENVIRONMENT)..."

MIGRATIONS_DIR="$PROJECT_ROOT/backend/drizzle/migrations"
DB_NAME="twa-tpl-db"

if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo "Error: Migrations directory $MIGRATIONS_DIR not found"
    exit 1
fi

# Count migration files
MIGRATION_COUNT=$(find "$MIGRATIONS_DIR" -name "*.sql" | wc -l)

if [ "$MIGRATION_COUNT" -eq 0 ]; then
    echo "No migration files found in $MIGRATIONS_DIR"
    exit 0
fi

echo "Found $MIGRATION_COUNT migration file(s) to run"

# Change to project root to run wrangler
cd "$PROJECT_ROOT"

# Run each migration file
for migration_file in "$MIGRATIONS_DIR"/*.sql; do
    if [ -f "$migration_file" ]; then
        migration_name=$(basename "$migration_file")
        echo "Running migration: $migration_name"

        if ./node_modules/.bin/wrangler d1 execute "$DB_NAME" "$ENVIRONMENT" --file="$migration_file"; then
            echo "✅ Migration $migration_name completed successfully"
        else
            echo "⚠️  Migration $migration_name may have already been applied"
        fi
    fi
done

echo "All migrations completed"