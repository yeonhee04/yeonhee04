import Slider from "@react-native-community/slider";
import { Audio } from "expo-av";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

// ✅ 수업 시간에 배운 데이터 구조 (Lec 07, 10)
import { SOUND_LIST, type SoundId } from "../../src/data/sound";

// ✅ Context (State 관리의 심화 - Lec 04, 09 확장)
import { usePreset } from "../../src/context/PresetContext";
import { useTimer } from "../../src/context/TimerContext";

// 소리 상태 타입 정의 (TypeScript)
type SoundState = Record<SoundId, { isOn: boolean; volume: number }>;

// 초기 상태 만들기 함수
function makeInitialState(): SoundState {
  const init = {} as SoundState;
  for (const s of SOUND_LIST)
    init[s.id] = { isOn: false, volume: s.defaultVolume };
  return init;
}

export default function MixerScreen() {
  // 1. 기본 State (Lec 02, 04)
  const [mixName, setMixName] = useState("Temporary Mix");
  const [state, setState] = useState<SoundState>(() => makeInitialState());
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  // 2. Context에서 전역 데이터 가져오기
  const { remainingSeconds, isRunning } = useTimer();
  const { addPreset, pendingPreset, clearPendingPreset } = usePreset();

  // 3. 오디오 객체 관리 (Lec 06 Piano App 심화)
  const soundRefs = useRef<Record<SoundId, Audio.Sound | null>>({
    rain: null,
    fire: null,
    cafe: null,
    sea: null,
    keyboard: null,
    pencil: null,
  });

  // 현재 켜진 사운드 목록 (Lec 07 Array)
  const activeIds = useMemo(
    () => (Object.keys(state) as SoundId[]).filter((id) => state[id].isOn),
    [state]
  );

  // 개별 사운드 해제 함수 (메모리 관리)
  const unloadOne = useCallback(async (id: SoundId) => {
    const s = soundRefs.current[id];
    if (!s) return;

    try {
      await s.stopAsync();
    } catch {}
    try {
      await s.unloadAsync();
    } catch {}

    soundRefs.current[id] = null;
  }, []);

  // 모든 소리 끄기 함수
  const turnOffAll = useCallback(async () => {
    const ids = Object.keys(soundRefs.current) as SoundId[];
    for (const id of ids) await unloadOne(id);

    setState((prev) => {
      const next: SoundState = { ...prev };
      for (const id of Object.keys(next) as SoundId[]) {
        next[id] = { ...next[id], isOn: false };
      }
      return next;
    });
  }, [unloadOne]);

  // 4. 타이머 종료 감지 (Lec 12 Conditional + Lec 17 Effect)
  const wasRunningRef = useRef(false);

  useEffect(() => {
    // 타이머가 돌다가(wasRunning) 멈췄고(!isRunning), 시간이 0이면 종료된 것
    if (wasRunningRef.current && !isRunning && remainingSeconds === 0) {
      if (activeIds.length > 0) {
        void turnOffAll();
      }
    }
    wasRunningRef.current = isRunning;
  }, [remainingSeconds, isRunning, activeIds.length, turnOffAll]);

  // 5. 프리셋 적용 감지 (Presets 탭에서 선택 시 실행)
  useEffect(() => {
    if (!pendingPreset) return; // 대기 중인 프리셋이 없으면 무시

    (async () => {
      // (1) 기존 소리 끄기
      await turnOffAll();

      // (2) 화면 상태 업데이트 (State Update)
      setState((prev) => {
        const next: SoundState = { ...prev };
        for (const id of Object.keys(next) as SoundId[]) {
          next[id] = { ...next[id], isOn: false };
        }
        for (const item of pendingPreset.items) {
          next[item.soundId] = {
            ...next[item.soundId],
            isOn: true,
            volume: item.volume,
          };
        }
        return next;
      });

      setMixName(pendingPreset.name);

      // (3) 실제 소리 재생 (Audio Playback)
      for (const item of pendingPreset.items) {
        const meta = SOUND_LIST.find((x) => x.id === item.soundId);
        if (!meta) continue;
        try {
          const { sound } = await Audio.Sound.createAsync(meta.asset, {
            shouldPlay: true,
            isLooping: true,
            volume: item.volume,
          });
          soundRefs.current[item.soundId] = sound;
        } catch {}
      }

      // (4) 적용 완료 후 대기열 비우기
      clearPendingPreset();
    })();
  }, [pendingPreset, turnOffAll, clearPendingPreset]);

  // 6. 소리 토글 (Lec 06 Piano 로직 응용)
  const toggleSound = useCallback(
    async (id: SoundId) => {
      const isOn = state[id].isOn;

      if (isOn) {
        // 켜져 있으면 끄기
        await unloadOne(id);
        setState((prev) => ({ ...prev, [id]: { ...prev[id], isOn: false } }));
        return;
      }

      // 꺼져 있으면 켜기
      const meta = SOUND_LIST.find((x) => x.id === id);
      if (!meta) return;

      try {
        const { sound } = await Audio.Sound.createAsync(meta.asset, {
          shouldPlay: true,
          isLooping: true,
          volume: state[id].volume,
        });
        soundRefs.current[id] = sound;
        setState((prev) => ({ ...prev, [id]: { ...prev[id], isOn: true } }));
      } catch {
        Alert.alert("오디오 재생 실패", "사운드 파일/설정을 확인해 주세요.");
      }
    },
    [state, unloadOne]
  );

  // 볼륨 조절
  const setVolume = useCallback(async (id: SoundId, volume: number) => {
    setState((prev) => ({ ...prev, [id]: { ...prev[id], volume } }));

    const s = soundRefs.current[id];
    if (s) {
      try {
        await s.setVolumeAsync(volume);
      } catch {}
    }
  }, []);

  // iOS 무음 모드 설정 (Lec 08 Audio)
  useEffect(() => {
    void (async () => {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
      } catch {}
    })();
  }, []);

  // 화면 나갈 때 정리 (Clean-up)
  useEffect(() => {
    return () => {
      void turnOffAll();
    };
  }, [turnOffAll]);

  // 저장 버튼 핸들러
  const onPressSave = useCallback(() => {
    if (activeIds.length === 0) {
      Alert.alert("저장 불가", "최소 1개 이상의 사운드를 켜 주세요.");
      return;
    }
    setSaveName(mixName === "Temporary Mix" ? "" : mixName);
    setSaveOpen(true);
  }, [activeIds.length, mixName]);

  // 저장 확인 (Context의 addPreset 사용)
  const confirmSave = useCallback(async () => {
    const name = saveName.trim();
    if (!name) {
      Alert.alert("이름 필요", "프리셋 이름을 입력해 주세요.");
      return;
    }

    const items = activeIds.map((id) => ({
      soundId: id,
      volume: state[id].volume,
    }));

    // ✅ Context를 통해 저장 (Lec 15 저장 로직을 간편하게 사용)
    await addPreset(name, items);

    setMixName(name);
    setSaveOpen(false);
  }, [activeIds, saveName, state, addPreset]);

  // UI 렌더링 (Lec 06 Flex Layout + Lec 09 Components)
  return (
    <View style={styles.root}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerAppIconWrap}>
            <Image
              source={require("../../assets/app-icon.png")}
              style={styles.headerAppIcon}
            />
          </View>
          <Text style={styles.headerTitle}>Healing Mixer</Text>
        </View>
        <Text style={styles.headerSubTitle}>{mixName}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* 사운드 그리드 */}
        <View style={styles.grid}>
          {SOUND_LIST.map((s) => {
            const on = state[s.id].isOn;
            return (
              <Pressable
                key={s.id}
                onPress={() => void toggleSound(s.id)}
                style={[styles.tile, on ? styles.tileOn : styles.tileOff]}
              >
                <Image source={s.icon} style={styles.tileIcon} />
                <View>
                  <Text style={styles.tileText}>{s.title}</Text>
                  <Text style={styles.tileBadge}>{on ? "ON" : "OFF"}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* 볼륨 패널 */}
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>볼륨 조절</Text>
          {activeIds.length === 0 ? (
            <Text style={styles.panelEmpty}>켜진 사운드가 없습니다.</Text>
          ) : (
            activeIds.map((id) => (
              <View key={id} style={styles.row}>
                <Text style={styles.rowLabel}>
                  {SOUND_LIST.find((x) => x.id === id)?.title ?? id}
                </Text>
                <Slider
                  style={{ flex: 1 }}
                  value={state[id].volume}
                  minimumValue={0}
                  maximumValue={1}
                  onValueChange={(v) => void setVolume(id, v)}
                />
              </View>
            ))
          )}
        </View>

        {/* 하단 버튼 */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => void turnOffAll()}
            style={[styles.btn, styles.btnGhost]}
          >
            <Text style={styles.btnGhostText}>TURN OFF ALL</Text>
          </Pressable>

          <Pressable
            onPress={onPressSave}
            style={[styles.btn, styles.btnPrimary]}
          >
            <Text style={styles.btnPrimaryText}>SAVE</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* 저장 모달 */}
      <Modal visible={saveOpen} transparent animationType="fade">
        <View style={styles.modalBack}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>프리셋 저장</Text>
            <TextInput
              value={saveName}
              onChangeText={setSaveName}
              placeholder="예: Rain & Fire Mix"
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setSaveOpen(false)}
                style={[styles.btn, styles.btnGhost]}
              >
                <Text style={styles.btnGhostText}>CANCEL</Text>
              </Pressable>
              <Pressable
                onPress={() => void confirmSave()}
                style={[styles.btn, styles.btnPrimary]}
              >
                <Text style={styles.btnPrimaryText}>SAVE</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// 스타일 정의 (Lec 02 StyleSheet)
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f2d4a" },

  header: { paddingTop: 56, paddingBottom: 14, paddingHorizontal: 18 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerAppIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(15,45,74,0.10)",
  },
  headerAppIcon: { width: 33, height: 33, resizeMode: "contain" },
  headerTitle: {
    fontSize: 34,
    color: "white",
    fontWeight: "900",
    lineHeight: 40,
  },
  headerSubTitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginTop: 6,
    fontWeight: "600",
  },

  body: { padding: 16, paddingBottom: 30 },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  tile: {
    width: "31%",
    minWidth: 110,
    aspectRatio: 1,
    borderRadius: 16,
    padding: 12,
    justifyContent: "space-between",
    marginBottom: 12,
  },
  tileOn: { backgroundColor: "rgba(255,255,255,0.95)" },
  tileOff: { backgroundColor: "rgba(255,255,255,0.25)" },
  tileText: { fontSize: 16, fontWeight: "700", color: "#0b2034" },
  tileBadge: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0b2034",
    opacity: 0.8,
  },
  tileIcon: { width: 34, height: 34, resizeMode: "contain", opacity: 0.95 },

  panel: {
    marginTop: 4,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 18,
    padding: 14,
  },
  panelTitle: { fontSize: 16, fontWeight: "800", color: "#0b2034" },
  panelEmpty: { marginTop: 10, color: "#0b2034", opacity: 0.6 },

  row: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  rowLabel: {
    width: 90,
    fontWeight: "700",
    color: "#0b2034",
    marginRight: 10,
  },

  actions: { flexDirection: "row", marginTop: 14, gap: 12 },
  btn: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: { backgroundColor: "rgba(255,255,255,0.25)" },
  btnGhostText: { color: "white", fontWeight: "800" },
  btnPrimary: { backgroundColor: "rgba(255,255,255,0.95)" },
  btnPrimaryText: { color: "#0b2034", fontWeight: "900" },

  modalBack: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 18,
  },
  modalCard: { backgroundColor: "white", borderRadius: 18, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: "900", color: "#0b2034" },
  modalInput: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(11,32,52,0.15)",
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
  },
  modalActions: { flexDirection: "row", marginTop: 12, gap: 12 },
});