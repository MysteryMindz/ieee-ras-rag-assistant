const STOP = new Set('a an and are as at be by for from has have how i in is it its of on or that the their this to was what when where which who will with you your'.split(' '));

const EXPANSIONS = {
  mission:['objective','vision','advance','foster'], student:['students','sac','education','career','networking'],
  publication:['publications','journal','magazine','transactions','letters'], conference:['conferences','icra','iros','case','workshop'],
  vit:['chennai','vitchennai','student branch','rascade'], standard:['standards','standardization','scsa'], member:['membership','members','join','benefits']
};

export function tokenize(text){
  return String(text).toLowerCase().replace(/[^a-z0-9\s-]/g,' ').split(/\s+/).filter(t=>t.length>1&&!STOP.has(t));
}

export function expandQuery(query){
  const low=query.toLowerCase(); let out=[...tokenize(query)];
  for(const [key,words] of Object.entries(EXPANSIONS)) if(low.includes(key)) out.push(...words.flatMap(tokenize));
  return out;
}

export function retrieve(query, documents, k=4){
  const q=expandQuery(query); const N=documents.length;
  const df={};
  documents.forEach(d=>new Set(tokenize(`${d.title} ${d.text} ${d.tags?.join(' ')||''}`)).forEach(t=>df[t]=(df[t]||0)+1));
  const results=documents.map(doc=>{
    const body=tokenize(doc.text), title=tokenize(doc.title), tags=tokenize((doc.tags||[]).join(' '));
    const counts={}; body.forEach(t=>counts[t]=(counts[t]||0)+1);
    let score=0; for(const term of q){
      const idf=Math.log(1+(N-(df[term]||0)+.5)/((df[term]||0)+.5));
      const tf=counts[term]||0; const bm25=tf?tf*2.2/(tf+1.2*(.25+.75*body.length/85)):0;
      score += idf*(bm25+(title.includes(term)?2.4:0)+(tags.includes(term)?1.7:0));
    }
    return {...doc,score};
  }).sort((a,b)=>b.score-a.score);
  const max=results[0]?.score||1;
  return results.filter(r=>r.score>0).slice(0,k).map(r=>({...r,relevance:Math.round(100*r.score/max)}));
}

export function buildPrompt(question, hits){
  const context=hits.map((h,i)=>`[${i+1}] ${h.title}: ${h.text}`).join('\n');
  return `Answer the question using only the context. Be concise, factual, and helpful. If the context does not contain the answer, say that the available sources do not answer it. Do not invent dates, people, events, fees, or links.\n\nContext:\n${context}\n\nQuestion: ${question}\nAnswer:`;
}

export function extractiveAnswer(question,hits){
  if(!hits.length) return 'I could not find support for that in the current knowledge base. Try asking about the IEEE RAS mission, membership, students, publications, conferences, standards, or VIT Chennai.';
  const q=new Set(expandQuery(question));
  const sentences=hits.flatMap((h,hi)=>h.text.split(/(?<=[.!?])\s+/).map(s=>({s,hi,score:tokenize(s).filter(t=>q.has(t)).length})));
  const chosen=sentences.sort((a,b)=>b.score-a.score||a.hi-b.hi).slice(0,3).sort((a,b)=>a.hi-b.hi);
  return chosen.map(x=>x.s).join(' ');
}
