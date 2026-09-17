"use strict";

const { chromium } = require("playwright");
const path = require("node:path");
const { mkdir } = require("node:fs/promises");

const baseUrl = process.env.QA_BASE_URL || "http://localhost:3003";
const outputDirectory = path.resolve(__dirname, "../../artifacts/qa");

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);
  await page.waitForTimeout(700);
}

async function main() {
  await mkdir(outputDirectory, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "C:\\Users\\HP!\\AppData\\Local\\ms-playwright\\chromium_headless_shell-1161\\chrome-win\\headless_shell.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
    await settle(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => window.scrollTo(0, 0));
    console.log(`INTERACTION_VIEWPORT=${await page.evaluate(() => `${window.innerWidth}x${window.innerHeight}`)}`);
    console.log(`INTERACTION_BUTTONS=${await page.locator("button").count()}`);
    await page.screenshot({ path: path.join(outputDirectory, "explore-390-interaction-ready-production.png") });
    const menuToggle = page.getByRole("button", { name: "Toggle marketplace categories" });
    await menuToggle.click();
    await page.screenshot({ path: path.join(outputDirectory, "explore-390-menu-open-production.png") });
    await page.keyboard.press("Escape");
    await page.screenshot({ path: path.join(outputDirectory, "explore-390-menu-escape-production.png") });
    console.log(`MENU_FOCUS_RETURN=${await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))}`);

    await page.goto(`${baseUrl}/?bag=1`, { waitUntil: "domcontentloaded" });
    await settle(page);
    await page.screenshot({ path: path.join(outputDirectory, "explore-390-bag-open-production.png") });
    await page.keyboard.press("Escape");
    await page.screenshot({ path: path.join(outputDirectory, "explore-390-bag-escape-production.png") });
    console.log(`DRAWER_PRESENT_AFTER_ESCAPE=${await page.getByRole("dialog").count()}`);

    await page.goto(`${baseUrl}/products/demo-store-auralis-orbit-headphones`, { waitUntil: "domcontentloaded" });
    await settle(page);
    await page.getByRole("button", { name: /Save Auralis Orbit Headphones/ }).click();
    await page.screenshot({ path: path.join(outputDirectory, "product-390-wishlist-unauthenticated-production.png") });
    console.log(`WISHLIST_ALERT=${await page.getByRole("alert").allTextContents()}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
