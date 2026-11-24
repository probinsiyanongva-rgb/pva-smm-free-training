/* PVA SMM Quiz Engine 1.1.0
   One engine for every lesson. Each attempt draws a fresh set: the fixed judgment
   questions plus a tag-balanced draw (every outcome tag at least once, none more
   than twice). A submitted attempt is closed: retrying always starts a new draw. */
(function (root) {
  "use strict";
  function shuffle(a) { const x = a.slice(); for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; }

  function create(cfg) {
    if (!cfg || !Array.isArray(cfg.pool) || !cfg.store || !cfg.requirementId) throw new Error("Quiz configuration incomplete");
    const n = cfg.questionsPerAttempt || 10, pass = cfg.passMark || 0.8, fixed = cfg.pool.filter((q) => q.fixed);
    const historyKey = cfg.historyKey || cfg.requirementId + ":history";
    if (cfg.pool.length < n || fixed.length > n) throw new Error("Invalid question pool");
    let active = [], submitted = false;

    function start() {
      const tags = Array.from(new Set(cfg.pool.map((q) => q.tag)));
      const chosen = fixed.slice(), counts = {};
      chosen.forEach((q) => { counts[q.tag] = (counts[q.tag] || 0) + 1; });
      const remaining = shuffle(cfg.pool.filter((q) => !q.fixed));
      for (const tag of tags) {
        if (chosen.some((q) => q.tag === tag)) continue;
        const next = remaining.findIndex((q) => q.tag === tag);
        if (next >= 0) { chosen.push(remaining.splice(next, 1)[0]); counts[tag] = (counts[tag] || 0) + 1; }
      }
      for (const item of remaining) {
        if (chosen.length >= n) break;
        if ((counts[item.tag] || 0) < 2) { chosen.push(item); counts[item.tag] = (counts[item.tag] || 0) + 1; }
      }
      if (chosen.length !== n) throw new Error("Question pool cannot satisfy coverage constraints");
      active = shuffle(chosen).map((q) => Object.assign({}, q, { options: shuffle(q.options) }));
      submitted = false;
      return active;
    }
    function current() { return active; }
    function isSubmitted() { return submitted; }
    function history() { return cfg.store.getDraft(historyKey, { best: 0, last: null, attempts: 0 }); }

    function submit(answers) {
      if (submitted) throw new Error("This attempt has already been submitted. Start a new attempt to retry.");
      if (active.length !== n || !Array.isArray(answers) || answers.length !== n ||
          answers.some((x, i) => !Number.isInteger(x) || x < 0 || x >= active[i].options.length)) {
        throw new Error("Answer every question before submitting");
      }
      let score = 0;
      const review = active.map((q, i) => {
        const correct = q.options[answers[i]].correct === true;
        if (correct) score++;
        const right = q.options.find((o) => o.correct === true);
        return { correct, explanation: q.explanation, correctAnswer: right ? right.text : "" };
      });
      submitted = true;
      const passed = score / n >= pass;
      const old = history();
      const next = { best: Math.max(Number(old.best) || 0, score), last: score, attempts: (Number(old.attempts) || 0) + 1 };
      cfg.store.saveDraft(historyKey, next);
      cfg.store.recordAttempt(cfg.requirementId, { passed: passed, answer: { score: score, attempts: next.attempts } });
      return { score, percent: Math.round((score / n) * 100), passed, best: next.best, attempts: next.attempts, review };
    }
    return { start, current, submit, isSubmitted, history };
  }

  const api = { create, VERSION: "1.1.0" };
  if (typeof module === "object" && module.exports) module.exports = api; else root.PVASMMQuiz = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
