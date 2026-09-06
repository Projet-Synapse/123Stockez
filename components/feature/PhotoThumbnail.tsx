// Powered by OnSpace.AI
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Photo } from '@/types';
import { Colors, Radius } from '@/constants/theme';

interface PhotoThumbnailProps {
  photo: Photo;
  size: number;
  onPress: () => void;
  onLongPress?: () => void;
  selected?: boolean;
  selectionMode?: boolean;
}

export const PhotoThumbnail = React.memo(
  ({ photo, size, onPress, onLongPress, selected = false, selectionMode = false }: PhotoThumbnailProps) => {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
        accessibilityRole="button"
        accessibilityState={selectionMode ? { selected } : undefined}
      >
        <Image
          source={{ uri: photo.uri }}
          style={[styles.image, { width: size, height: size }, selected && styles.imageSelected]}
          contentFit="cover"
          transition={200}
        />
        {selectionMode ? (
          <View style={[styles.checkWrap, selected && styles.checkWrapSelected]}>
            {selected ? <MaterialIcons name="check" size={14} color={Colors.textInverse} /> : null}
          </View>
        ) : null}
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  image: { borderRadius: Radius.sm },
  imageSelected: { opacity: 0.6 },
  checkWrap: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.textPrimary,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkWrapSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
});

PhotoThumbnail.displayName = 'PhotoThumbnail';
