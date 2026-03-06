#!/bin/bash

# Script para convertir logo.svg a PNG y generar favicon.ico
# Usa ImageMagick (convert)

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SVG_FILE="$PROJECT_ROOT/public/logo.svg"
PNG_FILE="$PROJECT_ROOT/public/logo.png"
ICO_FILE="$PROJECT_ROOT/public/favicon.ico"

if [ ! -f "$SVG_FILE" ]; then
    echo "❌ ERROR: $SVG_FILE no encontrado"
    exit 1
fi

# Verificar ImageMagick
if ! command -v convert &> /dev/null; then
    echo "❌ ERROR: ImageMagick no instalado"
    echo ""
    echo "Instala ImageMagick desde: https://imagemagick.org/script/download.php"
    echo ""
    echo "O usa una alternativa online:"
    echo "  1. Abre: https://convertio.co/svg-png/"
    echo "  2. Sube: public/logo.svg"
    echo "  3. Descarga como PNG a: public/logo.png"
    echo "  4. Después ejecuta de nuevo este script"
    exit 1
fi

echo "🎨 Convirtiendo SVG a PNG..."
convert -density 300 -resize 256x256 "$SVG_FILE" -background white -alpha off "$PNG_FILE"

if [ -f "$PNG_FILE" ]; then
    echo "✓ PNG generado: $PNG_FILE"
else
    echo "❌ Error al generar PNG"
    exit 1
fi

echo "🎪 Convirtiendo PNG a ICO..."
convert "$PNG_FILE" -define icon:auto-resize=256,128,96,64,48,32,16 "$ICO_FILE"

if [ -f "$ICO_FILE" ]; then
    echo "✓ Favicon generado: $ICO_FILE"
    echo ""
    echo "✓ ¡Listo! Reinicia el servidor con: npm run dev"
else
    echo "❌ Error al generar ICO"
    exit 1
fi
