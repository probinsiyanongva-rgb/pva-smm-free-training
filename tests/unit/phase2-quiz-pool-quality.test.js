// Guards the approved Lesson 1 pool against mechanical answer giveaways (baseline §7.2).
// Thresholds from the approved revision proposal (Nov 24, 2026).
const test = require("node:test"), assert = require("node:assert/strict");
const pool = require("../../shared/smm/quizzes/lesson-1.js");
const correctOf = (q) => q.options.find((o) => o.correct);

test("structure: 15 items, unique ids, 4 options, exactly one correct, no duplicate or blank options", () => {
  assert.equal(pool.length, 15);
  assert.equal(new Set(pool.map((q) => q.id)).size, 15);
  for (const q of pool) {
    assert.equal(q.options.length, 4, q.id);
    assert.equal(q.options.filter((o) => o.correct === true).length, 1, q.id);
    assert.equal(new Set(q.options.map((o) => o.text.trim().toLowerCase())).size, 4, q.id);
    assert.ok(q.options.every((o) => o.text.trim().length > 0) && q.prompt.trim() && q.explanation.trim(), q.id);
  }
});

test("fixed coverage questions and outcome-tag mix are unchanged", () => {
  assert.deepEqual(pool.filter((q) => q.fixed).map((q) => q.id + ":" + q.tag), ["q01:workflow", "q02:judgment", "q03:security", "q04:authority"]);
  const tags = {}; pool.forEach((q) => { tags[q.tag] = (tags[q.tag] || 0) + 1; });
  assert.deepEqual(tags, { workflow: 5, judgment: 2, security: 3, authority: 3, "customer-care": 2 });
});

test("answer length does not reveal the correct option", () => {
  let longest = 0; const ratios = [];
  for (const q of pool) {
    const lens = q.options.map((o) => o.text.length), c = correctOf(q).text.length;
    if (c === Math.max(...lens)) longest++;
    const others = lens.filter((_, i) => !q.options[i].correct);
    ratios.push(c / (others.reduce((a, b) => a + b, 0) / others.length));
  }
  const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
  assert.ok(longest <= 6, `correct option is the longest in ${longest}/15 questions (limit 6)`);
  assert.ok(mean <= 1.15, `mean correct/other length ratio ${mean.toFixed(2)} (limit 1.15)`);
});

test("scenarios use only products confirmed in the Amihan Kitchen brief", () => {
  assert.ok(!/tablea/i.test(JSON.stringify(pool)));
});
