# Image Optimization Summary

## What Changed

### Images
- Converted all portfolio images from JPEG to WebP format
- Reduced total image payload from ~79.28MB to ~4.07MB (~94.9% reduction)
- Individual images: 90KB-340KB (down from 0.22MB-16MB)

### Files Modified
- Added Sharp dependency to package.json
- Created 4 new scripts in `scripts/`:
  - `optimize-images.js` - One-time optimization
  - `check-unoptimized-images.js` - Build-time check
  - `update-image-refs.js` - HTML reference updates
  - `rollback-images.js` - Emergency rollback
- Updated all HTML components to reference .webp instead of .jpg
- Added prebuild script to package.json
- Updated .gitignore to exclude originals backup folder

### Backup
- All original JPEGs backed up to `public/images/originals/` (git-ignored)

## Image Specifications

| Type | Original Size | Optimized Size | Max Width | Quality |
|------|---------------|----------------|-----------|---------|
| Background | 982KB | ~252KB | 2400px | 80% |
| Landing Photo | 1.8MB | ~93KB | 800px | 82% |
| Card Images | 0.22MB-16MB | ~90-340KB | 1200px | 82% |

## Build Pipeline

The build process now includes an automatic check:
1. `npm run build` triggers `prebuild` script
2. `prebuild` runs `check-unoptimized-images.js`
3. Script scans for any .jpg files without corresponding .webp
4. Automatically optimizes any unoptimized images found
5. Exits silently if all images already optimized

This prevents accidentally deploying unoptimized images.

## Browser Support

WebP is supported by:
- Chrome 23+ (2012)
- Firefox 65+ (2019)
- Safari 14+ (2020)
- Edge 18+ (2018)

Coverage: ~95% of users

Users on ancient browsers (IE11, old Safari) will see broken images. This is acceptable for a modern portfolio site.

## Scripts

### Optimize Images
```bash
npm run optimize:images              # Optimize all images
npm run optimize:images -- --dry-run # Preview without changes
```

### Update HTML References
```bash
npm run update:image-refs              # Update .jpg to .webp
npm run update:image-refs -- --dry-run # Preview changes
```

### Rollback (Emergency)
```bash
npm run rollback:images  # Restore original JPEGs and revert HTML
```

Note: After rollback, also run:
```bash
git restore src/components/*.html
git clean -fd public/images/
```

## Testing Checklist

- [x] All images display correctly on homepage
- [x] All images display correctly on about page
- [x] Images load on mobile viewport
- [x] No console errors
- [x] Build succeeds
- [x] All tests pass (14 Jest tests)
- [x] Prebuild check works correctly

## Next Steps

1. Deploy to dev.eviecarrick.com for testing
2. Test on real mobile device
3. Run Lighthouse audit
4. Verify CloudFront serves WebP correctly
5. Deploy to production if dev tests pass
6. Invalidate CloudFront cache: `/images/*`

## Rollback Plan

If issues arise:
1. Run `npm run rollback:images` in website/
2. Commit restored JPEGs: `git add . && git commit -m "Rollback image optimization"`
3. Push to deployment branch
4. CloudFront invalidation will clear WebP from CDN
5. Site back to original JPEGs in ~5 minutes
