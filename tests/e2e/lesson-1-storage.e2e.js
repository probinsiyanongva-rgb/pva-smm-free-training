// Browser test: Lesson 1 when browser storage is unavailable or fails mid-session.
// Usage: node tests/e2e/lesson-1-storage.e2e.js <baseUrl>   (needs the `playwright` package;
// set CHROME_PATH to use an installed Chrome). Serve the built dist/ (see docs/deploy.md).
let pw; try { pw = require("playwright"); } catch (e) { pw = require(process.env.PLAYWRIGHT_PATH || "playwright"); }
const pool = require("../../shared/smm/quizzes/lesson-1.js");
const base = process.argv[2] || "http://127.0.0.1:8080";
const correct = new Map(pool.map((q) => [q.prompt, q.options.find((o) => o.correct).text]));
let failed = 0; const check = (name, ok, detail = "") => { if (!ok) failed++; console.log((ok ? "PASS " : "FAIL ") + name + (detail ? " — " + detail : "")); };

const modes = {
  "storage works": null,
  "every write throws (quota / private mode)": () => { Storage.prototype.setItem = function () { throw new DOMException("quota", "QuotaExceededError"); }; },
  "localStorage access blocked": () => { Object.defineProperty(window, "localStorage", { get() { throw new DOMException("blocked", "SecurityError"); } }); },
  "writes fail mid-session": () => { const real = Storage.prototype.setItem; let n = 0; Storage.prototype.setItem = function (k, v) { if (++n > 4) throw new DOMException("quota", "QuotaExceededError"); return real.call(this, k, v); }; },
};

async function show(page, step) { await page.evaluate((s) => { document.querySelectorAll(".step-panel").forEach((x) => x.classList.remove("is-active")); document.querySelector('[data-step="' + s + '"]').classList.add("is-active"); }, step); }
async function passQuiz(page) {
  await show(page, 5); await page.click("#startQuiz");
  for (const f of await page.$$("#lessonQuiz fieldset")) {
    const want = correct.get((await f.$eval("legend", (l) => l.textContent)).replace(/^\d+\.\s/, ""));
    for (const l of await f.$$("label")) if ((await l.textContent()).trim() === want) { await (await l.$("input")).check(); break; }
  }
  await page.click("#lessonQuiz button.btn-primary");
  return page.textContent("#quizStatus");
}
async function completeWorkSample(page) {
  await show(page, 6);
  for (const tr of await page.$$("#workflowRows tr")) { for (const x of await tr.$$("input, textarea")) await x.fill("Real entry"); await (await tr.$("select[data-authority]")).selectOption("Escalate"); }
}

(async () => {
  const browser = await pw.chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ["--no-sandbox"] } : {});
  for (const [name, init] of Object.entries(modes)) {
    const ctx = await browser.newContext({ acceptDownloads: true }); if (init) await ctx.addInitScript(init);
    const page = await ctx.newPage(); const errors = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base + "/lesson-1/");
    const working = name === "storage works", failsAtLoad = !working && name !== "writes fail mid-session";
    check(`[${name}] notice on load ${failsAtLoad ? "shown" : "not shown"}`, (await page.isVisible("#storageNotice")) === failsAtLoad);
    const quiz = await passQuiz(page);
    check(`[${name}] quiz says passed`, /Knowledge check passed/.test(quiz));
    if (name === "writes fail mid-session") {
      // Honest either way: the page warns exactly when the pass really did not reach storage.
      const stored = await page.evaluate(() => { try { const v = JSON.parse(localStorage.getItem("pva-smm-ft-v2") || "{}"); return !!(v.records && v.records["l01-quiz"] && v.records["l01-quiz"].status === "passed"); } catch (e) { return false; } });
      check(`[${name}] quiz warning matches what was actually stored`, /NOT saved/.test(quiz) === !stored, "stored=" + stored + " | " + quiz);
    } else {
      check(`[${name}] quiz ${working ? "does not warn" : "says the result is NOT saved"}`, /NOT saved/.test(quiz) === !working, quiz);
    }
    await completeWorkSample(page); await page.click("#finishLesson");
    const step = await page.$eval(".step-panel.is-active", (x) => x.getAttribute("data-tab")), msg = await page.textContent("#finishStatus");
    if (name === "writes fail mid-session") {
      const stored = await page.evaluate(() => { try { const v = JSON.parse(localStorage.getItem("pva-smm-ft-v2") || "{}"); return !!(v.lessons && v.lessons["1"]); } catch (e) { return false; } });
      check(`[${name}] Done shown only if completion really was stored`, (step === "Done") === stored && (stored || /NOT recorded as complete/.test(msg)), "step=" + step + " stored=" + stored);
    } else if (working) {
      check(`[${name}] finish shows Done and says saved`, step === "Done" && /progress saved/.test(msg), msg);
    } else {
      check(`[${name}] finish does NOT show Done`, step === "Apply", "step=" + step);
      check(`[${name}] finish says completion is NOT recorded, with next steps`, /NOT recorded as complete/.test(msg) && /Download a backup/.test(msg) && (await page.isVisible("#finishStatus")), msg);
      check(`[${name}] storage notice visible after finish`, await page.isVisible("#storageNotice"));
      const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#storageBackup")]);
      const backup = JSON.parse(require("fs").readFileSync(await dl.path(), "utf8"));
      check(`[${name}] in-page backup contains this session's work`, backup.format === "pva-progress-backup" && Array.isArray(backup.state.drafts["lesson-1:workflowRows"]) && !!backup.state.lessons["1"]);
    }
    check(`[${name}] no page errors`, errors.length === 0, errors.join(" | "));
    await ctx.close();
  }
  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed` : "\nall storage checks passed"); process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
