import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Decimal } from 'decimal.js';
import { apiService } from '../services/api';
import { socketService } from '../services/socketService';
import { useTariffStore } from './useTariffStore';
import { useToastStore } from './useToastStore';
import type { 
  FuelTopup, 
  ChartDataPoint, 
  TimeSeriesData,
  PieChartData,
  UserPreferences 
} from '../types';

// Deprecated - use useFuelStore instead

interface ElectricityState {
  // Meter readings (deprecated - use useFuelStore instead)
  readings: FuelTopup[];
  isLoading: boolean;
  error: string | null;
  
  // UI state
  isMeterPanelOpen: boolean;
  
  // User preferences
  preferences: UserPreferences;
  
  // Analytics data
  timeSeriesData: TimeSeriesData[];
  chartData: ChartDataPoint[];
  pieChartData: PieChartData[];
  
  // Actions (deprecated - use useFuelStore instead)
  addReading: (reading: Omit<FuelTopup, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateReading: (id: string, reading: Partial<FuelTopup>) => Promise<void>;
  deleteReading: (id: string) => Promise<void>;
  toggleMeterPanel: (isOpen: boolean) => void;
  toggleFirstReading: (id: string) => Promise<void>;
  generateEstimatedReadings: () => Promise<void>;
  removeEstimatedReadings: (date: Date) => Promise<void>;
  removeEstimatedReading: (id: string) => Promise<void>;
  
  // Data loading
  loadMeterReadings: () => Promise<void>;
  clearCacheAndReload: () => Promise<void>;
  
  // Real-time updates
  setupRealtimeUpdates: () => void;
  cleanupRealtimeUpdates: () => void;
  
  // Analytics actions
  calculateConsumptionData: () => void;
  calculateTimeSeriesData: (period: 'daily' | 'weekly' | 'monthly') => void;
  calculatePieChartData: () => void;
  
  // Utility functions (deprecated - use useFuelStore instead)
  getConsumptionBetweenReadings: (reading1: FuelTopup, reading2: FuelTopup) => number;
  calculateCost: (kwh: number, date?: Date, includeStandingCharge?: boolean) => number;
  calculateReadingCost: (kwh: number, date?: Date) => number;
  getTrend: (data: ChartDataPoint[]) => 'increasing' | 'decreasing' | 'stable';
  recalculateCosts: () => void;
}

const defaultPreferences: UserPreferences = {
  id: 'default',
  userId: 'default-user',
  theme: 'dark',
  currency: 'GBP',
  trackMileage: false,
  // Deprecated - fuel tracking doesn't use unitRate/standingCharge
  // unitRate: 0.30, // £0.30 per kWh
  // standingCharge: 0.50, // £0.50 per day
  notifications: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const useElectricityStore = create<ElectricityState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        readings: [],
        isLoading: false,
        error: null,
        isMeterPanelOpen: false,
        preferences: defaultPreferences,
        timeSeriesData: [],
        chartData: [],
        pieChartData: [],

        // Fuel topup actions
        addReading: async (readingData) => {
          set({ isLoading: true, error: null });
          
          // Check for duplicate topups
          const { readings: topups } = get();
          // For fuel, duplicate check is based on vehicleId and date
          const isDuplicate = topups.some(topup => 
            topup.vehicleId === (readingData as any).vehicleId &&
            topup.date.toDateString() === readingData.date.toDateString() &&
            Math.abs(topup.litres - ((readingData as any).litres || 0)) < 0.01 // Allow 0.01 L tolerance
          );
          
          if (isDuplicate) {
            set({ 
              isLoading: false, 
              error: 'A topup for this vehicle on this date already exists. Please check the topups log or use a different date.' 
            });
            return;
          }
          
          try {
            const response = await apiService.createFuelTopup({
              ...readingData,
              date: readingData.date.toISOString(),
            });

            if (!response.success || !response.data) {
              throw new Error(response.error?.message || 'Failed to create reading');
            }

            const newReading: FuelTopup = {
              ...response.data,
              date: new Date(response.data.date),
              createdAt: new Date(response.data.createdAt),
              updatedAt: new Date(response.data.updatedAt),
            };

            set((state) => {
              const exists = state.readings.some(r => r.id === newReading.id);
              const nextReadings = exists
                ? state.readings.map(r => r.id === newReading.id ? newReading : r)
                : [...state.readings, newReading];
              return {
                readings: nextReadings.sort((a, b) => 
                  new Date(a.date).getTime() - new Date(b.date).getTime()
                ),
                isLoading: false,
                error: null,
              };
            });

            // Remove any estimated readings for the same date before generating new ones
            await get().removeEstimatedReadings(readingData.date);
            
            // Generate estimated readings and recalculate analytics data
            await get().generateEstimatedReadings();
            useToastStore.getState().showToast('Reading added successfully', 'success');
          } catch (error) {
            // Fallback: Create reading locally if API fails
            console.warn('API failed, creating reading locally:', error);
            
            const newReading: FuelTopup = {
              id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              ...readingData,
              date: readingData.date,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            set((state) => {
              const nextReadings = [...state.readings, newReading];
              return {
                readings: nextReadings.sort((a, b) => 
                  new Date(a.date).getTime() - new Date(b.date).getTime()
                ),
                isLoading: false,
                error: null,
              };
            });

            // Remove any estimated readings for the same date before generating new ones
            await get().removeEstimatedReadings(readingData.date);
            
            // Generate estimated readings and recalculate analytics data
            await get().generateEstimatedReadings();
            useToastStore.getState().showToast('Reading added locally', 'success');
          }
        },

        updateReading: async (id, readingData) => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await apiService.updateFuelTopup(id, {
              ...readingData,
              date: readingData.date ? readingData.date.toISOString() : undefined,
              createdAt: readingData.createdAt ? readingData.createdAt.toISOString() : undefined,
              updatedAt: readingData.updatedAt ? readingData.updatedAt.toISOString() : undefined,
            });

            if (!response.success || !response.data) {
              throw new Error(response.error?.message || 'Failed to update reading');
            }

            const updatedReading: FuelTopup = {
              ...response.data,
              date: new Date(response.data.date),
              createdAt: new Date(response.data.createdAt),
              updatedAt: new Date(response.data.updatedAt),
            };

            set((state) => ({
              readings: state.readings
                .map((reading) => reading.id === id ? updatedReading : reading)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
              isLoading: false,
              error: null,
            }));

            // Recalculate analytics data
            get().calculateConsumptionData();
            get().calculateTimeSeriesData('daily');
            get().calculatePieChartData();
            useToastStore.getState().showToast('Reading updated successfully', 'success');
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to update reading',
            });
            useToastStore.getState().showToast('Failed to update reading', 'error');
          }
        },

        deleteReading: async (id) => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await apiService.deleteFuelTopup(id);

            if (!response.success) {
              throw new Error(response.error?.message || 'Failed to delete reading');
            }

            set((state) => ({
              readings: state.readings.filter((reading) => reading.id !== id),
              isLoading: false,
              error: null,
            }));

            // Recalculate analytics data
            get().calculateConsumptionData();
            get().calculateTimeSeriesData('daily');
            get().calculatePieChartData();
            useToastStore.getState().showToast('Reading deleted successfully', 'success');
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to delete reading',
            });
            useToastStore.getState().showToast('Failed to delete topup', 'error');
          }
        },

        toggleFirstReading: async (id) => {
          set({ isLoading: true, error: null });
          
          try {
            const { readings: topups } = get();
            const topup = topups.find(r => r.id === id);
            if (!topup) throw new Error('Topup not found');

            const newIsFirstTopup = !topup.isFirstTopup;
            
            // If setting as first topup, unset any other first topups
            if (newIsFirstTopup) {
              const otherFirstTopups = topups.filter(r => r.id !== id && r.isFirstTopup);
              for (const otherTopup of otherFirstTopups) {
                await apiService.updateFuelTopup(otherTopup.id, { isFirstTopup: false });
              }
            }

            const response = await apiService.updateFuelTopup(id, { isFirstTopup: newIsFirstTopup });

            if (!response.success || !response.data) {
              throw new Error(response.error?.message || 'Failed to update topup');
            }

            const updatedTopup: FuelTopup = {
              ...response.data,
              date: new Date(response.data.date),
              createdAt: new Date(response.data.createdAt),
              updatedAt: new Date(response.data.updatedAt),
            };

            set((state) => ({
              readings: state.readings.map((r) =>
                r.id === id ? updatedTopup : r
              ).sort((a, b) => 
                new Date(a.date).getTime() - new Date(b.date).getTime()
              ),
              isLoading: false,
              error: null,
            }));

            // Recalculate analytics data
            get().calculateConsumptionData();
            get().calculateTimeSeriesData('daily');
            get().calculatePieChartData();
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to update reading',
            });
          }
        },

        toggleMeterPanel: (isOpen) => {
          set({ isMeterPanelOpen: isOpen });
        },

        generateEstimatedReadings: async () => {
          set({ isLoading: true, error: null });
          
          try {
            const { readings } = get();
            
            // First, remove all existing estimated readings
            const manualReadings = readings.filter(r => r.type !== 'ESTIMATED');
            
            if (manualReadings.length < 1) {
              set({ isLoading: false, error: null });
              return;
            }

            // Sort manual readings by date
            const sortedManualReadings = [...manualReadings].sort((a, b) => 
              new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            const manualDateStrings = new Set(sortedManualReadings.map(r => new Date(r.date).toDateString()));

            const estimatedReadings: FuelTopup[] = [];

            // Generate estimated readings between consecutive manual readings
            for (let i = 0; i < sortedManualReadings.length - 1; i++) {
              const currentReading = sortedManualReadings[i];
              const nextReading = sortedManualReadings[i + 1];
              
              const currentDate = new Date(currentReading.date);
              const nextDate = new Date(nextReading.date);
              
              // Calculate days between readings
              const daysDiff = Math.ceil(
                (nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
              );
              
              if (daysDiff <= 1) {
                continue; // No gap to fill
              }
              
              // For fuel, consumption is litres added (not a delta)
              // Generate estimated topups for each missing day based on average
              const avgLitresPerDay = (nextReading.litres + currentReading.litres) / (daysDiff + 1);
              const currentDateToFill = new Date(currentDate);
              currentDateToFill.setDate(currentDateToFill.getDate() + 1);
              
              while (currentDateToFill < nextDate) {
                // For fuel, use average litres per day (not cumulative)
                const dailyLitres = avgLitresPerDay;
                
                const estimatedTopup: FuelTopup = {
                  id: `est-${currentDateToFill.getTime()}-${Math.random().toString(36).substr(2, 9)}`,
                  vehicleId: currentReading.vehicleId,
                  litres: Math.round(dailyLitres * 100) / 100,
                  costPerLitre: currentReading.costPerLitre,
                  totalCost: Math.round(dailyLitres * currentReading.costPerLitre * 100) / 100,
                  date: new Date(currentDateToFill),
                  type: 'ESTIMATED' as const,
                  fuelType: currentReading.fuelType,
                  notes: `Estimated topup based on average between ${currentDate.toLocaleDateString('en-GB')} and ${nextDate.toLocaleDateString('en-GB')}`,
                  isFirstTopup: false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
                
                if (!manualDateStrings.has(currentDateToFill.toDateString())) {
                  estimatedReadings.push(estimatedTopup);
                }
                currentDateToFill.setDate(currentDateToFill.getDate() + 1);
              }
            }

            // Generate forward estimates from last manual reading to yesterday (UK time)
            if (sortedManualReadings.length >= 2) {
              const lastReading = sortedManualReadings[sortedManualReadings.length - 1];
              const secondLastReading = sortedManualReadings[sortedManualReadings.length - 2];
              
              // Calculate daily average from the last interval
              const lastIntervalDays = Math.ceil(
                (new Date(lastReading.date).getTime() - new Date(secondLastReading.date).getTime()) / (1000 * 60 * 60 * 24)
              );
              // For fuel, use average litres per day
              const avgLitresPerDay = (lastReading.litres + secondLastReading.litres) / (lastIntervalDays + 1);
              
              // Get yesterday in UK timezone
              const ukNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }));
              const yesterday = new Date(ukNow);
              yesterday.setDate(yesterday.getDate() - 1);
              yesterday.setHours(0, 0, 0, 0);
              
              const lastReadingDate = new Date(lastReading.date);
              lastReadingDate.setHours(0, 0, 0, 0);
              
              // Generate estimates from day after last reading to yesterday
              const currentDateToFill = new Date(lastReadingDate);
              currentDateToFill.setDate(currentDateToFill.getDate() + 1);
              
              while (currentDateToFill <= yesterday) {
                // For fuel, use average litres per day
                const dailyLitres = avgLitresPerDay;
                const estimatedTopup: FuelTopup = {
                  id: `est-${currentDateToFill.getTime()}-${Math.random().toString(36).substr(2, 9)}`,
                  vehicleId: lastReading.vehicleId,
                  litres: Math.round((dailyLitres || avgLitresPerDay) * 100) / 100,
                  costPerLitre: lastReading.costPerLitre,
                  totalCost: Math.round((dailyLitres || avgLitresPerDay) * lastReading.costPerLitre * 100) / 100,
                  date: new Date(currentDateToFill),
                  type: 'ESTIMATED' as const,
                  fuelType: lastReading.fuelType,
                  notes: `Estimated topup based on average daily consumption (${avgLitresPerDay.toFixed(2)} L/day)`,
                  isFirstTopup: false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
                
                if (!manualDateStrings.has(currentDateToFill.toDateString())) {
                  estimatedReadings.push(estimatedTopup);
                }
                currentDateToFill.setDate(currentDateToFill.getDate() + 1);
              }
            }

            // Add estimated readings to the store
            if (estimatedReadings.length > 0) {
               set({
                 readings: [...manualReadings, ...estimatedReadings].sort((a, b) => 
                   new Date(a.date).getTime() - new Date(b.date).getTime()
                 ),
                 isLoading: false,
                 error: null,
               });

              // Recalculate analytics data
              get().calculateConsumptionData();
              get().calculateTimeSeriesData('daily');
              get().calculatePieChartData();
            } else {
              console.log('No estimated readings to add');
              set({ 
                readings: manualReadings,
                isLoading: false, 
                error: null 
              });
              
              // Still recalculate analytics data even if no estimated readings
              get().calculateConsumptionData();
              get().calculateTimeSeriesData('daily');
              get().calculatePieChartData();
            }
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to generate estimated readings',
            });
          }
        },

        removeEstimatedReadings: async (date) => {
          set({ isLoading: true, error: null });
          
          try {
            const { readings } = get();
            const targetDate = new Date(date);
            targetDate.setHours(0, 0, 0, 0);

            // Find estimated readings for the same date
            const estimatedReadingsToRemove = readings.filter(r => {
              if (r.type !== 'ESTIMATED') return false;
              const readingDate = new Date(r.date);
              readingDate.setHours(0, 0, 0, 0);
              return readingDate.getTime() === targetDate.getTime();
            });

            // Remove estimated readings from the store
            set((state) => ({
              readings: state.readings.filter(r => !estimatedReadingsToRemove.includes(r)),
              isLoading: false,
              error: null,
            }));

            // Recalculate analytics data
            get().calculateConsumptionData();
            get().calculateTimeSeriesData('daily');
            get().calculatePieChartData();
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to remove estimated readings',
            });
          }
        },

        removeEstimatedReading: async (id) => {
          set({ isLoading: true, error: null });
          
          try {
            const { readings } = get();
            const readingToRemove = readings.find(r => r.id === id);
            
            if (!readingToRemove) {
              throw new Error('Reading not found');
            }
            
            if (readingToRemove.type !== 'ESTIMATED') {
              throw new Error('Can only remove estimated readings with this function');
            }

            // Remove the specific estimated reading from the store
            set((state) => ({
              readings: state.readings.filter(r => r.id !== id),
              isLoading: false,
              error: null,
            }));

            // After removing an estimated reading, regenerate all estimated readings
            // to ensure consistency and fill any gaps that might have been created
            await get().generateEstimatedReadings();
            
            // Recalculate analytics data
            get().calculateConsumptionData();
            get().calculateTimeSeriesData('daily');
            get().calculatePieChartData();
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to remove estimated reading',
            });
          }
        },

        // Data loading actions
        loadMeterReadings: async () => {
          console.log('Loading fuel topups...');
          set({ isLoading: true, error: null });
          
          try {
            const response = await apiService.getFuelTopups();
            console.log('API response:', response);

            if (!response.success || !response.data) {
              throw new Error(response.error?.message || 'Failed to load fuel topups');
            }

            const readings: FuelTopup[] = response.data.map(reading => ({
              ...reading,
              date: new Date(reading.date),
              createdAt: new Date(reading.createdAt),
              updatedAt: new Date(reading.updatedAt),
            }));

            const sortedReadings = readings.sort((a, b) => 
              new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            
            console.log('Setting topups in store:', sortedReadings.length);
            set({
              readings: sortedReadings,
              isLoading: false,
              error: null,
            });

            // Regenerate estimated topups to ensure continuity
            await get().generateEstimatedReadings();
            
            // Always recalculate analytics data after loading topups
            get().calculateConsumptionData();
            get().calculateTimeSeriesData('daily');
            get().calculatePieChartData();
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to load fuel topups',
            });
          }
        },

        clearCacheAndReload: async () => {
          console.log('Clearing cache and reloading data...');
          // Clear the current topups to force fresh data load
          set({ readings: [], chartData: [], timeSeriesData: [], pieChartData: [] });
          // Load fresh data from API
          await get().loadMeterReadings();
        },

        // Real-time updates
        setupRealtimeUpdates: () => {
          console.log('Setting up real-time updates...');
          try {
            socketService.connect();
          } catch (error) {
            console.warn('Socket connection failed, continuing without real-time updates:', error);
            return;
          }

          const onAdded = (reading: FuelTopup) => {
            const newReading: FuelTopup = {
              ...reading,
              date: new Date(reading.date),
              createdAt: new Date(reading.createdAt),
              updatedAt: new Date(reading.updatedAt),
            };

            set((state) => {
              const exists = state.readings.some(r => r.id === newReading.id);
              const nextReadings = exists
                ? state.readings.map(r => r.id === newReading.id ? newReading : r)
                : [...state.readings, newReading];
              return {
                readings: nextReadings.sort((a, b) => 
                  new Date(a.date).getTime() - new Date(b.date).getTime()
                ),
              };
            });

            // Recalculate analytics data
            get().calculateConsumptionData();
            get().calculateTimeSeriesData('daily');
            get().calculatePieChartData();
          };

          const onUpdated = (reading: FuelTopup) => {
            const updatedReading: FuelTopup = {
              ...reading,
              date: new Date(reading.date),
              createdAt: new Date(reading.createdAt),
              updatedAt: new Date(reading.updatedAt),
            };

            set((state) => ({
              readings: state.readings
                .map((r) => r.id === reading.id ? updatedReading : r)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
            }));

            // Recalculate analytics data
            get().calculateConsumptionData();
            get().calculateTimeSeriesData('daily');
            get().calculatePieChartData();
          };

          const onDeleted = ({ id }: { id: string }) => {
            set((state) => ({
              readings: state.readings.filter((topup) => topup.id !== id),
            }));

            // Recalculate analytics data
            get().calculateConsumptionData();
            get().calculateTimeSeriesData('daily');
            get().calculatePieChartData();
          };

           socketService.onFuelTopupAdded((topup) => {
             const fuelTopup: FuelTopup = {
               ...topup,
               date: new Date(topup.date),
               createdAt: new Date(topup.createdAt),
               updatedAt: new Date(topup.updatedAt),
             };
             onAdded(fuelTopup);
           });
           socketService.onFuelTopupUpdated((topup) => {
             const fuelTopup: FuelTopup = {
               ...topup,
               date: new Date(topup.date),
               createdAt: new Date(topup.createdAt),
               updatedAt: new Date(topup.updatedAt),
             };
             onUpdated(fuelTopup);
           });
          socketService.onFuelTopupDeleted(onDeleted);

          (window as any).__fuelHandlers = { onAdded, onUpdated, onDeleted };
        },

        cleanupRealtimeUpdates: () => {
          const handlers = (window as any).__fuelHandlers;
          if (handlers) {
            socketService.offFuelTopupAdded(handlers.onAdded);
            socketService.offFuelTopupUpdated(handlers.onUpdated);
            socketService.offFuelTopupDeleted(handlers.onDeleted);
            delete (window as any).__fuelHandlers;
          }
          socketService.disconnect();
        },

        // Analytics calculations
        calculateConsumptionData: () => {
          const { readings } = get();
          
          // Handle edge cases: no readings or single reading
          if (readings.length === 0) {
            set({ chartData: [] });
            return;
          }
          
          if (readings.length === 1) {
            const singleReading = readings[0];
            if (singleReading.isFirstTopup) {
              set({ 
                chartData: [{
                  date: singleReading.date.toISOString().split('T')[0],
                  litres: 0,
                  cost: 0,
                  label: '0.00 L',
                }]
              });
            } else {
              // Single reading that's not first reading - no consumption to calculate
              set({ chartData: [] });
            }
            return;
          }

          // Explicitly sort readings by date to ensure chronological order
          // This is critical for proper consumption calculation, especially with estimated readings
          const sortedReadings = [...readings].sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );

          // Validate readings have valid dates
          const invalidReadings = sortedReadings.filter(r => !r.date || isNaN(new Date(r.date).getTime()));
          if (invalidReadings.length > 0 && process.env.NODE_ENV === 'development') {
            console.warn('Found readings with invalid dates:', invalidReadings);
          }

          const chartData: ChartDataPoint[] = [];
          
          // Handle first reading - show 0 consumption on the first day
          const firstReading = sortedReadings[0];
          
          if (firstReading && firstReading.isFirstTopup) {
            chartData.push({
              date: firstReading.date.toISOString().split('T')[0],
              litres: 0,
              cost: 0,
              label: '0.00 L',
            });
          }
          
          // Calculate consumption for all other readings (including estimated readings)
          // This ensures every reading date gets a chart data point
          for (let i = 1; i < sortedReadings.length; i++) {
            const prevReading = sortedReadings[i - 1];
            const currentReading = sortedReadings[i];
            
            // Validate readings have valid data
            if (!prevReading || !currentReading) {
              if (process.env.NODE_ENV === 'development') {
                console.warn('Skipping invalid reading pair:', { prevReading, currentReading });
              }
              continue;
            }
            
            // Skip if current reading is marked as first topup (already handled above)
            if (currentReading.isFirstTopup) {
              continue;
            }
            
            const consumption = get().getConsumptionBetweenReadings(prevReading, currentReading);
            
            // Ensure consumption is non-negative (handle edge cases like meter resets)
            // Negative consumption can occur if meter was reset or reading error
            const validConsumption = Math.max(0, consumption);
            
            // Log warning in development if negative consumption detected (potential data issue)
            if (consumption < 0 && process.env.NODE_ENV === 'development') {
              console.warn(
                `Negative consumption detected between readings:`,
                `Previous: ${prevReading.date.toISOString().split('T')[0]} (${prevReading.litres} L),`,
                `Current: ${currentReading.date.toISOString().split('T')[0]} (${currentReading.litres} L),`,
                `Consumption: ${consumption.toFixed(2)} L.`,
                `This may indicate a meter reset or data error.`
              );
            }
            
            const cost = get().calculateReadingCost(validConsumption, currentReading.date);
            
            // Create chart data point for this reading date
            // This includes estimated readings, ensuring they appear in charts
            chartData.push({
              date: currentReading.date.toISOString().split('T')[0],
              litres: validConsumption,
              cost: cost,
              label: `${validConsumption.toFixed(2)} L`,
            });
          }

          set({ chartData });
        },

        calculateTimeSeriesData: (period) => {
          const { chartData } = get();
          
          if (chartData.length === 0) {
            set({ timeSeriesData: [] });
            return;
          }

          // Group data by period
          const groupedData = new Map<string, ChartDataPoint[]>();
          
          chartData.forEach((point) => {
            const date = new Date(point.date);
            let key: string;
            
            switch (period) {
              case 'daily': {
                key = date.toISOString().split('T')[0];
                break;
              }
              case 'weekly': {
                // Use Monday as week start (ISO 8601 standard)
                const weekStart = new Date(date);
                const day = weekStart.getDay();
                const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
                weekStart.setDate(diff);
                key = weekStart.toISOString().split('T')[0];
                break;
              }
              case 'monthly': {
                key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                break;
              }
            }
            
            if (!groupedData.has(key)) {
              groupedData.set(key, []);
            }
            groupedData.get(key)!.push(point);
          });

          const timeSeriesData: TimeSeriesData[] = Array.from(groupedData.entries()).map(([period, data]) => {
            const totalLitres = data.reduce((sum, point) => sum + point.litres, 0);
            const totalCost = data.reduce((sum, point) => sum + point.cost, 0);
            const averageDaily = totalLitres / data.length;
            const trend = get().getTrend(data);

            return {
              period,
              data,
              totalLitres,
              totalCost,
              averageDaily,
              trend,
            };
          });

          set({ timeSeriesData });
        },

        calculatePieChartData: () => {
          const { timeSeriesData } = get();
          
          if (timeSeriesData.length === 0) {
            set({ pieChartData: [] });
            return;
          }

          // Calculate consumption by time of day (mock data for now)
          const pieChartData: PieChartData[] = [
            { name: 'Morning (6-12)', value: 25, color: '#8b5cf6', percentage: 25 },
            { name: 'Afternoon (12-18)', value: 30, color: '#06b6d4', percentage: 30 },
            { name: 'Evening (18-24)', value: 35, color: '#10b981', percentage: 35 },
            { name: 'Night (0-6)', value: 10, color: '#f59e0b', percentage: 10 },
          ];

          set({ pieChartData });
        },

        // Utility functions
        getConsumptionBetweenReadings: (_reading1: FuelTopup, reading2: FuelTopup) => {
          // For fuel, consumption is simply the litres added in the topup
          // Skip if reading2 is marked as first reading
          if (reading2.isFirstTopup) {
            return 0;
          }
          // Return the litres added in this topup
          return reading2.litres;
        },

        calculateCost: (litres, date?: Date, includeStandingCharge: boolean = false) => {
          // Deprecated: For fuel tracking, cost is already calculated (litres * costPerLitre)
          // This function is kept for backward compatibility but returns 0 for fuel
          const tariffStore = useTariffStore.getState();
          const tariff = tariffStore.getTariffForDate(date || new Date());
          
          if (tariff) {
            // Calculate cost using tariff: litres * unitRate (convert pence to pounds)
            // Note: This is legacy code for electricity tracking
            const unitCost = new Decimal(litres).times(tariff.unitRate).dividedBy(100);
            
            // Only add standing charge if explicitly requested (for total bills, not individual readings)
            if (includeStandingCharge) {
              const standingCost = new Decimal(tariff.standingCharge).dividedBy(100); // Convert pence to pounds per day
              return unitCost.plus(standingCost).toNumber();
            }
            
            return unitCost.toNumber();
          }
          
          // Fallback: For fuel, cost is already calculated (litres * costPerLitre)
          // This function is deprecated for fuel tracking
          return 0;
        },

        calculateReadingCost: (_litres: number, _date?: Date) => {
          // For fuel, cost is already calculated (litres * costPerLitre)
          // This function is deprecated for fuel tracking
          return 0;
        },

        recalculateCosts: () => {
          // Recalculate all costs using updated tariffs
          get().calculateConsumptionData();
          get().calculateTimeSeriesData('daily');
          get().calculatePieChartData();
        },

        getTrend: (data) => {
          if (data.length < 2) return 'stable';
          
          const firstHalf = data.slice(0, Math.floor(data.length / 2));
          const secondHalf = data.slice(Math.floor(data.length / 2));
          
          const firstAvg = firstHalf.reduce((sum, point) => sum + point.litres, 0) / firstHalf.length;
          const secondAvg = secondHalf.reduce((sum, point) => sum + point.litres, 0) / secondHalf.length;
          
          const difference = secondAvg - firstAvg;
          const threshold = firstAvg * 0.05; // 5% threshold
          
          if (difference > threshold) return 'increasing';
          if (difference < -threshold) return 'decreasing';
          return 'stable';
        },
      }),
      {
        name: 'electricity-tracker-storage',
        partialize: (state) => ({
          readings: state.readings,
          preferences: state.preferences,
        }),
      }
    ),
    {
      name: 'electricity-store',
    }
  )
);
