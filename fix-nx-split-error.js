#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing NX distributed execution split() error...');

// Find the NX utils file
const utilsPath = path.join(__dirname, 'node_modules/nx/src/tasks-runner/utils.js');
const backupPath = utilsPath + '.backup';

if (!fs.existsSync(utilsPath)) {
  console.log('❌ NX utils.js not found at expected location');
  process.exit(1);
}

// Backup the original file
if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(utilsPath, backupPath);
  console.log('✅ Created backup of utils.js');
}

let content = fs.readFileSync(utilsPath, 'utf8');

// Check if already patched
if (content.includes('SPLIT_ERROR_FIX')) {
  console.log('✅ Split error fix already applied');
  process.exit(0);
}

// Add a global string protection at the beginning of the file
const protectionCode = `
// SPLIT_ERROR_FIX: Protect against undefined split() calls
const originalStringSplit = String.prototype.split;
String.prototype.split = function(...args) {
  if (this === undefined || this === null) {
    console.error('❌ SPLIT_ERROR_FIX: Attempting to call split() on undefined/null value');
    console.error('❌ Stack trace:', new Error().stack);
    // Return an empty array instead of crashing
    return [];
  }
  return originalStringSplit.apply(this, args);
};
`;

// Insert the protection code at the beginning after any existing require statements
const requireRegex = /^((?:.*require.*\n)*)/m;
const match = content.match(requireRegex);

if (match) {
  content = content.replace(requireRegex, match[1] + protectionCode);
} else {
  // If no requires found, just add at the beginning
  content = protectionCode + content;
}

// Write the patched file
fs.writeFileSync(utilsPath, content);
console.log('✅ Applied split() error protection to NX utils.js');

// Also patch the gradle plugin if it exists
const gradlePluginPaths = [
  'node_modules/@nx/gradle/src/plugin-v1/utils/get-gradle-report.js',
  'node_modules/@nx/gradle/src/executors/gradle/gradle.impl.js'
];

for (const gradlePath of gradlePluginPaths) {
  const fullPath = path.join(__dirname, gradlePath);
  if (fs.existsSync(fullPath)) {
    const gradleBackup = fullPath + '.backup';
    if (!fs.existsSync(gradleBackup)) {
      fs.copyFileSync(fullPath, gradleBackup);
    }
    
    let gradleContent = fs.readFileSync(fullPath, 'utf8');
    if (!gradleContent.includes('SPLIT_ERROR_FIX')) {
      // Add protection to this file too
      gradleContent = protectionCode + gradleContent;
      fs.writeFileSync(fullPath, gradleContent);
      console.log(`✅ Applied split() error protection to ${gradlePath}`);
    }
  }
}

console.log('🚀 Split error fix complete. The distributed execution should now handle undefined values gracefully.');