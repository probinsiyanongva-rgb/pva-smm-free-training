/* PVA SMM Quiz Engine 1.0.0 */
(function(root){"use strict";
function shuffle(a){const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;}
function create(cfg){if(!cfg||!Array.isArray(cfg.pool)||!cfg.store)throw new Error("Quiz configuration incomplete");const n=cfg.questionsPerAttempt||10,pass=cfg.passMark||.8,fixed=cfg.pool.filter(q=>q.fixed);if(cfg.pool.length<n||fixed.length>n)throw new Error("Invalid question pool");let active=[];
function start(){const chosen=fixed.concat(shuffle(cfg.pool.filter(q=>!q.fixed)).slice(0,n-fixed.length));active=shuffle(chosen).map(q=>Object.assign({},q,{options:shuffle(q.options)}));return active;}
function current(){return active;}
function submit(answers){if(active.length!==n||!Array.isArray(answers)||answers.length!==n||answers.some(x=>!Number.isInteger(x)||x<0||x>3))throw new Error("Answer every question before submitting");let score=0;const review=active.map((q,i)=>{const correct=q.options[answers[i]].correct===true;if(correct)score++;return{correct,explanation:q.explanation};});const passed=score/n>=pass;const old=cfg.store.getDraft("lesson-1:quiz-history",{best:0,last:null,attempts:0});const history={best:Math.max(Number(old.best)||0,score),last:score,attempts:(Number(old.attempts)||0)+1};cfg.store.saveDraft("lesson-1:quiz-history",history);cfg.store.recordAttempt(cfg.requirementId,{passed:passed,answer:{score:score,attempts:history.attempts}});return{score:score,percent:Math.round(score/n*100),passed:passed,best:history.best,attempts:history.attempts,review:review};}
return{start:start,current:current,submit:submit};}
const api={create:create};if(typeof module==="object"&&module.exports)module.exports=api;else root.PVASMMQuiz=api;
})(typeof globalThis!=="undefined"?globalThis:this);
