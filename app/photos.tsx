// Powered by OnSpace.AI — Photos Screen
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  TextInput,
  Share,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '@/hooks/useAuth';
import { useGallery } from '@/hooks/useGallery';
import { useAlert } from '@/template';
import { PhotoThumbnail, EmptyState } from '@/components';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { Photo } from '@/types';

const NUM_COLS = 3;
const GAP = 2;

export default function PhotosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { albumId, albumName, groupId, color } = useLocalSearchParams<{
    albumId: string;
    albumName: string;
    groupId: string;
    color: string;
  }>();
  const { user } = useAuth();
  const { photos, loadPhotos, addPhoto, removePhoto } = useGallery();
  const { showAlert } = useAlert();
  const accentColor = color || Colors.primary;

  const screenWidth = Dimensions.get('window').width;
  const photoSize = Math.floor((screenWidth - Spacing.lg * 2 - GAP * (NUM_COLS - 1)) / NUM_COLS);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!albumId) return;
    setLoading(true);
    loadPhotos(albumId).finally(() => setLoading(false));
  }, [albumId]);

  const handleRefresh = useCallback(async () => {
    if (!albumId) return;
    setRefreshing(true);
    try {
      await loadPhotos(albumId);
    } finally {
      setRefreshing(false);
    }
  }, [albumId, loadPhotos]);

  const handleAddPhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showAlert('Permission refusée', "Autorisez l'accès à la galerie dans les paramètres.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (!result.canceled) {
      for (const asset of result.assets) {
        await addPhoto(user!.id, albumId, groupId, asset.uri, asset.fileName || `photo_${Date.now()}`);
      }
    }
  }, [user, albumId, groupId]);

  const handleShareAlbum = useCallback(async () => {
    const count = photos.length;
    try {
      await Share.share(
        {
          message: `Découvre mon album "${albumName}" sur PhotoVault ! Il contient ${count} photo${count > 1 ? 's' : ''}.`,
        },
        { subject: `Album PhotoVault : ${albumName}`, dialogTitle: `Partager « ${albumName} »` },
      );
    } catch {
      showAlert('Erreur', 'Impossible de partager cet album.');
    }
  }, [photos, albumName]);

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
        params: { photoUri: photo.uri, photoName: photo.name, photoId: photo.id, albumName },
      });
    },
    [selectionMode, toggleSelected, albumName],
  );

  const handleSelectAll = useCallback(() => {
    setSelectedIds((prev) => (prev.size === photos.length ? new Set() : new Set(photos.map((p) => p.id))));
  }, [photos]);

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
          try {
            for (const id of selectedIds) {
              const photo = photos.find((p) => p.id === id);
              if (photo) {
                await removePhoto(photo.id, albumId, photo.groupId);
              }
            }
          } finally {
            setDeleting(false);
            exitSelectionMode();
          }
        },
      },
    ]);
  }, [selectedIds, photos, albumId, removePhoto, exitSelectionMode, showAlert]);

  const filteredPhotos = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return photos;
    return photos.filter((p) => p.name.toLowerCase().includes(q));
  }, [photos, search]);

  const renderPhoto = useCallback(
    ({ item }: { item: Photo }) => (
      <PhotoThumbnail
        photo={item}
        size={photoSize}
        selectionMode={selectionMode}
        selected={selectedIds.has(item.id)}
        onPress={() => handlePhotoPress(item)}
        onLongPress={() => handleLongPress(item)}
      />
    ),
    [photoSize, selectionMode, selectedIds, handlePhotoPress, handleLongPress],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Header */}
      {selectionMode ? (
        <View style={styles.header}>
          <Pressable
            onPress={exitSelectionMode}
            style={styles.backBtn}
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
              style={styles.iconBtn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Tout sélectionner"
            >
              <MaterialIcons
                name={selectedIds.size === photos.length ? 'deselect' : 'select-all'}
                size={22}
                color={Colors.textSecondary}
              />
            </Pressable>
            <Pressable
              onPress={handleDeleteSelected}
              style={styles.iconBtn}
              hitSlop={8}
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
          <Pressable
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
          </Pressable>
          <Text style={styles.title} numberOfLines={1}>
            {albumName}
          </Text>
          <View style={styles.headerActions}>
            {photos.length > 0 ? (
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
            <Pressable
              onPress={handleShareAlbum}
              style={styles.iconBtn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Partager l'album"
            >
              <MaterialIcons name="share" size={22} color={Colors.textSecondary} />
            </Pressable>
            <Pressable
              onPress={handleAddPhoto}
              style={styles.iconBtn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Ajouter des photos"
            >
              <MaterialIcons name="add-photo-alternate" size={24} color={Colors.textPrimary} />
            </Pressable>
          </View>
        </View>
      )}

      {loading && photos.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={accentColor} size="large" />
        </View>
      ) : (
        <>
          {!selectionMode && photos.length > 6 ? (
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
            data={filteredPhotos}
            keyExtractor={(item) => item.id}
            renderItem={renderPhoto}
            numColumns={NUM_COLS}
            contentContainerStyle={[styles.grid, filteredPhotos.length === 0 && { flex: 1 }]}
            columnWrapperStyle={{ gap: GAP }}
            ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={accentColor}
                colors={[accentColor]}
              />
            }
            ListHeaderComponent={
              filteredPhotos.length > 0 ? (
                <Text style={styles.meta}>
                  {filteredPhotos.length} photo{filteredPhotos.length > 1 ? 's' : ''}
                </Text>
              ) : null
            }
            ListEmptyComponent={
              photos.length > 0 ? (
                <EmptyState title="Aucun résultat" subtitle={`Aucune photo ne correspond à "${search}".`} />
              ) : (
                <EmptyState
                  title="Aucune photo"
                  subtitle="Appuyez sur + pour ajouter des photos depuis votre téléphone."
                />
              )
            }
          />
        </>
      )}

      {/* FAB add photo */}
      {!selectionMode ? (
        <Pressable
          style={[styles.fab, { bottom: insets.bottom + Spacing.lg, backgroundColor: accentColor }]}
          onPress={handleAddPhoto}
          accessibilityRole="button"
          accessibilityLabel="Ajouter des photos"
        >
          <MaterialIcons name="add-photo-alternate" size={28} color={Colors.textPrimary} />
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
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    flex: 1,
    includeFontPadding: false,
  },
  headerActions: { flexDirection: 'row', gap: Spacing.xs },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  meta: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  grid: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
});
