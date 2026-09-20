import {retrieve,buildPrompt,extractiveAnswer} from './rag.js';

const $=s=>document.querySelector(s); let kb=[]; let generator=null; let generatorPromise=null;
const conversation=$('#conversation'), question=$('#question'), form=$('#ask-form'), askButton=$('#ask-button');

async function loadKnowledge(){
  const res=await fetch('./data/kb.json'); kb=await res.json(); $('#knowledge-count').textContent=kb.length;
}

function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
function addMessage(role,html,cls=''){
  const item=document.createElement('article'); item.className=`message ${role} ${cls}`;
  item.innerHTML=role==='assistant'?`<div class="avatar">RG</div><div class="bubble">${html}</div>`:`<div class="bubble">${html}</div>`;
  conversation.insertBefore(item,$('#suggestions')); conversation.scrollTop=conversation.scrollHeight; return item;
}
function showEvidence(hits){
  $('#evidence-empty').style.display='none'; const list=$('#evidence-list'); list.classList.add('active');
  $('#source-count').textContent=`${hits.length} source${hits.length===1?'':'s'}`;
  list.innerHTML=hits.map((h,i)=>`<a class="evidence-card" href="${h.url}" target="_blank" rel="noopener"><div class="evidence-meta"><span>[${i+1}] ${esc(h.publisher)}</span><span>${h.relevance}% match</span></div><h3>${esc(h.title)}</h3><p>${esc(h.text.slice(0,175))}${h.text.length>175?'…':''}</p><div class="score-bar"><span style="width:${h.relevance}%"></span></div></a>`).join('');
}
async function ensureGenerator(){
  if(generator) return generator; if(generatorPromise) return generatorPromise;
  $('#model-status').textContent='Loading local AI…';
  generatorPromise=(async()=>{
    const {pipeline,env}=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1');
    env.allowLocalModels=false;
    generator=await pipeline('text2text-generation','Xenova/flan-t5-small',{dtype:'q8'});
    $('#model-status').textContent='Local AI ready'; return generator;
  })();
  try{return await generatorPromise}catch(e){generatorPromise=null;$('#model-status').textContent='Retrieval ready';throw e}
}
async function answer(raw){
  const q=raw.trim(); if(!q||!kb.length)return; $('#suggestions').style.display='none';
  addMessage('user',`<p>${esc(q)}</p>`); question.value='';askButton.disabled=true;
  const thinking=addMessage('assistant','<i></i><i></i><i></i>','thinking');
  const ranked=retrieve(q,kb,4); const hits=ranked.filter((h,i)=>i===0||h.relevance>=20).slice(0,3); showEvidence(hits);
  let text='';
  if(!hits.length||hits[0].relevance<22){text=extractiveAnswer(q,[])}else{
    try{const gen=await Promise.race([ensureGenerator(),new Promise((_,rej)=>setTimeout(()=>rej(new Error('model timeout')),90000))]);
      const out=await gen(buildPrompt(q,hits),{max_new_tokens:150,temperature:0.1,do_sample:false}); text=out?.[0]?.generated_text?.trim()||'';
      if(text.length<45||/^\s*\[?\d+\]?\s*$/.test(text)) text=extractiveAnswer(q,hits);
    }catch{ text=extractiveAnswer(q,hits); }
  }
  const citations=hits.map((h,i)=>`<a href="${h.url}" target="_blank" rel="noopener">[${i+1}] ${esc(h.shortTitle||h.publisher)}</a>`).join('');
  thinking.remove();addMessage('assistant',`<p>${esc(text)}</p><div class="answer-citations">${citations}</div>`);askButton.disabled=false;question.focus();
}

form.addEventListener('submit',e=>{e.preventDefault();answer(question.value)});
question.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit()}});
question.addEventListener('input',()=>{question.style.height='auto';question.style.height=`${Math.min(question.scrollHeight,110)}px`});
document.querySelectorAll('[data-question]').forEach(b=>b.addEventListener('click',()=>answer(b.dataset.question)));
$('#clear-button').addEventListener('click',()=>{conversation.querySelectorAll('.message:not(.welcome-message)').forEach(n=>n.remove());$('#suggestions').style.display='grid';$('#evidence-list').classList.remove('active');$('#evidence-list').innerHTML='';$('#evidence-empty').style.display='grid';$('#source-count').textContent='0 sources'});
loadKnowledge().catch(()=>{$('#model-status').textContent='Knowledge base unavailable'});

if(document.modelContext?.registerTool){document.modelContext.registerTool({name:'ask_ieee_ras',title:'Ask RAS Guide',description:'Ask a question about IEEE RAS or public IEEE RAS VIT Chennai information and show the answer with retrieved sources.',inputSchema:{type:'object',properties:{question:{type:'string'}},required:['question'],additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:async({question:q})=>{const ranked=retrieve(q,kb,4);const hits=ranked.filter((h,i)=>i===0||h.relevance>=20).slice(0,3);return{answer:extractiveAnswer(q,hits),sources:hits.map(h=>({title:h.title,url:h.url}))}}}).catch(()=>{});}
