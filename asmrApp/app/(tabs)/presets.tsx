import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  deletePreset,
  loadPresets,
  setPendingPreset,
  type Preset,
} from "../../src/storage/presets";

// ⚠️ 파일명이 src/data/sound.ts라면 "../../src/data/sound" 로 변경
import { SOUND_LIST } from "../../src/data/sound";

type SortMode = "recent" | "name" | "sounds";

function getSoundTitle(soundId: string) {
  return SOUND_LIST.find((s) => s.id === soundId)?.title ?? soundId;
}

function sortLabel(mode: SortMode) {
  if (mode === "recent") return "Recent";
  if (mode === "name") return "Name";
  return "Sounds";
}

export default function PresetsScreen() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");

  const refresh = useCallback(() => {
    void (async () => {
      const list = await loadPresets();
      setPresets(list);
    })();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const visiblePresets = useMemo(() => {
    const q = query.trim().toLowerCase();

    let list = presets;
    if (q.length > 0) {
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }

    if (sortMode === "recent") return list;

    const copy = [...list];

    if (sortMode === "name") {
      copy.sort((a, b) => a.name.localeCompare(b.name, "ko"));
      return copy;
    }

    // sounds
    copy.sort((a, b) => {
      const diff = b.items.length - a.items.length;
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name, "ko");
    });
    return copy;
  }, [presets, query, sortMode]);

  const cycleSort = useCallback(() => {
    setSortMode((prev) => {
      if (prev === "recent") return "name";
      if (prev === "name") return "sounds";
      return "recent";
    });
  }, []);

  const onApply = useCallback(async (preset: Preset) => {
    await setPendingPreset(preset);
    router.navigate("/mixer");
  }, []);

  const onDelete = useCallback(
    (preset: Preset) => {
      Alert.alert("삭제", `"${preset.name}"을(를) 삭제할까요?`, [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => {
            void (async () => {
              await deletePreset(preset.id);
              refresh();
            })();
          },
        },
      ]);
    },
    [refresh]
  );

  const renderItem = useCallback(
    ({ item }: { item: Preset }) => {
      const chipLabels = item.items.map((x) => getSoundTitle(x.soundId));

      return (
        <Pressable onPress={() => void onApply(item)} style={styles.card}>
          {/* ✅ 상단 Row: 이름 + Delete */}
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.name}
            </Text>

            <Pressable
              onPress={() => onDelete(item)}
              style={styles.deleteTextBtn}
              hitSlop={10}
            >
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </View>

          {/* ✅ 하단 Row: 칩 */}
          <View style={styles.chipsWrap}>
            {chipLabels.map((label, idx) => (
              <View key={`${item.id}-${idx}-${label}`} style={styles.chip}>
                <Text style={styles.chipText} numberOfLines={1}>
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </Pressable>
      );
    },
    [onApply, onDelete]
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Saved Mixes</Text>
        <Text style={styles.subTitle}>탭하면 Mixer에 적용됩니다</Text>

        {/* ✅ 간격 추가: subTitle 아래 여백 + controlsRow는 바로 붙임 */}
        <View style={styles.controlsRow}>
          <View style={styles.searchBox}>
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search presets..."
              placeholderTextColor="rgba(255,255,255,0.6)"
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>

          <Pressable onPress={cycleSort} style={styles.sortBtn}>
            <Text style={styles.sortText}>{sortLabel(sortMode)}</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={visiblePresets}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {presets.length === 0
              ? "저장된 프리셋이 없습니다."
              : "검색 결과가 없습니다."}
          </Text>
        }
        renderItem={renderItem}
      />
    </View>
  );
}

const NAVY = "#0f2d4a";

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: NAVY },

  header: { paddingTop: 56, paddingBottom: 14, paddingHorizontal: 18 },
  title: { fontSize: 34, color: "white", fontWeight: "900", lineHeight: 40 },
  subTitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginTop: 6,
    marginBottom: 16, // ✅ 검색창과 간격
    fontWeight: "600",
  },

  controlsRow: { flexDirection: "row", gap: 10 },
  searchBox: {
    flex: 1,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  searchInput: { color: "white", fontWeight: "700" },

  sortBtn: {
    width: 92,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  sortText: { color: "#0b2034", fontWeight: "900" },

  list: { padding: 16, gap: 12 },
  empty: { color: "rgba(255,255,255,0.75)", paddingTop: 30 },

  // ✅ 카드: 2단 구조 + border
  card: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(15,45,74,0.10)",
  },

  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  cardTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "900",
    color: "#0b2034",
  },

  // ✅ Delete 버튼을 “가벼운 텍스트 버튼”으로
  deleteTextBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(15,45,74,0.06)",
  },
  deleteText: {
    fontWeight: "900",
    color: "#0b2034",
    opacity: 0.75,
  },

  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(15,45,74,0.10)",
    maxWidth: 120,
  },
  chipText: {
    fontWeight: "800",
    color: "#0b2034",
    opacity: 0.85,
    fontSize: 12,
  },
});
