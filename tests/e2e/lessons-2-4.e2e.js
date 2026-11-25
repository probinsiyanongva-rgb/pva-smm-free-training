// Browser test, Phase 3 Batch A (Lessons 2-4): pending-quiz state, completion guards, v1 import,
// v2-only writes, reload restore, a simulated quiz release (stand-in pool, test-only), and blocked storage.
// Usage: node tests/e2e/lessons-2-4.e2e.js <baseUrl serving dist/> <path-to-dist>
let pw; try { pw = require('playwright'); } catch (e) { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); }
const { chromium } = pw;
const fs = require('fs');
const base = process.argv[2], site = process.argv[3];
const pool1 = require(site + '/shared/smm/quizzes/lesson-1.js');
let pass = 0, fail = 0;
function check(name, ok, extra) { if (ok) pass++; else fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || !extra ? '' : ' :: ' + extra)); }

const fills = {
  2: async (p) => {
    for (const id of ['brOffer', 'brEvidence']) await p.fill('#' + id, 'Learner answer for ' + id);
    await p.fill('#brQuestions', '1. Which platform matters most?\n2. Who approves posts?\n3. May we reuse customer photos?');
  },
  3: async (p) => {
    for (const id of ['ssObjective', 'ssPriorities', 'ssPrimaryMetric', 'ssSecondaryMetrics', 'ssAssumption']) await p.fill('#' + id, 'Learner ' + id);
    const rows = await p.$$('#indicatorRows tr');
    for (let i = 0; i < 2; i++) { const t = await rows[i].$$('textarea'); await t[0].fill('Goal ' + i); await t[1].fill('Indicator ' + i); await t[2].fill('Limit ' + i); }
  },
  4: async (p) => {
    const rows = await p.$$('#matrixRows tr');
    for (let i = 0; i < 12; i++) {
      const inp = await rows[i].$$('input');
      await inp[0].fill('Idea ' + i); await inp[1].fill('Pillar ' + (i % 5)); await inp[2].fill('Format ' + (i % 4)); await inp[3].fill(i % 2 ? 'Instagram' : 'Facebook');
      await (await rows[i].$('select')).selectOption(i % 3 ? 'Adapt' : 'Copy exact');
      await (await rows[i].$('textarea')).fill('Reason ' + i);
    }
  }
};

async function goStep(p, k) {
  // Real navigation: click each step's primary "Continue" button from the current step.
  for (let guard = 0; guard < 10; guard++) {
    const cur = await p.$eval('.step-panel.is-active', (e) => Number(e.dataset.step));
    if (cur === k) return;
    const sel = cur < k ? `.step-panel.is-active [data-goto="${cur + 1}"]` : `.step-panel.is-active [data-goto="${cur - 1}"]`;
    await p.click(sel);
  }
  throw new Error('could not reach step ' + k);
}
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome' });
  for (const n of [2, 3, 4]) {
    const url = base + '/lesson-' + n + '/';
    // ---------- A: pending quiz (as shipped) ----------
    let ctx = await browser.newContext(), p = await ctx.newPage(), errors = [];
    p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL_CONNECTION_FAILED')) errors.push(m.text()); });
    await p.goto(url);
    check(`L${n} loads without errors`, errors.length === 0, errors.join(' | '));
    check(`L${n} has 8 step chips incl. Knowledge Check`, (await p.$$eval('#stepNav .step-chip', (x) => x.map((c) => c.textContent))).join('|') === '1. Start|2. Learn|3. Observe|4. Practice|5. Check|6. Knowledge Check|7. Apply|8. Done');
    check(`L${n} storage notice hidden in normal browser`, await p.$eval('#storageNotice', (e) => e.hidden));
    await goStep(p, 5);
    check(`L${n} quiz shows pending message, start hidden`, (await p.textContent('#quizStatus')).includes('still in content review') && await p.$eval('#startQuiz', (e) => e.hidden));
    // go to Apply
    await goStep(p, 6);
    if (n === 2) await p.fill('#brOffer', '');
    await p.click('#finishLesson');
    let st = await p.textContent('#finishStatus');
    check(`L${n} incomplete -> refused, names work-sample gaps`, st.startsWith('Not complete yet. Work sample:'), st);
    check(`L${n} incomplete -> not on Done`, !(await p.$eval('[data-step="7"]', (e) => e.classList.contains('is-active'))));
    await fills[n](p);
    await p.click('#finishLesson');
    st = await p.textContent('#finishStatus');
    check(`L${n} complete sample + pending quiz -> only quiz blocks`, st === 'Not complete yet. Knowledge check: not available yet (still in content review).', st);
    await p.click('#buildExport');
    const exp = await p.textContent('#exportBox');
    check(`L${n} export generated`, exp.length > 100 && exp.includes('Amihan Kitchen'));
    const ls = await p.evaluate(() => ({ v1: localStorage.getItem('pva-smm-ft-progress'), v2: localStorage.getItem('pva-smm-ft-v2') }));
    check(`L${n} v1 key never written`, ls.v1 === null, ls.v1);
    check(`L${n} drafts stored in v2 under lesson-${n}:`, ls.v2 && ls.v2.includes('"lesson-' + n + ':'));
    // reload restores
    await p.reload();
    if (n === 2) check('L2 reload restores brQuestions', (await p.inputValue('#brQuestions')).includes('Who approves posts?'));
    if (n === 3) check('L3 reload restores indicator rows', (await p.$$eval('#indicatorRows textarea', (x) => x.map((t) => t.value))).join(',') === 'Goal 0,Indicator 0,Limit 0,Goal 1,Indicator 1,Limit 1');
    if (n === 4) check('L4 reload restores selects + rationale', (await p.$$eval('#matrixRows tr', (rs) => rs.slice(0, 3).map((r) => r.querySelector('select').value + '/' + r.querySelector('textarea').value))).join(',') === 'Copy exact/Reason 0,Adapt/Reason 1,Adapt/Reason 2');
    check(`L${n} reload resumes at Apply (step 7 chip current)`, (await p.textContent('#stepNav .is-current')) === '7. Apply');
    if (n === 3) {
      await p.click('#addIndicatorRow');
      const c = await p.$$eval('#indicatorRows tr', (x) => x.length);
      check('L3 indicator rows capped at 3', c === 3 && await p.$eval('#addIndicatorRow', (b) => b.disabled));
    }
    await ctx.close();

    // ---------- B: legacy v1 drafts are imported and v1 is left untouched ----------
    const v1 = { 'lesson-2': { lastStep: 5, drafts: { brOffer: 'V1 OFFER', brQuestions: 'v1 q1?\nv1 q2?\nv1 q3?' } },
                 'lesson-3': { lastStep: 3, drafts: { ssObjective: 'V1 OBJ', scnCafe_obj: 'Traffic' } },
                 'lesson-4': { lastStep: 5, drafts: { matrixRows: [['V1 idea', 'Pillar', 'Carousel', 'Instagram', 'adapt it']] } } };
    ctx = await browser.newContext(); p = await ctx.newPage(); errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await ctx.addInitScript((v) => { if (!localStorage.getItem('pva-smm-ft-progress')) localStorage.setItem('pva-smm-ft-progress', v); }, JSON.stringify(v1));
    await p.goto(url);
    const before = JSON.stringify(v1);
    if (n === 2) check('L2 v1 brOffer imported', (await p.inputValue('#brOffer')) === 'V1 OFFER');
    if (n === 3) check('L3 v1 ssObjective imported', (await p.inputValue('#ssObjective')) === 'V1 OBJ');
    if (n === 4) {
      const r = await p.$eval('#matrixRows tr', (tr) => [tr.querySelector('input').value, tr.querySelector('select').value, tr.querySelector('select').selectedOptions[0].textContent]);
      check('L4 v1 free-text adapt answer kept visible, not lost', r[0] === 'V1 idea' && r[1] === 'adapt it' && r[2].includes('Earlier answer: adapt it'), JSON.stringify(r));
    }
    await goStep(p, 6);
    await p.click('#finishLesson');
    const after = await p.evaluate(() => localStorage.getItem('pva-smm-ft-progress'));
    check(`L${n} v1 key byte-identical after use`, after === before);
    check(`L${n} legacy page no errors`, errors.length === 0, errors.join(' | '));
    await ctx.close();

    // ---------- C: simulated release (pool + manifest rule enabled) ----------
    ctx = await browser.newContext(); p = await ctx.newPage(); errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    const manifestSrc = fs.readFileSync(site + '/shared/smm/manifest.js', 'utf8').replace('rule:n===1?undefined:"quiz-pending"', 'rule:n<=4?undefined:"quiz-pending"');
    await p.route('**/shared/smm/manifest.js', (r) => r.fulfill({ contentType: 'application/javascript', body: manifestSrc }));
    const poolSrc = fs.readFileSync(site + '/shared/smm/quizzes/lesson-1.js', 'utf8').replace(/PVASMMQuizLesson1/g, 'PVASMMQuizLesson' + n);
    await p.route('**/shared/smm/quiz.js', async (r) => { const body = fs.readFileSync(site + '/shared/smm/quiz.js', 'utf8') + '\n' + poolSrc; r.fulfill({ contentType: 'application/javascript', body }); });
    await p.goto(url);
    const correct = new Map(pool1.map((q) => [q.prompt, q.options.find((o) => o.correct).text]));
    async function attempt(k) {
      await goStep(p, 5);
      await p.click('#startQuiz');
      const fs_ = await p.$$('#lessonQuiz fieldset');
      for (let i = 0; i < fs_.length; i++) {
        const prompt = (await (await fs_[i].$('legend')).textContent()).replace(/^\d+\.\s/, '');
        const labels = await fs_[i].$$('label');
        for (const lb of labels) { const t = (await lb.textContent()).trim(); if ((t === correct.get(prompt)) === (i < k)) { await (await lb.$('input')).check(); break; } }
      }
      await p.click('#lessonQuiz .btn-primary');
      return p.textContent('#quizStatus');
    }
    let s7 = await attempt(7);
    check(`L${n} [release sim] 7/10 does not pass`, s7.startsWith('Score: 7/10') && s7.includes('need at least 8/10'), s7);
    await goStep(p, 6);
    await fills[n](p);
    await p.click('#finishLesson');
    st = await p.textContent('#finishStatus');
    check(`L${n} [release sim] complete sample + 7/10 -> refused`, st === 'Not complete yet. Knowledge check: pass with at least 8/10.', st);
    let s8 = await attempt(8);
    check(`L${n} [release sim] 8/10 passes`, s8.includes('Knowledge check passed.'), s8);
    await goStep(p, 6);
    await p.click('#finishLesson');
    check(`L${n} [release sim] both pass -> Done`, await p.$eval('[data-step="7"]', (e) => e.classList.contains('is-active')), await p.textContent('#finishStatus'));
    check(`L${n} [release sim] no page errors`, errors.length === 0, errors.join(' | '));
    await ctx.close();

    // ---------- D: storage blocked ----------
    ctx = await browser.newContext(); p = await ctx.newPage(); errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await ctx.addInitScript(() => { const f = () => { throw new DOMException('blocked', 'SecurityError'); }; Storage.prototype.setItem = f; });
    await p.goto(url);
    check(`L${n} storage blocked -> notice shown`, !(await p.$eval('#storageNotice', (e) => e.hidden)));
    check(`L${n} storage blocked -> no page errors`, errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
