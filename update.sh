#!/usr/bin/env bash
set -e

echo "==================================================="
echo "     🔄 AntiHarness 1-Click Smart Auto-Updater     "
echo "==================================================="
echo ""

# 1. Directory Detection
TARGET_DIR="AntiHarness"
if [ ! -f "client/package.json" ]; then
    if [ -f "$TARGET_DIR/client/package.json" ]; then
        echo "[*] Entering $TARGET_DIR directory..."
        cd "$TARGET_DIR"
    else
        echo "[ERROR] AntiHarness directory not found."
        echo "Please run install.sh first or run this script from inside the repository."
        exit 1
    fi
fi

# 2. Pull Updates
echo "[1/4] Pulling latest updates from GitHub (main)..."
git pull origin main

# 3. Update Dependencies
echo ""
echo "[2/4] Updating root, server, and client dependencies..."
npm run install:all || {
    echo "[!] Retrying sequential install..."
    npm install
    npm --prefix server install
    npm --prefix client install
}

# 4. Rebuild Client
echo ""
echo "[3/4] Building latest client assets..."
npm --prefix client run build

# 5. Done & Auto Start
echo ""
echo "==================================================="
echo "[SUCCESS] AntiHarness is updated to the latest version!"
echo "==================================================="
echo ""
echo "Starting development environment: npm run dev"
echo "Press Ctrl+C anytime to stop."
echo ""

npm run dev
