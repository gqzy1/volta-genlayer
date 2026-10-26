import {abi} from 'genlayer-js';
import {transactionsStatusNumberToName,transactionResultNumberToName} from 'genlayer-js/types';
export function verifyReceipt(tx,intent){
 const status=typeof tx.status==='number'?transactionsStatusNumberToName[tx.status]:tx.status;
 const result=typeof tx.result==='number'?transactionResultNumberToName[tx.result]:tx.result;
 if(status!=='FINALIZED')throw Error('Transaction has not reached FINALIZED.');
 if(result!=='MAJORITY_AGREE')throw Error('Consensus did not return MAJORITY_AGREE.');
 const receipts=tx.consensus_data?.leader_receipt;
 const leader=Array.isArray(receipts)?receipts.find(r=>r.mode==='leader'):receipts;
 if(leader?.execution_result!=='SUCCESS')throw Error('Accepted leader execution was not SUCCESS.');
 if(intent){
  if((tx.to_address||'').toLowerCase()!==intent.address.toLowerCase())throw Error('Receipt contract mismatch.');
  if((tx.from_address||'').toLowerCase()!==intent.from.toLowerCase())throw Error('Receipt sender mismatch.');
  const encoded=tx.data?.calldata?.base64;
  if(typeof encoded!=='string')throw Error('Receipt binary calldata unavailable.');
  const expected=abi.calldata.encode(abi.calldata.makeCalldataObject(intent.functionName,intent.args));
  const expectedBase64=btoa(String.fromCharCode(...expected));
  if(encoded!==expectedBase64)throw Error('Receipt intent mismatch.');
 }
 return tx;
}
