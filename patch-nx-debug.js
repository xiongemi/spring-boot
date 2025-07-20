#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const utilsPath = path.join(__dirname, 'node_modules/nx/src/tasks-runner/utils.js');

console.log('🔧 Patching NX utils.js to add target debugging...');

if (!fs.existsSync(utilsPath)) {
  console.log('❌ NX utils.js not found at:', utilsPath);
  process.exit(1);
}

let content = fs.readFileSync(utilsPath, 'utf8');

// Check if already patched
if (content.includes('SPRING_BOOT_DEBUG')) {
  console.log('✅ NX utils.js already patched');
  process.exit(0);
}

// Add debugging to getTargetConfigurationForTask function
const originalPattern = /function getTargetConfigurationForTask\(task, projectsConfigurations\) \{/;
const patchedFunction = `function getTargetConfigurationForTask(task, projectsConfigurations) {
    // SPRING_BOOT_DEBUG: Log task details before potential error
    console.log('🎯 SPRING_BOOT_DEBUG: Processing target:', task.target.target, 'for project:', task.target.project);
    console.log('🎯 SPRING_BOOT_DEBUG: Task object:', JSON.stringify(task, null, 2));
    console.log('🎯 SPRING_BOOT_DEBUG: ProjectsConfigurations keys:', Object.keys(projectsConfigurations || {}));
    
    try {`;

if (originalPattern.test(content)) {
  // Patch the function start
  content = content.replace(originalPattern, patchedFunction);
  
  // Find the end of the function and add error handling
  const functionEndPattern = /(\s+return projectsConfigurations\.projects\[task\.target\.project\]\.targets\[task\.target\.target\];?\s*\})/;
  content = content.replace(functionEndPattern, `$1
    } catch (error) {
        console.log('❌ SPRING_BOOT_DEBUG: Error in getTargetConfigurationForTask for target:', task.target.target, 'project:', task.target.project);
        console.log('❌ SPRING_BOOT_DEBUG: Error details:', error.message);
        console.log('❌ SPRING_BOOT_DEBUG: ProjectsConfigurations structure:', JSON.stringify(projectsConfigurations, null, 2));
        throw error;
    }`);

  fs.writeFileSync(utilsPath, content);
  console.log('✅ Successfully patched NX utils.js with debug logging');
} else {
  console.log('⚠️ Could not find getTargetConfigurationForTask function pattern to patch');
  process.exit(1);
}