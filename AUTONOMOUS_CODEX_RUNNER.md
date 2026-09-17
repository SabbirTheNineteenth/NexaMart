# Autonomous local Codex runner

Run from VS Code: **Terminal → Run Task → NexaMart: Autonomous Codex**.

The runner starts one Codex CLI session at a time. Each fresh session reads the durable delivery and parity records, implements one highest-priority unresolved slice, records evidence, writes `NEXT CONTINUATION`, then exits. The runner starts the next session until stopped or its 40-session guard is reached.

## Safety boundaries

- It refuses to start if another Codex CLI process is running or its lock exists.
- It does not commit, push, deploy, reset, clean, apply migrations/seeds, or access credentials.
- It must preserve frontend-first sequencing: backend work stays paused unless a screenshot-verified visible-control gap is concrete and documented.
- Create `.nexamart-autonomous.stop` with **NexaMart: Stop Autonomous Codex After Current Session** to stop at the next safe boundary.
- Do not run the VS Code Codex extension and this runner as concurrent writers.

## Logs

`artifacts/autonomous-codex/runner.log` holds runner boundaries. Prompt snapshots are stored in the same directory.

## Restart

After a runner/session interruption, remove a stale `.nexamart-autonomous.lock` only after verifying no Codex CLI process is active, then run the task again. The next session reads the durable files and resumes from `NEXT CONTINUATION`.
