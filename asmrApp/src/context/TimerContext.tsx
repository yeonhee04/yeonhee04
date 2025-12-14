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
  setTime: (seconds: number) => void; // ✅ [추가] 시간만 설정 (자동시작 X)
  startTimer: (seconds: number) => void; // 시간 설정 + 바로 시작
  resumeTimer: () => void; // ✅ [추가] 현재 시간에서 다시 시작
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
      const id = setInterval(() => {
        setRemainingSeconds((prev) => prev - 1);
      }, 1000);

      intervalRef.current = id as unknown as number;
    } else if (remainingSeconds === 0) {
      setIsRunning(false);
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, [isRunning, remainingSeconds]);

  // 기존: 시간 설정 + 시작
  const startTimer = (seconds: number) => {
    setRemainingSeconds(seconds);
    setIsRunning(true);
  };

  // ✅ [추가] 시간만 설정하고 시작은 안 함
  const setTime = (seconds: number) => {
    setRemainingSeconds(seconds);
    setIsRunning(false);
  };

  // ✅ [추가] 멈춘 상태에서 다시 시작
  const resumeTimer = () => {
    if (remainingSeconds > 0) {
      setIsRunning(true);
    }
  };

  const pauseTimer = () => setIsRunning(false);

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
