import AsyncStorage from "@react-native-async-storage/async-storage";

export type TimerStatus = "idle" | "running" | "paused";

export type TimerState = {
  status: TimerStatus;
  durationMs: number;     // 선택된 프리셋 시간(예: 15m)
  endAt: number | null;   // running일 때만 사용
  remainingMs: number;    // paused/idle에서 표시용
};

const TIMER_KEY = "healing_mixer_timer_v2";

const DEFAULT_STATE: TimerState = {
  status: "idle",
  durationMs: 15 * 60 * 1000,
  endAt: null,
  remainingMs: 15 * 60 * 1000,
};

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function loadTimer(): Promise<TimerState> {
  const raw = await AsyncStorage.getItem(TIMER_KEY);
  return { ...DEFAULT_STATE, ...safeParse(raw, {}) };
}

export async function saveTimer(next: TimerState): Promise<void> {
  await AsyncStorage.setItem(TIMER_KEY, JSON.stringify(next));
}

export async function setDuration(durationMs: number): Promise<TimerState> {
  const cur = await loadTimer();
  // idle일 때만 남은 시간을 프리셋으로 리셋 (실사용 UX)
  const next: TimerState =
    cur.status === "idle"
      ? { ...cur, durationMs, remainingMs: durationMs, endAt: null }
      : { ...cur, durationMs };
  await saveTimer(next);
  return next;
}

export async function startTimer(durationMs: number): Promise<TimerState> {
  const endAt = Date.now() + durationMs;
  const next: TimerState = {
    status: "running",
    durationMs,
    endAt,
    remainingMs: durationMs,
  };
  await saveTimer(next);
  return next;
}

export async function pauseTimer(): Promise<TimerState> {
  const cur = await loadTimer();
  if (cur.status !== "running" || !cur.endAt) return cur;

  const remainingMs = Math.max(0, cur.endAt - Date.now());
  const next: TimerState = {
    ...cur,
    status: "paused",
    endAt: null,
    remainingMs,
  };
  await saveTimer(next);
  return next;
}

export async function resumeTimer(): Promise<TimerState> {
  const cur = await loadTimer();
  if (cur.status !== "paused") return cur;
  if (cur.remainingMs <= 0) return clearTimer();

  const endAt = Date.now() + cur.remainingMs;
  const next: TimerState = {
    ...cur,
    status: "running",
    endAt,
  };
  await saveTimer(next);
  return next;
}

export async function clearTimer(): Promise<TimerState> {
  const cur = await loadTimer();
  const durationMs = cur.durationMs || DEFAULT_STATE.durationMs;

  const next: TimerState = {
    status: "idle",
    durationMs,
    endAt: null,
    remainingMs: durationMs,
  };

  await saveTimer(next);
  return next;
}

