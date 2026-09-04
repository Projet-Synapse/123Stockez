// Powered by OnSpace.AI — Groups Screen
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useGallery } from '@/hooks/useGallery';
import { useAlert } from '@/template';
import { GroupCard, EmptyState, Button, Input, BottomSheet } from '@/components';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { Group } from '@/types';

export default function GroupsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { groups, loadGroups, addGroup, removeGroup } = useGallery();
  const { showAlert } = useAlert();

  const [sheetVisible, setSheetVisible] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) loadGroups(user.id);
  }, [user]);

  const handleCreate = useCallback(async () => {
    if (!groupName.trim()) {
      showAlert('Nom requis', 'Veuillez saisir un nom pour le groupe.');
      return;
    }
    setSaving(true);
    try {
      await addGroup(user!.id, groupName.trim(), groupDesc.trim() || undefined);
      setGroupName('');
      setGroupDesc('');
      setSheetVisible(false);
    } finally {
      setSaving(false);
    }
  }, [groupName, groupDesc, user]);

  const handleLongPress = useCallback(
    (group: Group) => {
      showAlert(`Supprimer "${group.name}" ?`, 'Tous les albums et photos seront supprimés.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => removeGroup(group.id, user!.id) },
      ]);
    },
    [user],
  );

  const renderGroup = useCallback(
    ({ item, index }: { item: Group; index: number }) => (
      <View
        style={[
          styles.cardWrapper,
          index % 2 === 0 ? { marginRight: Spacing.sm / 2 } : { marginLeft: Spacing.sm / 2 },
        ]}
      >
        <GroupCard
          group={item}
          onPress={() =>
            router.push({
              pathname: '/albums',
              params: { groupId: item.id, groupName: item.name, color: item.color },
            })
          }
          onLongPress={() => handleLongPress(item)}
        />
      </View>
    ),
    [handleLongPress],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour 👋</Text>
          <Text style={styles.title}>Mes Groupes</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => setSheetVisible(true)} hitSlop={8}>
          <MaterialIcons name="add" size={24} color={Colors.textPrimary} />
        </Pressable>
      </View>

      {/* Stats bar */}
      {groups.length > 0 ? (
        <View style={styles.statsBar}>
          <Text style={styles.statsText}>
            {groups.length} groupe{groups.length > 1 ? 's' : ''}
          </Text>
          <Text style={styles.statsText}>·</Text>
          <Text style={styles.statsText}>{groups.reduce((acc, g) => acc + g.albumCount, 0)} albums</Text>
        </View>
      ) : null}

      <FlatList
        data={groups}
        keyExtractor={(item) => item.id}
        renderItem={renderGroup}
        numColumns={2}
        contentContainerStyle={[styles.list, groups.length === 0 && { flex: 1 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            title="Aucun groupe"
            subtitle="Créez votre premier groupe pour organiser vos albums photo."
          />
        }
      />

      {/* FAB */}
      {groups.length > 0 ? (
        <Pressable style={[styles.fab, { bottom: insets.bottom + 80 }]} onPress={() => setSheetVisible(true)}>
          <MaterialIcons name="add" size={28} color={Colors.textPrimary} />
        </Pressable>
      ) : null}

      {/* Create group sheet */}
      <BottomSheet visible={sheetVisible} title="Nouveau groupe" onClose={() => setSheetVisible(false)}>
        <View style={styles.form}>
          <Input
            label="Nom du groupe *"
            value={groupName}
            onChangeText={setGroupName}
            placeholder="Ex: Voyages, Famille..."
            accessibilityLabel="Nom du groupe"
          />
          <Input
            label="Description (optionnel)"
            value={groupDesc}
            onChangeText={setGroupDesc}
            placeholder="Ex: Nos meilleures aventures..."
            multiline
            numberOfLines={3}
            accessibilityLabel="Description"
          />
          <Button label="Créer le groupe" onPress={handleCreate} loading={saving} />
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  greeting: { color: Colors.textMuted, fontSize: Typography.sizes.sm, includeFontPadding: false },
  title: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
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
  statsBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  statsText: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  cardWrapper: { flex: 1, marginBottom: Spacing.md },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  form: { gap: Spacing.lg },
});
