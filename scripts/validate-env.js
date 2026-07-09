#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const root = process.cwd();
const requiredFiles = [
  '.env',
  '.env.test',
  'deploy/test/.env',
];

const missingFiles = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));

if (missingFiles.length > 0) {
  console.log('❌ Missing environment files:');
  missingFiles.forEach((file) => console.log(`  - ${file}`));
  console.log('');
  console.log('Create them with:');
  console.log('  cp .env.example .env');
  console.log('  cp .env.test.example .env.test');
  console.log('  cp deploy/test/.env.example deploy/test/.env');
  process.exit(1);
}

console.log('✅ Environment files found');
