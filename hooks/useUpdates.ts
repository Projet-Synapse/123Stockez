// Powered by OnSpace.AI
import { useContext } from 'react';
import { UpdateContext } from '@/contexts/UpdateContext';

export function useUpdates() {
  const context = useContext(UpdateContext);
  if (!context) throw new Error('useUpdates must be used within UpdateProvider');
  return context;
}
