#!/usr/bin/env bash
set -e

echo "==================================================="
echo "     🚀 AntiHarness Automated 1-Click Installer    "
echo "==================================================="
echo ""

# 1. Check Git
if ! command -v git &> /dev/null; then
    echo "[ERROR] Git is not installed or not in PATH."
    echo "Please install Git from https://git-scm.com/ and rerun."
    exit 1
fi

# 2. Check Node & NPM
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js is not installed or not in PATH."
    echo "Please install Node.js (v18+ recommended) from https://nodejs.org/ and rerun."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "[ERROR] npm is not found in PATH."
    exit 1
fi

# 3. Check Workspace Directory
REPO_URL="https://github.com/nickob4by/AntiHarness.git"
TARGET_DIR="AntiHarness"

if [ -f "client/package.json" ] && [ -f "server/package.json" ]; then
    echo "[*] Currently inside AntiHarness workspace."
elif [ -f "$TARGET_DIR/client/package.json" ]; then
    echo "[*] Found existing $TARGET_DIR directory. Entering..."
    cd "$TARGET_DIR"
else
    echo "[*] Cloning AntiHarness repository from $REPO_URL..."
    git clone "$REPO_URL" "$TARGET_DIR"
    cd "$TARGET_DIR"
fi

# 4. Install Dependencies
echo ""
echo "[1/3] Installing root, server, and client dependencies..."
npm run install:all || {
    echo "[!] Retrying sequential install..."
    npm install
    npm --prefix server install
    npm --prefix client install
}

# 5. Build Client
echo ""
echo "[2/3] Building client production bundle..."
npm --prefix client run build

# 6. Success & Launch Dev Server
echo ""
echo "==================================================="
echo " [SUCCESS] AntiHarness is fully installed & ready!  "
echo "==================================================="
echo ""
echo "Launching development environment: npm run dev"
echo "Press Ctrl+C anytime to stop."
echo ""

npm run dev
