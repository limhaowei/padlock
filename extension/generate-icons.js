import sharp from 'sharp'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function createIcon(size, outputPath) {
  const svg = `
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" fill="#2563eb"/>
      <rect x="${size * 0.25}" y="${size * 0.25}" width="${size * 0.5}" height="${size * 0.5}" fill="white" rx="${size * 0.1}"/>
      <rect x="${size * 0.35}" y="${size * 0.35}" width="${size * 0.1}" height="${size * 0.3}" fill="#2563eb"/>
      <rect x="${size * 0.55}" y="${size * 0.35}" width="${size * 0.1}" height="${size * 0.3}" fill="#2563eb"/>
    </svg>
  `
  
  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath)
}

async function generateIcons() {
  const iconsDir = path.join(__dirname, 'public', 'icons')
  
  await createIcon(16, path.join(iconsDir, 'icon16.png'))
  await createIcon(32, path.join(iconsDir, 'icon32.png'))  
  await createIcon(48, path.join(iconsDir, 'icon48.png'))
  await createIcon(128, path.join(iconsDir, 'icon128.png'))
  
  console.log('Icons generated successfully!')
}

generateIcons().catch(console.error)
