// Powered by OnSpace.AI — All Photos Screen
import React, { useEffect, useCallback, useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  TextInput,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useGallery } from '@/hooks/useGallery';
import { useAlert } from '@/template';
import { PhotoThumbnail, EmptyState } from '@/components';
import { MovePhotoSheet } from '@/components/feature/MovePhotoSheet';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { Photo, Album } from '@/types';

const NUM_COLS = 3;
const GAP = 2;

export default function AllPhotosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { allPhotos, loadAllPhotos, removePhoto, movePhoto } = useGallery();
  const { showAlert } = useAlert();

  const screenWidth = Dimensions.get('window').width;
  const photoSize = Math.floor((screenWidth - GAP * (NUM_COLS - 1)) / NUM_COLS);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [moveVisible, setMoveVisible] = useState(false);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    loadAllPhotos(user.id)
      .catch(() =>
        showAlert(
          'Erreur de chargement',
          'Impossible de récupérer vos photos. Vérifiez votre connexion et réessayez.',
        ),
      )
      .finally(() => setLoading(false));
  }, [user]);

  const handleRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      await loadAllPhotos(user.id);
    } catch {
      showAlert('Erreur', 'Impossible de rafraîchir vos photos.');
    } finally {
      setRefreshing(false);
    }
  }, [user, loadAllPhotos]);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const toggleSelected = useCallback((photoId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  }, []);

  const handleLongPress = useCallback(
    (photo: Photo) => {
      if (selectionMode) return;
      setSelectionMode(true);
      setSelectedIds(new Set([photo.id]));
    },
    [selectionMode],
  );

  const handlePhotoPress = useCallback(
    (photo: Photo) => {
      if (selectionMode) {
        toggleSelected(photo.id);
        return;
      }
      router.push({
        pathname: '/viewer',
        params: {
          photoUri: photo.uri,
          photoName: photo.name,
          photoId: photo.id,
          albumName: '',
        },
      });
    },
    [selectionMode, toggleSelected],
  );

  const handleSelectAll = useCallback(() => {
    setSelectedIds((prev) =>
      prev.size === allPhotos.length ? new Set() : new Set(allPhotos.map((p) => p.id)),
    );
  }, [allPhotos]);

  const handleDeleteSelected = useCallback(() => {
    const count = selectedIds.size;
    if (count === 0) return;
    showAlert(`Supprimer ${count} photo${count > 1 ? 's' : ''} ?`, 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          let failed = 0;
          try {
            for (const id of selectedIds) {
              const photo = allPhotos.find((p) => p.id === id);
              if (photo) {
                try {
                  await removePhoto(photo.id, photo.albumId, photo.groupId);
                } catch {
                  failed += 1;
                }
              }
            }
            if (failed > 0) {
              showAlert(
                'Suppression partielle',
                `${failed} photo${failed > 1 ? 's' : ''} n'${failed > 1 ? 'ont' : 'a'} pas pu être supprimée${failed > 1 ? 's' : ''}.`,
              );
            }
          } finally {
            setDeleting(false);
            exitSelectionMode();
          }
        },
      },
    ]);
  }, [selectedIds, allPhotos, removePhoto, exitSelectionMode, showAlert]);

  const handleMoveSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    setMoveVisible(true);
  }, [selectedIds]);

  const handleBulkMove = useCallback(
    async (targetAlbum: Album) => {
      setMoveVisible(false);
      setMoving(true);
      let failed = 0;
      try {
        for (const id of selectedIds) {
          const photo = allPhotos.find((p) => p.id === id);
          if (!photo) continue;
          try {
            await movePhoto(photo, targetAlbum);
          } catch {
            failed += 1;
          }
        }
        if (failed > 0) {
          showAlert(
            'Déplacement partiel',
            `${failed} photo${failed > 1 ? 's' : ''} n'${failed > 1 ? 'ont' : 'a'} pas pu être déplacée${failed > 1 ? 's' : ''}.`,
          );
        } else {
          showAlert('Photos déplacées', `Déplacées vers « ${targetAlbum.name} ».`);
        }
      } finally {
        setMoving(false);
        exitSelectionMode();
      }
    },
    [selectedIds, allPhotos, movePhoto],
  );

  const filteredPhotos = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allPhotos;
    return allPhotos.filter((p) => p.name.toLowerCase().includes(q));
  }, [allPhotos, search]);

  // Group photos by month
  const grouped = React.useMemo(() => {
    const sections: { title: string; data: Photo[] }[] = [];
    const map = new Map<string, Photo[]>();
    for (const p of filteredPhotos) {
      const d = new Date(p.createdAt);
      const key = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    map.forEach((data, title) => sections.push({ title, data }));
    return sections;
  }, [filteredPhotos]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Header */}
      {selectionMode ? (
        <View style={styles.header}>
          <Pressable
            onPress={exitSelectionMode}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Annuler la sélection"
          >
            <MaterialIcons name="close" size={24} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {selectedIds.size} sélectionnée{selectedIds.size > 1 ? 's' : ''}
          </Text>
          <View style={styles.headerActions}>
            <Pressable
              onPress={handleSelectAll}
              hitSlop={8}
              style={styles.iconBtn}
              accessibilityRole="button"
              accessibilityLabel="Tout sélectionner"
            >
              <MaterialIcons
                name={selectedIds.size === allPhotos.length ? 'deselect' : 'select-all'}
                size={22}
                color={Colors.textSecondary}
              />
            </Pressable>
            <Pressable
              onPress={handleMoveSelected}
              hitSlop={8}
              style={styles.iconBtn}
              disabled={selectedIds.size === 0 || moving}
              accessibilityRole="button"
              accessibilityLabel="Déplacer la sélection"
            >
              {moving ? (
                <ActivityIndicator color={Colors.textSecondary} size="small" />
              ) : (
                <MaterialIcons
                  name="drive-file-move"
                  size={22}
                  color={selectedIds.size === 0 ? Colors.textMuted : Colors.textSecondary}
                />
              )}
            </Pressable>
            <Pressable
              onPress={handleDeleteSelected}
              hitSlop={8}
              style={styles.iconBtn}
              disabled={selectedIds.size === 0 || deleting}
              accessibilityRole="button"
              accessibilityLabel="Supprimer la sélection"
            >
              {deleting ? (
                <ActivityIndicator color={Colors.error} size="small" />
              ) : (
                <MaterialIcons
                  name="delete"
                  size={24}
                  color={selectedIds.size === 0 ? Colors.textMuted : Colors.error}
                />
              )}
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.header}>
          <Text style={styles.title}>Toutes les photos</Text>
          <View style={styles.headerActions}>
            {allPhotos.length > 0 ? (
              <Text style={styles.count}>
                {allPhotos.length} photo{allPhotos.length > 1 ? 's' : ''}
              </Text>
            ) : null}
            {allPhotos.length > 0 ? (
              <Pressable
                onPress={() => setSelectionMode(true)}
                style={styles.iconBtn}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Sélectionner des photos"
              >
                <MaterialIcons name="checklist" size={22} color={Colors.textSecondary} />
              </Pressable>
            ) : null}
          </View>
        </View>
      )}

      {loading && allPhotos.length === 0 ? (
        <View style={styles.emptyWrapper}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : allPhotos.length === 0 ? (
        <View style={styles.emptyWrapper}>
          <EmptyState
            title="Aucune photo"
            subtitle="Ajoutez des photos dans vos albums pour les retrouver ici."
          />
        </View>
      ) : (
        <>
          {!selectionMode && allPhotos.length > 6 ? (
            <View style={styles.searchBar}>
              <MaterialIcons name="search" size={20} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Rechercher une photo..."
                placeholderTextColor={Colors.textMuted}
                accessibilityLabel="Rechercher une photo"
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
            data={grouped}
            keyExtractor={(item) => item.title}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={Colors.primary}
                colors={[Colors.primary]}
              />
            }
            ListEmptyComponent={
              <EmptyState title="Aucun résultat" subtitle={`Aucune photo ne correspond à "${search}".`} />
            }
            renderItem={({ item: section }) => (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons name="calendar-today" size={14} color={Colors.textMuted} />
                  <Text style={styles.sectionTitle}>{section.title}</Text>
                  <Text style={styles.sectionCount}>{section.data.length}</Text>
                </View>
                <View style={styles.grid}>
                  {section.data.map((photo, idx) => (
                    <View
                      key={photo.id}
                      style={[styles.photoCell, idx % NUM_COLS !== NUM_COLS - 1 && { marginRight: GAP }]}
                    >
                      <PhotoThumbnail
                        photo={photo}
                        size={photoSize}
                        selectionMode={selectionMode}
                        selected={selectedIds.has(photo.id)}
                        onPress={() => handlePhotoPress(photo)}
                        onLongPress={() => handleLongPress(photo)}
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}
          />
        </>
      )}

      {/* Bulk move sheet — no album is excluded since selection can span several albums */}
      <MovePhotoSheet
        visible={moveVisible}
        onClose={() => setMoveVisible(false)}
        currentAlbumId=""
        userId={user?.id ?? ''}
        onMove={handleBulkMove}
      />
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
    gap: Spacing.sm,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    flex: 1,
    includeFontPadding: false,
  },
  count: { color: Colors.textMuted, fontSize: Typography.sizes.sm, includeFontPadding: false },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  iconBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  emptyWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  section: { marginBottom: Spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    flex: 1,
    includeFontPadding: false,
    textTransform: 'capitalize',
  },
  sectionCount: { color: Colors.textMuted, fontSize: Typography.sizes.xs, includeFontPadding: false },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  photoCell: { marginBottom: GAP },
});
