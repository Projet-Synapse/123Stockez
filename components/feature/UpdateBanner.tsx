// Powered by OnSpace.AI — In-app update prompt
import React from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useUpdates } from '@/hooks/useUpdates';
import { RELEASES_URL } from '@/constants/config';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

/**
 * Sits above the tab content. Silent unless a newer version exists, so it
 * costs nothing on the happy path.
 */
export function UpdateBanner() {
  const {
    stage,
    latestVersion,
    progress,
    mandatory,
    canSelfInstall,
    downloadUrl,
    dismissed,
    dismiss,
    applyUpdate,
  } = useUpdates();

  const isBusy = stage === 'downloading';
  const isReady = stage === 'ready';
  const shouldShow = stage === 'available' || isBusy || isReady;
  if (!shouldShow) return null;
  if (dismissed && !mandatory && !isBusy) return null;

  const handlePress = () => {
    if (isBusy) return;
    if (canSelfInstall) {
      void applyUpdate();
      return;
    }
    void Linking.openURL(downloadUrl ?? RELEASES_URL);
  };

  const actionLabel = isReady ? 'Redémarrer' : canSelfInstall ? 'Mettre à jour' : 'Télécharger';
  const busyLabel = `Téléchargement${typeof progress === 'number' ? ` ${progress}%` : '…'}`;

  return (
    <View style={[styles.banner, mandatory && styles.bannerMandatory]}>
      <MaterialIcons
        name={mandatory ? 'priority-high' : 'system-update'}
        size={20}
        color={mandatory ? Colors.error : Colors.primary}
      />

      <View style={styles.textBlock}>
        <Text style={styles.title} numberOfLines={1}>
          {mandatory
            ? 'Mise à jour requise'
            : isReady
              ? 'Nouvelle version prête à installer'
              : 'Nouvelle version disponible'}
          {latestVersion ? ` · ${latestVersion}` : ''}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {isBusy
            ? busyLabel
            : isReady
              ? "Elle s'installera à la fermeture de l'application, ou redémarrez maintenant."
              : canSelfInstall
                ? "L'application redémarrera pour terminer l'installation."
                : 'Ouvrez la page de téléchargement pour installer la nouvelle version.'}
        </Text>
        {stage === 'downloading' && typeof progress === 'number' ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(2, progress)}%` }]} />
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={handlePress}
        disabled={isBusy}
        accessibilityRole="button"
        accessibilityLabel={isBusy ? busyLabel : actionLabel}
        style={({ pressed }) => [styles.action, pressed && !isBusy && { opacity: 0.75 }]}
      >
        {isBusy ? (
          <ActivityIndicator size="small" color={Colors.textInverse} />
        ) : (
          <Text style={styles.actionText}>{actionLabel}</Text>
        )}
      </Pressable>

      {!mandatory && !isBusy ? (
        <Pressable
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel="Masquer la notification de mise à jour"
          hitSlop={8}
        >
          <MaterialIcons name="close" size={18} color={Colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.lg,
  },
  bannerMandatory: { borderColor: Colors.error },
  textBlock: { flex: 1, gap: 2 },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    includeFontPadding: false,
  },
  subtitle: { color: Colors.textSecondary, fontSize: Typography.sizes.xs, includeFontPadding: false },
  progressTrack: {
    height: 4,
    marginTop: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceMid,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: Radius.full },
  action: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minWidth: 96,
    alignItems: 'center',
  },
  actionText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    includeFontPadding: false,
  },
});
