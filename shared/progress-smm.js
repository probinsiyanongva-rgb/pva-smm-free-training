/* =========================================================================
   PVA Free Training — Social Media Management VA
   Progress tracking module (window.PVASMM)

   Deliberately isolated from the General Administrative VA and Customer
   Support VA pathways' progress code: its own localStorage key and its
   own namespace, so nothing here can affect the already-live courses.

   No accounts, no backend. Progress lives entirely in the learner's
   browser via localStorage. Learner-facing behavior (what "complete"
   means, how progress is shown) matches the established PVA Free
   Training experience.
   ========================================================================= */

(function (window) {
  "use strict";

  var STORAGE_KEY = "pva-smm-ft-progress";

  // Canonical lesson list for this pathway. `built` flags let the hub
  // page render not-yet-built lessons as non-clickable "Coming soon"
  // cards, the same technique used on the General Admin and Customer
  // Support hubs, so the site can be deployed safely before the full
  // course is finished.
  var LESSONS = [
    { id: "lesson-1", num: 1, title: "What Does an SMM VA Actually Do?", sample: "SMM Task & Workflow Map", built: true },
    { id: "lesson-2", num: 2, title: "Understand the Client, Brand & Audience", sample: "Brand & Audience Brief", built: true },
    { id: "lesson-3", num: 3, title: "Social Media Strategy Fundamentals", sample: "Social Media Strategy Snapshot", built: true },
    { id: "lesson-4", num: 4, title: "Content Pillars, Formats & Platform Fit", sample: "Content Pillar & Format Matrix", built: true },
    { id: "lesson-5", num: 5, title: "Build a Social Media Content Calendar", sample: "Four-Week Content Calendar", built: true },
    { id: "lesson-6", num: 6, title: "Captions, Hooks & Calls-to-Action", sample: "Hook, Caption & CTA Pack", built: true },
    { id: "lesson-7", num: 7, title: "Visual Content & Canva for SMM VAs", sample: "Basic SMM Content Set", built: true },
    { id: "lesson-8", num: 8, title: "Scheduling, Publishing & Approval Workflow", sample: "Publishing & Approval Plan", built: true },
    { id: "lesson-9", num: 9, title: "Community Management, Engagement & Social Listening", sample: "Community & Listening Pack", built: true },
    { id: "lesson-10", num: 10, title: "Comments, DMs, Reputation & Escalation", sample: "Response & Escalation Pack", built: true },
    { id: "lesson-11", num: 11, title: "Social Media Analytics & Reporting", sample: "Monthly Social Media Performance Report", built: true },
    { id: "lesson-12", num: 12, title: "AI-Assisted Social Media Work", sample: "AI-Assisted SMM Workflow", built: true },
    { id: "lesson-13", num: 13, title: "Quality Control, Security, Rights & Client Workflow", sample: "SMM QA, Security & Rights Checklist", built: true },
    { id: "final-project", num: "F", title: "Final Project — One Month at Amihan Kitchen", sample: "Final Simulated Brand Project", built: true, isFinal: true }
  ];

  function readState() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function writeState(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      return false;
    }
  }

  function markLessonComplete(lessonId) {
    var state = readState();
    if (!state[lessonId]) state[lessonId] = {};
    state[lessonId].complete = true;
    state[lessonId].completedAt = new Date().toISOString();
    writeState(state);
  }

  function isLessonComplete(lessonId) {
    var state = readState();
    return !!(state[lessonId] && state[lessonId].complete);
  }

  // Step-level progress within a lesson, used so a learner who leaves
  // mid-lesson can be nudged back to roughly where they left off.
  function saveStepProgress(lessonId, stepIndex) {
    var state = readState();
    if (!state[lessonId]) state[lessonId] = {};
    state[lessonId].lastStep = stepIndex;
    writeState(state);
  }

  function getStepProgress(lessonId) {
    var state = readState();
    return state[lessonId] && typeof state[lessonId].lastStep === "number"
      ? state[lessonId].lastStep
      : 0;
  }

  // Free-text learner input (exercise answers, work-sample builders) is
  // saved locally only so a refresh doesn't lose it — never sent
  // anywhere, and not treated as an official saved record. The site
  // always tells learners to keep their own copy of finished work.
  function saveDraft(lessonId, key, value) {
    var state = readState();
    if (!state[lessonId]) state[lessonId] = {};
    if (!state[lessonId].drafts) state[lessonId].drafts = {};
    state[lessonId].drafts[key] = value;
    writeState(state);
  }

  function getDraft(lessonId, key, fallback) {
    var state = readState();
    var val = state[lessonId] && state[lessonId].drafts && state[lessonId].drafts[key];
    return val === undefined ? fallback : val;
  }

  function getLessons() {
    return LESSONS.slice();
  }

  function getCourseProgress() {
    var state = readState();
    var builtLessons = LESSONS.filter(function (l) { return l.built; });
    var completedCount = builtLessons.filter(function (l) {
      return state[l.id] && state[l.id].complete;
    }).length;
    return {
      completed: completedCount,
      totalBuilt: builtLessons.length,
      totalPlanned: LESSONS.length,
      percent: builtLessons.length ? Math.round((completedCount / builtLessons.length) * 100) : 0
    };
  }

  function resetProgress() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (e) {
      return false;
    }
  }

  window.PVASMM = {
    LESSONS: LESSONS,
    markLessonComplete: markLessonComplete,
    isLessonComplete: isLessonComplete,
    saveStepProgress: saveStepProgress,
    getStepProgress: getStepProgress,
    saveDraft: saveDraft,
    getDraft: getDraft,
    getLessons: getLessons,
    getCourseProgress: getCourseProgress,
    resetProgress: resetProgress
  };
})(window);
