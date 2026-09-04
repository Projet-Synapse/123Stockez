// Powered by OnSpace.AI — Groups Screen
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, Pressable, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
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
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    loadGroups(user.id).finally(() => setLoading(false));
  }, [user]);

  const handleRefresh = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      await loadGroups(user.id);
    } finally {
      setRefreshing(false);
    }
  }, [user, loadGroups]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, search]);

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

  const handleLongPress = useCallback((group: Group) => {
    showAlert(`Supprimer "${group.name}" ?`, 'Tous les albums et photos seront supprimés.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => removeGroup(group.id, user!.id) },
    ]);
  }, [user]);

  const renderGroup = useCallback(({ item, index }: { item: Group; index: number }) => (
    <View style={[styles.cardWrapper, index % 2 === 0 ? { marginRight: Spacing.sm / 2 } : { marginLeft: Spacing.sm / 2 }]}>
      <GroupCard group={item} onPress={() => router.push({ pathname: '/albums', params: { groupId: item.id, groupName: item.name, color: item.color } })} onLongPress={() => handleLongPress(item)} />
    </View>
  ), [handleLongPress]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour 👋</Text>
          <Text style={styles.title}>Mes Groupes</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => setSheetVisible(true)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Créer un groupe">
          <MaterialIcons name="add" size={24} color={Colors.textPrimary} />
        </Pressable>
      </View>

      {loading && groups.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <>
          {/* Stats bar */}
          {groups.length > 0 ? (
            <View style={styles.statsBar}>
              <Text style={styles.statsText}>{groups.length} groupe{groups.length > 1 ? 's' : ''}</Text>
              <Text style={styles.statsText}>·</Text>
              <Text style={styles.statsText}>{groups.reduce((acc, g) => acc + g.albumCount, 0)} albums</Text>
            </View>
          ) : null}

          {/* Search */}
          {groups.length > 3 ? (
            <View style={styles.searchBar}>
              <MaterialIcons name="search" size={20} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                value={search}
                onChangeText={setSearch}
                placeholder="Rechercher un groupe..."
                placeholderTextColor={Colors.textMuted}
                accessibilityLabel="Rechercher un groupe"
                returnKeyType="search"
              />
              {search.length > 0 ? (
                <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityRole="button" accessibilityLabel="Effacer la recherche">
                  <MaterialIcons name="close" size={18} color={Colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
          ) : null}

          <FlatList
            data={filteredGroups}
            keyExtractor={(item) => item.id}
            renderItem={renderGroup}
            numColumns={2}
            contentContainerStyle={[styles.list, filteredGroups.length === 0 && { flex: 1 }]}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
            ListEmptyComponent={
              groups.length > 0 ? (
                <EmptyState title="Aucun résultat" subtitle={`Aucun groupe ne correspond à "${search}".`} />
              ) : (
                <EmptyState title="Aucun groupe" subtitle="Créez votre premier groupe pour organiser vos albums photo." />
              )
            }
          />

          {/* FAB */}
          {groups.length > 0 ? (
            <Pressable style={[styles.fab, { bottom: insets.bottom + 80 }]} onPress={() => setSheetVisible(true)} accessibilityRole="button" accessibilityLabel="Créer un groupe">
              <MaterialIcons name="add" size={28} color={Colors.textPrimary} />
            </Pressable>
          ) : null}
        </>
      )}

      {/* Create group sheet */}
      <BottomSheet visible={sheetVisible} title="Nouveau groupe" onClose={() => setSheetVisible(false)}>
        <View style={styles.form}>
          <Input label="Nom du groupe *" value={groupName} onChangeText={setGroupName} placeholder="Ex: Voyages, Famille..." accessibilityLabel="Nom du groupe" />
          <Input label="Description (optionnel)" value={groupDesc} onChangeText={setGroupDesc} placeholder="Ex: Nos meilleures aventures..." multiline numberOfLines={3} accessibilityLabel="Description" />
          <Button label="Créer le groupe" onPress={handleCreate} loading={saving} />
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  greeting: { color: Colors.textMuted, fontSize: Typography.sizes.sm, includeFontPadding: false },
  title: { color: Colors.textPrimary, fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.bold, includeFontPadding: false },
  addBtn: { width: 44, height: 44, borderRadius: Radius.md, backgroundColor: Colors.surfaceCard, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsBar: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  statsText: { color: Colors.textMuted, fontSize: Typography.sizes.sm },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.md,
    backgroundColor: Colors.surfaceCard, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, height: 44,
  },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: Typography.sizes.base, includeFontPadding: false },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  cardWrapper: { flex: 1, marginBottom: Spacing.md },
  fab: { position: 'absolute', right: Spacing.lg, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 8 },
  form: { gap: Spacing.lg },
});
