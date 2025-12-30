#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

const IMAGES_DIR = path.join(__dirname, '../public/images');

async function checkAndOptimizeImages() {
  // Check if IMAGES_DIR exists before trying to read it
  try {
    await fs.access(IMAGES_DIR);
  } catch (err) {
    throw new Error(`Images directory not found: ${IMAGES_DIR}. Run this script from the website directory.`);
  }

  const files = await fs.readdir(IMAGES_DIR);
  const jpgFiles = files.filter(f => f.endsWith('.jpg'));

  let foundUnoptimized = false;

  for (const jpgFile of jpgFiles) {
    const webpFile = jpgFile.replace(/\.jpg$/, '.webp');
    const webpPath = path.join(IMAGES_DIR, webpFile);

    try {
      await fs.access(webpPath);
      // WebP exists, skip
    } catch {
      // WebP doesn't exist, need to create it
      foundUnoptimized = true;

      console.log(`⚠️  Found unoptimized image: ${jpgFile}`);
      console.log(`   Creating optimized WebP version...`);

      const jpgPath = path.join(IMAGES_DIR, jpgFile);

      // Determine config based on filename
      let maxWidth = 1200;
      let quality = 82;

      if (jpgFile === 'background.jpg') {
        maxWidth = 2400;
        quality = 80;
      } else if (jpgFile === 'landing-photo.jpg') {
        maxWidth = 800;
        quality = 82;
      }

      // Optimize
      try {
        const image = sharp(jpgPath);
        const metadata = await image.metadata();

        let pipeline = image;

        if (metadata.width > maxWidth) {
          pipeline = pipeline.resize(maxWidth, null, {
            withoutEnlargement: true,
            fit: 'inside'
          });
        }

        pipeline = pipeline.webp({ quality });

        await pipeline.toFile(webpPath);

        const originalSize = (await fs.stat(jpgPath)).size;
        const optimizedSize = (await fs.stat(webpPath)).size;
        const saved = originalSize - optimizedSize;
        const percent = ((saved / originalSize) * 100).toFixed(1);

        console.log(`   ✓ Created ${webpFile}`);
        console.log(`   Saved ${(saved / 1024 / 1024).toFixed(2)} MB (${percent}%)\n`);
      } catch (sharpErr) {
        // Clean up partial WebP file if it was created
        try {
          await fs.unlink(webpPath);
        } catch {
          // Ignore cleanup errors - file might not exist
        }
        throw new Error(`Failed to optimize ${jpgFile}: ${sharpErr.message}`);
      }
    }
  }

  if (!foundUnoptimized) {
    // Silent success - all images already optimized
    process.exit(0);
  }

  console.log('✓ All images now optimized\n');
  process.exit(0);
}

checkAndOptimizeImages().catch(err => {
  console.error('Error checking images:', err.message);
  process.exit(1);
});
