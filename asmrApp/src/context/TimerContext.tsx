import React, {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";

interface TimerContextType {
  remainingSeconds: number;
  isRunning: boolean;
  setTime: (seconds: number) => void; 
  startTimer: (seconds: number) => void;
  resumeTimer: () => void;
  pauseTimer: () => void;
  stopTimer: () => void;
}

const TimerContext = createContext<TimerContextType | null>(null);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning && remainingSeconds > 0) {
      // 1초마다 실행되는 인터벌 설정
      const id = setInterval(() => {
        setRemainingSeconds((prev) => prev - 1);
      }, 1000);

      intervalRef.current = id as unknown as number;
    } else if (remainingSeconds === 0) {
      // 시간이 0이 되면 타이머 종료 및 인터벌 정리
      setIsRunning(false);
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, [isRunning, remainingSeconds]);

  // 새로운 시간을 설정하고 타이머를 즉시 시작
  const startTimer = (seconds: number) => {
    setRemainingSeconds(seconds);
    setIsRunning(true);
  };

  // 시간만 설정하고 타이머는 정지 상태로 둠 (초기 세팅용)
  const setTime = (seconds: number) => {
    setRemainingSeconds(seconds);
    setIsRunning(false);
  };

  // 멈춰있던 타이머를 다시 흐르게 함
  const resumeTimer = () => {
    if (remainingSeconds > 0) {
      setIsRunning(true);
    }
  };

  // 타이머를 일시정지 (남은 시간 유지)
  const pauseTimer = () => setIsRunning(false);

  // 타이머를 완전히 정지하고 시간을 0으로 초기화
  const stopTimer = () => {
    setIsRunning(false);
    setRemainingSeconds(0);
  };

  return (
    <TimerContext.Provider
      value={{
        remainingSeconds,
        isRunning,
        startTimer,
        setTime,
        resumeTimer,
        pauseTimer,
        stopTimer,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (!context) throw new Error("useTimer must be used within a TimerProvider");
  return context;
};
