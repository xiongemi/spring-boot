#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

// Override the getTargetConfigurationForTask function to add logging
const originalUtilsPath = 'node_modules/nx/src/tasks-runner/utils.js';
const backupUtilsPath = 'node_modules/nx/src/tasks-runner/utils.js.backup';

try {
  console.log('🔍 Debugging Nx target configuration issue...');
  
  // Backup original file if not already backed up
  if (!fs.existsSync(backupUtilsPath)) {
    fs.copyFileSync(originalUtilsPath, backupUtilsPath);
    console.log('✅ Backed up original utils.js');
  }
  
  // Read the original file
  let utilsContent = fs.readFileSync(originalUtilsPath, 'utf8');
  
  // Find and replace the getTargetConfigurationForTask function to add logging
  const originalFunction = `function getTargetConfigurationForTask(task, projectGraph) {
    return projectGraph.nodes[task.target.project].data.targets[task.target.target];
}`;

  const debugFunction = `function getTargetConfigurationForTask(task, projectGraph) {
    const projectNode = projectGraph.nodes[task.target.project];
    if (!projectNode) {
        console.error('❌ ERROR: Project not found in graph:', task.target.project);
        console.error('Available projects:', Object.keys(projectGraph.nodes));
        throw new Error(\`Project \${task.target.project} not found in project graph\`);
    }
    
    if (!projectNode.data) {
        console.error('❌ ERROR: Project data is undefined for:', task.target.project);
        console.error('Project node:', JSON.stringify(projectNode, null, 2));
        throw new Error(\`Project data is undefined for \${task.target.project}\`);
    }
    
    if (!projectNode.data.targets) {
        console.error('❌ ERROR: Project targets are undefined for:', task.target.project);
        console.error('Project data:', JSON.stringify(projectNode.data, null, 2));
        throw new Error(\`Project targets are undefined for \${task.target.project}\`);
    }
    
    const target = projectNode.data.targets[task.target.target];
    if (!target) {
        console.error('❌ ERROR: Target not found:', {
            project: task.target.project,
            target: task.target.target,
            availableTargets: Object.keys(projectNode.data.targets)
        });
        throw new Error(\`Target \${task.target.target} not found in project \${task.target.project}\`);
    }
    
    return target;
}`;

  // Replace the function
  if (utilsContent.includes('function getTargetConfigurationForTask(task, projectGraph)')) {
    utilsContent = utilsContent.replace(originalFunction, debugFunction);
    fs.writeFileSync(originalUtilsPath, utilsContent);
    console.log('✅ Added debug logging to getTargetConfigurationForTask');
  } else {
    console.log('⚠️  Could not find exact function signature to replace, trying alternative approach');
    
    // Alternative approach - replace the problematic line directly
    const problemLine = 'return projectGraph.nodes[task.target.project].data.targets[task.target.target];';
    const debugLine = `
    const projectNode = projectGraph.nodes[task.target.project];
    if (!projectNode) {
        console.error('❌ ERROR: Project not found in graph:', task.target.project);
        console.error('Available projects:', Object.keys(projectGraph.nodes));
        throw new Error(\`Project \${task.target.project} not found in project graph\`);
    }
    
    if (!projectNode.data) {
        console.error('❌ ERROR: Project data is undefined for:', task.target.project);
        throw new Error(\`Project data is undefined for \${task.target.project}\`);
    }
    
    if (!projectNode.data.targets) {
        console.error('❌ ERROR: Project targets are undefined for:', task.target.project);
        throw new Error(\`Project targets are undefined for \${task.target.project}\`);
    }
    
    const target = projectNode.data.targets[task.target.target];
    if (!target) {
        console.error('❌ ERROR: Target not found:', {
            project: task.target.project,
            target: task.target.target,
            availableTargets: Object.keys(projectNode.data.targets)
        });
        throw new Error(\`Target \${task.target.target} not found in project \${task.target.project}\`);
    }
    
    return target;`;
    
    if (utilsContent.includes(problemLine)) {
      utilsContent = utilsContent.replace(problemLine, debugLine);
      fs.writeFileSync(originalUtilsPath, utilsContent);
      console.log('✅ Added debug logging to problematic line');
    } else {
      console.log('⚠️  Could not find problematic line to replace');
      console.log('File content snippet around line 289:');
      const lines = utilsContent.split('\n');
      for (let i = 285; i < 295; i++) {
        if (lines[i]) {
          console.log(`${i + 1}: ${lines[i]}`);
        }
      }
    }
  }
  
  console.log('🚀 Debug logging enabled. Running the original command...');
  console.log('');
  
  // Run the original command that was failing
  const command = process.argv.slice(2).join(' ');
  if (command) {
    console.log(`Running: ${command}`);
    execSync(command, { stdio: 'inherit' });
  } else {
    console.log('No command provided. You can now run your nx commands and see detailed error messages.');
  }
  
} catch (error) {
  console.error('Error in debug script:', error.message);
  
  // Restore original file on error
  if (fs.existsSync(backupUtilsPath)) {
    fs.copyFileSync(backupUtilsPath, originalUtilsPath);
    console.log('🔄 Restored original utils.js');
  }
  
  process.exit(1);
} finally {
  // Restore original file
  if (fs.existsSync(backupUtilsPath)) {
    fs.copyFileSync(backupUtilsPath, originalUtilsPath);
    console.log('🔄 Restored original utils.js');
  }
}