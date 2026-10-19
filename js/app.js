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
    isMuted: false
};

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

let audioCtx = null;
function playTone(freq, duration) {
    if (state.isMuted) return;
    try {
        if (!audioCtx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) audioCtx = new AudioCtx();
        }
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        if (audioCtx) {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.frequency.value = freq;
            gain.gain.value = 0.15;
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        }
    } catch (e) {}
}

function saveToLocalStorage() {
    localStorage.setItem('sm_score_0', state.scores[0]);
    localStorage.setItem('sm_score_1', state.scores[1]);
    localStorage.setItem('sm_team_0', state.teamNames[0]);
    localStorage.setItem('sm_team_1', state.teamNames[1]);
    localStorage.setItem('sm_current_team', state.currentTeam);
}

function getWordPool() {
    if (typeof INGHUSH_WORDS !== 'undefined' && Array.isArray(INGHUSH_WORDS) && INGHUSH_WORDS.length > 0) {
        return INGHUSH_WORDS;
    }
    return [
        { ing: "ГӀАЛА", ru: "Боевая башня", pts: 1, cat: "tradition" },
        { ing: "ЭЗДЕЛ", ru: "Благородство", pts: 2, cat: "tradition" },
        { ing: "МАЛХ", ru: "Солнце", pts: 1, cat: "nature" }
    ];
}

function buildDeck() {
    const pool = getWordPool();
    const filtered = state.category === 'all'
        ? pool
        : pool.filter(w => w.cat === state.category);
    const source = filtered.length > 0 ? filtered : pool;
    state.deck = [...source].sort(() => Math.random() - 0.5);
}

function startRound() {
    if (state.isPlaying) return;
    if (state.deck.length === 0) buildDeck();

    state.isPlaying = true;
    state.timeLeft = state.roundTime;
    setText('timer-display', state.timeLeft);

    document.getElementById('card-cover').classList.add('hidden');
    document.getElementById('card-active').classList.remove('hidden');

    ['btn-team-0', 'btn-team-1', 'btn-skip'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = false;
    });

    nextCard();
    playTone(520, 0.15);

    clearInterval(state.timerId);
    state.timerId = setInterval(() => {
        state.timeLeft--;
        setText('timer-display', state.timeLeft);
        if (state.timeLeft <= 5 && state.timeLeft > 0) playTone(440, 0.08);
        if (state.timeLeft <= 0) endRound();
    }, 1000);
}

function nextCard() {
    if (state.deck.length === 0) buildDeck();
    state.currentWord = state.deck.pop();
    if (!state.currentWord) return;

    const card = document.getElementById('game-card');
    card.style.transform = 'scale(0.95)';
    setTimeout(() => {
        setText('word-ing', state.currentWord.ing);
        setText('word-ru', state.currentWord.ru);
        setText('word-pts', `+${state.currentWord.pts} БАЛЛ`);
        card.style.transform = 'scale(1)';
    }, 110);
}

function scorePoint(teamIndex) {
    if (!state.isPlaying) return;

    if (teamIndex !== null && state.currentWord) {
        state.scores[teamIndex] += state.currentWord.pts;
        setText(`score-${teamIndex}`, state.scores[teamIndex]);
        playTone(680, 0.14);
        saveToLocalStorage();

        if (state.scores[teamIndex] >= state.winScore) {
            clearInterval(state.timerId);
            state.isPlaying = false;
            openModal('endgame-modal');
            return;
        }
    } else {
        playTone(240, 0.18); // Пропуск
    }

    nextCard();
}

function endRound() {
    clearInterval(state.timerId);
    state.isPlaying = false;
    playTone(300, 0.35);

    state.currentTeam = state.currentTeam === 0 ? 1 : 0;
    saveToLocalStorage();

    document.getElementById('team-panel-0').classList.toggle('active', state.currentTeam === 0);
    document.getElementById('team-panel-1').classList.toggle('active', state.currentTeam === 1);

    document.getElementById('card-active').classList.add('hidden');
    document.getElementById('card-cover').classList.remove('hidden');
    setText('turn-prompt', `Ход: ${state.teamNames[state.currentTeam]}. Нажмите для старта`);

    ['btn-team-0', 'btn-team-1', 'btn-skip'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = true;
    });
}

function openModal(id) {
    if (id === 'endgame-modal') {
        if (state.isPlaying) clearInterval(state.timerId);
        const t0 = state.teamNames[0];
        const t1 = state.teamNames[1];
        const s0 = state.scores[0];
        const s1 = state.scores[1];
        let win = "Ничья!";
        if (s0 > s1) win = `🏆 Победила команда ${t0}!`;
        else if (s1 > s0) win = `🏆 Победила команда ${t1}!`;

        const resEl = document.getElementById('endgame-results-text');
        if (resEl) {
            resEl.innerHTML = `
                ${t0}: <b>${s0}</b><br>
                ${t1}: <b>${s1}</b><br><br>
                <span>${win}</span>
            `;
        }
    }
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('hidden');
}

function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
}

function resetGame() {
    state.scores = [0, 0];
    state.currentTeam = 0;
    saveToLocalStorage();
    setText('score-0', '0');
    setText('score-1', '0');
    document.getElementById('team-panel-0').classList.add('active');
    document.getElementById('team-panel-1').classList.remove('active');
    closeModals();
    endRound();
}

function selectTime(sec, btnEl) {
    state.roundTime = sec;
    setText('timer-display', sec);
    if (btnEl && btnEl.parentElement) {
        btnEl.parentElement.querySelectorAll('.shield-btn').forEach(b => b.classList.remove('active'));
        btnEl.classList.add('active');
    }
}

function selectWinScore(score, btnEl) {
    state.winScore = score;
    if (btnEl && btnEl.parentElement) {
        btnEl.parentElement.querySelectorAll('.shield-btn').forEach(b => b.classList.remove('active'));
        btnEl.classList.add('active');
    }
}

function toggleMute() {
    state.isMuted = !state.isMuted;
    
    // Меняем картинку колокольчика в зависимости от режима звука
    const soundImg = document.querySelector('#quick-sound-btn img');
    if (soundImg) {
        if (state.isMuted) {
            soundImg.src = 'assets/icon-bell-off.png'; // Без звука (перечеркнутый)
        } else {
            soundImg.src = 'assets/icon-bell.png';     // Звук включен
        }
    }
}

function selectCategory(cat, btnEl) {
    state.category = cat;
    buildDeck();
    document.querySelectorAll('.deck-item').forEach(b => b.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
}

function saveSettings() {
    const in0 = document.getElementById('input-team-0');
    const in1 = document.getElementById('input-team-1');
    const t0 = (in0 && in0.value.trim()) ? in0.value.trim() : "Тоаба 1";
    const t1 = (in1 && in1.value.trim()) ? in1.value.trim() : "Тоаба 2";
    state.teamNames = [t0, t1];
    saveToLocalStorage();
    setText('team-name-0', t0);
    setText('team-name-1', t1);
    setText('turn-prompt', `Ход: ${state.teamNames[state.currentTeam]}. Нажмите для старта`);
    
    // Обновляем текст на кнопках команд
    const b0 = document.getElementById('btn-team-0');
    const b1 = document.getElementById('btn-team-1');
    if (b0) b0.innerHTML = `<i class="fa-solid fa-check"></i> ${t0} (+1)`;
    if (b1) b1.innerHTML = `<i class="fa-solid fa-check"></i> ${t1} (+1)`;

    closeModals();
}

// Инициализация при старте
setText('score-0', state.scores[0]);
setText('score-1', state.scores[1]);
setText('team-name-0', state.teamNames[0]);
setText('team-name-1', state.teamNames[1]);
document.getElementById('team-panel-0').classList.toggle('active', state.currentTeam === 0);
document.getElementById('team-panel-1').classList.toggle('active', state.currentTeam === 1);

const b0 = document.getElementById('btn-team-0');
const b1 = document.getElementById('btn-team-1');
if (b0) b0.innerHTML = `<i class="fa-solid fa-check"></i> ${state.teamNames[0]} (+1)`;
if (b1) b1.innerHTML = `<i class="fa-solid fa-check"></i> ${state.teamNames[1]} (+1)`;

buildDeck();