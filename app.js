document.addEventListener('DOMContentLoaded', () => {

    // ===== ELEMENTS =====
    const $ = id => document.getElementById(id);

    const btnFoto = $('btn-foto');
    const btnHablar = $('btn-hablar');
    const btnEscribir = $('btn-escribir');
    const btnClearLog = $('btn-clear-log');
    const btnTheme = $('btn-theme');
    const btnSettings = $('btn-settings');

    const cameraModal = $('camera-modal');
    const cameraFeed = $('camera-feed');
    const photoCanvas = $('photo-canvas');
    const btnCapturar = $('btn-capturar');
    const btnCerrarCamara = $('btn-cerrar-camara');

    const manualModal = $('manual-modal');
    const manualForm = $('manual-form');
    const btnCerrarManual = $('btn-cerrar-manual');

    const voiceModal = $('voice-modal');
    const voiceStatus = $('voice-status');
    const voiceTranscript = $('voice-transcript');
    const btnVoiceSend = $('btn-voice-send');
    const btnCerrarVoz = $('btn-cerrar-voz');

    const resultModal = $('result-modal');
    const aiResultDiv = $('ai-result');
    const resultForm = $('result-form');
    const btnCerrarResultado = $('btn-cerrar-resultado');

    const settingsModal = $('settings-modal');
    const settingsForm = $('settings-form');
    const btnCerrarSettings = $('btn-cerrar-settings');

    const foodLogContainer = $('food-log');
    const emptyLog = $('empty-log');
    const totalProtEl = $('total-prot');
    const totalCarbEl = $('total-carb');
    const totalFatEl = $('total-fat');
    const caloriesConsumed = $('calories-consumed');
    const caloriesGoalEl = $('calories-goal');
    const progressFill = $('progress-fill');
    const ringFill = $('ring-fill');
    const ringCal = $('ring-cal');
    const waterGlasses = $('water-glasses');
    const waterCountEl = $('water-count');
    const weekGrid = $('week-grid');
    const streakCount = $('streak-count');
    const greeting = $('greeting');

    const STORAGE_LOG = 'nutri100_log';
    const STORAGE_WATER = 'nutri100_water';
    const STORAGE_SETTINGS = 'nutri100_settings';
    const STORAGE_THEME = 'nutri100_theme';
    const RING_CIRCUMFERENCE = 326.73;

    let stream = null;
    let recognition = null;
    let selectedCat = 'comida';

    // ===== SETTINGS =====
    function getSettings() {
        const saved = localStorage.getItem(STORAGE_SETTINGS);
        return saved ? JSON.parse(saved) : { goal: 2000, waterGoal: 8 };
    }

    function saveSettings(s) { localStorage.setItem(STORAGE_SETTINGS, JSON.stringify(s)); }

    // ===== INIT =====
    setGreeting();
    loadTheme();
    loadLog();
    loadWater();
    renderWeek();
    updateStreak();
    applySettings();

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
                name: item.dataset.name,
                cal: +item.dataset.cal,
                prot: +item.dataset.prot,
                carb: +item.dataset.carb,
                fat: +item.dataset.fat,
                cat: item.dataset.cat || 'comida',
                time: timeNow()
            });
            showToast('Añadido al registro');
        });
    });

    waterGlasses.addEventListener('click', e => {
        const btn = e.target.closest('.water-glass');
        if (!btn) return;
        const idx = +btn.dataset.index;
        toggleWater(idx);
    });

    // Close modals on backdrop click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', e => {
            if (e.target === modal) closeModal(modal);
        });
    });

    // ===== GREETING =====
    function setGreeting() {
        const h = new Date().getHours();
        if (h < 12) greeting.textContent = 'Buenos días ☀️';
        else if (h < 20) greeting.textContent = 'Buenas tardes 🌤️';
        else greeting.textContent = 'Buenas noches 🌙';
    }

    // ===== THEME =====
    function loadTheme() {
        const theme = localStorage.getItem(STORAGE_THEME) || 'light';
        document.documentElement.setAttribute('data-theme', theme);
        btnTheme.textContent = theme === 'dark' ? '☀️' : '🌙';
    }

    function toggleTheme() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem(STORAGE_THEME, next);
        btnTheme.textContent = next === 'dark' ? '☀️' : '🌙';
    }

    // ===== SETTINGS =====
    function applySettings() {
        const s = getSettings();
        caloriesGoalEl.textContent = s.goal;
    }

    function openSettings() {
        const s = getSettings();
        $('set-goal').value = s.goal;
        $('set-water').value = s.waterGoal;
        openModal(settingsModal);
    }

    function handleSettingsSubmit(e) {
        e.preventDefault();
        const s = { goal: +$('set-goal').value || 2000, waterGoal: +$('set-water').value || 8 };
        saveSettings(s);
        applySettings();
        loadLog();
        loadWater();
        closeModal(settingsModal);
        showToast('Ajustes guardados');
    }

    // ===== MODAL HELPERS =====
    function openModal(modal) { modal.classList.remove('hidden'); }
    function closeModal(modal) { modal.classList.add('hidden'); }

    // ===== CAMERA =====
    async function openCamera() {
        openModal(cameraModal);
        try {
            stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
            cameraFeed.srcObject = stream;
        } catch {
            showToast('No se pudo acceder a la cámara');
            closeCamera();
        }
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
        photoCanvas.width = w;
        photoCanvas.height = h;
        ctx.drawImage(cameraFeed, 0, 0, w, h);
        const imgData = photoCanvas.toDataURL('image/jpeg', 0.8);
        closeCamera();
        processImageWithAI(imgData);
    }

    // ===== AI: IMAGE =====
    async function processImageWithAI(base64) {
        const orig = btnFoto.innerHTML;
        btnFoto.innerHTML = '<span class="btn-icon-lg">⏳</span><div class="btn-text"><strong>Analizando...</strong><small>Espera un momento</small></div>';
        btnFoto.disabled = true;
        try {
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ base64Data: base64.split(',')[1] })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            showAIResult(data.result);
        } catch (err) {
            showToast('Error: ' + err.message);
        } finally {
            btnFoto.innerHTML = orig;
            btnFoto.disabled = false;
        }
    }

    // ===== AI: TEXT =====
    async function processTextWithAI(text) {
        btnVoiceSend.textContent = '⏳ Analizando...';
        btnVoiceSend.disabled = true;
        try {
            const res = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ textData: text })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            closeModal(voiceModal);
            showAIResult(data.result);
        } catch (err) {
            showToast('Error: ' + err.message);
        } finally {
            btnVoiceSend.textContent = '🤖 Analizar con IA';
            btnVoiceSend.disabled = false;
        }
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
        openModal(resultModal);
    }

    function parseNutrition(text) {
        const r = { name: 'Plato analizado', cal: 0, prot: 0, carb: 0, fat: 0 };
        const cal = text.match(/(\d{2,4})\s*(?:kcal|calor[ií]as?)/i);
        if (cal) r.cal = +cal[1];
        const prot = text.match(/prote[ií]na[s]?\s*[:\-]?\s*(\d+)/i) || text.match(/(\d+)\s*g?\s*(?:de\s+)?prote[ií]na/i);
        if (prot) r.prot = +prot[1];
        const carb = text.match(/carbohidrato[s]?\s*[:\-]?\s*(\d+)/i) || text.match(/(\d+)\s*g?\s*(?:de\s+)?carbohidrato/i);
        if (carb) r.carb = +carb[1];
        const fat = text.match(/grasa[s]?\s*[:\-]?\s*(\d+)/i) || text.match(/(\d+)\s*g?\s*(?:de\s+)?grasa/i);
        if (fat) r.fat = +fat[1];
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length && lines[0].replace(/[*#\-]/g, '').trim().length > 3) {
            r.name = lines[0].replace(/[*#\-]/g, '').trim().slice(0, 60);
        }
        return r;
    }

    function handleResultSubmit(e) {
        e.preventDefault();
        addEntry({
            name: $('res-name').value,
            cal: +$('res-cal').value || 0,
            prot: +$('res-prot').value || 0,
            carb: +$('res-carb').value || 0,
            fat: +$('res-fat').value || 0,
            cat: 'comida',
            time: timeNow()
        });
        closeModal(resultModal);
        showToast('Comida registrada');
    }

    // ===== MANUAL ENTRY =====
    function handleManualSubmit(e) {
        e.preventDefault();
        addEntry({
            name: $('input-name').value,
            cal: +$('input-cal').value || 0,
            prot: +$('input-prot').value || 0,
            carb: +$('input-carb').value || 0,
            fat: +$('input-fat').value || 0,
            cat: selectedCat,
            time: timeNow()
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
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            showToast('Tu navegador no soporta voz');
            return;
        }
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SR();
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        recognition.interimResults = true;
        voiceTranscript.textContent = '';
        btnVoiceSend.classList.add('hidden');
        voiceStatus.textContent = 'Escuchando...';
        openModal(voiceModal);

        recognition.onresult = e => {
            let t = '';
            for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
            voiceTranscript.textContent = t;
        };
        recognition.onend = () => {
            voiceStatus.textContent = 'Listo';
            if (voiceTranscript.textContent.trim()) btnVoiceSend.classList.remove('hidden');
        };
        recognition.onerror = e => {
            voiceStatus.textContent = e.error === 'no-speech' ? 'No se detectó voz' : 'Error: ' + e.error;
        };
        recognition.start();
    }

    function stopVoice() {
        if (recognition) { recognition.abort(); recognition = null; }
        closeModal(voiceModal);
    }

    function handleVoiceSend() {
        const t = voiceTranscript.textContent.trim();
        if (t) processTextWithAI(t);
    }

    // ===== DATA: FOOD LOG =====
    function dayKey(date) {
        const d = date || new Date();
        return STORAGE_LOG + '_' + d.toISOString().slice(0, 10);
    }

    function getLog(date) {
        const d = localStorage.getItem(dayKey(date));
        return d ? JSON.parse(d) : [];
    }

    function saveLog(entries, date) { localStorage.setItem(dayKey(date), JSON.stringify(entries)); }

    function addEntry(entry) {
        entry.id = Date.now();
        const entries = getLog();
        entries.push(entry);
        saveLog(entries);
        renderLog(entries);
        updateTotals(entries);
        renderWeek();
        updateStreak();
    }

    function removeEntry(id) {
        const entries = getLog().filter(e => e.id !== id);
        saveLog(entries);
        renderLog(entries);
        updateTotals(entries);
        renderWeek();
        updateStreak();
    }

    function clearLog() {
        if (!confirm('¿Borrar todas las comidas de hoy?')) return;
        saveLog([]);
        renderLog([]);
        updateTotals([]);
        renderWeek();
        showToast('Registro borrado');
    }

    function loadLog() {
        const entries = getLog();
        renderLog(entries);
        updateTotals(entries);
    }

    const CAT_ICONS = { desayuno: '🌅', comida: '☀️', cena: '🌙', snack: '🍎' };

    function renderLog(entries) {
        foodLogContainer.querySelectorAll('.log-entry').forEach(el => el.remove());
        if (!entries.length) { emptyLog.classList.remove('hidden'); return; }
        emptyLog.classList.add('hidden');
        entries.forEach(entry => {
            const div = document.createElement('div');
            div.className = 'log-entry';
            div.innerHTML = `
                <span class="log-cat-icon">${CAT_ICONS[entry.cat] || '🍽️'}</span>
                <div class="log-entry-info">
                    <span class="log-entry-name">${esc(entry.name)}</span>
                    <span class="log-entry-meta">${entry.time} · P:${entry.prot}g C:${entry.carb}g G:${entry.fat}g</span>
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
            a.cal += e.cal || 0; a.prot += e.prot || 0; a.carb += e.carb || 0; a.fat += e.fat || 0;
            return a;
        }, { cal: 0, prot: 0, carb: 0, fat: 0 });

        const goal = getSettings().goal;

        totalProtEl.textContent = t.prot;
        totalCarbEl.textContent = t.carb;
        totalFatEl.textContent = t.fat;
        caloriesConsumed.textContent = t.cal;
        ringCal.textContent = t.cal;

        const pct = Math.min((t.cal / goal) * 100, 100);
        progressFill.style.width = pct + '%';
        progressFill.classList.toggle('over', t.cal > goal);

        const offset = RING_CIRCUMFERENCE - (RING_CIRCUMFERENCE * Math.min(t.cal / goal, 1));
        ringFill.style.strokeDashoffset = offset;
        ringFill.classList.toggle('over', t.cal > goal);
    }

    // ===== DATA: WATER =====
    function waterKey() { return STORAGE_WATER + '_' + new Date().toISOString().slice(0, 10); }

    function getWater() {
        const d = localStorage.getItem(waterKey());
        return d ? JSON.parse(d) : 0;
    }

    function saveWater(n) { localStorage.setItem(waterKey(), JSON.stringify(n)); }

    function toggleWater(idx) {
        const current = getWater();
        const next = (idx + 1 === current) ? idx : idx + 1;
        saveWater(next);
        renderWater(next);
    }

    function loadWater() { renderWater(getWater()); }

    function renderWater(count) {
        const goal = getSettings().waterGoal;
        waterCountEl.textContent = `${count} / ${goal} vasos`;
        waterGlasses.querySelectorAll('.water-glass').forEach((btn, i) => {
            btn.classList.toggle('filled', i < count);
            btn.style.display = i < goal ? '' : 'none';
        });
    }

    // ===== WEEKLY HISTORY =====
    function renderWeek() {
        weekGrid.innerHTML = '';
        const today = new Date();
        const dayNames = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const entries = getLog(d);
            const totalCal = entries.reduce((s, e) => s + (e.cal || 0), 0);
            const isToday = i === 0;
            const hasData = entries.length > 0;

            const div = document.createElement('div');
            div.className = 'week-day' + (isToday ? ' today' : '') + (hasData ? ' has-data' : '');
            div.innerHTML = `
                <span class="week-day-label">${dayNames[d.getDay()]}</span>
                <span class="week-day-num">${d.getDate()}</span>
                <span class="week-day-cal">${hasData ? totalCal : '—'}</span>
            `;
            weekGrid.appendChild(div);
        }
    }

    // ===== STREAK =====
    function updateStreak() {
        let streak = 0;
        const d = new Date();
        // Start from yesterday to check consecutive days
        d.setDate(d.getDate() - 1);
        while (true) {
            const entries = getLog(d);
            if (entries.length === 0) break;
            streak++;
            d.setDate(d.getDate() - 1);
        }
        // If today has entries, add today
        if (getLog().length > 0) streak++;
        streakCount.textContent = streak;
    }

    // ===== UTILS =====
    function timeNow() { return new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }); }

    function esc(text) {
        const d = document.createElement('div');
        d.textContent = text;
        return d.innerHTML;
    }

    function showToast(msg) {
        const t = $('toast');
        t.textContent = msg;
        t.classList.remove('hidden');
        t.style.animation = 'none';
        t.offsetHeight;
        t.style.animation = '';
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.classList.add('hidden'), 2500);
    }

    // ===== PWA =====
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }
});
