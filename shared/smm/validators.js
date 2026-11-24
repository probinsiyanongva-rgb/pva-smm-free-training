/* PVA SMM validators — completion-only rules; unimplemented lessons fail safe. */
(function(root){"use strict";
// Known placeholders, rejected only when they are the entire (trimmed, case-insensitive) value.
const PLACEHOLDERS=["n/a","na","-",".","x","?","test","asdf","tbd","todo","lorem ipsum","..."];
const NONE_ANSWERS=["n/a","na","none"];
function filled(v,opt){const t=String(v==null?"":v).trim().toLowerCase();if(!t)return false;
  if(opt&&opt.allowNone&&NONE_ANSWERS.includes(t))return true;return!PLACEHOLDERS.includes(t);}
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
"l02-ws":()=>({ok:false,missing:["Lesson 2 validator not implemented"]}),
"l03-ws":()=>({ok:false,missing:["Lesson 3 validator not implemented"]}),
"l04-ws":()=>({ok:false,missing:["Lesson 4 validator not implemented"]}),
"l05-ws":()=>({ok:false,missing:["Lesson 5 validator not implemented"]}),
"l06-ws":()=>({ok:false,missing:["Lesson 6 validator not implemented"]}),
"l07-ws":()=>({ok:false,missing:["Lesson 7 validator not implemented"]}),
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
