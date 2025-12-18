import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";
import { SoundId } from "../data/sound";

export type PresetItem = { soundId: SoundId; volume: number };
export type Preset = {
  id: string;
  name: string;
  createdAt: number;
  items: PresetItem[];
};

const PRESETS_KEY = "healing_mixer_presets_v1";

interface PresetContextType {
  presets: Preset[];
  addPreset: (name: string, items: PresetItem[]) => Promise<void>;
  deletePreset: (id: string) => Promise<void>;

  pendingPreset: Preset | null;
  applyPreset: (preset: Preset) => void;
  clearPendingPreset: () => void;
}

const PresetContext = createContext<PresetContextType | null>(null);

export function PresetProvider({ children }: { children: React.ReactNode }) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [pendingPreset, setPendingPreset] = useState<Preset | null>(null);

  // 1. 초기화: 앱 실행 시 저장된 데이터 불러오기 (Load)
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PRESETS_KEY);
        if (raw) {
          setPresets(JSON.parse(raw));
        }
      } catch (e) {
        console.error("Failed to load presets", e);
      }
    })();
  }, []);

  const saveToStorage = async (newPresets: Preset[]) => {
    try {
      await AsyncStorage.setItem(PRESETS_KEY, JSON.stringify(newPresets));
      setPresets(newPresets);
    } catch (e) {
      Alert.alert("저장 실패", "데이터를 저장하지 못했습니다.");
    }
  };

  // 2. 프리셋 추가 (Create): 최신순 저장
  const addPreset = async (name: string, items: PresetItem[]) => {
    const newPreset: Preset = {
      id: String(Date.now()),
      name,
      createdAt: Date.now(),
      items,
    };
    const nextPresets = [newPreset, ...presets];
    await saveToStorage(nextPresets);
  };

  // 3. 프리셋 삭제 (Delete): ID가 일치하지 않는 항목만 남겨서 저장
  const deletePreset = async (id: string) => {
    const nextPresets = presets.filter((p) => p.id !== id);
    await saveToStorage(nextPresets);
  };

  // 탭 간 통신 함수
  const applyPreset = (preset: Preset) => {
    setPendingPreset(preset);
  };

  const clearPendingPreset = () => {
    setPendingPreset(null);
  };

  return (
    <PresetContext.Provider
      value={{
        presets,
        addPreset,
        deletePreset,
        pendingPreset,
        applyPreset,
        clearPendingPreset,
      }}
    >
      {children}
    </PresetContext.Provider>
  );
}

export const usePreset = () => {
  const context = useContext(PresetContext);
  if (!context)
    throw new Error("usePreset must be used within a PresetProvider");
  return context;
};
