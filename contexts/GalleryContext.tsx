// Powered by OnSpace.AI — Gallery Context (Supabase)
import React, { createContext, useState, useCallback, ReactNode } from 'react';
import { Group, Album, Photo } from '@/types';
import {
  getGroups,
  saveGroup,
  deleteGroup,
  getAlbums,
  getAllAlbums,
  saveAlbum,
  deleteAlbum,
  getPhotos,
  getAllPhotos,
  addPhotoToAlbum,
  updatePhoto,
  deletePhoto,
  movePhotoToAlbum,
} from '@/services/storage';
import { Colors } from '@/constants/theme';

interface GalleryContextType {
  groups: Group[];
  albums: Album[];
  photos: Photo[];
  allPhotos: Photo[];
  allAlbums: Album[];
  loadGroups: (userId: string) => Promise<void>;
  loadAlbums: (groupId: string) => Promise<void>;
  loadPhotos: (albumId: string) => Promise<void>;
  loadAllPhotos: (userId: string) => Promise<void>;
  loadAllAlbums: (userId: string) => Promise<void>;
  addGroup: (userId: string, name: string, description?: string) => Promise<Group>;
  updateGroup: (group: Group) => Promise<void>;
  removeGroup: (groupId: string, userId: string) => Promise<void>;
  addAlbum: (userId: string, groupId: string, name: string, description?: string) => Promise<Album>;
  updateAlbum: (album: Album) => Promise<void>;
  removeAlbum: (albumId: string, groupId: string) => Promise<void>;
  addPhoto: (userId: string, albumId: string, groupId: string, uri: string, name: string) => Promise<Photo>;
  renamePhoto: (photo: Photo, newName: string) => Promise<void>;
  movePhoto: (photo: Photo, targetAlbum: Album) => Promise<void>;
  movePhotos: (photos: Photo[], targetAlbum: Album) => Promise<void>;
  removePhoto: (photoId: string, albumId: string, groupId: string) => Promise<void>;
  removePhotos: (photos: { id: string; albumId: string }[]) => Promise<void>;
}

export const GalleryContext = createContext<GalleryContextType | undefined>(undefined);

export function GalleryProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [allPhotos, setAllPhotos] = useState<Photo[]>([]);
  const [allAlbums, setAllAlbums] = useState<Album[]>([]);

  const loadGroups = useCallback(async (userId: string) => {
    const data = await getGroups(userId);
    setGroups(data);
  }, []);

  const loadAlbums = useCallback(async (groupId: string) => {
    const data = await getAlbums(groupId);
    setAlbums(data);
  }, []);

  const loadPhotos = useCallback(async (albumId: string) => {
    const data = await getPhotos(albumId);
    setPhotos(data);
  }, []);

  const loadAllPhotos = useCallback(async (userId: string) => {
    const data = await getAllPhotos(userId);
    setAllPhotos(data);
  }, []);

  const loadAllAlbums = useCallback(async (userId: string) => {
    const data = await getAllAlbums(userId);
    setAllAlbums(data);
  }, []);

  const addGroup = useCallback(async (userId: string, name: string, description?: string): Promise<Group> => {
    const colorIdx = Math.floor(Math.random() * Colors.groupPalette.length);
    const newGroup: Group = {
      id: `group_${Date.now()}`,
      name,
      description,
      color: Colors.groupPalette[colorIdx],
      albumCount: 0,
      createdAt: new Date().toISOString(),
      userId,
    };
    const saved = await saveGroup(newGroup);
    setGroups((prev) => [saved, ...prev]);
    return saved;
  }, []);

  const updateGroup = useCallback(async (group: Group) => {
    const saved = await saveGroup(group);
    setGroups((prev) => prev.map((g) => (g.id === group.id ? saved : g)));
  }, []);

  const removeGroup = useCallback(async (groupId: string, _userId: string) => {
    await deleteGroup(groupId);
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    setAlbums((prev) => prev.filter((a) => a.groupId !== groupId));
    setPhotos((prev) => prev.filter((p) => p.groupId !== groupId));
    setAllPhotos((prev) => prev.filter((p) => p.groupId !== groupId));
  }, []);

  const addAlbum = useCallback(
    async (userId: string, groupId: string, name: string, description?: string): Promise<Album> => {
      const newAlbum: Album = {
        id: `album_${Date.now()}`,
        groupId,
        name,
        description,
        photoCount: 0,
        createdAt: new Date().toISOString(),
        userId,
      };
      const saved = await saveAlbum(newAlbum);
      setAlbums((prev) => [saved, ...prev]);
      setGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, albumCount: g.albumCount + 1 } : g)));
      return saved;
    },
    [],
  );

  const updateAlbum = useCallback(async (album: Album) => {
    const saved = await saveAlbum(album);
    setAlbums((prev) => prev.map((a) => (a.id === album.id ? saved : a)));
  }, []);

  const removeAlbum = useCallback(async (albumId: string, groupId: string) => {
    await deleteAlbum(albumId);
    setAlbums((prev) => prev.filter((a) => a.id !== albumId));
    setPhotos((prev) => prev.filter((p) => p.albumId !== albumId));
    setAllPhotos((prev) => prev.filter((p) => p.albumId !== albumId));
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, albumCount: Math.max(0, g.albumCount - 1) } : g)),
    );
  }, []);

  const addPhoto = useCallback(
    async (userId: string, albumId: string, groupId: string, uri: string, name: string): Promise<Photo> => {
      const photo = await addPhotoToAlbum(userId, albumId, groupId, uri, name);
      setPhotos((prev) => [photo, ...prev]);
      setAllPhotos((prev) => [photo, ...prev]);
      setAlbums((prev) =>
        prev.map((a) =>
          a.id === albumId ? { ...a, photoCount: a.photoCount + 1, coverPhoto: photo.uri } : a,
        ),
      );
      setGroups((prev) =>
        prev.map((g) => (g.id === groupId ? { ...g, coverPhoto: g.coverPhoto ?? photo.uri } : g)),
      );
      return photo;
    },
    [],
  );

  const renamePhoto = useCallback(async (photo: Photo, newName: string) => {
    const updated = { ...photo, name: newName };
    await updatePhoto(updated);
    setPhotos((prev) => prev.map((p) => (p.id === photo.id ? updated : p)));
    setAllPhotos((prev) => prev.map((p) => (p.id === photo.id ? updated : p)));
  }, []);

  // Move one or many photos to another album in a single round-trip: all storage
  // calls run in parallel and the local state (source/target album counts) is
  // reconciled with one update, instead of one request + re-render per photo.
  const movePhotos = useCallback(async (items: Photo[], targetAlbum: Album) => {
    if (items.length === 0) return;
    await Promise.all(items.map((p) => movePhotoToAlbum(p.id, targetAlbum.id, targetAlbum.groupId)));
    const ids = new Set(items.map((p) => p.id));
    const sourceDelta = new Map<string, number>();
    for (const p of items) sourceDelta.set(p.albumId, (sourceDelta.get(p.albumId) ?? 0) + 1);
    setPhotos((prev) => prev.filter((p) => !ids.has(p.id)));
    setAllPhotos((prev) =>
      prev.map((p) => (ids.has(p.id) ? { ...p, albumId: targetAlbum.id, groupId: targetAlbum.groupId } : p)),
    );
    setAlbums((prev) =>
      prev.map((a) => {
        if (a.id === targetAlbum.id) return { ...a, photoCount: a.photoCount + items.length };
        const removed = sourceDelta.get(a.id);
        return removed ? { ...a, photoCount: Math.max(0, a.photoCount - removed) } : a;
      }),
    );
  }, []);

  const movePhoto = useCallback(
    async (photo: Photo, targetAlbum: Album) => {
      await movePhotos([photo], targetAlbum);
    },
    [movePhotos],
  );

  // Delete one or many photos in a single round-trip: all storage calls run in
  // parallel and album counts are reconciled with one update.
  const removePhotos = useCallback(async (items: { id: string; albumId: string }[]) => {
    if (items.length === 0) return;
    await Promise.all(items.map((p) => deletePhoto(p.id)));
    const ids = new Set(items.map((p) => p.id));
    const albumDelta = new Map<string, number>();
    for (const p of items) albumDelta.set(p.albumId, (albumDelta.get(p.albumId) ?? 0) + 1);
    setPhotos((prev) => prev.filter((p) => !ids.has(p.id)));
    setAllPhotos((prev) => prev.filter((p) => !ids.has(p.id)));
    setAlbums((prev) =>
      prev.map((a) => {
        const removed = albumDelta.get(a.id);
        return removed ? { ...a, photoCount: Math.max(0, a.photoCount - removed) } : a;
      }),
    );
  }, []);

  const removePhoto = useCallback(
    async (photoId: string, albumId: string, _groupId: string) => {
      await removePhotos([{ id: photoId, albumId }]);
    },
    [removePhotos],
  );

  return (
    <GalleryContext.Provider
      value={{
        groups,
        albums,
        photos,
        allPhotos,
        allAlbums,
        loadGroups,
        loadAlbums,
        loadPhotos,
        loadAllPhotos,
        loadAllAlbums,
        addGroup,
        updateGroup,
        removeGroup,
        addAlbum,
        updateAlbum,
        removeAlbum,
        addPhoto,
        renamePhoto,
        movePhoto,
        movePhotos,
        removePhoto,
        removePhotos,
      }}
    >
      {children}
    </GalleryContext.Provider>
  );
}
