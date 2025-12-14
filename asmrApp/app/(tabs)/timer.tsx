// app/(tabs)/timer.tsx
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import {
    clearTimer,
    loadTimer,
    pauseTimer,
    resumeTimer,
    setDuration,
    startTimer,
    type TimerState,
} from "../../src/storage/timer";

import { stopMixerSounds } from "../../src/services/mixerBridge";

const PRESETS = [
  { label: "10s", ms: 10_000 },
  { label: "15m", ms: 15 * 60 * 1000 },
  { label: "30m", ms: 30 * 60 * 1000 },
  { label: "60m", ms: 60 * 60 * 1000 },
] as const;

function formatMMSS(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function TimerScreen() {
  const [timer, setTimerState] = useState<TimerState | null>(null);
  const [now, setNow] = useState(Date.now());
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(() => {
    void (async () => {
      const t = await loadTimer();
      setTimerState(t);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const remainingMs = useMemo(() => {
    if (!timer) return 0;
    if (timer.status === "running" && timer.endAt) return Math.max(0, timer.endAt - now);
    return Math.max(0, timer.remainingMs);
  }, [timer, now]);

  const isRunning = timer?.status === "running";
  const isPaused = timer?.status === "paused";
  const isIdle = timer?.status === "idle";

  // running일 때만 tick
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);

    if (isRunning) {
      tickRef.current = setInterval(() => setNow(Date.now()), 200);
    }

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [isRunning]);

  // ✅ 타이머 종료되면: Mixer 음원 stop + 타이머 idle 정리
  useEffect(() => {
    if (!timer) return;

    if (timer.status === "running" && remainingMs <= 0) {
      void (async () => {
        await stopMixerSounds();
        const next = await clearTimer();
        setTimerState(next);
      })();
    }
  }, [timer, remainingMs]);

  const onSelectPreset = useCallback(
    (ms: number) => {
      if (!timer) return;
      if (timer.status !== "idle") return; // idle일 때만 변경

      void (async () => {
        const next = await setDuration(ms);
        setTimerState(next);
      })();
    },
    [timer]
  );

  const onStart = useCallback(() => {
    if (!timer) return;

    void (async () => {
      if (timer.status === "paused") {
        const next = await resumeTimer();
        setTimerState(next);
        return;
      }

      if (timer.status === "idle") {
        const next = await startTimer(timer.durationMs);
        setTimerState(next);
        return;
      }
    })();
  }, [timer]);

  // ✅ Pause는 시간만 정지(음원 영향 없음)
  const onPause = useCallback(() => {
    if (!timer) return;

    void (async () => {
      if (timer.status === "running") {
        const next = await pauseTimer();
        setTimerState(next);
      }
    })();
  }, [timer]);

  if (!timer) return <View style={styles.root} />;

  return (
    <View style={styles.root}>
      {/* ✅ 헤더: paddingTop/Horizontal 통일 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sleep Timer</Text>
      </View>

      {/* 중앙 영역 */}
      <View style={styles.center}>
        <Text style={styles.time}>{formatMMSS(remainingMs)}</Text>

        <View style={styles.actionsRow}>
          <Pressable
            onPress={onStart}
            style={[styles.actionBtn, styles.startBtn, isRunning && styles.disabledBtn]}
            disabled={!!isRunning}
          >
            <Text style={styles.startText}>{isPaused ? "RESUME" : "START"}</Text>
          </Pressable>

          <Pressable
            onPress={onPause}
            style={[styles.actionBtn, styles.pauseBtn, !isRunning && styles.disabledBtn]}
            disabled={!isRunning}
          >
            <Text style={styles.pauseText}>PAUSE</Text>
          </Pressable>
        </View>

        <Text style={styles.caption}>
          Pause는 시간만 멈추며, 음원 재생에는 영향을 주지 않습니다.
        </Text>
      </View>

      {/* 하단 프리셋 카드 */}
      <View style={styles.presetsCard}>
        <Text style={styles.sectionTitle}>Preset</Text>

        <View style={styles.pillsRow}>
          {PRESETS.map((p) => {
            const active = timer.durationMs === p.ms;
            const disabled = !isIdle;
            return (
              <Pressable
                key={p.label}
                onPress={() => onSelectPreset(p.ms)}
                disabled={disabled}
                style={[
                  styles.pill,
                  active && styles.pillActive,
                  disabled && styles.pillDisabled,
                ]}
              >
                <Text style={[styles.pillText, active && styles.pillTextActive]}>
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.help}>
          Timer가 끝나면 Mixer의 모든 사운드가 자동으로 정지됩니다.
        </Text>
      </View>
    </View>
  );
}

const NAVY = "#0f2d4a";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },

  // ✅ 여기서 paddingTop이 적용됩니다
  header: { paddingTop: 56, paddingBottom: 14, paddingHorizontal: 18 },
  headerTitle: { fontSize: 34, fontWeight: "900", color: "white", lineHeight: 40 },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },

  time: { fontSize: 92, fontWeight: "900", color: "white", letterSpacing: 2 },

  actionsRow: { flexDirection: "row", gap: 12, marginTop: 18, width: "100%" },

  actionBtn: {
    flex: 1,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  startBtn: { backgroundColor: "white" },
  startText: { color: NAVY, fontWeight: "900", letterSpacing: 1 },

  pauseBtn: { backgroundColor: "rgba(255,255,255,0.15)" },
  pauseText: { color: "white", fontWeight: "900", letterSpacing: 1 },

  disabledBtn: { opacity: 0.35 },

  caption: {
    marginTop: 12,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "700",
    textAlign: "center",
    paddingHorizontal: 6,
  },

  presetsCard: {
    marginHorizontal: 18,
    marginBottom: 18,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    padding: 14,
  },

  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#0b2034", marginBottom: 10 },

  pillsRow: { flexDirection: "row", gap: 10, justifyContent: "space-between" },

  pill: {
    flex: 1,
    height: 54,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,32,52,0.08)",
  },
  pillActive: { backgroundColor: "#0b2034" },
  pillDisabled: { opacity: 0.5 },

  pillText: { color: "#0b2034", fontWeight: "900", fontSize: 18 },
  pillTextActive: { color: "white" },

  help: { marginTop: 12, color: "#0b2034", opacity: 0.6, fontWeight: "700" },
});
