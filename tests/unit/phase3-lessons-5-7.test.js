// Phase 3 Batch B: Lessons 5-7 on the locked Lesson 1 pattern.
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("node:fs"), path = require("node:path");
const Core = require("../../shared/pva-core/progress-core.js"), manifest = require("../../shared/smm/manifest.js"),
  rules = require("../../shared/smm/validators.js");
const root = path.join(__dirname, "..", "..");
const page = (n) => fs.readFileSync(path.join(root, "lesson-" + n, "index.html"), "utf8");
function storage(seed = {}) { const d = new Map(Object.entries(seed)); return { getItem: (k) => (d.has(k) ? d.get(k) : null), setItem: (k, v) => d.set(k, String(v)), removeItem: (k) => d.delete(k) }; }
function open(s) { return Core.create({ storageKey: "pva-smm-ft-v2", courseId: manifest.courseId, manifest, rules, legacy: { key: "pva-smm-ft-progress" }, storage: s }); }

const calendar = Array.from({ length: 12 }, (_, i) => ["Week " + (1 + (i % 4)), i % 2 ? "Instagram" : "Facebook", "Pillar " + i, "Topic " + i, "Carousel", "", "Draft", "", "VA", "Mon wk " + (1 + (i % 4))]);
const pack = { hooksRows: Array.from({ length: 10 }, (_, i) => ["Hook " + i, ["Problem", "Question", "Benefit", "Observation", "Story", "Curiosity"][i % 6]]),
  captions: { capEdu: "a", capProduct: "b", capCommunity: "c", capBTS: "d", capVideo: "e" },
  ctaRows: Array.from({ length: 8 }, (_, i) => ["CTA " + i, ["Awareness", "Engagement", "Traffic", "Leads", "Conversion", "Retention"][i % 6]]),
  seoKeywords: "Filipino pantry gift box\n- how to store pantry staples\n3. regional Filipino food" };
const set = {}; ["csVisual1", "csVisual2", "csCarousel", "csVideo1", "csVideo2"].forEach((k) => { set[k] = "Concept " + k; set[k + "Access"] = "Alt text planned"; set[k + "Source"] = "Client-provided photo"; });

test("l05-ws: 12 rows with status, owner and due date; CTA and notes optional", () => {
  assert.equal(rules["l05-ws"](calendar).ok, true);
  assert.match(rules["l05-ws"](calendar.slice(0, 11)).missing[0], /at least 12/);
  assert.deepEqual(rules["l05-ws"](calendar.map((r, i) => (i === 2 ? [...r.slice(0, 8), "", r[9]] : r))).missing, ["Row 3: owner"]);
  assert.deepEqual(rules["l05-ws"](calendar.map((r, i) => (i === 0 ? [...r.slice(0, 9), "tbd"] : r))).missing, ["Row 1: due date"]);
  assert.deepEqual(rules["l05-ws"](calendar.map((r, i) => (i === 4 ? [...r.slice(0, 6), "Waiting", ...r.slice(7)] : r))).missing, ["Row 5: choose a status"]);
  // v1 rows (8 columns, no owner/due) are kept but must be completed
  assert.match(rules["l05-ws"](calendar.map((r) => r.slice(0, 8))).missing.join(), /owner.*due date/);
});

test("l06-ws: 10 typed hooks, 5 captions, 8 CTAs with objectives, 3+ keywords", () => {
  assert.equal(rules["l06-ws"](pack).ok, true);
  assert.match(rules["l06-ws"]({ ...pack, hooksRows: pack.hooksRows.slice(0, 9) }).missing[0], /at least 10 hooks/);
  assert.deepEqual(rules["l06-ws"]({ ...pack, hooksRows: pack.hooksRows.map((h, i) => (i === 3 ? [h[0], "Funny"] : h)) }).missing, ["Hook 4: choose a hook type"]);
  assert.deepEqual(rules["l06-ws"]({ ...pack, captions: { ...pack.captions, capBTS: " " } }).missing, ["Caption: Behind-the-scenes story"]);
  assert.deepEqual(rules["l06-ws"]({ ...pack, ctaRows: pack.ctaRows.map((c, i) => (i === 7 ? [c[0], ""] : c)) }).missing, ["CTA 8: choose an objective"]);
  assert.deepEqual(rules["l06-ws"]({ ...pack, seoKeywords: "one\ntwo\n\nn/a" }).missing, ["Search keywords: add at least 3, one per line"]);
});

test("l07-ws: 5 pieces, each with concept, accessibility check and asset source", () => {
  assert.equal(rules["l07-ws"](set).ok, true);
  assert.deepEqual(rules["l07-ws"]({ ...set, csCarouselAccess: "" }).missing, ["Carousel concept: accessibility check"]);
  assert.deepEqual(rules["l07-ws"]({ ...set, csVideo1Source: "?" }).missing, ["Video storyboard 1: asset source"]);
  assert.equal(rules["l07-ws"]({}).missing.length, 15);
});

test("Lessons 5-7 cannot be completed while their quiz pools are still in review", () => {
  const store = open(storage());
  [["l05-ws", calendar, 5], ["l06-ws", pack, 6], ["l07-ws", set, 7]].forEach(([id, ans, n]) => {
    store.recordAttempt(id, { answer: ans });
    assert.equal(store.requirementStatus(id).passed, true);
    assert.equal(store.requirementStatus("l0" + n + "-quiz").passed, false);
    assert.equal(store.markLessonComplete(n).ok, false);
  });
});

const contract = {
  5: ["observeNotes", "practiceCalRows", "calendarRows", "weeklyChecklist"],
  6: ["observeNotes", "capEdu", "capProduct", "capCommunity", "capBTS", "capVideo", "polished_", "evidenceAudit", "hooksRows", "ctaRows"],
  7: ["observeNotes", "pracStatic1", "pracStatic2", "pracVideo1", "pracVideo2", "accessChecklist", "accessibilityGaps", "csVisual1", "csVisual2", "csCarousel", "csVideo1", "csVideo2"]
};
for (const n of [5, 6, 7]) {
  test(`Lesson ${n}: v1 field ids preserved; v2 store only; 8 steps; quiz pool not loaded yet`, () => {
    const t = page(n);
    contract[n].forEach((id) => assert.ok(t.includes('"' + id), "missing field id " + id));
    assert.ok(!t.includes("progress-smm.js"));
    assert.ok(!/setItem\(\s*["']pva-smm-ft-progress/.test(t));
    const steps = [...t.matchAll(/class="step-panel[^"]*" data-tab="([^"]+)" data-step="(\d+)"/g)].map((m) => m[2] + ":" + m[1]);
    assert.deepEqual(steps, ["0:Start here", "1:Learn", "2:Observe", "3:Practice", "4:Check", "5:Knowledge Check", "6:Apply", "7:Done"]);
    [...t.matchAll(/data-goto="(\d+)"/g)].forEach((m) => assert.ok(Number(m[1]) <= 7));
    assert.ok(t.includes('id="storageNotice"') && t.includes('id="finishStatus"') && t.includes("Check requirements and finish Lesson " + n));
    assert.ok(!t.includes("This site does not store your written work"));
    assert.ok(!t.includes("quizzes/lesson-" + n + ".js\"></script>"), "pool must not load before approval");
    assert.ok(t.includes("<title>Lesson " + n + ": " + manifest.lessons[n - 1].title.replace(/&/g, "&amp;") + " |"));
  });
}

test("Lesson 5 keeps the calendar column order the Final Project reads (0-6), owner and due appended", () => {
  const t = page(5);
  assert.ok(t.includes("[date, platform, pillar, topic, format, cta, status, notes, owner, due]"));
  assert.ok(t.includes('data-col="8"') && t.includes('data-col="9"'));
});

test("Lesson 6 teaches social search keywords; Lesson 7 is tool-neutral with WCAG and asset sources", () => {
  assert.ok(page(6).includes("6.4 Social SEO") && page(6).includes('id="seoKeywords"'));
  const t = page(7);
  assert.ok(!t.includes("Canva currently provides"));
  assert.ok(t.includes("https://www.w3.org/WAI/standards-guidelines/wcag/") && t.includes("7.4 Know where every asset comes from"));
});
