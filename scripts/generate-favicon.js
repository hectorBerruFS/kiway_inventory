const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

/**
 * Script para generar favicon.ico desde logo.png
 * Requiere: sharp (npm install sharp)
 * Uso: node scripts/generate-favicon.js
 */

async function generateFavicon() {
  const logoPath = path.join(__dirname, '../public/logo.png');
  const icoPath = path.join(__dirname, '../public/favicon.ico');
  const applePath = path.join(__dirname, '../public/apple-touch-icon.png');

  // Verificar que logo existe
  if (!fs.existsSync(logoPath)) {
    console.error('❌ ERROR: public/logo.png no encontrado');
    console.error('Guarda la imagen del logo en: public/logo.png');
    process.exit(1);
  }

  try {
    console.log('Generando favicon...');

    // Generar favicon.ico (32x32)
    // Nota: sharp genera PNG, ICO requiere formato especial
    // Usamos 32x32 como estándar
    await sharp(logoPath)
      .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(icoPath.replace('.ico', '.png'));

    console.log('✓ favicon.png generado (32x32)');

    // Generar apple-touch-icon.png (180x180)
    await sharp(logoPath)
      .resize(180, 180, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(applePath);

    console.log('✓ apple-touch-icon.png generado (180x180)');

    console.log('\n✓ Iconos generados exitosamente!');
    console.log('\nPróximos pasos:');
    console.log('1. Convierte favicon.png a .ico usando:');
    console.log('   https://convertio.co/png-ico/ o');
    console.log('   ImageMagick: convert public/favicon.png public/favicon.ico');
    console.log('2. O reemplaza el favicon.png por .ico manualmente');
    console.log('3. Reinicia el servidor (npm run dev)');
  } catch (err) {
    console.error('❌ Error generando iconos:', err.message);
    process.exit(1);
  }
}

// Verificar si sharp está instalado
try {
  require('sharp');
  generateFavicon();
} catch {
  console.error('❌ ERROR: sharp no está instalado');
  console.error('Instala con: npm install --save-dev sharp');
  process.exit(1);
}
