const fs = require('fs');
const path = require('path');

function replaceJar(sourceJar, targetJar) {
  if (!fs.existsSync(sourceJar)) {
    console.error(`❌ Source JAR not found at: ${sourceJar}`);
    process.exit(1);
  }

  if (!fs.existsSync(targetJar)) {
    console.error(`❌ Target JAR not found at: ${targetJar}`);
    process.exit(1);
  }

  try {
    fs.copyFileSync(sourceJar, targetJar);
    console.log(`✅ Replaced ${targetJar} with ${sourceJar}`);
  } catch (err) {
    console.error(`❌ Failed to replace JAR: ${err.message}`);
    process.exit(1);
  }
}

const workspaceRoot = process.cwd(); // assumes script is run from workspace root
replaceJar(path.join(workspaceRoot, 'batch-runner.jar'), path.join(workspaceRoot, 'node_modules/@nx/gradle/batch-runner/build/libs/batch-runner.jar'));
replaceJar(path.join(workspaceRoot, 'batch-runner-all.jar'), path.join(workspaceRoot, 'node_modules/@nx/gradle/batch-runner/build/libs/batch-runner-all.jar'));