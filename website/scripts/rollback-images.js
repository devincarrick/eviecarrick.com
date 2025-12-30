#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

const IMAGES_DIR = path.join(__dirname, '../public/images');
const ORIGINALS_DIR = path.join(IMAGES_DIR, 'originals');
const COMPONENTS_DIR = path.join(__dirname, '../src/components');

async function rollbackImages() {
  console.log('=== Rolling Back Image Optimization ===\n');

  // Check for confirmation flag
  if (!process.argv.includes('--confirm')) {
    console.error('✗ This script will restore original JPEGs and remove WebP files. Run with --confirm flag to proceed.');
    process.exit(1);
  }

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

  const copyFailures = [];
  for (const filename of originals) {
    const sourcePath = path.join(ORIGINALS_DIR, filename);
    const destPath = path.join(IMAGES_DIR, filename);

    try {
      await fs.copyFile(sourcePath, destPath);
      console.log(`✓ Restored ${filename}`);
    } catch (err) {
      console.error(`✗ Failed to restore ${filename}: ${err.message}`);
      copyFailures.push({ file: filename, error: err.message });
    }
  }

  // Remove WebP files
  console.log('\nRemoving WebP files...');
  const allFiles = await fs.readdir(IMAGES_DIR);
  const webpFiles = allFiles.filter(f => f.endsWith('.webp'));

  const unlinkFailures = [];
  for (const webpFile of webpFiles) {
    const webpPath = path.join(IMAGES_DIR, webpFile);
    try {
      await fs.unlink(webpPath);
      console.log(`✓ Removed ${webpFile}`);
    } catch (err) {
      console.error(`✗ Failed to remove ${webpFile}: ${err.message}`);
      unlinkFailures.push({ file: webpFile, error: err.message });
    }
  }

  // Revert HTML references
  console.log('\nReverting HTML image references...');
  const htmlFiles = await fs.readdir(COMPONENTS_DIR);

  const writeFailures = [];
  for (const filename of htmlFiles.filter(f => f.endsWith('.html'))) {
    const filePath = path.join(COMPONENTS_DIR, filename);
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      const updatedContent = content.replace(/\.webp/g, '.jpg');

      if (content !== updatedContent) {
        await fs.writeFile(filePath, updatedContent, 'utf-8');
        console.log(`✓ Reverted ${filename}`);
      }
    } catch (err) {
      console.error(`✗ Failed to revert ${filename}: ${err.message}`);
      writeFailures.push({ file: filename, error: err.message });
    }
  }

  // Report summary
  console.log('\n=== Rollback Summary ===');

  const totalFailures = copyFailures.length + unlinkFailures.length + writeFailures.length;

  if (totalFailures === 0) {
    console.log('✓ All operations completed successfully!');
  } else {
    console.error(`\n✗ ${totalFailures} operation(s) failed:\n`);

    if (copyFailures.length > 0) {
      console.error('Failed to restore:');
      copyFailures.forEach(f => console.error(`  - ${f.file}: ${f.error}`));
    }

    if (unlinkFailures.length > 0) {
      console.error('Failed to remove:');
      unlinkFailures.forEach(f => console.error(`  - ${f.file}: ${f.error}`));
    }

    if (writeFailures.length > 0) {
      console.error('Failed to revert:');
      writeFailures.forEach(f => console.error(`  - ${f.file}: ${f.error}`));
    }
  }

  console.log('\nNote: You should also run:');
  console.log('  git restore src/components/*.html');
  console.log('  git clean -fd public/images/');
}

rollbackImages().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
