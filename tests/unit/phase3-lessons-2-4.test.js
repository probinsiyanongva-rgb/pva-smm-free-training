// Phase 3 Batch A: Lessons 2-4 on the locked Lesson 1 pattern.
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const Core = require("../../shared/pva-core/progress-core.js"), manifest = require("../../shared/smm/manifest.js"),
  rules = require("../../shared/smm/validators.js");
const root = path.join(__dirname, "..", "..");
const page = (n) => fs.readFileSync(path.join(root, "lesson-" + n, "index.html"), "utf8");
function storage(seed = {}) { const d = new Map(Object.entries(seed)); return { getItem: (k) => (d.has(k) ? d.get(k) : null), setItem: (k, v) => d.set(k, String(v)), removeItem: (k) => d.delete(k), dump: d }; }
function open(s, m = manifest) { return Core.create({ storageKey: "pva-smm-ft-v2", courseId: m.courseId, manifest: m, rules, legacy: { key: "pva-smm-ft-progress" }, storage: s }); }

const brief = { brBusiness: "b", brOffer: "o", brAudience: "a", brGoals: "g", brVoice: "v", brPlatforms: "p", brConstraints: "c",
  brQuestions: "1. Which platform matters most?\n- Who approves posts?\nMay we reuse customer photos?", brEvidence: "e" };
const snapshot = { ssGoal: "g", ssObjective: "o", ssAudience: "a", ssPlatforms: "p", ssPriorities: "pr", ssCTA: "c", ssPrimaryMetric: "m",
  ssSecondaryMetrics: "s", ssAssumption: "as", indicatorRows: [["Awareness", "Reach", "Not who saw it"], ["Interest", "Clicks", "Not purchases"]] };
const matrix = Array.from({ length: 12 }, (_, i) => ["Idea " + i, "Pillar " + (i % 5), "Format " + (i % 4), i % 2 ? "Instagram" : "Facebook", i % 3 ? "Adapt" : "Copy exact", "Because " + i]);

// ---------- Work-sample rules: completion-only ----------
test("l02-ws accepts a complete brief with 3-5 questions; rejects blanks, placeholders and wrong question counts", () => {
  assert.equal(rules["l02-ws"](brief).ok, true);
  assert.equal(rules["l02-ws"]({ ...brief, brQuestions: "q1?\nq2?\nq3?\nq4?\nq5?" }).ok, true);
  assert.deepEqual(rules["l02-ws"]({ ...brief, brOffer: "  " }).missing, ["Offer"]);
  assert.deepEqual(rules["l02-ws"]({ ...brief, brEvidence: "TBD" }).missing, ["Evidence notes"]);
  assert.match(rules["l02-ws"]({ ...brief, brQuestions: "q1?\nq2?\n\n  \nn/a" }).missing[0], /at least 3/);
  assert.match(rules["l02-ws"]({ ...brief, brQuestions: "1\n2\n3\n4\n5\n6" }).missing[0], /3-5/);
  assert.equal(rules["l02-ws"](null).ok, false);
  assert.equal(rules["l02-ws"]({}).missing.length, 9);
});

test("l03-ws needs all 9 snapshot fields and 2-3 complete goal -> indicator -> limitation rows", () => {
  assert.equal(rules["l03-ws"](snapshot).ok, true);
  assert.equal(rules["l03-ws"]({ ...snapshot, indicatorRows: snapshot.indicatorRows.concat([["Community", "Comments", "A few voices"]]) }).ok, true);
  assert.match(rules["l03-ws"]({ ...snapshot, indicatorRows: [snapshot.indicatorRows[0], ["", "", ""]] }).missing.join(), /at least 2/);
  assert.deepEqual(rules["l03-ws"]({ ...snapshot, indicatorRows: [snapshot.indicatorRows[0], ["Interest", "Clicks", " "]] }).missing, ["Indicator row 2: limitation"]);
  assert.match(rules["l03-ws"]({ ...snapshot, indicatorRows: Array(4).fill(["a", "b", "c"]) }).missing.join(), /2-3/);
  assert.deepEqual(rules["l03-ws"]({ ...snapshot, ssAssumption: "?" }).missing, ["One assumption requiring confirmation"]);
});

test("l04-ws needs 12 complete rows covering 5 pillars, 4 formats, 2 platforms, with Adapt/Copy exact and a rationale", () => {
  assert.equal(rules["l04-ws"](matrix).ok, true);
  assert.match(rules["l04-ws"](matrix.slice(0, 11)).missing[0], /at least 12/);
  assert.deepEqual(rules["l04-ws"](matrix.map((r, i) => (i === 3 ? [...r.slice(0, 5), ""] : r))).missing, ["Row 4: rationale"]);
  assert.deepEqual(rules["l04-ws"](matrix.map((r, i) => (i === 0 ? [...r.slice(0, 4), "adapt it", r[5]] : r))).missing, ["Row 1: choose Adapt or Copy exact"]);
  const one = matrix.map((r) => [r[0], "Same", "Same", "Same", "Adapt", "why"]);
  assert.deepEqual(rules["l04-ws"](one).missing, ["Use at least 5 different pillars", "Use at least 4 different formats", "Use at least 2 different platforms"]);
  // distinct counts ignore case and surrounding spaces
  const cased = matrix.map((r, i) => [r[0], i % 2 ? " pillar 0 " : "PILLAR 0", r[2], r[3], r[4], r[5]]);
  assert.match(rules["l04-ws"](cased).missing.join(), /5 different pillars/);
});

test("rules never compare to model answers: unusual but complete answers pass", () => {
  const odd = { ...brief }; Object.keys(odd).forEach((k) => (odd[k] = k === "brQuestions" ? "Pwede po bang malaman?\nAno ang tono?\nSino ang mag-aapruba?" : "Sariling sagot"));
  assert.equal(rules["l02-ws"](odd).ok, true);
  assert.equal(rules["l03-ws"]({ ...snapshot, ssObjective: "Something nobody would write" }).ok, true);
});

// ---------- Completion against the real store ----------
test("Lessons 2-4 need BOTH the work sample and a passed (8/10) quiz", () => {
  const store = open(storage());
  [["l02-ws", brief, 2], ["l03-ws", snapshot, 3], ["l04-ws", matrix, 4]].forEach(([id, ans, n]) => {
    const quizId = "l0" + n + "-quiz";
    assert.equal(store.markLessonComplete(n).ok, false, "nothing done");
    store.recordAttempt(id, { answer: ans });
    assert.equal(store.requirementStatus(id).passed, true);
    assert.equal(store.markLessonComplete(n).ok, false, "work sample only");
    // The quiz engine records { passed } using the 80% pass mark (engine thresholds are tested below and in Phase 2).
    store.recordAttempt(quizId, { passed: false, answer: { score: 7 } });
    assert.equal(store.markLessonComplete(n).ok, false, "7/10");
    store.recordAttempt(quizId, { passed: true, answer: { score: 8 } });
    assert.equal(store.markLessonComplete(n).ok, true, "both");
  });
  const s2 = open(storage());
  s2.recordAttempt("l03-quiz", { passed: true, answer: { score: 10 } });
  s2.recordAttempt("l03-ws", { answer: { ...snapshot, indicatorRows: [snapshot.indicatorRows[0]] } });
  assert.equal(s2.markLessonComplete(3).ok, false, "quiz only, incomplete work sample");
});

test("the real Lesson 2-4 pools: 7/10 fails, 8/10 passes, best score kept, through the quiz engine", () => {
  const Quiz = require("../../shared/smm/quiz.js");
  for (const n of [2, 3, 4]) {
    const pool = require("../../shared/smm/quizzes/lesson-" + n + ".js"), s = storage(), store = open(s);
    const q = Quiz.create({ pool, store, requirementId: "l0" + n + "-quiz", historyKey: "lesson-" + n + ":quiz-history", questionsPerAttempt: 10, passMark: manifest.passMark });
    const ans = (set, k) => set.map((x, i) => (i < k ? x.options.findIndex((o) => o.correct) : x.options.findIndex((o) => !o.correct)));
    assert.equal(q.submit(ans(q.start(), 7)).passed, false);
    assert.equal(store.requirementStatus("l0" + n + "-quiz").passed, false);
    assert.equal(q.submit(ans(q.start(), 8)).passed, true);
    q.submit(ans(q.start(), 2));
    assert.equal(open(s).requirementStatus("l0" + n + "-quiz").passed, true);
    assert.equal(open(s).getDraft("lesson-" + n + ":quiz-history", null).best, 8);
  }
});

test("v1 drafts for Lessons 2-4 are imported under lesson-N:<fieldId> and the v1 key is not rewritten", () => {
  const v1 = JSON.stringify({ "lesson-2": { drafts: { brOffer: "V1 OFFER" } }, "lesson-3": { drafts: { ssGoal: "V1 GOAL" } }, "lesson-4": { drafts: { matrixRows: [["a", "b", "c", "d", "Adapt"]] } } });
  const s = storage({ "pva-smm-ft-progress": v1 }), store = open(s);
  store.saveDraft("lesson-2:brOffer", "edited");
  assert.equal(s.getItem("pva-smm-ft-progress"), v1);
  assert.equal(open(s).getDraft("lesson-2:brOffer", null), "edited");
});

// ---------- Page structure (locked pattern) ----------
const contract = {
  2: ["observeNotes", "apSituation", "apProblem", "apMotivation", "apQuestions", "apValue", "apAction", "assumptionAudit",
      "brBusiness", "brOffer", "brAudience", "brGoals", "brVoice", "brPlatforms", "brConstraints", "brQuestions", "brEvidence"],
  3: ["observeNotes", "rewriteResponse", "scnCafe", "scnNonprofit", "scnStore", "_obj", "_metrics",
      "ssGoal", "ssObjective", "ssAudience", "ssPlatforms", "ssPriorities", "ssCTA", "ssPrimaryMetric", "ssSecondaryMetrics", "ssAssumption"],
  4: ["obsFb", "obsCarousel", "obsVideo", "pillarPracticeRows", "trendResponse", "matrixRows"]
};
for (const n of [2, 3, 4]) {
  test(`Lesson ${n}: v1 field ids preserved; v2 store only; 8 steps with Knowledge Check before Apply`, () => {
    const t = page(n);
    contract[n].forEach((id) => assert.ok(t.includes('"' + id) || t.includes(id + '"'), "missing field id " + id));
    assert.ok(!t.includes("progress-smm.js"), "must not load the v1 progress script");
    assert.ok(!/setItem\(\s*["']pva-smm-ft-progress/.test(t), "must never write the v1 key");
    assert.ok(t.includes('storageKey: "pva-smm-ft-v2"'));
    const steps = [...t.matchAll(/class="step-panel[^"]*" data-tab="([^"]+)" data-step="(\d+)"/g)].map((m) => m[2] + ":" + m[1]);
    assert.deepEqual(steps, ["0:Start here", "1:Learn", "2:Observe", "3:Practice", "4:Check", "5:Knowledge Check", "6:Apply", "7:Done"]);
    [...t.matchAll(/data-goto="(\d+)"/g)].forEach((m) => assert.ok(Number(m[1]) <= 7));
    assert.ok(t.includes('id="storageNotice"') && t.includes('id="storageBackup"') && t.includes('id="finishStatus"'));
    assert.ok(t.includes("Check requirements and finish Lesson " + n));
    assert.ok(!t.includes("This site does not store your written work"), "stale save message");
    assert.ok(t.includes('<script src="../shared/smm/quizzes/lesson-' + n + '.js"></script>'), "approved quiz pool must load");
    assert.ok(t.includes("<title>Lesson " + n + ": " + manifest.lessons[n - 1].title.replace(/&/g, "&amp;") + " |"));
  });
}

test("the shared lesson runtime is identical in Lessons 2-7 (no drift)", () => {
  const part = (t, name) => { const a = t.indexOf("// ==== PVA lesson runtime (shared pattern, locked in Phase 2) — part " + name + ": begin"), b = t.indexOf("// ==== PVA lesson runtime — part " + name + ": end");
    assert.ok(a > 0 && b > a, "runtime part " + name + " markers"); return t.slice(a, b); };
  for (const name of ["A", "B"]) { const ref = part(page(2), name); [3, 4, 5, 6, 7].forEach((n) => assert.equal(part(page(n), name), ref, `Lesson ${n} runtime part ${name} drifted`)); }
});

test("quiz requirements: Lessons 1-4 active (approved pools present); Lessons 5-13 stay fail-safe", () => {
  manifest.lessons.forEach((l) => {
    const rule = l.requirements.find((r) => r.type === "quiz").rule;
    assert.equal(rule, l.n <= 4 ? undefined : "quiz-pending", "lesson " + l.n);
    assert.equal(fs.existsSync(path.join(root, "shared/smm/quizzes/lesson-" + l.n + ".js")), l.n <= 4, "pool file for lesson " + l.n);
  });
});

test("Lesson 2 teaches caption language as a preference to confirm (assessed by L2-Q10)", () => {
  assert.ok(page(2).includes("Language is a common example. Amihan's brief doesn't say whether captions should be in English, Tagalog, or a mix, so treat it as a preference to confirm with the client, not something to decide yourself."));
});

test("Lesson 4 no longer carries the undated, unattributed platform-trend claim", () => {
  const t = page(4);
  assert.ok(!t.includes("Current platform guidance continues to emphasize"));
  assert.ok(t.includes("note the date you checked"));
});
