#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const executorUtilsPath = path.join(__dirname, '../node_modules/nx/src/command-line/run/executor-utils.js');
const taskRunnerUtilsPath = path.join(__dirname, '../node_modules/nx/src/tasks-runner/utils.js');
const gradleProjectGraphPath = path.join(__dirname, '../node_modules/@nx/gradle/src/plugin/utils/get-project-graph-lines.js');

// Enhanced parseExecutor function with comprehensive logging
const patchedParseExecutor = `function parseExecutor(executorString) {
    // console.log('DEBUG: parseExecutor called with:', executorString);
    
    // Capture call stack to identify which target is causing the issue
    const stack = new Error().stack;
    const caller = stack.split('\\n')[2]; // Get the calling function
    
    if (!executorString) {
        console.error('ERROR: parseExecutor received undefined or null executorString');
        console.error('ERROR: Call stack:', stack);
        console.error('ERROR: Caller:', caller);
        
        // Look for task object in arguments
        const args = Array.from(arguments);
        console.error('ERROR: Function arguments:', args);
        
        throw new Error(\`parseExecutor received undefined or null executorString. Caller: \${caller}\`);
    }
    
    if (typeof executorString !== 'string') {
        console.error('ERROR: parseExecutor received non-string executorString:', typeof executorString, executorString);
        console.error('ERROR: Call stack:', stack);
        console.error('ERROR: Caller:', caller);
        
        throw new Error(\`parseExecutor received non-string executorString: \${typeof executorString}. Caller: \${caller}\`);
    }
    
    const result = executorString.split(':');
    // console.log('DEBUG: parseExecutor result:', result);
    return result;
}`;

// Enhanced getExecutorForTask with better undefined handling
const enhancedGetExecutorForTask = `function getExecutorForTask(task, projectGraph) {
    console.log('DEBUG: getExecutorForTask - task:', task.id);
    
    const executor = getExecutorNameForTask(task, projectGraph);
    console.log('DEBUG: getExecutorForTask - executor resolved:', executor, 'for task:', task.id);
    
    // Check for undefined, null, or empty string
    if (executor === undefined || executor === null || executor === '') {
        console.error('ERROR: getExecutorForTask - No executor found for task:', task.id);
        console.error('ERROR: Task details:', JSON.stringify(task, null, 2));
        console.error('ERROR: Project configuration:', JSON.stringify(projectGraph.nodes[task.target.project]?.data?.targets?.[task.target.target], null, 2));
        console.error('ERROR: Available targets for project:', 
            projectGraph.nodes[task.target.project]?.data?.targets ? 
            Object.keys(projectGraph.nodes[task.target.project].data.targets) : 
            'No targets found');
        throw new Error(\`No executor found for task: \${task.id}\`);
    }
    
    // Log the task details before calling parseExecutor to help identify which task causes the issue
    console.log('DEBUG: About to call parseExecutor for task:', task.id, 'with executor:', executor);
    console.log('DEBUG: Task target:', JSON.stringify(task.target, null, 2));
    
    try {
        const [nodeModule, executorName] = (0, executor_utils_1.parseExecutor)(executor);
        return (0, executor_utils_1.getExecutorInformation)(nodeModule, executorName, workspace_root_1.workspaceRoot, (0, project_graph_1.readProjectsConfigurationFromProjectGraph)(projectGraph).projects);
    } catch (error) {
        console.error('ERROR: parseExecutor failed for task:', task.id);
        console.error('ERROR: Task details:', JSON.stringify(task, null, 2));
        console.error('ERROR: Executor value:', executor);
        console.error('ERROR: Original error:', error.message);
        throw error;
    }
}`;

function patchExecutorUtils() {
    try {
        // Patch executor-utils.js
        if (!fs.existsSync(executorUtilsPath)) {
            console.error('ERROR: executor-utils.js not found at:', executorUtilsPath);
            process.exit(1);
        }

        const originalExecutorUtilsContent = fs.readFileSync(executorUtilsPath, 'utf8');
        
        // Check if already patched
        if (!originalExecutorUtilsContent.includes('DEBUG: parseExecutor called with:')) {
            // Find the parseExecutor function and replace it
            const parseExecutorRegex = /function parseExecutor\(executorString\) \{[^}]*\}/;
            
            if (!parseExecutorRegex.test(originalExecutorUtilsContent)) {
                console.error('ERROR: Could not find parseExecutor function in executor-utils.js');
                process.exit(1);
            }

            const patchedExecutorUtilsContent = originalExecutorUtilsContent.replace(parseExecutorRegex, patchedParseExecutor);
            
            // Create backup
            const backupPath = executorUtilsPath + '.backup';
            if (!fs.existsSync(backupPath)) {
                fs.writeFileSync(backupPath, originalExecutorUtilsContent);
                console.log('INFO: Created backup at:', backupPath);
            }

            // Write patched version
            fs.writeFileSync(executorUtilsPath, patchedExecutorUtilsContent);
            console.log('SUCCESS: Patched executor-utils.js with enhanced logging');
        } else {
            console.log('INFO: executor-utils.js already patched');
        }

        // Enhanced patch for task-runner utils.js
        if (!fs.existsSync(taskRunnerUtilsPath)) {
            console.error('ERROR: task-runner utils.js not found at:', taskRunnerUtilsPath);
            process.exit(1);
        }

        const taskRunnerUtilsContent = fs.readFileSync(taskRunnerUtilsPath, 'utf8');
        
        // Check if we need to update getExecutorForTask with enhanced logging
        if (!taskRunnerUtilsContent.includes('DEBUG: getExecutorForTask - executor resolved:')) {
            // Find and replace the getExecutorForTask function with enhanced version
            const getExecutorForTaskRegex = /function getExecutorForTask\(task, projectGraph\) \{[\s\S]*?\}(?=\s*exports\.getExecutorForTask|\s*function|\s*$)/;
            
            if (getExecutorForTaskRegex.test(taskRunnerUtilsContent)) {
                const enhancedTaskRunnerUtilsContent = taskRunnerUtilsContent.replace(getExecutorForTaskRegex, enhancedGetExecutorForTask);
                
                // Create backup
                const taskRunnerBackupPath = taskRunnerUtilsPath + '.backup';
                if (!fs.existsSync(taskRunnerBackupPath)) {
                    fs.writeFileSync(taskRunnerBackupPath, taskRunnerUtilsContent);
                    console.log('INFO: Created backup at:', taskRunnerBackupPath);
                }

                // Write enhanced version
                fs.writeFileSync(taskRunnerUtilsPath, enhancedTaskRunnerUtilsContent);
                console.log('SUCCESS: Enhanced task-runner utils.js with better undefined handling');
            } else {
                console.log('INFO: Could not find getExecutorForTask function to enhance');
            }
        } else {
            console.log('INFO: task-runner utils.js already has enhanced logging');
        }

        // Patch gradle project graph file
        patchGradleProjectGraph();
        
    } catch (error) {
        console.error('ERROR: Failed to patch NX files:', error.message);
        process.exit(1);
    }
}

function patchGradleProjectGraph() {
    try {
        if (!fs.existsSync(gradleProjectGraphPath)) {
            console.log('INFO: Gradle project graph file not found, skipping patch');
            return;
        }

        const originalContent = fs.readFileSync(gradleProjectGraphPath, 'utf8');
        
        // Check if already patched
        if (originalContent.includes('--no-build-cache') && originalContent.includes('--rerun-tasks')) {
            console.log('INFO: Gradle project graph file already patched');
            return;
        }

        // Replace the gradle command arguments to add --no-build-cache and --rerun-tasks
        const patchedContent = originalContent.replace(
            /nxProjectGraphBuffer = await \(0, exec_gradle_1\.execGradleAsync\)\(gradlewFile, \[[\s\S]*?\]\);/,
            `nxProjectGraphBuffer = await (0, exec_gradle_1.execGradleAsync)(gradlewFile, [
            'nxProjectGraph',
            \`-Phash=\${gradleConfigHash}\`,
            '--no-configuration-cache', // disable configuration cache
            '--parallel', // add parallel to improve performance
            '--no-build-cache', // disable build cache to prevent stale cache issues
            '--rerun-tasks', // force rerun tasks to ensure fresh results
            '--warning-mode',
            'none',
            ...gradlePluginOptionsArgs,
            \`-PworkspaceRoot=\${devkit_1.workspaceRoot}\`,
            process.env.NX_VERBOSE_LOGGING ? '--info' : '',
        ]);`
        );

        if (patchedContent !== originalContent) {
            // Create backup
            const backupPath = gradleProjectGraphPath + '.backup';
            if (!fs.existsSync(backupPath)) {
                fs.writeFileSync(backupPath, originalContent);
                console.log('INFO: Created backup at:', backupPath);
            }

            // Write patched version
            fs.writeFileSync(gradleProjectGraphPath, patchedContent);
            console.log('SUCCESS: Patched gradle project graph file with --no-build-cache and --rerun-tasks');
        } else {
            console.log('INFO: Failed to patch gradle project graph file - pattern not found');
        }
    } catch (error) {
        console.error('ERROR: Failed to patch gradle project graph file:', error.message);
    }
}

if (require.main === module) {
    patchExecutorUtils();
}

module.exports = { patchExecutorUtils };