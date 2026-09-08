// Powered by OnSpace.AI — Carnets Tab (list of all carnets)
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useCarnet } from '@/hooks/useCarnet';
import { useAlert } from '@/template';
import { EmptyState } from '@/components';
import { CarnetCard } from '@/components/feature/CarnetCard';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { Carnet, CarnetField } from '@/types';

const EMOJIS = [
  '📔',
  '🌿',
  '🌸',
  '🍃',
  '🦋',
  '🐾',
  '🍳',
  '✈️',
  '🏋️',
  '🎨',
  '🎵',
  '📚',
  '🌍',
  '💡',
  '🔬',
  '🌺',
];

export default function CarnetsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { carnets, loadCarnets, addCarnet, removeCarnet } = useCarnet();
  const { showAlert } = useAlert();

  const [modalVisible, setModalVisible] = useState(false);
  const [carnetName, setCarnetName] = useState('');
  const [carnetDesc, setCarnetDesc] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState(EMOJIS[0]);
  const [fields, setFields] = useState<{ label: string; type: 'text' | 'number' }[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number'>('text');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    loadCarnets(user.id)
      .catch(() =>
        showAlert(
          'Erreur de chargement',
          'Impossible de récupérer vos carnets. Vérifiez votre connexion et réessayez.',
        ),
      )
      .finally(() => setLoading(false));
  }, [user]);

  const handleRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      await loadCarnets(user.id);
    } catch {
      showAlert('Erreur', 'Impossible de rafraîchir vos carnets.');
    } finally {
      setRefreshing(false);
    }
  }, [user, loadCarnets]);

  const filteredCarnets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return carnets;
    return carnets.filter((c) => c.name.toLowerCase().includes(q));
  }, [carnets, search]);

  const addField = useCallback(() => {
    const label = newFieldLabel.trim();
    if (!label) return;
    if (fields.length >= 8) {
      showAlert('Limite atteinte', 'Vous pouvez ajouter au maximum 8 champs par carnet.');
      return;
    }
    setFields((prev) => [...prev, { label, type: newFieldType }]);
    setNewFieldLabel('');
  }, [newFieldLabel, newFieldType, fields]);

  const removeField = useCallback((idx: number) => {
    setFields((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const resetForm = () => {
    setCarnetName('');
    setCarnetDesc('');
    setSelectedEmoji(EMOJIS[0]);
    setFields([]);
    setNewFieldLabel('');
    setNewFieldType('text');
  };

  const handleCreate = useCallback(async () => {
    if (!carnetName.trim()) {
      showAlert('Nom requis', 'Veuillez saisir un nom pour le carnet.');
      return;
    }
    setSaving(true);
    try {
      const carnetFields: CarnetField[] = fields.map((f, i) => ({
        id: `field_${Date.now()}_${i}`,
        label: f.label,
        type: f.type,
      }));
      await addCarnet(user!.id, carnetName.trim(), selectedEmoji, carnetDesc.trim(), carnetFields);
      resetForm();
      setModalVisible(false);
    } catch {
      showAlert('Erreur', 'Impossible de créer ce carnet. Réessayez.');
    } finally {
      setSaving(false);
    }
  }, [carnetName, carnetDesc, selectedEmoji, fields, user]);

  const handleLongPress = useCallback(
    (carnet: Carnet) => {
      showAlert(`Supprimer "${carnet.name}" ?`, 'Toutes les entrées de ce carnet seront supprimées.', [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () =>
            removeCarnet(carnet.id, user!.id).catch(() =>
              showAlert('Erreur', 'Impossible de supprimer ce carnet.'),
            ),
        },
      ]);
    },
    [user],
  );

  const renderCarnet = useCallback(
    ({ item, index }: { item: Carnet; index: number }) => (
      <View
        style={[
          styles.cardWrapper,
          index % 2 === 0 ? { marginRight: Spacing.sm / 2 } : { marginLeft: Spacing.sm / 2 },
        ]}
      >
        <CarnetCard
          carnet={item}
          onPress={() =>
            router.push({
              pathname: '/carnet-detail',
              params: { carnetId: item.id, carnetName: item.name, emoji: item.emoji },
            })
          }
          onLongPress={() => handleLongPress(item)}
        />
      </View>
    ),
    [handleLongPress],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.subtitle}>Mes collections</Text>
          <Text style={styles.title}>Carnets</Text>
        </View>
        <Pressable
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Créer un carnet"
        >
          <MaterialIcons name="add" size={24} color={Colors.textPrimary} />
        </Pressable>
      </View>

      {loading && carnets.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <>
          {carnets.length > 0 ? (
            <View style={styles.statsBar}>
              <Text style={styles.statsText}>
                {carnets.length} carnet{carnets.length > 1 ? 's' : ''}
              </Text>
              <Text style={styles.statsText}>·</Text>
              <Text style={styles.statsText}>
                {carnets.reduce((acc, c) => acc + c.entryCount, 0)} entrées
              </Text>
            </View>
          ) : null}

          {/* Search */}
          {carnets.length > 3 ? (
            <View style={styles.searchBar}>
              <MaterialIcons name="search" size={20} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Rechercher un carnet..."
                placeholderTextColor={Colors.textMuted}
                accessibilityLabel="Rechercher un carnet"
                returnKeyType="search"
              />
              {search.length > 0 ? (
                <Pressable
                  onPress={() => setSearch('')}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Effacer la recherche"
                >
                  <MaterialIcons name="close" size={18} color={Colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <FlatList
            data={filteredCarnets}
            keyExtractor={(item) => item.id}
            renderItem={renderCarnet}
            numColumns={2}
            contentContainerStyle={[styles.list, filteredCarnets.length === 0 && { flex: 1 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.primary}
                colors={[Colors.primary]}
              />
            }
            ListEmptyComponent={
              carnets.length > 0 ? (
                <EmptyState title="Aucun résultat" subtitle={`Aucun carnet ne correspond à "${search}".`} />
              ) : (
                <EmptyState
                  title="Aucun carnet"
                  subtitle={
                    'Créez un carnet pour organiser vos photos avec des informations personnalisées (plantes, recettes, animaux...)'
                  }
                />
              )
            }
          />

          {carnets.length > 0 ? (
            <Pressable
              style={[styles.fab, { bottom: insets.bottom + 80 }]}
              onPress={() => setModalVisible(true)}
              accessibilityRole="button"
              accessibilityLabel="Créer un carnet"
            >
              <MaterialIcons name="add" size={28} color={Colors.textPrimary} />
            </Pressable>
          ) : null}
        </>
      )}

      {/* Create carnet modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalBg} onPress={() => setModalVisible(false)} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kavContainer}
        >
          <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Nouveau carnet</Text>
              <Pressable
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Fermer"
              >
                <MaterialIcons name="close" size={22} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.formContent}>
                {/* Emoji picker */}
                <Text style={styles.label}>Icône</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.emojiRow}
                >
                  {EMOJIS.map((e) => (
                    <Pressable
                      key={e}
                      style={[styles.emojiBtn, selectedEmoji === e && styles.emojiBtnActive]}
                      onPress={() => setSelectedEmoji(e)}
                    >
                      <Text style={styles.emojiText}>{e}</Text>
                    </Pressable>
                  ))}
                </ScrollView>

                {/* Name */}
                <Text style={styles.label}>Nom du carnet *</Text>
                <TextInput
                  style={styles.input}
                  value={carnetName}
                  onChangeText={setCarnetName}
                  placeholder="Ex: Plantes, Recettes, Animaux..."
                  placeholderTextColor={Colors.textMuted}
                  accessibilityLabel="Nom du carnet"
                />

                {/* Description */}
                <Text style={styles.label}>Description (optionnel)</Text>
                <TextInput
                  style={[styles.input, styles.inputMulti]}
                  value={carnetDesc}
                  onChangeText={setCarnetDesc}
                  placeholder="Décrivez ce carnet..."
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  numberOfLines={2}
                  accessibilityLabel="Description du carnet"
                />

                {/* Custom fields */}
                <View style={styles.fieldsHeader}>
                  <Text style={styles.label}>Champs personnalisés</Text>
                  <Text style={styles.fieldsHint}>Données à renseigner pour chaque photo</Text>
                </View>

                {fields.map((f, i) => (
                  <View key={i} style={styles.fieldRow}>
                    <View style={[styles.fieldTypeBadge, f.type === 'number' && styles.fieldTypeBadgeNum]}>
                      <Text style={styles.fieldTypeText}>{f.type === 'number' ? '123' : 'Abc'}</Text>
                    </View>
                    <Text style={styles.fieldRowLabel} numberOfLines={1}>
                      {f.label}
                    </Text>
                    <Pressable onPress={() => removeField(i)} hitSlop={8}>
                      <MaterialIcons name="close" size={18} color={Colors.error} />
                    </Pressable>
                  </View>
                ))}

                {/* Add new field */}
                <View style={styles.addFieldRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={newFieldLabel}
                    onChangeText={setNewFieldLabel}
                    placeholder="Ex: Climat, Prix, Espèce..."
                    placeholderTextColor={Colors.textMuted}
                    accessibilityLabel="Nom du champ"
                    returnKeyType="done"
                    onSubmitEditing={addField}
                  />
                  <Pressable
                    style={[styles.typeToggle, newFieldType === 'number' && styles.typeToggleActive]}
                    onPress={() => setNewFieldType((t) => (t === 'text' ? 'number' : 'text'))}
                  >
                    <Text style={styles.typeToggleText}>{newFieldType === 'number' ? '123' : 'Abc'}</Text>
                  </Pressable>
                  <Pressable style={styles.addFieldBtn} onPress={addField}>
                    <MaterialIcons name="add" size={20} color={Colors.textPrimary} />
                  </Pressable>
                </View>

                <Pressable
                  style={[styles.createBtn, saving && { opacity: 0.6 }]}
                  onPress={handleCreate}
                  disabled={saving}
                >
                  <Text style={styles.createBtnText}>{saving ? 'Création...' : 'Créer le carnet'}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  subtitle: { color: Colors.textMuted, fontSize: Typography.sizes.sm, includeFontPadding: false },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    includeFontPadding: false,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  statsText: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.sizes.base,
    includeFontPadding: false,
  },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  cardWrapper: { flex: 1, marginBottom: Spacing.md },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  kavContainer: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  sheetTitle: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    includeFontPadding: false,
  },
  formContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg, gap: Spacing.sm },
  label: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    marginTop: Spacing.sm,
  },
  emojiRow: { gap: Spacing.sm, paddingVertical: Spacing.sm },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: Colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.surfaceMid },
  emojiText: { fontSize: 22 },
  input: {
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: Typography.sizes.base,
  },
  inputMulti: { minHeight: 64, textAlignVertical: 'top' },
  fieldsHeader: { gap: 2 },
  fieldsHint: { color: Colors.textMuted, fontSize: Typography.sizes.xs },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fieldTypeBadge: {
    backgroundColor: Colors.primary + '33',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  fieldTypeBadgeNum: { backgroundColor: Colors.teal + '33' },
  fieldTypeText: { color: Colors.primary, fontSize: 11, fontWeight: '700', includeFontPadding: false },
  fieldRowLabel: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: Typography.sizes.base,
    includeFontPadding: false,
  },
  addFieldRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  typeToggle: {
    width: 44,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeToggleActive: { borderColor: Colors.teal },
  typeToggleText: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: '700',
    includeFontPadding: false,
  },
  addFieldBtn: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  createBtnText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    includeFontPadding: false,
  },
});
