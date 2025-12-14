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
import { Ionicons } from "@expo/vector-icons";

// ✅ Context 및 데이터
import { usePreset, type Preset } from "../../src/context/PresetContext";
import { SOUND_LIST } from "../../src/data/sound";

// 사운드 ID -> 제목 변환 (예: rain -> Rain)
function getSoundTitle(soundId: string) {
  return SOUND_LIST.find((s) => s.id === soundId)?.title ?? soundId;
}

export default function PresetsScreen() {
  const { presets, deletePreset, applyPreset } = usePreset();
  
  // ✅ 검색어 상태 관리
  const [query, setQuery] = useState("");

// ✅ 검색 필터링 + 자동 정렬 (이름순)
  const visiblePresets = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = presets;

    // 1. 검색 (Search)
    if (q.length > 0) {
      list = list.filter((p) => {
        // (1) 프리셋 이름에서 찾기
        const matchName = p.name.toLowerCase().includes(q);
        
        // (2) 포함된 소리 이름(Tag)에서 찾기
        // p.items 배열을 하나씩 돌면서(some), 소리 제목에 검색어가 있는지 확인
        const matchSound = p.items.some((item) => {
          const soundTitle = getSoundTitle(item.soundId).toLowerCase();
          return soundTitle.includes(q);
        });

        // 둘 중 하나라도 맞으면 통과 (OR 조건)
        return matchName || matchSound;
      });
    }

    // 2. 자동 정렬 (Sort): 가나다순
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "ko"));
  }, [presets, query]);

  const onApply = useCallback(
    (preset: Preset) => {
      applyPreset(preset);
      router.navigate("/mixer");
    },
    [applyPreset]
  );

  const onDelete = useCallback(
    (preset: Preset) => {
      Alert.alert("삭제", `"${preset.name}"을(를) 삭제할까요?`, [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => void deletePreset(preset.id),
        },
      ]);
    },
    [deletePreset]
  );

  const renderItem = useCallback(
    ({ item }: { item: Preset }) => {
      const chipLabels = item.items.map((x) => getSoundTitle(x.soundId));

      return (
        <Pressable onPress={() => onApply(item)} style={styles.card}>
          {/* 카드 윗부분: 제목 + 삭제 버튼 */}
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

          {/* ✅ [복구] 기존 칩(Chip) 디자인 적용 */}
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

        {/* ✅ 검색창 (정렬 버튼 제거하고 검색창을 넓게 사용) */}
        <View style={styles.searchBox}>
           <Ionicons name="search" size={20} color="rgba(255,255,255,0.6)" style={{marginRight: 8}}/>
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

  header: { paddingTop: 56, paddingBottom: 14, paddingHorizontal: 18 }, // 헤더 높이 살짝 조정
  title: { fontSize: 34, color: "white", fontWeight: "900", lineHeight: 40 },
  subTitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginTop: 6,
    marginBottom: 16,
    fontWeight: "600",
  },

  // ✅ 검색창 스타일 (정렬 버튼 공간까지 차지하도록 flex: 1 유지하되 width 100% 느낌으로)
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.14)",
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, color: "white", fontWeight: "700", fontSize: 16 },

  list: { padding: 16, gap: 12 },
  empty: { color: "rgba(255,255,255,0.75)", paddingTop: 30, textAlign: 'center' },

  // ✅ 카드 스타일 (기존 디자인 복구)
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
    fontSize: 12,
  },

  // ✅ 칩(Chip) 스타일 (기존 디자인 복구)
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