/* PVA SMM validators — Phase 1 fail-safe stubs. */
(function(root){"use strict";
const rules=Object.freeze({
"l01-ws":(a)=>{const r=Array.isArray(a)?a:[],m=[];if(r.length<8)m.push("Add at least 8 task rows");r.forEach((x,i)=>{if(!String(x[0]||"").trim())m.push("Row "+(i+1)+": task");if(!String(x[1]||"").trim())m.push("Row "+(i+1)+": skill");if(!String(x[2]||"").trim())m.push("Row "+(i+1)+": evidence / input");if(!String(x[3]||"").trim())m.push("Row "+(i+1)+": approval point");if(!["Within SOP","Needs Approval","Escalate"].includes(String(x[4]||"").trim()))m.push("Row "+(i+1)+": classification");});return{ok:m.length===0,missing:m};},
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
