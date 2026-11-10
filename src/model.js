export const fixture={title:'Opening the sculpture exhibition',source_url:'',source:'The curator must approve the object list before the registrar can issue loan agreements. Loan agreements must be signed before the transport team may collect the sculptures. The transport team must collect the sculptures before the installation team can install them. Installation must be completed before the exhibition opens. The exhibition opens only after the curator has approved the object list.',steps:[{id:'S1',text:'Approve the object list'},{id:'S2',text:'Sign the loan agreements'},{id:'S3',text:'Collect the sculptures'},{id:'S4',text:'Install the sculptures'},{id:'S5',text:'Open the exhibition'}]};
export function checkOrder(order,edges){return edges.filter(([a,b])=>order.indexOf(a)>=order.indexOf(b));}
export function levels(ids,edges){let rest=[...ids],out=[];while(rest.length){const ready=rest.filter(s=>!edges.some(([a,b])=>b===s&&rest.includes(a)));if(!ready.length)return {levels:out,blocked:rest};out.push(ready);rest=rest.filter(s=>!ready.includes(s));}return {levels:out,blocked:[]};}
export const fixtureEdges=[['S1','S2'],['S2','S3'],['S3','S4'],['S4','S5']];
export function validateDraft(d){if(!d.title?.trim()||d.title.length>100)throw Error('Give this procedure a title of 3–100 characters.');if(d.title.trim().length<3)throw Error('Title needs at least 3 characters.');if(d.source.length<40||d.source.length>10000)throw Error('Use a source excerpt of 40–10,000 characters.');if(d.steps.length<2||d.steps.length>6||d.steps.some(s=>s.text.length<3||s.text.length>240))throw Error('Use 2–6 distinct steps, each 3–240 characters.');if(new Set(d.steps.map(s=>s.text.trim().toLowerCase())).size!==d.steps.length)throw Error('Step descriptions must be distinct.');if(d.source_url&&(!d.source_url.startsWith('https://')||d.source_url.length>400))throw Error('The optional source locator must be an HTTPS URL.');return d;}
export const escapeHtml=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Canonical contract identity. The address is deployment identity, not a
// result value, so it may be shown before any readback. It is always taken
// from public/deployment.json, never hard-coded in the app; a malformed or
// missing address yields an empty link and the footer keeps its placeholder.
export function contractExplorerUrl(address){return /^0x[0-9a-fA-F]{40}$/.test(address||'')?'https://explorer-studio.genlayer.com/address/'+address:'';}
export function contractLabel(address){return 'CONTRACT '+address;}

// FINALIZED get_review readback; before any readback the caller passes null
// and the display is a neutral placeholder — never a success state. The
// mapping is exhaustive over the four contract statuses; an unknown or
// missing status falls through to neutral PENDING, never to success.
export function sourceDisplay(review){
  const source=review&&typeof review==='object'&&review.source&&typeof review.source==='object'?review.source:null;
  const blocked=review?.graph?.blocked_by_source===true;
  const base={blocked,matchedQuote:source&&typeof source.matched_quote==='string'?source.matched_quote:'',fetchedLength:source&&typeof source.fetched_length==='number'?source.fetched_length:null,reason:source&&typeof source.reason==='string'?source.reason:null,url:source&&typeof source.url==='string'?source.url:''};
  if(!source)return {state:'PENDING',status:null,...base};
  if(source.status==='VERIFIED')return {state:'VERIFIED',status:'VERIFIED',...base};
  if(source.status==='MISMATCH')return {state:'MISMATCH',status:'MISMATCH',...base};
  if(source.status==='UNREACHABLE')return {state:'UNREACHABLE',status:'UNREACHABLE',...base};
  if(source.status==='NOT_APPLICABLE')return {state:'NOT_CHECKED',status:'NOT_APPLICABLE',...base};
  return {state:'PENDING',status:source.status??null,...base};
}
export function sourceStatusHtml(review){
  const d=sourceDisplay(review);
  if(d.state==='PENDING')return '<p class="source-line source-pending">SOURCE · 未确认</p>';
  const lines=[];
  if(d.state==='VERIFIED')lines.push('<p class="source-line source-verified">SOURCE · VERIFIED</p>');
  if(d.state==='MISMATCH')lines.push('<p class="source-line source-bad">SOURCE · MISMATCH</p>');
  if(d.state==='UNREACHABLE')lines.push('<p class="source-line source-bad">SOURCE · UNREACHABLE</p>');
  if(d.state==='NOT_CHECKED')lines.push('<p class="source-line source-neutral">SOURCE · NOT CHECKED</p>');
  if(d.url)lines.push(`<p class="micro source-url">${escapeHtml(d.url)}</p>`);
  if(d.fetchedLength!==null)lines.push(`<p class="micro">Fetched ${d.fetchedLength} characters.</p>`);
  if(d.matchedQuote)lines.push(`<blockquote>“${escapeHtml(d.matchedQuote)}”</blockquote>`);
  if(d.reason)lines.push(`<p class="micro">Reason: ${escapeHtml(d.reason)}</p>`);
  if(d.state==='NOT_CHECKED')lines.push('<p class="micro">No source URL was sealed. The assessment used the excerpt alone.</p>');
  if(d.blocked)lines.push('<p class="source-blocked">Publication blocked — the source was not confirmed.</p>');
  return lines.join('');
}
