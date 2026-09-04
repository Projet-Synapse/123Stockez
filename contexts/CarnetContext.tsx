// Powered by OnSpace.AI — Carnet Context (Supabase)
import React, { createContext, useState, useCallback, ReactNode } from 'react';
import { Carnet, CarnetEntry, CarnetField } from '@/types';
import {
  getCarnets,
  saveCarnet,
  deleteCarnet,
  getCarnetEntries,
  saveCarnetEntry,
  deleteCarnetEntry,
} from '@/services/storage';

interface CarnetContextType {
  carnets: Carnet[];
  entries: CarnetEntry[];
  loadCarnets: (userId: string) => Promise<void>;
  loadEntries: (carnetId: string) => Promise<void>;
  addCarnet: (
    userId: string,
    name: string,
    emoji: string,
    description: string,
    fields: CarnetField[],
  ) => Promise<Carnet>;
  updateCarnet: (carnet: Carnet) => Promise<void>;
  removeCarnet: (carnetId: string, userId: string) => Promise<void>;
  addEntry: (
    userId: string,
    carnetId: string,
    uri: string,
    name: string,
    description: string,
    fieldValues: { fieldId: string; value: string }[],
  ) => Promise<CarnetEntry>;
  updateEntry: (entry: CarnetEntry) => Promise<void>;
  removeEntry: (entryId: string, carnetId: string) => Promise<void>;
}

export const CarnetContext = createContext<CarnetContextType | undefined>(undefined);

export function CarnetProvider({ children }: { children: ReactNode }) {
  const [carnets, setCarnets] = useState<Carnet[]>([]);
  const [entries, setEntries] = useState<CarnetEntry[]>([]);

  const loadCarnets = useCallback(async (userId: string) => {
    const data = await getCarnets(userId);
    setCarnets(data);
  }, []);

  const loadEntries = useCallback(async (carnetId: string) => {
    const data = await getCarnetEntries(carnetId);
    setEntries(data);
  }, []);

  const addCarnet = useCallback(
    async (
      userId: string,
      name: string,
      emoji: string,
      description: string,
      fields: CarnetField[],
    ): Promise<Carnet> => {
      const draft: Carnet = {
        id: `carnet_${Date.now()}`,
        userId,
        name,
        emoji,
        description,
        fields,
        entryCount: 0,
        createdAt: new Date().toISOString(),
      };
      const saved = await saveCarnet(draft);
      setCarnets((prev) => [saved, ...prev]);
      return saved;
    },
    [],
  );

  const updateCarnet = useCallback(async (carnet: Carnet) => {
    const saved = await saveCarnet(carnet);
    setCarnets((prev) => prev.map((c) => (c.id === carnet.id ? saved : c)));
  }, []);

  const removeCarnet = useCallback(async (carnetId: string, _userId: string) => {
    await deleteCarnet(carnetId);
    setCarnets((prev) => prev.filter((c) => c.id !== carnetId));
    setEntries((prev) => prev.filter((e) => e.carnetId !== carnetId));
  }, []);

  const addEntry = useCallback(
    async (
      userId: string,
      carnetId: string,
      uri: string,
      name: string,
      description: string,
      fieldValues: { fieldId: string; value: string }[],
    ): Promise<CarnetEntry> => {
      const draft: CarnetEntry = {
        id: `entry_${Date.now()}`,
        carnetId,
        userId,
        uri,
        name,
        description,
        fieldValues,
        createdAt: new Date().toISOString(),
      };
      const saved = await saveCarnetEntry(draft);
      setEntries((prev) => [saved, ...prev]);
      setCarnets((prev) =>
        prev.map((c) =>
          c.id === carnetId
            ? { ...c, entryCount: c.entryCount + 1, coverPhoto: c.coverPhoto ?? saved.uri }
            : c,
        ),
      );
      return saved;
    },
    [],
  );

  const updateEntry = useCallback(async (entry: CarnetEntry) => {
    const saved = await saveCarnetEntry(entry);
    setEntries((prev) => prev.map((e) => (e.id === entry.id ? saved : e)));
  }, []);

  const removeEntry = useCallback(async (entryId: string, carnetId: string) => {
    await deleteCarnetEntry(entryId);
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
    setCarnets((prev) =>
      prev.map((c) => (c.id === carnetId ? { ...c, entryCount: Math.max(0, c.entryCount - 1) } : c)),
    );
  }, []);

  return (
    <CarnetContext.Provider
      value={{
        carnets,
        entries,
        loadCarnets,
        loadEntries,
        addCarnet,
        updateCarnet,
        removeCarnet,
        addEntry,
        updateEntry,
        removeEntry,
      }}
    >
      {children}
    </CarnetContext.Provider>
  );
}
