#!/bin/bash

# Clean dist directory
rm -rf dist/*

# Run build
npm run build

# Create symlink for public directory
ln -sf ../public dist/public

echo "Development environment ready!"