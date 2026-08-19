#!/usr/bin/env bash
set -e

echo "==================================================="
echo "       AntiHarness 1-Click Auto-Updater            "
echo "==================================================="
echo ""

echo "[1/4] Pulling latest updates from GitHub (main)..."
git pull origin main

echo ""
echo "[2/4] Installing / updating root dependencies..."
npm install

echo ""
echo "[3/4] Installing backend & frontend dependencies..."
npm --prefix server install
npm --prefix client install

echo ""
echo "[4/4] Building latest client assets..."
npm --prefix client run build

echo ""
echo "==================================================="
echo "[SUCCESS] AntiHarness is updated to the latest version!"
echo "==================================================="
echo ""
echo "You can start AntiHarness now with: npm run dev"
