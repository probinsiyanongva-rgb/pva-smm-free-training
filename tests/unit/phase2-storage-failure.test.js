// Storage failure: the store must fall back to memory and every result must say saved:false.
const test = require("node:test"), assert = require("node:assert/strict");
const Core = require("../../shared/pva-core/progress-core.js"), manifest = require("../../shared/smm/manifest.js"),
  rules = require("../../shared/smm/validators.js"), Quiz = require("../../shared/smm/quiz.js"), pool = require("../../shared/smm/quizzes/lesson-1.js");

const open = (storage) => Core.create({ storageKey: "pva-smm-ft-v2", courseId: manifest.courseId, manifest, rules, legacy: { key: "pva-smm-ft-progress" }, storage });
const answers = (set, n) => set.map((q, i) => (i < n ? q.options.findIndex((o) => o.correct) : q.options.findIndex((o) => !o.correct)));
const rows = Array.from({ length: 8 }, (_, i) => ["Task " + i, "Skill", "Input", "N/A", "Escalate"]);
function memoryMap() { const m = new Map(); return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }; }

const failures = {
  "no storage available": () => null,
  "storage access throws (blocked)": () => ({ getItem() { throw new Error("SecurityError"); }, setItem() { throw new Error("SecurityError"); } }),
  "every write throws (quota / private mode)": () => ({ getItem: () => null, setItem() { throw new Error("QuotaExceededError"); } }),
  "write accepted but not kept (read-back mismatch)": () => ({ getItem: () => null, setItem() {} }),
};

for (const [name, make] of Object.entries(failures)) {
  test("storage failure — " + name + ": nothing reports saved, store is memory-only", () => {
    const store = open(make()), events = [];
    store.on("storage-unavailable", (d) => events.push(d.reason));
    assert.equal(store.isPersistent(), false);
    assert.equal(store.storageMode(), "memory");
    assert.ok(events.length >= 1, "late subscribers are told storage is unavailable");
    assert.equal(store.saveDraft("lesson-1:observeNotes", "typed"), false);
    const q = Quiz.create({ pool, store, requirementId: "l01-quiz", historyKey: "lesson-1:quiz-history" });
    const r = q.submit(answers(q.start(), 8));
    assert.equal(r.passed, true); assert.equal(r.saved, false, "quiz result must not claim it was saved");
    assert.equal(store.recordAttempt("l01-ws", { answer: rows }).saved, false);
    const done = store.markLessonComplete(1);
    assert.equal(done.ok, true); assert.equal(done.saved, false, "completion must be reported as not persisted");
    // the in-memory session still holds the work, so a backup can be downloaded from this page
    const backup = JSON.parse(store.exportBackup());
    assert.equal(backup.state.drafts["lesson-1:observeNotes"], "typed");
    assert.ok(backup.state.lessons["1"]);
    // restore is refused rather than pretending to succeed
    assert.equal(open(make()).restoreBackup(store.exportBackup(), { confirmed: true }).ok, false);
  });
}

test("write fails mid-session: switches to memory once, emits one event, later results say saved:false", () => {
  const base = memoryMap(); let writes = 0;
  const s = { getItem: base.getItem, setItem: (k, v) => { if (++writes > 3) throw new Error("QuotaExceededError"); base.setItem(k, v); } };
  const store = open(s), events = []; store.on("storage-unavailable", (d) => events.push(d.reason));
  assert.equal(store.saveDraft("lesson-1:observeNotes", "first"), true); // still persistent
  assert.equal(events.length, 0);
  const q = Quiz.create({ pool, store, requirementId: "l01-quiz", historyKey: "lesson-1:quiz-history" });
  let r = q.submit(answers(q.start(), 8));
  assert.equal(r.saved, false); assert.equal(store.isPersistent(), false);
  assert.deepEqual(events, ["write-error"]);
  r = q.submit(answers(q.start(), 9));
  assert.equal(r.saved, false); assert.equal(events.length, 1, "no repeated events");
  assert.equal(store.markLessonComplete(1).saved, false);
  // what reached storage before the failure is intact, and is the last good state
  const reopened = open({ getItem: base.getItem, setItem: base.setItem });
  assert.equal(reopened.getDraft("lesson-1:observeNotes"), "first");
  assert.equal(reopened.evaluate().lessons[0].complete, false, "completion was never persisted");
});

test("normal storage: quiz and completion report saved:true", () => {
  const store = open(memoryMap()), q = Quiz.create({ pool, store, requirementId: "l01-quiz", historyKey: "lesson-1:quiz-history" });
  assert.equal(q.submit(answers(q.start(), 8)).saved, true);
  store.recordAttempt("l01-ws", { answer: rows });
  assert.deepEqual(store.markLessonComplete(1), { ok: true, saved: true });
});
