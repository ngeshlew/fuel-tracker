import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { Decimal } from 'decimal.js';
import { apiService } from '../services/api';
import { socketService } from '../services/socketService';
import { useToastStore } from './useToastStore';
import type { 
  FuelTopup, 
  ChartDataPoint, 
  TimeSeriesData,
  PieChartData,
  UserPreferences 
} from '../types';

interface FuelState {
  // Fuel topups
  topups: FuelTopup[];
  isLoading: boolean;
  error: string | null;
  
  // UI state
  isTopupPanelOpen: boolean;
  
  // User preferences
  preferences: UserPreferences;
  
  // Analytics data
  timeSeriesData: TimeSeriesData[];
  chartData: ChartDataPoint[];
  pieChartData: PieChartData[];
  
  // Actions
  addTopup: (topup: Omit<FuelTopup, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTopup: (id: string, topup: Partial<FuelTopup>) => Promise<void>;
  deleteTopup: (id: string) => Promise<void>;
  toggleTopupPanel: (isOpen: boolean) => void;
  toggleFirstTopup: (id: string) => Promise<void>;
  generateEstimatedTopups: () => Promise<void>;
  removeEstimatedTopups: (date: Date) => Promise<void>;
  removeEstimatedTopup: (id: string) => Promise<void>;
  
  // Data loading
  loadFuelTopups: () => Promise<void>;
  clearCacheAndReload: () => Promise<void>;
  
  // Real-time updates
  setupRealtimeUpdates: () => void;
  cleanupRealtimeUpdates: () => void;
  
  // Analytics actions
  calculateConsumptionData: () => void;
  calculateTimeSeriesData: (period: 'daily' | 'weekly' | 'monthly') => void;
  calculatePieChartData: () => void;
  
  // Utility functions
  getConsumptionBetweenTopups: (topup1: FuelTopup, topup2: FuelTopup) => number;
  calculateEfficiency: (topup1: FuelTopup, topup2: FuelTopup) => number | null; // Returns miles per litre or null if mileage not tracked
  getTrend: (data: ChartDataPoint[]) => 'increasing' | 'decreasing' | 'stable';
  recalculateAnalytics: () => void;
}

const defaultPreferences: UserPreferences = {
  id: 'default',
  userId: 'default-user',
  theme: 'dark',
  currency: 'GBP',
  defaultFuelType: 'PETROL',
  trackMileage: false,
  notifications: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

export const useFuelStore = create<FuelState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        topups: [],
        isLoading: false,
        error: null,
        isTopupPanelOpen: false,
        preferences: defaultPreferences,
        timeSeriesData: [],
        chartData: [],
        pieChartData: [],

        // Fuel topup actions
        addTopup: async (topupData) => {
          set({ isLoading: true, error: null });
          
          // Calculate totalCost if not provided
          const totalCost = topupData.totalCost ?? (topupData.litres * topupData.costPerLitre);
          
          // Check for duplicate topups
          const { topups } = get();
          const isDuplicate = topups.some(topup => 
            topup.vehicleId === topupData.vehicleId &&
            topup.date.toDateString() === topupData.date.toDateString() &&
            Math.abs(topup.litres - topupData.litres) < 0.01 // Allow 0.01 litre tolerance
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
              ...topupData,
              totalCost,
              date: topupData.date.toISOString(),
            });

            if (!response.success || !response.data) {
              throw new Error(response.error?.message || 'Failed to create topup');
            }

            const newTopup: FuelTopup = {
              ...response.data,
              date: new Date(response.data.date),
              createdAt: new Date(response.data.createdAt),
              updatedAt: new Date(response.data.updatedAt),
            };

            set((state) => {
              const exists = state.topups.some(t => t.id === newTopup.id);
              const nextTopups = exists
                ? state.topups.map(t => t.id === newTopup.id ? newTopup : t)
                : [...state.topups, newTopup];
              return {
                topups: nextTopups.sort((a, b) => 
                  new Date(a.date).getTime() - new Date(b.date).getTime()
                ),
                isLoading: false,
                error: null,
              };
            });

            // Remove any estimated topups for the same date before generating new ones
            await get().removeEstimatedTopups(topupData.date);
            
            // Generate estimated topups and recalculate analytics data
            await get().generateEstimatedTopups();
            useToastStore.getState().showToast('Topup added successfully', 'success');
          } catch (error) {
            // Fallback: Create topup locally if API fails
            console.warn('API failed, creating topup locally:', error);
            
            const newTopup: FuelTopup = {
              id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              ...topupData,
              totalCost,
              date: topupData.date,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            set((state) => {
              const nextTopups = [...state.topups, newTopup];
              return {
                topups: nextTopups.sort((a, b) => 
                  new Date(a.date).getTime() - new Date(b.date).getTime()
                ),
                isLoading: false,
                error: null,
              };
            });

            // Remove any estimated topups for the same date before generating new ones
            await get().removeEstimatedTopups(topupData.date);
            
            // Generate estimated topups and recalculate analytics data
            await get().generateEstimatedTopups();
            useToastStore.getState().showToast('Topup added locally', 'success');
          }
        },

        updateTopup: async (id, topupData) => {
          set({ isLoading: true, error: null });
          
          // Calculate totalCost if litres or costPerLitre changed
          let updatedData = { ...topupData };
          if (topupData.litres !== undefined || topupData.costPerLitre !== undefined) {
            const existingTopup = get().topups.find(t => t.id === id);
            const litres = topupData.litres ?? existingTopup?.litres ?? 0;
            const costPerLitre = topupData.costPerLitre ?? existingTopup?.costPerLitre ?? 0;
            updatedData.totalCost = litres * costPerLitre;
          }
          
          try {
            const response = await apiService.updateFuelTopup(id, {
              ...updatedData,
              date: updatedData.date ? updatedData.date.toISOString() : undefined,
              createdAt: updatedData.createdAt ? updatedData.createdAt.toISOString() : undefined,
              updatedAt: updatedData.updatedAt ? updatedData.updatedAt.toISOString() : undefined,
            });

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
              topups: state.topups
                .map((topup) => topup.id === id ? updatedTopup : topup)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
              isLoading: false,
              error: null,
            }));

            // Recalculate analytics data
            get().calculateConsumptionData();
            get().calculateTimeSeriesData('daily');
            get().calculatePieChartData();
            useToastStore.getState().showToast('Topup updated successfully', 'success');
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to update topup',
            });
            useToastStore.getState().showToast('Failed to update topup', 'error');
          }
        },

        deleteTopup: async (id) => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await apiService.deleteFuelTopup(id);

            if (!response.success) {
              throw new Error(response.error?.message || 'Failed to delete topup');
            }

            set((state) => ({
              topups: state.topups.filter((topup) => topup.id !== id),
              isLoading: false,
              error: null,
            }));

            // Recalculate analytics data
            get().calculateConsumptionData();
            get().calculateTimeSeriesData('daily');
            get().calculatePieChartData();
            useToastStore.getState().showToast('Topup deleted successfully', 'success');
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to delete topup',
            });
            useToastStore.getState().showToast('Failed to delete topup', 'error');
          }
        },

        toggleFirstTopup: async (id) => {
          set({ isLoading: true, error: null });
          
          try {
            const { topups } = get();
            const topup = topups.find(t => t.id === id);
            if (!topup) throw new Error('Topup not found');

            const newIsFirstTopup = !topup.isFirstTopup;
            
            // If setting as first topup, unset any other first topups
            if (newIsFirstTopup) {
              const otherFirstTopups = topups.filter(t => t.id !== id && t.isFirstTopup);
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
              topups: state.topups.map((t) =>
                t.id === id ? updatedTopup : t
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
              error: error instanceof Error ? error.message : 'Failed to update topup',
            });
          }
        },

        toggleTopupPanel: (isOpen) => {
          set({ isTopupPanelOpen: isOpen });
        },

        generateEstimatedTopups: async () => {
          set({ isLoading: true, error: null });
          
          try {
            const { topups } = get();
            
            // First, remove all existing estimated topups
            const manualTopups = topups.filter(t => t.type !== 'ESTIMATED');
            
            if (manualTopups.length < 1) {
              set({ isLoading: false, error: null });
              return;
            }

            // Sort manual topups by date
            const sortedManualTopups = [...manualTopups].sort((a, b) => 
              new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            const manualDateStrings = new Set(sortedManualTopups.map(t => new Date(t.date).toDateString()));

            const estimatedTopups: FuelTopup[] = [];

            // Generate estimated topups between consecutive manual topups
            // For fuel, we estimate based on average daily consumption
            for (let i = 0; i < sortedManualTopups.length - 1; i++) {
              const currentTopup = sortedManualTopups[i];
              const nextTopup = sortedManualTopups[i + 1];
              
              const currentDate = new Date(currentTopup.date);
              const nextDate = new Date(nextTopup.date);
              
              // Calculate days between topups
              const daysDiff = Math.ceil(
                (nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
              );
              
              if (daysDiff <= 1) {
                continue; // No gap to fill
              }
              
              // Calculate consumption between topups (litres consumed)
              // For fuel, consumption is the litres added in the next topup
              const consumption = nextTopup.litres;
              const dailyAverage = consumption / daysDiff;
              
              // Generate estimated topups for each missing day
              // Use average cost per litre from current topup
              const avgCostPerLitre = currentTopup.costPerLitre;
              let accumulatedLitres = 0;
              const currentDateToFill = new Date(currentDate);
              currentDateToFill.setDate(currentDateToFill.getDate() + 1);
              
              while (currentDateToFill < nextDate) {
                accumulatedLitres += dailyAverage;
                
                const estimatedTopup: FuelTopup = {
                  id: `est-${currentDateToFill.getTime()}-${Math.random().toString(36).substr(2, 9)}`,
                  vehicleId: currentTopup.vehicleId,
                  litres: Math.round(accumulatedLitres * 100) / 100,
                  costPerLitre: avgCostPerLitre,
                  totalCost: Math.round(accumulatedLitres * avgCostPerLitre * 100) / 100,
                  date: new Date(currentDateToFill),
                  type: 'ESTIMATED' as const,
                  fuelType: currentTopup.fuelType,
                  notes: `Estimated topup based on consumption between ${currentDate.toLocaleDateString('en-GB')} and ${nextDate.toLocaleDateString('en-GB')}`,
                  isFirstTopup: false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
                
                if (!manualDateStrings.has(currentDateToFill.toDateString())) {
                  estimatedTopups.push(estimatedTopup);
                }
                currentDateToFill.setDate(currentDateToFill.getDate() + 1);
              }
            }

            // Generate forward estimates from last manual topup to yesterday (UK time)
            if (sortedManualTopups.length >= 2) {
              const lastTopup = sortedManualTopups[sortedManualTopups.length - 1];
              const secondLastTopup = sortedManualTopups[sortedManualTopups.length - 2];
              
              // Calculate daily average from the last interval
              const lastIntervalDays = Math.ceil(
                (new Date(lastTopup.date).getTime() - new Date(secondLastTopup.date).getTime()) / (1000 * 60 * 60 * 24)
              );
              const lastIntervalConsumption = lastTopup.litres; // Litres consumed since previous topup
              const dailyAverage = lastIntervalConsumption / lastIntervalDays;
              
              // Get yesterday in UK timezone
              const ukNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/London' }));
              const yesterday = new Date(ukNow);
              yesterday.setDate(yesterday.getDate() - 1);
              yesterday.setHours(0, 0, 0, 0);
              
              const lastTopupDate = new Date(lastTopup.date);
              lastTopupDate.setHours(0, 0, 0, 0);
              
              // Generate estimates from day after last topup to yesterday
              let accumulatedLitres = 0;
              const currentDateToFill = new Date(lastTopupDate);
              currentDateToFill.setDate(currentDateToFill.getDate() + 1);
              
              while (currentDateToFill <= yesterday) {
                accumulatedLitres += dailyAverage;
                
                const estimatedTopup: FuelTopup = {
                  id: `est-${currentDateToFill.getTime()}-${Math.random().toString(36).substr(2, 9)}`,
                  vehicleId: lastTopup.vehicleId,
                  litres: Math.round(accumulatedLitres * 100) / 100,
                  costPerLitre: lastTopup.costPerLitre,
                  totalCost: Math.round(accumulatedLitres * lastTopup.costPerLitre * 100) / 100,
                  date: new Date(currentDateToFill),
                  type: 'ESTIMATED' as const,
                  fuelType: lastTopup.fuelType,
                  notes: `Estimated topup based on average daily consumption (${dailyAverage.toFixed(2)} litres/day)`,
                  isFirstTopup: false,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                };
                
                if (!manualDateStrings.has(currentDateToFill.toDateString())) {
                  estimatedTopups.push(estimatedTopup);
                }
                currentDateToFill.setDate(currentDateToFill.getDate() + 1);
              }
            }

            // Add estimated topups to the store
            if (estimatedTopups.length > 0) {
               set({
                 topups: [...manualTopups, ...estimatedTopups].sort((a, b) => 
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
              console.log('No estimated topups to add');
              set({ 
                topups: manualTopups,
                isLoading: false, 
                error: null 
              });
              
              // Still recalculate analytics data even if no estimated topups
              get().calculateConsumptionData();
              get().calculateTimeSeriesData('daily');
              get().calculatePieChartData();
            }
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to generate estimated topups',
            });
          }
        },

        removeEstimatedTopups: async (date) => {
          set({ isLoading: true, error: null });
          
          try {
            const { topups } = get();
            const targetDate = new Date(date);
            targetDate.setHours(0, 0, 0, 0);

            // Find estimated topups for the same date
            const estimatedTopupsToRemove = topups.filter(t => {
              if (t.type !== 'ESTIMATED') return false;
              const topupDate = new Date(t.date);
              topupDate.setHours(0, 0, 0, 0);
              return topupDate.getTime() === targetDate.getTime();
            });

            // Remove estimated topups from the store
            set((state) => ({
              topups: state.topups.filter(t => !estimatedTopupsToRemove.includes(t)),
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
              error: error instanceof Error ? error.message : 'Failed to remove estimated topups',
            });
          }
        },

        removeEstimatedTopup: async (id) => {
          set({ isLoading: true, error: null });
          
          try {
            const { topups } = get();
            const topupToRemove = topups.find(t => t.id === id);
            
            if (!topupToRemove) {
              throw new Error('Topup not found');
            }
            
            if (topupToRemove.type !== 'ESTIMATED') {
              throw new Error('Can only remove estimated topups with this function');
            }

            // Remove the specific estimated topup from the store
            set((state) => ({
              topups: state.topups.filter(t => t.id !== id),
              isLoading: false,
              error: null,
            }));

            // After removing an estimated topup, regenerate all estimated topups
            // to ensure consistency and fill any gaps that might have been created
            await get().generateEstimatedTopups();
            
            // Recalculate analytics data
            get().calculateConsumptionData();
            get().calculateTimeSeriesData('daily');
            get().calculatePieChartData();
          } catch (error) {
            set({
              isLoading: false,
              error: error instanceof Error ? error.message : 'Failed to remove estimated topup',
            });
          }
        },

        // Data loading actions
        loadFuelTopups: async () => {
          console.log('Loading fuel topups...');
          set({ isLoading: true, error: null });
          
          try {
            const response = await apiService.getFuelTopups();
            console.log('API response:', response);

            if (!response.success || !response.data) {
              throw new Error(response.error?.message || 'Failed to load fuel topups');
            }

            const topups: FuelTopup[] = response.data.map(topup => ({
              ...topup,
              date: new Date(topup.date),
              createdAt: new Date(topup.createdAt),
              updatedAt: new Date(topup.updatedAt),
            }));

            const sortedTopups = topups.sort((a, b) => 
              new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            
            console.log('Setting topups in store:', sortedTopups.length);
            set({
              topups: sortedTopups,
              isLoading: false,
              error: null,
            });

            // Regenerate estimated topups to ensure continuity
            await get().generateEstimatedTopups();
            
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
          set({ topups: [], chartData: [], timeSeriesData: [], pieChartData: [] });
          // Load fresh data from API
          await get().loadFuelTopups();
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

          const onAdded = (topup: FuelTopup) => {
            const newTopup: FuelTopup = {
              ...topup,
              date: new Date(topup.date),
              createdAt: new Date(topup.createdAt),
              updatedAt: new Date(topup.updatedAt),
            };

            set((state) => {
              const exists = state.topups.some(t => t.id === newTopup.id);
              const nextTopups = exists
                ? state.topups.map(t => t.id === newTopup.id ? newTopup : t)
                : [...state.topups, newTopup];
              return {
                topups: nextTopups.sort((a, b) => 
                  new Date(a.date).getTime() - new Date(b.date).getTime()
                ),
              };
            });

            // Recalculate analytics data
            get().calculateConsumptionData();
            get().calculateTimeSeriesData('daily');
            get().calculatePieChartData();
          };

          const onUpdated = (topup: FuelTopup) => {
            const updatedTopup: FuelTopup = {
              ...topup,
              date: new Date(topup.date),
              createdAt: new Date(topup.createdAt),
              updatedAt: new Date(topup.updatedAt),
            };

            set((state) => ({
              topups: state.topups
                .map((t) => t.id === topup.id ? updatedTopup : t)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
            }));

            // Recalculate analytics data
            get().calculateConsumptionData();
            get().calculateTimeSeriesData('daily');
            get().calculatePieChartData();
          };

          const onDeleted = ({ id }: { id: string }) => {
            set((state) => ({
              topups: state.topups.filter((topup) => topup.id !== id),
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
          const { topups } = get();
          
          // Handle edge cases: no topups or single topup
          if (topups.length === 0) {
            set({ chartData: [] });
            return;
          }
          
          if (topups.length === 1) {
            const singleTopup = topups[0];
            if (singleTopup.isFirstTopup) {
              set({ 
                chartData: [{
                  date: singleTopup.date.toISOString().split('T')[0],
                  litres: 0,
                  cost: 0,
                  label: '0.00 L',
                }]
              });
            } else {
              // Single topup that's not first - show the topup data
              set({ 
                chartData: [{
                  date: singleTopup.date.toISOString().split('T')[0],
                  litres: singleTopup.litres,
                  cost: singleTopup.totalCost,
                  mileage: singleTopup.mileage,
                  efficiency: undefined,
                  label: `${singleTopup.litres.toFixed(2)} L`,
                }]
              });
            }
            return;
          }

          // Explicitly sort topups by date to ensure chronological order
          const sortedTopups = [...topups].sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );

          // Validate topups have valid dates
          const invalidTopups = sortedTopups.filter(t => !t.date || isNaN(new Date(t.date).getTime()));
          if (invalidTopups.length > 0 && process.env.NODE_ENV === 'development') {
            console.warn('Found topups with invalid dates:', invalidTopups);
          }

          const chartData: ChartDataPoint[] = [];
          
          // Handle first topup - show 0 consumption on the first day
          const firstTopup = sortedTopups[0];
          
          if (firstTopup && firstTopup.isFirstTopup) {
            chartData.push({
              date: firstTopup.date.toISOString().split('T')[0],
              litres: 0,
              cost: 0,
              mileage: firstTopup.mileage,
              label: '0.00 L',
            });
          }
          
          // Calculate consumption for all topups
          // For fuel, consumption is the litres added in each topup
          for (let i = 0; i < sortedTopups.length; i++) {
            const currentTopup = sortedTopups[i];
            
            // Skip if marked as first topup (already handled above)
            if (currentTopup.isFirstTopup && i === 0) {
              continue;
            }
            
            // Calculate efficiency if mileage is tracked
            let efficiency: number | undefined = undefined;
            if (i > 0 && currentTopup.mileage && sortedTopups[i - 1].mileage) {
              const milesDriven = currentTopup.mileage - sortedTopups[i - 1].mileage;
              if (milesDriven > 0 && currentTopup.litres > 0) {
                efficiency = milesDriven / currentTopup.litres; // Miles per litre
              }
            }
            
            // Create chart data point for this topup
            chartData.push({
              date: currentTopup.date.toISOString().split('T')[0],
              litres: currentTopup.litres,
              cost: currentTopup.totalCost,
              mileage: currentTopup.mileage,
              efficiency: efficiency,
              label: `${currentTopup.litres.toFixed(2)} L`,
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
            
            // Calculate average efficiency if mileage is tracked
            const efficiencyData = data.filter(d => d.efficiency !== undefined);
            const averageEfficiency = efficiencyData.length > 0
              ? efficiencyData.reduce((sum, point) => sum + (point.efficiency || 0), 0) / efficiencyData.length
              : undefined;

            return {
              period,
              data,
              totalLitres,
              totalCost,
              averageDaily,
              trend,
              averageEfficiency,
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
        getConsumptionBetweenTopups: (topup1, topup2) => {
          // Skip consumption calculation if topup2 is marked as first topup
          if (topup2.isFirstTopup) {
            return 0;
          }
          // For fuel, consumption is the litres added in topup2
          return topup2.litres;
        },

        calculateEfficiency: (topup1, topup2) => {
          // Calculate miles per litre if mileage is tracked
          if (!topup1.mileage || !topup2.mileage || topup2.litres === 0) {
            return null;
          }
          
          const milesDriven = topup2.mileage - topup1.mileage;
          if (milesDriven <= 0) {
            return null;
          }
          
          return milesDriven / topup2.litres; // Miles per litre
        },

        recalculateAnalytics: () => {
          // Recalculate all analytics data
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
        name: 'fuel-tracker-storage',
        partialize: (state) => ({
          topups: state.topups,
          preferences: state.preferences,
        }),
      }
    ),
    {
      name: 'fuel-store',
    }
  )
);
