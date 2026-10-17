const state = {
    scores: [
        parseInt(localStorage.getItem('sm_score_0')) || 0,
        parseInt(localStorage.getItem('sm_score_1')) || 0
    ],
    teamNames: [
        localStorage.getItem('sm_team_0') || "Тоаба 1",
        localStorage.getItem('sm_team_1') || "Тоаба 2"
    ],
    currentTeam: parseInt(localStorage.getItem('sm_current_team')) || 0,
    roundTime: 60,
    winScore: 30,
    timeLeft: 60,
    isPlaying: false,
    timerId: null,
    category: 'all',
    deck: [],
    currentWord: null,
    volume: 0.8,
    isMuted: false,
    vibrate: true
};

// Инициализация интерфейса при загрузке
document.getElementById('score-0').textContent = state.scores[0];
document.getElementById('score-1').textContent = state.scores[1];
document.getElementById('team-name-0').textContent = state.teamNames[0];
document.getElementById('team-name-1').textContent = state.teamNames[1];
document.getElementById('team-panel-0').classList.toggle('active', state.currentTeam === 0);
document.getElementById('team-panel-1').classList.toggle('active', state.currentTeam === 1);

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playTone(freq, duration) {
    if (state.isMuted || state.volume <= 0) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = freq;
    gain.gain.value = state.volume * 0.2;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function saveToLocalStorage() {
    localStorage.setItem('sm_score_0', state.scores[0]);
    localStorage.setItem('sm_score_1', state.scores[1]);
    localStorage.setItem('sm_team_0', state.teamNames[0]);
    localStorage.setItem('sm_team_1', state.teamNames[1]);
    localStorage.setItem('sm_current_team', state.currentTeam);
}

function buildDeck() {
    const filtered = state.category === 'all'
        ? INGHUSH_WORDS
        : INGHUSH_WORDS.filter(w => w.cat === state.category);
    state.deck = [...filtered].sort(() => Math.random() - 0.5);
}

function startRound() {
    if (state.deck.length === 0) buildDeck();
    state.isPlaying = true;
    state.timeLeft = state.roundTime;
    document.getElementById('timer-display').textContent = state.timeLeft;

    document.getElementById('card-cover').classList.add('hidden');
    document.getElementById('card-active').classList.remove('hidden');
    
    // Активируем кнопки начисления очков для обеих команд и пропуск
    document.getElementById('btn-team-0').disabled = false;
    document.getElementById('btn-team-1').disabled = false;
    document.getElementById('btn-skip').disabled = false;

    // Обновляем надписи на кнопках командами
    document.getElementById('btn-team-0').innerHTML = `<i class="fa-solid fa-check"></i> ${state.teamNames[0]} (+1)`;
    document.getElementById('btn-team-1').innerHTML = `<i class="fa-solid fa-check"></i> ${state.teamNames[1]} (+1)`;

    nextCard();
    playTone(520, 0.15);

    state.timerId = setInterval(() => {
        state.timeLeft--;
        document.getElementById('timer-display').textContent = state.timeLeft;
        if (state.timeLeft <= 5 && state.timeLeft > 0) playTone(440, 0.08);
        if (state.timeLeft <= 0) endRound();
    }, 1000);
}

function nextCard() {
    if (state.deck.length === 0) buildDeck();
    state.currentWord = state.deck.pop();

    const card = document.getElementById('game-card');
    card.style.transform = 'scale(0.95)';
    setTimeout(() => {
        document.getElementById('word-ing').textContent = state.currentWord.ing;
        document.getElementById('word-ru').textContent = state.currentWord.ru;
        document.getElementById('word-pts').textContent = `+${state.currentWord.pts} БАЛЛ`;
        card.style.transform = 'scale(1)';
    }, 120);
}

// Начисление очков конкретной команде (или пропуск)
function scorePoint(teamIndex) {
    if (!state.isPlaying) return;

    if (teamIndex !== null) {
        state.scores[teamIndex] += state.currentWord.pts;
        document.getElementById(`score-${teamIndex}`).textContent = state.scores[teamIndex];
        playTone(680, 0.14);
        saveToLocalStorage();

        // Проверка победы
        if (state.scores[teamIndex] >= state.winScore) {
            clearInterval(state.timerId);
            state.isPlaying = false;
            openModal('endgame-modal');
            return;
        }
    } else {
        playTone(240, 0.18); // Пропуск слова
    }

    if (state.vibrate && navigator.vibrate) {
        navigator.vibrate(teamIndex !== null ? 40 : 80);
    }

    nextCard();
}

function endRound() {
    clearInterval(state.timerId);
    state.isPlaying = false;
    playTone(300, 0.35);

    // Передаем право объяснять следующей команде
    state.currentTeam = state.currentTeam === 0 ? 1 : 0;
    saveToLocalStorage();

    document.getElementById('team-panel-0').classList.toggle('active', state.currentTeam === 0);
    document.getElementById('team-panel-1').classList.toggle('active', state.currentTeam === 1);

    document.getElementById('card-active').classList.add('hidden');
    document.getElementById('card-cover').classList.remove('hidden');
    document.getElementById('turn-prompt').textContent = `Объясняет: ${state.teamNames[state.currentTeam]}. Нажмите для старта`;

    document.getElementById('btn-team-0').disabled = true;
    document.getElementById('btn-team-1').disabled = true;
    document.getElementById('btn-skip').disabled = true;
}

function openModal(id) {
    if (id === 'endgame-modal') {
        if (state.isPlaying) clearInterval(state.timerId);
        const t0 = state.teamNames[0];
        const t1 = state.teamNames[1];
        const s0 = state.scores[0];
        const s1 = state.scores[1];
        
        let winnerText = "Ничья!";
        if (s0 > s1) winnerText = `🏆 ПОБЕДИТЕЛЬ: ${t0}!`;
        else if (s1 > s0) winnerText = `🏆 ПОБЕДИТЕЛЬ: ${t1}!`;

        document.getElementById('endgame-results-text').innerHTML = `
            ${t0}: <b>${s0}</b> очков<br>
            ${t1}: <b>${s1}</b> очков<br><br>
            <span style="color:var(--gold-bright); font-size:18px;">${winnerText}</span>
        `;
    }
    document.getElementById(id).classList.remove('hidden');
}

function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
}

function resetGame() {
    state.scores = [0, 0];
    state.currentTeam = 0;
    saveToLocalStorage();
    document.getElementById('score-0').textContent = '0';
    document.getElementById('score-1').textContent = '0';
    document.getElementById('team-panel-0').classList.add('active');
    document.getElementById('team-panel-1').classList.remove('active');
    closeModals();
    endRound();
}

function selectTime(sec, btnEl) {
    state.roundTime = sec;
    document.getElementById('timer-display').textContent = sec;
    document.querySelectorAll('.shield-btn').forEach(b => {
        if (b.textContent.includes('с')) b.classList.remove('active');
    });
    btnEl.classList.add('active');
}

function selectWinScore(score, btnEl) {
    state.winScore = score;
    document.querySelectorAll('.shield-btn').forEach(b => {
        if (!b.textContent.includes('с')) b.classList.remove('active');
    });
    btnEl.classList.add('active');
}

function toggleVibrate() {
    state.vibrate = !state.vibrate;
    document.getElementById('vibrate-toggle').classList.toggle('active', state.vibrate);
}

function toggleMute() {
    state.isMuted = !state.isMuted;
    const icon = document.querySelector('#quick-sound-btn i');
    icon.className = state.isMuted ? 'fa-solid fa-bell-slash' : 'fa-solid fa-bell';
}

function selectCategory(cat, btnEl) {
    state.category = cat;
    buildDeck();
    document.querySelectorAll('.deck-item').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
}

function saveSettings() {
    const t0 = document.getElementById('input-team-0').value.trim() || "Тоаба 1";
    const t1 = document.getElementById('input-team-1').value.trim() || "Тоаба 2";
    state.teamNames = [t0, t1];
    saveToLocalStorage();

    document.getElementById('team-name-0').textContent = t0;
    document.getElementById('team-name-1').textContent = t1;
    document.getElementById('turn-prompt').textContent = `Объясняет: ${state.teamNames[state.currentTeam]}. Нажмите для старта`;

    closeModals();
}

buildDeck();