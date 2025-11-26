import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { useToastStore } from './useToastStore';
import { apiService } from '../services/api';
import type { 
  MileageEntry, 
  MileageChartDataPoint,
  SeasonalMileageData,
  UKSeason,
  FuelTopup
} from '../types';

interface MileageState {
  // Mileage entries
  entries: MileageEntry[];
  isLoading: boolean;
  error: string | null;
  
  // UI state
  isEntryPanelOpen: boolean;
  
  // Chart data
  chartData: MileageChartDataPoint[];
  
  // Actions
  addEntry: (entry: Omit<MileageEntry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateEntry: (id: string, entry: Partial<MileageEntry>) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  toggleEntryPanel: (isOpen: boolean) => void;
  
  // Data loading
  loadEntries: () => Promise<void>;
  syncFromFuelTopups: (topups: FuelTopup[]) => void;
  migrateLocalEntriesToServer: () => Promise<void>;
  
  // Analytics calculations
  calculateChartData: () => void;
  getTotalMiles: (startDate?: Date, endDate?: Date) => number;
  getAverageDailyMiles: (startDate?: Date, endDate?: Date) => number;
  getMilesByMonth: (year: number, month: number) => number;
  getMilesByWeek: (date: Date) => number;
  getSeasonalData: (season: UKSeason, year: number) => SeasonalMileageData | null;
  getAllSeasonalData: () => SeasonalMileageData[];
  
  // Efficiency calculations (requires fuel data)
  calculateEfficiency: (totalMiles: number, totalLitres: number) => number;
  calculateCostPerMile: (totalCost: number, totalMiles: number) => number;
  
  // Utility
  getEntriesForPeriod: (startDate: Date, endDate: Date) => MileageEntry[];
  getTrend: (data: MileageChartDataPoint[]) => 'increasing' | 'decreasing' | 'stable';
  recalculateAnalytics: () => void;
}

// UK Season month ranges
const SPRING_MONTHS = [2, 3, 4]; // March, April, May
const SUMMER_MONTHS = [5, 6, 7]; // June, July, August
const AUTUMN_MONTHS = [8, 9, 10]; // September, October, November

// Season configuration for date range calculation
const UK_SEASONS_CONFIG = {
  SPRING: { name: 'Spring', months: [2, 3, 4] },
  SUMMER: { name: 'Summer', months: [5, 6, 7] },
  AUTUMN: { name: 'Autumn', months: [8, 9, 10] },
  WINTER: { name: 'Winter', months: [11, 0, 1] },
};

// Helper function to get season from date
const getSeasonFromDate = (date: Date): UKSeason => {
  const month = date.getMonth();
  if (SPRING_MONTHS.includes(month)) return 'SPRING';
  if (SUMMER_MONTHS.includes(month)) return 'SUMMER';
  if (AUTUMN_MONTHS.includes(month)) return 'AUTUMN';
  return 'WINTER';
};

// Helper function to get season date range
const getSeasonDateRange = (season: UKSeason, year: number): { start: Date; end: Date } => {
  const seasonData = UK_SEASONS_CONFIG[season];
  const months = seasonData.months;
  
  // Handle winter which spans two years
  if (season === 'WINTER') {
    return {
      start: new Date(year, 11, 1), // December of the year
      end: new Date(year + 1, 2, 0), // End of February next year
    };
  }
  
  return {
    start: new Date(year, months[0], 1),
    end: new Date(year, months[2] + 1, 0), // Last day of the last month
  };
};

export const useMileageStore = create<MileageState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        entries: [],
        isLoading: false,
        error: null,
        isEntryPanelOpen: false,
        chartData: [],

        // Mileage entry actions
        addEntry: async (entryData) => {
          set({ isLoading: true, error: null });
          
          try {
            // Call API to create entry
            const response = await apiService.createMileageEntry({
              vehicleId: entryData.vehicleId,
              date: entryData.date instanceof Date ? entryData.date.toISOString() : entryData.date,
              odometerReading: entryData.odometerReading,
              tripDistance: entryData.tripDistance ?? null,
              tripPurpose: entryData.tripPurpose ?? null,
              notes: entryData.notes ?? null,
              linkedFuelTopupId: entryData.linkedFuelTopupId ?? null,
              type: entryData.type,
            });
            
            if (response.success && response.data) {
              const newEntry: MileageEntry = {
                ...response.data,
                date: new Date(response.data.date),
                createdAt: new Date(response.data.createdAt),
                updatedAt: new Date(response.data.updatedAt),
                odometerReading: Number(response.data.odometerReading),
                tripDistance: response.data.tripDistance ? Number(response.data.tripDistance) : undefined,
              };
              
              set((state) => ({
                entries: [...state.entries, newEntry].sort(
                  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                ),
                isLoading: false,
              }));
              
              get().recalculateAnalytics();
              
              useToastStore.getState().showToast(
                `Recorded ${newEntry.odometerReading.toLocaleString()} miles`,
                'success'
              );
            } else {
              throw new Error(response.error?.message || 'Failed to create mileage entry');
            }
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to add mileage entry',
              isLoading: false 
            });
            useToastStore.getState().showToast(
              'Failed to add mileage entry',
              'error'
            );
          }
        },

        updateEntry: async (id, entryData) => {
          set({ isLoading: true, error: null });
          
          try {
            // Prepare data for API
            const updateData: Record<string, unknown> = {};
            if (entryData.vehicleId !== undefined) updateData.vehicleId = entryData.vehicleId;
            if (entryData.date !== undefined) updateData.date = entryData.date instanceof Date ? entryData.date.toISOString() : entryData.date;
            if (entryData.odometerReading !== undefined) updateData.odometerReading = entryData.odometerReading;
            if (entryData.tripDistance !== undefined) updateData.tripDistance = entryData.tripDistance;
            if (entryData.tripPurpose !== undefined) updateData.tripPurpose = entryData.tripPurpose;
            if (entryData.notes !== undefined) updateData.notes = entryData.notes;
            if (entryData.type !== undefined) updateData.type = entryData.type;
            
            const response = await apiService.updateMileageEntry(id, updateData as Partial<import('../services/api').MileageEntry>);
            
            if (response.success && response.data) {
              set((state) => ({
                entries: state.entries.map((entry) =>
                  entry.id === id
                    ? { 
                        ...entry, 
                        ...response.data,
                        date: new Date(response.data!.date),
                        createdAt: new Date(response.data!.createdAt),
                        updatedAt: new Date(response.data!.updatedAt),
                        odometerReading: Number(response.data!.odometerReading),
                        tripDistance: response.data!.tripDistance ? Number(response.data!.tripDistance) : undefined,
                      }
                    : entry
                ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
                isLoading: false,
              }));
              
              get().recalculateAnalytics();
              
              useToastStore.getState().showToast(
                'Mileage entry has been updated',
                'success'
              );
            } else {
              throw new Error(response.error?.message || 'Failed to update mileage entry');
            }
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to update mileage entry',
              isLoading: false 
            });
            useToastStore.getState().showToast(
              'Failed to update mileage entry',
              'error'
            );
          }
        },

        deleteEntry: async (id) => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await apiService.deleteMileageEntry(id);
            
            if (response.success) {
              set((state) => ({
                entries: state.entries.filter((entry) => entry.id !== id),
                isLoading: false,
              }));
              
              get().recalculateAnalytics();
              
              useToastStore.getState().showToast(
                'Mileage entry has been removed',
                'success'
              );
            } else {
              throw new Error(response.error?.message || 'Failed to delete mileage entry');
            }
          } catch (error) {
            set({ 
              error: error instanceof Error ? error.message : 'Failed to delete mileage entry',
              isLoading: false 
            });
            useToastStore.getState().showToast(
              'Failed to delete mileage entry',
              'error'
            );
          }
        },

        toggleEntryPanel: (isOpen) => {
          set({ isEntryPanelOpen: isOpen });
        },

        loadEntries: async () => {
          set({ isLoading: true, error: null });
          
          try {
            const response = await apiService.getMileageEntries();
            
            if (response.success && response.data) {
              // Convert API data to MileageEntry format
              const entries: MileageEntry[] = response.data.map((entry) => ({
                ...entry,
                date: new Date(entry.date),
                createdAt: new Date(entry.createdAt),
                updatedAt: new Date(entry.updatedAt),
                odometerReading: Number(entry.odometerReading),
                tripDistance: entry.tripDistance ? Number(entry.tripDistance) : undefined,
              }));
              
              set({ 
                entries: entries.sort(
                  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
                ),
                isLoading: false 
              });
              get().recalculateAnalytics();
            } else {
              // If API fails, use locally cached entries
              console.warn('API fetch failed, using cached entries:', response.error);
              set({ isLoading: false });
              get().recalculateAnalytics();
            }
          } catch (error) {
            console.warn('Failed to fetch from API, using cached entries:', error);
            set({ isLoading: false });
            get().recalculateAnalytics();
          }
        },

        syncFromFuelTopups: (topups) => {
          const { entries } = get();
          
          // Get existing fuel-linked entry IDs
          const existingFuelLinkedIds = new Set(
            entries
              .filter((e) => e.type === 'FUEL_LINKED' && e.linkedFuelTopupId)
              .map((e) => e.linkedFuelTopupId)
          );
          
          // Find topups with mileage that aren't already synced
          const newEntries: MileageEntry[] = topups
            .filter((topup) => 
              topup.mileage !== undefined && 
              topup.mileage > 0 && 
              !existingFuelLinkedIds.has(topup.id)
            )
            .map((topup) => ({
              id: `mileage-fuel-${topup.id}`,
              vehicleId: topup.vehicleId,
              date: new Date(topup.date),
              odometerReading: topup.mileage!,
              linkedFuelTopupId: topup.id,
              type: 'FUEL_LINKED' as const,
              createdAt: new Date(),
              updatedAt: new Date(),
            }));
          
          if (newEntries.length > 0) {
            set((state) => ({
              entries: [...state.entries, ...newEntries].sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
              ),
            }));
            
            get().recalculateAnalytics();
          }
        },

        migrateLocalEntriesToServer: async () => {
          const { entries } = get();
          
          if (entries.length === 0) {
            console.log('No local entries to migrate');
            return;
          }
          
          set({ isLoading: true, error: null });
          
          try {
            // First check what's already on server
            const serverResponse = await apiService.getMileageEntries();
            const serverEntries = serverResponse.success && serverResponse.data ? serverResponse.data : [];
            const serverOdometerReadings = new Set(serverEntries.map(e => `${e.date}-${e.odometerReading}`));
            
            // Find entries that aren't on the server yet
            const entriesToMigrate = entries.filter(entry => {
              const key = `${entry.date instanceof Date ? entry.date.toISOString() : entry.date}-${entry.odometerReading}`;
              return !serverOdometerReadings.has(key);
            });
            
            if (entriesToMigrate.length === 0) {
              console.log('All entries already on server');
              set({ isLoading: false });
              return;
            }
            
            console.log(`Migrating ${entriesToMigrate.length} entries to server...`);
            
            // Bulk create entries on server
            const response = await apiService.bulkCreateMileageEntries(
              entriesToMigrate.map(entry => ({
                vehicleId: entry.vehicleId,
                date: entry.date instanceof Date ? entry.date.toISOString() : entry.date,
                odometerReading: entry.odometerReading,
                tripDistance: entry.tripDistance ?? null,
                tripPurpose: entry.tripPurpose ?? null,
                notes: entry.notes ?? null,
                linkedFuelTopupId: entry.linkedFuelTopupId ?? null,
                type: entry.type,
              }))
            );
            
            if (response.success) {
              useToastStore.getState().showToast(
                `Migrated ${response.data?.count || entriesToMigrate.length} mileage entries to server`,
                'success'
              );
              
              // Reload entries from server to get proper IDs
              await get().loadEntries();
            } else {
              throw new Error(response.error?.message || 'Failed to migrate entries');
            }
            
            set({ isLoading: false });
          } catch (error) {
            console.error('Migration failed:', error);
            set({ 
              error: error instanceof Error ? error.message : 'Failed to migrate entries',
              isLoading: false 
            });
            useToastStore.getState().showToast(
              'Failed to migrate entries to server',
              'error'
            );
          }
        },

        calculateChartData: () => {
          const { entries } = get();
          
          // Sort entries by date
          const sortedEntries = [...entries].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          
          // Calculate daily mileage (difference between consecutive readings)
          const chartData: MileageChartDataPoint[] = [];
          
          for (let i = 1; i < sortedEntries.length; i++) {
            const currentEntry = sortedEntries[i];
            const previousEntry = sortedEntries[i - 1];
            
            const milesDriven = currentEntry.odometerReading - previousEntry.odometerReading;
            
            if (milesDriven >= 0) {
              chartData.push({
                date: new Date(currentEntry.date).toISOString().split('T')[0],
                miles: milesDriven,
                odometerReading: currentEntry.odometerReading,
                tripDistance: currentEntry.tripDistance,
                tripPurpose: currentEntry.tripPurpose,
                label: currentEntry.notes,
              });
            }
          }
          
          set({ chartData });
        },

        getTotalMiles: (startDate, endDate) => {
          const { entries } = get();
          
          if (entries.length === 0) return 0;
          
          // Sort all entries by date
          const allSorted = [...entries].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          
          if (!startDate || !endDate) {
            // No date range - return total of all miles driven
            if (allSorted.length < 2) return 0;
            const firstReading = allSorted[0].odometerReading;
            const lastReading = allSorted[allSorted.length - 1].odometerReading;
            return Math.max(0, lastReading - firstReading);
          }
          
          // Filter entries within the date range
          const entriesInRange = allSorted.filter((entry) => {
            const entryDate = new Date(entry.date);
            return entryDate >= startDate && entryDate <= endDate;
          });
          
          if (entriesInRange.length === 0) return 0;
          
          // Find the last entry BEFORE the start date (baseline)
          const entriesBeforeRange = allSorted.filter((entry) => {
            const entryDate = new Date(entry.date);
            return entryDate < startDate;
          });
          
          // Get the starting odometer reading
          // If there's an entry before the range, use that as baseline
          // Otherwise use the first entry in the range
          let startOdometer: number;
          if (entriesBeforeRange.length > 0) {
            startOdometer = entriesBeforeRange[entriesBeforeRange.length - 1].odometerReading;
          } else if (entriesInRange.length >= 2) {
            startOdometer = entriesInRange[0].odometerReading;
          } else {
            return 0; // Not enough data to calculate
          }
          
          // Get the last odometer reading in the range
          const endOdometer = entriesInRange[entriesInRange.length - 1].odometerReading;
          
          return Math.max(0, endOdometer - startOdometer);
        },

        getAverageDailyMiles: (startDate, endDate) => {
          const totalMiles = get().getTotalMiles(startDate, endDate);
          
          if (!startDate || !endDate) {
            const { entries } = get();
            if (entries.length < 2) return 0;
            
            const sorted = [...entries].sort(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            
            const firstDate = new Date(sorted[0].date);
            const lastDate = new Date(sorted[sorted.length - 1].date);
            const days = Math.max(1, Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24)));
            
            return totalMiles / days;
          }
          
          const days = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
          return totalMiles / days;
        },

        getMilesByMonth: (year, month) => {
          const startDate = new Date(year, month, 1);
          const endDate = new Date(year, month + 1, 0);
          return get().getTotalMiles(startDate, endDate);
        },

        getMilesByWeek: (date) => {
          const startOfWeek = new Date(date);
          startOfWeek.setDate(date.getDate() - date.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          
          const endOfWeek = new Date(startOfWeek);
          endOfWeek.setDate(startOfWeek.getDate() + 6);
          endOfWeek.setHours(23, 59, 59, 999);
          
          return get().getTotalMiles(startOfWeek, endOfWeek);
        },

        getSeasonalData: (season, year) => {
          const { start, end } = getSeasonDateRange(season, year);
          const entriesInSeason = get().getEntriesForPeriod(start, end);
          
          // Need at least 1 entry in the season and either another entry in season
          // or an entry before the season to calculate miles
          const { entries } = get();
          const allSorted = [...entries].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          
          const entriesBeforeSeason = allSorted.filter((entry) => {
            const entryDate = new Date(entry.date);
            return entryDate < start;
          });
          
          // Need at least 1 entry in season, and either 2+ entries in season OR an entry before
          if (entriesInSeason.length === 0) return null;
          if (entriesInSeason.length < 2 && entriesBeforeSeason.length === 0) return null;
          
          const totalMiles = get().getTotalMiles(start, end);
          
          // Days from first entry that contributes to this season to last entry in season
          const lastEntryDate = new Date(entriesInSeason[entriesInSeason.length - 1].date);
          let firstRelevantDate: Date;
          if (entriesBeforeSeason.length > 0) {
            firstRelevantDate = new Date(entriesBeforeSeason[entriesBeforeSeason.length - 1].date);
          } else {
            firstRelevantDate = new Date(entriesInSeason[0].date);
          }
          
          const daysWithData = Math.max(1, Math.ceil((lastEntryDate.getTime() - firstRelevantDate.getTime()) / (1000 * 60 * 60 * 24)));
          
          return {
            season,
            year,
            totalMiles,
            averageDailyMiles: totalMiles / daysWithData,
            entryCount: entriesInSeason.length,
            startDate: start,
            endDate: end,
          };
        },

        getAllSeasonalData: () => {
          const { entries } = get();
          if (entries.length === 0) return [];
          
          // Get unique year-season combinations from entries
          const seasonalDataMap = new Map<string, SeasonalMileageData>();
          
          entries.forEach((entry) => {
            const date = new Date(entry.date);
            const season = getSeasonFromDate(date);
            const year = season === 'WINTER' && date.getMonth() < 3 
              ? date.getFullYear() - 1 
              : date.getFullYear();
            
            const key = `${season}-${year}`;
            
            if (!seasonalDataMap.has(key)) {
              const data = get().getSeasonalData(season, year);
              if (data) {
                seasonalDataMap.set(key, data);
              }
            }
          });
          
          return Array.from(seasonalDataMap.values()).sort(
            (a, b) => {
              if (a.year !== b.year) return b.year - a.year;
              const seasonOrder = ['WINTER', 'AUTUMN', 'SUMMER', 'SPRING'];
              return seasonOrder.indexOf(a.season) - seasonOrder.indexOf(b.season);
            }
          );
        },

        calculateEfficiency: (totalMiles, totalLitres) => {
          if (totalLitres === 0) return 0;
          return totalMiles / totalLitres;
        },

        calculateCostPerMile: (totalCost, totalMiles) => {
          if (totalMiles === 0) return 0;
          return totalCost / totalMiles;
        },

        getEntriesForPeriod: (startDate, endDate) => {
          const { entries } = get();
          return entries.filter((entry) => {
            const entryDate = new Date(entry.date);
            return entryDate >= startDate && entryDate <= endDate;
          });
        },

        getTrend: (data) => {
          if (data.length < 2) return 'stable';
          
          const recentData = data.slice(-7);
          const avgRecent = recentData.reduce((sum, d) => sum + d.miles, 0) / recentData.length;
          
          const olderData = data.slice(-14, -7);
          if (olderData.length === 0) return 'stable';
          
          const avgOlder = olderData.reduce((sum, d) => sum + d.miles, 0) / olderData.length;
          
          const percentChange = ((avgRecent - avgOlder) / avgOlder) * 100;
          
          if (percentChange > 5) return 'increasing';
          if (percentChange < -5) return 'decreasing';
          return 'stable';
        },

        recalculateAnalytics: () => {
          get().calculateChartData();
        },
      }),
      {
        name: 'fuel-tracker-mileage',
        version: 1,
        partialize: (state) => ({
          entries: state.entries,
        }),
      }
    ),
    { name: 'MileageStore' }
  )
);

