import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const outDir = path.resolve('public/icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Icon design: Deep English Green background with warm gold / cream Bloom coffee flower
const createSvg = (size, isMaskable = false) => {
  const contentScale = isMaskable ? 0.65 : 0.82;
  const translateOffset = (size * (1 - contentScale)) / 2;

  return `
  <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1a3028" />
        <stop offset="100%" stop-color="#12221c" />
      </linearGradient>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f5e8ca" />
        <stop offset="100%" stop-color="#c4b896" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000000" flood-opacity="0.35"/>
      </filter>
    </defs>

    <!-- Background -->
    <rect width="${size}" height="${size}" rx="${isMaskable ? 0 : Math.round(size * 0.22)}" fill="url(#bgGrad)" />

    <!-- Content Group -->
    <g transform="translate(${translateOffset}, ${translateOffset}) scale(${contentScale})">
      <svg width="${size}" height="${size}" viewBox="0 0 512 512">
        <!-- Outer Floral Ring / Petals -->
        <g filter="url(#shadow)">
          <!-- 8 Blooming Petals -->
          <path d="M256 50 C240 120, 240 160, 256 210 C272 160, 272 120, 256 50 Z" fill="url(#goldGrad)" opacity="0.9" />
          <path d="M256 462 C240 392, 240 352, 256 302 C272 352, 272 392, 256 462 Z" fill="url(#goldGrad)" opacity="0.9" />
          <path d="M50 256 C120 240, 160 240, 210 256 C160 272, 120 272, 50 256 Z" fill="url(#goldGrad)" opacity="0.9" />
          <path d="M462 256 C392 240, 352 240, 302 256 C352 272, 392 272, 462 256 Z" fill="url(#goldGrad)" opacity="0.9" />
          
          <path d="M110 110 C175 145, 205 175, 225 225 C175 205, 145 175, 110 110 Z" fill="url(#goldGrad)" opacity="0.8" />
          <path d="M402 110 C337 145, 307 175, 287 225 C337 205, 367 175, 402 110 Z" fill="url(#goldGrad)" opacity="0.8" />
          <path d="M110 402 C175 367, 205 337, 225 287 C175 307, 145 337, 110 402 Z" fill="url(#goldGrad)" opacity="0.8" />
          <path d="M402 402 C337 367, 307 337, 287 287 C337 307, 367 337, 402 402 Z" fill="url(#goldGrad)" opacity="0.8" />

          <!-- Center Coffee Cup & Steam -->
          <circle cx="256" cy="256" r="88" fill="#14241e" stroke="url(#goldGrad)" stroke-width="6" />

          <!-- Stylized Coffee Cup -->
          <path d="M210 245 C210 290, 302 290, 302 245 L200 245 Z" fill="url(#goldGrad)" />
          <path d="M302 252 C318 252, 324 262, 324 270 C324 278, 318 284, 302 284" fill="none" stroke="url(#goldGrad)" stroke-width="5" stroke-linecap="round" />
          
          <!-- Steam lines -->
          <path d="M232 232 Q238 220 234 210" fill="none" stroke="url(#goldGrad)" stroke-width="4" stroke-linecap="round" />
          <path d="M256 234 Q262 218 258 206" fill="none" stroke="url(#goldGrad)" stroke-width="4" stroke-linecap="round" />
          <path d="M280 232 Q286 220 282 210" fill="none" stroke="url(#goldGrad)" stroke-width="4" stroke-linecap="round" />
        </g>

        <!-- Brand Text BLOOM -->
        <text x="256" y="385" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="800" font-size="38" letter-spacing="9" fill="#f5e8ca">BLOOM</text>
        <text x="256" y="415" text-anchor="middle" font-family="'Inter', sans-serif" font-weight="500" font-size="16" letter-spacing="6" fill="#a8c9b8">CAFÉ &amp; POS</text>
      </svg>
    </g>
  </svg>
  `;
};

async function build() {
  const configs = [
    { name: 'icon-192x192.png', size: 192, maskable: false },
    { name: 'icon-512x512.png', size: 512, maskable: false },
    { name: 'icon-maskable-512x512.png', size: 512, maskable: true },
    { name: 'apple-touch-icon.png', size: 180, maskable: false },
    { name: 'favicon-32x32.png', size: 32, maskable: false },
  ];

  for (const c of configs) {
    const svg = createSvg(c.size, c.maskable);
    const target = path.join(outDir, c.name);
    await sharp(Buffer.from(svg)).png().toFile(target);
    console.log(`Generated: ${c.name} (${c.size}x${c.size})`);
  }
  
  // Also save the base vector SVG icon
  fs.writeFileSync(path.join(outDir, 'icon.svg'), createSvg(512, false), 'utf8');
  console.log('Generated: icon.svg');
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
