document.addEventListener('DOMContentLoaded', () => {

    // --- Elementos ---
    const btnFoto = document.getElementById('btn-foto');
    const btnHablar = document.getElementById('btn-hablar');
    const btnEscribir = document.getElementById('btn-escribir');
    const btnClearLog = document.getElementById('btn-clear-log');

    const cameraModal = document.getElementById('camera-modal');
    const cameraFeed = document.getElementById('camera-feed');
    const photoCanvas = document.getElementById('photo-canvas');
    const btnCapturar = document.getElementById('btn-capturar');
    const btnCerrarCamara = document.getElementById('btn-cerrar-camara');

    const manualModal = document.getElementById('manual-modal');
    const manualForm = document.getElementById('manual-form');
    const btnCerrarManual = document.getElementById('btn-cerrar-manual');

    const voiceModal = document.getElementById('voice-modal');
    const voiceStatus = document.getElementById('voice-status');
    const voiceTranscript = document.getElementById('voice-transcript');
    const btnVoiceSend = document.getElementById('btn-voice-send');
    const btnCerrarVoz = document.getElementById('btn-cerrar-voz');

    const resultModal = document.getElementById('result-modal');
    const aiResultDiv = document.getElementById('ai-result');
    const resultForm = document.getElementById('result-form');
    const btnCerrarResultado = document.getElementById('btn-cerrar-resultado');

    const foodLogContainer = document.getElementById('food-log');
    const emptyLog = document.getElementById('empty-log');

    const totalCalEl = document.getElementById('total-cal');
    const totalProtEl = document.getElementById('total-prot');
    const totalCarbEl = document.getElementById('total-carb');
    const totalFatEl = document.getElementById('total-fat');
    const caloriesConsumed = document.getElementById('calories-consumed');
    const progressFill = document.getElementById('progress-fill');

    const CALORIE_GOAL = 2000;
    const STORAGE_KEY = 'nutri100_log';

    let stream = null;
    let recognition = null;

    // --- Event Listeners ---
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

    btnClearLog.addEventListener('click', clearLog);

    document.querySelectorAll('.suggestion').forEach(item => {
        item.addEventListener('click', () => {
            addEntry({
                name: item.dataset.name,
                cal: parseInt(item.dataset.cal),
                prot: parseInt(item.dataset.prot),
                carb: parseInt(item.dataset.carb),
                fat: parseInt(item.dataset.fat),
                time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
            });
            showToast('Añadido: ' + item.dataset.name);
        });
    });

    // --- Inicialización ---
    loadLog();

    // --- Modal helpers ---
    function openModal(modal) {
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
    }

    function closeModal(modal) {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
    }

    // --- Cámara ---
    async function openCamera() {
        openModal(cameraModal);
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            });
            cameraFeed.srcObject = stream;
        } catch (error) {
            showToast('No se pudo acceder a la cámara');
            closeCamera();
        }
    }

    function closeCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        closeModal(cameraModal);
    }

    function takePhoto() {
        const context = photoCanvas.getContext('2d');
        const maxWidth = 800;
        let width = cameraFeed.videoWidth;
        let height = cameraFeed.videoHeight;

        if (width > maxWidth) {
            height = Math.round((maxWidth * height) / width);
            width = maxWidth;
        }

        photoCanvas.width = width;
        photoCanvas.height = height;
        context.drawImage(cameraFeed, 0, 0, width, height);

        const imageDataURL = photoCanvas.toDataURL('image/jpeg', 0.8);
        closeCamera();
        processImageWithAI(imageDataURL);
    }

    // --- IA: análisis de imagen ---
    async function processImageWithAI(imageBase64) {
        const originalText = btnFoto.innerHTML;
        btnFoto.innerHTML = '<span class="icon">⏳</span> Analizando...';
        btnFoto.disabled = true;

        try {
            const base64Data = imageBase64.split(',')[1];
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ base64Data })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            showAIResult(data.result);
        } catch (error) {
            showToast('Error: ' + error.message);
        } finally {
            btnFoto.innerHTML = originalText;
            btnFoto.disabled = false;
        }
    }

    // --- IA: análisis de texto (voz) ---
    async function processTextWithAI(text) {
        const originalText = btnVoiceSend.innerHTML;
        btnVoiceSend.innerHTML = '⏳ Analizando...';
        btnVoiceSend.disabled = true;

        try {
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ textData: text })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            closeModal(voiceModal);
            showAIResult(data.result);
        } catch (error) {
            showToast('Error: ' + error.message);
        } finally {
            btnVoiceSend.innerHTML = '🤖 Analizar con IA';
            btnVoiceSend.disabled = false;
        }
    }

    // --- Mostrar resultado IA ---
    function showAIResult(text) {
        aiResultDiv.textContent = text;

        const parsed = parseNutrition(text);
        document.getElementById('res-name').value = parsed.name;
        document.getElementById('res-cal').value = parsed.cal;
        document.getElementById('res-prot').value = parsed.prot;
        document.getElementById('res-carb').value = parsed.carb;
        document.getElementById('res-fat').value = parsed.fat;

        openModal(resultModal);
    }

    function parseNutrition(text) {
        const result = { name: 'Plato analizado', cal: 0, prot: 0, carb: 0, fat: 0 };

        const calMatch = text.match(/(\d{2,4})\s*(?:kcal|calor[ií]as?)/i);
        if (calMatch) result.cal = parseInt(calMatch[1]);

        const protMatch = text.match(/prote[ií]na[s]?\s*[:\-]?\s*(\d+)/i) || text.match(/(\d+)\s*g?\s*(?:de\s+)?prote[ií]na/i);
        if (protMatch) result.prot = parseInt(protMatch[1]);

        const carbMatch = text.match(/carbohidrato[s]?\s*[:\-]?\s*(\d+)/i) || text.match(/(\d+)\s*g?\s*(?:de\s+)?carbohidrato/i);
        if (carbMatch) result.carb = parseInt(carbMatch[1]);

        const fatMatch = text.match(/grasa[s]?\s*[:\-]?\s*(\d+)/i) || text.match(/(\d+)\s*g?\s*(?:de\s+)?grasa/i);
        if (fatMatch) result.fat = parseInt(fatMatch[1]);

        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length > 0) {
            const firstLine = lines[0].replace(/[*#\-]/g, '').trim();
            if (firstLine.length > 3 && firstLine.length < 80) {
                result.name = firstLine;
            }
        }

        return result;
    }

    function handleResultSubmit(e) {
        e.preventDefault();
        addEntry({
            name: document.getElementById('res-name').value,
            cal: parseInt(document.getElementById('res-cal').value) || 0,
            prot: parseInt(document.getElementById('res-prot').value) || 0,
            carb: parseInt(document.getElementById('res-carb').value) || 0,
            fat: parseInt(document.getElementById('res-fat').value) || 0,
            time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
        });
        closeModal(resultModal);
        showToast('Comida registrada');
    }

    // --- Registro manual ---
    function handleManualSubmit(e) {
        e.preventDefault();
        addEntry({
            name: document.getElementById('input-name').value,
            cal: parseInt(document.getElementById('input-cal').value) || 0,
            prot: parseInt(document.getElementById('input-prot').value) || 0,
            carb: parseInt(document.getElementById('input-carb').value) || 0,
            fat: parseInt(document.getElementById('input-fat').value) || 0,
            time: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
        });
        manualForm.reset();
        closeModal(manualModal);
        showToast('Comida registrada');
    }

    // --- Voz ---
    function startVoice() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            showToast('Tu navegador no soporta reconocimiento de voz');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'es-ES';
        recognition.continuous = false;
        recognition.interimResults = true;

        voiceTranscript.textContent = '';
        btnVoiceSend.classList.add('hidden');
        voiceStatus.textContent = 'Escuchando...';
        openModal(voiceModal);

        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = 0; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            voiceTranscript.textContent = transcript;
        };

        recognition.onend = () => {
            voiceStatus.textContent = 'Listo';
            if (voiceTranscript.textContent.trim()) {
                btnVoiceSend.classList.remove('hidden');
            }
        };

        recognition.onerror = (event) => {
            if (event.error === 'no-speech') {
                voiceStatus.textContent = 'No se detectó voz. Intenta de nuevo.';
            } else {
                voiceStatus.textContent = 'Error: ' + event.error;
            }
        };

        recognition.start();
    }

    function stopVoice() {
        if (recognition) {
            recognition.abort();
            recognition = null;
        }
        closeModal(voiceModal);
    }

    function handleVoiceSend() {
        const text = voiceTranscript.textContent.trim();
        if (!text) return;
        processTextWithAI(text);
    }

    // --- Log de comidas (localStorage) ---
    function getTodayKey() {
        return STORAGE_KEY + '_' + new Date().toISOString().slice(0, 10);
    }

    function getLog() {
        const data = localStorage.getItem(getTodayKey());
        return data ? JSON.parse(data) : [];
    }

    function saveLog(entries) {
        localStorage.setItem(getTodayKey(), JSON.stringify(entries));
    }

    function addEntry(entry) {
        entry.id = Date.now();
        const entries = getLog();
        entries.push(entry);
        saveLog(entries);
        renderLog(entries);
        updateTotals(entries);
    }

    function removeEntry(id) {
        const entries = getLog().filter(e => e.id !== id);
        saveLog(entries);
        renderLog(entries);
        updateTotals(entries);
    }

    function clearLog() {
        if (!confirm('¿Borrar todas las comidas de hoy?')) return;
        saveLog([]);
        renderLog([]);
        updateTotals([]);
        showToast('Registro borrado');
    }

    function loadLog() {
        const entries = getLog();
        renderLog(entries);
        updateTotals(entries);
    }

    function renderLog(entries) {
        const existingEntries = foodLogContainer.querySelectorAll('.log-entry');
        existingEntries.forEach(el => el.remove());

        if (entries.length === 0) {
            emptyLog.classList.remove('hidden');
            return;
        }

        emptyLog.classList.add('hidden');

        entries.forEach(entry => {
            const div = document.createElement('div');
            div.className = 'log-entry';
            div.innerHTML = `
                <div class="log-entry-info">
                    <span class="log-entry-name">${escapeHtml(entry.name)}</span>
                    <span class="log-entry-macros">${entry.time} · P:${entry.prot}g · C:${entry.carb}g · G:${entry.fat}g</span>
                </div>
                <div class="log-entry-actions">
                    <span class="log-entry-cal">${entry.cal} kcal</span>
                    <button class="btn-delete-entry" data-id="${entry.id}" title="Eliminar">✕</button>
                </div>
            `;
            div.querySelector('.btn-delete-entry').addEventListener('click', () => removeEntry(entry.id));
            foodLogContainer.appendChild(div);
        });
    }

    function updateTotals(entries) {
        const totals = entries.reduce((acc, e) => {
            acc.cal += e.cal || 0;
            acc.prot += e.prot || 0;
            acc.carb += e.carb || 0;
            acc.fat += e.fat || 0;
            return acc;
        }, { cal: 0, prot: 0, carb: 0, fat: 0 });

        totalCalEl.textContent = totals.cal;
        totalProtEl.textContent = totals.prot;
        totalCarbEl.textContent = totals.carb;
        totalFatEl.textContent = totals.fat;
        caloriesConsumed.textContent = totals.cal;

        const pct = Math.min((totals.cal / CALORIE_GOAL) * 100, 100);
        progressFill.style.width = pct + '%';
        progressFill.classList.toggle('over', totals.cal > CALORIE_GOAL);
    }

    // --- Utilidades ---
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showToast(message) {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 2500);
    }
});
