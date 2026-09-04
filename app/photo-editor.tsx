// Powered by OnSpace.AI — Photo Editor
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ScrollView,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  PanResponder,
  GestureResponderEvent,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import ViewShot from 'react-native-view-shot';
import Svg, { Path, Text as SvgText } from 'react-native-svg';
import { useAlert } from '@/template';
import { useGallery } from '@/hooks/useGallery';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

// ─── Types ───────────────────────────────────────────────────────────────────
type Tool = 'none' | 'draw' | 'text';

interface DrawPath {
  id: string;
  points: string;
  color: string;
  width: number;
}

interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  size: number;
}

// ─── Filter definitions ───────────────────────────────────────────────────────
const FILTERS = [
  { id: 'normal', label: 'Original', overlay: 'transparent', opacity: 0 },
  { id: 'warm', label: 'Chaud', overlay: 'rgba(255,150,50,0.25)', opacity: 1 },
  { id: 'cool', label: 'Froid', overlay: 'rgba(50,150,255,0.25)', opacity: 1 },
  { id: 'sepia', label: 'Sépia', overlay: 'rgba(180,130,70,0.35)', opacity: 1 },
  { id: 'noir', label: 'Noir & B', overlay: 'rgba(20,20,20,0.55)', opacity: 1 },
  { id: 'rose', label: 'Rose', overlay: 'rgba(255,100,180,0.25)', opacity: 1 },
  { id: 'dream', label: 'Dream', overlay: 'rgba(150,80,255,0.30)', opacity: 1 },
  { id: 'golden', label: 'Golden', overlay: 'rgba(255,210,0,0.30)', opacity: 1 },
];

const DRAW_COLORS = ['#FFFFFF', '#FF6B6B', '#FDCB6E', '#55EFC4', '#74B9FF', '#A29BFE', '#FD79A8', '#000000'];
const TEXT_COLORS = ['#FFFFFF', '#FF6B6B', '#FDCB6E', '#55EFC4', '#74B9FF', '#A29BFE', '#FD79A8', '#000000'];

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const EDITOR_H = SCREEN_H * 0.55;

export default function PhotoEditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { photoUri, photoName, photoId } = useLocalSearchParams<{
    photoUri: string;
    photoName: string;
    photoId: string;
    albumId: string;
  }>();
  const { showAlert } = useAlert();
  const { photos, allPhotos, renamePhoto } = useGallery();

  const viewShotRef = useRef<ViewShot>(null);

  // ── Tool state ──────────────────────────────────────────────────────────────
  const [activeTool, setActiveTool] = useState<Tool>('none');
  const [activeFilter, setActiveFilter] = useState(FILTERS[0]);

  // ── Drawing state ───────────────────────────────────────────────────────────
  const [paths, setPaths] = useState<DrawPath[]>([]);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [drawColor, setDrawColor] = useState(DRAW_COLORS[0]);
  const [brushSize, setBrushSize] = useState(4);

  // ── Text state ──────────────────────────────────────────────────────────────
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [textModalVisible, setTextModalVisible] = useState(false);
  const [pendingText, setPendingText] = useState('');
  const [textColor, setTextColor] = useState(TEXT_COLORS[0]);
  const [fontSize, setFontSize] = useState(24);

  // ── Save state ──────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);

  // ─── Drawing helpers ────────────────────────────────────────────────────────
  const pointsToSvgD = (pts: { x: number; y: number }[]): string => {
    if (pts.length < 2) return '';
    return pts.reduce((acc, pt, i) => {
      if (i === 0) return `M ${pt.x} ${pt.y}`;
      return `${acc} L ${pt.x} ${pt.y}`;
    }, '');
  };

  // Reserved for pinch-to-zoom bounds; kept so the layout math stays in one place.
  const _editorLayout = useRef({ x: 0, y: 0, width: SCREEN_W, height: EDITOR_H });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e: GestureResponderEvent) => {
        const { locationX, locationY } = e.nativeEvent;
        setCurrentPoints([{ x: locationX, y: locationY }]);
      },
      onPanResponderMove: (e: GestureResponderEvent) => {
        const { locationX, locationY } = e.nativeEvent;
        setCurrentPoints((prev) => [...prev, { x: locationX, y: locationY }]);
      },
      onPanResponderRelease: () => {
        setCurrentPoints((prev) => {
          if (prev.length > 1) {
            const d = pointsToSvgD(prev);
            if (d) {
              setPaths((prevPaths) => [
                ...prevPaths,
                { id: `path_${Date.now()}`, points: d, color: drawColor, width: brushSize },
              ]);
            }
          }
          return [];
        });
      },
    }),
  ).current;

  // ─── Add text overlay ───────────────────────────────────────────────────────
  const commitText = useCallback(() => {
    if (!pendingText.trim()) {
      setTextModalVisible(false);
      return;
    }
    setTextOverlays((prev) => [
      ...prev,
      {
        id: `text_${Date.now()}`,
        text: pendingText.trim(),
        x: SCREEN_W / 2,
        y: EDITOR_H / 2,
        color: textColor,
        size: fontSize,
      },
    ]);
    setPendingText('');
    setTextModalVisible(false);
  }, [pendingText, textColor, fontSize]);

  // ─── Undo ───────────────────────────────────────────────────────────────────
  const handleUndo = useCallback(() => {
    if (activeTool === 'draw' && paths.length > 0) {
      setPaths((prev) => prev.slice(0, -1));
    } else if (activeTool === 'text' && textOverlays.length > 0) {
      setTextOverlays((prev) => prev.slice(0, -1));
    }
  }, [activeTool, paths, textOverlays]);

  const handleClearAll = useCallback(() => {
    showAlert('Effacer tout ?', 'Tous les dessins et textes seront supprimés.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Effacer',
        style: 'destructive',
        onPress: () => {
          setPaths([]);
          setTextOverlays([]);
        },
      },
    ]);
  }, []);

  // ─── Save ───────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!viewShotRef.current) return;
    setSaving(true);
    try {
      const uri = await (viewShotRef.current as any).capture();
      const photo = [...photos, ...allPhotos].find((p) => p.id === photoId);
      if (photo) {
        await renamePhoto({ ...photo, uri }, photo.name);
      }
      showAlert('Sauvegardé !', 'La photo éditée a été enregistrée.');
      router.back();
    } catch {
      showAlert('Erreur', 'Impossible de sauvegarder la photo éditée.');
    } finally {
      setSaving(false);
    }
  }, [photos, allPhotos, photoId, renamePhoto]);

  const currentSvgD = pointsToSvgD(currentPoints);
  const hasEdits = paths.length > 0 || textOverlays.length > 0 || activeFilter.id !== 'normal';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          style={styles.iconBtn}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Fermer l'éditeur"
        >
          <MaterialIcons name="close" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          {photoName}
        </Text>
        <View style={styles.topRight}>
          {hasEdits ? (
            <Pressable
              onPress={handleUndo}
              style={styles.iconBtn}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Annuler la dernière modification"
            >
              <MaterialIcons name="undo" size={22} color={Colors.textSecondary} />
            </Pressable>
          ) : null}
          {hasEdits ? (
            <Pressable
              onPress={handleClearAll}
              style={styles.iconBtn}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Effacer toutes les modifications"
            >
              <MaterialIcons name="delete-sweep" size={22} color={Colors.textSecondary} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={handleSave}
            style={[styles.saveBtn, saving && { opacity: 0.5 }]}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? '...' : 'Sauvegarder'}</Text>
          </Pressable>
        </View>
      </View>

      {/* ── Photo canvas ────────────────────────────────────────────────── */}
      <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.92 }} style={styles.canvas}>
        <Image source={{ uri: photoUri }} style={styles.photo} contentFit="cover" />
        {/* Filter overlay */}
        {activeFilter.id !== 'normal' ? (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: activeFilter.overlay as string, opacity: activeFilter.opacity },
            ]}
            pointerEvents="none"
          />
        ) : null}
        {/* SVG drawing layer */}
        <Svg
          style={StyleSheet.absoluteFill}
          width={SCREEN_W}
          height={EDITOR_H}
          {...(activeTool === 'draw' ? panResponder.panHandlers : {})}
        >
          {paths.map((p) => (
            <Path
              key={p.id}
              d={p.points}
              stroke={p.color}
              strokeWidth={p.width}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {/* Live path while drawing */}
          {currentSvgD ? (
            <Path
              d={currentSvgD}
              stroke={drawColor}
              strokeWidth={brushSize}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {/* Text overlays */}
          {textOverlays.map((t) => (
            <SvgText
              key={t.id}
              x={t.x}
              y={t.y}
              fill={t.color}
              fontSize={t.size}
              fontWeight="bold"
              textAnchor="middle"
              stroke="rgba(0,0,0,0.5)"
              strokeWidth={1}
            >
              {t.text}
            </SvgText>
          ))}
        </Svg>
        {/* Tap hint for text */}
        {activeTool === 'text' && textOverlays.length === 0 ? (
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTextModalVisible(true)}>
            <View style={styles.textHint}>
              <MaterialIcons name="text-fields" size={32} color="rgba(255,255,255,0.6)" />
              <Text style={styles.textHintLabel}>Appuyer pour ajouter du texte</Text>
            </View>
          </Pressable>
        ) : null}
        {activeTool === 'text' && textOverlays.length > 0 ? (
          <Pressable style={styles.addMoreTextBtn} onPress={() => setTextModalVisible(true)}>
            <MaterialIcons name="add" size={18} color={Colors.textPrimary} />
            <Text style={styles.addMoreTextLabel}>Ajouter du texte</Text>
          </Pressable>
        ) : null}
      </ViewShot>

      {/* ── Tool panel ──────────────────────────────────────────────────── */}
      <View style={styles.toolPanel}>
        {/* Tool selector */}
        <View style={styles.toolRow}>
          {[
            { id: 'none' as Tool, icon: 'touch-app', label: 'Filtres' },
            { id: 'draw' as Tool, icon: 'brush', label: 'Dessin' },
            { id: 'text' as Tool, icon: 'text-fields', label: 'Texte' },
          ].map((t) => (
            <Pressable
              key={t.id}
              style={[styles.toolBtn, activeTool === t.id && styles.toolBtnActive]}
              onPress={() => setActiveTool(t.id)}
            >
              <MaterialIcons
                name={t.icon as any}
                size={22}
                color={activeTool === t.id ? Colors.primary : Colors.textSecondary}
              />
              <Text style={[styles.toolLabel, activeTool === t.id && styles.toolLabelActive]}>{t.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Filter strip ────────────────────────────────────────────── */}
        {activeTool === 'none' ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterStrip}
          >
            {FILTERS.map((f) => (
              <Pressable
                key={f.id}
                style={[styles.filterItem, activeFilter.id === f.id && styles.filterItemActive]}
                onPress={() => setActiveFilter(f)}
              >
                <View style={[styles.filterSwatch, { backgroundColor: f.overlay as string }]}>
                  <Image source={{ uri: photoUri }} style={styles.filterThumb} contentFit="cover" />
                  {f.id !== 'normal' ? (
                    <View
                      style={[
                        StyleSheet.absoluteFill,
                        { backgroundColor: f.overlay as string, borderRadius: Radius.sm },
                      ]}
                    />
                  ) : null}
                </View>
                <Text style={[styles.filterLabel, activeFilter.id === f.id && styles.filterLabelActive]}>
                  {f.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        {/* ── Draw options ─────────────────────────────────────────────── */}
        {activeTool === 'draw' ? (
          <View style={styles.drawOptions}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.colorRow}
            >
              {DRAW_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setDrawColor(c)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c, borderColor: c === '#FFFFFF' ? Colors.border : c },
                    drawColor === c && styles.colorDotActive,
                  ]}
                />
              ))}
            </ScrollView>
            <View style={styles.brushRow}>
              <Text style={styles.optionLabel}>Épaisseur</Text>
              <View style={styles.brushSizes}>
                {[2, 4, 8, 14].map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setBrushSize(s)}
                    style={[styles.brushBtn, brushSize === s && styles.brushBtnActive]}
                  >
                    <View
                      style={[
                        styles.brushPreview,
                        { width: s * 2, height: s * 2, borderRadius: s, backgroundColor: drawColor },
                      ]}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        ) : null}

        {/* ── Text options ─────────────────────────────────────────────── */}
        {activeTool === 'text' ? (
          <View style={styles.drawOptions}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.colorRow}
            >
              {TEXT_COLORS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setTextColor(c)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c, borderColor: c === '#FFFFFF' ? Colors.border : c },
                    textColor === c && styles.colorDotActive,
                  ]}
                />
              ))}
            </ScrollView>
            <View style={styles.brushRow}>
              <Text style={styles.optionLabel}>Taille du texte</Text>
              <View style={styles.brushSizes}>
                {[16, 24, 36, 48].map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => setFontSize(s)}
                    style={[styles.brushBtn, fontSize === s && styles.brushBtnActive]}
                  >
                    <Text
                      style={{
                        color: Colors.textPrimary,
                        fontSize: Math.min(s * 0.6, 18),
                        fontWeight: '700',
                      }}
                    >
                      A
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
            <Pressable style={styles.addTextBtn} onPress={() => setTextModalVisible(true)}>
              <MaterialIcons name="add" size={18} color={Colors.textPrimary} />
              <Text style={styles.addTextLabel}>Ajouter du texte</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {/* ── Text input modal ─────────────────────────────────────────────────── */}
      <Modal
        visible={textModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTextModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.textModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setTextModalVisible(false)} />
          <View style={[styles.textCard, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <View style={styles.textCardHandle} />
            <Text style={styles.textCardTitle}>Ajouter du texte</Text>
            <TextInput
              style={[styles.textInput, { color: textColor }]}
              value={pendingText}
              onChangeText={setPendingText}
              placeholder="Votre texte ici..."
              placeholderTextColor={Colors.textMuted}
              autoFocus
              multiline
              maxLength={120}
              accessibilityLabel="Texte à ajouter"
            />
            <View style={styles.textModalActions}>
              <Pressable style={styles.textCancel} onPress={() => setTextModalVisible(false)}>
                <Text style={styles.textCancelText}>Annuler</Text>
              </Pressable>
              <Pressable style={styles.textConfirm} onPress={commitText}>
                <Text style={styles.textConfirmText}>Ajouter</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  topTitle: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    includeFontPadding: false,
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  saveBtnText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    includeFontPadding: false,
  },

  // Canvas
  canvas: { width: SCREEN_W, height: EDITOR_H, backgroundColor: '#000', overflow: 'hidden' },
  photo: { width: SCREEN_W, height: EDITOR_H },
  textHint: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
  textHintLabel: { color: 'rgba(255,255,255,0.6)', fontSize: Typography.sizes.sm, includeFontPadding: false },
  addMoreTextBtn: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
  },
  addMoreTextLabel: { color: Colors.textPrimary, fontSize: Typography.sizes.xs, includeFontPadding: false },

  // Tool panel
  toolPanel: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  toolRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  toolBtn: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  toolBtnActive: { backgroundColor: Colors.surfaceCard },
  toolLabel: { color: Colors.textMuted, fontSize: Typography.sizes.xs, includeFontPadding: false },
  toolLabelActive: { color: Colors.primary },

  // Filters
  filterStrip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    alignItems: 'center',
  },
  filterItem: { alignItems: 'center', gap: Spacing.xs, padding: Spacing.xs, borderRadius: Radius.md },
  filterItemActive: { backgroundColor: Colors.surfaceCard },
  filterSwatch: { width: 60, height: 60, borderRadius: Radius.sm, overflow: 'hidden', position: 'relative' },
  filterThumb: { width: 60, height: 60 },
  filterLabel: { color: Colors.textMuted, fontSize: 11, includeFontPadding: false },
  filterLabelActive: { color: Colors.primary, fontWeight: Typography.weights.semibold },

  // Draw options
  drawOptions: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, gap: Spacing.md },
  colorRow: { paddingRight: Spacing.md, gap: Spacing.sm, alignItems: 'center', minHeight: 40 },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: { borderColor: Colors.textPrimary, borderWidth: 3 },
  brushRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  optionLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    includeFontPadding: false,
    width: 90,
  },
  brushSizes: { flexDirection: 'row', gap: Spacing.sm },
  brushBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  brushBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.surfaceMid },
  brushPreview: {},
  addTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignSelf: 'flex-start',
  },
  addTextLabel: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    includeFontPadding: false,
  },

  // Text modal
  textModalOverlay: { flex: 1, justifyContent: 'flex-end' },
  textCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  textCardHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  textCardTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    includeFontPadding: false,
  },
  textInput: {
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: Typography.sizes.base,
    minHeight: 80,
  },
  textModalActions: { flexDirection: 'row', gap: Spacing.md },
  textCancel: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceCard,
    alignItems: 'center',
  },
  textCancelText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    includeFontPadding: false,
  },
  textConfirm: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  textConfirmText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    includeFontPadding: false,
  },
});
