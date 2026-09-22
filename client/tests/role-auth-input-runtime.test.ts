import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { tmpdir } from "node:os";

const chromePath = process.env.CHROME_PATH ?? "C:/Program Files/Google/Chrome/Application/chrome.exe";
const debugPort = 9234;
const baseUrl = process.env.AUTH_RUNTIME_URL ?? "http://localhost:3007";

type CdpResponse = { id?: number; result?: { result?: { value?: string } }; error?: unknown; method?: string; params?: { exceptionDetails?: { text?: string; exception?: { description?: string } } } };

const delay = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForDebugEndpoint() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (response.ok) return;
    } catch {
      // Chrome has not opened its debugger endpoint yet.
    }
    await delay(100);
  }
  throw new Error("Chrome debugger endpoint did not become available.");
}

async function openPage(path: "/login" | "/login/seller") {
  const targetResponse = await fetch(`http://127.0.0.1:${debugPort}/json/new?${baseUrl}${path}`, { method: "PUT" });
  const target = await targetResponse.json() as { webSocketDebuggerUrl: string };
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map<number, { resolve: (value: CdpResponse["result"]) => void; reject: (reason: unknown) => void }>();
  const exceptions: Array<{ text?: string; exception?: { description?: string } }> = [];
  let nextId = 0;

  const call = (method: string, params: Record<string, unknown> = {}) => new Promise<CdpResponse["result"]>((resolve, reject) => {
    const id = ++nextId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });

  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener("error", () => reject(new Error("Unable to connect to Chrome DevTools.")), { once: true });
  });
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(String(data)) as CdpResponse;
    if (message.id) {
      const request = pending.get(message.id);
      if (request) {
        pending.delete(message.id);
        message.error ? request.reject(message.error) : request.resolve(message.result);
      }
    } else if (message.method === "Runtime.exceptionThrown" && message.params?.exceptionDetails) {
      exceptions.push(message.params.exceptionDetails);
    }
  });

  await call("Runtime.enable");
  await call("Page.enable");
  await delay(1200);
  await call("Runtime.evaluate", { expression: "document.querySelector('input[name=email]').focus()" });
  await call("Input.dispatchKeyEvent", { type: "keyDown", windowsVirtualKeyCode: 82, code: "KeyR", key: "r" });
  await call("Input.dispatchKeyEvent", { type: "char", text: "r", unmodifiedText: "r", key: "r" });
  await call("Input.dispatchKeyEvent", { type: "keyUp", windowsVirtualKeyCode: 82, code: "KeyR", key: "r" });
  await delay(250);
  const value = await call("Runtime.evaluate", { expression: "document.querySelector('input[name=email]')?.value", returnByValue: true });
  socket.close();

  return { exceptions, value: value?.result?.value };
}

test("actual RoleAuth accepts a browser input without a runtime exception", { skip: !existsSync(chromePath) }, async (t) => {
  const profileDirectory = mkdtempSync(join(tmpdir(), "nexamart-auth-runtime-"));
  const chrome = spawn(chromePath, ["--headless=new", `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profileDirectory}`, "--no-first-run", "--no-default-browser-check"], { stdio: "ignore", windowsHide: true });
  t.after(() => chrome.kill());
  await waitForDebugEndpoint();

  for (const path of ["/login", "/login/seller"] as const) {
    const result = await openPage(path);
    assert.equal(result.value, "r", `${path} should retain the input value`);
    assert.deepEqual(result.exceptions, [], `${path} should not reach the root error boundary`);
  }
});
