import { useEffect, useState } from 'react';
import {
  loadSavedCalculations, saveCalculation, saveCalculations, deleteCalculation,
  SAVED_CALCULATIONS_EVENT, SAVED_CALCULATIONS_KEY,
  type SavedCalculation, type CalculationInput,
} from '@/io/saved-calculations';

function readSnapshot(): { records: SavedCalculation[]; error: string | null } {
  try {
    return { records: loadSavedCalculations(), error: null };
  } catch (error) {
    return { records: [], error: error instanceof Error ? error.message : 'Browser storage is unavailable.' };
  }
}

export function useSavedCalculations() {
  const [snapshot, setSnapshot] = useState(readSnapshot);
  useEffect(() => {
    const refresh = () => setSnapshot(readSnapshot());
    const onStorage = (event: StorageEvent) => {
      if (event.key === SAVED_CALCULATIONS_KEY || event.key === null) refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(SAVED_CALCULATIONS_EVENT, refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(SAVED_CALCULATIONS_EVENT, refresh);
    };
  }, []);

  const save = (input: CalculationInput) => {
    saveCalculation(input);
    window.dispatchEvent(new Event(SAVED_CALCULATIONS_EVENT));
  };
  const remove = (record: SavedCalculation) => {
    deleteCalculation(record.kind, record.semester);
    window.dispatchEvent(new Event(SAVED_CALCULATIONS_EVENT));
  };
  const saveMany = (inputs: CalculationInput[]) => {
    saveCalculations(inputs);
    window.dispatchEvent(new Event(SAVED_CALCULATIONS_EVENT));
  };
  return { ...snapshot, save, saveMany, remove };
}
