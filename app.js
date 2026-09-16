(function(){
'use strict';

var $=function(id){return document.getElementById(id)};

document.addEventListener('DOMContentLoaded',function(){
  var s=$('jsStatus');
  if(s){s.textContent='● actief';s.style.color='#82d982'}
});

var readTab=$('readTab'),listenTab=$('listenTab'),focusBtn=$('focusBtn'),focusExit=$('focusExit');
var reader=$('reader'),wordEl=$('word'),placeholder=$('placeholder'),modeBadge=$('modeBadge');
var textInput=$('textInput'),documentInput=$('documentInput'),documentStatus=$('documentStatus');
var chapterBox=$('chapterBox'),chapterSelect=$('chapterSelect');
var counter=$('counter'),bar=$('bar'),remaining=$('remaining');

var readControls=$('readControls'),wpmRange=$('wpmRange'),wpmNumber=$('wpmNumber');
var readStart=$('readStart'),readReset=$('readReset'),punctuation=$('punctuation');

var listenControls=$('listenControls'),languageSelect=$('languageSelect'),voiceSelect=$('voiceSelect');
var refreshVoices=$('refreshVoices'),speechRate=$('speechRate'),speechRateValue=$('speechRateValue');
var listenStart=$('listenStart'),listenPause=$('listenPause'),listenStop=$('listenStop'),toggleWords=$('toggleWords');
var speechNote=$('speechNote');

var mode='read',words=[],wordIndex=0,readTimer=null,readRunning=false;
var sourceText=textInput.value,sourceKind='text',book=null;

var allVoices=[],filteredVoices=[],wordsVisible=true;
var speechChunks=[],speechChunkIndex=0,speechRunning=false,speechPaused=false,speechToken=0;
var currentChunkWordBase=0,chunkWordPositions=[];

var vowels='aeiouyáéíóúàèìòùäëïöüâêîôûAEIOUYÁÉÍÓÚÀÈÌÒÙÄËÏÖÜÂÊÎÔÛ';

function setStatus(text,kind){
  documentStatus.textContent=text;
  documentStatus.className='status'+(kind?' '+kind:'');
}

function tokenize(text){
  var t=(text||'').replace(/\u00ad/g,'').replace(/\s+/g,' ').trim();
  return t?t.split(' '):[];
}

function focusIndexFor(word){
  var chars=Array.from(word),center=(chars.length-1)/2,best=-1,dist=Infinity,i;
  for(i=0;i<chars.length;i++){
    if(vowels.indexOf(chars[i])!==-1){
      var d=Math.abs(i-center);
      if(d<dist){dist=d;best=i}
    }
  }
  if(best===-1){
    for(i=0;i<chars.length;i++){
      if(/[A-Za-zÀ-ÿ0-9]/.test(chars[i])){
        if(best===-1||Math.abs(i-center)<Math.abs(best-center))best=i;
      }
    }
  }
  return best<0?Math.max(0,Math.floor(center)):best;
}

function renderWord(word){
  if(!word)return;
  if(mode==='listen'&&!wordsVisible)return;
  placeholder.style.display='none';
  wordEl.innerHTML='';
  var chars=Array.from(word),fi=focusIndexFor(word);
  for(var i=0;i<chars.length;i++){
    var s=document.createElement('span');
    s.className='char'+(i===fi?' focus':'');
    s.textContent=chars[i];
    wordEl.appendChild(s);
  }
  requestAnimationFrame(function(){
    var f=wordEl.children[fi];
    if(!f)return;
    var center=f.offsetLeft+f.offsetWidth/2;
    wordEl.style.transform='translate('+(-center)+'px,-50%)';
  });
}

function currentWpm(){
  var n=parseInt(wpmNumber.value,10);
  if(!isFinite(n))n=300;
  return Math.max(60,Math.min(1200,n));
}

function updateProgress(){
  var total=words.length,shown=total?Math.min(wordIndex+1,total):0;
  counter.textContent=shown.toLocaleString('nl-NL')+' / '+total.toLocaleString('nl-NL');
  bar.style.width=(total?(shown/total)*100:0)+'%';
  if(mode==='read'){
    var secs=Math.ceil(Math.max(total-shown,0)/currentWpm()*60);
    remaining.textContent=Math.floor(secs/60)+':'+String(secs%60).padStart(2,'0');
  }else remaining.textContent='luisteren';
}

function setSource(text,message,kind){
  stopReading();
  stopSpeaking(false);
  sourceText=text||'';
  sourceKind=kind||sourceKind;
  words=tokenize(sourceText);
  wordIndex=0;
  wordEl.innerHTML='';
  placeholder.style.display='block';
  placeholder.textContent=message||'Klaar.';
  updateProgress();
}

function getReadDelay(word){
  var factor=1;
  if(punctuation.checked){
    if(/[.!?]["')\]]?$/.test(word))factor=1.8;
    else if(/[,;:]["')\]]?$/.test(word))factor=1.3;
  }
  if(word.length>=12)factor*=1.15;
  return 60000/currentWpm()*factor;
}

function readTick(){
  clearTimeout(readTimer);
  if(!readRunning||mode!=='read')return;
  if(wordIndex>=words.length){
    readRunning=false;readStart.textContent='Opnieuw';return;
  }
  renderWord(words[wordIndex]);updateProgress();
  readTimer=setTimeout(function(){wordIndex++;readTick()},getReadDelay(words[wordIndex]));
}

function startReading(){
  stopSpeaking(false);
  if(sourceKind==='text'){
    sourceText=textInput.value;words=tokenize(sourceText);
  }
  if(!words.length){placeholder.textContent='Plak eerst een tekst of open een document.';return}
  if(wordIndex>=words.length)wordIndex=0;
  readRunning=true;readStart.textContent='Pauze';readTick();
}
function stopReading(){
  readRunning=false;clearTimeout(readTimer);readStart.textContent='Start';
}

readStart.addEventListener('click',function(){if(readRunning)stopReading();else startReading()});
readReset.addEventListener('click',function(){
  stopReading();wordIndex=0;updateProgress();wordEl.innerHTML='';
  placeholder.style.display='block';placeholder.textContent='Klaar om opnieuw te beginnen.';
});
wpmRange.addEventListener('input',function(){wpmNumber.value=wpmRange.value;updateProgress()});
wpmNumber.addEventListener('input',function(){
  var n=currentWpm();wpmRange.value=String(Math.round(n/10)*10);updateProgress();
});

function switchMode(next){
  mode=next;stopReading();
  if(next==='read'){
    stopSpeaking(false);
    readTab.classList.add('active');listenTab.classList.remove('active');
    readControls.classList.add('visible');listenControls.classList.remove('visible');
    modeBadge.textContent='Leesmodus';wordEl.style.visibility='visible';
  }else{
    readTab.classList.remove('active');listenTab.classList.add('active');
    readControls.classList.remove('visible');listenControls.classList.add('visible');
    modeBadge.textContent='Luistermodus';
    wordEl.style.visibility=wordsVisible?'visible':'hidden';
    loadVoices();
  }
  updateProgress();
}
readTab.addEventListener('click',function(){switchMode('read')});
listenTab.addEventListener('click',function(){switchMode('listen')});

focusBtn.addEventListener('click',function(){reader.classList.add('focusMode');focusExit.classList.add('show')});
focusExit.addEventListener('click',function(){reader.classList.remove('focusMode');focusExit.classList.remove('show')});

/* -------- stemmen -------- */
function voiceScore(v,locale){
  var score=0,l=(v.lang||'').toLowerCase(),wanted=locale.toLowerCase();
  if(l===wanted)score+=100;else if(l.indexOf(wanted.slice(0,2))===0)score+=50;
  if(v.localService)score+=20;if(v.default)score+=10;
  return score;
}

function loadVoices(){
  if(!('speechSynthesis'in window)){
    voiceSelect.innerHTML='<option value="">Niet beschikbaar</option>';
    listenStart.disabled=true;
    speechNote.textContent='Deze browser biedt geen tekst-naar-spraakfunctie.';
    return;
  }
  allVoices=window.speechSynthesis.getVoices()||[];
  var locale=languageSelect.value;
  filteredVoices=allVoices.filter(function(v){
    var l=(v.lang||'').toLowerCase();
    return l===locale.toLowerCase()||l.indexOf(locale.slice(0,2).toLowerCase()+'-')===0;
  }).sort(function(a,b){
    return voiceScore(b,locale)-voiceScore(a,locale)||a.name.localeCompare(b.name);
  }).slice(0,2);

  voiceSelect.innerHTML='';
  if(!filteredVoices.length){
    var fallback=document.createElement('option');
    fallback.value='';fallback.textContent='Standaardstem van apparaat';voiceSelect.appendChild(fallback);
    speechNote.textContent='De standaardstem voor '+languageSelect.options[languageSelect.selectedIndex].text+' wordt gebruikt.';
  }else{
    filteredVoices.forEach(function(v){
      var opt=document.createElement('option');opt.value=v.voiceURI;opt.textContent=v.name;voiceSelect.appendChild(opt);
    });
    speechNote.textContent='Maximaal twee beschikbare stemmen voor '+languageSelect.options[languageSelect.selectedIndex].text+'.';
  }
  listenStart.disabled=false;
}
languageSelect.addEventListener('change',function(){stopSpeaking(true);loadVoices()});
refreshVoices.addEventListener('click',loadVoices);
if('speechSynthesis'in window){
  window.speechSynthesis.onvoiceschanged=loadVoices;
  setTimeout(loadVoices,100);setTimeout(loadVoices,800);
}
function chosenVoice(){
  var uri=voiceSelect.value;if(!uri)return null;
  for(var i=0;i<filteredVoices.length;i++)if(filteredVoices[i].voiceURI===uri)return filteredVoices[i];
  return null;
}

/* -------- speech -------- */
function makeChunks(text,maxLen){
  maxLen=maxLen||240;
  var clean=(text||'').replace(/\s+/g,' ').trim();
  if(!clean)return[];
  var sentences=clean.match(/[^.!?]+(?:[.!?]+["')\]]*|$)/g)||[clean];
  var result=[],current='';
  function pushLong(s){
    var rest=s.trim();
    while(rest.length>maxLen){
      var cut=rest.lastIndexOf(' ',maxLen);if(cut<80)cut=maxLen;
      result.push(rest.slice(0,cut).trim());rest=rest.slice(cut).trim();
    }
    if(rest)current=rest;
  }
  sentences.forEach(function(raw){
    var s=raw.trim();if(!s)return;
    if(s.length>maxLen){if(current){result.push(current);current=''}pushLong(s);return}
    var candidate=current?current+' '+s:s;
    if(candidate.length<=maxLen)current=candidate;
    else{if(current)result.push(current);current=s}
  });
  if(current)result.push(current);
  return result;
}
function buildWordPositions(chunk){
  var arr=[],re=/\S+/g,m;
  while((m=re.exec(chunk))!==null)arr.push({start:m.index,word:m[0]});
  return arr;
}
function speakChunk(){
  if(!speechRunning||speechPaused)return;
  if(speechChunkIndex>=speechChunks.length){
    speechRunning=false;listenStart.textContent='Voorlezen';listenPause.textContent='Pauze';return;
  }
  var token=speechToken,chunk=speechChunks[speechChunkIndex];
  chunkWordPositions=buildWordPositions(chunk);
  var u=new SpeechSynthesisUtterance(chunk),voice=chosenVoice();
  if(voice)u.voice=voice;
  u.lang=languageSelect.value;u.rate=parseFloat(speechRate.value)||1;u.pitch=1;u.volume=1;
  u.onboundary=function(e){
    if(token!==speechToken)return;
    var ci=e.charIndex||0,local=0;
    for(var i=0;i<chunkWordPositions.length;i++){
      if(chunkWordPositions[i].start<=ci)local=i;else break;
    }
    wordIndex=Math.min(currentChunkWordBase+local,Math.max(words.length-1,0));
    if(wordsVisible&&chunkWordPositions[local])renderWord(chunkWordPositions[local].word);
    updateProgress();
  };
  u.onend=function(){
    if(token!==speechToken||!speechRunning||speechPaused)return;
    currentChunkWordBase+=chunkWordPositions.length;speechChunkIndex++;speakChunk();
  };
  u.onerror=function(e){
    if(token!==speechToken)return;
    if(e.error==='canceled'||e.error==='interrupted')return;
    speechRunning=false;listenStart.textContent='Voorlezen';
    speechNote.textContent='Voorlezen is gestopt: '+(e.error||'onbekende fout')+'.';
  };
  window.speechSynthesis.speak(u);
}
function startSpeaking(){
  if(!('speechSynthesis'in window))return;
  stopReading();
  if(speechPaused){
    speechPaused=false;speechRunning=true;listenPause.textContent='Pauze';listenStart.textContent='Bezig…';speakChunk();return;
  }
  window.speechSynthesis.cancel();speechToken++;
  if(sourceKind==='text'){sourceText=textInput.value;words=tokenize(sourceText)}
  if(!words.length){placeholder.textContent='Plak eerst een tekst of open een document.';return}
  speechChunks=makeChunks(sourceText,240);speechChunkIndex=0;currentChunkWordBase=0;wordIndex=0;
  speechRunning=true;speechPaused=false;listenStart.textContent='Bezig…';listenPause.textContent='Pauze';speakChunk();
}
function pauseSpeaking(){
  if(!speechRunning)return;
  speechToken++;window.speechSynthesis.cancel();
  speechPaused=true;speechRunning=false;listenStart.textContent='Verder';listenPause.textContent='Verder';
}
function stopSpeaking(reset){
  if('speechSynthesis'in window){speechToken++;window.speechSynthesis.cancel()}
  speechRunning=false;speechPaused=false;speechChunks=[];speechChunkIndex=0;currentChunkWordBase=0;
  listenStart.textContent='Voorlezen';listenPause.textContent='Pauze';
  if(reset){wordIndex=0;updateProgress()}
}
listenStart.addEventListener('click',function(){
  if(speechPaused){speechRunning=true;startSpeaking()}else if(!speechRunning)startSpeaking();
});
listenPause.addEventListener('click',function(){
  if(speechPaused){speechRunning=true;startSpeaking()}else pauseSpeaking();
});
listenStop.addEventListener('click',function(){stopSpeaking(true)});
speechRate.addEventListener('input',function(){speechRateValue.textContent=parseFloat(speechRate.value).toFixed(2)+'×'});
toggleWords.addEventListener('click',function(){
  wordsVisible=!wordsVisible;wordEl.style.visibility=wordsVisible?'visible':'hidden';
  toggleWords.textContent=wordsVisible?'Woorden verbergen':'Woorden tonen';
});

/* -------- tekst -------- */
textInput.addEventListener('input',function(){
  if(readRunning||speechRunning)return;
  sourceKind='text';book=null;chapterBox.style.display='none';
  sourceText=textInput.value;words=tokenize(sourceText);wordIndex=0;updateProgress();
});

/* -------- ZIP-hulpfuncties voor EPUB/DOCX/PAGES -------- */
function readFileArrayBuffer(file){
  if(file.arrayBuffer)return file.arrayBuffer();
  return new Promise(function(resolve,reject){
    var r=new FileReader();
    r.onload=function(){resolve(r.result)};
    r.onerror=function(){reject(r.error||new Error('Bestand kon niet worden gelezen.'))};
    r.readAsArrayBuffer(file);
  });
}
function findEOCD(view){
  var min=Math.max(0,view.byteLength-65557);
  for(var i=view.byteLength-22;i>=min;i--)if(view.getUint32(i,true)===0x06054b50)return i;
  throw new Error('Geen geldig ZIP-gebaseerd document.');
}
function zipDirectory(buffer){
  var view=new DataView(buffer),bytes=new Uint8Array(buffer),decoder=new TextDecoder('utf-8');
  var eocd=findEOCD(view),count=view.getUint16(eocd+10,true),offset=view.getUint32(eocd+16,true);
  var entries=new Map(),p=offset;
  for(var n=0;n<count;n++){
    if(view.getUint32(p,true)!==0x02014b50)throw new Error('Documentinhoud is beschadigd.');
    var flags=view.getUint16(p+8,true),method=view.getUint16(p+10,true);
    var csize=view.getUint32(p+20,true),usize=view.getUint32(p+24,true);
    var nlen=view.getUint16(p+28,true),xlen=view.getUint16(p+30,true),clen=view.getUint16(p+32,true);
    var local=view.getUint32(p+42,true);
    var name=decoder.decode(bytes.slice(p+46,p+46+nlen));
    entries.set(name,{flags:flags,method:method,csize:csize,usize:usize,local:local});
    p+=46+nlen+xlen+clen;
  }
  return{buffer:buffer,entries:entries};
}
async function unzipEntry(zip,name){
  var e=zip.entries.get(name);
  if(!e)throw new Error('Ontbrekend documentonderdeel: '+name);
  if(e.flags&1)throw new Error('Dit document is versleuteld.');
  var view=new DataView(zip.buffer),bytes=new Uint8Array(zip.buffer),p=e.local;
  if(view.getUint32(p,true)!==0x04034b50)throw new Error('Documentonderdeel is beschadigd.');
  var nlen=view.getUint16(p+26,true),xlen=view.getUint16(p+28,true),start=p+30+nlen+xlen;
  var compressed=bytes.slice(start,start+e.csize);
  if(e.method===0)return compressed;
  if(e.method!==8)throw new Error('Niet-ondersteunde documentcompressie.');
  if(!('DecompressionStream'in window))throw new Error('Voor dit document is een recente versie van Safari/Chrome/Brave nodig.');
  var stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
async function unzipText(zip,name){
  return new TextDecoder('utf-8').decode(await unzipEntry(zip,name));
}
function xmlEls(doc,name){
  return Array.from(doc.getElementsByTagName('*')).filter(function(el){return el.localName===name});
}
function normalPath(path){
  var out=[];
  path.split('/').forEach(function(p){if(!p||p==='.')return;if(p==='..')out.pop();else out.push(p)});
  return out.join('/');
}
function resolvePath(base,rel){
  var clean=rel.split('#')[0].split('?')[0];
  try{clean=decodeURIComponent(clean)}catch(e){}
  var dir=base.indexOf('/')>=0?base.slice(0,base.lastIndexOf('/')+1):'';
  return normalPath(dir+clean);
}
function htmlText(markup){
  var doc=new DOMParser().parseFromString(markup,'text/html');
  Array.from(doc.querySelectorAll('script,style,svg,noscript,nav')).forEach(function(el){el.remove()});
  var text=(doc.body||doc.documentElement).innerText||'';
  return text.replace(/\u00ad/g,'').replace(/[ \t]+/g,' ').replace(/\n\s*\n+/g,'\n\n').trim();
}

/* -------- EPUB -------- */
async function extractEpub(file){
  var buffer=await readFileArrayBuffer(file),zip=zipDirectory(buffer);
  var container=await unzipText(zip,'META-INF/container.xml');
  var cdoc=new DOMParser().parseFromString(container,'application/xml');
  var root=xmlEls(cdoc,'rootfile')[0];
  if(!root)throw new Error('Geen EPUB-inhoud gevonden.');
  var opfPath=root.getAttribute('full-path');
  var opf=await unzipText(zip,opfPath),odoc=new DOMParser().parseFromString(opf,'application/xml');
  var titleEl=xmlEls(odoc,'title')[0];
  var title=titleEl&&titleEl.textContent.trim()?titleEl.textContent.trim():file.name.replace(/\.epub$/i,'');
  var manifest={};
  xmlEls(odoc,'item').forEach(function(el){
    var id=el.getAttribute('id'),href=el.getAttribute('href');
    if(id&&href)manifest[id]={href:href,type:el.getAttribute('media-type')||''};
  });
  var spine=xmlEls(odoc,'itemref').map(function(el){return el.getAttribute('idref')}).filter(Boolean);
  var chapters=[];
  for(var i=0;i<spine.length;i++){
    var item=manifest[spine[i]];if(!item)continue;
    var path=resolvePath(opfPath,item.href);if(!zip.entries.has(path))continue;
    if(!/html|xhtml/i.test(item.type)&&!/\.(x?html?|htm)$/i.test(path))continue;
    var markup=await unzipText(zip,path),txt=htmlText(markup);if(!txt)continue;
    var hdoc=new DOMParser().parseFromString(markup,'text/html'),h=hdoc.querySelector('h1,h2,h3,title');
    chapters.push({title:(h&&h.textContent.trim())||('Hoofdstuk '+(chapters.length+1)),text:txt});
  }
  if(!chapters.length)throw new Error('Geen leesbare hoofdstukken gevonden.');
  return{title:title,chapters:chapters};
}
function fillChapters(){
  chapterSelect.innerHTML='';
  var all=document.createElement('option');all.value='all';all.textContent='Hele boek';chapterSelect.appendChild(all);
  book.chapters.forEach(function(ch,i){
    var o=document.createElement('option');o.value=String(i);o.textContent=(i+1)+'. '+ch.title;chapterSelect.appendChild(o);
  });
  chapterSelect.value='0';chapterBox.style.display='flex';
}
function loadChapter(){
  if(!book)return;
  var v=chapterSelect.value,text,label;
  if(v==='all'){text=book.chapters.map(function(c){return c.text}).join('\n\n');label=book.title+' — hele boek'}
  else{var ch=book.chapters[parseInt(v,10)];text=ch.text;label=book.title+' — '+ch.title}
  setSource(text,label+' is geladen.','epub');
}
chapterSelect.addEventListener('change',loadChapter);

/* -------- Word .docx -------- */
function docxXmlToText(xml){
  var doc=new DOMParser().parseFromString(xml,'application/xml');
  if(doc.querySelector('parsererror'))throw new Error('Word-document kon niet worden gelezen.');
  var paragraphs=xmlEls(doc,'p'),lines=[];
  paragraphs.forEach(function(p){
    var out='';
    Array.from(p.getElementsByTagName('*')).forEach(function(el){
      if(el.localName==='t')out+=el.textContent||'';
      else if(el.localName==='tab')out+='\t';
      else if(el.localName==='br'||el.localName==='cr')out+='\n';
    });
    out=out.replace(/[ \t]+/g,' ').trim();
    if(out)lines.push(out);
  });
  return lines.join('\n\n').trim();
}
async function extractDocx(file){
  var buffer=await readFileArrayBuffer(file),zip=zipDirectory(buffer);
  if(!zip.entries.has('word/document.xml'))throw new Error('Dit lijkt geen geldig .docx-bestand te zijn.');
  var xml=await unzipText(zip,'word/document.xml'),text=docxXmlToText(xml);
  if(!text)throw new Error('Er is geen leesbare tekst in dit Word-document gevonden.');
  return text;
}

/* -------- PDF -------- */
function ensurePdfEngine(){
  if(!window.pdfjsLib)throw new Error('De PDF-lezer kon niet worden geladen. Controleer de internetverbinding en laad de webapp opnieuw.');
  window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}
async function extractPdfBytes(bytes,label){
  ensurePdfEngine();
  var task=window.pdfjsLib.getDocument({data:bytes});
  var pdf=await task.promise,parts=[];
  for(var p=1;p<=pdf.numPages;p++){
    setStatus('PDF lezen: pagina '+p+' van '+pdf.numPages+'…','');
    var page=await pdf.getPage(p),content=await page.getTextContent(),line='';
    for(var i=0;i<content.items.length;i++){
      var item=content.items[i];
      if(!item||typeof item.str!=='string')continue;
      line+=item.str;
      if(item.hasEOL){parts.push(line.trim());line=''}
      else line+=' ';
    }
    if(line.trim())parts.push(line.trim());
    parts.push('');
  }
  var text=parts.join('\n').replace(/\n{3,}/g,'\n\n').trim();
  if(!text)throw new Error('Deze PDF bevat geen uitleesbare tekst. Het is mogelijk een scan/afbeelding; OCR is niet ingebouwd.');
  return{text:text,pages:pdf.numPages,label:label||'PDF'};
}
async function extractPdfFile(file){
  return extractPdfBytes(new Uint8Array(await readFileArrayBuffer(file)),file.name);
}

/* -------- Pages -------- */
async function extractPages(file){
  var buffer=await readFileArrayBuffer(file),zip;
  try{zip=zipDirectory(buffer)}
  catch(e){throw new Error('Dit Pages-bestand kon niet als documentpakket worden geopend. Exporteer het vanuit Pages als PDF of Word.')}
  var candidates=[];
  zip.entries.forEach(function(v,name){
    var lower=name.toLowerCase();
    if(lower==='quicklook/preview.pdf'||lower.endsWith('/preview.pdf')||lower==='preview.pdf')candidates.unshift(name);
    else if(lower.endsWith('.pdf'))candidates.push(name);
  });
  if(!candidates.length){
    throw new Error('In dit Pages-bestand is geen PDF-voorvertoning gevonden. Exporteer het in Pages als PDF of Word (.docx).');
  }
  var bytes=await unzipEntry(zip,candidates[0]);
  return extractPdfBytes(bytes,file.name+' (Pages-preview)');
}

/* -------- document openen -------- */
function extensionOf(name){
  var m=(name||'').toLowerCase().match(/\.([^.]+)$/);return m?m[1]:'';
}

documentInput.addEventListener('change',async function(){
  var file=documentInput.files&&documentInput.files[0];
  if(!file)return;
  stopReading();stopSpeaking(false);
  chapterBox.style.display='none';book=null;
  setStatus('Document openen…','');
  try{
    var ext=extensionOf(file.name);
    if(ext==='epub'){
      book=await extractEpub(file);
      fillChapters();loadChapter();
      var total=book.chapters.reduce(function(n,c){return n+tokenize(c.text).length},0);
      setStatus('✓ '+book.title+' — '+book.chapters.length+' hoofdstukken, '+total.toLocaleString('nl-NL')+' woorden','ok');
    }else if(ext==='pdf'){
      var pdf=await extractPdfFile(file);
      setSource(pdf.text,file.name+' — '+pdf.pages+' pagina’s geladen.','document');
      setStatus('✓ '+file.name+' — '+pdf.pages+' pagina’s, '+words.length.toLocaleString('nl-NL')+' woorden','ok');
    }else if(ext==='docx'){
      var docxText=await extractDocx(file);
      setSource(docxText,file.name+' is geladen.','document');
      setStatus('✓ '+file.name+' — '+words.length.toLocaleString('nl-NL')+' woorden','ok');
    }else if(ext==='pages'){
      var pages=await extractPages(file);
      setSource(pages.text,file.name+' is via de Pages-PDF-preview geladen.','document');
      setStatus('✓ '+file.name+' — '+pages.pages+' previewpagina’s, '+words.length.toLocaleString('nl-NL')+' woorden','ok');
    }else if(ext==='doc'){
      throw new Error('Het oude Word-formaat .doc wordt niet ondersteund. Sla het document op als .docx of PDF.');
    }else{
      throw new Error('Dit bestandstype wordt niet ondersteund. Kies EPUB, PDF, DOCX of Pages.');
    }
    textInput.value='';
    textInput.placeholder='Document geladen. Plak hier nieuwe tekst om weer naar tekstmodus te gaan.';
  }catch(err){
    setStatus('Kon document niet openen: '+err.message,'err');
  }finally{
    documentInput.value='';
  }
});

/* -------- init -------- */
words=tokenize(sourceText);updateProgress();loadVoices();

if('serviceWorker'in navigator&&(location.protocol==='https:'||location.hostname==='localhost')){
  window.addEventListener('load',function(){
    navigator.serviceWorker.register('./sw.js').catch(function(){});
  });
}

})();