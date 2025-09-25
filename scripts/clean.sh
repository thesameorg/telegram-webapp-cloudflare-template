#!/bin/bash

# Clean script for the project
echo "Cleaning node_modules and build artifacts"
rm -rf backend/node_modules backend/dist
rm -rf frontend/node_modules frontend/dist
rm -rf logs pids
echo "Cleanup completed"