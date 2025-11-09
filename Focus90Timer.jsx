import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

const Focus90Timer = () => {
  const FOCUS_TIME = 90 * 60; // 90분
  const BREAK_TIME = 20 * 60; // 20분
  
  const [timeLeft, setTimeLeft] = useState(FOCUS_TIME);
  const [isRunning, setIsRunning] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(true);
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  
  const intervalRef = useRef(null);
  const titleTimeoutRef = useRef(null);

  // 알림 권한 요청
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        setNotificationPermission(permission);
      });
    }
  }, []);

  // localStorage에서 상태 복원
  useEffect(() => {
    const saved = localStorage.getItem('focus90State');
    if (saved) {
      const state = JSON.parse(saved);
      const elapsed = Math.floor((Date.now() - state.timestamp) / 1000);
      const newTimeLeft = Math.max(0, state.timeLeft - elapsed);
      
      if (state.isRunning && newTimeLeft > 0) {
        setTimeLeft(newTimeLeft);
        setIsRunning(true);
        setIsFocusMode(state.isFocusMode);
      } else if (newTimeLeft === 0 && state.isRunning) {
        // 시간이 다 지났으면 자동 전환
        handleTimerEnd(state.isFocusMode);
      }
    }
  }, []);

  // localStorage에 상태 저장
  useEffect(() => {
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
  }, [timeLeft, isRunning, isFocusMode]);

  // 타이머 종료 처리
  const handleTimerEnd = (wasFocusMode) => {
    // 데스크탑 알림
    if (Notification.permission === 'granted') {
      if (wasFocusMode) {
        new Notification('Focus90', {
          body: '집중 90분이 끝났어요! 이제 20분 쉬세요.',
          icon: '🟢',
          tag: 'focus90-notification'
        });
      } else {
        new Notification('Focus90', {
          body: '20분 휴식이 끝났어요! 다시 집중 시작합니다.',
          icon: '🔵',
          tag: 'focus90-notification'
        });
      }
    }

    // 탭 타이틀 변경
    const originalTitle = document.title;
    document.title = wasFocusMode ? '[휴식!] Focus90' : '[집중!] Focus90';
    
    if (titleTimeoutRef.current) {
      clearTimeout(titleTimeoutRef.current);
    }
    titleTimeoutRef.current = setTimeout(() => {
      document.title = originalTitle;
    }, 30000);

    // 모드 전환 및 자동 시작
    const newMode = !wasFocusMode;
    setIsFocusMode(newMode);
    setTimeLeft(newMode ? FOCUS_TIME : BREAK_TIME);
    setIsRunning(true);
  };

  // 타이머 로직
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleTimerEnd(isFocusMode);
            return isFocusMode ? BREAK_TIME : FOCUS_TIME;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isFocusMode]);

  // 시간 포맷팅
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // 버튼 핸들러
  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsFocusMode(true);
    setTimeLeft(FOCUS_TIME);
    localStorage.removeItem('focus90State');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 알림 권한 안내 */}
        {notificationPermission !== 'granted' && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 text-center">
              브라우저 알림을 허용해야 전환 알림을 받을 수 있어요.
            </p>
          </div>
        )}

        {/* 메인 타이머 카드 */}
        <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-200">
          {/* 상태 표시 */}
          <div className="flex items-center justify-center mb-8">
            {isFocusMode ? (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-lg font-medium text-slate-700">집중 모드</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-lg font-medium text-slate-700">휴식 모드</span>
              </div>
            )}
          </div>

          {/* 타이머 디스플레이 */}
          <div className="text-center mb-12">
            <div className={`text-7xl font-light tracking-wider ${
              isFocusMode ? 'text-blue-600' : 'text-green-600'
            }`}>
              {formatTime(timeLeft)}
            </div>
            <div className="mt-4 text-sm text-slate-500">
              {isFocusMode ? '집중 중' : '휴식 중'}
            </div>
          </div>

          {/* 컨트롤 버튼 */}
          <div className="flex gap-3 justify-center">
            {!isRunning ? (
              <button
                onClick={handleStart}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
              >
                <Play size={20} />
                시작
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="flex items-center gap-2 px-8 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium shadow-sm"
              >
                <Pause size={20} />
                일시정지
              </button>
            )}
            
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-6 py-3 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors font-medium"
            >
              <RotateCcw size={20} />
              리셋
            </button>
          </div>

          {/* 자동 반복 안내 */}
          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              ✓ 자동 반복 모드 활성화
            </p>
            <p className="text-xs text-slate-400 text-center mt-2">
              집중 90분 → 휴식 20분이 자동으로 반복됩니다
            </p>
          </div>
        </div>

        {/* 하단 안내 */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            Focus90 - 깊은 몰입을 위한 타이머
          </p>
        </div>
      </div>
    </div>
  );
};

export default Focus90Timer;