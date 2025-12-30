#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '../public/images');
const ORIGINALS_DIR = path.join(IMAGES_DIR, 'originals');
const COMPONENTS_DIR = path.join(__dirname, '../src/components');

async function rollbackImages() {
  console.log('=== Rolling Back Image Optimization ===\n');

  // Check if originals directory exists
  try {
    await fs.access(ORIGINALS_DIR);
  } catch {
    console.error('✗ No originals directory found. Cannot rollback.');
    process.exit(1);
  }

  // Copy originals back
  const originals = await fs.readdir(ORIGINALS_DIR);
  console.log(`Found ${originals.length} original images\n`);

  for (const filename of originals) {
    const sourcePath = path.join(ORIGINALS_DIR, filename);
    const destPath = path.join(IMAGES_DIR, filename);

    await fs.copyFile(sourcePath, destPath);
    console.log(`✓ Restored ${filename}`);
  }

  // Remove WebP files
  console.log('\nRemoving WebP files...');
  const allFiles = await fs.readdir(IMAGES_DIR);
  const webpFiles = allFiles.filter(f => f.endsWith('.webp'));

  for (const webpFile of webpFiles) {
    const webpPath = path.join(IMAGES_DIR, webpFile);
    await fs.unlink(webpPath);
    console.log(`✓ Removed ${webpFile}`);
  }

  // Revert HTML references
  console.log('\nReverting HTML image references...');
  const htmlFiles = await fs.readdir(COMPONENTS_DIR);

  for (const filename of htmlFiles.filter(f => f.endsWith('.html'))) {
    const filePath = path.join(COMPONENTS_DIR, filename);
    const content = await fs.readFile(filePath, 'utf-8');

    const updatedContent = content.replace(/\.webp/g, '.jpg');

    if (content !== updatedContent) {
      await fs.writeFile(filePath, updatedContent, 'utf-8');
      console.log(`✓ Reverted ${filename}`);
    }
  }

  console.log('\n✓ Rollback complete!');
  console.log('\nNote: You should also run:');
  console.log('  git restore src/components/*.html');
  console.log('  git clean -fd public/images/');
}

rollbackImages().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
