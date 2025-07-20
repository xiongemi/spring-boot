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
    
    if (!projectGraph?.nodes?.[task.target.project]) {
        console.log('❌ SPRING_BOOT_DEBUG: Project not found in projectGraph.nodes:', task.target.project);
        console.log('❌ SPRING_BOOT_DEBUG: Available projects:', Object.keys(projectGraph?.nodes || {}));
        throw new Error(\`Project \${task.target.project} not found in projectGraph.nodes\`);
    }
    
    const project = projectGraph.nodes[task.target.project].data;`;

if (originalPattern.test(content)) {
  // Patch the function 
  content = content.replace(originalPattern, replacement);
  
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
    
    if (!projectGraph?.nodes?.[task.target.project]) {
        console.log('❌ SPRING_BOOT_DEBUG: Project not found in projectGraph.nodes:', task.target.project);
        console.log('❌ SPRING_BOOT_DEBUG: Available projects:', Object.keys(projectGraph?.nodes || {}));
        throw new Error(\`Project \${task.target.project} not found in projectGraph.nodes\`);
    }
    
    const project = projectGraph.nodes[task.target.project].data;`,
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