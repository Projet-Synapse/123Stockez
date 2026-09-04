// Powered by OnSpace.AI — Photo Viewer
import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Share, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAlert } from '@/template';
import { useGallery } from '@/hooks/useGallery';
import { useAuth } from '@/hooks/useAuth';
import { MovePhotoSheet } from '@/components/feature/MovePhotoSheet';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { Album } from '@/types';

export default function ViewerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { photoUri, photoName: initialPhotoName, photoId, albumName } = useLocalSearchParams<{
    photoUri: string;
    photoName: string;
    photoId: string;
    albumName: string;
  }>();
  const { showAlert } = useAlert();
  const { user } = useAuth();
  const { photos, allPhotos, renamePhoto, movePhoto } = useGallery();
  const [uiVisible, setUiVisible] = useState(true);
  const [renameVisible, setRenameVisible] = useState(false);
  const [moveVisible, setMoveVisible] = useState(false);
  const [newName, setNewName] = useState('');

  const { width, height } = Dimensions.get('window');

  // Find current photo in either photos or allPhotos list for up-to-date name
  const currentPhoto = [...photos, ...allPhotos].find((p) => p.id === photoId);
  const displayName = currentPhoto?.name ?? initialPhotoName ?? '';

  const handleShare = async () => {
    try {
      await Share.share({
        subject: `Photo : ${displayName}`,
        message: `Voici une photo de mon album "${albumName}" sur PhotoVault !`,
        url: photoUri,
      });
    } catch (e) {
      showAlert('Erreur', 'Impossible de partager cette photo.');
    }
  };

  const openRename = () => {
    setNewName(displayName);
    setRenameVisible(true);
  };

  const handleMove = async (targetAlbum: Album) => {
    const photo = currentPhoto;
    if (!photo) return;
    setMoveVisible(false);
    await movePhoto(photo, targetAlbum);
    showAlert('Photo déplacée', `La photo a été déplacée vers « ${targetAlbum.name} ».`);
    router.back();
  };

  const handleRename = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      showAlert('Nom requis', 'Veuillez saisir un nom pour la photo.');
      return;
    }
    const photo = currentPhoto;
    if (!photo) return;
    await renamePhoto(photo, trimmed);
    setRenameVisible(false);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" hidden={!uiVisible} />

      {/* Full screen photo */}
      <Pressable style={{ flex: 1 }} onPress={() => setUiVisible((v) => !v)}>
        <Image source={{ uri: photoUri }} style={{ width, height }} contentFit="contain" transition={150} />
      </Pressable>

      {/* Top bar */}
      {uiVisible ? (
        <View style={[styles.topBar, { paddingTop: insets.top + Spacing.sm }]}>
          <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={12} accessibilityRole="button" accessibilityLabel="Retour">
            <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
          </Pressable>
          <Pressable style={styles.titleBlock} onPress={openRename} hitSlop={8} accessibilityRole="button" accessibilityLabel="Renommer la photo">
            <Text style={styles.photoName} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.albumName}>{albumName}</Text>
          </Pressable>
          <Pressable onPress={openRename} style={styles.iconBtn} hitSlop={12} accessibilityRole="button" accessibilityLabel="Renommer">
            <MaterialIcons name="edit" size={22} color={Colors.textSecondary} />
          </Pressable>
          <Pressable onPress={() => setMoveVisible(true)} style={styles.iconBtn} hitSlop={12} accessibilityRole="button" accessibilityLabel="Déplacer la photo">
            <MaterialIcons name="drive-file-move" size={22} color={Colors.textSecondary} />
          </Pressable>
          <Pressable onPress={handleShare} style={styles.iconBtn} hitSlop={12} accessibilityRole="button" accessibilityLabel="Partager la photo">
            <MaterialIcons name="share" size={24} color={Colors.textPrimary} />
          </Pressable>
        </View>
      ) : null}

      {/* Bottom bar */}
      {uiVisible ? (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + Spacing.md }]}>
          <Pressable onPress={() => router.push({ pathname: '/photo-editor', params: { photoUri, photoName: displayName, photoId, albumId: currentPhoto?.albumId ?? '' } })} style={styles.actionBtn}>
            <MaterialIcons name="auto-fix-high" size={20} color={Colors.textPrimary} />
            <Text style={styles.actionLabel}>Éditer</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable onPress={() => setMoveVisible(true)} style={styles.actionBtn}>
            <MaterialIcons name="drive-file-move" size={20} color={Colors.textPrimary} />
            <Text style={styles.actionLabel}>Déplacer</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable onPress={openRename} style={styles.actionBtn}>
            <MaterialIcons name="edit" size={20} color={Colors.textPrimary} />
            <Text style={styles.actionLabel}>Renommer</Text>
          </Pressable>
          <View style={styles.divider} />
          <Pressable onPress={handleShare} style={styles.actionBtn}>
            <MaterialIcons name="email" size={20} color={Colors.textPrimary} />
            <Text style={styles.actionLabel}>Partager</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Move sheet */}
      <MovePhotoSheet
        visible={moveVisible}
        onClose={() => setMoveVisible(false)}
        currentAlbumId={currentPhoto?.albumId ?? ''}
        userId={user?.id ?? ''}
        onMove={handleMove}
      />

      {/* Rename Modal */}
      <Modal visible={renameVisible} transparent animationType="fade" onRequestClose={() => setRenameVisible(false)}>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setRenameVisible(false)} />
          <View style={[styles.renameCard, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <View style={styles.renameHandle} />
            <Text style={styles.renameTitle}>Renommer la photo</Text>
            <TextInput
              style={styles.renameInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Nom de la photo"
              placeholderTextColor={Colors.textMuted}
              autoFocus
              selectTextOnFocus
              returnKeyType="done"
              onSubmitEditing={handleRename}
              accessibilityLabel="Nom de la photo"
            />
            <View style={styles.renameActions}>
              <Pressable style={styles.renameCancel} onPress={() => setRenameVisible(false)}>
                <Text style={styles.renameCancelText}>Annuler</Text>
              </Pressable>
              <Pressable style={styles.renameConfirm} onPress={handleRename}>
                <Text style={styles.renameConfirmText}>Confirmer</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  titleBlock: { flex: 1, paddingHorizontal: Spacing.sm },
  photoName: { color: Colors.textPrimary, fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold, includeFontPadding: false },
  albumName: { color: Colors.textSecondary, fontSize: Typography.sizes.xs, includeFontPadding: false },
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: Spacing.xl, paddingTop: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: Spacing.xl,
  },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  actionLabel: { color: Colors.textPrimary, fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold, includeFontPadding: false },
  divider: { width: 1, height: 24, backgroundColor: Colors.border },
  // Rename modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  renameCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  renameHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.sm },
  renameTitle: { color: Colors.textPrimary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, includeFontPadding: false },
  renameInput: {
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: Typography.sizes.base,
  },
  renameActions: { flexDirection: 'row', gap: Spacing.md },
  renameCancel: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.surfaceCard, alignItems: 'center' },
  renameCancelText: { color: Colors.textSecondary, fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium, includeFontPadding: false },
  renameConfirm: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center' },
  renameConfirmText: { color: Colors.textPrimary, fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold, includeFontPadding: false },
});
