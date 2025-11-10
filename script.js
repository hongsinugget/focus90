let FOCUS_TIME = 90 * 60; // 90분
let BREAK_TIME = 20 * 60; // 20분

let timeLeft = FOCUS_TIME;
let isRunning = false;
let isFocusMode = true;
let intervalId = null;
let titleTimeoutId = null;
let lastUpdateTime = null;
let soundEnabled = true;
let showingCompletion = false;

const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playNotificationSound() {
    if (!soundEnabled) return;
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
}

const timerTime = document.getElementById('timerTime');
const timerLabel = document.getElementById('timerLabel');
const modeText = document.getElementById('modeText');
const modeDot = document.getElementById('modeDot');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const notificationBanner = document.getElementById('notificationBanner');
const completionMessage = document.getElementById('completionMessage');
const timerDisplay = document.getElementById('timerDisplay');
const controls = document.getElementById('controls');
const completionControls = document.getElementById('completionControls');
const completionTitle = document.getElementById('completionTitle');
const completionText = document.getElementById('completionText');

function init() {
    const savedTheme = localStorage.getItem('theme') || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    const savedSound = localStorage.getItem('soundEnabled');
    soundEnabled = savedSound === null ? true : savedSound === 'true';
    document.getElementById('soundToggle').checked = soundEnabled;

    const savedFocusTime = localStorage.getItem('focusTime');
    const savedBreakTime = localStorage.getItem('breakTime');
    if (savedFocusTime) FOCUS_TIME = parseInt(savedFocusTime);
    if (savedBreakTime) BREAK_TIME = parseInt(savedBreakTime);

    if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            updateNotificationBanner(permission);
        });
    } else {
        updateNotificationBanner(Notification.permission);
    }

    restoreState();
    updateDisplay();
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    document.getElementById('themeIcon').textContent = theme === 'light' ? '🌙' : '☀️';
}

function toggleSound() {
    soundEnabled = document.getElementById('soundToggle').checked;
    localStorage.setItem('soundEnabled', soundEnabled);
}

function openSettings() {
    document.getElementById('focusTimeInput').value = FOCUS_TIME / 60;
    document.getElementById('breakTimeInput').value = BREAK_TIME / 60;
    document.getElementById('settingsModal').classList.add('show');
}

function closeSettings() {
    document.getElementById('settingsModal').classList.remove('show');
}

function saveSettings() {
    const focusMinutes = parseInt(document.getElementById('focusTimeInput').value);
    const breakMinutes = parseInt(document.getElementById('breakTimeInput').value);
    if (focusMinutes > 0 && breakMinutes > 0) {
        FOCUS_TIME = focusMinutes * 60;
        BREAK_TIME = breakMinutes * 60;
        localStorage.setItem('focusTime', FOCUS_TIME);
        localStorage.setItem('breakTime', BREAK_TIME);
        if (!isRunning) {
            timeLeft = isFocusMode ? FOCUS_TIME : BREAK_TIME;
            updateDisplay();
        }
        closeSettings();
    }
}

function updateNotificationBanner(permission) {
    if (permission !== 'granted') {
        notificationBanner.classList.add('show');
    } else {
        notificationBanner.classList.remove('show');
    }
}

function restoreState() {
    const saved = localStorage.getItem('focus90State');
    if (saved) {
        const state = JSON.parse(saved);
        const elapsed = Math.floor((Date.now() - state.lastUpdateTime) / 1000);
        const newTimeLeft = Math.max(0, state.timeLeft - elapsed);
        if (state.isRunning && newTimeLeft > 0) {
            timeLeft = newTimeLeft;
            isRunning = true;
            isFocusMode = state.isFocusMode;
            lastUpdateTime = Date.now();
            startTimer();
        } else if (newTimeLeft === 0 && state.isRunning) {
            handleTimerEnd(state.isFocusMode);
        }
    }
}

function saveState() {
    if (isRunning) {
        localStorage.setItem('focus90State', JSON.stringify({
            timeLeft,
            isRunning,
            isFocusMode,
            lastUpdateTime: lastUpdateTime || Date.now()
        }));
    } else {
        localStorage.removeItem('focus90State');
    }
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function updateDisplay() {
    timerTime.textContent = formatTime(timeLeft);
    timerTime.className = 'timer-time ' + (isFocusMode ? 'focus' : 'break');
    modeText.textContent = isFocusMode ? '집중 모드' : '휴식 모드';
    modeDot.className = 'mode-dot ' + (isFocusMode ? 'focus' : 'break');
    timerLabel.textContent = isFocusMode ? '집중 중' : '휴식 중';
}

function startTimer() {
    if (intervalId) clearInterval(intervalId);
    lastUpdateTime = Date.now();
    intervalId = setInterval(() => {
        const now = Date.now();
        const delta = Math.floor((now - lastUpdateTime) / 1000);
        lastUpdateTime = now;
        timeLeft = Math.max(0, timeLeft - delta);
        updateDisplay();
        if (timeLeft === 0) {
            clearInterval(intervalId);
            intervalId = null;
            handleTimerEnd(isFocusMode);
        }
    }, 1000);
}

function handleStart() {
    if (!isRunning) {
        isRunning = true;
        startBtn.style.display = 'none';
        pauseBtn.style.display = 'inline-block';
        startTimer();
    }
}

function handlePause() {
    if (isRunning) {
        isRunning = false;
        pauseBtn.style.display = 'none';
        startBtn.style.display = 'inline-block';
        clearInterval(intervalId);
        intervalId = null;
        saveState();
    }
}

function handleReset() {
    isRunning = false;
    timeLeft = isFocusMode ? FOCUS_TIME : BREAK_TIME;
    clearInterval(intervalId);
    intervalId = null;
    startBtn.style.display = 'inline-block';
    pauseBtn.style.display = 'none';
    showingCompletion = false;
    completionMessage.classList.remove('show');
    controls.style.display = 'flex';
    completionControls.style.display = 'none';
    updateDisplay();
    saveState();
}

function handleTimerEnd(focusMode) {
    isRunning = false;
    playNotificationSound();
    showingCompletion = true;
    controls.style.display = 'none';
    completionControls.style.display = 'flex';
    completionMessage.classList.add('show');
    completionTitle.textContent = focusMode ? '집중 종료!' : '휴식 종료!';
    completionText.textContent = focusMode
        ? '휴식을 시작하려면 "휴식 시작" 버튼을 눌러주세요.'
        : '다시 집중을 시작하려면 "시작" 버튼을 누르세요.';
    saveState();
}

function startBreak() {
    isFocusMode = false;
    timeLeft = BREAK_TIME;
    showingCompletion = false;
    completionMessage.classList.remove('show');
    controls.style.display = 'flex';
    completionControls.style.display = 'none';
    updateDisplay();
    handleStart();
}

function dismissCompletion() {
    showingCompletion = false;
    completionMessage.classList.remove('show');
    controls.style.display = 'flex';
    completionControls.style.display = 'none';
}

window.addEventListener('load', init);
window.addEventListener('beforeunload', saveState);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    const currentTheme = document.body.getAttribute('data-theme');
    if (!localStorage.getItem('theme')) {
        const newTheme = e.matches ? 'dark' : 'light';
        document.body.setAttribute('data-theme', newTheme);
        updateThemeIcon(newTheme);
    }
});
