import { useCallback } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTimer } from "../../src/context/TimerContext";

const PRESETS = [
  { label: "10s", ms: 10_000 }, // 10초: 데모 및 테스트용
  { label: "15m", ms: 15 * 60 * 1000 },
  { label: "30m", ms: 30 * 60 * 1000 },
  { label: "60m", ms: 60 * 60 * 1000 },
] as const;

// 시간 포맷터 함수 (MM:SS)
function formatMMSS(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function TimerScreen() {
  // 1. TimerContext에서 상태와 제어 함수 가져오기
  const { remainingSeconds, isRunning, setTime, resumeTimer, pauseTimer, stopTimer } =
    useTimer();

  // 2. 프리셋 선택 핸들러
  const onSelectPreset = useCallback(
    (ms: number) => {
      setTime(ms / 1000);
    },
    [setTime]
  );

  // 3. 시작/일시정지 토글 핸들러
  const onToggle = useCallback(() => {
    if (isRunning) {
      pauseTimer();
    } else {
      if (remainingSeconds > 0) {
        resumeTimer();
      }
    }
  }, [isRunning, remainingSeconds, pauseTimer, resumeTimer]);

  // 4. 정지 핸들러 (시간 초기화)
  const onStop = useCallback(() => {
    stopTimer();
  }, [stopTimer]);

  return (
    <View style={styles.root}>
      {/* 헤더 영역 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Sleep Timer</Text>
      </View>

      {/* 중앙 타이머 디스플레이 */}
      <View style={styles.center}>
        <Text style={styles.time}>{formatMMSS(remainingSeconds * 1000)}</Text>

        <View style={styles.actionsRow}>
          <Pressable
            onPress={onToggle}
            style={[styles.actionBtn, styles.startBtn]}
          >
            <Text style={styles.startText}>
              {isRunning ? "PAUSE" : "START"}
            </Text>
          </Pressable>

          <Pressable
            onPress={onStop}
            style={[styles.actionBtn, styles.pauseBtn]}
          >
            <Text style={styles.pauseText}>STOP</Text>
          </Pressable>
        </View>

        <Text style={styles.caption}>
          타이머가 종료되면 믹서의 모든 사운드가 꺼집니다.
        </Text>
      </View>

      {/* 프리셋 선택 카드 */}
      <View style={styles.presetsCard}>
        <Text style={styles.sectionTitle}>Preset</Text>

        <View style={styles.pillsRow}>
          {PRESETS.map((p) => {
            const isSelected = remainingSeconds === p.ms / 1000;
            return (
              <Pressable
                key={p.label}
                onPress={() => onSelectPreset(p.ms)}
                style={[styles.pill, isSelected && styles.pillActive]}
              >
                <Text
                  style={[
                    styles.pillText,
                    isSelected && styles.pillTextActive,
                  ]}
                >
                  {p.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.help}>
          시간을 선택한 후 START 버튼을 눌러주세요.
        </Text>
      </View>
    </View>
  );
}

const NAVY = "#0f2d4a";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },

  header: { paddingTop: 56, paddingBottom: 14, paddingHorizontal: 18 },
  headerTitle: {
    fontSize: 34,
    fontWeight: "900",
    color: "white",
    lineHeight: 40,
  },

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

  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0b2034",
    marginBottom: 10,
  },

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

  pillText: { color: "#0b2034", fontWeight: "900", fontSize: 18 },
  pillTextActive: { color: "white" },

  help: { marginTop: 12, color: "#0b2034", opacity: 0.6, fontWeight: "700" },
});