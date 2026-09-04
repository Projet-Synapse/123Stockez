// Powered by OnSpace.AI — Move Photo Sheet
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { getGroups, getAlbums } from '@/services/storage';
import { Group, Album } from '@/types';

interface MovePhotoSheetProps {
  visible: boolean;
  onClose: () => void;
  currentAlbumId: string;
  userId: string;
  onMove: (targetAlbum: Album) => void;
}

interface AlbumWithGroup extends Album {
  groupName: string;
  groupColor: string;
}

export function MovePhotoSheet({ visible, onClose, currentAlbumId, userId, onMove }: MovePhotoSheetProps) {
  const [albums, setAlbums] = useState<AlbumWithGroup[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    loadAllAlbums();
  }, [visible]);

  const loadAllAlbums = async () => {
    setLoading(true);
    try {
      const groups: Group[] = await getGroups(userId);
      const result: AlbumWithGroup[] = [];
      for (const group of groups) {
        const groupAlbums = await getAlbums(group.id);
        for (const album of groupAlbums) {
          result.push({ ...album, groupName: group.name, groupColor: group.color });
        }
      }
      // Exclude current album
      setAlbums(result.filter((a) => a.id !== currentAlbumId));
    } finally {
      setLoading(false);
    }
  };

  const renderAlbum = ({ item }: { item: AlbumWithGroup }) => (
    <Pressable
      style={({ pressed }) => [styles.albumRow, pressed && styles.albumRowPressed]}
      onPress={() => onMove(item)}
    >
      {/* Cover */}
      <View style={[styles.albumThumb, { backgroundColor: item.groupColor + '33' }]}>
        {item.coverPhoto ? (
          <Image
            source={{ uri: item.coverPhoto }}
            style={styles.albumThumb}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <MaterialIcons name="photo-album" size={24} color={item.groupColor} />
        )}
      </View>
      {/* Info */}
      <View style={styles.albumInfo}>
        <Text style={styles.albumName} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.groupTag}>
          <View style={[styles.groupDot, { backgroundColor: item.groupColor }]} />
          <Text style={styles.groupName} numberOfLines={1}>
            {item.groupName}
          </Text>
        </View>
      </View>
      {/* Count */}
      <Text style={styles.photoCount}>
        {item.photoCount} photo{item.photoCount !== 1 ? 's' : ''}
      </Text>
      <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
    </Pressable>
  );

  return (
    <BottomSheet visible={visible} title="Déplacer vers..." onClose={onClose}>
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.xl }} />
      ) : albums.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="folder-open" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>Aucun autre album disponible</Text>
        </View>
      ) : (
        <FlatList
          data={albums}
          keyExtractor={(item) => item.id}
          renderItem={renderAlbum}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  albumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  albumRowPressed: { backgroundColor: Colors.surfaceCard },
  albumThumb: {
    width: 52,
    height: 52,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  albumInfo: { flex: 1, gap: 2 },
  albumName: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    includeFontPadding: false,
  },
  groupTag: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  groupDot: { width: 8, height: 8, borderRadius: 4 },
  groupName: { color: Colors.textMuted, fontSize: Typography.sizes.xs, includeFontPadding: false },
  photoCount: { color: Colors.textMuted, fontSize: Typography.sizes.xs, includeFontPadding: false },
  separator: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.xs },
  empty: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xl },
  emptyText: { color: Colors.textMuted, fontSize: Typography.sizes.base, includeFontPadding: false },
});
