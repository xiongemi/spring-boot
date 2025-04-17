"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.batchRunnerPath = void 0;
exports.default = gradlewBatch;
const devkit_1 = require("@nx/devkit");
const run_commands_impl_1 = require("nx/src/executors/run-commands/run-commands.impl");
const exec_gradle_1 = require("../../utils/exec-gradle");
const path_1 = require("path");
const child_process_1 = require("child_process");
exports.batchRunnerPath = (0, path_1.join)(__dirname, '../../../batch-runner/build/libs/nx-batch-runner.jar');
async function gradlewBatch(taskGraph, inputs, overrides, context) {
    try {
        const projectName = taskGraph.tasks[taskGraph.roots[0]]?.target?.project;
        let projectRoot = context.projectGraph.nodes[projectName]?.data?.root ?? '';
        const gradlewPath = (0, exec_gradle_1.findGradlewFile)((0, path_1.join)(projectRoot, 'project.json')); // find gradlew near project root
        const root = (0, path_1.join)(context.root, (0, path_1.dirname)(gradlewPath));
        // set args with passed in args and overrides in command line
        const input = inputs[taskGraph.roots[0]];
        let args = typeof input.args === 'string'
            ? input.args.trim()
            : Array.isArray(input.args)
                ? input.args.join(' ')
                : '';
        args += overrides.__overrides_unparsed__.length
            ? ' ' + overrides.__overrides_unparsed__.join(' ')
            : '';
        const gradlewTasksToRun = Object.entries(taskGraph.tasks).reduce((gradlewTasksToRun, [taskId, task]) => {
            const gradlewTaskName = inputs[task.id].taskName;
            const testClassName = inputs[task.id].testClassName;
            gradlewTasksToRun[taskId] = {
                taskName: gradlewTaskName,
                testClassName: testClassName,
            };
            return gradlewTasksToRun;
        }, {});
        console.log(`Running gradlew batch with args: ${args}`);
        devkit_1.output.log({
            title: `Running gradlew batch with args: ${args}`,
            bodyLines: Object.keys(gradlewTasksToRun),
        });
        const gradlewBatchStart = performance.mark(`gradlew-batch:start`);
        const batchResults = (0, child_process_1.execSync)(`java -jar ${exports.batchRunnerPath} --tasks='${JSON.stringify(gradlewTasksToRun)}' --workspaceRoot=${root} --args='${args}' ${process.env.NX_VERBOSE_LOGGING === 'true' ? '' : '--quiet'}`, {
            windowsHide: true,
            env: process.env,
            maxBuffer: run_commands_impl_1.LARGE_BUFFER,
        });
        const gradlewBatchEnd = performance.mark(`gradlew-batch:end`);
        const duration = performance.measure(`gradlew-batch`, gradlewBatchStart.name, gradlewBatchEnd.name);
        if (process.env.NX_PERF_LOGGING === 'true') {
            console.log(`Time for 'gradlew-batch'`, duration.duration);
        }
        const gradlewBatchResults = JSON.parse(batchResults.toString());
        Object.keys(taskGraph.tasks).forEach((taskId) => {
            if (!gradlewBatchResults[taskId]) {
                gradlewBatchResults[taskId] = {
                    success: false,
                    terminalOutput: `Gradlew batch failed`,
                };
            }
        });
        console.log(`Gradlew batch results:`, gradlewBatchResults);
        return gradlewBatchResults;
    }
    catch (e) {
        devkit_1.logger.error(e);
        console.error(e);
        devkit_1.output.error({
            title: `Gradlew batch failed`,
            bodyLines: [e.toString()],
        });
        return taskGraph.roots.reduce((acc, key) => {
            acc[key] = { success: false, terminalOutput: e.toString() };
            return acc;
        }, {});
    }
}
