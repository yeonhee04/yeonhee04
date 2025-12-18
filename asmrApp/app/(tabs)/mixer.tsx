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

import { SOUND_LIST, type SoundId } from "../../src/data/sound";
import { usePreset } from "../../src/context/PresetContext";
import { useTimer } from "../../src/context/TimerContext";

type SoundState = Record<SoundId, { isOn: boolean; volume: number }>;

function makeInitialState(): SoundState {
  const init = {} as SoundState;
  for (const s of SOUND_LIST)
    init[s.id] = { isOn: false, volume: s.defaultVolume };
  return init;
}

export default function MixerScreen() {
  // 1. UI 상태 (믹스 이름, 사운드별 상태, 저장 모달 표시 여부) 관리
  const [mixName, setMixName] = useState("Temporary Mix");
  const [state, setState] = useState<SoundState>(() => makeInitialState());
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  // 2. Context (타이머 정보 및 프리셋 기능) 가져오기
  const { remainingSeconds, isRunning } = useTimer();
  const { addPreset, pendingPreset, clearPendingPreset } = usePreset();

  // 3. 오디오 객체 관리 (Refs)
  const soundRefs = useRef<Record<SoundId, Audio.Sound | null>>({
    rain: null,
    fire: null,
    cafe: null,
    sea: null,
    keyboard: null,
    pencil: null,
  });

  const activeIds = useMemo(
    () => (Object.keys(state) as SoundId[]).filter((id) => state[id].isOn),
    [state]
  );

  // 4. 오디오 제어 헬퍼 함수
  // 개별 사운드 메모리 해제 (Stop & Unload)
  const unloadOne = useCallback(async (id: SoundId) => {
    const s = soundRefs.current[id];
    if (!s) return;

    try {
      await s.stopAsync(); // 재생 중지
    } catch {}
    try {
      await s.unloadAsync(); // 메모리 해제
    } catch {}

    soundRefs.current[id] = null;
  }, []);

  // 모든 사운드 끄기 (초기화)
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

  // 5. 랜덤 믹스 (Random Mix)
  const onRandomMix = useCallback(async () => {
    // (1) 기존 재생 중인 소리 초기화
    await turnOffAll();

    // (2) 사운드 리스트 셔플링 후 2~3개 무작위 선택
    const count = Math.floor(Math.random() * 2) + 2; // 2 or 3
    const shuffled = [...SOUND_LIST].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count);

    const nextState = makeInitialState();
    setMixName("🎲 Random Mix");

    // (3) 선택된 사운드 재생
    for (const s of selected) {
      // 볼륨 랜덤 설정 (0.3 ~ 0.8)
      const randomVol = Number((Math.random() * 0.5 + 0.3).toFixed(1));

      try {
        const { sound } = await Audio.Sound.createAsync(s.asset, {
          shouldPlay: true,
          isLooping: true, // 반복 재생 설정
          volume: randomVol,
        });
        soundRefs.current[s.id] = sound;
        nextState[s.id] = { isOn: true, volume: randomVol };
      } catch (e) {
        console.log(`Error playing ${s.id}`, e);
      }
    }
    setState(nextState);
  }, [turnOffAll]);

  // 6. 타이머 Fade Out & 종료 감지
  const wasRunningRef = useRef(false);

  useEffect(() => {
    // (1) Fade Out 로직: 남은 시간이 5초 이하일 때 볼륨을 서서히 줄임
    if (isRunning && remainingSeconds <= 5 && remainingSeconds > 0) {
      const ratio = remainingSeconds / 5;

      activeIds.forEach((id) => {
        const s = soundRefs.current[id];
        const originalVol = state[id].volume; // 사용자가 설정한 원래 볼륨
        if (s) {
          // 원래 볼륨에 비율을 곱해서 부드럽게 줄임
          s.setVolumeAsync(originalVol * ratio).catch(() => {});
        }
      });
    }

    // (2) 종료 감지: 타이머가 실행 중이었다가 0초가 되면 모든 소리 종료
    if (wasRunningRef.current && !isRunning && remainingSeconds === 0) {
      if (activeIds.length > 0) {
        void turnOffAll();
      }
    }
    wasRunningRef.current = isRunning;
  }, [remainingSeconds, isRunning, activeIds, state, turnOffAll]);

  // 7. 프리셋 적용 (Presets 탭 -> Mixer 탭 데이터 연동)
  useEffect(() => {
    if (!pendingPreset) return; // 대기 중인 프리셋이 없으면 무시

    (async () => {
      await turnOffAll(); // 기존 소리 끄기

      setState((prev) => { // 상태 업데이트 (UI 반영)
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

      for (const item of pendingPreset.items) { // 실제 오디오 재생
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

      clearPendingPreset();
    })();
  }, [pendingPreset, turnOffAll, clearPendingPreset]);

  // 8. 사용자 인터랙션 핸들러 (Toggle, Volume, Save)
  const toggleSound = useCallback(  // 사운드 토글 (ON/OFF)
    async (id: SoundId) => {
      const isOn = state[id].isOn;

      if (isOn) { // 이미 켜져 있으면 끄기
        await unloadOne(id);
        setState((prev) => ({ ...prev, [id]: { ...prev[id], isOn: false } }));
        return;
      }

      const meta = SOUND_LIST.find((x) => x.id === id);
      if (!meta) return;  // 꺼져 있으면 켜기

      try {
        const { sound } = await Audio.Sound.createAsync(meta.asset, {
          shouldPlay: true,
          isLooping: true,
          volume: state[id].volume,
        });
        soundRefs.current[id] = sound;
        setState((prev) => ({ ...prev, [id]: { ...prev[id], isOn: true } }));
      } catch {
        Alert.alert("재생 실패", "사운드 파일을 확인해 주세요.");
      }
    },
    [state, unloadOne]
  );

  // 슬라이더 볼륨 조절
  const setVolume = useCallback(async (id: SoundId, volume: number) => {
    setState((prev) => ({ ...prev, [id]: { ...prev[id], volume } }));

    const s = soundRefs.current[id];
    if (s) {
      try {
        await s.setVolumeAsync(volume);
      } catch {}
    }
  }, []);

  // iOS 무음 모드 재생 설정
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

  // 화면을 벗어날 때 소리 정리
  useEffect(() => {
    return () => {
      void turnOffAll();
    };
  }, [turnOffAll]);

  // 저장 버튼 클릭 시 (유효성 검사)
  const onPressSave = useCallback(() => {
    if (activeIds.length === 0) {
      Alert.alert("저장 불가", "최소 1개 이상의 사운드를 켜 주세요.");
      return;
    }
    setSaveName(
      mixName === "Temporary Mix" || mixName === "🎲 Random Mix" ? "" : mixName
    );
    setSaveOpen(true);
  }, [activeIds.length, mixName]);

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

    await addPreset(name, items);
    setMixName(name);
    setSaveOpen(false);
  }, [activeIds, saveName, state, addPreset]);

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
        {/* 사운드 아이콘 그리드 (3열 배치) */}
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

        {/* 볼륨 조절 패널 (활성화된 사운드만 표시) */}
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

        {/* 하단 액션 버튼 (OFF / RANDOM / SAVE) */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => void turnOffAll()}
            style={[styles.btn, styles.btnGhost]}
          >
            <Text style={styles.btnGhostText}>OFF</Text>
          </Pressable>

          <Pressable
            onPress={onRandomMix}
            style={[styles.btn, styles.btnRandom]}
          >
            <Text style={styles.btnRandomText}>🎲 RANDOM</Text>
          </Pressable>

          <Pressable
            onPress={onPressSave}
            style={[styles.btn, styles.btnPrimary]}
          >
            <Text style={styles.btnPrimaryText}>SAVE</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* 프리셋 저장 모달 */}
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

  actions: { flexDirection: "row", marginTop: 14, gap: 10 },
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

  btnRandom: {
    backgroundColor: "#e6f0ff",
    borderWidth: 2,
    borderColor: "white",
  },
  btnRandomText: { color: "#0056b3", fontWeight: "900" },

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
