import { chromium, expect } from "@playwright/test";
import chromiumBinary from "@sparticuz/chromium";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { brotliDecompressSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

// The npm-distributed headless browser works without a separate CDN download.
// Extract its runtime libraries for minimal Linux containers as well as Lambda.
const runtime = join(tmpdir(), "loomis-browser-runtime");
await mkdir(runtime, { recursive: true });
const archive = new URL(
  "../node_modules/@sparticuz/chromium/bin/al2023.tar.br",
  import.meta.url,
);
await writeFile(
  join(runtime, "runtime.tar"),
  brotliDecompressSync(await readFile(archive)),
);
execFileSync("tar", ["xf", join(runtime, "runtime.tar"), "-C", runtime]);
const browser = await chromium.launch({
  executablePath: await chromiumBinary.executablePath(),
  args: chromiumBinary.args,
  env: {
    ...process.env,
    LD_LIBRARY_PATH: `${runtime}/lib:${process.env.LD_LIBRARY_PATH || ""}`,
  },
  headless: true,
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const foreignRequests = [];
page.on("request", (r) => {
  if (/^https?:/.test(r.url()) && !r.url().startsWith("http://localhost:5173"))
    foreignRequests.push(r.url());
});
try {
  await page.goto(process.env.TEST_URL || "http://localhost:5173");
  await expect(page.locator(".detection-badge")).toBeVisible({
    timeout: 90000,
  });
  await expect(page.locator(".image-stage svg > g > g")).toHaveCount(6);
  await page.getByRole("button", { name: "Go to step 1", exact: true }).click();
  await expect(page.locator(".image-stage svg > g > g")).toHaveCount(1);
  await page.getByRole("button", { name: "Go to step 6", exact: true }).click();
  await page.locator(".layer-list button").first().click();
  await expect(page.locator(".image-stage svg > g > g")).toHaveCount(5);
  await page.locator(".layer-list button").first().click();
  for (const format of ["PNG", "SVG"]) {
    await page.getByRole("button", { name: "Export drawing" }).click();
    const downloaded = page.waitForEvent("download");
    await page.getByRole("button", { name: `Download ${format}` }).click();
    const download = await downloaded;
    expect(download.suggestedFilename()).toContain(
      `loomis.${format.toLowerCase()}`,
    );
    const data = await readFile(await download.path());
    if (format === "PNG") expect(data.subarray(1, 4).toString()).toBe("PNG");
    else {
      expect(data.toString()).toContain("data:image/jpeg;base64,");
      expect(data.toString()).toContain("<ellipse");
    }
  }
  await page.getByRole("button", { name: "Adjust", exact: true }).click();
  await page.getByRole("slider", { name: "Rotation", exact: true }).fill("10");
  await expect(
    page.getByRole("slider", { name: "Rotation", exact: true }),
  ).toHaveValue("10");
  await page.getByRole("button", { name: "Restore detected fit" }).click();
  await expect(
    page.getByRole("slider", { name: "Rotation", exact: true }),
  ).toHaveValue("0");
  await page.getByRole("button", { name: "Reset workspace" }).click();
  await expect(page.getByText("A new perspective starts here.")).toBeVisible();
  await page.setInputFiles("input[type=file]", "public/sample.jpg");
  await expect(page.locator(".detection-badge")).toBeVisible({
    timeout: 60000,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.screenshot({ path: "test-results/workspace.png", fullPage: true });
  // Blank input exercises actual model inference, not a mocked failure.
  const blank = await page.evaluate(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 400;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, 400, 400);
    return c.toDataURL().split(",")[1];
  });
  await page.setInputFiles("input[type=file]", {
    name: "blank.png",
    mimeType: "image/png",
    buffer: Buffer.from(blank, "base64"),
  });
  await expect(
    page.getByText(
      "No face could be detected. Please upload a clearer portrait.",
    ),
  ).toBeVisible({ timeout: 60000 });
  await expect(
    page.getByRole("button", { name: "Export drawing" }),
  ).toBeDisabled();
  const pair = await page.evaluate(async () => {
    const image = new Image();
    image.src = "/sample.jpg";
    await image.decode();
    const c = document.createElement("canvas");
    c.width = 1200;
    c.height = 900;
    const ctx = c.getContext("2d");
    ctx.drawImage(image, 0, 0, 600, 900);
    ctx.drawImage(image, 600, 0, 600, 900);
    return c.toDataURL().split(",")[1];
  });
  await page.setInputFiles("input[type=file]", {
    name: "two-faces.png",
    mimeType: "image/png",
    buffer: Buffer.from(pair, "base64"),
  });
  await expect(page.getByText("Choose your subject")).toBeVisible({
    timeout: 60000,
  });
  await page.locator(".face-options button").nth(1).click();
  await expect(page.locator(".detection-badge")).toContainText("Face 2 of 2");
  expect(errors).toEqual([]);
  expect(foreignRequests).toEqual([]);
  console.log(
    "PASS: real detection, progressive stages, layer visibility, PNG/SVG export, adjustments, reset, upload, mobile layout, no-face and multi-face handling. No external requests.",
  );
} finally {
  await browser.close();
}
