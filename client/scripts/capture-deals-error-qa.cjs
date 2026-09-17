"use strict";

const { chromium } = require("playwright");
const { mkdir } = require("node:fs/promises");
const path = require("node:path");

const baseUrl = process.env.QA_BASE_URL || "http://localhost:3024";
const suffix = process.env.QA_CAPTURE_SUFFIX || "localhost-c07-error-retry";
const outputDirectory = path.resolve(__dirname, "../../artifacts/qa");
const viewports = [
  ["1440", 1440, 1050],
  ["700", 700, 1000],
  ["420", 420, 900],
  ["390", 390, 844],
];

async function main() {
  await mkdir(outputDirectory, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "C:\\Users\\HP!\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1161\\chrome-win\\headless_shell.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });
  try {
    for (const [label, width, height] of viewports) {
      const context = await browser.newContext({ viewport: { width, height } });
      const page = await context.newPage();
      let requestCount = 0;
      await page.route("**/api/catalog/products?deals=active", async (route) => {
        requestCount += 1;
        if (requestCount > 1) await new Promise((resolve) => setTimeout(resolve, 300));
        await route.abort("failed");
      });
      await page.goto(`${baseUrl}/deals`, { waitUntil: "domcontentloaded" });
      await page.getByText("Active deals are temporarily unavailable.").waitFor();
      await page.locator(".deals-collection-state").scrollIntoViewIfNeeded();
      await page.screenshot({ path: path.join(outputDirectory, `deals-${label}-${suffix}.png`) });
      await page.getByRole("button", { name: "Retry active deals" }).click();
      await page.waitForTimeout(50);
      console.log(`${label} RETRY_LOADING=${await page.getByText("Loading active deals…").count()}`);
      await page.getByText("Active deals are temporarily unavailable.").waitFor();
      console.log(`${label} RETRY_ERROR=${await page.getByText("Active deals are temporarily unavailable.").count()}`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
