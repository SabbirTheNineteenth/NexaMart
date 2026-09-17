#!/usr/bin/env node
/**
 * Durable local Codex continuation runner for NexaMart.
 * Starts exactly one Codex session at a time and resumes from durable files.
 * It never commits, pushes, migrates, seeds, deploys, resets, or cleans.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const stateDir = path.join(root, 'artifacts', 'autonomous-codex');
const lockPath = path.join(root, '.nexamart-autonomous.lock');
const stopPath = path.join(root, '.nexamart-autonomous.stop');
const logPath = path.join(stateDir, 'runner.log');
const maxSessions = Number.parseInt(process.env.NEXAMART_AUTONOMOUS_MAX_SESSIONS ?? '40', 10);
const retryDelayMs = Number.parseInt(process.env.NEXAMART_AUTONOMOUS_RETRY_DELAY_MS ?? '30000', 10);

function log(message) {
  const line = `${new Date().toISOString()} ${message}\n`;
  process.stdout.write(line);
  writeFileSync(logPath, line, { flag: 'a' });
}
function sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function run(command, args) {
  return spawnSync(command, args, { cwd: root, encoding: 'utf8', shell: false });
}
function isCodexAlreadyRunning() {
  // The VS Code extension keeps an `app-server` codex.exe alive even while no
  // implementation session is running. Only an actual `codex exec` writer
  // blocks this single-writer runner.
  const result = spawnSync('wmic', ['process', 'where', "name='codex.exe'", 'get', 'CommandLine', '/value'], { cwd: root, encoding: 'utf8' });
  return /(?:^|\s)exec(?:\s|$)/m.test(result.stdout ?? '');
}
const codexCommand = process.platform === 'win32' ? 'codex.cmd' : 'codex';
function readNext() {
  const progress = readFileSync(path.join(root, 'CODEX_PROGRESS.md'), 'utf8');
  const matrix = readFileSync(path.join(root, 'REFERENCE_TO_LOCALHOST_PARITY_MATRIX.md'), 'utf8');
  const continuationMatches = [...progress.matchAll(/^\s*[-*]?\s*NEXT CONTINUATION:\s*(.+)$/gim)];
  const nextMatch = continuationMatches.at(-1);
  const documentedNext = progress.match(/Next unresolved item:\s*([A-Z]\d+)/i)
    || matrix.match(/next priority is\s*([A-Z]\d+)/i)
    || matrix.match(/next unresolved item:\s*\*\*?([A-Z]\d+)/i);
  const unresolved = [...matrix.matchAll(/^\|\s*([A-Z]\d+)\s*\|[^\n]*\|\s*(?:No|Partial|blocked)/gm)].map((m) => m[1]);
  let next = nextMatch?.[1]?.trim() || documentedNext?.[1] || unresolved[0] || 'No explicit unresolved item found; inspect the matrix and ledger.';
  // Do not burn autonomous sessions re-checking a credential-gated Seller
  // workspace. Keep that blocker documented and advance to the next unblocked
  // customer route until the owner supplies a legitimate seller session.
  if (/^S01\b/i.test(next) && /seller-authenticated localhost session (?:remains )?unavailable|\/api\/auth\/me.*401/i.test(progress)) {
    next = 'C06 — Product Detail: preserve real catalog/cart/wishlist behavior while applying the panel-01 customer-system hierarchy; add focused RED→GREEN coverage and 1440/700/420/390 localhost evidence.';
  }
  if (/^C06\b/i.test(next) && /customer-authenticated localhost session (?:remains )?unavailable|authenticated customer session.*401|\/api\/auth\/me.*401/i.test(progress)) {
    next = 'C07 — Deals: verify the existing deals contract through truthful populated, empty, and error/retry states while preserving the panel-01 customer header; add focused RED→GREEN coverage and 1440/700/420/390 localhost evidence.';
  }
  return {
    next,
    unresolved: [...new Set(unresolved)],
  };
}
function buildPrompt({ next, unresolved }, session) {
  return `You are the sole autonomous implementation agent in D:/NexaMart, session ${session}/${maxSessions}.\n\nRead first: CODEX_MASTER_PROMPT.txt, PRODUCT_CONTEXT.md, DESIGN_CONTRACT.md, VISUAL_PARITY_MANDATE.md, AUTONOMOUS_DELIVERY_PROTOCOL.md, DELIVERY_LEDGER.md, design-qa.md, CODEX_PROGRESS.md, and REFERENCE_TO_LOCALHOST_PARITY_MATRIX.md.\n\nContinue from: ${next}\nCurrent unresolved IDs detected: ${unresolved.join(', ') || 'none detected'}.\n\nPerform exactly one highest-priority unresolved frontend parity slice, starting with the durable matrix—not a speculative re-audit. Use the user-owned reference as an exact route-family visual specification; never merge the customer/seller/admin/auth concepts into a fake root route. Preserve NexaMart identity, truthful API-backed behavior, accessibility, RBAC, and existing service/lib/util layers. Backend work remains paused unless the completed visual slice reveals a concrete missing visible-control contract; then document it instead of guessing.\n\nRequired end-of-slice evidence: targeted RED→GREEN test where code changes; typecheck; required localhost/production-like screenshots at 1440, 700, 420, 390 after visual changes; update matrix, design-qa.md, DELIVERY_LEDGER.md, and CODEX_PROGRESS.md truthfully. End CODEX_PROGRESS.md with exactly one line: NEXT CONTINUATION: <next highest-priority unresolved matrix item and the exact verification needed>.\n\nNever commit, push, deploy, reset, clean, delete unrelated files, apply migrations/seeds, or access credentials. Do not report acceptance unless the durable ledger has the required owner-valid localhost evidence. If blocked, document the exact blocker and still write NEXT CONTINUATION. Then exit cleanly so this runner can start the next session.`;
}

mkdirSync(stateDir, { recursive: true });
if (existsSync(lockPath)) {
  console.error(`Runner lock exists: ${lockPath}. Refusing concurrent run.`);
  process.exit(2);
}
if (isCodexAlreadyRunning()) {
  console.error('A Codex CLI process is already running. Refusing concurrent writer. Start this runner after it exits.');
  process.exit(3);
}
openSync(lockPath, 'wx');
process.on('exit', () => { if (existsSync(lockPath)) rmSync(lockPath); });
process.on('SIGINT', () => { log('Received SIGINT; stopping after current boundary.'); process.exit(130); });
process.on('SIGTERM', () => { log('Received SIGTERM; stopping after current boundary.'); process.exit(143); });

for (let session = 1; session <= maxSessions; session += 1) {
  if (existsSync(stopPath)) { log(`Stop sentinel detected: ${stopPath}`); break; }
  const status = run('git', ['status', '--short']);
  if (status.status !== 0) { log(`git status failed: ${status.stderr.trim()}`); break; }
  const context = readNext();
  const prompt = buildPrompt(context, session);
  writeFileSync(path.join(stateDir, `session-${String(session).padStart(3, '0')}-prompt.txt`), prompt);
  log(`Starting Codex session ${session}; continuation: ${context.next}`);
  const invocation = process.platform === 'win32'
    ? {
        command: 'bash',
        args: ['-lc', 'exec codex exec --sandbox danger-full-access "$NEXAMART_CODEX_PROMPT"'],
        env: { ...process.env, NEXAMART_CODEX_PROMPT: prompt },
      }
    : { command: codexCommand, args: ['exec', '--sandbox', 'danger-full-access', prompt], env: process.env };
  const child = spawn(invocation.command, invocation.args, {
    cwd: root,
    stdio: 'inherit',
    env: invocation.env,
    shell: false,
  });
  const exitCode = await new Promise((resolve) => {
    child.once('error', (error) => { log(`Codex spawn failed: ${error.message}`); resolve(1); });
    child.once('exit', (code) => resolve(code ?? 1));
  });
  log(`Codex session ${session} exited with code ${exitCode}.`);
  if (existsSync(stopPath)) { log('Stop sentinel detected after session.'); break; }
  if (exitCode !== 0) {
    log(`Nonzero exit; waiting ${retryDelayMs}ms before a clean resume attempt.`);
    await sleep(retryDelayMs);
  } else {
    await sleep(2000);
  }
}
log('Runner finished.');
