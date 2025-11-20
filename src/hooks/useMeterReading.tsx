import React, { useState, useCallback } from 'react';
import type { FuelTopup } from '../types';

// Deprecated - use useFuelStore instead
type MeterReading = FuelTopup;
interface MeterReadingState {
  readings: MeterReading[];
  isLoading: boolean;
  error: string | null;
  selectedReading: MeterReading | null;
  isPanelOpen: boolean;
}
import {
  MeterReadingContext,
  type MeterReadingContextType,
} from './useMeterReadingContext';

interface MeterReadingProviderProps {
  children: React.ReactNode;
}

export const MeterReadingProvider: React.FC<MeterReadingProviderProps> = ({
  children,
}) => {
  const [state, setState] = useState<MeterReadingState>({
    readings: [],
    isLoading: false,
    error: null,
    selectedReading: null,
    isPanelOpen: false,
  });

  const addReading = useCallback(
    async (
      readingData: Omit<MeterReading, 'id' | 'createdAt' | 'updatedAt'>
    ) => {
      setState((prev: MeterReadingState) => ({ ...prev, isLoading: true, error: null }));

      try {
        // TODO: Implement actual API call
        const newReading: MeterReading = {
          ...readingData,
          id: crypto.randomUUID(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        setState((prev: MeterReadingState) => ({
          ...prev,
          readings: [...prev.readings, newReading],
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        setState((prev: MeterReadingState) => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof Error ? error.message : 'Failed to add reading',
        }));
      }
    },
    []
  );

  const updateReading = useCallback(
    async (id: string, readingData: Partial<MeterReading>) => {
      setState((prev: MeterReadingState) => ({ ...prev, isLoading: true, error: null }));

      try {
        // TODO: Implement actual API call
        setState((prev: MeterReadingState) => ({
          ...prev,
          readings: prev.readings.map((reading: MeterReading) =>
            reading.id === id
              ? { ...reading, ...readingData, updatedAt: new Date() }
              : reading
          ),
          isLoading: false,
          error: null,
        }));
      } catch (error) {
        setState((prev: MeterReadingState) => ({
          ...prev,
          isLoading: false,
          error:
            error instanceof Error ? error.message : 'Failed to update reading',
        }));
      }
    },
    []
  );

  const deleteReading = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // TODO: Implement actual API call
      setState((prev: MeterReadingState) => ({
        ...prev,
        readings: prev.readings.filter((reading: MeterReading) => reading.id !== id),
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      setState((prev: MeterReadingState) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error ? error.message : 'Failed to delete reading',
      }));
    }
  }, []);

  const togglePanel = useCallback((isOpen: boolean) => {
    setState((prev: MeterReadingState) => ({ ...prev, isPanelOpen: isOpen }));
  }, []);

  const value: MeterReadingContextType = {
    ...state,
    addReading,
    updateReading,
    deleteReading,
    togglePanel,
  };

  return (
    <MeterReadingContext.Provider value={value}>
      {children}
    </MeterReadingContext.Provider>
  );
};
