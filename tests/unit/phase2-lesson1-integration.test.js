// Phase 2: Lesson 1 quiz + work sample against the REAL PVA Core store (not a fake).
const test = require("node:test"), assert = require("node:assert/strict");
const Core = require("../../shared/pva-core/progress-core.js"), manifest = require("../../shared/smm/manifest.js"),
  rules = require("../../shared/smm/validators.js"), Quiz = require("../../shared/smm/quiz.js"),
  pool = require("../../shared/smm/quizzes/lesson-1.js");

function storage(seed = {}) { const d = new Map(Object.entries(seed)); return { getItem: (k) => (d.has(k) ? d.get(k) : null), setItem: (k, v) => d.set(k, String(v)), removeItem: (k) => d.delete(k), dump: d }; }
function open(s) { return Core.create({ storageKey: "pva-smm-ft-v2", courseId: manifest.courseId, manifest, rules, legacy: { key: "pva-smm-ft-progress" }, storage: s }); }
function quizFor(store) { return Quiz.create({ pool, store, requirementId: "l01-quiz", historyKey: "lesson-1:quiz-history", questionsPerAttempt: 10, passMark: manifest.passMark }); }
function answers(set, nCorrect) { return set.map((q, i) => (i < nCorrect ? q.options.findIndex((o) => o.correct) : q.options.findIndex((o) => !o.correct))); }
const goodRows = Array.from({ length: 8 }, (_, i) => ["Task " + i, "Skill " + i, "Input " + i, i ? "Client sign-off" : "N/A", ["Within SOP", "Needs Approval", "Escalate"][i % 3]]);

test("7/10 does not pass the requirement; 8/10 does; it persists across reloads", () => {
  const s = storage(); let store = open(s), q = quizFor(store);
  let r = q.submit(answers(q.start(), 7));
  assert.equal(r.passed, false); assert.equal(store.requirementStatus("l01-quiz").passed, false);
  r = q.submit(answers(q.start(), 8));
  assert.equal(r.passed, true); assert.equal(store.requirementStatus("l01-quiz").passed, true);
  store = open(s); // reload
  assert.equal(store.requirementStatus("l01-quiz").passed, true);
  assert.deepEqual(store.getDraft("lesson-1:quiz-history", null), { best: 8, last: 8, attempts: 2 });
});

test("a later failing attempt keeps the pass and the best score (unlimited retries)", () => {
  const s = storage(); const store = open(s), q = quizFor(store);
  q.submit(answers(q.start(), 9));
  for (let i = 0; i < 5; i++) q.submit(answers(q.start(), 3));
  assert.equal(store.requirementStatus("l01-quiz").passed, true);
  const h = open(s).getDraft("lesson-1:quiz-history", null);
  assert.equal(h.best, 9); assert.equal(h.last, 3); assert.equal(h.attempts, 6);
});

test("a submitted attempt is closed; retry requires a new draw", () => {
  const store = open(storage()), q = quizFor(store), set = q.start();
  q.submit(answers(set, 2));
  assert.throws(() => q.submit(answers(set, 10)), /already been submitted/);
  assert.equal(store.requirementStatus("l01-quiz").passed, false);
  const r = q.submit(answers(q.start(), 10));
  assert.equal(r.passed, true);
});

test("review gives an explanation and the correct option for every question", () => {
  const q = quizFor(open(storage())), set = q.start(), r = q.submit(answers(set, 0));
  assert.equal(r.review.length, 10);
  r.review.forEach((x, i) => { assert.ok(x.explanation); assert.equal(x.correctAnswer, set[i].options.find((o) => o.correct).text); });
});

test("history key is configurable, so the engine is not tied to Lesson 1", () => {
  const store = open(storage()), q = Quiz.create({ pool, store, requirementId: "l01-quiz" });
  q.submit(answers(q.start(), 8));
  assert.equal(store.getDraft("l01-quiz:history", null).best, 8);
});

test("completion is blocked unless BOTH the work sample and the quiz pass", () => {
  const s = storage(); let store = open(s), q = quizFor(store);
  // neither
  assert.equal(store.markLessonComplete(1).ok, false);
  // work sample only
  store.recordAttempt("l01-ws", { answer: goodRows });
  assert.equal(store.requirementStatus("l01-ws").passed, true);
  assert.equal(store.markLessonComplete(1).ok, false);
  // quiz only (fresh store)
  const s2 = storage(), store2 = open(s2), q2 = quizFor(store2);
  q2.submit(answers(q2.start(), 8));
  store2.recordAttempt("l01-ws", { answer: goodRows.slice(0, 7) });
  assert.equal(store2.markLessonComplete(1).ok, false);
  // both
  q.submit(answers(q.start(), 8));
  const done = store.markLessonComplete(1);
  assert.equal(done.ok, true); assert.equal(done.saved, true);
  store = open(s);
  assert.equal(store.evaluate().lessons[0].complete, true);
});

test("editing the work sample into an incomplete state un-passes the requirement", () => {
  const store = open(storage());
  store.recordAttempt("l01-ws", { answer: goodRows });
  assert.equal(store.requirementStatus("l01-ws").passed, true);
  store.recordAttempt("l01-ws", { answer: goodRows.map((r, i) => (i === 3 ? [r[0], "", r[2], r[3], r[4]] : r)) });
  assert.equal(store.requirementStatus("l01-ws").passed, false);
});

test("l01-ws: completion-only rule (blank, placeholders, classification, rows; allowNone; no model-answer check)", () => {
  const ws = rules["l01-ws"];
  assert.equal(ws(goodRows).ok, true);
  assert.deepEqual(ws(goodRows.slice(0, 7)).missing, ["Add at least 8 task rows"]);
  ["", "   ", "n/a", "TBD", "test", "asdf", "-", "..."].forEach((v) => {
    assert.ok(ws(goodRows.map((r, i) => (i ? r : [v, r[1], r[2], r[3], r[4]]))).missing.includes("Row 1: task"), "task " + JSON.stringify(v));
  });
  ["N/A", "none", "None"].forEach((v) => assert.equal(ws(goodRows.map((r) => [r[0], r[1], r[2], v, r[4]])).ok, true, "approval point " + v));
  assert.ok(ws(goodRows.map((r, i) => (i ? r : [r[0], r[1], r[2], r[3], ""]))).missing.includes("Row 1: classification"));
  assert.ok(ws(goodRows.map((r, i) => (i ? r : [r[0], r[1], r[2], r[3], "Maybe"]))).missing.includes("Row 1: classification"));
  // the provided starter/example row is accepted once its fields are filled
  const starter = ["Schedule approved posts for the week", "Accuracy and attention to detail", "Approved content list, publish dates/times", "No — already approved", "Within SOP"];
  assert.equal(ws([starter].concat(goodRows.slice(1))).ok, true);
  // a short but real answer is accepted
  assert.equal(ws(goodRows.map((r) => ["Post", "Care", "Brief", "Yes", r[4]])).ok, true);
});

test("legacy v1 drafts are carried into v2 with unchanged field ids; v1 key untouched", () => {
  const raw = JSON.stringify({ "lesson-1": { lastStep: 4, complete: true, drafts: { observeNotes: "o", policyNotes: "p", boundaryResponse: "b", workflowRows: [["a", "b", "c", "d"]] } } });
  const s = storage({ "pva-smm-ft-progress": raw }), store = open(s);
  ["observeNotes", "policyNotes", "boundaryResponse"].forEach((k) => assert.ok(store.getDraft("lesson-1:" + k, null)));
  assert.deepEqual(store.getDraft("lesson-1:workflowRows", null), [["a", "b", "c", "d"]]);
  assert.equal(store.evaluate().lessons[0].complete, false); // v1 completion never counts
  assert.equal(s.getItem("pva-smm-ft-progress"), raw);
  // v1 rows (4 columns) do not pass l01-ws until classified
  assert.equal(rules["l01-ws"](store.getDraft("lesson-1:workflowRows")).ok, false);
});

test("backup carries Lesson 1 drafts, quiz history and requirement records", () => {
  const a = open(storage()), q = quizFor(a);
  a.saveDraft("lesson-1:observeNotes", "typed in 2.0"); q.submit(answers(q.start(), 8)); a.recordAttempt("l01-ws", { answer: goodRows });
  const b = open(storage()); assert.equal(b.restoreBackup(a.exportBackup(), { confirmed: true }).ok, true);
  assert.equal(b.getDraft("lesson-1:observeNotes"), "typed in 2.0");
  assert.equal(b.getDraft("lesson-1:quiz-history", null).best, 8);
  assert.equal(b.requirementStatus("l01-quiz").passed, true);
  assert.equal(b.requirementStatus("l01-ws").passed, true);
});
