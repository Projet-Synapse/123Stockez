// Powered by OnSpace.AI
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Album } from '@/types';
import { Colors, Typography, Radius, Spacing } from '@/constants/theme';

interface AlbumCardProps {
  album: Album;
  accentColor?: string;
  onPress: () => void;
  onLongPress?: () => void;
}

export const AlbumCard = React.memo(
  ({ album, accentColor = Colors.primary, onPress, onLongPress }: AlbumCardProps) => {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      >
        {album.coverPhoto ? (
          <Image
            source={{ uri: album.coverPhoto }}
            style={styles.cover}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.cover, styles.placeholder, { backgroundColor: accentColor + '22' }]}>
            <Text style={styles.icon}>🖼️</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {album.name}
          </Text>
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: accentColor }]} />
            <Text style={styles.meta}>
              {album.photoCount} photo{album.photoCount !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  cover: { width: '100%', height: 110 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 36 },
  info: { padding: Spacing.sm + 4 },
  name: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    includeFontPadding: false,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  meta: { color: Colors.textMuted, fontSize: Typography.sizes.xs, includeFontPadding: false },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
});

AlbumCard.displayName = 'AlbumCard';
