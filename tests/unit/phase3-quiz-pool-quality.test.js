// Guards the approved Lesson 2-4 pools (Revision 4, approved Nov 25, 2026) against mechanical giveaways
// and draw imbalance. Same thresholds as the approved Lesson 1 revision.
const test = require("node:test"), assert = require("node:assert/strict");
const Quiz = require("../../shared/smm/quiz.js");
const spec = {
  2: { fixed: ["q01:brief", "q02:audience", "q03:questions", "q04:confidentiality"], tags: ["brief", "audience", "questions", "confidentiality", "brand-rules"] },
  3: { fixed: ["q01:objectives", "q02:metrics", "q03:limits", "q04:strategy"], tags: ["objectives", "metrics", "limits", "strategy", "interpretation"] },
  4: { fixed: ["q01:pillars", "q02:platform-fit", "q03:trends", "q04:capacity"], tags: ["pillars", "platform-fit", "trends", "capacity", "formats"] }
};
const fakeStore = { recordAttempt: () => ({ saved: true }), getDraft: (k, f) => f, saveDraft: () => true, requirementStatus: () => ({ passed: false }) };

for (const n of [2, 3, 4]) {
  const pool = require("../../shared/smm/quizzes/lesson-" + n + ".js");
  test(`Lesson ${n} pool: structure, fixed coverage questions, 3 questions per tag`, () => {
    assert.equal(pool.length, 15);
    assert.equal(new Set(pool.map((q) => q.id)).size, 15);
    for (const q of pool) {
      assert.equal(q.options.length, 4, q.id);
      assert.equal(q.options.filter((o) => o.correct === true).length, 1, q.id);
      assert.equal(new Set(q.options.map((o) => o.text.trim().toLowerCase())).size, 4, q.id);
      assert.ok(q.prompt.trim() && q.explanation.trim() && q.options.every((o) => o.text.trim()), q.id);
    }
    assert.deepEqual(pool.filter((q) => q.fixed).map((q) => q.id + ":" + q.tag), spec[n].fixed);
    const tags = {}; pool.forEach((q) => { tags[q.tag] = (tags[q.tag] || 0) + 1; });
    assert.deepEqual(Object.keys(tags).sort(), spec[n].tags.slice().sort());
    Object.values(tags).forEach((c) => assert.equal(c, 3));
  });
  test(`Lesson ${n} pool: answer length does not reveal the correct option`, () => {
    let longest = 0; const ratios = [];
    for (const q of pool) {
      const lens = q.options.map((o) => o.text.length), c = q.options.find((o) => o.correct).text.length;
      if (c === Math.max(...lens)) longest++;
      const others = lens.filter((_, i) => !q.options[i].correct);
      ratios.push(c / (others.reduce((a, b) => a + b, 0) / others.length));
    }
    const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    assert.ok(longest <= 6, `longest in ${longest}/15 (limit 6)`);
    assert.ok(mean <= 1.15, `mean ratio ${mean.toFixed(2)} (limit 1.15)`);
  });
  test(`Lesson ${n} pool: 1,000 draws are 10 questions, all 4 fixed, exactly 2 per tag`, () => {
    for (let i = 0; i < 1000; i++) {
      const set = Quiz.create({ pool, store: fakeStore, requirementId: "x", historyKey: "h", questionsPerAttempt: 10, passMark: 0.8 }).start();
      assert.equal(set.length, 10);
      const qs = set.map((x) => pool.find((q) => q.prompt === x.prompt)), counts = {};
      qs.forEach((q) => { counts[q.tag] = (counts[q.tag] || 0) + 1; });
      assert.ok(pool.filter((q) => q.fixed).every((f) => qs.includes(f)));
      assert.deepEqual(Object.values(counts), [2, 2, 2, 2, 2]);
    }
  });
  test(`Lesson ${n} pool: stays inside the brief and the approved scope`, () => {
    const s = JSON.stringify(pool);
    assert.ok(!/tablea|customer stor|nonprofit|3 to 4 times|qualified traffic/i.test(s));
  });
}
