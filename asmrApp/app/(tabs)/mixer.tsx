import Slider from "@react-native-community/slider";
import { useFocusEffect } from "@react-navigation/native";
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
import { registerStopAll } from "../../src/services/mixerBridge";
import {
  addPreset,
  consumePendingPreset,
  type Preset,
} from "../../src/storage/presets";
import { loadTimer } from "../../src/storage/timer";

type SoundState = Record<SoundId, { isOn: boolean; volume: number }>;

function makeInitialState(): SoundState {
  const init = {} as SoundState;
  for (const s of SOUND_LIST)
    init[s.id] = { isOn: false, volume: s.defaultVolume };
  return init;
}

export default function MixerScreen() {
  const [mixName, setMixName] = useState("Temporary Mix");
  const [state, setState] = useState<SoundState>(() => makeInitialState());

  // 각 사운드 인스턴스 저장
  const soundRefs = useRef<Record<SoundId, Audio.Sound | null>>({
    rain: null,
    fire: null,
    cafe: null,
    sea: null,
    keyboard: null,
    pencil: null,
  });

  // 타이머가 running일 때 Mixer에서 setTimeout을 걸어두기 위한 ref
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 저장 모달
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  const activeIds = useMemo(
    () => (Object.keys(state) as SoundId[]).filter((id) => state[id].isOn),
    [state]
  );

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

  const turnOffAll = useCallback(async () => {
    // 타이머 timeout 해제
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }

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

  // Timer 탭에서 타이머 종료 시 Mixer의 음원을 멈추기 위한 브리지 등록
  useEffect(() => {
    registerStopAll(turnOffAll);
    return () => {
      registerStopAll(null);
    };
  }, [turnOffAll]);

  const toggleSound = useCallback(
    async (id: SoundId) => {
      const isOn = state[id].isOn;

      if (isOn) {
        await unloadOne(id);
        setState((prev) => ({ ...prev, [id]: { ...prev[id], isOn: false } }));
        return;
      }

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

  const setVolume = useCallback(async (id: SoundId, volume: number) => {
    setState((prev) => ({ ...prev, [id]: { ...prev[id], volume } }));

    const s = soundRefs.current[id];
    if (s) {
      try {
        await s.setVolumeAsync(volume);
      } catch {}
    }
  }, []);

  // (선택) iOS 무음모드에서도 재생되게
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

  // 화면 언마운트 시 정리
  useEffect(() => {
    return () => {
      void turnOffAll();
      if (sleepTimerRef.current) {
        clearTimeout(sleepTimerRef.current);
        sleepTimerRef.current = null;
      }
    };
  }, [turnOffAll]);

  // Presets 화면에서 “적용 요청” 소비하여 적용
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      (async () => {
        const preset = await consumePendingPreset();
        if (!preset || cancelled) return;

        await turnOffAll();

        // 상태 반영
        setState((prev) => {
          const next: SoundState = { ...prev };
          for (const id of Object.keys(next) as SoundId[]) {
            next[id] = { ...next[id], isOn: false };
          }
          for (const item of preset.items) {
            next[item.soundId] = {
              ...next[item.soundId],
              isOn: true,
              volume: item.volume,
            };
          }
          return next;
        });

        setMixName(preset.name);

        // 오디오 로드/재생
        for (const item of preset.items) {
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
      })();

      return () => {
        cancelled = true;
      };
    }, [turnOffAll])
  );

  // Timer 저장 상태를 읽어와, running일 때만 “정지 예약”을 Mixer에 걸어둠
  // paused/idle이면 예약을 해제(=음원에 영향 없음)
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      void (async () => {
        const t = await loadTimer();
        if (cancelled) return;

        // 기존 timeout 제거
        if (sleepTimerRef.current) {
          clearTimeout(sleepTimerRef.current);
          sleepTimerRef.current = null;
        }

        // running일 때만 endAt 기준 예약
        if (t.status !== "running" || !t.endAt) return;

        const ms = t.endAt - Date.now();
        if (ms <= 0) return;

        sleepTimerRef.current = setTimeout(() => {
          void turnOffAll();
        }, ms);
      })();

      return () => {
        cancelled = true;
      };
    }, [turnOffAll])
  );

  const onPressSave = useCallback(() => {
    if (activeIds.length === 0) {
      Alert.alert("저장 불가", "최소 1개 이상의 사운드를 켜 주세요.");
      return;
    }
    setSaveName(mixName === "Temporary Mix" ? "" : mixName);
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
    const preset: Preset = {
      id: String(Date.now()),
      name,
      createdAt: Date.now(),
      items,
    };

    await addPreset(preset);
    setMixName(name);
    setSaveOpen(false);
  }, [activeIds, saveName, state]);

  return (
    <View style={styles.root}>
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

  headerAppIcon: {
    width: 33,
    height: 33,
    resizeMode: "contain",
  },

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

  panel: {
    marginTop: 4,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 18,
    padding: 14,
  },
  panelTitle: { fontSize: 16, fontWeight: "800", color: "#0b2034" },
  panelEmpty: { marginTop: 10, color: "#0b2034", opacity: 0.6 },

  row: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  rowLabel: { width: 90, fontWeight: "700", color: "#0b2034", marginRight: 10 },

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

  tileIcon: {
    width: 34,
    height: 34,
    resizeMode: "contain",
    opacity: 0.95,
  },
});
