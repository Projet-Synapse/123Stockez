// Powered by OnSpace.AI — Profile Screen (Cloud)
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useGallery } from '@/hooks/useGallery';
import { useCarnet } from '@/hooks/useCarnet';
import { useAlert } from '@/template';
import { useUpdates } from '@/hooks/useUpdates';
import { Button } from '@/components';
import { currentPlatform } from '@/services/platform';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';

const PLATFORM_LABELS: Record<string, string> = {
  ios: 'iOS',
  android: 'Android',
  web: 'Web',
  linux: 'Linux',
  macos: 'macOS',
  windows: 'Windows',
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { groups } = useGallery();
  const { carnets } = useCarnet();
  const { showAlert } = useAlert();
  const update = useUpdates();

  const totalAlbums = groups.reduce((acc, g) => acc + g.albumCount, 0);
  const totalEntries = carnets.reduce((acc, c) => acc + c.entryCount, 0);

  const displayName = user?.name ?? user?.email?.split('@')[0] ?? 'Utilisateur';
  const initials = displayName[0]?.toUpperCase() ?? 'U';

  const handleSignOut = () => {
    showAlert('Se déconnecter ?', 'Vos données resteront sauvegardées dans le cloud.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Déconnexion', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScrollView
      style={[styles.root, { paddingTop: insets.top }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
    >
      <StatusBar style="light" />

      <View style={styles.header}>
        <Text style={styles.title}>Profil</Text>
      </View>

      {/* Avatar card */}
      <View style={styles.avatarCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.displayName}>{displayName}</Text>
        <Text style={styles.emailText}>{user?.email}</Text>
        <View style={styles.cloudBadge}>
          <MaterialIcons name="cloud-done" size={14} color={Colors.success} />
          <Text style={styles.cloudText}>Données synchronisées dans le cloud</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{groups.length}</Text>
          <Text style={styles.statLabel}>Groupes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalAlbums}</Text>
          <Text style={styles.statLabel}>Albums</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{carnets.length}</Text>
          <Text style={styles.statLabel}>Carnets</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalEntries}</Text>
          <Text style={styles.statLabel}>Entrées</Text>
        </View>
      </View>

      {/* Menu items */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Application</Text>
        <MenuItem icon="cloud" label="Stockage cloud (Supabase)" />
        <MenuItem icon="security" label="Données privées, isolées par compte" />
        <MenuItem icon="photo-library" label="Photos stockées en haute qualité" />
        <MenuItem icon="email" label="Partage par email disponible" />
        <MenuItem
          icon="devices"
          label={`Plateforme : ${PLATFORM_LABELS[currentPlatform()] ?? currentPlatform()}`}
        />
      </View>

      {/* Version tracker */}
      <View style={[styles.section, { marginTop: Spacing.lg }]}>
        <Text style={styles.sectionTitle}>Mises à jour</Text>

        <View style={styles.versionRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.versionLabel}>Version installée</Text>
            <Text style={styles.versionValue}>{update.currentVersion}</Text>
          </View>
          <View style={[styles.updateBadge, updateBadgeStyle(update.stage)]}>
            <Text style={[styles.updateBadgeText, { color: updateBadgeColor(update.stage) }]}>
              {updateStatusLabel(update)}
            </Text>
          </View>
        </View>

        {update.releaseNotes && update.stage === 'available' ? (
          <Text style={styles.releaseNotes} numberOfLines={6}>
            {update.releaseNotes}
          </Text>
        ) : null}

        {update.error ? <Text style={styles.updateError}>{update.error}</Text> : null}

        <View style={styles.updateActions}>
          <Button
            label={update.stage === 'checking' ? 'Vérification…' : 'Rechercher une mise à jour'}
            onPress={() => update.check()}
            variant="secondary"
            loading={update.stage === 'checking'}
          />
          {update.stage === 'available' && update.canSelfInstall ? (
            <Button
              label="Installer et redémarrer"
              onPress={update.applyUpdate}
              loading={update.stage !== 'available'}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.logoutContainer}>
        <Button label="Se déconnecter" onPress={handleSignOut} variant="danger" />
      </View>
    </ScrollView>
  );
}

function updateStatusLabel(update: ReturnType<typeof useUpdates>): string {
  switch (update.stage) {
    case 'checking':
      return 'Vérification…';
    case 'available':
      return update.latestVersion ? `${update.latestVersion} disponible` : 'Mise à jour disponible';
    case 'downloading':
      return typeof update.progress === 'number' ? `Téléchargement ${update.progress}%` : 'Téléchargement…';
    case 'ready':
      return 'Prête à installer';
    case 'error':
      return 'Échec de la vérification';
    case 'up-to-date':
      return 'À jour';
    default:
      return '—';
  }
}

function updateBadgeColor(stage: string): string {
  if (stage === 'available' || stage === 'ready') return Colors.warning;
  if (stage === 'error') return Colors.error;
  if (stage === 'up-to-date') return Colors.success;
  return Colors.textSecondary;
}

function updateBadgeStyle(stage: string) {
  return { borderColor: updateBadgeColor(stage), backgroundColor: updateBadgeColor(stage) + '22' };
}

function MenuItem({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={menuStyles.item}>
      <MaterialIcons name={icon} size={20} color={Colors.textSecondary} />
      <Text style={menuStyles.label}>{label}</Text>
    </View>
  );
}

const menuStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: { color: Colors.textSecondary, fontSize: Typography.sizes.base, flex: 1, includeFontPadding: false },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    includeFontPadding: false,
  },
  avatarCard: {
    margin: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xxxl,
    fontWeight: Typography.weights.bold,
  },
  displayName: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    includeFontPadding: false,
  },
  emailText: { color: Colors.textSecondary, fontSize: Typography.sizes.sm, includeFontPadding: false },
  cloudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.success + '22',
    borderWidth: 1,
    borderColor: Colors.success,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    marginTop: Spacing.xs,
  },
  cloudText: {
    color: Colors.success,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statNumber: {
    color: Colors.primary,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    includeFontPadding: false,
  },
  statLabel: { color: Colors.textMuted, fontSize: 11, includeFontPadding: false },
  section: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    marginBottom: Spacing.sm,
    includeFontPadding: false,
  },
  logoutContainer: { margin: Spacing.lg, marginTop: Spacing.xl },
  versionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
  versionLabel: { color: Colors.textMuted, fontSize: Typography.sizes.xs, includeFontPadding: false },
  versionValue: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    includeFontPadding: false,
  },
  updateBadge: {
    borderWidth: 1,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  updateBadgeText: {
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    includeFontPadding: false,
  },
  releaseNotes: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    marginTop: Spacing.sm,
    lineHeight: 20,
    includeFontPadding: false,
  },
  updateError: {
    color: Colors.error,
    fontSize: Typography.sizes.xs,
    marginTop: Spacing.sm,
    includeFontPadding: false,
  },
  updateActions: { gap: Spacing.sm, marginTop: Spacing.md },
});
