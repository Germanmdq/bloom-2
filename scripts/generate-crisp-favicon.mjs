import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

// Diseño de Favicon optimizado para 16x16, 32x32 y pestañas de navegador:
// Fondo verde inglés elegante (#1a3028) con bordes suavemente redondeados.
// Isotipo central: Taza de café de especialidad con asa y líneas de vapor ascendente en oro cálido (#f5e8ca / #c4b896).
// Sin textos minúsculos para que se vea 100% nítido y legible en cualquier tamaño.
const createFaviconSvg = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e382f" />
      <stop offset="100%" stop-color="#12221b" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fdf3dc" />
      <stop offset="50%" stop-color="#f5e8ca" />
      <stop offset="100%" stop-color="#c4b896" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
  </defs>

  <!-- Fondo Squircle redondeado elegante -->
  <rect width="128" height="128" rx="32" fill="url(#bgGrad)" />
  <rect x="2" y="2" width="124" height="124" rx="30" fill="none" stroke="rgba(196, 184, 150, 0.25)" stroke-width="2" />

  <!-- Símbolo: Taza de café Bloom con plato y vapor -->
  <g filter="url(#glow)" transform="translate(0, 4)">
    <!-- Plato base -->
    <ellipse cx="64" cy="98" rx="42" ry="7" fill="url(#goldGrad)" />

    <!-- Taza de café -->
    <path d="M30 48 C30 84, 82 84, 82 48 Z" fill="url(#goldGrad)" />

    <!-- Borde superior de la taza -->
    <ellipse cx="56" cy="48" rx="26" ry="7" fill="#14241d" stroke="url(#goldGrad)" stroke-width="3" />

    <!-- Asa de la taza -->
    <path d="M80 52 C94 52, 98 72, 80 76" fill="none" stroke="url(#goldGrad)" stroke-width="6.5" stroke-linecap="round" />

    <!-- Líneas de vapor ondulantes (Aroma de café recién tostado) -->
    <path d="M46 36 C42 28, 48 20, 44 14" fill="none" stroke="url(#goldGrad)" stroke-width="4.5" stroke-linecap="round" />
    <path d="M56 38 C52 27, 60 18, 56 10" fill="none" stroke="url(#goldGrad)" stroke-width="5" stroke-linecap="round" />
    <path d="M66 36 C62 28, 68 20, 64 14" fill="none" stroke="url(#goldGrad)" stroke-width="4.5" stroke-linecap="round" />
  </g>
</svg>
`;

async function run() {
  console.log('--- GENERANDO FAVICON DE ALTA DEFINICIÓN PARA BLOOM ---');

  const svg64 = createFaviconSvg(64);
  const svg32 = createFaviconSvg(32);
  const svg512 = createFaviconSvg(512);

  // 1. Guardar SVG para navegadores modernos
  fs.writeFileSync(path.resolve('public', 'favicon.svg'), svg512, 'utf-8');
  console.log('✓ Creado: public/favicon.svg');

  // 2. Generar PNGs
  const buf32 = await sharp(Buffer.from(svg32)).png().toBuffer();
  const buf64 = await sharp(Buffer.from(svg64)).png().toBuffer();
  const buf192 = await sharp(Buffer.from(svg512)).resize(192, 192).png().toBuffer();

  fs.writeFileSync(path.resolve('public/icons', 'favicon-32x32.png'), buf32);
  fs.writeFileSync(path.resolve('public/icons', 'favicon-16x16.png'), await sharp(Buffer.from(createFaviconSvg(16))).png().toBuffer());
  fs.writeFileSync(path.resolve('app', 'icon.png'), buf192);
  fs.writeFileSync(path.resolve('app', 'apple-icon.png'), buf192);

  // 3. Generar favicon.ico en raíz y en app/
  // Un archivo ICO estándar puede contener un PNG de 32x32 o 64x64
  fs.writeFileSync(path.resolve('public', 'favicon.ico'), buf32);
  fs.writeFileSync(path.resolve('app', 'favicon.ico'), buf32);

  console.log('✓ Creado: public/favicon.ico (32x32)');
  console.log('✓ Creado: app/favicon.ico (32x32)');
  console.log('✓ Creado: app/icon.png (192x192)');
  console.log('✓ Creado: app/apple-icon.png (192x192)');
  console.log('✓ Creado: public/icons/favicon-32x32.png y 16x16.png');
}

run().catch(console.error);
