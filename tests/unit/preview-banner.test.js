// The development-preview banner must be on every published page, show on preview
// addresses only, and never on the official course address.
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("node:fs"), path = require("node:path");
const repo = path.resolve(__dirname, "../..");
const pages = ["index.html", ...Array.from({ length: 13 }, (_, i) => `lesson-${i + 1}/index.html`), "final-project/index.html", "portfolio/index.html", "progress/index.html"];

test("every published page carries the banner script exactly once", () => {
  for (const p of pages) {
    const html = fs.readFileSync(path.join(repo, p), "utf8");
    assert.equal((html.match(/data-dev-preview-banner/g) || []).length, 1, p);
  }
});

test("banner host rule: preview addresses only", () => {
  const html = fs.readFileSync(path.join(repo, "lesson-1/index.html"), "utf8");
  const src = html.match(/if \(!(\/.*?\/i)\.test\(location\.hostname\)\)/)[1];
  const re = eval(src);
  for (const h of ["dev-v2-0.pva-smm-free-training.pages.dev", "cd4d36fa.pva-smm-free-training.pages.dev", "pre-v2-0-backup.pva-smm-free-training.pages.dev"]) assert.ok(re.test(h), h);
  for (const h of ["pva-smm-free-training.pages.dev", "probinsiyanongva.org", "pva-smm-free-training.pages.dev.evil.example", "localhost", "127.0.0.1"]) assert.ok(!re.test(h), h);
});
