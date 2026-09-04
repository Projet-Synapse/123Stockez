// Powered by OnSpace.AI — Photos Screen
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, Share, Dimensions, RefreshControl, ActivityIndicator } from 'react-native';
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
  const { albumId, albumName, color } = useLocalSearchParams<{ albumId: string; albumName: string; color: string }>();
  const { user } = useAuth();
  const { photos, loadPhotos, addPhoto, removePhoto } = useGallery();
  const { showAlert } = useAlert();
  const accentColor = color || Colors.primary;

  const screenWidth = Dimensions.get('window').width;
  const photoSize = Math.floor((screenWidth - Spacing.lg * 2 - GAP * (NUM_COLS - 1)) / NUM_COLS);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

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
        const groupId = (photos[0]?.groupId) ?? '';
        await addPhoto(user!.id, albumId, groupId, asset.uri, asset.fileName || `photo_${Date.now()}`);
      }
    }
  }, [user, albumId]);

  const handleShareAlbum = useCallback(async () => {
    const count = photos.length;
    try {
      await Share.share({
        subject: `Album PhotoVault : ${albumName}`,
        message: `Découvre mon album "${albumName}" sur PhotoVault ! Il contient ${count} photo${count > 1 ? 's' : ''}.`,
      });
    } catch (e) {
      showAlert('Erreur', 'Impossible de partager cet album.');
    }
  }, [photos, albumName]);

  const handleLongPress = useCallback((photo: Photo) => {
    showAlert('Supprimer cette photo ?', 'Cette action est irréversible.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => removePhoto(photo.id, albumId, photo.groupId) },
    ]);
  }, [albumId]);

  const renderPhoto = useCallback(({ item }: { item: Photo }) => (
    <PhotoThumbnail
      photo={item}
      size={photoSize}
      onPress={() => router.push({ pathname: '/viewer', params: { photoUri: item.uri, photoName: item.name, photoId: item.id, albumName } })}
      onLongPress={() => handleLongPress(item)}
    />
  ), [photoSize, albumName, handleLongPress]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Retour">
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>{albumName}</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={handleShareAlbum} style={styles.iconBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Partager l'album">
            <MaterialIcons name="share" size={22} color={Colors.textSecondary} />
          </Pressable>
          <Pressable onPress={handleAddPhoto} style={styles.iconBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Ajouter des photos">
            <MaterialIcons name="add-photo-alternate" size={24} color={Colors.textPrimary} />
          </Pressable>
        </View>
      </View>

      {loading && photos.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={accentColor} size="large" />
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          renderItem={renderPhoto}
          numColumns={NUM_COLS}
          contentContainerStyle={[styles.grid, photos.length === 0 && { flex: 1 }]}
          columnWrapperStyle={{ gap: GAP }}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={accentColor} colors={[accentColor]} />}
          ListHeaderComponent={photos.length > 0 ? <Text style={styles.meta}>{photos.length} photo{photos.length > 1 ? 's' : ''}</Text> : null}
          ListEmptyComponent={<EmptyState title="Aucune photo" subtitle="Appuyez sur + pour ajouter des photos depuis votre téléphone." />}
        />
      )}

      {/* FAB add photo */}
      <Pressable style={[styles.fab, { bottom: insets.bottom + Spacing.lg, backgroundColor: accentColor }]} onPress={handleAddPhoto} accessibilityRole="button" accessibilityLabel="Ajouter des photos">
        <MaterialIcons name="add-photo-alternate" size={28} color={Colors.textPrimary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.sm },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { color: Colors.textPrimary, fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, flex: 1, includeFontPadding: false },
  headerActions: { flexDirection: 'row', gap: Spacing.xs },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  meta: { color: Colors.textMuted, fontSize: Typography.sizes.sm, marginBottom: Spacing.sm, paddingHorizontal: Spacing.lg },
  grid: { paddingHorizontal: Spacing.lg, paddingBottom: 100 },
  fab: { position: 'absolute', right: Spacing.lg, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
});
