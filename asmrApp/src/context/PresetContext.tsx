import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Alert } from "react-native";
import { SoundId } from "../data/sound";

// ✅ 기존 타입 정의 가져오기 (혹은 여기에 직접 정의해도 됨)
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
  
  // ✅ 탭 간 이동을 위한 "적용 대기 중인 프리셋"
  pendingPreset: Preset | null;
  applyPreset: (preset: Preset) => void;
  clearPendingPreset: () => void;
}

const PresetContext = createContext<PresetContextType | null>(null);

export function PresetProvider({ children }: { children: React.ReactNode }) {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [pendingPreset, setPendingPreset] = useState<Preset | null>(null);

  // 1. 앱 켜질 때 저장된 프리셋 불러오기
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

  // 2. 프리셋 저장하기
  const saveToStorage = async (newPresets: Preset[]) => {
    try {
      await AsyncStorage.setItem(PRESETS_KEY, JSON.stringify(newPresets));
      setPresets(newPresets);
    } catch (e) {
      Alert.alert("저장 실패", "데이터를 저장하지 못했습니다.");
    }
  };

  const addPreset = async (name: string, items: PresetItem[]) => {
    const newPreset: Preset = {
      id: String(Date.now()),
      name,
      createdAt: Date.now(),
      items,
    };
    // 최신순 저장
    const nextPresets = [newPreset, ...presets];
    await saveToStorage(nextPresets);
  };

  const deletePreset = async (id: string) => {
    const nextPresets = presets.filter((p) => p.id !== id);
    await saveToStorage(nextPresets);
  };

  // ✅ 3. 탭 간 데이터 전달용 함수
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
  if (!context) throw new Error("usePreset must be used within a PresetProvider");
  return context;
};