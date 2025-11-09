const FOCUS_TIME = 90 * 60; // 90분
const BREAK_TIME = 20 * 60; // 20분

let timeLeft = FOCUS_TIME;
let isRunning = false;
let isFocusMode = true;
let intervalId = null;
let titleTimeoutId = null;

// DOM 요소
const timerTime = document.getElementById('timerTime');
const timerLabel = document.getElementById('timerLabel');
const modeText = document.getElementById('modeText');
const modeDot = document.getElementById('modeDot');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const notificationBanner = document.getElementById('notificationBanner');

// 초기화
function init() {
    if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => updateNotificationBanner(permission));
    } else {
        updateNotificationBanner(Notification.permission);
    }

    restoreState();
    updateDisplay();
}

function updateNotificationBanner(permission) {
    if (permission !== 'granted') notificationBanner.classList.add('show');
    else notificationBanner.classList.remove('show');
}

function restoreState() {
    const saved = localStorage.getItem('focus90State');
    if (saved) {
        const state = JSON.parse(saved);
        const elapsed = Math.floor((Date.now() - state.timestamp) / 1000);
        const newTimeLeft = Math.max(0, state.timeLeft - elapsed);

        if (state.isRunning && newTimeLeft > 0) {
            timeLeft = newTimeLeft;
            isRunning = true;
            isFocusMode = state.isFocusMode;
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
            timestamp: Date.now()
        }));
    } else {
        localStorage.removeItem('focus90State');
    }
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
}

function updateDisplay() {
    timerTime.textContent = formatTime(timeLeft);

    if (isFocusMode) {
        timerTime.className = 'timer-time focus';
        timerLabel.textContent = '집중 중';
        modeText.textContent = '집중 모드';
        modeDot.className = 'mode-dot focus';
    } else {
        timerTime.className = 'timer-time break';
        timerLabel.textContent = '휴식 중';
        modeText.textContent = '휴식 모드';
        modeDot.className = 'mode-dot break';
    }

    if (isRunning) {
        startBtn.style.display = 'none';
        pauseBtn.style.display = 'flex';
    } else {
        startBtn.style.display = 'flex';
        pauseBtn.style.display = 'none';
    }
}

function startTimer() {
    if (intervalId) return;
    intervalId = setInterval(() => {
        timeLeft--;
        updateDisplay();
        saveState();
        if (timeLeft <= 0) handleTimerEnd(isFocusMode);
    }, 1000);
}

function handleTimerEnd(wasFocusMode) {
    if (Notification.permission === 'granted') {
        const body = wasFocusMode ? '집중 90분이 끝났어요! 이제 20분 쉬세요.' : '20분 휴식이 끝났어요! 다시 집중 시작합니다.';
        new Notification('Focus90', { body, tag:'focus90-notification' });
    }

    const originalTitle = document.title;
    document.title = wasFocusMode ? '[휴식!] Focus90' : '[집중!] Focus90';
    if (titleTimeoutId) clearTimeout(titleTimeoutId);
    titleTimeoutId = setTimeout(() => document.title = originalTitle, 30000);

    isFocusMode = !wasFocusMode;
    timeLeft = isFocusMode ? FOCUS_TIME : BREAK_TIME;
    isRunning = true;

    updateDisplay();
    saveState();
}

function handleStart() {
    isRunning = true;
    startTimer();
    updateDisplay();
    saveState();
}

function handlePause() {
    isRunning = false;
    if (intervalId) { clearInterval(intervalId); intervalId=null; }
    updateDisplay();
    saveState();
}

function handleReset() {
    isRunning = false;
    isFocusMode = true;
    timeLeft = FOCUS_TIME;
    if (intervalId) { clearInterval(intervalId); intervalId=null; }
    localStorage.removeItem('focus90State');
    updateDisplay();
}

window.addEventListener('load', init);
window.addEventListener('beforeunload', saveState);
