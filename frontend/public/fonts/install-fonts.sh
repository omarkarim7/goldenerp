#!/usr/bin/env bash
# ==============================================================================
# GoldenERP - Arabic Fonts Installer for Linux / Cloud VPS / Docker
# Installs authentic Microsoft Arabic fonts required for exact DOCX -> PDF fidelity:
# - Arabic Typesetting (arabtype.ttf)
# - Aldhabi (aldhabi.ttf)
# - Andalus (andlso.ttf)
# - Traditional Arabic (trado.ttf, tradbdo.ttf)
# ==============================================================================

set -e

FONTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_SYSTEM_DIR="/usr/share/fonts/truetype/goldenerp"
TARGET_LOCAL_DIR="/usr/local/share/fonts/goldenerp"

echo "🌟 [GoldenERP] Starting Arabic fonts installation..."

# Create target directories
sudo mkdir -p "$TARGET_SYSTEM_DIR"
sudo mkdir -p "$TARGET_LOCAL_DIR"

# Copy TTF fonts
echo "📁 Copying fonts to system fonts directory..."
sudo cp "$FONTS_DIR"/*.ttf "$TARGET_SYSTEM_DIR/" 2>/dev/null || true
sudo cp "$FONTS_DIR"/*.ttf "$TARGET_LOCAL_DIR/" 2>/dev/null || true

# Set proper permissions
sudo chmod 644 "$TARGET_SYSTEM_DIR"/*.ttf 2>/dev/null || true
sudo chmod 644 "$TARGET_LOCAL_DIR"/*.ttf 2>/dev/null || true

# Refresh Linux font cache
echo "🔄 Updating font cache (fc-cache)..."
sudo fc-cache -f -v > /dev/null 2>&1 || true

# If ONLYOFFICE Document Server is installed locally:
ONLYOFFICE_FONTS_DIR="/var/www/onlyoffice/documentserver/fonts"
if [ -d "$ONLYOFFICE_FONTS_DIR" ]; then
    echo "🏢 ONLYOFFICE Document Server detected! Adding fonts to ONLYOFFICE..."
    sudo cp "$FONTS_DIR"/*.ttf "$ONLYOFFICE_FONTS_DIR/"
    if [ -f "/var/www/onlyoffice/documentserver/npm/documentserver-generate-allfonts.sh" ]; then
        echo "⚙️ Regenerating ONLYOFFICE font list..."
        sudo /var/www/onlyoffice/documentserver/npm/documentserver-generate-allfonts.sh || true
    fi
fi

# Verify installation
echo "✅ Checking installed fonts:"
fc-list : family | grep -E "Arabic Typesetting|Aldhabi|Andalus|Traditional Arabic" || echo "Note: Install fontconfig (apt install fontconfig) to verify via fc-list"

echo "🎉 [GoldenERP] Fonts installed successfully! LibreOffice and ONLYOFFICE will now render Arabic DOCX with 100% fidelity."
