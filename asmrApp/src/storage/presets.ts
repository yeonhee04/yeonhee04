import AsyncStorage from "@react-native-async-storage/async-storage";
import { SoundId } from "../data/sound";

export type PresetItem = { soundId: SoundId; volume: number };
export type Preset = {
  id: string;
  name: string;
  createdAt: number;
  items: PresetItem[];
};

const PRESETS_KEY = "healing_mixer_presets_v1";
const PENDING_PRESET_KEY = "healing_mixer_pending_preset_v1";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function loadPresets(): Promise<Preset[]> {
  const raw = await AsyncStorage.getItem(PRESETS_KEY);
  const list = safeParse<Preset[]>(raw, []);
  // 최신순
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

export async function savePresets(presets: Preset[]): Promise<void> {
  await AsyncStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

export async function addPreset(preset: Preset): Promise<void> {
  const presets = await loadPresets();
  presets.unshift(preset);
  await savePresets(presets);
}

export async function deletePreset(id: string): Promise<void> {
  const presets = await loadPresets();
  await savePresets(presets.filter((p) => p.id !== id));
}

// Presets -> Mixer로 “적용 요청” 전달용
export async function setPendingPreset(preset: Preset): Promise<void> {
  await AsyncStorage.setItem(PENDING_PRESET_KEY, JSON.stringify(preset));
}

export async function consumePendingPreset(): Promise<Preset | null> {
  const raw = await AsyncStorage.getItem(PENDING_PRESET_KEY);
  if (!raw) return null;
  await AsyncStorage.removeItem(PENDING_PRESET_KEY);
  return safeParse<Preset | null>(raw, null);
}
