// ---------------------- Focus90.js 전체 ----------------------

let FOCUS_TIME = 90 * 60; // 90분 (초 단위)
let BREAK_TIME = 20 * 60; // 20분 (초 단위)

let timeLeft = FOCUS_TIME;
let isRunning = false;
let isFocusMode = true;
let intervalId = null;
let titleTimeoutId = null;
let startTime = null;
let targetEndTime = null;
let soundEnabled = true;
let showingCompletion = false;

// AudioContext 생성
const audioContext = new (window.AudioContext || window.webkitAudioContext)();
let audioInitialized = false;

// Audio 초기화
function initializeAudio() {
    return new Promise((resolve, reject) => {
        if (audioInitialized && audioContext.state === 'running') {
            resolve();
            return;
        }

        if (audioContext.state === 'suspended') {
            audioContext.resume()
                .then(() => {
                    audioInitialized = true;
                    resolve();
                })
                .catch(err => reject(err));
        } else {
            audioInitialized = true;
            resolve();
        }
    });
}

// 알림음 재생
function playNotificationSound() {
    if (!soundEnabled) return;

    const playSound = () => {
        try {
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
        } catch (err) {
            console.error('Sound play error:', err);
        }
    };

    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            audioInitialized = true;
            playSound();
        });
    } else {
        playSound();
    }
}

// DOM 요소
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

// 초기화
function init() {
    // 테마
    const savedTheme = localStorage.getItem('theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    // 사운드
    const savedSound = localStorage.getItem('soundEnabled');
    soundEnabled = savedSound === null ? true : savedSound === 'true';
    document.getElementById('soundToggle').checked = soundEnabled;

    // 시간
    const savedFocusTime = localStorage.getItem('focusTime');
    const savedBreakTime = localStorage.getItem('breakTime');
    if (savedFocusTime) FOCUS_TIME = parseInt(savedFocusTime);
    if (savedBreakTime) BREAK_TIME = parseInt(savedBreakTime);

    // 알림 권한
    if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => updateNotificationBanner(permission));
    } else {
        updateNotificationBanner(Notification.permission);
    }

    // 상태 복원
    restoreState();
    updateDisplay();
}

// 테마 토글
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

// 사운드 토글
function toggleSound() {
    soundEnabled = document.getElementById('soundToggle').checked;
    localStorage.setItem('soundEnabled', soundEnabled);
}

// 설정 모달
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

// 알림 배너
function updateNotificationBanner(permission) {
    if (permission !== 'granted') {
        notificationBanner.classList.add('show');
    } else {
        notificationBanner.classList.remove('show');
    }
}

// 상태 복원
function restoreState() {
    const saved = localStorage.getItem('focus90State');
    if (saved) {
        const state = JSON.parse(saved);
        if (state.isRunning && state.targetEndTime) {
            const now = Date.now();
            const remainingSec = Math.floor((state.targetEndTime - now) / 1000);
            if (remainingSec > 0) {
                timeLeft = remainingSec;
                isRunning = true;
                isFocusMode = state.isFocusMode;
                startTime = now;
                targetEndTime = state.targetEndTime;
                startTimer();
            } else {
                handleTimerEnd(state.isFocusMode);
            }
        }
    }
}
function saveState() {
    if (isRunning && targetEndTime) {
        localStorage.setItem('focus90State', JSON.stringify({
            isRunning,
            isFocusMode,
            targetEndTime,
            timeLeft
        }));
    } else {
        localStorage.removeItem('focus90State');
    }
}

// 시간 포맷
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

// UI 업데이트
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

    startBtn.style.display = isRunning ? 'none' : 'flex';
    pauseBtn.style.display = isRunning ? 'flex' : 'none';
}

// ---------------------- 타이머 시작 ----------------------
function startTimer() {
    if (intervalId) return;

    startTime = Date.now();
    targetEndTime = startTime + (timeLeft * 1000);

    intervalId = setInterval(() => {
        const remainingSec = Math.floor((targetEndTime - Date.now()) / 1000);
        timeLeft = Math.max(0, remainingSec);
        updateDisplay();
        saveState();

        if (timeLeft <= 0) {
            handleTimerEnd(isFocusMode);
        }
    }, 100);
}

// ---------------------- 타이머 종료 ----------------------
function handleTimerEnd(wasFocusMode) {
    isRunning = false;
    showingCompletion = true;

    if (intervalId) clearInterval(intervalId);
    intervalId = null;
    startTime = null;
    targetEndTime = null;

    playNotificationSound();

    if (Notification.permission === 'granted') {
        new Notification('Focus90', {
            body: wasFocusMode ? '집중 90분이 끝났어요! 이제 휴식하세요.' : '20분 휴식이 끝났어요! 다시 집중할 준비가 되었나요?',
            tag: 'focus90-notification',
            requireInteraction: true
        });
    }

    const originalTitle = document.title;
    document.title = wasFocusMode ? '[휴식!] Focus90' : '[집중!] Focus90';
    if (titleTimeoutId) clearTimeout(titleTimeoutId);
    titleTimeoutId = setTimeout(() => { document.title = originalTitle; }, 30000);

    if (wasFocusMode) {
        completionTitle.textContent = '집중 90분 종료!';
        completionText.textContent = '휴식을 시작하려면 \'휴식 시작\' 버튼을 눌러주세요.';
        document.querySelector('.btn-break-start').innerHTML = '휴식 시작';
    } else {
        completionTitle.textContent = '휴식 20분 종료!';
        completionText.textContent = '집중을 시작하려면 \'집중 시작\' 버튼을 눌러주세요.';
        document.querySelector('.btn-break-start').innerHTML = '집중 시작';
    }

    timerDisplay.style.display = 'none';
    completionMessage.classList.add('show');
    controls.style.display = 'none';
    completionControls.style.display = 'flex';

    localStorage.removeItem('focus90State');
}

// ---------------------- 휴식/집중 시작 ----------------------
function startBreak() {
    initializeAudio();

    showingCompletion = false;

    isFocusMode = !isFocusMode;
    timeLeft = isFocusMode ? FOCUS_TIME : BREAK_TIME;

    startTime = null;
    targetEndTime = null;

    completionMessage.classList.remove('show');
    timerDisplay.style.display = 'block';
    completionControls.style.display = 'none';
    controls.style.display = 'flex';

    document.querySelector('.btn-break-start').innerHTML = isFocusMode ? '집중 시작' : '휴식 시작';

    updateDisplay();
    handleStart();
}

// ---------------------- 완료 메시지 닫기 ----------------------
function dismissCompletion() {
    showingCompletion = false;
    isFocusMode = true;
    timeLeft = FOCUS_TIME;
    startTime = null;
    targetEndTime = null;

    completionMessage.classList.remove('show');
    timerDisplay.style.display = 'block';
    completionControls.style.display = 'none';
    controls.style.display = 'flex';

    updateDisplay();
}

// ---------------------- 시작 ----------------------
function handleStart() {
    initializeAudio();
    isRunning = true;
    startTimer();
    updateDisplay();
    saveState();
}

// ---------------------- 일시정지 ----------------------
function handlePause() {
    isRunning = false;
    if (intervalId) clearInterval(intervalId);
    intervalId = null;

    if (targetEndTime) {
        timeLeft = Math.max(0, Math.floor((targetEndTime - Date.now()) / 1000));
    }

    startTime = null;
    targetEndTime = null;
    updateDisplay();
    saveState();
}

// ---------------------- 리셋 ----------------------
function handleReset() {
    isRunning = false;
    showingCompletion = false;
    startTime = null;
    targetEndTime = null;

    isFocusMode = true;
    timeLeft = FOCUS_TIME;

    if (intervalId) clearInterval(intervalId);
    intervalId = null;

    completionMessage.classList.remove('show');
    timerDisplay.style.display = 'block';
    completionControls.style.display = 'none';
    controls.style.display = 'flex';

    document.querySelector('.btn-break-start').innerHTML = '휴식 시작';

    localStorage.removeItem('focus90State');
    updateDisplay();
}

// ---------------------- 페이지 로드 ----------------------
window.addEventListener('load', init);
window.addEventListener('beforeunload', saveState);

// 시스템 다크모드 감지
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('theme')) {
        const newTheme = e.matches ? 'dark' : 'light';
        document.body.setAttribute('data-theme', newTheme);
        updateThemeIcon(newTheme);
    }
});
