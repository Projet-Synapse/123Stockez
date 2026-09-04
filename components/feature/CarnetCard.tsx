// Powered by OnSpace.AI — Carnet Card
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { Carnet } from '@/types';

interface CarnetCardProps {
  carnet: Carnet;
  onPress: () => void;
  onLongPress?: () => void;
}

export function CarnetCard({ carnet, onPress, onLongPress }: CarnetCardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      onLongPress={onLongPress}
      android_ripple={{ color: Colors.surfaceMid }}
    >
      {/* Cover or emoji bg */}
      <View style={styles.cover}>
        {carnet.coverPhoto ? (
          <Image
            source={{ uri: carnet.coverPhoto }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.emptyBg} />
        )}
        {/* Gradient overlay */}
        <View style={styles.gradient} />
        {/* Emoji badge */}
        <View style={styles.emojiBadge}>
          <Text style={styles.emoji}>{carnet.emoji}</Text>
        </View>
        {/* Field count chip */}
        {carnet.fields.length > 0 ? (
          <View style={styles.fieldChip}>
            <MaterialIcons name="label" size={10} color={Colors.textSecondary} />
            <Text style={styles.fieldChipText}>
              {carnet.fields.length} champ{carnet.fields.length > 1 ? 's' : ''}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {carnet.name}
        </Text>
        {carnet.description ? (
          <Text style={styles.desc} numberOfLines={1}>
            {carnet.description}
          </Text>
        ) : null}
        <View style={styles.meta}>
          <MaterialIcons name="menu-book" size={12} color={Colors.textMuted} />
          <Text style={styles.metaText}>
            {carnet.entryCount} entrée{carnet.entryCount !== 1 ? 's' : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  pressed: { opacity: 0.88, transform: [{ scale: 0.98 }] },
  cover: {
    height: 130,
    backgroundColor: Colors.surfaceMid,
    position: 'relative',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  emptyBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.surfaceMid,
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,14,23,0.45)',
  },
  emojiBadge: {
    position: 'absolute',
    top: Spacing.sm,
    left: Spacing.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 22 },
  fieldChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderRadius: Radius.full,
    margin: Spacing.xs,
  },
  fieldChipText: { color: Colors.textSecondary, fontSize: 10, includeFontPadding: false },
  info: { padding: Spacing.sm, gap: 3 },
  name: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    includeFontPadding: false,
  },
  desc: { color: Colors.textSecondary, fontSize: Typography.sizes.xs, includeFontPadding: false },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  metaText: { color: Colors.textMuted, fontSize: Typography.sizes.xs, includeFontPadding: false },
});
