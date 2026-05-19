document.addEventListener('DOMContentLoaded', () => {
    const $ = id => document.getElementById(id);

    // ===== ELEMENTS =====
    const btnFoto = $('btn-foto'), btnHablar = $('btn-hablar'), btnEscribir = $('btn-escribir');
    const btnClearLog = $('btn-clear-log'), btnTheme = $('btn-theme'), btnSettings = $('btn-settings');
    const btnAiReport = $('btn-ai-report'), btnChat = $('btn-chat');
    const cameraModal = $('camera-modal'), cameraFeed = $('camera-feed'), photoCanvas = $('photo-canvas');
    const btnCapturar = $('btn-capturar'), btnCerrarCamara = $('btn-cerrar-camara');
    const manualModal = $('manual-modal'), manualForm = $('manual-form'), btnCerrarManual = $('btn-cerrar-manual');
    const voiceModal = $('voice-modal'), voiceStatus = $('voice-status'), voiceTranscript = $('voice-transcript');
    const btnVoiceSend = $('btn-voice-send'), btnCerrarVoz = $('btn-cerrar-voz');
    const resultModal = $('result-modal'), aiResultDiv = $('ai-result'), resultForm = $('result-form');
    const btnCerrarResultado = $('btn-cerrar-resultado'), qualityContainer = $('quality-container');
    const settingsModal = $('settings-modal'), settingsForm = $('settings-form'), btnCerrarSettings = $('btn-cerrar-settings');
    const profileModal = $('profile-modal'), profileForm = $('profile-form'), btnCerrarProfile = $('btn-cerrar-profile');
    const profileBanner = $('profile-banner'), btnOpenProfile = $('btn-open-profile'), btnEditProfile = $('btn-edit-profile');
    const reportModal = $('report-modal'), reportContent = $('report-content'), btnCerrarReport = $('btn-cerrar-report');
    const chatModal = $('chat-modal'), chatMessages = $('chat-messages'), chatInput = $('chat-input');
    const btnChatSend = $('btn-chat-send'), btnCerrarChat = $('btn-cerrar-chat');
    const foodLogContainer = $('food-log'), emptyLog = $('empty-log');
    const totalProtEl = $('total-prot'), totalCarbEl = $('total-carb'), totalFatEl = $('total-fat');
    const totalFiberEl = $('total-fiber'), totalSodiumEl = $('total-sodium');
    const caloriesConsumed = $('calories-consumed'), caloriesGoalEl = $('calories-goal');
    const progressFill = $('progress-fill'), ringFill = $('ring-fill'), ringCal = $('ring-cal');
    const fiberFill = $('fiber-fill'), sodiumFill = $('sodium-fill');
    const fiberBarText = $('fiber-bar-text'), sodiumBarText = $('sodium-bar-text');
    const waterGlasses = $('water-glasses'), waterCountEl = $('water-count');
    const weekGrid = $('week-grid'), streakCount = $('streak-count'), greeting = $('greeting');
    const tdeeBar = $('tdee-bar'), tdeeValue = $('tdee-value'), tdeeObjective = $('tdee-objective'), tdeeRemaining = $('tdee-remaining');

    const STORAGE_LOG='nutri100_log',STORAGE_WATER='nutri100_water',STORAGE_SETTINGS='nutri100_settings';
    const STORAGE_THEME='nutri100_theme',STORAGE_PROFILE='nutri100_profile',STORAGE_FASTING='nutri100_fasting';
    const STORAGE_SYMPTOMS='nutri100_symptoms',STORAGE_BODY='nutri100_body',STORAGE_PLAN='nutri100_plan';
    const RING_C=326.73,FASTING_C=534.07,FIBER_GOAL=25,SODIUM_LIMIT=2000;

    let stream=null,recognition=null,selectedCat='comida',fastingInterval=null;

    // ===== HELPERS =====
    function getS(){ const s=localStorage.getItem(STORAGE_SETTINGS); return s?JSON.parse(s):{goal:2000,waterLiters:2}; }
    function saveS(s){ localStorage.setItem(STORAGE_SETTINGS,JSON.stringify(s)); }
    function getProfile(){ const p=localStorage.getItem(STORAGE_PROFILE); return p?JSON.parse(p):null; }
    function saveProfile(p){ localStorage.setItem(STORAGE_PROFILE,JSON.stringify(p)); }
    function dayKey(d){ const x=d||new Date(); return STORAGE_LOG+'_'+x.toISOString().slice(0,10); }
    function getLog(d){ const x=localStorage.getItem(dayKey(d)); return x?JSON.parse(x):[]; }
    function saveLog(e,d){ localStorage.setItem(dayKey(d),JSON.stringify(e)); }
    function timeNow(){ return new Date().toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'}); }
    function dateStr(d){ return (d||new Date()).toISOString().slice(0,10); }
    function esc(t){ const d=document.createElement('div'); d.textContent=t; return d.innerHTML; }
    function openModal(m){ m.classList.remove('hidden'); }
    function closeModal(m){ m.classList.add('hidden'); }
    function showToast(msg){ const t=$('toast');t.textContent=msg;t.classList.remove('hidden');t.style.animation='none';t.offsetHeight;t.style.animation='';clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.add('hidden'),2500); }

    async function aiCall(body){ const r=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); const d=await r.json(); if(d.error)throw new Error(d.error); return d.result; }

    // ===== INIT =====
    setGreeting();loadTheme();applyProfile();loadLog();loadWater();renderWeek();updateStreak();loadFasting();loadSymptoms();loadBody();loadPlan();

    // ===== TABS =====
    document.querySelectorAll('.tab').forEach(tab=>{
        tab.addEventListener('click',()=>{
            document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c=>c.classList.remove('active'));
            tab.classList.add('active');
            $('tab-'+tab.dataset.tab).classList.add('active');
        });
    });

    // ===== EVENT LISTENERS =====
    btnFoto.addEventListener('click',openCamera);btnCerrarCamara.addEventListener('click',closeCamera);btnCapturar.addEventListener('click',takePhoto);
    btnEscribir.addEventListener('click',()=>openModal(manualModal));btnCerrarManual.addEventListener('click',()=>closeModal(manualModal));manualForm.addEventListener('submit',handleManualSubmit);
    btnHablar.addEventListener('click',startVoice);btnCerrarVoz.addEventListener('click',stopVoice);btnVoiceSend.addEventListener('click',handleVoiceSend);
    resultForm.addEventListener('submit',handleResultSubmit);btnCerrarResultado.addEventListener('click',()=>closeModal(resultModal));
    btnSettings.addEventListener('click',openSettings);btnCerrarSettings.addEventListener('click',()=>closeModal(settingsModal));settingsForm.addEventListener('submit',handleSettingsSubmit);
    btnTheme.addEventListener('click',toggleTheme);btnClearLog.addEventListener('click',clearLog);
    btnOpenProfile.addEventListener('click',()=>openProfileModal());btnCerrarProfile.addEventListener('click',()=>closeModal(profileModal));
    btnEditProfile.addEventListener('click',()=>{closeModal(settingsModal);openProfileModal();});profileForm.addEventListener('submit',handleProfileSubmit);
    btnAiReport.addEventListener('click',generateAIReport);btnCerrarReport.addEventListener('click',()=>closeModal(reportModal));
    btnChat.addEventListener('click',()=>openModal(chatModal));btnCerrarChat.addEventListener('click',()=>closeModal(chatModal));
    btnChatSend.addEventListener('click',sendChatMsg);chatInput.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendChatMsg();}});
    $('btn-fasting-toggle').addEventListener('click',toggleFasting);$('btn-fasting-reset').addEventListener('click',resetFasting);
    $('btn-generate-plan').addEventListener('click',generatePlan);$('btn-copy-list').addEventListener('click',copyShoppingList);
    $('body-form').addEventListener('submit',handleBodySubmit);
    $('btn-symptom-patterns').addEventListener('click',analyzeSymptomPatterns);

    ['prof-age','prof-weight','prof-height','prof-sex','prof-activity','prof-objective'].forEach(id=>{$(id).addEventListener('input',updateTDEEPreview);$(id).addEventListener('change',updateTDEEPreview);});
    document.querySelectorAll('.cat-btn').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.cat-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');selectedCat=b.dataset.cat;}));
    document.querySelectorAll('.suggestion').forEach(item=>item.addEventListener('click',()=>{addEntry({name:item.dataset.name,cal:+item.dataset.cal,prot:+item.dataset.prot,carb:+item.dataset.carb,fat:+item.dataset.fat,fiber:+(item.dataset.fiber||0),sodium:+(item.dataset.sodium||0),cat:item.dataset.cat||'comida',time:timeNow()});showToast('Añadido');}));
    waterGlasses.addEventListener('click',e=>{const b=e.target.closest('.water-glass');if(b)toggleWater(+b.dataset.index);});
    document.querySelectorAll('.fasting-proto').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.fasting-proto').forEach(x=>x.classList.remove('active'));b.classList.add('active');}));
    document.querySelectorAll('.symptom-btn').forEach(b=>b.addEventListener('click',()=>{b.classList.toggle('active');saveCurrentSymptoms();}));
    document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m);}));

    // ===== GREETING & THEME =====
    function setGreeting(){const h=new Date().getHours();greeting.textContent=h<12?'Buenos días ☀️':h<20?'Buenas tardes 🌤️':'Buenas noches 🌙';}
    function loadTheme(){const t=localStorage.getItem(STORAGE_THEME)||'light';document.documentElement.setAttribute('data-theme',t);btnTheme.textContent=t==='dark'?'☀️':'🌙';}
    function toggleTheme(){const n=document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',n);localStorage.setItem(STORAGE_THEME,n);btnTheme.textContent=n==='dark'?'☀️':'🌙';}

    // ===== TDEE =====
    function calcTDEE(p){let b;if(p.sex==='male')b=10*p.weight+6.25*p.height-5*p.age+5;else b=10*p.weight+6.25*p.height-5*p.age-161;const t=Math.round(b*p.activity);let g;if(p.objective==='lose')g=Math.round(t*0.8);else if(p.objective==='gain')g=Math.round(t*1.15);else g=t;return{bmr:Math.round(b),tdee:t,goal:g};}
    function applyProfile(){const p=getProfile();if(p){profileBanner.style.display='none';tdeeBar.style.display='flex';const{tdee,goal}=calcTDEE(p);const s=getS();s.goal=goal;saveS(s);caloriesGoalEl.textContent=goal;tdeeValue.textContent=tdee+'';tdeeObjective.textContent=goal+'';updateTDEERemaining();}else{profileBanner.style.display='flex';tdeeBar.style.display='none';caloriesGoalEl.textContent=getS().goal;}}
    function updateTDEERemaining(){const c=getLog().reduce((s,e)=>s+(e.cal||0),0);const g=getS().goal;const r=g-c;tdeeRemaining.textContent=(r>=0?r:0)+'';tdeeRemaining.style.color=r<0?'var(--danger)':'';}
    function openProfileModal(){const p=getProfile();if(p){$('prof-age').value=p.age;$('prof-sex').value=p.sex;$('prof-weight').value=p.weight;$('prof-height').value=p.height;$('prof-activity').value=p.activity;$('prof-objective').value=p.objective;}updateTDEEPreview();openModal(profileModal);}
    function updateTDEEPreview(){const a=+$('prof-age').value,w=+$('prof-weight').value,h=+$('prof-height').value;if(!a||!w||!h){$('tdee-preview').classList.add('hidden');return;}const{bmr,tdee,goal}=calcTDEE({age:a,weight:w,height:h,sex:$('prof-sex').value,activity:+$('prof-activity').value,objective:$('prof-objective').value});$('preview-bmr').textContent=bmr+' kcal';$('preview-tdee').textContent=tdee+' kcal';$('preview-goal').textContent=goal+' kcal';$('tdee-preview').classList.remove('hidden');}
    function handleProfileSubmit(e){e.preventDefault();saveProfile({age:+$('prof-age').value,sex:$('prof-sex').value,weight:+$('prof-weight').value,height:+$('prof-height').value,activity:+$('prof-activity').value,objective:$('prof-objective').value});applyProfile();loadLog();closeModal(profileModal);showToast('Perfil guardado');}
    function openSettings(){const s=getS();$('set-goal').value=s.goal;$('set-water').value=s.waterLiters;openModal(settingsModal);}
    function handleSettingsSubmit(e){e.preventDefault();saveS({goal:+$('set-goal').value||2000,waterLiters:+$('set-water').value||2});applyProfile();loadLog();loadWater();closeModal(settingsModal);showToast('Guardado');}

    // ===== QUALITY SCORE =====
    function calcQuality(e){let s=50;const cal=e.cal||0,prot=e.prot||0,carb=e.carb||0,fat=e.fat||0,fiber=e.fiber||0,sodium=e.sodium||0;if(prot>=20)s+=20;else if(prot>=10)s+=10;else if(prot<5)s-=10;if(fiber>=8)s+=20;else if(fiber>=4)s+=10;else if(fiber<=1)s-=10;if(sodium>1000)s-=25;else if(sodium>600)s-=10;else if(sodium<200)s+=5;if(cal>0){const fp=(fat*9)/cal*100;if(fp>50)s-=20;else if(fp>40)s-=10;else if(fp<30)s+=5;}if(cal>900)s-=15;else if(cal>700)s-=5;else if(cal>=200&&cal<=500)s+=5;if(prot>0&&carb>0&&carb/prot<4)s+=5;s=Math.max(0,Math.min(100,s));if(s>=80)return{grade:'A',label:'Excelente',desc:'Plato muy equilibrado',color:'a'};if(s>=65)return{grade:'B',label:'Bueno',desc:'Nutricionalmente correcto',color:'b'};if(s>=45)return{grade:'C',label:'Aceptable',desc:'Puede mejorar',color:'c'};if(s>=25)return{grade:'D',label:'Pobre',desc:'Poco equilibrado',color:'d'};return{grade:'F',label:'Malo',desc:'Muy desequilibrado',color:'f'};}
    function renderQualityBadge(c,e){const q=calcQuality(e);c.innerHTML=`<div class="quality-badge grade-${q.color}"><div class="quality-grade">${q.grade}</div><div><div class="quality-text">${q.label}</div><div class="quality-sub">${q.desc}</div></div></div>`;}

    // ===== CAMERA =====
    async function openCamera(){openModal(cameraModal);try{stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'},audio:false});cameraFeed.srcObject=stream;}catch{showToast('No se pudo acceder a la cámara');closeCamera();}}
    function closeCamera(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}closeModal(cameraModal);}
    function takePhoto(){const ctx=photoCanvas.getContext('2d');const mW=800;let w=cameraFeed.videoWidth,h=cameraFeed.videoHeight;if(w>mW){h=Math.round((mW*h)/w);w=mW;}photoCanvas.width=w;photoCanvas.height=h;ctx.drawImage(cameraFeed,0,0,w,h);closeCamera();processImageWithAI(photoCanvas.toDataURL('image/jpeg',0.8));}

    // ===== AI CALLS =====
    async function processImageWithAI(b64){const o=btnFoto.innerHTML;btnFoto.innerHTML='<span class="btn-icon-lg">⏳</span><div class="btn-text"><strong>Analizando...</strong><small>Espera</small></div>';btnFoto.disabled=true;try{const r=await aiCall({base64Data:b64.split(',')[1]});showAIResult(r);}catch(e){showToast('Error: '+e.message);}finally{btnFoto.innerHTML=o;btnFoto.disabled=false;}}
    async function processTextWithAI(text){btnVoiceSend.textContent='⏳...';btnVoiceSend.disabled=true;try{const r=await aiCall({textData:text});closeModal(voiceModal);showAIResult(r);}catch(e){showToast('Error: '+e.message);}finally{btnVoiceSend.textContent='🤖 Analizar';btnVoiceSend.disabled=false;}}

    function showAIResult(text){aiResultDiv.textContent=text;const p=parseNutrition(text);$('res-name').value=p.name;$('res-cal').value=p.cal;$('res-prot').value=p.prot;$('res-carb').value=p.carb;$('res-fat').value=p.fat;$('res-fiber').value=p.fiber;$('res-sodium').value=p.sodium;renderQualityBadge(qualityContainer,p);openModal(resultModal);}
    function parseNutrition(text){const r={name:'Plato analizado',cal:0,prot:0,carb:0,fat:0,fiber:0,sodium:0};const m=re=>{const x=text.match(re);return x?+x[1]:0;};r.cal=m(/(\d{2,4})\s*(?:kcal|calor[ií]as?)/i);r.prot=m(/prote[ií]na[s]?\s*[:\-]?\s*(\d+)/i)||m(/(\d+)\s*g?\s*(?:de\s+)?prote[ií]na/i);r.carb=m(/carbohidrato[s]?\s*[:\-]?\s*(\d+)/i)||m(/(\d+)\s*g?\s*(?:de\s+)?carbohidrato/i);r.fat=m(/grasa[s]?\s*[:\-]?\s*(\d+)/i)||m(/(\d+)\s*g?\s*(?:de\s+)?grasa/i);r.fiber=m(/fibra\s*[:\-]?\s*(\d+)/i);r.sodium=m(/sodio\s*[:\-]?\s*(\d+)/i);const l=text.split('\n').filter(l=>l.trim());if(l.length&&l[0].replace(/[*#\-]/g,'').trim().length>3)r.name=l[0].replace(/[*#\-]/g,'').trim().slice(0,60);return r;}
    function handleResultSubmit(e){e.preventDefault();addEntry({name:$('res-name').value,cal:+$('res-cal').value||0,prot:+$('res-prot').value||0,carb:+$('res-carb').value||0,fat:+$('res-fat').value||0,fiber:+$('res-fiber').value||0,sodium:+$('res-sodium').value||0,cat:'comida',time:timeNow()});closeModal(resultModal);showToast('Registrado');}
    function handleManualSubmit(e){e.preventDefault();addEntry({name:$('input-name').value,cal:+$('input-cal').value||0,prot:+$('input-prot').value||0,carb:+$('input-carb').value||0,fat:+$('input-fat').value||0,fiber:+$('input-fiber').value||0,sodium:+$('input-sodium').value||0,cat:selectedCat,time:timeNow()});manualForm.reset();document.querySelectorAll('.cat-btn').forEach(b=>b.classList.remove('active'));document.querySelector('.cat-btn[data-cat="comida"]').classList.add('active');selectedCat='comida';closeModal(manualModal);showToast('Registrado');}

    // ===== VOICE =====
    function startVoice(){if(!('webkitSpeechRecognition' in window)&&!('SpeechRecognition' in window)){showToast('No soporta voz');return;}const SR=window.SpeechRecognition||window.webkitSpeechRecognition;recognition=new SR();recognition.lang='es-ES';recognition.continuous=false;recognition.interimResults=true;voiceTranscript.textContent='';btnVoiceSend.classList.add('hidden');voiceStatus.textContent='Escuchando...';openModal(voiceModal);recognition.onresult=e=>{let t='';for(let i=0;i<e.results.length;i++)t+=e.results[i][0].transcript;voiceTranscript.textContent=t;};recognition.onend=()=>{voiceStatus.textContent='Listo';if(voiceTranscript.textContent.trim())btnVoiceSend.classList.remove('hidden');};recognition.onerror=e=>{voiceStatus.textContent=e.error==='no-speech'?'No se detectó voz':'Error: '+e.error;};recognition.start();}
    function stopVoice(){if(recognition){recognition.abort();recognition=null;}closeModal(voiceModal);}
    function handleVoiceSend(){const t=voiceTranscript.textContent.trim();if(t)processTextWithAI(t);}

    // ===== AI REPORT =====
    async function generateAIReport(){const entries=getLog();if(!entries.length){showToast('Registra comidas primero');return;}openModal(reportModal);reportContent.textContent='Analizando...';const t=entries.reduce((a,e)=>({cal:a.cal+(e.cal||0),prot:a.prot+(e.prot||0),carb:a.carb+(e.carb||0),fat:a.fat+(e.fat||0),fiber:a.fiber+(e.fiber||0),sodium:a.sodium+(e.sodium||0)}),{cal:0,prot:0,carb:0,fat:0,fiber:0,sodium:0});const p=getProfile();const g=getS().goal;const meals=entries.map(e=>`${e.name}(${e.cal}kcal)`).join(', ');let pi='';if(p)pi=`${p.sex==='male'?'Hombre':'Mujer'}, ${p.age}a, ${p.weight}kg. Obj: ${p.objective==='lose'?'perder grasa':p.objective==='gain'?'ganar músculo':'mantener'}. `;try{const r=await aiCall({textData:`Nutricionista titulado. ${pi}Hoy comió: ${meals}. Total: ${t.cal}kcal(obj:${g}), P:${t.prot}g, C:${t.carb}g, G:${t.fat}g, Fibra:${t.fiber}g(rec:25g), Sodio:${t.sodium}mg(lim:2000mg). Análisis: 1)Bien 2)Falta/reducir 3)Sugerencia mañana. Breve y amigable.`});reportContent.textContent=r;}catch(e){reportContent.textContent='Error: '+e.message;}}

    // ===== FOOD LOG =====
    const CAT_ICONS={desayuno:'🌅',comida:'☀️',cena:'🌙',snack:'🍎'};
    const Q_COLORS={A:'var(--quality-a)',B:'var(--quality-b)',C:'var(--quality-c)',D:'var(--quality-d)',F:'var(--quality-f)'};
    function addEntry(e){e.id=Date.now();e.quality=calcQuality(e).grade;const entries=getLog();entries.push(e);saveLog(entries);renderLog(entries);updateTotals(entries);renderWeek();updateStreak();updateTDEERemaining();}
    function removeEntry(id){const entries=getLog().filter(e=>e.id!==id);saveLog(entries);renderLog(entries);updateTotals(entries);renderWeek();updateStreak();updateTDEERemaining();}
    function clearLog(){if(!confirm('¿Borrar comidas de hoy?'))return;saveLog([]);renderLog([]);updateTotals([]);renderWeek();updateTDEERemaining();showToast('Borrado');}
    function loadLog(){const e=getLog();renderLog(e);updateTotals(e);}
    function renderLog(entries){foodLogContainer.querySelectorAll('.log-entry').forEach(el=>el.remove());if(!entries.length){emptyLog.classList.remove('hidden');return;}emptyLog.classList.add('hidden');entries.forEach(entry=>{const q=entry.quality||calcQuality(entry).grade;const d=document.createElement('div');d.className='log-entry';d.innerHTML=`<span class="log-cat-icon">${CAT_ICONS[entry.cat]||'🍽️'}</span><span class="log-quality" style="background:${Q_COLORS[q]||Q_COLORS.C}" title="${q}"></span><div class="log-entry-info"><span class="log-entry-name">${esc(entry.name)}</span><span class="log-entry-meta">${entry.time} · P:${entry.prot}g C:${entry.carb}g G:${entry.fat}g</span></div><span class="log-entry-cal">${entry.cal}</span><button class="btn-delete-entry" data-id="${entry.id}">✕</button>`;d.querySelector('.btn-delete-entry').addEventListener('click',()=>removeEntry(entry.id));foodLogContainer.appendChild(d);});}
    function updateTotals(entries){const t=entries.reduce((a,e)=>({cal:a.cal+(e.cal||0),prot:a.prot+(e.prot||0),carb:a.carb+(e.carb||0),fat:a.fat+(e.fat||0),fiber:a.fiber+(e.fiber||0),sodium:a.sodium+(e.sodium||0)}),{cal:0,prot:0,carb:0,fat:0,fiber:0,sodium:0});const g=getS().goal;totalProtEl.textContent=t.prot;totalCarbEl.textContent=t.carb;totalFatEl.textContent=t.fat;totalFiberEl.textContent=t.fiber;totalSodiumEl.textContent=t.sodium;caloriesConsumed.textContent=t.cal;ringCal.textContent=t.cal;const p=Math.min((t.cal/g)*100,100);progressFill.style.width=p+'%';progressFill.classList.toggle('over',t.cal>g);ringFill.style.strokeDashoffset=RING_C-(RING_C*Math.min(t.cal/g,1));ringFill.classList.toggle('over',t.cal>g);fiberFill.style.width=Math.min((t.fiber/FIBER_GOAL)*100,100)+'%';fiberBarText.textContent=`${t.fiber}/${FIBER_GOAL}g`;sodiumFill.style.width=Math.min((t.sodium/SODIUM_LIMIT)*100,100)+'%';sodiumFill.classList.toggle('over',t.sodium>SODIUM_LIMIT);sodiumBarText.textContent=`${t.sodium}/${SODIUM_LIMIT}mg`;}

    // ===== WATER =====
    const GLASS_SIZE=0.25;
    function waterKey(){return STORAGE_WATER+'_'+dateStr();}
    function getWater(){const d=localStorage.getItem(waterKey());return d?JSON.parse(d):0;}
    function saveWater(n){localStorage.setItem(waterKey(),JSON.stringify(n));}
    function toggleWater(i){const c=getWater();saveWater(i+1===c?i:i+1);renderWater(getWater());}
    function loadWater(){buildWaterButtons();renderWater(getWater());}
    function buildWaterButtons(){const l=getS().waterLiters||2;const tot=Math.round(l/GLASS_SIZE);waterGlasses.innerHTML='';for(let i=0;i<tot;i++){const b=document.createElement('button');b.className='water-glass';b.dataset.index=i;b.textContent='💧';waterGlasses.appendChild(b);}}
    function renderWater(c){const l=getS().waterLiters||2;waterCountEl.textContent=`${(c*GLASS_SIZE).toFixed(2).replace(/\.?0+$/,'')} / ${l} L`;waterGlasses.querySelectorAll('.water-glass').forEach((b,i)=>b.classList.toggle('filled',i<c));}

    // ===== WEEK & STREAK =====
    function renderWeek(){weekGrid.innerHTML='';const today=new Date(),dn=['D','L','M','X','J','V','S'];for(let i=6;i>=0;i--){const d=new Date(today);d.setDate(d.getDate()-i);const e=getLog(d);const tc=e.reduce((s,x)=>s+(x.cal||0),0);const div=document.createElement('div');div.className='week-day'+(i===0?' today':'')+(e.length?' has-data':'');div.innerHTML=`<span class="week-day-label">${dn[d.getDay()]}</span><span class="week-day-num">${d.getDate()}</span><span class="week-day-cal">${e.length?tc:'—'}</span>`;weekGrid.appendChild(div);}}
    function updateStreak(){let s=0;const d=new Date();d.setDate(d.getDate()-1);while(getLog(d).length>0){s++;d.setDate(d.getDate()-1);}if(getLog().length>0)s++;streakCount.textContent=s;}

    // ===== FASTING =====
    function getFasting(){const d=localStorage.getItem(STORAGE_FASTING);return d?JSON.parse(d):null;}
    function saveFasting(f){localStorage.setItem(STORAGE_FASTING,JSON.stringify(f));}

    function toggleFasting(){
        const f=getFasting();
        if(f&&f.active){f.active=false;f.endTime=Date.now();const hist=JSON.parse(localStorage.getItem(STORAGE_FASTING+'_hist')||'[]');hist.unshift({start:f.startTime,end:f.endTime,hours:((f.endTime-f.startTime)/3600000).toFixed(1)});if(hist.length>10)hist.pop();localStorage.setItem(STORAGE_FASTING+'_hist',JSON.stringify(hist));saveFasting(f);$('btn-fasting-toggle').textContent='▶️ Iniciar Ayuno';showToast('Ayuno terminado');renderFastingHistory();}
        else{const proto=document.querySelector('.fasting-proto.active');saveFasting({active:true,startTime:Date.now(),fastH:+proto.dataset.fast,eatH:+proto.dataset.eat});$('btn-fasting-toggle').textContent='⏹️ Terminar Ayuno';showToast('Ayuno iniciado');}
        updateFastingUI();
    }

    function resetFasting(){saveFasting(null);clearInterval(fastingInterval);fastingInterval=null;$('fasting-time').textContent='00:00:00';$('fasting-state').textContent='Sin iniciar';$('fasting-start-time').textContent='—';$('fasting-end-time').textContent='—';$('fasting-eat-window').textContent='—';$('fasting-ring-fill').style.strokeDashoffset=FASTING_C;$('fasting-ring-fill').classList.remove('eating');$('btn-fasting-toggle').textContent='▶️ Iniciar Ayuno';}

    function loadFasting(){updateFastingUI();renderFastingHistory();}

    function updateFastingUI(){
        const f=getFasting();if(!f||!f.active){if(fastingInterval){clearInterval(fastingInterval);fastingInterval=null;}return;}
        const startDate=new Date(f.startTime);const fastEnd=new Date(f.startTime+f.fastH*3600000);const eatEnd=new Date(f.startTime+(f.fastH+f.eatH)*3600000);
        $('fasting-start-time').textContent=startDate.toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});
        $('fasting-end-time').textContent=fastEnd.toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});
        $('fasting-eat-window').textContent=fastEnd.toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'})+' - '+eatEnd.toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'});
        $('btn-fasting-toggle').textContent='⏹️ Terminar Ayuno';

        if(fastingInterval)clearInterval(fastingInterval);
        fastingInterval=setInterval(()=>{
            const now=Date.now();const elapsed=(now-f.startTime)/1000;const totalS=(f.fastH+f.eatH)*3600;const fastS=f.fastH*3600;
            const isFasting=elapsed<fastS;
            const phaseElapsed=isFasting?elapsed:elapsed-fastS;const phaseTotal=isFasting?fastS:f.eatH*3600;
            const remaining=Math.max(0,phaseTotal-phaseElapsed);
            const h=Math.floor(remaining/3600);const m=Math.floor((remaining%3600)/60);const s=Math.floor(remaining%60);
            $('fasting-time').textContent=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            $('fasting-state').textContent=isFasting?'🔒 Ayunando':'🍽️ Ventana de comida';
            const pct=Math.min(elapsed/totalS,1);$('fasting-ring-fill').style.strokeDashoffset=FASTING_C-(FASTING_C*pct);
            $('fasting-ring-fill').classList.toggle('eating',!isFasting);
            if(elapsed>=totalS){clearInterval(fastingInterval);$('fasting-state').textContent='✅ Ciclo completado';$('fasting-time').textContent='00:00:00';}
        },1000);
    }

    function renderFastingHistory(){const hist=JSON.parse(localStorage.getItem(STORAGE_FASTING+'_hist')||'[]');const c=$('fasting-history');c.innerHTML=hist.length?'<h3 class="section-title" style="margin-top:8px">Historial</h3>':'';hist.forEach(h=>{const d=new Date(h.start);c.innerHTML+=`<div class="fasting-entry"><span>${d.toLocaleDateString('es',{day:'numeric',month:'short'})}</span><span>${h.hours}h ayunadas</span></div>`;});}

    // ===== SYMPTOMS DIARY =====
    function symptomKey(){return STORAGE_SYMPTOMS+'_'+dateStr();}
    function getSymptoms(){const d=localStorage.getItem(symptomKey());return d?JSON.parse(d):[];}
    function saveSymptoms(s){localStorage.setItem(symptomKey(),JSON.stringify(s));}

    function saveCurrentSymptoms(){
        const active=[];document.querySelectorAll('.symptom-btn.active').forEach(b=>active.push({symptom:b.dataset.symptom,emoji:b.dataset.emoji,time:timeNow()}));
        saveSymptoms(active);renderSymptomLog();
    }

    function loadSymptoms(){
        const saved=getSymptoms();
        document.querySelectorAll('.symptom-btn').forEach(b=>{b.classList.toggle('active',saved.some(s=>s.symptom===b.dataset.symptom));});
        renderSymptomLog();
    }

    function renderSymptomLog(){const s=getSymptoms();const c=$('symptom-log');c.textContent=s.length?'Registrado: '+s.map(x=>x.emoji).join(' '):'';}

    async function analyzeSymptomPatterns(){
        const days=[];for(let i=0;i<14;i++){const d=new Date();d.setDate(d.getDate()-i);const sk=STORAGE_SYMPTOMS+'_'+d.toISOString().slice(0,10);const sym=localStorage.getItem(sk);const food=getLog(d);if(sym||food.length){days.push({date:d.toLocaleDateString('es',{day:'numeric',month:'short'}),symptoms:sym?JSON.parse(sym).map(s=>s.symptom).join(','):'ninguno',food:food.map(f=>f.name).join(', ')||'nada'});}}
        if(days.length<3){showToast('Necesitas al menos 3 días de datos');return;}
        openModal(reportModal);reportContent.textContent='Buscando patrones...';
        const data=days.map(d=>`${d.date}: comió[${d.food}] síntomas[${d.symptoms}]`).join('; ');
        try{const r=await aiCall({textData:`Nutricionista experto. Analiza estos datos de 2 semanas del paciente y busca patrones entre comidas y síntomas (posibles intolerancias, relaciones comida-malestar). Datos: ${data}. Da conclusiones breves: 1)Patrones detectados 2)Posibles intolerancias 3)Recomendación. Sé clínico pero amigable.`});reportContent.textContent=r;}catch(e){reportContent.textContent='Error: '+e.message;}
    }

    // ===== MEAL PLAN =====
    function loadPlan(){const p=localStorage.getItem(STORAGE_PLAN);if(p){const data=JSON.parse(p);$('plan-result').textContent=data.plan;$('plan-result').classList.remove('hidden');if(data.list){$('shopping-section').style.display='';$('shopping-list').textContent=data.list;}}}

    async function generatePlan(){
        const btn=$('btn-generate-plan');btn.textContent='⏳ Generando...';btn.disabled=true;
        const prefs=$('plan-prefs').value;const profile=getProfile();const goal=getS().goal;
        let pi='';if(profile)pi=`${profile.sex==='male'?'Hombre':'Mujer'}, ${profile.age}a, ${profile.weight}kg, obj: ${profile.objective==='lose'?'déficit':profile.objective==='gain'?'superávit':'mantenimiento'}. `;
        try{
            const plan=await aiCall({textData:`Nutricionista titulado. ${pi}Objetivo: ${goal}kcal/día. Preferencias: ${prefs||'ninguna'}. Genera un plan semanal (lunes a domingo) con desayuno, comida, cena y snack. Para cada comida pon nombre y kcal aproximadas. Formato limpio por días.`});
            $('plan-result').textContent=plan;$('plan-result').classList.remove('hidden');
            const list=await aiCall({textData:`Genera una lista de la compra agrupada por secciones del supermercado (🥬Frutería, 🥩Carnicería/Pescadería, 🥛Lácteos, 🥫Despensa, 🧊Congelados, 🍞Panadería) para este plan semanal: ${plan.slice(0,1500)}. Solo la lista, sin explicación.`});
            $('shopping-section').style.display='';$('shopping-list').textContent=list;
            localStorage.setItem(STORAGE_PLAN,JSON.stringify({plan,list,date:dateStr()}));
        }catch(e){showToast('Error: '+e.message);}
        finally{btn.textContent='🤖 Generar Plan Semanal';btn.disabled=false;}
    }

    function copyShoppingList(){const t=$('shopping-list').textContent;navigator.clipboard.writeText(t).then(()=>showToast('Lista copiada')).catch(()=>showToast('No se pudo copiar'));}

    // ===== BODY PROGRESS =====
    function bodyKey(){return STORAGE_BODY;}
    function getBody(){const d=localStorage.getItem(bodyKey());return d?JSON.parse(d):[];}
    function saveBody(b){localStorage.setItem(bodyKey(),JSON.stringify(b));}

    function handleBodySubmit(e){
        e.preventDefault();
        const w=+$('body-weight').value,waist=+$('body-waist').value,hip=+$('body-hip').value;
        if(!w){showToast('Introduce al menos el peso');return;}
        const entries=getBody();entries.push({date:dateStr(),weight:w,waist:waist||null,hip:hip||null});
        if(entries.length>100)entries.shift();
        saveBody(entries);$('body-form').reset();loadBody();showToast('Medidas registradas');
    }

    function loadBody(){
        const entries=getBody();renderBodyChart(entries);renderBodyHistory(entries);
    }

    function renderBodyChart(entries){
        const c=$('body-chart');c.innerHTML='';
        const last=entries.slice(-14);if(!last.length){c.innerHTML='<p class="empty-state">Sin datos aún</p>';return;}
        const maxW=Math.max(...last.map(e=>e.weight));const minW=Math.min(...last.map(e=>e.weight));const range=maxW-minW||1;
        last.forEach(e=>{const pct=20+((e.weight-minW)/range)*80;const d=document.createElement('div');d.className='body-bar-group';d.innerHTML=`<span class="body-bar-val">${e.weight}</span><div class="body-bar" style="height:${pct}px"></div><span class="body-bar-label">${e.date.slice(5)}</span>`;c.appendChild(d);});
    }

    function renderBodyHistory(entries){
        const c=$('body-history');c.innerHTML='';
        entries.slice(-10).reverse().forEach(e=>{
            const d=document.createElement('div');d.className='body-entry';
            d.innerHTML=`<span class="body-entry-date">${e.date}</span><span>${e.weight}kg${e.waist?' · Cint:'+e.waist+'cm':''}${e.hip?' · Cad:'+e.hip+'cm':''}</span>`;c.appendChild(d);
        });
    }

    // ===== CHAT =====
    async function sendChatMsg(){
        const text=chatInput.value.trim();if(!text)return;
        chatInput.value='';
        const userDiv=document.createElement('div');userDiv.className='chat-msg user';userDiv.textContent=text;chatMessages.appendChild(userDiv);
        const loadDiv=document.createElement('div');loadDiv.className='chat-msg bot loading';loadDiv.textContent='Pensando...';chatMessages.appendChild(loadDiv);
        chatMessages.scrollTop=chatMessages.scrollHeight;
        try{
            const profile=getProfile();let ctx='';if(profile)ctx=`Contexto: ${profile.sex==='male'?'Hombre':'Mujer'}, ${profile.age}a, ${profile.weight}kg, ${profile.height}cm. `;
            const r=await aiCall({textData:`Eres un nutricionista titulado amigable. ${ctx}Responde esta pregunta sobre nutrición/salud: "${text}". Sé preciso, breve y práctico.`});
            loadDiv.textContent=r;loadDiv.classList.remove('loading');
        }catch(e){loadDiv.textContent='Error: '+e.message;loadDiv.classList.remove('loading');}
        chatMessages.scrollTop=chatMessages.scrollHeight;
    }

    // ===== PWA =====
    if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
});
