// Powered by OnSpace.AI — Albums Screen
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useGallery } from '@/hooks/useGallery';
import { useAlert } from '@/template';
import { AlbumCard, EmptyState, Button, Input, BottomSheet } from '@/components';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { Album } from '@/types';

export default function AlbumsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { groupId, groupName, color } = useLocalSearchParams<{
    groupId: string;
    groupName: string;
    color: string;
  }>();
  const { user } = useAuth();
  const { albums, loadAlbums, addAlbum, removeAlbum } = useGallery();
  const { showAlert } = useAlert();
  const accentColor = color || Colors.primary;

  const [sheetVisible, setSheetVisible] = useState(false);
  const [albumName, setAlbumName] = useState('');
  const [albumDesc, setAlbumDesc] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (groupId) loadAlbums(groupId);
  }, [groupId]);

  const handleCreate = useCallback(async () => {
    if (!albumName.trim()) {
      showAlert('Nom requis', "Veuillez saisir un nom pour l'album.");
      return;
    }
    setSaving(true);
    try {
      await addAlbum(user!.id, groupId, albumName.trim(), albumDesc.trim() || undefined);
      setAlbumName('');
      setAlbumDesc('');
      setSheetVisible(false);
    } finally {
      setSaving(false);
    }
  }, [albumName, albumDesc, user, groupId]);

  const handleLongPress = useCallback(
    (album: Album) => {
      showAlert(`Supprimer "${album.name}" ?`, 'Toutes les photos de cet album seront supprimées.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => removeAlbum(album.id, groupId) },
      ]);
    },
    [groupId],
  );

  const renderAlbum = useCallback(
    ({ item, index }: { item: Album; index: number }) => (
      <View
        style={[
          styles.cardWrapper,
          index % 2 === 0 ? { marginRight: Spacing.sm / 2 } : { marginLeft: Spacing.sm / 2 },
        ]}
      >
        <AlbumCard
          album={item}
          accentColor={accentColor}
          onPress={() =>
            router.push({
              pathname: '/photos',
              params: { albumId: item.id, albumName: item.name, color: accentColor },
            })
          }
          onLongPress={() => handleLongPress(item)}
        />
      </View>
    ),
    [accentColor, handleLongPress],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={[styles.colorDot, { backgroundColor: accentColor }]} />
          <Text style={styles.title} numberOfLines={1}>
            {groupName}
          </Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => setSheetVisible(true)} hitSlop={8}>
          <MaterialIcons name="add" size={24} color={Colors.textPrimary} />
        </Pressable>
      </View>

      <FlatList
        data={albums}
        keyExtractor={(item) => item.id}
        renderItem={renderAlbum}
        numColumns={2}
        contentContainerStyle={[styles.list, albums.length === 0 && { flex: 1 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          albums.length > 0 ? (
            <Text style={styles.meta}>
              {albums.length} album{albums.length > 1 ? 's' : ''}
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState title="Aucun album" subtitle="Ajoutez votre premier album dans ce groupe." />
        }
      />

      {albums.length > 0 ? (
        <Pressable
          style={[styles.fab, { bottom: insets.bottom + Spacing.lg, backgroundColor: accentColor }]}
          onPress={() => setSheetVisible(true)}
        >
          <MaterialIcons name="add" size={28} color={Colors.textPrimary} />
        </Pressable>
      ) : null}

      <BottomSheet visible={sheetVisible} title="Nouvel album" onClose={() => setSheetVisible(false)}>
        <View style={styles.form}>
          <Input
            label="Nom de l'album *"
            value={albumName}
            onChangeText={setAlbumName}
            placeholder="Ex: Été 2024, Anniversaire..."
            accessibilityLabel="Nom de l'album"
          />
          <Input
            label="Description (optionnel)"
            value={albumDesc}
            onChangeText={setAlbumDesc}
            placeholder="Quelques mots..."
            multiline
            numberOfLines={3}
            accessibilityLabel="Description"
          />
          <Button label="Créer l'album" onPress={handleCreate} loading={saving} />
        </View>
      </BottomSheet>
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
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    flex: 1,
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
  meta: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.sm,
    paddingHorizontal: Spacing.sm / 2,
    marginBottom: Spacing.sm,
  },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  cardWrapper: { flex: 1, marginBottom: Spacing.md },
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
  form: { gap: Spacing.lg },
});
