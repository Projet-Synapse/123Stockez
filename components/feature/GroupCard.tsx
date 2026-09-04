// Powered by OnSpace.AI
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Group } from '@/types';
import { Colors, Typography, Radius, Spacing } from '@/constants/theme';

interface GroupCardProps {
  group: Group;
  onPress: () => void;
  onLongPress?: () => void;
}

export const GroupCard = React.memo(({ group, onPress, onLongPress }: GroupCardProps) => {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {group.coverPhoto ? (
        <Image source={{ uri: group.coverPhoto }} style={styles.cover} contentFit="cover" transition={200} />
      ) : (
        <View style={[styles.cover, styles.placeholder, { backgroundColor: group.color + '33' }]}>
          <Text style={[styles.icon, { color: group.color }]}>📁</Text>
        </View>
      )}
      <View style={[styles.colorBar, { backgroundColor: group.color }]} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {group.name}
        </Text>
        <Text style={styles.meta}>
          {group.albumCount} album{group.albumCount !== 1 ? 's' : ''}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  cover: { width: '100%', height: 130 },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 40 },
  colorBar: { height: 3, width: '100%' },
  info: { padding: Spacing.md },
  name: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    includeFontPadding: false,
  },
  meta: { color: Colors.textMuted, fontSize: Typography.sizes.xs, marginTop: 2, includeFontPadding: false },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
});

GroupCard.displayName = 'GroupCard';
