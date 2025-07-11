const fs = require('fs');
const path = require('path');

// Path to the NX utils.js file
const utilsPath = path.join(__dirname, 'node_modules/nx/src/tasks-runner/utils.js');

console.log('Adding debug logging to NX utils.js...');

try {
  // Read the original file
  let content = fs.readFileSync(utilsPath, 'utf8');
  
  // Find the getExecutorForTask function and add debug logging
  const original = `function getExecutorForTask(task, projectGraph) {
    const executor = getExecutorNameForTask(task, projectGraph);
    const [nodeModule, executorName] = (0, executor_utils_1.parseExecutor)(executor);`;
  
  const replacement = `function getExecutorForTask(task, projectGraph) {
    const executor = getExecutorNameForTask(task, projectGraph);
    console.log('DEBUG getExecutorForTask:', {
        taskId: task.id,
        projectName: task.target?.project || 'unknown',
        targetName: task.target?.target || 'unknown',
        executor: executor,
        executorType: typeof executor
    });
    const [nodeModule, executorName] = (0, executor_utils_1.parseExecutor)(executor);`;
  
  if (content.includes('function getExecutorForTask(task, projectGraph)')) {
    content = content.replace(original, replacement);
    
    // Write the modified content back
    fs.writeFileSync(utilsPath, content);
    console.log('Successfully added debug logging to getExecutorForTask');
  } else {
    console.log('Could not find getExecutorForTask function');
    console.log('Available functions:', content.match(/function \w+/g));
  }
} catch (error) {
  console.error('Error modifying utils.js:', error);
}