#!/bin/bash

# Install all dependencies
echo "Installing all dependencies"
echo "Installing backend dependencies..."
cd backend && npm ci
echo "Installing frontend dependencies..."
cd ../frontend && npm ci
echo "All dependencies installed"