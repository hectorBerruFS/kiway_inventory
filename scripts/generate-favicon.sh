#!/bin/bash

# Script para generar favicon.ico desde logo.png
# Requiere: ImageMagick (convert) instalado

if ! command -v convert &> /dev/null; then
    echo "ERROR: ImageMagick no está instalado."
    echo "Instala con:"
    echo "  macOS:    brew install imagemagick"
    echo "  Ubuntu:   sudo apt install imagemagick"
    echo "  Windows:  https://imagemagick.org/script/download.php"
    exit 1
fi

if [ ! -f "public/logo.png" ]; then
    echo "ERROR: public/logo.png no encontrado"
    exit 1
fi

echo "Generando favicon.ico desde logo.png..."
convert public/logo.png -define icon:auto-resize=256,128,96,64,48,32,16 public/favicon.ico

if [ $? -eq 0 ]; then
    echo "✓ favicon.ico generado en public/"
    echo "✓ También se puede crear apple-touch-icon.png:"
    echo "  convert public/logo.png -resize 180x180 public/apple-touch-icon.png"
else
    echo "ERROR: No se pudo generar favicon.ico"
    exit 1
fi
