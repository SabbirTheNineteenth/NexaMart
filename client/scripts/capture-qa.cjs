"use strict";

const { chromium } = require("playwright");
const { mkdir } = require("node:fs/promises");
const path = require("node:path");

const baseUrl = process.env.QA_BASE_URL || "http://localhost:3003";
const captureSuffix = process.env.QA_CAPTURE_SUFFIX || "production";
const outputDirectory = path.resolve(__dirname, "../../artifacts/qa");
const viewports = [
  { label: "1440", width: 1440, height: 1050 },
  { label: "700", width: 700, height: 1000 },
  { label: "420", width: 420, height: 900 },
  { label: "390", width: 390, height: 844 },
];
const routes = [
  ["explore", "/"],
  ["product", "/products/demo-store-auralis-orbit-headphones"],
  ["deals", "/deals"],
  ["stores", "/stores"],
  ["public-store", "/stores/demo-store"],
  ["account", "/account"],
  ["seller", "/seller"],
  ["admin", "/admin"],
  ["login", "/login"],
  ["register", "/register"],
];
const requestedViewport = process.argv[2];
const requestedRoute = process.env.QA_ROUTE;
const scrollSelector = process.env.QA_SCROLL_SELECTOR;
const captureViewports = requestedViewport
  ? viewports.filter((viewport) => viewport.label === requestedViewport)
  : viewports;
const captureRoutes = requestedRoute ? routes.filter(([, route]) => route === requestedRoute) : routes;

if (requestedViewport && captureViewports.length === 0) {
  throw new Error(`Unknown viewport label: ${requestedViewport}`);
}

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);
  await page.waitForTimeout(1_000);
}

async function main() {
  await mkdir(outputDirectory, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "C:\\Users\\HP!\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1161\\chrome-win\\headless_shell.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const consoleErrors = [];
  try {
    for (const viewport of captureViewports) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      const page = await context.newPage();
      page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(`${viewport.label}: ${message.text()}`); });
      page.on("pageerror", (error) => consoleErrors.push(`${viewport.label}: ${error.message}`));
      for (const [name, route] of captureRoutes) {
        await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
        await settle(page);
        if (scrollSelector) {
          await page.locator(scrollSelector).scrollIntoViewIfNeeded();
          await page.waitForTimeout(300);
        }
        await page.screenshot({ path: path.join(outputDirectory, `${name}-${viewport.label}-${captureSuffix}.png`) });
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }
  for (const error of consoleErrors) console.error(`BROWSER_CONSOLE_ERROR ${error}`);
  console.log(`QA_CAPTURED=${captureRoutes.length * captureViewports.length}`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
