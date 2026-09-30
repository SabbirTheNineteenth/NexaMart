import type { EventEmitter } from "node:events";

type Environment = Record<string, string | undefined>;
type Timer = { setInterval(callback: () => void, milliseconds: number): NodeJS.Timeout; clearInterval(handle: NodeJS.Timeout): void };

/** Local single-process dispatcher only. Production/serverless needs an external scheduler. */
export function startLocalOutboxDispatchScheduler(
  environment: Environment,
  server: EventEmitter,
  dispatch: () => Promise<unknown>,
  timer: Timer = { setInterval, clearInterval },
): boolean {
  if (environment.NODE_ENV === "production" || environment.N8N_COD_ENABLED !== "1" || environment.NEXAMART_LOCAL_OUTBOX_DISPATCH_ENABLED !== "1") return false;
  if (!environment.N8N_WEBHOOK_URL || !environment.N8N_WEBHOOK_SECRET) throw new Error("Local outbox dispatch requires COD webhook configuration");

  let running = false;
  let closed = false;
  const handle = timer.setInterval(() => {
    if (running || closed) return;
    running = true;
    void dispatch().catch(() => {
      // Do not log transport exceptions: they may contain credential-bearing URLs.
      console.error("NexaMart local outbox dispatch failed; will retry on next tick");
    }).finally(() => { running = false; });
  }, 5_000);
  server.once("close", () => { closed = true; timer.clearInterval(handle); });
  return true;
}
