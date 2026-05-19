document.addEventListener('DOMContentLoaded', () => {

    const $ = id => document.getElementById(id);

    // ===== ELEMENTS =====
    const btnFoto = $('btn-foto'), btnHablar = $('btn-hablar'), btnEscribir = $('btn-escribir');
    const btnClearLog = $('btn-clear-log'), btnTheme = $('btn-theme'), btnSettings = $('btn-settings');
    const btnAiReport = $('btn-ai-report');

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

    const STORAGE_LOG = 'nutri100_log', STORAGE_WATER = 'nutri100_water';
    const STORAGE_SETTINGS = 'nutri100_settings', STORAGE_THEME = 'nutri100_theme';
    const STORAGE_PROFILE = 'nutri100_profile';
    const RING_CIRCUMFERENCE = 326.73;
    const FIBER_GOAL = 25, SODIUM_LIMIT = 2000;

    let stream = null, recognition = null, selectedCat = 'comida';

    // ===== SETTINGS & PROFILE =====
    function getSettings() {
        const s = localStorage.getItem(STORAGE_SETTINGS);
        return s ? JSON.parse(s) : { goal: 2000, waterLiters: 2 };
    }
    function saveSettings(s) { localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(s)); }
    function getProfile() {
        const p = localStorage.getItem(STORAGE_PROFILE);
        return p ? JSON.parse(p) : null;
    }
    function saveProfile(p) { localStorage.setItem(STORAGE_PROFILE, JSON.stringify(p)); }

    // ===== TDEE Calculator (Mifflin-St Jeor) =====
    function calcTDEE(profile) {
        let bmr;
        if (profile.sex === 'male') {
            bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
        } else {
            bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
        }
        const tdee = Math.round(bmr * profile.activity);
        let goal;
        if (profile.objective === 'lose') goal = Math.round(tdee * 0.80);
        else if (profile.objective === 'gain') goal = Math.round(tdee * 1.15);
        else goal = tdee;
        return { bmr: Math.round(bmr), tdee, goal };
    }

    // ===== QUALITY SCORE (Nutri-Score inspired) =====
    function calcQuality(entry) {
        let score = 50;
        const cal = entry.cal || 0, prot = entry.prot || 0, carb = entry.carb || 0;
        const fat = entry.fat || 0, fiber = entry.fiber || 0, sodium = entry.sodium || 0;

        // Protein bonus (>15g = great)
        if (prot >= 20) score += 20;
        else if (prot >= 10) score += 10;
        else if (prot < 5) score -= 10;

        // Fiber bonus (>5g per meal = great)
        if (fiber >= 8) score += 20;
        else if (fiber >= 4) score += 10;
        else if (fiber <= 1) score -= 10;

        // Sodium penalty (>800mg per meal = bad)
        if (sodium > 1000) score -= 25;
        else if (sodium > 600) score -= 10;
        else if (sodium < 200) score += 5;

        // Fat ratio (>40% cal from fat = bad)
        if (cal > 0) {
            const fatPct = (fat * 9) / cal * 100;
            if (fatPct > 50) score -= 20;
            else if (fatPct > 40) score -= 10;
            else if (fatPct < 30) score += 5;
        }

        // Calorie density (>700kcal single meal = penalty)
        if (cal > 900) score -= 15;
        else if (cal > 700) score -= 5;
        else if (cal >= 200 && cal <= 500) score += 5;

        // Carb-protein balance
        if (prot > 0 && carb > 0 && carb / prot < 4) score += 5;

        score = Math.max(0, Math.min(100, score));

        if (score >= 80) return { grade: 'A', label: 'Excelente', desc: 'Plato muy equilibrado', color: 'a' };
        if (score >= 65) return { grade: 'B', label: 'Bueno', desc: 'Nutricionalmente correcto', color: 'b' };
        if (score >= 45) return { grade: 'C', label: 'Aceptable', desc: 'Puede mejorar', color: 'c' };
        if (score >= 25) return { grade: 'D', label: 'Pobre', desc: 'Poco equilibrado', color: 'd' };
        return { grade: 'F', label: 'Malo', desc: 'Muy desequilibrado', color: 'f' };
    }

    function renderQualityBadge(container, entry) {
        const q = calcQuality(entry);
        container.innerHTML = `
            <div class="quality-badge grade-${q.color}">
                <div class="quality-grade">${q.grade}</div>
                <div>
                    <div class="quality-text">${q.label}</div>
                    <div class="quality-sub">${q.desc}</div>
                </div>
            </div>
        `;
    }

    // ===== INIT =====
    setGreeting(); loadTheme(); applyProfile(); loadLog(); loadWater(); renderWeek(); updateStreak();

    // ===== EVENT LISTENERS =====
    btnFoto.addEventListener('click', openCamera);
    btnCerrarCamara.addEventListener('click', closeCamera);
    btnCapturar.addEventListener('click', takePhoto);
    btnEscribir.addEventListener('click', () => openModal(manualModal));
    btnCerrarManual.addEventListener('click', () => closeModal(manualModal));
    manualForm.addEventListener('submit', handleManualSubmit);
    btnHablar.addEventListener('click', startVoice);
    btnCerrarVoz.addEventListener('click', stopVoice);
    btnVoiceSend.addEventListener('click', handleVoiceSend);
    resultForm.addEventListener('submit', handleResultSubmit);
    btnCerrarResultado.addEventListener('click', () => closeModal(resultModal));
    btnSettings.addEventListener('click', openSettings);
    btnCerrarSettings.addEventListener('click', () => closeModal(settingsModal));
    settingsForm.addEventListener('submit', handleSettingsSubmit);
    btnTheme.addEventListener('click', toggleTheme);
    btnClearLog.addEventListener('click', clearLog);
    btnOpenProfile.addEventListener('click', () => openProfileModal());
    btnCerrarProfile.addEventListener('click', () => closeModal(profileModal));
    btnEditProfile.addEventListener('click', () => { closeModal(settingsModal); openProfileModal(); });
    profileForm.addEventListener('submit', handleProfileSubmit);
    btnAiReport.addEventListener('click', generateAIReport);
    btnCerrarReport.addEventListener('click', () => closeModal(reportModal));

    // Live TDEE preview
    ['prof-age', 'prof-weight', 'prof-height', 'prof-sex', 'prof-activity', 'prof-objective'].forEach(id => {
        $(id).addEventListener('input', updateTDEEPreview);
        $(id).addEventListener('change', updateTDEEPreview);
    });

    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedCat = btn.dataset.cat;
        });
    });

    document.querySelectorAll('.suggestion').forEach(item => {
        item.addEventListener('click', () => {
            addEntry({
                name: item.dataset.name, cal: +item.dataset.cal, prot: +item.dataset.prot,
                carb: +item.dataset.carb, fat: +item.dataset.fat,
                fiber: +(item.dataset.fiber || 0), sodium: +(item.dataset.sodium || 0),
                cat: item.dataset.cat || 'comida', time: timeNow()
            });
            showToast('Añadido al registro');
        });
    });

    waterGlasses.addEventListener('click', e => {
        const btn = e.target.closest('.water-glass');
        if (btn) toggleWater(+btn.dataset.index);
    });

    document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) closeModal(m); }));

    // ===== GREETING =====
    function setGreeting() {
        const h = new Date().getHours();
        greeting.textContent = h < 12 ? 'Buenos días ☀️' : h < 20 ? 'Buenas tardes 🌤️' : 'Buenas noches 🌙';
    }

    // ===== THEME =====
    function loadTheme() {
        const t = localStorage.getItem(STORAGE_THEME) || 'light';
        document.documentElement.setAttribute('data-theme', t);
        btnTheme.textContent = t === 'dark' ? '☀️' : '🌙';
    }
    function toggleTheme() {
        const n = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', n);
        localStorage.setItem(STORAGE_THEME, n);
        btnTheme.textContent = n === 'dark' ? '☀️' : '🌙';
    }

    // ===== PROFILE =====
    function applyProfile() {
        const profile = getProfile();
        if (profile) {
            profileBanner.style.display = 'none';
            tdeeBar.style.display = 'flex';
            const { bmr, tdee, goal } = calcTDEE(profile);
            const settings = getSettings();
            settings.goal = goal;
            saveSettings(settings);
            caloriesGoalEl.textContent = goal;
            tdeeValue.textContent = tdee + ' kcal';
            tdeeObjective.textContent = goal + ' kcal';
            updateTDEERemaining();
        } else {
            profileBanner.style.display = 'flex';
            tdeeBar.style.display = 'none';
            caloriesGoalEl.textContent = getSettings().goal;
        }
    }

    function updateTDEERemaining() {
        const entries = getLog();
        const consumed = entries.reduce((s, e) => s + (e.cal || 0), 0);
        const goal = getSettings().goal;
        const remaining = goal - consumed;
        tdeeRemaining.textContent = (remaining >= 0 ? remaining : 0) + ' kcal';
        tdeeRemaining.style.color = remaining < 0 ? 'var(--danger)' : '';
    }

    function openProfileModal() {
        const p = getProfile();
        if (p) {
            $('prof-age').value = p.age;
            $('prof-sex').value = p.sex;
            $('prof-weight').value = p.weight;
            $('prof-height').value = p.height;
            $('prof-activity').value = p.activity;
            $('prof-objective').value = p.objective;
        }
        updateTDEEPreview();
        openModal(profileModal);
    }

    function updateTDEEPreview() {
        const age = +$('prof-age').value, weight = +$('prof-weight').value, height = +$('prof-height').value;
        if (!age || !weight || !height) { $('tdee-preview').classList.add('hidden'); return; }
        const profile = {
            age, weight, height,
            sex: $('prof-sex').value,
            activity: +$('prof-activity').value,
            objective: $('prof-objective').value
        };
        const { bmr, tdee, goal } = calcTDEE(profile);
        $('preview-bmr').textContent = bmr + ' kcal';
        $('preview-tdee').textContent = tdee + ' kcal';
        $('preview-goal').textContent = goal + ' kcal';
        $('tdee-preview').classList.remove('hidden');
    }

    function handleProfileSubmit(e) {
        e.preventDefault();
        const profile = {
            age: +$('prof-age').value, sex: $('prof-sex').value,
            weight: +$('prof-weight').value, height: +$('prof-height').value,
            activity: +$('prof-activity').value, objective: $('prof-objective').value
        };
        saveProfile(profile);
        applyProfile();
        loadLog();
        closeModal(profileModal);
        showToast('Perfil guardado');
    }

    // ===== SETTINGS =====
    function openSettings() {
        const s = getSettings();
        $('set-goal').value = s.goal;
        $('set-water').value = s.waterLiters;
        openModal(settingsModal);
    }
    function handleSettingsSubmit(e) {
        e.preventDefault();
        saveSettings({ goal: +$('set-goal').value || 2000, waterLiters: +$('set-water').value || 2 });
        applyProfile();
        loadLog(); loadWater();
        closeModal(settingsModal);
        showToast('Ajustes guardados');
    }

    // ===== MODALS =====
    function openModal(m) { m.classList.remove('hidden'); }
    function closeModal(m) { m.classList.add('hidden'); }

    // ===== CAMERA =====
    async function openCamera() {
        openModal(cameraModal);
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
            cameraFeed.srcObject = stream;
        } catch { showToast('No se pudo acceder a la cámara'); closeCamera(); }
    }
    function closeCamera() {
        if (stream) { stream.getTracks().forEach(t => t.stop()); stream = null; }
        closeModal(cameraModal);
    }
    function takePhoto() {
        const ctx = photoCanvas.getContext('2d');
        const maxW = 800;
        let w = cameraFeed.videoWidth, h = cameraFeed.videoHeight;
        if (w > maxW) { h = Math.round((maxW * h) / w); w = maxW; }
        photoCanvas.width = w; photoCanvas.height = h;
        ctx.drawImage(cameraFeed, 0, 0, w, h);
        closeCamera();
        processImageWithAI(photoCanvas.toDataURL('image/jpeg', 0.8));
    }

    // ===== AI: IMAGE =====
    async function processImageWithAI(base64) {
        const orig = btnFoto.innerHTML;
        btnFoto.innerHTML = '<span class="btn-icon-lg">⏳</span><div class="btn-text"><strong>Analizando...</strong><small>Espera un momento</small></div>';
        btnFoto.disabled = true;
        try {
            const res = await fetch('/api/analyze', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ base64Data: base64.split(',')[1] })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            showAIResult(data.result);
        } catch (err) { showToast('Error: ' + err.message); }
        finally { btnFoto.innerHTML = orig; btnFoto.disabled = false; }
    }

    // ===== AI: TEXT =====
    async function processTextWithAI(text) {
        btnVoiceSend.textContent = '⏳ Analizando...';
        btnVoiceSend.disabled = true;
        try {
            const res = await fetch('/api/analyze', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ textData: text })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            closeModal(voiceModal);
            showAIResult(data.result);
        } catch (err) { showToast('Error: ' + err.message); }
        finally { btnVoiceSend.textContent = '🤖 Analizar con IA'; btnVoiceSend.disabled = false; }
    }

    // ===== AI RESULT =====
    function showAIResult(text) {
        aiResultDiv.textContent = text;
        const p = parseNutrition(text);
        $('res-name').value = p.name;
        $('res-cal').value = p.cal;
        $('res-prot').value = p.prot;
        $('res-carb').value = p.carb;
        $('res-fat').value = p.fat;
        $('res-fiber').value = p.fiber;
        $('res-sodium').value = p.sodium;
        renderQualityBadge(qualityContainer, p);
        openModal(resultModal);
    }

    function parseNutrition(text) {
        const r = { name: 'Plato analizado', cal: 0, prot: 0, carb: 0, fat: 0, fiber: 0, sodium: 0 };
        const m = (re) => { const x = text.match(re); return x ? +x[1] : 0; };
        r.cal = m(/(\d{2,4})\s*(?:kcal|calor[ií]as?)/i);
        r.prot = m(/prote[ií]na[s]?\s*[:\-]?\s*(\d+)/i) || m(/(\d+)\s*g?\s*(?:de\s+)?prote[ií]na/i);
        r.carb = m(/carbohidrato[s]?\s*[:\-]?\s*(\d+)/i) || m(/(\d+)\s*g?\s*(?:de\s+)?carbohidrato/i);
        r.fat = m(/grasa[s]?\s*[:\-]?\s*(\d+)/i) || m(/(\d+)\s*g?\s*(?:de\s+)?grasa/i);
        r.fiber = m(/fibra\s*[:\-]?\s*(\d+)/i) || m(/(\d+)\s*g?\s*(?:de\s+)?fibra/i);
        r.sodium = m(/sodio\s*[:\-]?\s*(\d+)/i) || m(/(\d+)\s*mg?\s*(?:de\s+)?sodio/i);
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length && lines[0].replace(/[*#\-]/g, '').trim().length > 3) {
            r.name = lines[0].replace(/[*#\-]/g, '').trim().slice(0, 60);
        }
        return r;
    }

    function handleResultSubmit(e) {
        e.preventDefault();
        addEntry({
            name: $('res-name').value, cal: +$('res-cal').value || 0,
            prot: +$('res-prot').value || 0, carb: +$('res-carb').value || 0,
            fat: +$('res-fat').value || 0, fiber: +$('res-fiber').value || 0,
            sodium: +$('res-sodium').value || 0, cat: 'comida', time: timeNow()
        });
        closeModal(resultModal);
        showToast('Comida registrada');
    }

    // ===== MANUAL ENTRY =====
    function handleManualSubmit(e) {
        e.preventDefault();
        addEntry({
            name: $('input-name').value, cal: +$('input-cal').value || 0,
            prot: +$('input-prot').value || 0, carb: +$('input-carb').value || 0,
            fat: +$('input-fat').value || 0, fiber: +$('input-fiber').value || 0,
            sodium: +$('input-sodium').value || 0, cat: selectedCat, time: timeNow()
        });
        manualForm.reset();
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
        document.querySelector('.cat-btn[data-cat="comida"]').classList.add('active');
        selectedCat = 'comida';
        closeModal(manualModal);
        showToast('Comida registrada');
    }

    // ===== VOICE =====
    function startVoice() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) { showToast('Tu navegador no soporta voz'); return; }
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SR();
        recognition.lang = 'es-ES'; recognition.continuous = false; recognition.interimResults = true;
        voiceTranscript.textContent = '';
        btnVoiceSend.classList.add('hidden');
        voiceStatus.textContent = 'Escuchando...';
        openModal(voiceModal);
        recognition.onresult = e => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; voiceTranscript.textContent = t; };
        recognition.onend = () => { voiceStatus.textContent = 'Listo'; if (voiceTranscript.textContent.trim()) btnVoiceSend.classList.remove('hidden'); };
        recognition.onerror = e => { voiceStatus.textContent = e.error === 'no-speech' ? 'No se detectó voz' : 'Error: ' + e.error; };
        recognition.start();
    }
    function stopVoice() { if (recognition) { recognition.abort(); recognition = null; } closeModal(voiceModal); }
    function handleVoiceSend() { const t = voiceTranscript.textContent.trim(); if (t) processTextWithAI(t); }

    // ===== AI DAILY REPORT =====
    async function generateAIReport() {
        const entries = getLog();
        if (!entries.length) { showToast('Registra comidas primero para generar el informe'); return; }

        openModal(reportModal);
        reportContent.textContent = 'Analizando tu día con IA...';

        const totals = entries.reduce((a, e) => {
            a.cal += e.cal || 0; a.prot += e.prot || 0; a.carb += e.carb || 0;
            a.fat += e.fat || 0; a.fiber += e.fiber || 0; a.sodium += e.sodium || 0;
            return a;
        }, { cal: 0, prot: 0, carb: 0, fat: 0, fiber: 0, sodium: 0 });

        const profile = getProfile();
        const goal = getSettings().goal;
        const meals = entries.map(e => `${e.name} (${e.cal}kcal, P:${e.prot}g, C:${e.carb}g, G:${e.fat}g, Fibra:${e.fiber}g, Sodio:${e.sodium}mg)`).join('; ');

        let profileInfo = '';
        if (profile) {
            profileInfo = `El usuario es ${profile.sex === 'male' ? 'hombre' : 'mujer'}, ${profile.age} años, ${profile.weight}kg, ${profile.height}cm. Objetivo: ${profile.objective === 'lose' ? 'perder grasa' : profile.objective === 'gain' ? 'ganar músculo' : 'mantener peso'}. `;
        }

        const prompt = `Eres un nutricionista titulado. ${profileInfo}Hoy el usuario ha comido: ${meals}. Totales: ${totals.cal}kcal (objetivo: ${goal}), Proteína:${totals.prot}g, Carbos:${totals.carb}g, Grasas:${totals.fat}g, Fibra:${totals.fiber}g (recomendado:25g), Sodio:${totals.sodium}mg (límite:2000mg). Da un análisis breve: 1) Qué ha hecho bien 2) Qué le falta o debe reducir 3) Una sugerencia concreta para mañana. Sé amigable y breve.`;

        try {
            const res = await fetch('/api/analyze', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ textData: prompt })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            reportContent.textContent = data.result;
        } catch (err) {
            reportContent.textContent = 'Error al generar el informe: ' + err.message;
        }
    }

    // ===== DATA: FOOD LOG =====
    function dayKey(date) { const d = date || new Date(); return STORAGE_LOG + '_' + d.toISOString().slice(0, 10); }
    function getLog(date) { const d = localStorage.getItem(dayKey(date)); return d ? JSON.parse(d) : []; }
    function saveLog(entries, date) { localStorage.setItem(dayKey(date), JSON.stringify(entries)); }

    function addEntry(entry) {
        entry.id = Date.now();
        entry.quality = calcQuality(entry).grade;
        const entries = getLog();
        entries.push(entry);
        saveLog(entries);
        renderLog(entries); updateTotals(entries); renderWeek(); updateStreak(); updateTDEERemaining();
    }

    function removeEntry(id) {
        const entries = getLog().filter(e => e.id !== id);
        saveLog(entries);
        renderLog(entries); updateTotals(entries); renderWeek(); updateStreak(); updateTDEERemaining();
    }

    function clearLog() {
        if (!confirm('¿Borrar todas las comidas de hoy?')) return;
        saveLog([]); renderLog([]); updateTotals([]); renderWeek(); updateTDEERemaining();
        showToast('Registro borrado');
    }

    function loadLog() {
        const entries = getLog();
        renderLog(entries); updateTotals(entries);
    }

    const CAT_ICONS = { desayuno: '🌅', comida: '☀️', cena: '🌙', snack: '🍎' };
    const QUALITY_COLORS = { A: 'var(--quality-a)', B: 'var(--quality-b)', C: 'var(--quality-c)', D: 'var(--quality-d)', F: 'var(--quality-f)' };

    function renderLog(entries) {
        foodLogContainer.querySelectorAll('.log-entry').forEach(el => el.remove());
        if (!entries.length) { emptyLog.classList.remove('hidden'); return; }
        emptyLog.classList.add('hidden');
        entries.forEach(entry => {
            const q = entry.quality || calcQuality(entry).grade;
            const div = document.createElement('div');
            div.className = 'log-entry';
            div.innerHTML = `
                <span class="log-cat-icon">${CAT_ICONS[entry.cat] || '🍽️'}</span>
                <span class="log-quality" style="background:${QUALITY_COLORS[q] || QUALITY_COLORS.C}" title="Calidad: ${q}"></span>
                <div class="log-entry-info">
                    <span class="log-entry-name">${esc(entry.name)}</span>
                    <span class="log-entry-meta">${entry.time} · P:${entry.prot}g C:${entry.carb}g G:${entry.fat}g F:${entry.fiber || 0}g</span>
                </div>
                <span class="log-entry-cal">${entry.cal}</span>
                <button class="btn-delete-entry" data-id="${entry.id}">✕</button>
            `;
            div.querySelector('.btn-delete-entry').addEventListener('click', () => removeEntry(entry.id));
            foodLogContainer.appendChild(div);
        });
    }

    function updateTotals(entries) {
        const t = entries.reduce((a, e) => {
            a.cal += e.cal || 0; a.prot += e.prot || 0; a.carb += e.carb || 0;
            a.fat += e.fat || 0; a.fiber += e.fiber || 0; a.sodium += e.sodium || 0;
            return a;
        }, { cal: 0, prot: 0, carb: 0, fat: 0, fiber: 0, sodium: 0 });

        const goal = getSettings().goal;
        totalProtEl.textContent = t.prot; totalCarbEl.textContent = t.carb; totalFatEl.textContent = t.fat;
        totalFiberEl.textContent = t.fiber; totalSodiumEl.textContent = t.sodium;
        caloriesConsumed.textContent = t.cal; ringCal.textContent = t.cal;

        const pct = Math.min((t.cal / goal) * 100, 100);
        progressFill.style.width = pct + '%';
        progressFill.classList.toggle('over', t.cal > goal);
        ringFill.style.strokeDashoffset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * Math.min(t.cal / goal, 1));
        ringFill.classList.toggle('over', t.cal > goal);

        // Fiber bar
        const fiberPct = Math.min((t.fiber / FIBER_GOAL) * 100, 100);
        fiberFill.style.width = fiberPct + '%';
        fiberBarText.textContent = `${t.fiber}/${FIBER_GOAL}g`;

        // Sodium bar
        const sodiumPct = Math.min((t.sodium / SODIUM_LIMIT) * 100, 100);
        sodiumFill.style.width = sodiumPct + '%';
        sodiumFill.classList.toggle('over', t.sodium > SODIUM_LIMIT);
        sodiumBarText.textContent = `${t.sodium}/${SODIUM_LIMIT}mg`;
    }

    // ===== WATER (litros, cada botón = 0.25L) =====
    const GLASS_SIZE = 0.25;
    function waterKey() { return STORAGE_WATER + '_' + new Date().toISOString().slice(0, 10); }
    function getWater() { const d = localStorage.getItem(waterKey()); return d ? JSON.parse(d) : 0; }
    function saveWater(n) { localStorage.setItem(waterKey(), JSON.stringify(n)); }

    function toggleWater(idx) {
        const current = getWater();
        saveWater(idx + 1 === current ? idx : idx + 1);
        renderWater(getWater());
    }

    function loadWater() { buildWaterButtons(); renderWater(getWater()); }

    function buildWaterButtons() {
        const liters = getSettings().waterLiters || 2;
        const total = Math.round(liters / GLASS_SIZE);
        waterGlasses.innerHTML = '';
        for (let i = 0; i < total; i++) {
            const btn = document.createElement('button');
            btn.className = 'water-glass';
            btn.dataset.index = i;
            btn.textContent = '💧';
            waterGlasses.appendChild(btn);
        }
    }

    function renderWater(count) {
        const liters = getSettings().waterLiters || 2;
        const filled = (count * GLASS_SIZE).toFixed(2).replace(/\.?0+$/, '');
        waterCountEl.textContent = `${filled} / ${liters} L`;
        waterGlasses.querySelectorAll('.water-glass').forEach((btn, i) => {
            btn.classList.toggle('filled', i < count);
        });
    }

    // ===== WEEKLY HISTORY =====
    function renderWeek() {
        weekGrid.innerHTML = '';
        const today = new Date(), dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today); d.setDate(d.getDate() - i);
            const entries = getLog(d);
            const totalCal = entries.reduce((s, e) => s + (e.cal || 0), 0);
            const isToday = i === 0, hasData = entries.length > 0;
            const div = document.createElement('div');
            div.className = 'week-day' + (isToday ? ' today' : '') + (hasData ? ' has-data' : '');
            div.innerHTML = `<span class="week-day-label">${dayNames[d.getDay()]}</span><span class="week-day-num">${d.getDate()}</span><span class="week-day-cal">${hasData ? totalCal : '—'}</span>`;
            weekGrid.appendChild(div);
        }
    }

    // ===== STREAK =====
    function updateStreak() {
        let streak = 0; const d = new Date(); d.setDate(d.getDate() - 1);
        while (getLog(d).length > 0) { streak++; d.setDate(d.getDate() - 1); }
        if (getLog().length > 0) streak++;
        streakCount.textContent = streak;
    }

    // ===== UTILS =====
    function timeNow() { return new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }); }
    function esc(t) { const d = document.createElement('div'); d.textContent = t; return d.innerHTML; }
    function showToast(msg) {
        const t = $('toast'); t.textContent = msg; t.classList.remove('hidden');
        t.style.animation = 'none'; t.offsetHeight; t.style.animation = '';
        clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.add('hidden'), 2500);
    }

    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
});
