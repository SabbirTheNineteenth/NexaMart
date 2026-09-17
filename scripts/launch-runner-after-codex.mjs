#!/usr/bin/env node
/**
 * Fast handoff helper: waits for an externally-started Codex exec session to
 * finish, then launches the guarded autonomous runner once. It never starts a
 * second writer, and respects the stop sentinel.
 */
import { existsSync, openSync, rmSync, writeFileSync } from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(process.cwd());
const stateDir = path.join(root, 'artifacts', 'autonomous-codex');
const lockPath = path.join(root, '.nexamart-autonomous-handoff.lock');
const runnerLock = path.join(root, '.nexamart-autonomous.lock');
const stopPath = path.join(root, '.nexamart-autonomous.stop');
const logPath = path.join(stateDir, 'handoff.log');
const intervalMs = 15_000;

function log(message) {
  const line = `${new Date().toISOString()} ${message}\n`;
  process.stdout.write(line);
  writeFileSync(logPath, line, { flag: 'a' });
}
function activeCodexExec() {
  const result = spawnSync('wmic', ['process', 'where', "name='codex.exe'", 'get', 'CommandLine', '/value'], { cwd: root, encoding: 'utf8' });
  return /(?:^|\s)exec(?:\s|$)/m.test(result.stdout ?? '');
}
if (existsSync(lockPath)) process.exit(2);
openSync(lockPath, 'wx');
process.on('exit', () => { if (existsSync(lockPath)) rmSync(lockPath); });

log('Handoff watcher started.');
while (activeCodexExec()) {
  if (existsSync(stopPath)) { log('Stop sentinel detected; handoff cancelled.'); process.exit(0); }
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
}
if (existsSync(stopPath)) { log('Stop sentinel detected; handoff cancelled.'); process.exit(0); }
if (existsSync(runnerLock)) { log('Runner lock exists; no duplicate runner launched.'); process.exit(0); }
log('No active Codex exec remains; launching autonomous runner.');
const runner = spawn(process.execPath, ['scripts/autonomous-codex-runner.mjs'], {
  cwd: root,
  detached: true,
  stdio: 'ignore',
  windowsHide: true,
});
runner.unref();
log(`Autonomous runner launched with PID ${runner.pid}.`);
