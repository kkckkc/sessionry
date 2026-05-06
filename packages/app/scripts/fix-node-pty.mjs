import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const EXECUTABLE_MODE = 0o755;

const ensureExecutable = filePath => {
  try {
    const stats = fs.statSync(filePath);
    const currentMode = stats.mode & 0o777;

    if (currentMode !== EXECUTABLE_MODE) {
      fs.chmodSync(filePath, EXECUTABLE_MODE);
      console.log(`[fix-node-pty] chmod 755 ${filePath}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[fix-node-pty] skipped ${filePath}: ${message}`);
  }
};

try {
  const packageJsonPath = require.resolve('node-pty/package.json');
  const packageDir = path.dirname(packageJsonPath);
  const prebuildsDir = path.join(packageDir, 'prebuilds');

  if (!fs.existsSync(prebuildsDir)) {
    console.warn(`[fix-node-pty] no prebuilds directory at ${prebuildsDir}`);
    process.exit(0);
  }

  for (const platformDir of fs.readdirSync(prebuildsDir)) {
    const helperPath = path.join(prebuildsDir, platformDir, 'spawn-helper');
    if (fs.existsSync(helperPath)) {
      ensureExecutable(helperPath);
    }
  }
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.warn(`[fix-node-pty] unable to resolve node-pty: ${message}`);
}
