// Browser test, Phase 3 Batch B (Lessons 5-7): quiz still in review, completion guards, v1 import,
// v2-only writes, reload restore, a simulated quiz release (stand-in pool, test-only), and blocked storage.
// Usage: node tests/e2e/lessons-5-7.e2e.js <baseUrl serving dist/> <path-to-dist>
let pw; try { pw = require('playwright'); } catch (e) { pw = require(process.env.PLAYWRIGHT_PATH || 'playwright'); }
const { chromium } = pw;
const fs = require('fs');
const base = process.argv[2], site = process.argv[3];
let pass = 0, fail = 0;
function check(name, ok, extra) { if (ok) pass++; else fail++; console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || !extra ? '' : ' :: ' + extra)); }
async function goStep(p, k) {
  for (let guard = 0; guard < 10; guard++) {
    const cur = await p.$eval('.step-panel.is-active', (e) => Number(e.dataset.step));
    if (cur === k) return;
    await p.click(cur < k ? `.step-panel.is-active [data-goto="${cur + 1}"]` : `.step-panel.is-active [data-goto="${cur - 1}"]`);
  }
  throw new Error('could not reach step ' + k);
}
const fills = {
  5: async (p) => {
    const rows = await p.$$('#calendarRows tr');
    for (let i = 0; i < 12; i++) {
      const v = async (c, val) => { const el = await rows[i].$('[data-col="' + c + '"]'); await el.fill(val); };
      await v(1, i % 2 ? 'Instagram' : 'Facebook'); await v(2, 'Pillar ' + (i % 5)); await v(3, 'Topic ' + i); await v(4, 'Carousel');
      await (await rows[i].$('select')).selectOption('Draft'); await v(8, 'VA'); await v(9, 'Mon wk ' + (1 + (i % 4)));
    }
  },
  6: async (p) => {
    const hooks = await p.$$('#hooksRows tr');
    for (let i = 0; i < 10; i++) { await (await hooks[i].$('input')).fill('Hook ' + i); await (await hooks[i].$('select')).selectOption('Question'); }
    for (const id of ['capEdu', 'capProduct', 'capCommunity', 'capBTS', 'capVideo']) await p.fill('#polished-' + id, 'Caption ' + id);
    const ctas = await p.$$('#ctaRows tr');
    for (let i = 0; i < 8; i++) { await (await ctas[i].$('input')).fill('CTA ' + i); await (await ctas[i].$('select')).selectOption('Engagement'); }
    await p.fill('#seoKeywords', 'Filipino pantry gift box\nhow to store pantry staples\nregional Filipino food');
  },
  7: async (p) => {
    for (const id of ['csVisual1', 'csVisual2', 'csCarousel', 'csVideo1', 'csVideo2']) {
      await p.fill('#' + id, 'Concept ' + id); await p.fill('#' + id + 'Access', 'Alt text planned'); await p.fill('#' + id + 'Source', 'Client-provided photo');
    }
  }
};
const restoreCheck = {
  5: async (p) => (await p.$eval('#calendarRows tr', (tr) => [tr.querySelector('[data-col="8"]').value, tr.querySelector('[data-col="9"]').value, tr.querySelector('select').value].join('/'))) === 'VA/Mon wk 1/Draft',
  6: async (p) => (await p.inputValue('#seoKeywords')).includes('regional Filipino food') && (await p.$eval('#hooksRows tr select', (s) => s.value)) === 'Question',
  7: async (p) => (await p.inputValue('#csVideo2Source')) === 'Client-provided photo'
};

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome' });
  for (const n of [5, 6, 7]) {
    const url = base + '/lesson-' + n + '/';
    // ---------- A: as shipped (pool in review) ----------
    let ctx = await browser.newContext(), p = await ctx.newPage(), errors = [];
    p.on('pageerror', (e) => errors.push(e.message)); p.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_TUNNEL_CONNECTION_FAILED')) errors.push(m.text()); });
    await p.goto(url);
    check(`L${n} loads without errors`, errors.length === 0, errors.join(' | '));
    check(`L${n} 8 step chips incl. Knowledge Check`, (await p.$$eval('#stepNav .step-chip', (x) => x.map((c) => c.textContent))).join('|') === '1. Start|2. Learn|3. Observe|4. Practice|5. Check|6. Knowledge Check|7. Apply|8. Done');
    await goStep(p, 5);
    check(`L${n} quiz shows in-review message, start hidden`, (await p.textContent('#quizStatus')).includes('still in content review') && await p.$eval('#startQuiz', (e) => e.hidden));
    await goStep(p, 6);
    await p.click('#finishLesson');
    let st = await p.textContent('#finishStatus');
    check(`L${n} incomplete -> refused, names work-sample gaps`, st.startsWith('Not complete yet. Work sample:'), st);
    await fills[n](p);
    await p.click('#finishLesson');
    st = await p.textContent('#finishStatus');
    check(`L${n} complete sample + quiz in review -> only quiz blocks`, st === 'Not complete yet. Knowledge check: not available yet (still in content review).', st);
    check(`L${n} not on Done`, !(await p.$eval('[data-step="7"]', (e) => e.classList.contains('is-active'))));
    await p.click('#buildExport');
    check(`L${n} export generated`, (await p.textContent('#exportBox')).includes('Amihan Kitchen'));
    const ls = await p.evaluate(() => ({ v1: localStorage.getItem('pva-smm-ft-progress'), v2: localStorage.getItem('pva-smm-ft-v2') }));
    check(`L${n} v1 key never written`, ls.v1 === null);
    check(`L${n} drafts in v2 under lesson-${n}:`, !!ls.v2 && ls.v2.includes('"lesson-' + n + ':'));
    await p.reload();
    check(`L${n} reload resumes at Apply`, (await p.textContent('#stepNav .is-current')) === '7. Apply');
    check(`L${n} reload restores new 2.0 fields`, await restoreCheck[n](p));
    await ctx.close();

    // ---------- B: v1 drafts imported, v1 key untouched ----------
    const v1 = { 'lesson-5': { lastStep: 5, drafts: { calendarRows: [['Week 1', 'Facebook', 'Food knowledge', 'V1 topic', 'Static post', 'Save this', 'draft', 'old note']] } },
                 'lesson-6': { lastStep: 5, drafts: { hooksRows: [['V1 hook', 'story']], ctaRows: [['V1 CTA', 'engagement-ish']], polished_capEdu: 'V1 polished' } },
                 'lesson-7': { lastStep: 5, drafts: { csVisual1: 'V1 visual' } } };
    ctx = await browser.newContext(); p = await ctx.newPage(); errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await ctx.addInitScript((v) => { if (!localStorage.getItem('pva-smm-ft-progress')) localStorage.setItem('pva-smm-ft-progress', v); }, JSON.stringify(v1));
    await p.goto(url);
    await goStep(p, 6);
    if (n === 5) {
      const r = await p.$eval('#calendarRows tr', (tr) => [tr.querySelector('[data-col="3"]').value, tr.querySelector('[data-col="5"]').value, tr.querySelector('[data-col="7"]').value, tr.querySelector('select').value, tr.querySelector('select').selectedOptions[0].textContent]);
      check('L5 v1 row imported; status "draft" maps to Draft; CTA and notes kept', r[0] === 'V1 topic' && r[1] === 'Save this' && r[2] === 'old note' && r[3] === 'Draft', JSON.stringify(r));
    }
    if (n === 6) {
      const h = await p.$eval('#hooksRows tr', (tr) => [tr.querySelector('input').value, tr.querySelector('select').value]);
      const c = await p.$eval('#ctaRows tr', (tr) => [tr.querySelector('select').value, tr.querySelector('select').selectedOptions[0].textContent]);
      check('L6 v1 hook imported, "story" maps to Story', h.join('/') === 'V1 hook/Story', h.join('/'));
      check('L6 v1 free-text objective kept visible, not lost', c[0] === 'engagement-ish' && c[1].includes('Earlier answer'), c.join('/'));
      check('L6 v1 polished caption imported', (await p.inputValue('#polished-capEdu')) === 'V1 polished');
    }
    if (n === 7) check('L7 v1 csVisual1 imported', (await p.inputValue('#csVisual1')) === 'V1 visual');
    await p.click('#finishLesson');
    check(`L${n} v1 key byte-identical after use`, (await p.evaluate(() => localStorage.getItem('pva-smm-ft-progress'))) === JSON.stringify(v1));
    if (n === 5) {
      const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('pva-smm-ft-v2')));
      const row = JSON.stringify(saved).includes('V1 topic');
      check('L5 Final Project columns 0-6 unchanged after save', row && JSON.stringify(saved).includes('"Week 1","Facebook","Food knowledge","V1 topic","Static post","Save this","Draft","old note"'));
    }
    check(`L${n} legacy page no errors`, errors.length === 0, errors.join(' | '));
    await ctx.close();

    // ---------- C: simulated release (stand-in pool, test-only) ----------
    ctx = await browser.newContext(); p = await ctx.newPage(); errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    const manifestSrc = fs.readFileSync(site + '/shared/smm/manifest.js', 'utf8').replace('rule:n<=4?undefined:"quiz-pending"', 'rule:n<=7?undefined:"quiz-pending"');
    await p.route('**/shared/smm/manifest.js', (r) => r.fulfill({ contentType: 'application/javascript', body: manifestSrc }));
    const pool1 = require(site + '/shared/smm/quizzes/lesson-1.js');
    const poolSrc = fs.readFileSync(site + '/shared/smm/quizzes/lesson-1.js', 'utf8').replace(/PVASMMQuizLesson1/g, 'PVASMMQuizLesson' + n);
    await p.route('**/shared/smm/quiz.js', (r) => r.fulfill({ contentType: 'application/javascript', body: fs.readFileSync(site + '/shared/smm/quiz.js', 'utf8') + '\n' + poolSrc }));
    await p.goto(url);
    const correct = new Map(pool1.map((q) => [q.prompt, q.options.find((o) => o.correct).text]));
    async function attempt(k) {
      await goStep(p, 5);
      await p.click('#startQuiz');
      const fsets = await p.$$('#lessonQuiz fieldset');
      for (let i = 0; i < fsets.length; i++) {
        const prompt = (await (await fsets[i].$('legend')).textContent()).replace(/^\d+\.\s/, '');
        for (const lb of await fsets[i].$$('label')) { const t = (await lb.textContent()).trim(); if ((t === correct.get(prompt)) === (i < k)) { await (await lb.$('input')).check(); break; } }
      }
      await p.click('#lessonQuiz .btn-primary');
      return p.textContent('#quizStatus');
    }
    check(`L${n} [release sim] 7/10 does not pass`, (await attempt(7)).includes('need at least 8/10'));
    await goStep(p, 6); await fills[n](p); await p.click('#finishLesson');
    check(`L${n} [release sim] sample + 7/10 refused`, (await p.textContent('#finishStatus')) === 'Not complete yet. Knowledge check: pass with at least 8/10.');
    check(`L${n} [release sim] 8/10 passes`, (await attempt(8)).includes('Knowledge check passed.'));
    await goStep(p, 6); await p.click('#finishLesson');
    check(`L${n} [release sim] both pass -> Done`, await p.$eval('[data-step="7"]', (e) => e.classList.contains('is-active')), await p.textContent('#finishStatus'));
    check(`L${n} [release sim] no page errors`, errors.length === 0, errors.join(' | '));
    await ctx.close();

    // ---------- D: storage blocked ----------
    ctx = await browser.newContext(); p = await ctx.newPage(); errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await ctx.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException('blocked', 'SecurityError'); }; });
    await p.goto(url);
    check(`L${n} storage blocked -> notice shown, no errors`, !(await p.$eval('#storageNotice', (e) => e.hidden)) && errors.length === 0, errors.join(' | '));
    await ctx.close();
  }
  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
