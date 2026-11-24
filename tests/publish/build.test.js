// Runs the Cloudflare build command from docs/deploy.md against real trees.
const test = require("node:test"), assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const fs = require("node:fs"), os = require("node:os"), path = require("node:path");
const repo = path.resolve(__dirname, "../..");
const doc = fs.readFileSync(path.join(repo, "docs/deploy.md"), "utf8");
const cmd = doc.split("## Cloudflare build command")[1].match(/```sh\n([\s\S]*?)\n```/)[1].trim();

function tree(ref) { // a clean copy of a commit (or the working tree when ref is null)
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "smm-build-"));
  if (ref) execFileSync("sh", ["-c", `git -C "${repo}" archive ${ref} | tar -x -C "${dir}"`]);
  else for (const f of execFileSync("git", ["-C", repo, "ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" }).split("\n").filter(Boolean)) {
    if (!fs.existsSync(path.join(repo, f))) continue; // deleted in working tree
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.copyFileSync(path.join(repo, f), path.join(dir, f));
  }
  return dir;
}
function build(dir) { return spawnSync("sh", ["-c", cmd], { cwd: dir, encoding: "utf8" }); }
function files(dir) { return execFileSync("sh", ["-c", "find . -type f | sed 's#^\\./##' | sort"], { cwd: dir, encoding: "utf8" }).split("\n").filter(Boolean); }

test("command is one line and parsed from docs/deploy.md", () => { assert.ok(cmd.length > 1000); assert.ok(!cmd.includes("\n")); assert.match(cmd, /echo "Publish check passed"$/); });

test("current working tree builds and publishes only course files", () => {
  const dir = tree(null), r = build(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /Publish check passed/);
  const out = files(path.join(dir, "dist"));
  assert.ok(out.includes("lesson-1/index.html") && out.includes("shared/smm/quiz.js"));
  assert.ok(!out.some((f) => /^(tests|docs)\//.test(f)), out.join(","));
});

test("v1 production commit ab4c3c5 publishes its 18 files byte-for-byte", () => {
  const dir = tree("ab4c3c527de14b9ff72eadb34a58467d040a80e0"), r = build(dir);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const out = files(path.join(dir, "dist")); assert.equal(out.length, 18);
  for (const f of out) assert.ok(fs.readFileSync(path.join(dir, "dist", f)).equals(fs.readFileSync(path.join(dir, f))), f);
});

for (const [name, setup] of [
  ["unlisted shared file (e.g. a lesson-specific script in shared/smm/)", (d) => fs.writeFileSync(path.join(d, "shared/smm/lesson-1-pilot.js"), "x")],
  ["shared/internal-notes.js", (d) => fs.writeFileSync(path.join(d, "shared/internal-notes.js"), "x")],
  ["shared/config.json", (d) => fs.writeFileSync(path.join(d, "shared/config.json"), "{}")],
  ["unexpected nested directory", (d) => { fs.mkdirSync(path.join(d, "shared/drafts")); fs.writeFileSync(path.join(d, "shared/drafts/old.js"), "x"); }],
  ["symlinked shared/ directory", (d) => { const t = fs.mkdtempSync(path.join(os.tmpdir(), "t-")); fs.cpSync(path.join(d, "shared"), t, { recursive: true }); fs.writeFileSync(path.join(t, "SECRET.txt"), "SECRET"); fs.rmSync(path.join(d, "shared"), { recursive: true }); fs.symlinkSync(t, path.join(d, "shared")); }],
  ["symlinked lesson-1/ directory", (d) => { const t = fs.mkdtempSync(path.join(os.tmpdir(), "t-")); fs.writeFileSync(path.join(t, "index.html"), "SECRET"); fs.rmSync(path.join(d, "lesson-1"), { recursive: true }); fs.symlinkSync(t, path.join(d, "lesson-1")); }],
  ["symlinked index.html", (d) => { const t = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "t-")), "f"); fs.writeFileSync(t, "SECRET"); fs.rmSync(path.join(d, "index.html")); fs.symlinkSync(t, path.join(d, "index.html")); }],
]) {
  test("build stops: " + name, () => {
    const dir = tree(null); setup(dir); const r = build(dir);
    assert.equal(r.status, 1, r.stdout); assert.match(r.stdout, /Build stopped/);
    const dist = path.join(dir, "dist");
    if (fs.existsSync(dist)) assert.ok(!execFileSync("sh", ["-c", "grep -rl SECRET . || true"], { cwd: dist, encoding: "utf8" }).trim());
  });
}
