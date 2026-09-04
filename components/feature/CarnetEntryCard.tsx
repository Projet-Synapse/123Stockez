// Powered by OnSpace.AI — Carnet Entry Card
import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { CarnetEntry, CarnetField } from '@/types';

interface CarnetEntryCardProps {
  entry: CarnetEntry;
  fields: CarnetField[];
  onPress: () => void;
  onLongPress?: () => void;
}

export function CarnetEntryCard({ entry, fields, onPress, onLongPress }: CarnetEntryCardProps) {
  const filledValues = entry.fieldValues.filter((fv) => fv.value.trim());

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      onPress={onPress}
      onLongPress={onLongPress}
    >
      {/* Photo */}
      <Image source={{ uri: entry.uri }} style={styles.photo} contentFit="cover" transition={200} />

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {entry.name}
        </Text>

        {/* Description */}
        {entry.description ? (
          <Text style={styles.desc} numberOfLines={2}>
            {entry.description}
          </Text>
        ) : null}

        {/* Fields */}
        {filledValues.length > 0 ? (
          <View style={styles.fieldsRow}>
            {filledValues.slice(0, 3).map((fv) => {
              const field = fields.find((f) => f.id === fv.fieldId);
              if (!field) return null;
              return (
                <View key={fv.fieldId} style={styles.fieldBadge}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  <Text style={styles.fieldValue} numberOfLines={1}>
                    {fv.value}
                  </Text>
                </View>
              );
            })}
            {filledValues.length > 3 ? (
              <View style={styles.fieldBadge}>
                <Text style={styles.fieldLabel}>+{filledValues.length - 3}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Date */}
        <Text style={styles.date}>
          {new Date(entry.createdAt).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
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
    flexDirection: 'row',
    ...Shadows.sm,
  },
  pressed: { opacity: 0.88 },
  photo: { width: 100, height: 100 },
  content: { flex: 1, padding: Spacing.sm, gap: 4, justifyContent: 'center' },
  name: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    includeFontPadding: false,
  },
  desc: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    lineHeight: 20,
    includeFontPadding: false,
  },
  fieldsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 },
  fieldBadge: {
    backgroundColor: Colors.surfaceMid,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fieldLabel: { color: Colors.primary, fontSize: 10, fontWeight: '600', includeFontPadding: false },
  fieldValue: { color: Colors.textPrimary, fontSize: 11, includeFontPadding: false },
  date: { color: Colors.textMuted, fontSize: 11, includeFontPadding: false, marginTop: 2 },
});
