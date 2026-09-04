// Powered by OnSpace.AI
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Photo } from '@/types';
import { Radius } from '@/constants/theme';

interface PhotoThumbnailProps {
  photo: Photo;
  size: number;
  onPress: () => void;
  onLongPress?: () => void;
}

export const PhotoThumbnail = React.memo(({ photo, size, onPress, onLongPress }: PhotoThumbnailProps) => {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
    >
      <Image
        source={{ uri: photo.uri }}
        style={[styles.image, { width: size, height: size }]}
        contentFit="cover"
        transition={200}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  image: { borderRadius: Radius.sm },
});

PhotoThumbnail.displayName = 'PhotoThumbnail';
