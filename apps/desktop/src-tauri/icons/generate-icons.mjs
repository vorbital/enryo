import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = join(__dirname, 'icon.svg');
const iconsDir = __dirname;

const sizes = [32, 128, 256];
const svg = readFileSync(svgPath);

async function generateIcons() {
  console.log('Generating icons...');

  for (const size of sizes) {
    const filename = size === 256 ? '128x128@2x.png' : `${size}x${size}.png`;
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(join(iconsDir, filename));
    console.log(`Created ${filename}`);
  }

  // Generate ico for Windows (just use 256x256 png as placeholder)
  await sharp(svg)
    .resize(256, 256)
    .png()
    .toFile(join(iconsDir, 'icon.ico'));
  console.log('Created icon.ico');

  // Generate icns placeholder (macOS will accept png)
  await sharp(svg)
    .resize(512, 512)
    .png()
    .toFile(join(iconsDir, 'icon.icns'));
  console.log('Created icon.icns');

  console.log('Done!');
}

generateIcons().catch(console.error);
