#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Try multiple possible paths for NX utils.js
const possiblePaths = [
  path.join(__dirname, 'node_modules/nx/src/tasks-runner/utils.js'),
  path.join(process.cwd(), 'node_modules/nx/src/tasks-runner/utils.js'),
  path.join(__dirname, '../../node_modules/nx/src/tasks-runner/utils.js'),
];

console.log('🔧 Patching NX utils.js to add target debugging...');
console.log('🔍 Current working directory:', process.cwd());
console.log('🔍 Script directory:', __dirname);

// First, copy batch runner JARs to NX Gradle plugin
const batchRunnerSource = path.join(__dirname, 'batch-runner.jar');
const batchRunnerAllSource = path.join(__dirname, 'batch-runner-all.jar');
const batchRunnerDest = path.join(__dirname, 'node_modules/@nx/gradle/batch-runner/build/libs');

console.log('🔧 Copying batch runner JARs...');
console.log('🔍 Batch runner source:', batchRunnerSource);
console.log('🔍 Batch runner destination:', batchRunnerDest);

if (fs.existsSync(batchRunnerSource) && fs.existsSync(batchRunnerAllSource)) {
  try {
    // Ensure destination directory exists
    fs.mkdirSync(batchRunnerDest, { recursive: true });
    
    // Copy the JAR files
    fs.copyFileSync(batchRunnerSource, path.join(batchRunnerDest, 'batch-runner.jar'));
    fs.copyFileSync(batchRunnerAllSource, path.join(batchRunnerDest, 'batch-runner-all.jar'));
    
    console.log('✅ Successfully copied batch runner JARs');
  } catch (error) {
    console.log('⚠️ Failed to copy batch runner JARs:', error.message);
  }
} else {
  console.log('⚠️ Batch runner JAR files not found at expected locations');
  console.log('   Expected:', batchRunnerSource);
  console.log('   Expected:', batchRunnerAllSource);
}

let utilsPath;
for (const tryPath of possiblePaths) {
  console.log('🔍 Checking path:', tryPath);
  if (fs.existsSync(tryPath)) {
    utilsPath = tryPath;
    console.log('✅ Found NX utils.js at:', utilsPath);
    break;
  }
}

if (!utilsPath) {
  console.log('⚠️ NX utils.js not found at any expected location. Skipping patch (this is OK).');
  console.log('📋 Checked paths:', possiblePaths);
  process.exit(0); // Don't fail the build
}

let content = fs.readFileSync(utilsPath, 'utf8');

// Check if already patched
if (content.includes('SPRING_BOOT_DEBUG')) {
  console.log('✅ NX utils.js already patched');
  process.exit(0);
}

// Add debugging to getTargetConfigurationForTask function
const originalPattern = /function getTargetConfigurationForTask\(task, projectGraph\) \{\s*const project = projectGraph\.nodes\[task\.target\.project\]\.data;/;
const replacement = `function getTargetConfigurationForTask(task, projectGraph) {
    // SPRING_BOOT_DEBUG: Log task details before potential error
    console.log('🎯 SPRING_BOOT_DEBUG: Processing target:', task.target.target, 'for project:', task.target.project);
    
    // Add global error handler for split errors
    const originalSplit = String.prototype.split;
    String.prototype.split = function(...args) {
        if (this === undefined || this === null) {
            console.log('❌ SPRING_BOOT_DEBUG: split() called on undefined/null value');
            console.log('❌ SPRING_BOOT_DEBUG: Current task:', task.target.target, 'project:', task.target.project);
            console.trace('Split error stack trace');
        }
        return originalSplit.apply(this, args);
    };
    
    try {
        const project = projectGraph.nodes[task.target.project].data;`;

if (originalPattern.test(content)) {
  // Patch the function start
  content = content.replace(originalPattern, replacement);
  
  // Add the closing try-catch block around the return statement
  const returnPattern = /(\s+return project\.targets\[task\.target\.target\];)\s*}/;
  content = content.replace(returnPattern, `$1
    } catch (error) {
        console.log('❌ SPRING_BOOT_DEBUG: Error accessing project data for:', task.target.project);
        // console.log('❌ SPRING_BOOT_DEBUG: Available projects:', Object.keys(projectGraph?.nodes || {}));
        console.log('❌ SPRING_BOOT_DEBUG: Error details:', error.message);
        throw error;
    }
}`);
  
  fs.writeFileSync(utilsPath, content);
  console.log('✅ Successfully patched NX utils.js with debug logging');
} else {
  console.log('⚠️ Could not find getTargetConfigurationForTask function pattern to patch');
  console.log('🔍 Looking for alternative patterns...');
  
  // Try multiple fallback patterns
  const fallbackPatterns = [
    // Simple pattern - just the problematic line
    {
      pattern: /const project = projectGraph\.nodes\[task\.target\.project\]\.data;/,
      replacement: `// SPRING_BOOT_DEBUG: Log task details before potential error
    console.log('🎯 SPRING_BOOT_DEBUG: Processing target:', task.target.target, 'for project:', task.target.project);
    console.log('🎯 SPRING_BOOT_DEBUG: Task object:', JSON.stringify(task, null, 2));
    // console.log('🎯 SPRING_BOOT_DEBUG: ProjectGraph nodes keys:', Object.keys(projectGraph?.nodes || {}));
    
    let project;
    try {
        project = projectGraph.nodes[task.target.project].data;
    } catch (error) {
        console.log('❌ SPRING_BOOT_DEBUG: Error accessing project data for:', task.target.project);
        // console.log('❌ SPRING_BOOT_DEBUG: Available projects:', Object.keys(projectGraph?.nodes || {}));
        console.log('❌ SPRING_BOOT_DEBUG: Error details:', error.message);
        console.log('❌ SPRING_BOOT_DEBUG: Stack trace:', error.stack);
        throw error;
    }`,
      name: 'simple pattern'
    },
    // Even simpler - just add logging before the line
    {
      pattern: /(const project = projectGraph\.nodes\[task\.target\.project\]\.data;)/,
      replacement: `console.log('🎯 SPRING_BOOT_DEBUG: Processing target:', task.target.target, 'for project:', task.target.project);
    $1`,
      name: 'minimal pattern'
    }
  ];

  let patched = false;
  for (const { pattern, replacement, name } of fallbackPatterns) {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      fs.writeFileSync(utilsPath, content);
      console.log('✅ Successfully patched NX utils.js with debug logging (' + name + ')');
      patched = true;
      break;
    }
  }

  if (!patched) {
    console.log('⚠️ Could not find any matching pattern to patch. Dumping file info for debugging:');
    const lines = content.split('\n');
    const relevantLines = lines.filter((line, i) => 
      line.includes('getTargetConfigurationForTask') || 
      line.includes('projectGraph.nodes') || 
      line.includes('.data')
    ).map((line, i) => 'Line ' + (lines.indexOf(line) + 1) + ': ' + line.trim());
    console.log('🔍 Relevant lines found:', relevantLines.slice(0, 10));
    console.log('⚠️ Skipping patch - this won\'t break the build but debug info won\'t be available');
    process.exit(0); // Don't fail the build
  }
}