#!/bin/bash
# Replaces the installed FridgeFirst.app in /Applications with a freshly
# built copy from release/. Run via `npm run electron:reinstall`, which
# builds first, then calls this script.
set -e

APP_NAME="FridgeFirst.app"

# electron-builder's output folder name depends on target architecture
# (mac = Intel, mac-arm64 = Apple Silicon) — find whichever exists.
SRC_APP=$(find release -maxdepth 2 -name "$APP_NAME" -print -quit)

if [ -z "$SRC_APP" ]; then
  echo "Couldn't find a built $APP_NAME under release/ — did the build succeed?"
  exit 1
fi

echo "Closing FridgeFirst if it's running..."
osascript -e 'quit app "FridgeFirst"' >/dev/null 2>&1 || true
sleep 1
pkill -f "FridgeFirst" >/dev/null 2>&1 || true

echo "Removing old install from /Applications..."
rm -rf "/Applications/$APP_NAME"

echo "Installing new build ($SRC_APP)..."
cp -R "$SRC_APP" /Applications/

echo "Launching..."
open "/Applications/$APP_NAME"

echo "Done — FridgeFirst reinstalled and relaunched."
