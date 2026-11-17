import { spawn } from 'child_process';
import path from 'path';

console.log('🚀 Starting NovaWorks AI Project Manager (Server + Client)...');

const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

const serverProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.resolve('./server'),
  stdio: 'inherit',
  shell: true,
});

const clientProcess = spawn(npmCmd, ['run', 'dev'], {
  cwd: path.resolve('./client'),
  stdio: 'inherit',
  shell: true,
});

function cleanup() {
  console.log('\n🛑 Shutting down server and client...');
  serverProcess.kill();
  clientProcess.kill();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
