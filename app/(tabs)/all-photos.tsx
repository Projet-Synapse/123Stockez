// Powered by OnSpace.AI — All Photos Screen
import React, { useEffect, useCallback, useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, TextInput, Dimensions, RefreshControl, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useGallery } from '@/hooks/useGallery';
import { useAlert } from '@/template';
import { PhotoThumbnail, EmptyState } from '@/components';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { Photo } from '@/types';

const NUM_COLS = 3;
const GAP = 2;

export default function AllPhotosScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { allPhotos, loadAllPhotos, removePhoto, renamePhoto } = useGallery();
  const { showAlert } = useAlert();

  const screenWidth = Dimensions.get('window').width;
  const photoSize = Math.floor((screenWidth - GAP * (NUM_COLS - 1)) / NUM_COLS);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    loadAllPhotos(user.id).finally(() => setLoading(false));
  }, [user]);

  const handleRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      await loadAllPhotos(user.id);
    } finally {
      setRefreshing(false);
    }
  }, [user, loadAllPhotos]);

  const handleLongPress = useCallback((photo: Photo) => {
    showAlert('Que souhaitez-vous faire ?', photo.name, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Renommer',
        onPress: () => {
          router.push({
            pathname: '/viewer',
            params: { photoUri: photo.uri, photoName: photo.name, photoId: photo.id, albumName: '' },
          });
        },
      },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () =>
          showAlert('Supprimer cette photo ?', 'Cette action est irréversible.', [
            { text: 'Annuler', style: 'cancel' },
            { text: 'Supprimer', style: 'destructive', onPress: () => removePhoto(photo.id, photo.albumId, photo.groupId) },
          ]),
      },
    ]);
  }, []);

  const renderPhoto = useCallback(({ item }: { item: Photo }) => (
    <PhotoThumbnail
      photo={item}
      size={photoSize}
      onPress={() =>
        router.push({
          pathname: '/viewer',
          params: { photoUri: item.uri, photoName: item.name, photoId: item.id, albumName: '' },
        })
      }
      onLongPress={() => handleLongPress(item)}
    />
  ), [photoSize, handleLongPress]);

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
      <View style={styles.header}>
        <Text style={styles.title}>Toutes les photos</Text>
        {allPhotos.length > 0 ? (
          <Text style={styles.count}>{allPhotos.length} photo{allPhotos.length > 1 ? 's' : ''}</Text>
        ) : null}
      </View>

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
          {allPhotos.length > 6 ? (
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
                <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Effacer la recherche">
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
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
                  <View key={photo.id} style={[styles.photoCell, idx % NUM_COLS !== NUM_COLS - 1 && { marginRight: GAP }]}>
                    <PhotoThumbnail
                      photo={photo}
                      size={photoSize}
                      onPress={() =>
                        router.push({
                          pathname: '/viewer',
                          params: { photoUri: photo.uri, photoName: photo.name, photoId: photo.id, albumName: '' },
                        })
                      }
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
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md,
  },
  title: { color: Colors.textPrimary, fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.bold, includeFontPadding: false },
  count: { color: Colors.textMuted, fontSize: Typography.sizes.sm, includeFontPadding: false },
  emptyWrapper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, height: 44,
  },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: Typography.sizes.base, includeFontPadding: false },
  section: { marginBottom: Spacing.lg },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.textSecondary, fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold, flex: 1, includeFontPadding: false,
    textTransform: 'capitalize',
  },
  sectionCount: { color: Colors.textMuted, fontSize: Typography.sizes.xs, includeFontPadding: false },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  photoCell: { marginBottom: GAP },
});
