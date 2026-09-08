// Powered by OnSpace.AI — Carnet Detail (entries list)
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/hooks/useAuth';
import { useCarnet } from '@/hooks/useCarnet';
import { useAlert } from '@/template';
import { EmptyState } from '@/components';
import { CarnetEntryCard } from '@/components/feature/CarnetEntryCard';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { Carnet, CarnetEntry } from '@/types';
import { getCarnets } from '@/services/storage';

export default function CarnetDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { carnetId, carnetName, emoji } = useLocalSearchParams<{
    carnetId: string;
    carnetName: string;
    emoji: string;
  }>();
  const { user } = useAuth();
  const { entries, loadEntries, removeEntry } = useCarnet();
  const { showAlert } = useAlert();

  const [carnet, setCarnet] = useState<Carnet | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!carnetId) return;
    setLoading(true);
    Promise.all([loadEntries(carnetId), loadCarnetMeta()])
      .catch(() =>
        showAlert(
          'Erreur de chargement',
          'Impossible de récupérer ce carnet. Vérifiez votre connexion et réessayez.',
        ),
      )
      .finally(() => setLoading(false));
  }, [carnetId]);

  const loadCarnetMeta = async () => {
    if (!user) return;
    const all = await getCarnets(user.id);
    const found = all.find((c) => c.id === carnetId);
    if (found) setCarnet(found);
  };

  const handleRefresh = useCallback(async () => {
    if (!carnetId) return;
    setRefreshing(true);
    try {
      await Promise.all([loadEntries(carnetId), loadCarnetMeta()]);
    } catch {
      showAlert('Erreur', 'Impossible de rafraîchir ce carnet.');
    } finally {
      setRefreshing(false);
    }
  }, [carnetId, loadEntries]);

  const handleAddEntry = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission refusée', "L'accès à la galerie est nécessaire pour ajouter des photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 0.85,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const name = asset.fileName ?? `Photo ${entries.length + 1}`;
    // Navigate to new entry editor
    router.push({
      pathname: '/carnet-entry',
      params: {
        carnetId,
        carnetName,
        photoUri: asset.uri,
        photoName: name,
        mode: 'create',
      },
    });
  }, [entries, carnetId, carnetName]);

  const handleLongPress = useCallback(
    (entry: CarnetEntry) => {
      showAlert(`Supprimer "${entry.name}" ?`, 'Cette entrée sera supprimée définitivement.', [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () =>
            removeEntry(entry.id, carnetId).catch(() =>
              showAlert('Erreur', 'Impossible de supprimer cette entrée.'),
            ),
        },
      ]);
    },
    [carnetId],
  );

  const renderEntry = useCallback(
    ({ item }: { item: CarnetEntry }) => (
      <CarnetEntryCard
        entry={item}
        fields={carnet?.fields ?? []}
        onPress={() =>
          router.push({
            pathname: '/carnet-entry',
            params: {
              carnetId,
              carnetName,
              entryId: item.id,
              photoUri: item.uri,
              photoName: item.name,
              mode: 'view',
            },
          })
        }
        onLongPress={() => handleLongPress(item)}
      />
    ),
    [carnet, handleLongPress],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Retour"
        >
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.emoji}>{emoji}</Text>
        <View style={styles.headerCenter}>
          <Text style={styles.title} numberOfLines={1}>
            {carnetName}
          </Text>
          <Text style={styles.meta}>
            {entries.length} entrée{entries.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <Pressable
          style={styles.addBtn}
          onPress={handleAddEntry}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Ajouter une entrée"
        >
          <MaterialIcons name="add" size={24} color={Colors.textPrimary} />
        </Pressable>
      </View>

      {/* Fields preview bar */}
      {carnet && carnet.fields.length > 0 ? (
        <View style={styles.fieldsBar}>
          <MaterialIcons name="label" size={13} color={Colors.textMuted} />
          <Text style={styles.fieldsBarText} numberOfLines={1}>
            {carnet.fields.map((f) => f.label).join('  ·  ')}
          </Text>
        </View>
      ) : null}

      {loading && entries.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderEntry}
          contentContainerStyle={[styles.list, entries.length === 0 && { flex: 1 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          ListEmptyComponent={
            <EmptyState
              title="Aucune entrée"
              subtitle={'Ajoutez votre première photo avec ses informations personnalisées.'}
            />
          }
        />
      )}

      {entries.length > 0 ? (
        <Pressable
          style={[styles.fab, { bottom: insets.bottom + Spacing.lg }]}
          onPress={handleAddEntry}
          accessibilityRole="button"
          accessibilityLabel="Ajouter une entrée"
        >
          <MaterialIcons name="add" size={28} color={Colors.textPrimary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 24 },
  headerCenter: { flex: 1 },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    includeFontPadding: false,
  },
  meta: { color: Colors.textMuted, fontSize: Typography.sizes.xs, includeFontPadding: false },
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
  fieldsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  fieldsBarText: { color: Colors.textMuted, fontSize: Typography.sizes.xs },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
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
});
