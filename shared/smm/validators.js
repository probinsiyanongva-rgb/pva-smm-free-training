/* PVA SMM validators — completion-only rules; unimplemented lessons fail safe. */
(function(root){"use strict";
// Known placeholders, rejected only when they are the entire (trimmed, case-insensitive) value.
const PLACEHOLDERS=["n/a","na","-",".","x","?","test","asdf","tbd","todo","lorem ipsum","..."];
const NONE_ANSWERS=["n/a","na","none"];
function filled(v,opt){const t=String(v==null?"":v).trim().toLowerCase();if(!t)return false;
  if(opt&&opt.allowNone&&NONE_ANSWERS.includes(t))return true;return!PLACEHOLDERS.includes(t);}
// One entry per non-blank line, with leading bullets/numbering removed; placeholder lines are not counted.
function lines(v){return String(v==null?"":v).split(/\r?\n/).map(s=>s.replace(/^\s*(?:[-*\u2022]|\d+[.)])\s*/,"").trim()).filter(s=>filled(s));}
const WORKFLOW=["Idea","Briefed","Draft","Internal Review","Client Approval","Approved","Scheduled","Published","Reviewed"];
const HOOK_TYPES=["Problem","Question","Benefit","Observation","Story","Curiosity"];
const OBJECTIVES=["Awareness","Engagement","Traffic","Leads","Conversion","Retention"];
const rules=Object.freeze({
"l01-ws":(a)=>{
  // Completion-only checks (approved validator specification): required fields present,
  // not blank, not a known placeholder; a classification chosen; at least 8 rows.
  // Approval point allows "None"/"N/A" as a real answer. Never compares to model answers.
  const r=Array.isArray(a)?a:[],m=[];
  if(r.length<8)m.push("Add at least 8 task rows");
  r.forEach((x,i)=>{x=Array.isArray(x)?x:[];const row="Row "+(i+1)+": ";
    if(!filled(x[0]))m.push(row+"task");
    if(!filled(x[1]))m.push(row+"skill");
    if(!filled(x[2]))m.push(row+"evidence / input");
    if(!filled(x[3],{allowNone:true}))m.push(row+"approval point");
    if(!["Within SOP","Needs Approval","Escalate"].includes(String(x[4]||"").trim()))m.push(row+"classification");});
  return{ok:m.length===0,missing:m};},
"l02-ws":(a)=>{
  // Brand & Audience Brief: all 9 fields filled; Open questions holds 3-5 questions (one per line).
  const o=a&&typeof a==="object"?a:{},m=[];
  [["brBusiness","Business"],["brOffer","Offer"],["brAudience","Audience"],["brGoals","Goals"],["brVoice","Brand voice"],
   ["brPlatforms","Platforms"],["brConstraints","Content constraints"],["brQuestions","Open questions for the client"],
   ["brEvidence","Evidence notes"]].forEach(([k,l])=>{if(!filled(o[k]))m.push(l);});
  if(filled(o.brQuestions)){const q=lines(o.brQuestions);
    if(q.length<3)m.push("Open questions: write at least 3 clarifying questions, one per line");
    else if(q.length>5)m.push("Open questions: keep it to the 3-5 most important questions");}
  return{ok:m.length===0,missing:m};},
"l03-ws":(a)=>{
  // Strategy Snapshot: all 9 fields filled, plus 2-3 complete goal -> indicator -> limitation rows.
  const o=a&&typeof a==="object"?a:{},m=[];
  [["ssGoal","Business goal"],["ssObjective","Social objective"],["ssAudience","Audience"],["ssPlatforms","Priority platforms"],
   ["ssPriorities","Content priorities"],["ssCTA","CTA direction"],["ssPrimaryMetric","Primary metric"],
   ["ssSecondaryMetrics","Secondary metrics"],["ssAssumption","One assumption requiring confirmation"]].forEach(([k,l])=>{if(!filled(o[k]))m.push(l);});
  const r=(Array.isArray(o.indicatorRows)?o.indicatorRows:[]).map(x=>Array.isArray(x)?x:[]).filter(x=>x.some(v=>String(v==null?"":v).trim()));
  if(r.length<2)m.push("Add at least 2 goal \u2192 indicator rows");
  if(r.length>3)m.push("Keep to 2-3 goal \u2192 indicator rows");
  r.forEach((x,i)=>{const row="Indicator row "+(i+1)+": ";
    if(!filled(x[0]))m.push(row+"goal");if(!filled(x[1]))m.push(row+"indicator");if(!filled(x[2]))m.push(row+"limitation");});
  return{ok:m.length===0,missing:m};},
"l04-ws":(a)=>{
  // Pillar & Platform Matrix: at least 12 complete idea rows covering 5 pillars, 4 formats, 2 platforms;
  // each row says Adapt or Copy exact and gives a brief rationale.
  const r=Array.isArray(a)?a.map(x=>Array.isArray(x)?x:[]):[],m=[];
  if(r.length<12)m.push("Add at least 12 example ideas");
  r.forEach((x,i)=>{const row="Row "+(i+1)+": ";
    if(!filled(x[0]))m.push(row+"example idea");if(!filled(x[1]))m.push(row+"pillar");
    if(!filled(x[2]))m.push(row+"format");if(!filled(x[3]))m.push(row+"platform");
    if(!["Adapt","Copy exact"].includes(String(x[4]||"").trim()))m.push(row+"choose Adapt or Copy exact");
    if(!filled(x[5]))m.push(row+"rationale");});
  const n=(j)=>new Set(r.map(x=>String(x[j]==null?"":x[j]).trim().toLowerCase()).filter(v=>v&&!PLACEHOLDERS.includes(v))).size;
  if(n(1)<5)m.push("Use at least 5 different pillars");
  if(n(2)<4)m.push("Use at least 4 different formats");
  if(n(3)<2)m.push("Use at least 2 different platforms");
  return{ok:m.length===0,missing:m};},
"l05-ws":(a)=>{
  // Four-Week Calendar + production tracker: at least 12 rows; each has week/date, platform, pillar,
  // topic & hook, format, a workflow status, an owner and a due date. CTA and notes are optional.
  // Row layout: [date, platform, pillar, topic, format, cta, status, notes, owner, due].
  const r=Array.isArray(a)?a.map(x=>Array.isArray(x)?x:[]):[],m=[];
  if(r.length<12)m.push("Add at least 12 calendar rows");
  r.forEach((x,i)=>{const row="Row "+(i+1)+": ";
    [[0,"date / week"],[1,"platform"],[2,"pillar"],[3,"topic & hook"],[4,"format"]].forEach(([j,l])=>{if(!filled(x[j]))m.push(row+l);});
    if(!WORKFLOW.includes(String(x[6]||"").trim()))m.push(row+"choose a status");
    if(!filled(x[8]))m.push(row+"owner");
    if(!filled(x[9]))m.push(row+"due date");});
  return{ok:m.length===0,missing:m};},
"l06-ws":(a)=>{
  // Copywriting Pack: 10+ hooks with a hook type, 5 polished captions, 8+ CTAs with an objective,
  // and at least 3 search keywords or phrases (one per line).
  const o=a&&typeof a==="object"?a:{},m=[];
  const hooks=(Array.isArray(o.hooksRows)?o.hooksRows:[]).map(x=>Array.isArray(x)?x:[]);
  const ctas=(Array.isArray(o.ctaRows)?o.ctaRows:[]).map(x=>Array.isArray(x)?x:[]);
  if(hooks.length<10)m.push("Add at least 10 hooks");
  hooks.forEach((x,i)=>{if(!filled(x[0]))m.push("Hook "+(i+1)+": hook");
    if(!HOOK_TYPES.includes(String(x[1]||"").trim()))m.push("Hook "+(i+1)+": choose a hook type");});
  const c=o.captions&&typeof o.captions==="object"?o.captions:{};
  [["capEdu","Educational"],["capProduct","Product-value"],["capCommunity","Community question"],["capBTS","Behind-the-scenes story"],["capVideo","Short-form video caption"]]
    .forEach(([k,l])=>{if(!filled(c[k]))m.push("Caption: "+l);});
  if(ctas.length<8)m.push("Add at least 8 CTA options");
  ctas.forEach((x,i)=>{if(!filled(x[0]))m.push("CTA "+(i+1)+": CTA");
    if(!OBJECTIVES.includes(String(x[1]||"").trim()))m.push("CTA "+(i+1)+": choose an objective");});
  if(lines(o.seoKeywords).length<3)m.push("Search keywords: add at least 3, one per line");
  return{ok:m.length===0,missing:m};},
"l07-ws":(a)=>{
  // Basic Content Set: 5 pieces, each with its concept, an accessibility note and an asset-source note.
  const o=a&&typeof a==="object"?a:{},m=[];
  [["csVisual1","Visual post 1"],["csVisual2","Visual post 2"],["csCarousel","Carousel concept"],["csVideo1","Video storyboard 1"],["csVideo2","Video storyboard 2"]]
    .forEach(([k,l])=>{if(!filled(o[k]))m.push(l+": concept");if(!filled(o[k+"Access"]))m.push(l+": accessibility check");
      if(!filled(o[k+"Source"]))m.push(l+": asset source");});
  return{ok:m.length===0,missing:m};},
"l08-ws":()=>({ok:false,missing:["Lesson 8 validator not implemented"]}),
"l09-ws":()=>({ok:false,missing:["Lesson 9 validator not implemented"]}),
"l10-ws":()=>({ok:false,missing:["Lesson 10 validator not implemented"]}),
"l11-ws":()=>({ok:false,missing:["Lesson 11 validator not implemented"]}),
"l12-ws":()=>({ok:false,missing:["Lesson 12 validator not implemented"]}),
"l13-ws":()=>({ok:false,missing:["Lesson 13 validator not implemented"]}),
"quiz-pending":()=>({ok:false,missing:["Knowledge check not implemented"]}),
...Object.fromEntries(Array.from({length:12},(_,i)=>["fp-t"+(i+1),()=>({ok:false,missing:["Final Project stage validator not implemented"]})])),
...Object.fromEntries(Array.from({length:8},(_,i)=>["fp-scenario-"+(i+1),()=>({ok:false,missing:["Final Project scenario validator not implemented"]})]))
});
if(typeof module==="object"&&module.exports)module.exports=rules;else root.PVASMMValidators=rules;
})(typeof globalThis!=="undefined"?globalThis:this);
