import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

const spawnOptions = {
  cwd: rootDir,
  env: process.env,
  stdio: 'inherit',
};

const run = (command, args) => {
  // Node 24 on Windows cannot spawn .cmd shims directly (EINVAL). Route only
  // the pnpm shim through cmd.exe; executables such as node still launch
  // directly, so paths containing spaces remain intact.
  if (process.platform === 'win32' && command.toLowerCase().endsWith('.cmd')) {
    return spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', command, ...args], spawnOptions);
  }
  return spawn(command, args, spawnOptions);
};

const build = run(pnpm, ['--filter', '@workspace/api-server', 'build']);
const buildExit = await new Promise((resolve) => build.on('exit', resolve));
if (buildExit !== 0) process.exit(Number(buildExit) || 1);

const api = run(process.execPath, ['scripts/run-local-api.mjs']);
const web = run(pnpm, ['--filter', '@workspace/lxlunettes', 'dev:vite']);
const children = [api, web];

let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.killed) child.kill();
  }
};

process.on('SIGINT', stop);
process.on('SIGTERM', stop);
process.on('exit', stop);

const result = await Promise.race(children.map((child) => new Promise((resolve) => child.on('exit', resolve))));
stop();
process.exit(Number(result) || 0);
