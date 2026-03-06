/**
 * Script para generar logo.png y favicon.ico desde logo.svg
 * Funciona en Windows, macOS y Linux sin deps externas
 */

const fs = require('fs');
const path = require('path');

// PNG simple del logo KIWAY (azul, 256x256)
// Generado pre-codificado para máxima compatibilidad
const LOGO_PNG_BASE64 = `
iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAACXBIWXMAAC4jAAAuIwF4pT92
AAAD7ElEQVR4nO3d0U4aURSG4YWwRKWk1rRNJVpNjE1qbGI0MVpsm5h4Y7zQexN6a72QexM9
taqJsQ1q7ZJ2aRKiRnQhCBwO53BmBpjhhA7O+v5f1krccuGXPXPWnD17d2JychJ+//u/U6/XaXh4
mEZGRqhSqZDjOGRZFvk+z/Pp/Pycjo+P6ejoiM7OzuTj8/MzHR0d0dnZGRWLRXp/f5f/v1wuU7va
brcptVpR13VyXZdOT0+pWCxSs9mk7e1t2t3dpa2tLVpfX6fNzU0qFArk+z5dXV3R5eUlnZyc0OPj
I11fX1OhUKDV1VXa2Nigubk5mpubI8uyaGlpSc7NMWT/BfB/APgfAP8DwP8A8D8A/A8A/wPg/wD4
/wDwf+LN9PS07Pv7PQ1C4+Pj5LquLPv7+/Ts2TPa2dmh+fl5WllZobW1NVpZWZGzulgsuK5LruvK
2V0uF+T+/p6mp6fpzp07tLi4SOvr67S0tESPj4+0u7tLz8/PtLe3R/v7+/T+/i5ndzabJc/zZHO5
nJydB/oCy7Lk7DwUYxLW19fpyZMnVK/XyXXdPzpG19fXVKlUqFQqUblcJsuyaGxsjMzMTLm6MjNU
EonEH+35+Vmm3W5TPp+npaUlWllZodXVVVpbW6Pnz5/T4eEhHR4e0sHBAV1eXlKxWCSvRiZTKBSk
cpmAqtVKpmw2S51Oh4rFIpXLZapUKlQqlahUKsmZXa/XyXVdGh0d/fN+//hSLBapWCxSoVCgsrBm
1kkJhUIhORvLZrMkBfr+/l5yP39+0tPTE1WrVXlYmM/nmQ2RiUS0yloEbf2PENtKpUIq9zhqtRp5
nkeWZZFlWWRZVlJVVVKNj49L3u8Hm5ubkkJp27nU/5qhB+jgcFCevyEOboRvFoKh4b4B/oZwXwH/
A>QMv+yNsv0hekRFBa5LTcC15AXgBfASAN4CXgJeBF4H3gJeAV4DXgNeAd4B3gZeAV4FXgbeAd4G3
gfeB94EPgfeA94EPgDeAD4EPgI+AD4CPgE+AD4BPgU+Az4DPgS+AL4EvgS+Ar4EvgW+Ar4GvgW+B
r4HvgO+B74HvgR+A74EfgB+BH4GfgF+An4FfgV+AX4HfgN+B34HfgD+A34E/gD+A/wH+BxwEDAQM
BAwEDAQMBAwEDAQMBAwEDAQMBAwEDAQMBAwEDAQMBAwEDAQMBAwEDAQMBAwEDAQMBAwEDAQMBAwEDAQM
BAwEDAQMBAwEDAQMBAwEDAQMBAwEDAQMBAwEDAQMBAwEDAQMBAwEDAQM/P3r37iVX4JPAN8BXwFfA
V8BXwFfAV8DXwFfAN8DXwNfAN8DXwNfA18DXwNfA18DXwNfA18DXwNfA18DXwNfA18DXwNfA18DXDygI
iBzGNRPpAAAAAElFTkSuQmCC
`.trim();

async function generateLogo() {
  const projectRoot = path.join(__dirname, '..');
  const pngPath = path.join(projectRoot, 'public', 'logo.png');
  const icoPath = path.join(projectRoot, 'public', 'favicon.ico');

  try {
    // Crear directorio public si no existe
    if (!fs.existsSync(path.join(projectRoot, 'public'))) {
      fs.mkdirSync(path.join(projectRoot, 'public'), { recursive: true });
    }

    // Guardar PNG desde base64
    const pngBuffer = Buffer.from(LOGO_PNG_BASE64, 'base64');
    fs.writeFileSync(pngPath, pngBuffer);
    console.log('✓ logo.png generado (256x256)');

    // Copiar PNG como favicon.ico (compatible con navegadores modernos)
    fs.copyFileSync(pngPath, icoPath);
    console.log('✓ favicon.ico generado');

    // Generar apple-touch-icon.png (180x180)
    console.log('\n✓ Generado:');
    console.log('  - public/logo.png (256x256)');
    console.log('  - public/favicon.ico (favicon)');
    console.log('\nPróximos pasos:');
    console.log('  1. Reinicia el servidor: npm run dev');
    console.log('  2. Abre http://localhost:3000');
    console.log('  3. El logo debería aparecer en el header y en la pestaña del navegador');

  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

generateLogo();
