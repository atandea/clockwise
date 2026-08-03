#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$REPO_ROOT/clockwise-dashboard"
PKGBUILD_DIR="$REPO_ROOT/pkgbuild"

command -v makepkg >/dev/null 2>&1 || {
  echo "Error: makepkg is required to run the PKGBUILD." >&2
  exit 1
}

command -v npx >/dev/null 2>&1 || {
  echo "Error: npx is required to build the Tauri app." >&2
  exit 1
}

if [[ ! -d "$APP_DIR" ]]; then
  echo "Error: expected app directory not found: $APP_DIR" >&2
  exit 1
fi

PACKAGE_VERSION="$(node -p "require('./clockwise-dashboard/package.json').version")"
PACKAGE_NAME="clockwise-dashboard"

ARCH="$(uname -m)"
case "$ARCH" in
  x86_64) DEB_ARCH='amd64' ;;
  aarch64) DEB_ARCH='arm64' ;;
  *)
    echo "Unsupported host architecture: $ARCH" >&2
    exit 1
    ;;
 esac

DEB_NAME="${PACKAGE_NAME}_${PACKAGE_VERSION}_${DEB_ARCH}.deb"
DEB_OUTPUT_DIR="$APP_DIR/src-tauri/target/release/bundle/deb"

# Sync versions to Tauri config
echo "==> Syncing version $PACKAGE_VERSION to Tauri configs"
node -e "
const fs = require('fs');
const tauriConfPath = './clockwise-dashboard/src-tauri/tauri.conf.json';
if (fs.existsSync(tauriConfPath)) {
    const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, 'utf8'));
    tauriConf.version = process.argv[1];
    fs.writeFileSync(tauriConfPath, JSON.stringify(tauriConf, null, 2) + '\n');
}
const cargoPath = './clockwise-dashboard/src-tauri/Cargo.toml';
if (fs.existsSync(cargoPath)) {
    let cargo = fs.readFileSync(cargoPath, 'utf8');
    cargo = cargo.replace(/^version = \".*\"/m, 'version = \"' + process.argv[1] + '\"');
    fs.writeFileSync(cargoPath, cargo);
}
" "$PACKAGE_VERSION"

pushd "$APP_DIR" >/dev/null

echo "==> Building server and frontend assets"
npm install --include=dev

if [[ ! -x "./node_modules/.bin/vite" ]]; then
  echo "Error: Vite is not installed in clockwise-dashboard/node_modules/.bin." >&2
  echo "Run 'cd $APP_DIR && npm install --include=dev' and verify the install output." >&2
  exit 1
fi

npm run build:server
npm run build

echo "==> Building Tauri deb package"
npx tauri build --bundles deb

popd >/dev/null

echo "==> Locating generated .deb artifact"
if [[ ! -d "$DEB_OUTPUT_DIR" ]]; then
  echo "Error: expected deb output directory not found: $DEB_OUTPUT_DIR" >&2
  exit 1
fi

DEB_SOURCE="$(find "$DEB_OUTPUT_DIR" -maxdepth 1 -type f -name "${PACKAGE_NAME}_${PACKAGE_VERSION}_${DEB_ARCH}.deb" | head -n 1)"
if [[ -z "$DEB_SOURCE" ]]; then
  echo "Error: could not find generated deb named ${PACKAGE_NAME}_${PACKAGE_VERSION}_${DEB_ARCH}.deb in $DEB_OUTPUT_DIR" >&2
  find "$DEB_OUTPUT_DIR" -maxdepth 1 -type f -name "*.deb" -print
  exit 1
fi
mkdir -p "$PKGBUILD_DIR"
cp -f "$REPO_ROOT/PKGBUILD" "$PKGBUILD_DIR/PKGBUILD"
cp -f "$DEB_SOURCE" "$PKGBUILD_DIR/$DEB_NAME"
echo "==> Copied $DEB_SOURCE -> $PKGBUILD_DIR/$DEB_NAME"

pushd "$PKGBUILD_DIR" >/dev/null

echo "==> Running makepkg"
if command -v pacman >/dev/null 2>&1; then
  makepkg -f --syncdeps --noconfirm
else
  echo "Warning: pacman not found; makepkg cannot automatically install missing dependencies." >&2
  makepkg -f
fi

popd >/dev/null

echo "==> Completed: local deb built and PKGBUILD executed"
echo "Deb artifact: $PKGBUILD_DIR/$DEB_NAME"
