// Powered by OnSpace.AI — Carnet Entry (create / view / edit)
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuth } from '@/hooks/useAuth';
import { useCarnet } from '@/hooks/useCarnet';
import { useAlert } from '@/template';
import { Colors, Typography, Spacing, Radius } from '@/constants/theme';
import { Carnet, CarnetEntry, CarnetField } from '@/types';
import { getCarnets } from '@/services/storage';

const { width: SCREEN_W } = Dimensions.get('window');

export default function CarnetEntryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { carnetId, carnetName, entryId, photoUri, photoName, mode } = useLocalSearchParams<{
    carnetId: string;
    carnetName: string;
    entryId?: string;
    photoUri: string;
    photoName: string;
    mode: 'create' | 'view';
  }>();

  const { user } = useAuth();
  const { entries, addEntry, updateEntry } = useCarnet();
  const { showAlert } = useAlert();

  const [carnet, setCarnet] = useState<Carnet | null>(null);
  const [isEditing, setIsEditing] = useState(mode === 'create');

  // Form state
  const [name, setName] = useState(photoName ?? '');
  const [description, setDescription] = useState('');
  const [fieldValues, setFieldValues] = useState<{ fieldId: string; value: string }[]>([]);
  const [saving, setSaving] = useState(false);

  // Find existing entry
  const existingEntry: CarnetEntry | undefined = entries.find((e) => e.id === entryId);

  useEffect(() => {
    loadCarnet();
  }, [carnetId]);

  useEffect(() => {
    if (existingEntry) {
      setName(existingEntry.name);
      setDescription(existingEntry.description);
      setFieldValues(existingEntry.fieldValues);
    }
  }, [existingEntry?.id]);

  useEffect(() => {
    if (carnet && fieldValues.length === 0 && !existingEntry) {
      setFieldValues(carnet.fields.map((f) => ({ fieldId: f.id, value: '' })));
    }
  }, [carnet]);

  const loadCarnet = async () => {
    if (!user) return;
    const all = await getCarnets(user.id);
    const found = all.find((c) => c.id === carnetId);
    if (found) {
      setCarnet(found);
      if (!existingEntry) {
        setFieldValues(found.fields.map((f) => ({ fieldId: f.id, value: '' })));
      }
    }
  };

  const setFieldValue = useCallback((fieldId: string, value: string) => {
    setFieldValues((prev) => prev.map((fv) => (fv.fieldId === fieldId ? { ...fv, value } : fv)));
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      showAlert('Nom requis', 'Veuillez saisir un nom pour cette entrée.');
      return;
    }
    setSaving(true);
    try {
      if (existingEntry) {
        await updateEntry({ ...existingEntry, name: name.trim(), description, fieldValues });
      } else {
        await addEntry(user!.id, carnetId, photoUri, name.trim(), description, fieldValues);
      }
      setIsEditing(false);
      if (mode === 'create') router.back();
    } catch {
      showAlert('Erreur', "Impossible de sauvegarder l'entrée.");
    } finally {
      setSaving(false);
    }
  }, [name, description, fieldValues, existingEntry, user]);

  const uri = existingEntry?.uri ?? photoUri;
  const fields: CarnetField[] = carnet?.fields ?? [];

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {carnetName}
        </Text>
        {isEditing ? (
          <Pressable
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>{saving ? '...' : 'Sauvegarder'}</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.editBtn} onPress={() => setIsEditing(true)}>
            <MaterialIcons name="edit" size={20} color={Colors.textPrimary} />
          </Pressable>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Photo */}
        <Image source={{ uri }} style={styles.photo} contentFit="cover" transition={200} />

        <View style={styles.body}>
          {/* Name */}
          {isEditing ? (
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Titre de l'entrée..."
              placeholderTextColor={Colors.textMuted}
              accessibilityLabel="Nom de l'entrée"
            />
          ) : (
            <Text style={styles.entryName}>{name}</Text>
          )}

          {/* Description */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="notes" size={16} color={Colors.primary} />
              <Text style={styles.sectionTitle}>Description</Text>
            </View>
            {isEditing ? (
              <TextInput
                style={styles.descInput}
                value={description}
                onChangeText={setDescription}
                placeholder="Ajoutez une description visible..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                accessibilityLabel="Description"
              />
            ) : description ? (
              <Text style={styles.descText}>{description}</Text>
            ) : (
              <Text style={styles.emptyField}>Aucune description</Text>
            )}
          </View>

          {/* Custom fields */}
          {fields.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons name="label" size={16} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Informations</Text>
              </View>
              <View style={styles.fieldsGrid}>
                {fields.map((field) => {
                  const fv = fieldValues.find((v) => v.fieldId === field.id);
                  const value = fv?.value ?? '';
                  return (
                    <View key={field.id} style={styles.fieldCard}>
                      <Text style={styles.fieldCardLabel}>{field.label}</Text>
                      {isEditing ? (
                        <TextInput
                          style={styles.fieldCardInput}
                          value={value}
                          onChangeText={(v) => setFieldValue(field.id, v)}
                          placeholder={field.type === 'number' ? '0' : '—'}
                          placeholderTextColor={Colors.textMuted}
                          keyboardType={field.type === 'number' ? 'decimal-pad' : 'default'}
                          accessibilityLabel={field.label}
                        />
                      ) : (
                        <Text style={[styles.fieldCardValue, !value && styles.emptyField]}>
                          {value || '—'}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* Date */}
          {existingEntry ? (
            <Text style={styles.date}>
              Ajouté le{' '}
              {new Date(existingEntry.createdAt).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          ) : null}

          <View style={{ height: insets.bottom + Spacing.xl }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    includeFontPadding: false,
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
  },
  saveBtnText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    includeFontPadding: false,
  },
  editBtn: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: SCREEN_W, height: SCREEN_W * 0.75 },
  body: { padding: Spacing.lg, gap: Spacing.lg },
  nameInput: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  entryName: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.xxl,
    fontWeight: Typography.weights.bold,
    includeFontPadding: false,
  },
  section: { gap: Spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  sectionTitle: {
    color: Colors.textSecondary,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    includeFontPadding: false,
  },
  descInput: {
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    color: Colors.textPrimary,
    fontSize: Typography.sizes.base,
    minHeight: 96,
  },
  descText: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.base,
    lineHeight: 24,
    includeFontPadding: false,
  },
  emptyField: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.base,
    fontStyle: 'italic',
    includeFontPadding: false,
  },
  fieldsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  fieldCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    minWidth: '45%',
    flex: 1,
  },
  fieldCardLabel: {
    color: Colors.primary,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
    marginBottom: 4,
    includeFontPadding: false,
  },
  fieldCardInput: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 2,
  },
  fieldCardValue: {
    color: Colors.textPrimary,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    includeFontPadding: false,
  },
  date: {
    color: Colors.textMuted,
    fontSize: Typography.sizes.xs,
    textAlign: 'center',
    includeFontPadding: false,
    marginTop: Spacing.sm,
  },
});
