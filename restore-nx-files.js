#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔄 Restoring original NX files...');

const files = [
  "node_modules/nx/bin/run-executor.js",
  "node_modules/nx/src/tasks-runner/utils.js",
  "node_modules/nx/src/tasks-runner/default-tasks-runner.js",
  "node_modules/nx/src/tasks-runner/forked-process-task-runner.js",
  "node_modules/nx/src/tasks-runner/fork.js",
  "node_modules/nx/src/tasks-runner/batch/run-batch.js",
  "node_modules/nx/src/nx-cloud/nx-cloud-tasks-runner-shell.js",
  "node_modules/@nx/gradle/src/plugin-v1/utils/get-gradle-report.js",
  "node_modules/@nx/gradle/src/executors/gradle/gradle.impl.js",
  "node_modules/@nx/gradle/src/plugin/utils/get-project-graph-lines.js",
  "node_modules/@nx/gradle/src/plugin-v1/utils/get-project-report-lines.js"
];

let restoredCount = 0;
for (const relativePath of files) {
  const fullPath = path.join(__dirname, relativePath);
  const backupPath = fullPath + '.backup-comprehensive';
  
  if (fs.existsSync(backupPath)) {
    fs.copyFileSync(backupPath, fullPath);
    console.log(`✅ Restored: ${relativePath}`);
    restoredCount++;
  }
}

console.log(`🎉 Restored ${restoredCount} files`);
