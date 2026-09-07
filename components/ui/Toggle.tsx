// Powered by OnSpace.AI
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Radius, Spacing, Typography } from '@/constants/theme';

interface ToggleProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  accentColor?: string;
}

export function Toggle({ label, description, value, onChange, accentColor }: ToggleProps) {
  return (
    <Pressable
      style={styles.row}
      onPress={() => onChange(!value)}
      role="switch"
      accessibilityState={{ checked: value }}
    >
      <View style={styles.textWrap}>
        <Text style={styles.label}>{label}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      <View style={[styles.track, value && { backgroundColor: accentColor ?? Colors.primary }]}>
        <View style={[styles.thumb, value && styles.thumbOn]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  textWrap: {
    flex: 1,
  },
  label: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
  },
  description: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.xs,
  },
  track: {
    width: 48,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceMid,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 2,
  },
  thumb: {
    width: 22,
    height: 22,
    borderRadius: Radius.full,
    backgroundColor: Colors.textMuted,
  },
  thumbOn: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-end',
  },
});
