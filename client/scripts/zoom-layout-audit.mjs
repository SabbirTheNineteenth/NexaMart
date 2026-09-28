import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const baseUrl = process.env.ZOOM_AUDIT_URL ?? "http://localhost:3001";
const browserPort = Number(process.env.ZOOM_AUDIT_CDP_PORT ?? 9225);
const outputDirectory = resolve(process.env.ZOOM_AUDIT_OUTPUT ?? "docs/zoom-evidence");
const routes = (process.env.ZOOM_AUDIT_ROUTES ?? "/,/deals,/stores,/login,/register,/login/seller,/login/admin,/register/seller,/register/admin,/account,/seller,/admin")
  .split(",").map((route) => route.trim()).filter(Boolean);
const desktop = [
  ...[80, 90, 100, 110, 125, 150].map((zoom) => ({ width: 1440, height: 900, zoom })),
  ...[90, 100, 125].map((zoom) => ({ width: 1280, height: 800, zoom })),
];
const mobile = [700, 420, 390].map((width) => ({ width, height: 900, zoom: 100 }));
const matrix = process.env.ZOOM_AUDIT_CASES
  ? process.env.ZOOM_AUDIT_CASES.split(",").map((entry) => {
      const [width, height, zoom] = entry.split("x").map(Number);
      if (![width, height, zoom].every(Number.isFinite)) throw new Error(`Invalid audit case: ${entry}`);
      return { width, height, zoom };
    })
  : process.env.ZOOM_AUDIT_QUICK === "1" ? [desktop[2], ...mobile] : [...desktop, ...mobile];

const response = await fetch(`http://127.0.0.1:${browserPort}/json/new?about:blank`, { method: "PUT" });
if (!response.ok) throw new Error(`Chrome CDP target creation failed: ${response.status}`);
const target = await response.json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { socket.addEventListener("open", res, { once: true }); socket.addEventListener("error", rej, { once: true }); });
let sequence = 0;
const pending = new Map();
const exceptions = [];
socket.addEventListener("message", ({ data }) => {
  const event = JSON.parse(data);
  if (event.method === "Runtime.exceptionThrown") exceptions.push(event.params.exceptionDetails.text);
  if (!event.id) return;
  const callback = pending.get(event.id);
  if (!callback) return;
  pending.delete(event.id);
  event.error ? callback.reject(new Error(event.error.message)) : callback.resolve(event.result);
});
function send(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
await send("Page.enable");
await send("Runtime.enable");
await mkdir(outputDirectory, { recursive: true });
const findings = [];

for (const route of routes) {
  for (const { width, height, zoom } of matrix) {
    const cssWidth = Math.round(width * 100 / zoom);
    const cssHeight = Math.round(height * 100 / zoom);
    await send("Emulation.setDeviceMetricsOverride", { width: cssWidth, height: cssHeight, deviceScaleFactor: zoom / 100, mobile: false });
    exceptions.length = 0;
    await send("Page.navigate", { url: new URL(route, baseUrl).href });
    await new Promise((res) => setTimeout(res, 850));
    const { result, exceptionDetails } = await send("Runtime.evaluate", {
      expression: `(() => {
        const root = document.documentElement;
        const width = innerWidth;
        const brand = document.querySelector('.marketplace-header .marketplace-brand');
        const actions = document.querySelector('.marketplace-header .marketplace-actions');
        const brandRect = brand?.getBoundingClientRect();
        const actionsRect = actions?.getBoundingClientRect();
        const headerCollision = Boolean(brandRect && actionsRect && brandRect.right > actionsRect.left + 1 &&
          brandRect.left < actionsRect.right - 1 && brandRect.bottom > actionsRect.top + 1 && brandRect.top < actionsRect.bottom - 1);
        const statuses = [...document.querySelectorAll('[role="status"]')].slice(0, 5).map((node) => {
          const box = node.getBoundingClientRect();
          const parent = node.parentElement?.getBoundingClientRect();
          const ancestors = [];
          let current = node;
          for (let index = 0; index < 6 && current; index++, current = current.parentElement) {
            const rect = current.getBoundingClientRect();
            const style = getComputedStyle(current);
            ancestors.push({ className: typeof current.className === 'string' ? current.className.slice(0, 100) : '',
              left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width),
              height: Math.round(rect.height), minWidth: style.minWidth, minHeight: style.minHeight,
              aspectRatio: style.aspectRatio, gridTemplateColumns: style.gridTemplateColumns, overflowX: style.overflowX });
          }
          return { text: node.textContent?.trim().slice(0, 90), left: Math.round(box.left), right: Math.round(box.right),
            width: Math.round(box.width), scrollWidth: node.scrollWidth, clientWidth: node.clientWidth,
            parentLeft: Math.round(parent?.left ?? 0), parentRight: Math.round(parent?.right ?? 0), ancestors };
        });
        const elements = [...document.querySelectorAll('body *')].map((node) => {
          const rect = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return { tag: node.tagName.toLowerCase(), className: typeof node.className === 'string' ? node.className.slice(0, 110) : '',
            left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width),
            scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, overflowX: style.overflowX,
            position: style.position, text: (node.textContent || '').trim().slice(0, 65) };
        }).filter((item) => item.right > width + 1 || item.left < -1).slice(0, 16);
        return { title: document.title, path: location.pathname, viewport: width, scrollWidth: root.scrollWidth,
          hydrated: !document.body.textContent.includes('Something interrupted your visit'),
          bodyText: document.body.innerText.slice(0, 180), headerCollision, statuses, overflow: elements };
      })()`, returnByValue: true,
    });
    if (exceptionDetails) throw new Error(exceptionDetails.text);
    const data = result.value;
    const clippedStatus = data.statuses.some((status) => status.left < -1 || status.right > data.viewport + 1);
    const failed = data.scrollWidth > data.viewport + 1 || data.headerCollision || clippedStatus || !data.hydrated || exceptions.length > 0;
    let screenshot;
    if (failed || process.env.ZOOM_AUDIT_SCREENSHOTS === "1") {
      screenshot = `${route.replaceAll("/", "_") || "home"}-${width}x${height}-${zoom}.png`;
      const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      await writeFile(resolve(outputDirectory, screenshot), Buffer.from(shot.data, "base64"));
    }
    const item = { route, width, height, zoom, cssWidth, ...data, exceptions: [...exceptions], screenshot };
    findings.push(item);
    process.stdout.write(`${failed ? "FAIL" : "PASS"} ${route} ${width}x${height} ${zoom}% css=${cssWidth} scroll=${data.scrollWidth} viewport=${data.viewport} headerCollision=${data.headerCollision} clippedStatus=${clippedStatus}\n`);
  }
}
await writeFile(resolve(outputDirectory, "results.json"), `${JSON.stringify(findings, null, 2)}\n`);
socket.close();
await fetch(`http://127.0.0.1:${browserPort}/json/close/${target.id}`);
if (findings.some((finding) => finding.scrollWidth > finding.viewport + 1 || finding.headerCollision ||
  finding.statuses.some((status) => status.left < -1 || status.right > finding.viewport + 1) ||
  !finding.hydrated || finding.exceptions.length)) process.exitCode = 1;
