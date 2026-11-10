import unittest, types, sys, json, os, importlib.util
mock=types.ModuleType('genlayer')
class Decorator:
    def __call__(self,x): return x
class TreeMap(dict):
    def __class_getitem__(cls,x): return cls
class FakeResponse:
    def __init__(self,status,body):
        self.status=status
        self.body=body.encode('utf-8') if isinstance(body,str) else body
WEB={}
FETCH_CALLS=[]
CANNED_ASSESSMENT=None
def web_request(url,method='GET'):
    FETCH_CALLS.append(url)
    entry=WEB.get(url)
    if entry is None:
        raise Exception('fetch failed: no mock for '+url)
    if isinstance(entry,list):
        if not entry:
            raise Exception('fetch failed: mock exhausted for '+url)
        entry=entry.pop(0)
    if isinstance(entry,Exception):
        raise entry
    return entry
def exec_prompt(prompt,response_format=None):
    if 'Audit every proposed' in prompt:
        return '{"valid": true}'
    return json.dumps(CANNED_ASSESSMENT)
class Return:
    def __init__(self,calldata): self.calldata=calldata
def run_nondet_unsafe(judge,validator):
    result=judge()
    if not validator(Return(result)):
        raise Exception('VALIDATOR_REJECT')
    return result
mock.gl=types.SimpleNamespace(Contract=object,public=types.SimpleNamespace(view=Decorator(),write=Decorator()),message=types.SimpleNamespace(sender_address='0xabc'),nondet=types.SimpleNamespace(exec_prompt=exec_prompt,web=types.SimpleNamespace(request=web_request)),vm=types.SimpleNamespace(run_nondet_unsafe=run_nondet_unsafe,Return=Return))
mock.TreeMap=TreeMap;mock.u32=int
sys.modules['genlayer']=mock
spec=importlib.util.spec_from_file_location('volta','contracts/volta.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
HERE=os.path.dirname(os.path.abspath(__file__))
FIXTURE_SOURCE='The curator must approve the object list before the registrar can issue loan agreements. Loan agreements must be signed before the transport team may collect the sculptures. The transport team must collect the sculptures before the installation team can install them. Installation must be completed before the exhibition opens. The exhibition opens only after the curator has approved the object list.'
class Tests(unittest.TestCase):
    def assessment(self,relations):
        pairs=[]
        for (a,b),r in zip([('S1','S2'),('S1','S3'),('S2','S3')],relations): pairs.append({'a':a,'b':b,'relation':r,'quote':'This is the exact source excerpt.','reason':'The excerpt requires this order.'})
        return {'mapping':['GROUNDED']*3,'pairs':pairs}
    def test_cycle(self):
        d=self.assessment(['A_BEFORE_B','B_BEFORE_A','A_BEFORE_B'])
        self.assertEqual(v.derive(d,[{'id':'S1'},{'id':'S2'},{'id':'S3'}])['status'],'CYCLE')
    def test_uncertainty(self):
        d=self.assessment(['FREE','UNCLEAR','FREE'])
        self.assertEqual(v.derive(d,[{'id':'S1'},{'id':'S2'},{'id':'S3'}])['status'],'REVIEW')
    def test_reverse_direction(self):
        d=self.assessment(['B_BEFORE_A','FREE','FREE'])
        self.assertEqual(v.derive(d,[{'id':'S1'},{'id':'S2'},{'id':'S3'}])['edges'],[['S2','S1']])
    def test_quote_grounding(self):
        d=self.assessment(['A_BEFORE_B','FREE','FREE']);d['pairs'][0]['quote']='fabricated exact quotation'
        with self.assertRaisesRegex(Exception,'UNGROUNDED_QUOTE'):v.parse_assessment(d,{'steps':[1,2,3],'source':'This is the exact source excerpt.'})
    def test_unmapped_edge(self):
        d=self.assessment(['A_BEFORE_B','FREE','FREE']);d['mapping'][0]='ABSENT'
        with self.assertRaisesRegex(Exception,'UNMAPPED_EDGE'):v.parse_assessment(d,{'steps':[1,2,3],'source':'This is the exact source excerpt.'})
    def test_publish_stale_and_owner(self):
        c=v.Volta();c.books=TreeMap();c.reviews=TreeMap();c.count=TreeMap()
        source={'title':'Test procedure','source_url':'','source':'Before installing the work, sign the agreement.','steps':[{'id':'S1','text':'Sign agreement'},{'id':'S2','text':'Install work'}]}
        key=c.seal('test',json.dumps(source))
        with self.assertRaisesRegex(Exception,'STALE_REVISION'):c.publish(key,1,'["S1","S2"]')
        mock.gl.message.sender_address='0xdef'
        with self.assertRaisesRegex(Exception,'OWNER_ONLY'):c.assess(key,0)
        mock.gl.message.sender_address='0xabc'
    def test_invalid_order_and_terminal_publication(self):
        c=v.Volta();c.books=TreeMap();c.reviews=TreeMap();c.count=TreeMap()
        source={'title':'Test procedure','source_url':'','source':'Before installing the work, sign the agreement.','steps':[{'id':'S1','text':'Sign agreement'},{'id':'S2','text':'Install work'}]}
        key=c.seal('test',json.dumps(source));b=json.loads(c.books[key]);b['revision']=1;c.books[key]=v.pack(b)
        c.reviews[key+':1']=v.pack({'graph':{'status':'ORDERABLE','edges':[['S1','S2']]}})
        with self.assertRaisesRegex(Exception,'PREREQUISITE_VIOLATION'):c.publish(key,1,'["S2","S1"]')
        c.publish(key,1,'["S1","S2"]')
        with self.assertRaisesRegex(Exception,'PUBLISHED_IMMUTABLE'):c.assess(key,1)
    # -- volta-2 source verification -------------------------------------
    def run_assess(self,source_text,url,web_entry):
        global CANNED_ASSESSMENT
        WEB.clear();FETCH_CALLS.clear()
        if web_entry is not None:
            WEB[url]=web_entry
        c=v.Volta();c.books=TreeMap();c.reviews=TreeMap();c.count=TreeMap()
        source={'title':'Test procedure','source_url':url,'source':source_text,'steps':[{'id':'S1','text':'Approve the object list'},{'id':'S2','text':'Sign the loan agreements'}]}
        key=c.seal('test',json.dumps(source))
        CANNED_ASSESSMENT={'mapping':['GROUNDED','GROUNDED'],'pairs':[{'a':'S1','b':'S2','relation':'A_BEFORE_B','quote':source_text[:80],'reason':'The excerpt requires this order.'}]}
        return c,key,json.loads(c.assess(key,0))
    def test_source_verified(self):
        with open(os.path.join(HERE,'..','fixtures','volta-source-honest.txt')) as f: page=f.read()
        self.assertEqual(page.strip(),FIXTURE_SOURCE)
        body='<html><body><p>'+page.strip()+'</p></body></html>'
        c,key,review=self.run_assess(FIXTURE_SOURCE,'https://example.com/honest.txt',FakeResponse(200,body))
        self.assertEqual(set(review),{'book_id','revision','input_hash','assessment','source','graph'})
        self.assertEqual(review['source'],{'status':'VERIFIED','url':'https://example.com/honest.txt','fetched_length':len(body),'matched_quote':FIXTURE_SOURCE[:500],'reason':'EXCERPT_FOUND'})
        self.assertEqual(review['graph']['status'],'ORDERABLE')
        self.assertNotIn('blocked_by_source',review['graph'])
        self.assertEqual(json.loads(c.reviews[key+':1']),review)
    def test_source_mismatch(self):
        c,key,review=self.run_assess(FIXTURE_SOURCE,'https://example.com/other.txt',FakeResponse(200,'A page about baking bread and mending shoes.'))
        self.assertEqual(review['source']['status'],'MISMATCH')
        self.assertEqual(review['source']['reason'],'EXCERPT_ABSENT')
        self.assertEqual(review['source']['matched_quote'],'')
        self.assertEqual(review['graph']['status'],'REVIEW')
        self.assertTrue(review['graph']['blocked_by_source'])
    def test_source_unreachable_fetch_raises(self):
        c,key,review=self.run_assess(FIXTURE_SOURCE,'https://example.com/down.txt',Exception('connection refused'))
        self.assertEqual(review['source'],{'status':'UNREACHABLE','url':'https://example.com/down.txt','fetched_length':0,'matched_quote':'','reason':'FETCH_FAILED'})
        self.assertEqual(review['graph']['status'],'REVIEW')
        self.assertTrue(review['graph']['blocked_by_source'])
    def test_source_unreachable_non200(self):
        c,key,review=self.run_assess(FIXTURE_SOURCE,'https://example.com/missing.txt',FakeResponse(404,'not found'))
        self.assertEqual(review['source']['status'],'UNREACHABLE')
        self.assertEqual(review['source']['reason'],'FETCH_FAILED')
        self.assertEqual(review['source']['fetched_length'],0)
        self.assertEqual(review['graph']['status'],'REVIEW')
        self.assertTrue(review['graph']['blocked_by_source'])
    def test_source_unreachable_empty_body(self):
        c,key,review=self.run_assess(FIXTURE_SOURCE,'https://example.com/empty.txt',FakeResponse(200,''))
        self.assertEqual(review['source']['status'],'UNREACHABLE')
        self.assertEqual(review['source']['reason'],'FETCH_FAILED')
        self.assertEqual(review['graph']['status'],'REVIEW')
        self.assertTrue(review['graph']['blocked_by_source'])
    def test_source_not_applicable(self):
        c,key,review=self.run_assess(FIXTURE_SOURCE,'',None)
        self.assertEqual(review['source'],{'status':'NOT_APPLICABLE','url':'','fetched_length':0,'matched_quote':'','reason':'NO_URL'})
        self.assertEqual(FETCH_CALLS,[])
        self.assertEqual(review['graph']['status'],'ORDERABLE')
        self.assertNotIn('blocked_by_source',review['graph'])
    def test_source_injection_page(self):
        with open(os.path.join(HERE,'..','fixtures','volta-source-injection.txt')) as f: page=f.read()
        self.assertFalse(v.check_source_excerpt(FIXTURE_SOURCE,page))
        c,key,review=self.run_assess(FIXTURE_SOURCE,'https://example.com/injection.txt',FakeResponse(200,page))
        self.assertEqual(review['source']['status'],'MISMATCH')
        self.assertEqual(review['source']['reason'],'EXCERPT_ABSENT')
        self.assertEqual(review['graph']['status'],'REVIEW')
        self.assertTrue(review['graph']['blocked_by_source'])
    def test_validator_rejects_source_disagreement(self):
        global CANNED_ASSESSMENT
        WEB.clear();FETCH_CALLS.clear()
        url='https://example.com/flaky.txt'
        WEB[url]=[FakeResponse(200,FIXTURE_SOURCE),FakeResponse(200,'A page about baking bread and mending shoes.')]
        c=v.Volta();c.books=TreeMap();c.reviews=TreeMap();c.count=TreeMap()
        source={'title':'Test procedure','source_url':url,'source':FIXTURE_SOURCE,'steps':[{'id':'S1','text':'Approve the object list'},{'id':'S2','text':'Sign the loan agreements'}]}
        key=c.seal('test',json.dumps(source))
        CANNED_ASSESSMENT={'mapping':['GROUNDED','GROUNDED'],'pairs':[{'a':'S1','b':'S2','relation':'A_BEFORE_B','quote':FIXTURE_SOURCE[:80],'reason':'The excerpt requires this order.'}]}
        with self.assertRaisesRegex(Exception,'VALIDATOR_REJECT'):c.assess(key,0)
        self.assertEqual(c.reviews,{})
        self.assertEqual(json.loads(c.books[key])['revision'],0)
    def test_derive_gate_mismatch(self):
        d=self.assessment(['A_BEFORE_B','FREE','FREE'])
        g=v.derive(d,[{'id':'S1'},{'id':'S2'},{'id':'S3'}],'MISMATCH')
        self.assertEqual(g['status'],'REVIEW')
        self.assertTrue(g['blocked_by_source'])
        cyc=self.assessment(['A_BEFORE_B','B_BEFORE_A','A_BEFORE_B'])
        self.assertEqual(v.derive(cyc,[{'id':'S1'},{'id':'S2'},{'id':'S3'}],'MISMATCH')['status'],'CYCLE')
    def test_derive_gate_verified(self):
        d=self.assessment(['A_BEFORE_B','FREE','FREE'])
        g=v.derive(d,[{'id':'S1'},{'id':'S2'},{'id':'S3'}],'VERIFIED')
        self.assertEqual(g['status'],'ORDERABLE')
        self.assertNotIn('blocked_by_source',g)
    def test_derive_gate_not_applicable(self):
        d=self.assessment(['A_BEFORE_B','FREE','FREE'])
        g=v.derive(d,[{'id':'S1'},{'id':'S2'},{'id':'S3'}],'NOT_APPLICABLE')
        self.assertEqual(g['status'],'ORDERABLE')
        self.assertNotIn('blocked_by_source',g)
        g2=v.derive(d,[{'id':'S1'},{'id':'S2'},{'id':'S3'}])
        self.assertEqual(g2['status'],'ORDERABLE')
    def test_publish_blocked_by_source(self):
        c,key,review=self.run_assess(FIXTURE_SOURCE,'https://example.com/other.txt',FakeResponse(200,'A page about baking bread and mending shoes.'))
        self.assertEqual(review['graph']['status'],'REVIEW')
        with self.assertRaisesRegex(Exception,'NOT_ORDERABLE'):c.publish(key,1,'["S1","S2"]')
if __name__=='__main__':unittest.main()
