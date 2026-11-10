import {abi} from 'genlayer-js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fixture,fixtureEdges,checkOrder,levels,validateDraft,escapeHtml,sourceDisplay,sourceStatusHtml,contractExplorerUrl,contractLabel} from '../src/model.js';
test('publication order observes every prerequisite',()=>assert.deepEqual(checkOrder(['S1','S2','S3','S4','S5'],fixtureEdges),[]));
test('early opening exposes the final prerequisite',()=>assert.deepEqual(checkOrder(['S5','S1','S2','S3','S4'],fixtureEdges),[['S4','S5']]));
test('parallel steps remain in one level',()=>assert.deepEqual(levels(['S1','S2','S3'],[['S1','S3'],['S2','S3']]),{levels:[['S1','S2'],['S3']],blocked:[]}));
test('cycles cannot be repaired by sorting',()=>assert.deepEqual(levels(['S1','S2','S3'],[['S1','S2'],['S2','S1']]),{levels:[['S3']],blocked:['S1','S2']}));
test('duplicate task names are rejected',()=>assert.throws(()=>validateDraft({...fixture,steps:[{id:'S1',text:'Same'},{id:'S2',text:'same'}]})));
test('source text is not rendered as HTML',()=>assert.equal(escapeHtml('<img onerror="alert(1)">'),'&lt;img onerror=&quot;alert(1)&quot;&gt;'));
import {verifyReceipt} from '../src/receipts.js';
const intent={address:'0xabc',from:'0xdef',functionName:'seal',args:['slug','{}']};
const receipt={status:7,result:6,to_address:'0xabc',from_address:'0xdef',data:{calldata:{base64:btoa(String.fromCharCode(...abi.calldata.encode(abi.calldata.makeCalldataObject('seal',['slug','{}']))))}},consensus_data:{leader_receipt:[{mode:'leader',execution_result:'SUCCESS'}]}};
test('numeric finalized accepted receipt verifies its intent',()=>assert.equal(verifyReceipt(receipt,intent),receipt));
test('success text in a failed receipt cannot pass',()=>assert.throws(()=>verifyReceipt({...receipt,result:7},intent)));
test('pending is not finality',()=>assert.throws(()=>verifyReceipt({...receipt,status:5},intent)));
test('another method cannot verify this request',()=>assert.throws(()=>verifyReceipt(receipt,{...intent,functionName:'publish'})));

const reviewFor=(source,graph={status:'ORDERABLE'})=>({book_id:'b',revision:1,input_hash:'h',assessment:{},source,graph});
test('no readback shows a neutral source state, never a status value',()=>{
  assert.equal(sourceDisplay(null).state,'PENDING');
  assert.equal(sourceDisplay(undefined).state,'PENDING');
  assert.equal(sourceDisplay({}).state,'PENDING');
  assert.equal(sourceDisplay(null).blocked,false);
  assert.match(sourceStatusHtml(null),/未确认/);
  assert.doesNotMatch(sourceStatusHtml(null),/VERIFIED|MISMATCH|UNREACHABLE|NOT CHECKED/);
});
test('verified source shows quote and fetched length',()=>{
  const r=reviewFor({status:'VERIFIED',url:'https://example.org/x',fetched_length:12408,matched_quote:'The curator must approve',reason:'EXCERPT_FOUND'});
  assert.equal(sourceDisplay(r).state,'VERIFIED');
  assert.equal(sourceDisplay(r).fetchedLength,12408);
  assert.equal(sourceDisplay(r).matchedQuote,'The curator must approve');
  assert.equal(sourceDisplay(r).blocked,false);
  assert.match(sourceStatusHtml(r),/SOURCE · VERIFIED/);
  assert.match(sourceStatusHtml(r),/Fetched 12408 characters/);
});
test('mismatch source blocks publication',()=>{
  const r=reviewFor({status:'MISMATCH',url:'https://example.org/x',fetched_length:900,matched_quote:'',reason:'EXCERPT_ABSENT'},{status:'REVIEW',blocked_by_source:true});
  assert.equal(sourceDisplay(r).state,'MISMATCH');
  assert.equal(sourceDisplay(r).blocked,true);
  assert.match(sourceStatusHtml(r),/SOURCE · MISMATCH/);
  assert.match(sourceStatusHtml(r),/Publication blocked/);
});
test('unreachable source blocks publication',()=>{
  const r=reviewFor({status:'UNREACHABLE',url:'https://example.org/x',fetched_length:0,matched_quote:'',reason:'FETCH_FAILED'},{status:'REVIEW',blocked_by_source:true});
  assert.equal(sourceDisplay(r).state,'UNREACHABLE');
  assert.equal(sourceDisplay(r).blocked,true);
  assert.match(sourceStatusHtml(r),/SOURCE · UNREACHABLE/);
  assert.match(sourceStatusHtml(r),/Publication blocked/);
});
test('no url shows NOT CHECKED, not a success',()=>{
  const r=reviewFor({status:'NOT_APPLICABLE',url:'',fetched_length:0,matched_quote:'',reason:'NO_URL'});
  assert.equal(sourceDisplay(r).state,'NOT_CHECKED');
  assert.equal(sourceDisplay(r).blocked,false);
  assert.match(sourceStatusHtml(r),/SOURCE · NOT CHECKED/);
  assert.doesNotMatch(sourceStatusHtml(r),/SOURCE · VERIFIED/);
});
test('an unknown source status stays neutral, never success',()=>{
  const r=reviewFor({status:'SOMETHING_NEW',url:'https://example.org/x',fetched_length:1,matched_quote:'',reason:'EXCERPT_FOUND'});
  assert.equal(sourceDisplay(r).state,'PENDING');
  assert.doesNotMatch(sourceStatusHtml(r),/VERIFIED/);
});
test('matched quote is escaped in the source display',()=>{
  const html=sourceStatusHtml(reviewFor({status:'VERIFIED',url:'https://example.org/x',fetched_length:10,matched_quote:'<img src=x onerror=alert(1)>',reason:'EXCERPT_FOUND'}));
  assert.doesNotMatch(html,/<img/);
  assert.match(html,/&lt;img/);
});
test('canonical contract address links to the Studionet explorer',()=>{
  assert.equal(contractExplorerUrl('0xD81546dC6478121D9bd1DEf95Ae4901b0DF196d8'),'https://explorer-studio.genlayer.com/address/0xD81546dC6478121D9bd1DEf95Ae4901b0DF196d8');
  assert.equal(contractLabel('0xD81546dC6478121D9bd1DEf95Ae4901b0DF196d8'),'CONTRACT 0xD81546dC6478121D9bd1DEf95Ae4901b0DF196d8');
  assert.equal(contractExplorerUrl(''),'');
  assert.equal(contractExplorerUrl('not-an-address'),'');
  assert.equal(contractExplorerUrl('0xD81546dC6478121D9bd1DEf95Ae4901b0DF196d'),'' );
});
