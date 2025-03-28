const { readFileSync, writeFileSync } = require('fs');


writeFileSync(require.resolve('nx/src/tasks-runner/batch/run-batch.js'), readFileSync(
    require('path').join(__dirname, 'replacement.js')
));