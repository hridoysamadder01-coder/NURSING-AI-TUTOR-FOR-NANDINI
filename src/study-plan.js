// Recommended owner-curated study roadmap, not a verbatim college-prescribed chapter list.
// The six subjects and their order are the ones Nandini gave for her college (Behavioral Science is not in her list).
export const SUBJECTS = [
 {code:'D135',name:'Fundamentals of Nursing',bn:'নার্সিংয়ের মৌলিক বিষয়',emoji:'🩺',references:['fundamentals','skills'],extras:[],
 topics:[
  ['নার্সের দায়িত্ব ও পেশাগত আচরণ','nursing professional roles'],
  ['রোগীর নিরাপত্তা','patient safety falls'],
  ['হাত পরিষ্কার ও সংক্রমণ প্রতিরোধ','hand hygiene infection'],
  ['ভাইটাল সাইন','vital signs pulse temperature'],
  ['রোগীর মূল্যায়ন','nursing assessment patient'],
  ['নার্সিং কেয়ার প্ল্যান','nursing care plan diagnosis'],
  ['ডকুমেন্টেশন ও রিপোর্ট','nursing documentation reporting'],
  ['রোগীর সঙ্গে যোগাযোগ','therapeutic communication patient']
 ]},
 {code:'D123',name:'Anatomy & Physiology',bn:'শরীরতত্ত্ব ও অঙ্গসংস্থান',emoji:'🫀',references:['openstax-anatomy','seer-anatomy','terminology'],extras:[],
 topics:[
  ['কোষ, টিস্যু ও অঙ্গ','cell tissue organ'],
  ['রক্ত ও হৃদ্‌যন্ত্র','heart blood circulation'],
  ['শ্বাসতন্ত্র','lung respiration oxygenation'],
  ['পরিপাকতন্ত্র','digestion gastrointestinal'],
  ['মূত্রতন্ত্র ও কিডনি','kidney renal urinary'],
  ['স্নায়ুতন্ত্র','nervous system neurological']
 ]},
 {code:'D112',name:'Basic Science',bn:'মৌলিক বিজ্ঞান',emoji:'⚛️',references:['openstax-biology','openstax-chemistry'],extras:[],
 topics:[
  ['কোষ ও কোষের কাজ','cell membrane tissue'],
  ['পানি ও ইলেক্ট্রোলাইট','fluid electrolyte'],
  ['অ্যাসিড, ক্ষার ও pH','acid base pH'],
  ['শক্তি ও পুষ্টির প্রাথমিক ধারণা','metabolism nutrition energy'],
  ['স্বাস্থ্যবিজ্ঞানে পরিমাপ','measurement temperature metric']
 ]},
 {code:'D124',name:'Microbiology & Parasitology',bn:'অণুজীববিজ্ঞান ও পরজীবীবিজ্ঞান',emoji:'🦠',references:['openstax-microbiology','fundamentals'],extras:[],
 topics:[
  ['ব্যাকটেরিয়া, ভাইরাস ও ছত্রাক','bacteria virus fungi'],
  ['সংক্রমণের চক্র','chain of infection'],
  ['হাত পরিচ্ছন্নতা ও PPE','hand hygiene protective equipment'],
  ['জীবাণুনাশ ও নির্বীজকরণ','disinfection sterilization'],
  ['পরজীবীর প্রাথমিক ধারণা','parasite parasitology'],
  ['নিরাপদ নমুনা সংগ্রহ','specimen collection infection control']
 ]},
 {code:'D117',name:'ICT',bn:'আইসিটি (কম্পিউটার)',emoji:'💻',references:['openstax-workplace'],extras:[{title:'Computer Basics (free online course)',url:'https://edu.gcfglobal.org/en/computerbasics/'}],
 topics:[
  ['কম্পিউটার ও যন্ত্রাংশ','computer hardware software'],
  ['ফাইল, ফোল্ডার ও কীবোর্ড','files folders typing'],
  ['Word-এ রিপোর্ট লেখা','document processing report'],
  ['Spreadsheet-এর সাধারণ ব্যবহার','spreadsheet table calculation'],
  ['ইন্টারনেট, ইমেইল ও নিরাপত্তা','internet email safety'],
  ['রোগীর তথ্যের গোপনীয়তা','health data privacy']
 ]},
 {code:'D116',name:'English',bn:'ইংরেজি',emoji:'💬',references:['terminology'],extras:[{title:'Medical Terminology 2e',url:'https://wtcs.pressbooks.pub/medterm/'}],
 topics:[
  ['নার্সিংয়ে ইংরেজি পরিচয়','nursing introduction patient'],
  ['রোগীর উপসর্গ বর্ণনা','pain symptoms communication'],
  ['Medical terminology-এর শব্দমূল','prefix suffix medical terms'],
  ['রোগীর সঙ্গে ইংরেজি প্রশ্ন','patient assessment questions'],
  ['সহজ রিপোর্ট ও হ্যান্ডওভার','documentation communication handoff']
 ]}
];
export const TOTAL_TOPICS=SUBJECTS.reduce((sum,x)=>sum+x.topics.length,0);
export function subjectByCode(code){return SUBJECTS.find(s=>s.code===code)}
export function taskId(code,index){return code+':'+index}
// Short names for the bundled books a subject points to (data/books/shelf.json keeps the same mapping, and a test compares them).
export const BOOK_NAMES={fundamentals:'Nursing Fundamentals',skills:'Nursing Skills',terminology:'Medical Terminology',mentalhealth:'Mental Health & Community',
 'seer-anatomy':'Anatomy overview (NCI)','openstax-anatomy':'Anatomy & Physiology 2e','openstax-microbiology':'Microbiology','openstax-biology':'Biology 2e',
 'openstax-chemistry':'Chemistry 2e','openstax-psychology':'Psychology 2e','openstax-sociology':'Sociology 3e','openstax-workplace':'Workplace Software & Skills'};
export const SOURCE_LINKS=Object.fromEntries(Object.keys(BOOK_NAMES).map(id=>[id,'./library.html?book='+id]));
