#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const sharp = require('sharp');

const IMAGE_CONFIGS = {
  background: {
    filename: 'background.jpg',
    maxWidth: 2400,
    quality: 80,
    description: 'Full-screen background'
  },
  landing: {
    filename: 'landing-photo.jpg',
    maxWidth: 800,
    quality: 82,
    description: 'Hero landing photo'
  },
  cards: {
    pattern: '*-card.jpg',
    maxWidth: 1200,
    quality: 82,
    description: 'Portfolio card images'
  }
};

const IMAGES_DIR = path.join(__dirname, '../public/images');
const ORIGINALS_DIR = path.join(IMAGES_DIR, 'originals');
const DRY_RUN = process.argv.includes('--dry-run');

async function ensureOriginalsDir() {
  try {
    await fs.access(ORIGINALS_DIR);
    console.log('✓ Originals directory exists');
  } catch {
    if (!DRY_RUN) {
      await fs.mkdir(ORIGINALS_DIR, { recursive: true });
      console.log('✓ Created originals directory');
    } else {
      console.log('✓ Would create originals directory');
    }
  }
}

async function getFileSize(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

function formatBytes(bytes) {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

async function optimizeImage(inputPath, outputPath, config) {
  const originalSize = await getFileSize(inputPath);

  if (DRY_RUN) {
    console.log(`  Would optimize: ${path.basename(inputPath)}`);
    console.log(`    Original: ${formatBytes(originalSize)}`);
    console.log(`    Config: max-width ${config.maxWidth}px, quality ${config.quality}%`);
    return { originalSize, optimizedSize: 0, saved: 0 };
  }

  try {
    // Process with sharp
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    let pipeline = image;

    // Resize if needed
    if (metadata.width > config.maxWidth) {
      pipeline = pipeline.resize(config.maxWidth, null, {
        withoutEnlargement: true,
        fit: 'inside'
      });
    }

    // Convert to WebP
    pipeline = pipeline.webp({ quality: config.quality });

    await pipeline.toFile(outputPath);

    const optimizedSize = await getFileSize(outputPath);
    const saved = originalSize - optimizedSize;
    const percent = ((saved / originalSize) * 100).toFixed(1);

    console.log(`  ✓ ${path.basename(inputPath)}`);
    console.log(`    ${formatBytes(originalSize)} → ${formatBytes(optimizedSize)} (saved ${formatBytes(saved)}, ${percent}%)`);

    return { originalSize, optimizedSize, saved };
  } catch (error) {
    // Clean up partial output file if it exists
    try {
      await fs.unlink(outputPath);
    } catch {
      // Ignore cleanup errors
    }
    throw new Error(`Failed to optimize ${path.basename(inputPath)}: ${error.message}`);
  }
}

async function backupOriginal(filename) {
  const sourcePath = path.join(IMAGES_DIR, filename);
  const backupPath = path.join(ORIGINALS_DIR, filename);

  // Verify source file exists
  try {
    await fs.access(sourcePath);
  } catch {
    console.log(`  ✗ Source file ${filename} not found`);
    return false;
  }

  // Check if already backed up
  try {
    await fs.access(backupPath);
    console.log(`  ✓ ${filename} already backed up`);
    return true;
  } catch {
    // Need to create backup
  }

  if (DRY_RUN) {
    console.log(`  Would back up ${filename}`);
    return true;
  }

  // Perform backup and validate
  try {
    await fs.copyFile(sourcePath, backupPath);
    // Verify backup succeeded
    await fs.access(backupPath);
    console.log(`  ✓ Backed up ${filename}`);
    return true;
  } catch (error) {
    console.log(`  ✗ Failed to back up ${filename}: ${error.message}`);
    return false;
  }
}

async function optimizeSpecificImage(filename, config) {
  console.log(`\nProcessing ${config.description}:`);

  const inputPath = path.join(IMAGES_DIR, filename);
  const outputFilename = filename.replace('.jpg', '.webp');
  const outputPath = path.join(IMAGES_DIR, outputFilename);

  // Check if source exists
  try {
    await fs.access(inputPath);
  } catch {
    console.log(`  ✗ ${filename} not found, skipping`);
    return { originalSize: 0, optimizedSize: 0, saved: 0 };
  }

  // Backup original
  const backupSuccess = await backupOriginal(filename);
  if (!backupSuccess) {
    console.log(`  ✗ Skipping optimization due to backup failure`);
    return { originalSize: 0, optimizedSize: 0, saved: 0 };
  }

  // Optimize
  return await optimizeImage(inputPath, outputPath, config);
}

async function optimizeCardImages(config) {
  console.log(`\nProcessing ${config.description}:`);

  const files = await fs.readdir(IMAGES_DIR);
  // Convert glob pattern to suffix match (e.g., '*-card.jpg' -> '-card.jpg')
  const suffix = config.pattern.replace('*', '');
  const cardFiles = files.filter(f => f.endsWith(suffix));

  if (cardFiles.length === 0) {
    console.log('  ✗ No card images found');
    return { originalSize: 0, optimizedSize: 0, saved: 0 };
  }

  let totalOriginal = 0;
  let totalOptimized = 0;
  let totalSaved = 0;
  const failures = [];

  for (const filename of cardFiles) {
    const inputPath = path.join(IMAGES_DIR, filename);
    const outputFilename = filename.replace('.jpg', '.webp');
    const outputPath = path.join(IMAGES_DIR, outputFilename);

    try {
      const backupSuccess = await backupOriginal(filename);
      if (!backupSuccess) {
        failures.push({ filename, reason: 'Backup failed' });
        continue;
      }

      const result = await optimizeImage(inputPath, outputPath, config);
      totalOriginal += result.originalSize;
      totalOptimized += result.optimizedSize;
      totalSaved += result.saved;
    } catch (error) {
      failures.push({ filename, reason: error.message });
      console.log(`  ✗ Failed to process ${filename}: ${error.message}`);
    }
  }

  if (failures.length > 0) {
    console.log(`\n  Failed to process ${failures.length} card image(s):`);
    failures.forEach(({ filename, reason }) => {
      console.log(`    - ${filename}: ${reason}`);
    });
  }

  return { originalSize: totalOriginal, optimizedSize: totalOptimized, saved: totalSaved };
}

async function main() {
  console.log('=== Image Optimization Script ===\n');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }

  await ensureOriginalsDir();

  let grandTotalOriginal = 0;
  let grandTotalOptimized = 0;
  let grandTotalSaved = 0;

  // Process background
  const bgResult = await optimizeSpecificImage(
    IMAGE_CONFIGS.background.filename,
    IMAGE_CONFIGS.background
  );
  grandTotalOriginal += bgResult.originalSize;
  grandTotalOptimized += bgResult.optimizedSize;
  grandTotalSaved += bgResult.saved;

  // Process landing photo
  const landingResult = await optimizeSpecificImage(
    IMAGE_CONFIGS.landing.filename,
    IMAGE_CONFIGS.landing
  );
  grandTotalOriginal += landingResult.originalSize;
  grandTotalOptimized += landingResult.optimizedSize;
  grandTotalSaved += landingResult.saved;

  // Process card images
  const cardsResult = await optimizeCardImages(IMAGE_CONFIGS.cards);
  grandTotalOriginal += cardsResult.originalSize;
  grandTotalOptimized += cardsResult.optimizedSize;
  grandTotalSaved += cardsResult.saved;

  // Summary
  console.log('\n=== Summary ===');
  console.log(`Total original size: ${formatBytes(grandTotalOriginal)}`);
  console.log(`Total optimized size: ${formatBytes(grandTotalOptimized)}`);
  console.log(`Total saved: ${formatBytes(grandTotalSaved)}`);

  if (grandTotalOriginal > 0) {
    const percentSaved = ((grandTotalSaved / grandTotalOriginal) * 100).toFixed(1);
    console.log(`Reduction: ${percentSaved}%`);
  }

  if (DRY_RUN) {
    console.log('\n✓ Dry run complete. Run without --dry-run to apply changes.');
  } else {
    console.log('\n✓ Optimization complete!');
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
