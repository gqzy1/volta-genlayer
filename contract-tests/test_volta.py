import unittest, types, sys, json, importlib.util
mock=types.ModuleType('genlayer')
class Decorator:
    def __call__(self,x): return x
class TreeMap(dict):
    def __class_getitem__(cls,x): return cls
mock.gl=types.SimpleNamespace(Contract=object,public=types.SimpleNamespace(view=Decorator(),write=Decorator()),message=types.SimpleNamespace(sender_address='0xabc'))
mock.TreeMap=TreeMap;mock.u32=int
sys.modules['genlayer']=mock
spec=importlib.util.spec_from_file_location('volta','contracts/volta.py');v=importlib.util.module_from_spec(spec);spec.loader.exec_module(v)
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
if __name__=='__main__':unittest.main()
