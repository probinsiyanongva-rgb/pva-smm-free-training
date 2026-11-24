// Browser test: banner appears on preview hosts and not on the production host.
// Requests to both hosts are answered from a local dist/ build (no network needed).
// Usage: node tests/e2e/preview-banner.e2e.js <path-to-dist>
let pw; try { pw = require("playwright"); } catch (e) { pw = require(process.env.PLAYWRIGHT_PATH || "playwright"); }
const fs = require("fs"), path = require("path");
const dist = path.resolve(process.argv[2] || "dist");
const types = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css" };
let failed = 0; const check = (n, ok, d = "") => { if (!ok) failed++; console.log((ok ? "PASS " : "FAIL ") + n + (d ? " — " + d : "")); };
(async () => {
  const browser = await pw.chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ["--no-sandbox"] } : {});
  const ctx = await browser.newContext();
  await ctx.route(/^https:\/\/([a-z0-9-]+\.)?pva-smm-free-training\.pages\.dev\//, (route) => {
    let p = new URL(route.request().url()).pathname; if (p.endsWith("/")) p += "index.html";
    const f = path.join(dist, p);
    if (fs.existsSync(f)) route.fulfill({ status: 200, contentType: types[path.extname(f)] || "text/plain", body: fs.readFileSync(f) });
    else route.fulfill({ status: 404, body: "not found" });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  for (const p of ["/", "/lesson-1/", "/lesson-7/", "/final-project/", "/portfolio/", "/progress/"]) {
    await page.goto("https://dev-v2-0.pva-smm-free-training.pages.dev" + p);
    const t = await page.evaluate(() => { const b = document.querySelector(".dev-preview-banner"); return b && b === document.body.firstElementChild ? b.innerText : ""; });
    check("preview host shows banner at top: " + p, /Development preview/.test(t) && /official course/.test(t));
    await page.goto("https://pva-smm-free-training.pages.dev" + p);
    check("production host has no banner: " + p, (await page.$(".dev-preview-banner")) === null);
  }
  await page.goto("https://cd4d36fa.pva-smm-free-training.pages.dev/lesson-1/");
  check("deployment-ID preview host shows banner", !!(await page.$(".dev-preview-banner")));
  const color = await page.$eval(".dev-preview-banner", (b) => [getComputedStyle(b).color, getComputedStyle(b).backgroundColor]);
  check("banner text is white on dark red", color[0] === "rgb(255, 255, 255)" && color[1] === "rgb(122, 46, 31)", color.join(" on "));
  await browser.close(); console.log(failed ? `\n${failed} failed` : "\nall banner checks passed"); process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
