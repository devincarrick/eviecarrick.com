#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');

const COMPONENTS_DIR = path.join(__dirname, '../src/components');
const DRY_RUN = process.argv.includes('--dry-run');

async function updateImageReferences() {
  console.log('=== Updating Image References ===\n');

  if (DRY_RUN) {
    console.log('🔍 DRY RUN MODE - No files will be modified\n');
  }

  const files = await fs.readdir(COMPONENTS_DIR);
  const htmlFiles = files.filter(f => f.endsWith('.html'));

  let totalChanges = 0;

  for (const filename of htmlFiles) {
    const filePath = path.join(COMPONENTS_DIR, filename);
    const content = await fs.readFile(filePath, 'utf-8');

    // Replace .jpg with .webp in image src attributes
    const updatedContent = content.replace(
      /(<img[^>]+src=["'])([^"']+)\.jpg(["'])/g,
      '$1$2.webp$3'
    );

    if (content !== updatedContent) {
      const changes = (content.match(/\.jpg/g) || []).length;
      totalChanges += changes;

      console.log(`✓ ${filename}: ${changes} reference(s) updated`);

      if (!DRY_RUN) {
        await fs.writeFile(filePath, updatedContent, 'utf-8');
      }
    }
  }

  if (totalChanges === 0) {
    console.log('No .jpg references found in HTML components');
  } else {
    console.log(`\nTotal: ${totalChanges} reference(s) updated`);
  }

  if (DRY_RUN) {
    console.log('\n✓ Dry run complete. Run without --dry-run to apply changes.');
  } else {
    console.log('\n✓ All image references updated!');
  }
}

updateImageReferences().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
