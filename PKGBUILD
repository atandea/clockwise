pkgname=clockwise-dashboard
pkgver=$(node -p "require('./clockwise-dashboard/package.json').version" 2>/dev/null || node -p "require('../clockwise-dashboard/package.json').version" 2>/dev/null || echo "1.0.0")
pkgrel=1
pkgdesc="Clockwise - Time Management"
arch=('x86_64' 'aarch64')
url="https://github.com/atandea/clockwise"
license=('MIT')
depends=('cairo' 'desktop-file-utils' 'gdk-pixbuf2' 'glib2' 'gtk3' 'hicolor-icon-theme' 'libappindicator-gtk3' 'libsoup3' 'pango' 'webkit2gtk-4.1')
makedepends=('nodejs' 'npm' 'rust' 'cargo' 'cargo-tauri' 'pkg-config')
options=('!strip' '!emptydirs')
# Use locally built .deb artifacts for PKGBUILD testing.
# Place the built Debian packages next to this PKGBUILD before running makepkg.
source_x86_64=("clockwise-dashboard_${pkgver}_amd64.deb")
source_aarch64=("clockwise-dashboard_${pkgver}_arm64.deb")
sha256sums_x86_64=('SKIP')
sha256sums_aarch64=('SKIP')

build() {
  return 0
}

package() {
  cd "$srcdir"

  local debfile
  if [[ "$CARCH" == "aarch64" ]]; then
    debfile="${srcdir}/clockwise-dashboard_${pkgver}_arm64.deb"
  else
    debfile="${srcdir}/clockwise-dashboard_${pkgver}_amd64.deb"
  fi

  mkdir -p "$srcdir/deb"
  bsdtar -xf "$debfile" -C "$srcdir/deb"

  local data_archive
  data_archive=$(find "$srcdir/deb" -maxdepth 1 -type f -name 'data.tar.*' | head -n 1)
  bsdtar -xf "$data_archive" -C "$pkgdir"
}
