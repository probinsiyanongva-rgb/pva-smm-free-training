/* PVA SMM Course 2.0 — fail-safe manifest skeleton.
   Phase 1 structure only. Completion rules remain unavailable until implemented and tested. */
(function(root){"use strict";
const titles=[
"SMM VA Role, Responsibilities & Boundaries","Client Discovery, Brand, Audience & Research",
"Social Media Strategy & Performance Objectives","Content Strategy, Pillars & Platform Fit",
"Content Calendars & Production Planning","Social Copywriting, Hooks, CTAs & Social SEO",
"Visual Content, Short-Form Video & Accessibility","Scheduling, Publishing & Approval Management",
"Community Management & Social Listening","Customer Care, Moderation & Reputation Escalation",
"Analytics, Reporting & Performance Improvement","AI-Assisted Social Media Management",
"Quality Assurance, Security, Copyright & Client Operations"];
const lessons=titles.map((title,i)=>{const n=i+1,nn=String(n).padStart(2,"0");return{n,title,href:"/lesson-"+n+"/",requirements:[
{id:"l"+nn+"-ws",type:"work-sample",rule:"l"+nn+"-ws"},
{id:"l"+nn+"-quiz",type:"quiz",questions:10,pool:"lesson-"+n,rule:"quiz-pending"}]};});
const finalRequirements=Array.from({length:12},(_,i)=>({id:"fp-t"+(i+1),type:"capstone-stage",rule:"fp-t"+(i+1)}));
const manifest=Object.freeze({courseId:"smm-foundations",version:"2.0.0",passMark:0.8,lessons,
finalProject:{href:"/final-project/",completeId:"fp-complete",requirements:finalRequirements},
certificate:{requiresAck:true,requiresName:true,referenceCode:false}});
if(typeof module==="object"&&module.exports)module.exports=manifest;else root.PVASMMManifest=manifest;
})(typeof globalThis!=="undefined"?globalThis:this);
