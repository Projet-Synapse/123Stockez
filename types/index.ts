// Powered by OnSpace.AI
export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  color: string;
  coverPhoto?: string;
  albumCount: number;
  createdAt: string;
  userId: string;
}

export interface Album {
  id: string;
  groupId: string;
  name: string;
  description?: string;
  coverPhoto?: string;
  photoCount: number;
  createdAt: string;
  userId: string;
}

// ── Carnet ──────────────────────────────────────────────────────────────────
export interface CarnetField {
  id: string;
  label: string;
  type: 'text' | 'number';
}

export interface Carnet {
  id: string;
  userId: string;
  name: string;
  description?: string;
  emoji: string;
  fields: CarnetField[];
  entryCount: number;
  coverPhoto?: string;
  createdAt: string;
}

export interface Photo {
  id: string;
  albumId: string;
  groupId: string;
  uri: string;
  storagePath?: string;
  name: string;
  caption?: string;
  createdAt: string;
  userId: string;
}

export interface CarnetEntry {
  id: string;
  carnetId: string;
  userId: string;
  uri: string;
  storagePath?: string;
  name: string;
  description: string;
  fieldValues: { fieldId: string; value: string }[];
  createdAt: string;
}
