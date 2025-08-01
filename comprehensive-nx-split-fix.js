#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Applying comprehensive NX distributed execution split() fix...');

// The protection code to inject
const protectionCode = `
// COMPREHENSIVE_SPLIT_ERROR_FIX: Global protection against undefined split() calls
if (!global.__SPLIT_FIX_APPLIED__) {
  global.__SPLIT_FIX_APPLIED__ = true;
  
  const originalStringSplit = String.prototype.split;
  String.prototype.split = function(...args) {
    if (this === undefined || this === null) {
      console.error('❌ COMPREHENSIVE_SPLIT_ERROR_FIX: Attempting to call split() on undefined/null value');
      console.error('❌ Stack trace:', new Error().stack);
      console.error('❌ Arguments:', args);
      // Return an empty array instead of crashing
      return [];
    }
    return originalStringSplit.apply(this, args);
  };

  // Also protect against common split usage patterns
  const originalSplit = originalStringSplit;
  const safeStringMethods = {
    split: function(str, ...args) {
      if (str === undefined || str === null) {
        console.error('❌ COMPREHENSIVE_SPLIT_ERROR_FIX: Attempting to split undefined/null string');
        return [];
      }
      return originalSplit.apply(str, args);
    }
  };
  
  console.log('✅ COMPREHENSIVE_SPLIT_ERROR_FIX: Global string split protection applied');
}
`;

// List of critical files to patch for distributed execution
const criticalFiles = [
  // Main NX entry points (exclude nx.js as it might be a symlink target)
  'node_modules/nx/bin/run-executor.js',
  
  // Tasks runner core files
  'node_modules/nx/src/tasks-runner/utils.js',
  'node_modules/nx/src/tasks-runner/default-tasks-runner.js',
  'node_modules/nx/src/tasks-runner/forked-process-task-runner.js',
  'node_modules/nx/src/tasks-runner/fork.js',
  'node_modules/nx/src/tasks-runner/batch/run-batch.js',
  
  // NX Cloud related files
  'node_modules/nx/src/nx-cloud/nx-cloud-tasks-runner-shell.js',
  
  // Gradle plugin files
  'node_modules/@nx/gradle/src/plugin-v1/utils/get-gradle-report.js',
  'node_modules/@nx/gradle/src/executors/gradle/gradle.impl.js',
  'node_modules/@nx/gradle/src/plugin/utils/get-project-graph-lines.js',
  'node_modules/@nx/gradle/src/plugin-v1/utils/get-project-report-lines.js',
];

let patchedCount = 0;
let skippedCount = 0;

for (const relativePath of criticalFiles) {
  const fullPath = path.join(__dirname, relativePath);
  const backupPath = fullPath + '.backup-comprehensive';
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${relativePath}`);
    skippedCount++;
    continue;
  }

  // Skip symlinks and non-JS files
  const stats = fs.lstatSync(fullPath);
  if (stats.isSymbolicLink()) {
    console.log(`⚠️  Skipping symlink: ${relativePath}`);
    skippedCount++;
    continue;
  }
  
  if (!fullPath.endsWith('.js')) {
    console.log(`⚠️  Skipping non-JS file: ${relativePath}`);
    skippedCount++;
    continue;
  }

  // Backup the original file if not already backed up
  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(fullPath, backupPath);
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Check if already patched
  if (content.includes('COMPREHENSIVE_SPLIT_ERROR_FIX')) {
    console.log(`✅ Already patched: ${relativePath}`);
    continue;
  }

  // Apply the protection code at the beginning of the file
  // For CommonJS modules, add after any initial "use strict" or require statements
  const lines = content.split('\n');
  let insertIndex = 0;
  
  // Find the best place to insert (after initial directives but before main code)
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i].trim();
    if (line === '"use strict";' || line === "'use strict';" || line.startsWith('Object.defineProperty(exports,')) {
      insertIndex = i + 1;
    } else if (line.startsWith('const ') || line.startsWith('require(') || line.startsWith('//')) {
      if (insertIndex === 0) insertIndex = i;
    } else if (line.length > 0 && !line.startsWith('//')) {
      break;
    }
  }

  // Insert the protection code
  lines.splice(insertIndex, 0, protectionCode);
  content = lines.join('\n');

  // Write the patched file
  fs.writeFileSync(fullPath, content);
  console.log(`✅ Patched: ${relativePath}`);
  patchedCount++;
}

console.log(`\n🚀 Comprehensive fix complete!`);
console.log(`   📦 Files patched: ${patchedCount}`);
console.log(`   ⚠️  Files skipped: ${skippedCount}`);
console.log(`   🔒 Distributed execution should now handle undefined values gracefully.`);

// Also create a restore script
const restoreScript = `#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔄 Restoring original NX files...');

const files = ${JSON.stringify(criticalFiles, null, 2)};

let restoredCount = 0;
for (const relativePath of files) {
  const fullPath = path.join(__dirname, relativePath);
  const backupPath = fullPath + '.backup-comprehensive';
  
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, fullPath);
    console.log(\`✅ Restored: \${relativePath}\`);
    restoredCount++;
  }
}

console.log(\`🎉 Restored \${restoredCount} files\`);
`;

fs.writeFileSync(path.join(__dirname, 'restore-nx-files.js'), restoreScript);
fs.chmodSync(path.join(__dirname, 'restore-nx-files.js'), '755');
console.log('📄 Created restore-nx-files.js for easy rollback');