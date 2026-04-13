#!/bin/bash

# Exit on error
set -e

# Navigate to the project root (clockwise-dashboard)
cd "$(dirname "$0")/.."

ICON_PATH="src-tauri/icons/app-icon.png"
TEMP_ICON="src-tauri/icons/temp-square-icon.png"

if [ ! -f "$ICON_PATH" ]; then
  echo "Error: Base icon $ICON_PATH not found."
  exit 1
fi

echo "Resizing icon to square (1024x1024)..."
convert "$ICON_PATH" -resize 1024x1024\! "$TEMP_ICON"

echo "Generating Tauri icons..."
npx tauri icon "$TEMP_ICON"

echo "Cleaning up temporary and mobile icons..."
rm "$TEMP_ICON"

# Remove iOS specific folders
rm -rf src-tauri/icons/ios

# Remove Android specific folders
rm -rf src-tauri/icons/android

echo "Icon generation complete!"
